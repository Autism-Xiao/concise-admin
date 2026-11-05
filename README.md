# Concise Admin

基于 React 19 + Vite + shadcn/ui 的后台管理系统，内置完整的 mock 数据层：所有页面数据走 `public/mock/*.json`，开发环境下由 Vite 中间件提供读写接口，接真实后端时只需替换各模块的 `api.ts`。

## 技术栈

| 层     | 选型                                                     |
| ------ | -------------------------------------------------------- |
| 框架   | React 19 + TypeScript 6 + Vite 8                         |
| UI     | shadcn/ui 风格组件（Tailwind CSS 4 + Base UI）           |
| 路由   | TanStack Router（文件式路由，类型安全）                  |
| 表格   | TanStack Table                                           |
| 图表   | recharts                                                 |
| 主题   | next-themes（浅色 / 深色 / 跟随系统，切换带流光过渡）    |
| 图标   | lucide-react                                             |
| 工程化 | ESLint 10（flat config）+ Prettier + Husky + lint-staged |

## 快速开始

```bash
pnpm install
pnpm run dev
```

打开 http://localhost:5173 ，用后端（`/v1/auth/login`）下发的账号登录，角色与菜单由 `/v1/auth/permissions` 返回，前端不再内置任何演示账号。

登录页支持「记住密码」：勾选后可选 1 / 7 / 15 天有效期，到期自动失效，取消勾选立即清除本地记录（密码仅做 base64 编码存放，公共设备建议不要勾选）。

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
│   ├── login.tsx             # /login（无需鉴权）
│   ├── _authenticated.tsx    # 鉴权布局：侧边栏 + 头部 + 标签页 + 权限守卫
│   └── _authenticated/       # 需要登录的页面，自动套用上面的布局
│       ├── system/           # 系统管理各页（用户/菜单/角色/部门/字典/文件/日历/日志）
│       └── errors/           # /errors/401、403、404、500、503（带侧边栏布局）
│
├── components/               # 通用组件
│   ├── ui/                   # shadcn CLI 生成的组件，视为第三方代码，勿手改
│   ├── layout/               # 布局组件：app-sidebar / site-header / page-tabs 等
│   └── data-table/           # 表格封装（排序/筛选/分页/列显隐）
│
├── features/                 # 业务模块（核心目录，按领域划分，模块内部自治）
│   ├── auth/                 # 登录（验证码/登录/权限汇总均走真实后端）
│   ├── users/                # 用户管理
│   └── system/               # menu / role / dept / dict / file / calendar / log
│
├── config/                   # 常量配置：nav.ts 侧边栏、i18n.ts 中英文、page-registry.ts 标签页登记
├── context/                  # 全局 Provider（locale / settings / search / tabs）
├── lib/                      # 工具：http.ts 请求、auth.ts 登录态、permissions.ts 权限、settings.ts
├── assets/                   # 静态资源（Logo 等）
└── index.css                 # 全局样式 + 主题变量（浅色/深色 CSS 变量都在这里）

public/mock/                  # 仅剩「仪表盘/任务/日历/文件/地区/租户」等未接后端的本地数据
settings.json                 # 应用设置（字号/主题色/布局等），由 dev server 读写
```

## 接口约定

绝大多数模块已接真实后端：统一走 `src/lib/http.ts` 的 `getApiResult`，地址前缀 `/backend-api`
（vite 开发代理转发到 `BACKEND_URL`，生产由网关/Nginx 转发），响应解包 `{ code, message, result }`。

```ts
// features/system/role/api.ts
export function fetchRoles(query: RoleQuery): Promise<PageResult<Role>> {
  return getApiResult<PageResult<Role>>('/backend-api/v1/roles?...')
}
```

仍是本地数据的模块：仪表盘、任务、日历、文件、地区、租户。它们各有 `api.ts`，
读 `public/mock/*.json`，写操作由 `vite.config.ts` 的 `jsonWriteApi` 中间件落盘：

| 接口                 | 写入文件            | 类型     | 用途     |
| -------------------- | ------------------- | -------- | -------- |
| `POST /api/files`    | `mock/files.json`   | 整体覆盖 | 文件管理 |
| `POST /api/regions`  | `mock/regions.json` | 整体覆盖 | 地区管理 |
| `POST /api/tenants`  | `mock/tenants.json` | 整体覆盖 | 租户管理 |
| `GET/POST /api/settings` | `settings.json` | 读取/合并 | 应用设置 |

接后端时把对应 `api.ts` 的 URL 换成真实接口即可，页面代码不用动。

## 权限体系

- 权限数据全部来自后端：登录后调 `GET /backend-api/v1/auth/permissions` 拿按钮权限与菜单树，存本地后驱动侧边栏与路由守卫
- 侧边栏按后端下发的菜单树渲染；无权限的 URL 会被 `_authenticated` 布局的守卫拦截并跳 `/errors/403`
- 超管判定只认后端下发的 `*` 权限编码，前端存储的角色码不作为放行依据

## 开发约定

1. **路由薄、feature 厚**：`routes/` 里只做路由声明，页面实现写在 `features/` 对应模块里
2. **就近原则**：组件只被某个模块使用时放在模块内部（如 `features/users/components/`），被 2 个以上模块用到才提升到 `components/`
3. **`components/ui/` 是不可变区**：只通过 `pnpm dlx shadcn add <组件名>` 增删；要定制就在 `components/` 里包一层
4. **加新页面**：在 `src/routes/_authenticated/` 下新建文件即可，路由树自动生成；若要进多标签页，在 `config/page-registry.ts` 登记；若要进侧边栏，在「系统管理 → 菜单管理」里加一条并给角色授权
5. **主题变量**：改配色、调暗黑模式（比如觉得不够黑）都改 `src/index.css` 里的 `:root` 和 `.dark` 两个代码块
6. **提交规范**：`git commit` 时 Husky 会自动对暂存文件跑 ESLint 修复 + Prettier 格式化，检查不过会被拒绝提交

## License

MIT
