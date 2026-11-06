import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { buildFilterCss, buildThemeColorCss } from './src/lib/theme-presets.ts'

// 应用设置持久化到项目根目录 settings.json（开发环境由 dev server 读写，
// 生产环境可替换为后端接口，前端代码不变）
const SETTINGS_FILE = path.resolve(__dirname, 'settings.json')
// 仍是本地数据文件的模块（其余模块已接真实后端，不再有 mock 文件）
const FILES_FILE = path.resolve(__dirname, 'public/mock/files.json')
const TENANTS_FILE = path.resolve(__dirname, 'public/mock/tenants.json')
const REGIONS_FILE = path.resolve(__dirname, 'public/mock/regions.json')
// Go 后端地址：开发环境通过 /backend-api 代理访问，规避 CORS（生产环境由网关/Nginx 转发）
// 可用环境变量覆盖（真机调试时设 BACKEND_URL=http://<局域网IP>:3000），默认指向本机后端
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:3000'
const DEFAULT_SETTINGS = {
  fontSize: 'default',
  themeColor: 'default',
  customColor: '#2563eb',
  grayscale: false,
  colorWeak: false,
  sidebarVariant: 'sidebar',
  layout: 'default',
  direction: 'ltr'
}
const FONT_SIZE_MAP: Record<string, string> = {
  small: '14px',
  default: '16px',
  large: '18px'
}

function settingsApi(): Plugin {
  const readSettings = () => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) }
    } catch {
      return DEFAULT_SETTINGS
    }
  }
  return {
    name: 'concise-settings-api',
    // 把已保存的设置直接注入 HTML，刷新首帧即为正确效果，避免闪烁
    transformIndexHtml(html) {
      const s = readSettings()
      const size = FONT_SIZE_MAP[s.fontSize] ?? FONT_SIZE_MAP.default
      const css = `html{font-size:${size}}` + buildThemeColorCss(s.themeColor, s.customColor) + buildFilterCss(s.grayscale, s.colorWeak)
      return {
        html,
        // id 与 settings-provider 的 STYLE_ID 一致：运行时切换主题直接复用该元素，
        // 切回 default 时移除它即可，不会残留旧主题（注入选择器优先级已提升，残留会盖过 index.css 默认值）
        tags: [{ tag: 'style', attrs: { id: 'app-settings-override' }, children: css, injectTo: 'head' as const }],
        htmlAttrs: { dir: s.direction === 'rtl' ? 'rtl' : 'ltr' }
      }
    },
    configureServer(server) {
      server.middlewares.use('/api/settings', (req, res) => {
        if (req.method === 'GET') {
          const data = readSettings()
          if (!fs.existsSync(SETTINGS_FILE)) {
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2))
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
          return
        }
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => (body += chunk))
          req.on('end', () => {
            try {
              const next = { ...readSettings(), ...JSON.parse(body) }
              // 原子写：先写临时文件再重命名，避免并发读取拿到半截 JSON
              const tmp = SETTINGS_FILE + '.tmp'
              fs.writeFileSync(tmp, JSON.stringify(next, null, 2))
              fs.renameSync(tmp, SETTINGS_FILE)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(next))
            } catch {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'invalid json' }))
            }
          })
          return
        }
        res.statusCode = 405
        res.end()
      })
    }
  }
}

// 管理页保存时写回 public/mock/*.json（仅开发环境；
// 生产环境把前端的 saveXxx 换成真实接口即可）
function jsonWriteApi(name: string, route: string, file: string): Plugin {
  return {
    name,
    configureServer(server) {
      server.middlewares.use(route, (req, res) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => (body += chunk))
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              if (!Array.isArray(data)) throw new Error('expect array')
              // 原子写：先写临时文件再重命名
              const tmp = file + '.tmp'
              fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
              fs.renameSync(tmp, file)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true, count: data.length }))
            } catch {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'invalid json' }))
            }
          })
          return
        }
        res.statusCode = 405
        res.end()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true
    }),
    react(),
    tailwindcss(),
    settingsApi(),
    jsonWriteApi('concise-files-api', '/api/files', FILES_FILE),
    jsonWriteApi('concise-tenants-api', '/api/tenants', TENANTS_FILE),
    jsonWriteApi('concise-regions-api', '/api/regions', REGIONS_FILE)
  ],
  server: {
    proxy: {
      '/backend-api': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: p => p.replace(/^\/backend-api/, '/api')
      }
    },
    watch: {
      // settings.json / mock 写回文件由接口写入，变化不应触发页面刷新
      ignored: ['**/settings.json', '**/public/mock/files.json', '**/public/mock/tenants.json', '**/public/mock/regions.json']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
