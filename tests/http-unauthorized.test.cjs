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
    fetch: async () => response
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

  console.log('PASS: 业务请求 401 统一退出登录，登录失败保留原错误提示')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
