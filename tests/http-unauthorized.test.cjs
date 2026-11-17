const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

/**
 * 把 src/lib 下的 TS 源码转成 CJS 后在沙箱里执行
 *
 * `import.meta.env.DEV` 在 CommonJS 下是语法错误，这里替换成 false（模拟生产构建），
 * 于是断言到的就是**用户真正看到的文案**（不带技术细节那半句）。
 */
function loadTsModule(relPath, sandbox = {}) {
  const filename = path.resolve(__dirname, '..', relPath)
  const source = fs.readFileSync(filename, 'utf8').replace(/import\.meta\.env\.DEV/g, 'false')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, { module, exports: module.exports, ...sandbox })
  return module.exports
}

/** 真实的 api-error 模块（与 http.ts 共享同一实例，保证 instanceof 成立） */
function createApiErrorModule(state) {
  return loadTsModule('src/lib/api-error.ts', {
    console: { error: () => undefined, debug: () => undefined },
    window: {
      dispatchEvent: event => {
        state.events.push(event.type)
        return true
      }
    },
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type
        this.detail = init?.detail
      }
    },
    Event: class Event {
      constructor(type) {
        this.type = type
      }
    }
  })
}

function loadHttp(options = {}) {
  const response = options.response ?? {}
  const state = { logoutCalls: 0, redirects: [], events: [] }
  const apiError = createApiErrorModule(state)
  // 真实的请求计数模块：http.ts 靠它判断「新页面的请求是否都结束了」（切换租户揭幕用）
  const apiActivity = loadTsModule('src/lib/api-activity.ts')
  // 与 http.ts 共享同一个 window 假对象：会话过期事件经它广播进 state.events
  const windowLike = {
    location: {
      pathname: '/system/users',
      assign: url => state.redirects.push(url)
    },
    dispatchEvent: event => {
      state.events.push(event.type)
      return true
    }
  }
  // 真实的会话过期模块（模块级 notified 标记在每次 loadHttp 里都是新的）
  const sessionExpired = loadTsModule('src/lib/session-expired.ts', {
    window: windowLike,
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type
        this.detail = init?.detail
      }
    }
  })
  const store = new Map([
    ['concise-auth', 'true'],
    ['concise-token', 'expired-token']
  ])
  if (options.withRefreshToken) store.set('concise-refresh-token', 'stale-refresh')
  // 模拟 fetch 返回的 Response：真实响应有 headers/text，不能只给 json()
  const mockedResponse = {
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
    headers: {
      get: name => (name.toLowerCase() === 'content-type' ? (response.contentType ?? 'application/json; charset=utf-8') : null)
    },
    text: async () => {
      if (typeof response.text === 'function') return response.text()
      const body = await response.json()
      return typeof body === 'string' ? body : JSON.stringify(body)
    },
    json: async () => response.json()
  }
  const fetchImpl = options.fetchFn ?? (async () => mockedResponse)

  const module = { exports: {} }
  const filename = path.resolve(__dirname, '../src/lib/http.ts')
  const source = fs.readFileSync(filename, 'utf8').replace(/import\.meta\.env\.DEV/g, 'false')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })

  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require(id) {
      if (id === '@/lib/auth') {
        return {
          logout: () => {
            state.logoutCalls += 1
            store.clear()
          },
          getRefreshToken: () => store.get('concise-refresh-token') ?? '',
          setTokens: (accessToken, refreshToken) => {
            store.set('concise-token', accessToken)
            store.set('concise-refresh-token', refreshToken)
          }
        }
      }
      if (id === '@/lib/api-error') return apiError
      if (id === '@/lib/api-activity') return apiActivity
      if (id === '@/lib/session-expired') return sessionExpired
      throw new Error(`Unexpected import: ${id}`)
    },
    localStorage: {
      getItem: key => store.get(key) ?? null
    },
    window: windowLike,
    fetch: fetchImpl,
    // http.ts 会给每个请求挂超时定时器
    setTimeout: (fn, ms) => {
      const timer = setTimeout(fn, ms)
      if (typeof timer.unref === 'function') timer.unref()
      return timer
    },
    clearTimeout,
    AbortController,
    // refreshAccessToken 用 AbortSignal.timeout 兜超时；沙箱里缺了它会在 catch 里静默变 null
    AbortSignal,
    DOMException
  })
  return { getApiResult: module.exports.getApiResult, state, store, apiError, apiActivity }
}

