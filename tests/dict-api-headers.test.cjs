const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

async function main() {
  const filename = path.resolve(__dirname, '../src/features/system/dict/api.ts')
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
        return {
          getApiResult: async (url, init) => {
            calls.push({ url, init })
            return {}
          }
        }
      }
      throw new Error(`Unexpected import: ${id}`)
    },
    URLSearchParams,
    encodeURIComponent
  })

  const values = { dictName: '测试字典', dictCode: 'test_dict', type: 0 }
  const itemValues = { itemText: '测试项', itemValue: '1', sortOrder: 1, status: 1 }
  await module.exports.createDict(values)
  await module.exports.updateDict('dict-id', values)
  await module.exports.createDictItem('dict-id', itemValues)
  await module.exports.updateDictItem('item-id', itemValues)

  assert.equal(calls.length, 4)
  for (const call of calls) {
    assert.equal(call.init?.headers?.['Content-Type'], 'application/json', `${call.init?.method} ${call.url} 缺少 JSON Content-Type`)
  }
  console.log('PASS: 字典与字典项的 POST/PUT 请求均携带 application/json')
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
