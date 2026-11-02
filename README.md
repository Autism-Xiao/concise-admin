# Concise Admin

基于 React 19 + Vite + shadcn/ui 的后台管理系统。

## 技术栈

| 层     | 选型                                                     |
| ------ | -------------------------------------------------------- |
| 框架   | React 19 + TypeScript 6 + Vite 8                         |
| UI     | shadcn/ui（Tailwind CSS 4 + Radix UI，风格 radix-vega）  |
| 路由   | TanStack Router（文件式路由，类型安全）                  |
| 主题   | next-themes（浅色 / 深色 / 跟随系统）                    |
| 图标   | lucide-react                                             |
| 工程化 | ESLint 10（flat config）+ Prettier + Husky + lint-staged |

## 快速开始

```bash
pnpm install
pnpm run dev
```

常用命令：

```bash
pnpm run lint          # ESLint 检查
pnpm run format        # Prettier 格式化
pnpm run build         # 类型检查 + 生产构建
```

## 目录结构

```
src/
├── main.tsx                  # 入口：创建 Router、挂载到 #root
├── routeTree.gen.ts          # ⚠️ TanStack Router 自动生成，禁止手改
│
├── routes/                   # 路由层：只负责"哪个 URL 渲染哪个页面"，保持轻薄
│   ├── __root.tsx            # 根布局：ThemeProvider / TooltipProvider / Toaster
│   ├── index.tsx             # / → 重定向到 /dashboard
│   ├── login.tsx             # /login（无需鉴权）
│   ├── _authenticated.tsx    # 鉴权布局：Sidebar + Header + Outlet（下划线开头不产生 URL 段）
│   ├── _authenticated/       # 需要登录的页面，自动套用上面的布局
│   │   ├── dashboard.tsx     # /dashboard
│   │   ├── users.tsx         # /users
│   │   ├── settings.tsx      # /settings
│   │   └── errors/           # /errors/401、403、404、500、503（带侧边栏布局）
│
├── components/               # 通用组件
│   ├── ui/                   # shadcn CLI 生成的组件，视为第三方代码，勿手改
│   ├── layout/               # 布局组件：app-sidebar / site-header
│   └── theme-toggle.tsx      # 主题切换
│
├── features/                 # 业务模块（核心目录，按领域划分，模块内部自治）
│   ├── auth/                 # 登录
│   ├── dashboard/            # 仪表盘
│   ├── errors/               # 错误页（401/403/404/500/503，共享 ErrorPage 组件）
│   ├── tasks/                # 任务（data/ 下为 mock 数据）
│   ├── apps/                 # 应用集成（data/ 下为 mock 数据）
│   ├── chats/                # 聊天
│   ├── help-center/          # 帮助中心
│   ├── users/                # 用户管理（data/ 下为 mock 数据）
│   └── settings/             # 系统设置
│
├── config/                   # 常量配置（侧边栏导航 nav.ts 等）
├── context/                  # 全局 Provider（search-provider：⌘K 全局搜索状态）
├── stores/                   # 全局状态（zustand）
├── hooks/                    # 全局通用 hooks
├── lib/                      # 工具函数
├── assets/                   # 静态资源
└── index.css                 # 全局样式 + 主题变量（浅色/深色 CSS 变量都在这里）
```

## 开发约定

1. **路由薄、feature 厚**：`routes/` 里只做路由声明和组装，页面实现写在 `features/` 对应模块里
2. **就近原则**：组件只被某个模块使用时，放在该模块内部（如 `features/users/components/`），被 2 个以上模块用到才提升到 `components/`
3. **`components/ui/` 是不可变区**：只通过 `pnpm dlx shadcn add <组件名>` 增删；要定制就在 `components/` 里包一层
4. **加新页面**：在 `src/routes/` 下新建文件即可，路由树自动生成：

   | 文件                            | URL                    |
   | ------------------------------- | ---------------------- |
   | `routes/users.tsx`              | `/users`               |
   | `routes/users.$userId.tsx`      | `/users/123`           |
   | `routes/_authenticated/xxx.tsx` | `/xxx`（带侧边栏布局） |

5. **主题变量**：改配色、调暗黑模式（比如觉得不够黑）都改 `src/index.css` 里的 `:root` 和 `.dark` 两个代码块
6. **提交规范**：`git commit` 时 Husky 会自动对暂存文件跑 ESLint 修复 + Prettier 格式化，检查不过会被拒绝提交

## License

MIT
