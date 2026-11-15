const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

/**
 * 锁定「Context 必须 HMR 安全」这条约定。
 *
 * 背景：代码生成器「执行生成」会把前端产物写进 src/（page-registry、i18n、路由树），
 * 一次写盘连带 Vite 重新执行 provider 模块。若 Context 用原生 createContext 定义，
 * 模块重执行会产出**新的** Context 对象，挂载中的旧 Provider 与新模块里的 useContext 失联，
 * 页面当场抛 `useTabs must be used within TabsProvider` 并被路由错误边界接管。
 * 实测复现过，所以这里用测试挡住回退。
 */
const ctxDir = path.resolve(__dirname, '../src/context')
const factorySource = fs.readFileSync(path.resolve(__dirname, '../src/lib/hmr-context.ts'), 'utf8')

assert.ok(factorySource.includes('__conciseContexts'), 'Context 工厂应把实例挂在 globalThis 上复用')
assert.ok(factorySource.includes('globalThis'), 'Context 工厂必须跨模块重执行复用同一实例')

for (const file of fs.readdirSync(ctxDir).filter(f => f.endsWith('.tsx'))) {
  const source = fs.readFileSync(path.join(ctxDir, file), 'utf8')
  if (!source.includes('Context =')) continue
  assert.ok(!/(const \w+Context = )createContext</.test(source), `${file} 仍在用 createContext 直接建 Context，HMR 后会失联，请改用 createHmrSafeContext`)
  assert.ok(source.includes('createHmrSafeContext'), `${file} 应通过 createHmrSafeContext 创建 Context`)
  assert.ok(/createHmrSafeContext<[^>]+>\('concise\.context\.\w+'/.test(source), `${file} 的 Context key 应为静态字面量（concise.context.*）`)
}

console.log('context HMR safety: ok')
