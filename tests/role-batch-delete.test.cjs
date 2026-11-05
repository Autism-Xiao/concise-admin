const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

/** 角色批量删除：验证「一次请求 + 后端逐条结算」，被用户占用时的失败原因要能透传 */
async function main() {
  const filename = path.resolve(__dirname, '../src/features/system/role/api.ts')
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
      if (id === '@/lib/batch-delete') {
        return {
          batchDeleteRequest: async (resource, ids) => {
            calls.push({ resource, ids })
            return { deleted: ids.length - 1, failed: [{ id: 'role-b', name: '编辑', reason: '该角色下还有 2 个用户，请先解绑后再删除' }] }
          }
        }
      }
      throw new Error(`Unexpected import: ${id}`)
    },
    URLSearchParams,
    encodeURIComponent,
    FormData,
    localStorage: { getItem: () => null },
    fetch
  })

  assert.equal(typeof module.exports.deleteRoles, 'function', '缺少角色批量删除方法')
  const result = await module.exports.deleteRoles(['role-a', 'role-b', 'role-c'])
  assert.equal(calls.length, 1, '批量删除应只发一次请求')
  assert.equal(calls[0].resource, 'roles', '应走 roles 批量接口')
  assert.deepEqual(calls[0].ids, ['role-a', 'role-b', 'role-c'])
  assert.equal(result.deleted, 2)
  assert.equal(result.failed[0].reason, '该角色下还有 2 个用户，请先解绑后再删除')
  console.log('PASS: 角色批量删除一次请求，占用情况由后端给出原因')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
