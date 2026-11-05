const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

/**
 * 部门批量删除：验证「一次请求 + 后端逐条结算」的协议
 * 旧实现是前端 Promise.all 打 N 次单删，已废弃——那会产生 N 条操作日志且失败原因分散。
 */
async function main() {
  const filename = path.resolve(__dirname, '../src/features/system/dept/api.ts')
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
        return { downloadFromApi: async () => ({ filename: 'depts.xlsx', blob: null }) }
      }
      if (id === '@/lib/batch-delete') {
        return {
          batchDeleteRequest: async (resource, ids) => {
            calls.push({ resource, ids })
            return { deleted: ids.length - 1, failed: [{ id: 'dept-b', name: '分公司', reason: '该部门下存在子部门，无法删除' }] }
          }
        }
      }
      throw new Error(`Unexpected import: ${id}`)
    },
    URLSearchParams,
    encodeURIComponent
  })

  assert.equal(typeof module.exports.deleteDepts, 'function', '缺少部门批量删除方法')
  const result = await module.exports.deleteDepts(['dept-a', 'dept-b', 'dept-c'])
  assert.equal(calls.length, 1, '批量删除应只发一次请求')
  assert.equal(calls[0].resource, 'depts', '应走 depts 批量接口')
  assert.deepEqual(calls[0].ids, ['dept-a', 'dept-b', 'dept-c'], '应把全部 id 一次性传给后端')
  assert.equal(result.deleted, 2)
  assert.equal(result.failed[0].reason, '该部门下存在子部门，无法删除', '失败原因应原样透传给页面')
  console.log('PASS: 部门批量删除一次请求，失败原因由后端逐条返回')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