/** 构造 JSON Response 假对象（ok / headers / text / json 齐全，refreshAccessToken 与 parseJsonBody 都要读） */
function makeJsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: name => (name.toLowerCase() === 'content-type' ? 'application/json; charset=utf-8' : null) },
    text: async () => JSON.stringify(body),
    json: async () => body
  }
}

async function main() {
  const http401 = loadHttp({
    response: {
      status: 401,
      json: async () => {
        throw new Error('HTTP 401 不应依赖 JSON 响应体')
      }
    }
  })
  await assert.rejects(http401.getApiResult('/backend-api/v1/users'), /登录已过期/)
  assert.equal(http401.state.logoutCalls, 1, 'HTTP 401 应清理登录态')
  // 不再直接整页跳登录：由全局 SessionExpiredDialog 弹「重新登录」确认框，
  // 用户点击后才跳转 —— 页面闪跳 + 表单瞬间丢失就是旧行为的问题
  assert.deepEqual(http401.state.redirects, [], 'HTTP 401 不应直接跳转登录页')
  assert.equal(http401.store.has('concise-auth'), false)
  assert.ok(http401.state.events.includes('concise:session-expired'), 'HTTP 401 应广播会话过期事件（弹框据此显示）')
  // 并发去重：同一批在途请求同时收到 401，只弹一个框
  await assert.rejects(http401.getApiResult('/backend-api/v1/users'), /登录已过期/)
  assert.equal(http401.state.events.filter(type => type === 'concise:session-expired').length, 1, '并发 401 只广播一次')

  const business401 = loadHttp({
    response: {
      status: 200,
      json: async () => ({ code: 401, message: '令牌失效', result: null, success: false })
    }
  })
  await assert.rejects(business401.getApiResult('/backend-api/v1/users'), /登录已过期/)
  assert.equal(business401.state.logoutCalls, 1, '业务码 401 也应清理登录态')
  assert.deepEqual(business401.state.redirects, [])
  assert.ok(business401.state.events.includes('concise:session-expired'), '业务码 401 同样广播会话过期事件')

  const loginFailure = loadHttp({
    response: {
      status: 200,
      json: async () => ({ code: 401, message: '用户名或密码错误', result: null, success: false })
    }
  })
  await assert.rejects(loginFailure.getApiResult('/backend-api/v1/auth/login'), /用户名或密码错误/)
  assert.equal(loginFailure.state.logoutCalls, 0, '登录接口返回认证失败时不能重复退出或跳转')
  assert.deepEqual(loginFailure.state.redirects, [])

  // 静默续签：accessToken 过期不踢登录页，先用 refreshToken 换新并重放原请求（用户无感）
  let refreshCalls = 0
  let dataCalls = 0
  const refreshed = loadHttp({
    withRefreshToken: true,
    fetchFn: async (url, init) => {
      if (String(url).includes('/v1/auth/refresh')) {
        refreshCalls += 1
        assert.equal(JSON.parse(init.body).refreshToken, 'stale-refresh', '续签应带上本地存的 refreshToken')
        return makeJsonResponse(200, { code: 0, message: 'ok', result: { accessToken: 'new-access', refreshToken: 'new-refresh' }, success: true })
      }
      dataCalls += 1
      return dataCalls === 1
        ? makeJsonResponse(401, { code: 1003, message: '令牌失效' })
        : makeJsonResponse(200, { code: 0, message: 'ok', result: { ok: true }, success: true })
    }
  })
  const refreshedPayload = await refreshed.getApiResult('/backend-api/v1/users')
  assert.equal(refreshedPayload.ok, true, '续签后重放应拿到正常业务结果')
  assert.equal(refreshCalls, 1, '续签只发一次')
  assert.equal(refreshed.state.logoutCalls, 0, '续签成功不应踢下线')
  assert.equal(refreshed.store.get('concise-token'), 'new-access', '新 accessToken 应写回本地存储')
  assert.equal(refreshed.store.get('concise-refresh-token'), 'new-refresh', '轮换出的新 refreshToken 也要写回')

  // refreshToken 也失效（7 天未活动 / 被吊销）：续签失败才走会话过期弹框
  const refreshDead = loadHttp({
    withRefreshToken: true,
    fetchFn: async url => {
      if (String(url).includes('/v1/auth/refresh')) {
        return makeJsonResponse(401, { code: 1003, message: 'refreshToken 无效或已过期' })
      }
      return makeJsonResponse(401, { code: 1003, message: '令牌失效' })
    }
  })
  await assert.rejects(refreshDead.getApiResult('/backend-api/v1/users'), /登录已过期/)
  assert.equal(refreshDead.state.logoutCalls, 1, 'refreshToken 失效时应清登录态并弹会话过期框')
  assert.ok(refreshDead.state.events.includes('concise:session-expired'), '续签失败应广播会话过期事件')

  // 网关层连不上后端：vite 代理返回 502 + text/plain。
  // 用户只该看到「服务暂时连不上」，技术细节走控制台和横幅事件。
  const gatewayFailed = loadHttp({
    response: {
      status: 502,
      contentType: 'text/plain; charset=utf-8',
      text: async () => 'upstream connect failed: 由于目标计算机积极拒绝，无法连接。 (os error 10061)'
    }
  })
  await assert.rejects(gatewayFailed.getApiResult('/backend-api/v1/users'), /服务暂时连不上，请稍后重试/)
  assert.equal(gatewayFailed.state.logoutCalls, 0, '网关错误不应把用户踢下线')
  assert.ok(
    gatewayFailed.state.events.includes('concise:api-unavailable'),
    '网关错误应广播「服务不可用」事件，让全局横幅出现'
  )

  const emptyBody = loadHttp({ response: { status: 502, contentType: 'text/plain; charset=utf-8', text: async () => '' } })
  await assert.rejects(emptyBody.getApiResult('/backend-api/v1/users'), /服务暂时连不上，请稍后重试/)

  // 代理规则没生效时，请求会被前端 SPA 兜底成 index.html —— 对用户同样是「服务用不了」，
  // 不能报「JSON 解析失败」这种看不懂的错
  const htmlFallback = loadHttp({
    response: {
      status: 200,
      contentType: 'text/html; charset=utf-8',
      text: async () => '<!doctype html><html><head><title>App</title></head><body><div id="root"></div></body></html>'
    }
  })
  await assert.rejects(htmlFallback.getApiResult('/backend-api/v1/tenants'), /服务暂时连不上，请稍后重试/)

  // 业务失败沿用后端的中文文案，不能被兜底话术覆盖
  const bizFailure = loadHttp({
    response: {
      status: 200,
      json: async () => ({ code: 1001, message: '部门编码已被占用', result: null, success: false })
    }
  })
  await assert.rejects(bizFailure.getApiResult('/backend-api/v1/depts'), /部门编码已被占用/)

  // 成功请求返回解包后的 result
  const ok = loadHttp({ response: { status: 200, json: async () => ({ code: 0, message: 'ok', result: { id: 1 }, success: true }) } })
  const payload = await ok.getApiResult('/backend-api/v1/users/1')
  // 跨 vm 上下文的对象原型不同，不能 deepStrictEqual，按属性断言
  assert.equal(payload.id, 1)
  // 在途计数必须成对：多计一次，切换租户的遮罩就永远撤不掉
  assert.equal(ok.apiActivity.getInflightCount(), 0, '成功请求结束后在途计数应归零')
  assert.equal(business401.apiActivity.getInflightCount(), 0, '业务失败（抛错）也必须把在途计数减回去')

  // 横幅的状态翻转语义：只在「不可用 → 可用」时广播一次恢复，成功请求是常态不重复广播
  const flipState = { events: [] }
  const flip = createApiErrorModule(flipState)
  flip.reportRecovered()
  assert.equal(flipState.events.length, 0, '本来就正常时不该广播任何事件')
  flip.reportUnavailable('x')
  flip.reportUnavailable('y')
  assert.equal(flipState.events.filter(e => e === 'concise:api-unavailable').length, 1, '并发失败只提示一次')
  flip.reportRecovered()
  flip.reportRecovered()
  assert.equal(flipState.events.filter(e => e === 'concise:api-recovered').length, 1, '恢复只广播一次')

  console.log('PASS: 401 静默续签 + 会话过期事件去重、网关错误人话文案 + 横幅事件、HTML 兜底、业务文案透传、横幅状态翻转')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
