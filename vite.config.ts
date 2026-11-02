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
const DEFAULT_SETTINGS = {
  fontSize: 'default',
  themeColor: 'default',
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
      const css = `html{font-size:${size}}` + buildThemeColorCss(s.themeColor) + buildFilterCss(s.grayscale, s.colorWeak)
      return {
        html,
        tags: [{ tag: 'style', children: css, injectTo: 'head-prepend' as const }],
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
              fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2))
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true
    }),
    react(),
    tailwindcss(),
    settingsApi()
  ],
  server: {
    watch: {
      // settings.json 由 /api/settings 接口写入，变化不应触发页面刷新
      ignored: ['**/settings.json']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
