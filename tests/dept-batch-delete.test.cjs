const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

async function main() {
  const filename = path.resolve(__dirname, '../src/features/system/dept/api.ts')
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })

  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require(id) {
      if (id === '@/lib/http') {
        return {
          getApiResult: async url => {
            if (url.endsWith('/dept-b')) throw new Error('存在子部门或用户')
            return null
          }
        }
      }
      throw new Error(`Unexpected import: ${id}`)
    },
    URLSearchParams,
    encodeURIComponent
  })

  assert.equal(typeof module.exports.deleteDepts, 'function', '缺少部门批量删除方法')
  const results = await module.exports.deleteDepts(['dept-a', 'dept-b', 'dept-c'])
  assert.equal(results.length, 3)
  assert.deepEqual(
    Array.from(results, result => result.status),
    ['fulfilled', 'rejected', 'fulfilled']
  )
  assert.equal(results[1].reason.message, '存在子部门或用户')
  console.log('PASS: 部门批量删除逐条结算，单条失败不影响其他部门')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
