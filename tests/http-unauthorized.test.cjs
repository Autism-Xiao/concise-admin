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

function loadHttp(response) {
  const state = { logoutCalls: 0, redirects: [], events: [] }
  const apiError = createApiErrorModule(state)
  // 真实的请求计数模块：http.ts 靠它判断「新页面的请求是否都结束了」（切换租户揭幕用）
  const apiActivity = loadTsModule('src/lib/api-activity.ts')
  const store = new Map([
    ['concise-auth', 'true'],
    ['concise-token', 'expired-token']
  ])
  // 模拟 fetch 返回的 Response：真实响应有 headers/text，不能只给 json()
  const mockedResponse = {
    status: response.status,
    headers: {
      get: name => (name.toLowerCase() === 'content-type' ? (response.contentType ?? 'application/json; charset=utf-8') : null)
    },
    text: async () => {
      if (typeof response.text === 'function') return response.text()
      const body = await response.json()
      return typeof body === 'string' ? body : JSON.stringify(body)
    }
  }

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
          }
        }
      }
      if (id === '@/lib/api-error') return apiError
      if (id === '@/lib/api-activity') return apiActivity
      throw new Error(`Unexpected import: ${id}`)
    },
    localStorage: {
      getItem: key => store.get(key) ?? null
    },
    window: {
      location: {
        pathname: '/system/users',
        assign: url => state.redirects.push(url)
      },
      dispatchEvent: event => {
        state.events.push(event.type)
        return true
      }
    },
    fetch: async () => mockedResponse,
    // http.ts 会给每个请求挂超时定时器
    setTimeout: (fn, ms) => {
      const timer = setTimeout(fn, ms)
      if (typeof timer.unref === 'function') timer.unref()
      return timer
    },
    clearTimeout,
    AbortController,
    DOMException
  })
  return { getApiResult: module.exports.getApiResult, state, store, apiError, apiActivity }
}

async function main() {
  const http401 = loadHttp({
    status: 401,
    json: async () => {
      throw new Error('HTTP 401 不应依赖 JSON 响应体')
    }
  })
  await assert.rejects(http401.getApiResult('/backend-api/v1/users'), /登录已过期/)
  assert.equal(http401.state.logoutCalls, 1, 'HTTP 401 应清理登录态')
  assert.deepEqual(http401.state.redirects, ['/login'], 'HTTP 401 应跳转登录页')
  assert.equal(http401.store.has('concise-auth'), false)

  const business401 = loadHttp({
    status: 200,
    json: async () => ({ code: 401, message: '令牌失效', result: null, success: false })
  })
  await assert.rejects(business401.getApiResult('/backend-api/v1/users'), /登录已过期/)
  assert.equal(business401.state.logoutCalls, 1, '业务码 401 也应清理登录态')
  assert.deepEqual(business401.state.redirects, ['/login'])

  const loginFailure = loadHttp({
    status: 200,
    json: async () => ({ code: 401, message: '用户名或密码错误', result: null, success: false })
  })
  await assert.rejects(loginFailure.getApiResult('/backend-api/v1/auth/login'), /用户名或密码错误/)
  assert.equal(loginFailure.state.logoutCalls, 0, '登录接口返回认证失败时不能重复退出或跳转')
  assert.deepEqual(loginFailure.state.redirects, [])

  // 网关层连不上后端：vite 代理返回 502 + text/plain。
  // 用户只该看到「服务暂时连不上」，技术细节走控制台和横幅事件。
  const gatewayFailed = loadHttp({
    status: 502,
    contentType: 'text/plain; charset=utf-8',
    text: async () => 'upstream connect failed: 由于目标计算机积极拒绝，无法连接。 (os error 10061)'
  })
  await assert.rejects(gatewayFailed.getApiResult('/backend-api/v1/users'), /服务暂时连不上，请稍后重试/)
  assert.equal(gatewayFailed.state.logoutCalls, 0, '网关错误不应把用户踢下线')
  assert.ok(
    gatewayFailed.state.events.includes('concise:api-unavailable'),
    '网关错误应广播「服务不可用」事件，让全局横幅出现'
  )

  const emptyBody = loadHttp({ status: 502, contentType: 'text/plain; charset=utf-8', text: async () => '' })
  await assert.rejects(emptyBody.getApiResult('/backend-api/v1/users'), /服务暂时连不上，请稍后重试/)

  // 代理规则没生效时，请求会被前端 SPA 兜底成 index.html —— 对用户同样是「服务用不了」，
  // 不能报「JSON 解析失败」这种看不懂的错
  const htmlFallback = loadHttp({
    status: 200,
    contentType: 'text/html; charset=utf-8',
    text: async () => '<!doctype html><html><head><title>App</title></head><body><div id="root"></div></body></html>'
  })
  await assert.rejects(htmlFallback.getApiResult('/backend-api/v1/tenants'), /服务暂时连不上，请稍后重试/)

  // 业务失败沿用后端的中文文案，不能被兜底话术覆盖
  const bizFailure = loadHttp({
    status: 200,
    json: async () => ({ code: 1001, message: '部门编码已被占用', result: null, success: false })
  })
  await assert.rejects(bizFailure.getApiResult('/backend-api/v1/depts'), /部门编码已被占用/)

  // 成功请求返回解包后的 result
  const ok = loadHttp({ status: 200, json: async () => ({ code: 0, message: 'ok', result: { id: 1 }, success: true }) })
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

  console.log('PASS: 401 登出、网关错误人话文案 + 横幅事件、HTML 兜底、业务文案透传、横幅状态翻转')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
