const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

/** 用户批量删除：验证「一次请求 + 后端逐条结算」，内置管理员的失败原因要能透传 */
async function main() {
  const filename = path.resolve(__dirname, '../src/features/users/api.ts')
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })

  const calls = []
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require(id) {
      if (id === '@/lib/http') {
        return { getApiResult: async () => null }
      }
      if (id === '@/lib/download') {
        return { downloadFromApi: async () => ({ filename: 'users.xlsx', blob: null }) }
      }
      if (id === '@/lib/batch-delete') {
        return {
          batchDeleteRequest: async (resource, ids) => {
            calls.push({ resource, ids })
            return { deleted: ids.length - 1, failed: [{ id: 'user-b', name: '管理员', reason: '内置管理员账号不允许删除' }] }
          }
        }
      }
      if (id === '@/features/system/role/api') return {}
      throw new Error(`Unexpected import: ${id}`)
    },
    URLSearchParams,
    encodeURIComponent
  })

  assert.equal(typeof module.exports.deleteUsers, 'function', '缺少用户批量删除方法')
  const result = await module.exports.deleteUsers(['user-a', 'user-b', 'user-c'])
  assert.equal(calls.length, 1, '批量删除应只发一次请求')
  assert.equal(calls[0].resource, 'users', '应走 users 批量接口')
  assert.deepEqual(calls[0].ids, ['user-a', 'user-b', 'user-c'])
  assert.equal(result.deleted, 2)
  assert.equal(result.failed[0].reason, '内置管理员账号不允许删除')
  console.log('PASS: 用户批量删除一次请求，内置账号的失败原因可展示')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
