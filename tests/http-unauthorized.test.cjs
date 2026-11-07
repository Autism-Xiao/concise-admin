const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function loadHttp(response) {
  const filename = path.resolve(__dirname, '../src/lib/http.ts')
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })

  const store = new Map([
    ['concise-auth', 'true'],
    ['concise-token', 'expired-token']
  ])
  const state = { logoutCalls: 0, redirects: [] }
  const module = { exports: {} }
  // 模拟 fetch 返回的 Response：真实响应有 headers/text，不能只给 json()
  // （原用例只 mock 了 json()，加上空响应/非 JSON 的健壮处理后必须一起补齐）
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
      throw new Error(`Unexpected import: ${id}`)
    },
    localStorage: {
      getItem: key => store.get(key) ?? null
    },
    window: {
      location: {
        pathname: '/system/users',
        assign: url => state.redirects.push(url)
      }
    },
    fetch: async () => mockedResponse
  })
  return { getApiResult: module.exports.getApiResult, state, store }
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

  // 网关层连不上后端：vite 代理返回 502 + text/plain，必须给出可读提示，
  // 不能让用户看到 "Unexpected end of JSON input"
  const gatewayFailed = loadHttp({
    status: 502,
    contentType: 'text/plain; charset=utf-8',
    text: async () => 'upstream connect failed: 由于目标计算机积极拒绝，无法连接。 (os error 10061)'
  })
  await assert.rejects(gatewayFailed.getApiResult('/backend-api/v1/users'), /后端服务不可用（HTTP 502）/)
  const emptyBody = loadHttp({ status: 502, contentType: 'text/plain; charset=utf-8', text: async () => '' })
  await assert.rejects(emptyBody.getApiResult('/backend-api/v1/users'), /没有收到后端响应（HTTP 502）/)
  assert.equal(gatewayFailed.state.logoutCalls, 0, '网关错误不应把用户踢下线')

  console.log('PASS: 业务请求 401 统一退出登录，登录失败保留原错误提示，网关错误给出可读提示')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
