const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

function loadRenderer(pathname) {
  const filename = path.resolve(__dirname, '../src/components/layout/tab-page-renderer.tsx')
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  })

  const makePage = label => () => React.createElement('div', null, label)
  const module = { exports: {} }
  vm.runInNewContext(
    outputText,
    {
      module,
      exports: module.exports,
      require(id) {
        if (id === 'react') return React
        if (id === 'react/jsx-runtime') return require('react/jsx-runtime')
        if (id === '@tanstack/react-router') return { useLocation: () => pathname }
        if (id === '@/context/tabs-provider') {
          return {
            useTabs: () => ({
              tabs: [{ path: '/dashboard', pinned: true }, { path: '/system/dict' }, { path: '/ops/server' }],
              nonces: {}
            })
          }
        }
        if (id === '@/context/tenant-scope-provider') {
          // 租户代次：这里固定 0，只验证首屏只挂当前页；epoch 变化触发全部重挂是运行时行为，
          // SSR 下等价于再多一个 key 片段，不影响本用例断言
          return { useTenantScope: () => ({ epoch: 0, switching: false, applySwitch: async () => null }) }
        }
        if (id === '@/config/page-registry') {
          return {
            isRegisteredPage: () => true,
            PAGE_REGISTRY: {
              '/dashboard': { component: makePage('DASHBOARD_PAGE'), icon: null },
              '/system/dict': { component: makePage('DICT_PAGE'), icon: null },
              '/ops/server': { component: makePage('SERVER_PAGE'), icon: null }
            }
          }
        }
        if (id === '@/features/settings') return { SettingsLayout: ({ children }) => children }
        throw new Error(`Unexpected import: ${id}`)
      }
    },
    { filename }
  )
  return module.exports.TabPageRenderer
}

const pathname = '/ops/server'
const TabPageRenderer = loadRenderer(pathname)
const html = ReactDOMServer.renderToStaticMarkup(React.createElement(TabPageRenderer))
assert.match(html, /SERVER_PAGE/)
assert.doesNotMatch(html, /DASHBOARD_PAGE/, '恢复标签时不应在首次渲染挂载仪表盘')
assert.doesNotMatch(html, /DICT_PAGE/, '恢复标签时不应在首次渲染挂载未访问的字典页')
console.log('PASS: 恢复多个标签时首次只挂载当前页面')
