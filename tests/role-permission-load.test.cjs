const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

async function main() {
  const filename = path.resolve(__dirname, '../src/features/system/role/index.tsx')
  const source = fs.readFileSync(filename, 'utf8')
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let openPermInitializer

  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === 'openPerm') {
      openPermInitializer = node.initializer.getText(sourceFile)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  assert.ok(openPermInitializer, '找不到 openPerm 实现')

  const { outputText } = ts.transpileModule(`const openPerm = ${openPermInitializer}; module.exports = openPerm`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })

  const events = []
  let resolveMenuIds
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    setPermRole: value => events.push({ type: 'open', value }),
    setPermLoading: value => events.push({ type: 'loading', value }),
    fetchRoleMenuIds: () => new Promise(resolve => (resolveMenuIds = resolve)),
    toast: { error: message => events.push({ type: 'error', message }) }
  })

  const role = { id: 'role-a', roleCode: 'operator' }
  module.exports(role)
  assert.equal(events.filter(event => event.type === 'open').length, 0, '权限 ID 加载完成前不应打开授权弹窗')

  resolveMenuIds(['menu-a', 'button-b'])
  await new Promise(resolve => setImmediate(resolve))

  const opened = events.find(event => event.type === 'open')
  assert.ok(opened, '权限 ID 返回后应打开授权弹窗')
  assert.equal(opened.value.role, role)
  assert.deepEqual(Array.from(opened.value.menuIds), ['menu-a', 'button-b'], '弹窗首次挂载就必须拿到真实授权 ID')
  assert.deepEqual(
    events.filter(event => event.type === 'loading').map(event => event.value),
    [true, false],
    '加载期间应有明确的加载状态'
  )
  console.log('PASS: 角色授权 ID 加载完成后才打开弹窗并正确回显')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
