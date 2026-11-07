import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// 仍是本地数据文件的模块（文件管理、行政区划、租户均已接真实后端，对应 mock 已删除）
const REGIONS_FILE = path.resolve(__dirname, 'public/mock/regions.json')
// 后端地址：开发环境通过 /backend-api 代理访问，规避 CORS（生产环境由网关/Nginx 转发）
// 端口必须与 concise-server-node/.env 的 PORT 一致（当前为 3459）；
// 真机调试可用 BACKEND_URL=http://<局域网IP>:3459 覆盖，或用 BACKEND_PORT 只改端口。
// 注意：这里写错不会报错，只会让代理返回 502（前端表现为「拿不到 JSON」），排查时先看后端端口。
const BACKEND_PORT = process.env.BACKEND_PORT ?? '3459'
const BACKEND_URL = process.env.BACKEND_URL ?? `http://127.0.0.1:${BACKEND_PORT}`
const FRONTEND_PORT = 5173

/**
 * 代理失败时在**终端**直接说清楚原因
 *
 * 默认行为是：浏览器收到 502，终端一声不吭。用户只看到页面报错，
 * 完全不知道该去看后端。这里把「连不上谁、该做什么」打印在跑 dev 的那个窗口里。
 * 节流 30 秒，避免页面并发请求把终端刷满。
 */
function proxyErrorLogger() {
  let lastAt = 0
  return (err: Error) => {
    const now = Date.now()
    if (now - lastAt < 30000) return
    lastAt = now
    console.error(`\n  ✖ 代理转发失败：${BACKEND_URL} 连不上（${err.message}）`)
    console.error(`    请先启动后端：cd ../concise-server-node; npm run restart`)
    console.error(`    若后端端口不是 ${BACKEND_PORT}，用 BACKEND_PORT=<端口> 重新启动前端\n`)
  }
}

/** 启动后在终端醒目打印「该访问哪个地址」，端口被占自动换端口时尤其重要 */
function startupInfo(): Plugin {
  return {
    name: 'concise-startup-info',
    configureServer(server) {
      const print = () => {
        const address = server.httpServer?.address()
        const port = typeof address === 'object' && address ? address.port : FRONTEND_PORT
        console.log(`\n  后端代理 → ${BACKEND_URL}`)
        console.log(`  请访问   → http://localhost:${port}`)
        // 只有「配置的端口与实际监听端口不一致」才是被占用后自动换的；
        // 用户自己用 --port 指定别的端口时不要误导成「被占用」
        const configuredPort = server.config.server.port ?? FRONTEND_PORT
        if (port !== configuredPort) {
          console.log(`  ⚠ 端口 ${configuredPort} 已被其它程序占用，vite 自动改用了 ${port}。`)
          console.log(`    打开 ${configuredPort} 会看到别的项目，请用上面这个地址。`)
        }
        console.log('')
      }
      // 视 vite 版本，configureServer 执行时可能已经 listening
      if (server.httpServer?.listening) print()
      else server.httpServer?.once('listening', print)
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
    jsonWriteApi('concise-regions-api', '/api/regions', REGIONS_FILE),
    startupInfo()
  ],
  server: {
    port: FRONTEND_PORT,
    proxy: {
      '/backend-api': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: p => p.replace(/^\/backend-api/, '/api'),
        configure: proxy => {
          proxy.on('error', proxyErrorLogger())
        }
      },
      // 上传文件的静态地址（后端 public/upload 以 {host}/upload/... 访问），开发环境同样代理过去
      '/upload': {
        target: BACKEND_URL,
        changeOrigin: true
      }
    },
    watch: {
      // mock 写回文件由接口写入，变化不应触发页面刷新
      ignored: ['**/public/mock/regions.json']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
