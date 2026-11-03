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
const MENUS_FILE = path.resolve(__dirname, 'public/mock/menus.json')
const DEPTS_FILE = path.resolve(__dirname, 'public/mock/depts.json')
const ROLES_FILE = path.resolve(__dirname, 'public/mock/roles.json')
const ACCOUNTS_FILE = path.resolve(__dirname, 'public/mock/accounts.json')
const USERS_FILE = path.resolve(__dirname, 'public/mock/users.json')
const DICTS_FILE = path.resolve(__dirname, 'public/mock/dicts.json')
const FILES_FILE = path.resolve(__dirname, 'public/mock/files.json')
const LEVELS_FILE = path.resolve(__dirname, 'public/mock/levels.json')
const POSTS_FILE = path.resolve(__dirname, 'public/mock/posts.json')
const TENANTS_FILE = path.resolve(__dirname, 'public/mock/tenants.json')
const NOTICES_FILE = path.resolve(__dirname, 'public/mock/notices.json')
const REGIONS_FILE = path.resolve(__dirname, 'public/mock/regions.json')
const LOGIN_LOGS_FILE = path.resolve(__dirname, 'public/mock/logs-login.json')
const OPERATION_LOGS_FILE = path.resolve(__dirname, 'public/mock/logs-operation.json')
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
        tags: [{ tag: 'style', children: css, injectTo: 'head' as const }],
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

// 日志追加接口：POST 单条对象，服务端分配自增 id 并插到最前
function jsonAppendApi(name: string, route: string, file: string): Plugin {
  return {
    name,
    configureServer(server) {
      server.middlewares.use(route, (req, res) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => (body += chunk))
          req.on('end', () => {
            try {
              const entry = JSON.parse(body)
              if (Array.isArray(entry) || entry == null || typeof entry !== 'object') throw new Error('expect object')
              let list: { id?: number }[] = []
              try {
                list = JSON.parse(fs.readFileSync(file, 'utf-8'))
              } catch {
                // 文件不存在或损坏时从空数组开始
              }
              const id = list.reduce((max, item) => Math.max(max, item.id ?? 0), 0) + 1
              const record = { id, ...entry }
              const tmp = file + '.tmp'
              fs.writeFileSync(tmp, JSON.stringify([record, ...list], null, 2))
              fs.renameSync(tmp, file)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(record))
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
    jsonWriteApi('concise-menus-api', '/api/menus', MENUS_FILE),
    jsonWriteApi('concise-depts-api', '/api/depts', DEPTS_FILE),
    jsonWriteApi('concise-roles-api', '/api/roles', ROLES_FILE),
    jsonWriteApi('concise-accounts-api', '/api/accounts', ACCOUNTS_FILE),
    jsonWriteApi('concise-users-api', '/api/users', USERS_FILE),
    jsonWriteApi('concise-dicts-api', '/api/dicts', DICTS_FILE),
    jsonWriteApi('concise-files-api', '/api/files', FILES_FILE),
    jsonWriteApi('concise-levels-api', '/api/levels', LEVELS_FILE),
    jsonWriteApi('concise-posts-api', '/api/posts', POSTS_FILE),
    jsonWriteApi('concise-tenants-api', '/api/tenants', TENANTS_FILE),
    jsonWriteApi('concise-notices-api', '/api/notices', NOTICES_FILE),
    jsonWriteApi('concise-regions-api', '/api/regions', REGIONS_FILE),
    jsonAppendApi('concise-login-logs-api', '/api/logs/login', LOGIN_LOGS_FILE),
    jsonAppendApi('concise-operation-logs-api', '/api/logs/operation', OPERATION_LOGS_FILE)
  ],
  server: {
    watch: {
      // settings.json / mock 写回文件由接口写入，变化不应触发页面刷新
      ignored: [
        '**/settings.json',
        '**/public/mock/menus.json',
        '**/public/mock/depts.json',
        '**/public/mock/roles.json',
        '**/public/mock/accounts.json',
        '**/public/mock/users.json',
        '**/public/mock/dicts.json',
        '**/public/mock/files.json',
        '**/public/mock/levels.json',
        '**/public/mock/posts.json',
        '**/public/mock/tenants.json',
        '**/public/mock/notices.json',
        '**/public/mock/regions.json',
        '**/public/mock/logs-login.json',
        '**/public/mock/logs-operation.json'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
