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

打开 http://localhost:5173 ，使用演示账号登录：

| 账号       | 密码          | 角色       | 权限说明             |
| ---------- | ------------- | ---------- | -------------------- |
| `admin`    | `admin123`    | 超级管理员 | 全部菜单             |
| `manager`  | `manager123`  | 管理员     | 无菜单管理、字典管理 |
| `operator` | `operator123` | 运营       | 通用分组 + 日历      |
| `finance`  | `finance123`  | 财务       | 仅仪表盘、任务       |
| `support`  | `support123`  | 客服       | 仪表盘、聊天、用户   |
| `guest`    | `guest123`    | 访客       | 仅仪表盘             |

在「用户管理」里新建用户后，会同步生成登录账号（初始密码 `123456`）；把用户停用，对应账号立即无法登录；删除用户则账号一并删除。

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
│   ├── auth/                 # 登录（api.ts 校验 accounts.json）
│   ├── users/                # 用户管理（与用户登录账号双向同步）
│   └── system/               # menu / role / dept / dict / file / calendar / log
│
├── config/                   # 常量配置：nav.ts 侧边栏、i18n.ts 中英文、page-registry.ts 标签页登记
├── context/                  # 全局 Provider（locale / settings / search / tabs）
├── lib/                      # 工具：http.ts 请求、auth.ts 登录态、permissions.ts 权限、settings.ts
├── assets/                   # 静态资源（Logo 等）
└── index.css                 # 全局样式 + 主题变量（浅色/深色 CSS 变量都在这里）

public/mock/                  # mock 数据（所有页面的"数据库"）
settings.json                 # 应用设置（字号/主题色/布局等），由 dev server 读写
```

## Mock API 约定

每个业务模块有一个 `api.ts`，读数据统一走 `getJson('/mock/xxx.json')`：

```ts
// features/system/role/api.ts
export function fetchRoles(): Promise<Role[]> {
  return getJson<Role[]>('/mock/roles.json')
}
```

**开发环境的写操作**由 `vite.config.ts` 里的中间件落盘到对应 JSON（原子写入，失败自动回退页面数据）：

| 接口                       | 写入文件                   | 类型      | 用途                 |
| -------------------------- | -------------------------- | --------- | -------------------- |
| `POST /api/menus`          | `mock/menus.json`          | 整体覆盖  | 菜单管理             |
| `POST /api/roles`          | `mock/roles.json`          | 整体覆盖  | 角色与权限分配       |
| `POST /api/depts`          | `mock/depts.json`          | 整体覆盖  | 部门树               |
| `POST /api/users`          | `mock/users.json`          | 整体覆盖  | 用户管理             |
| `POST /api/accounts`       | `mock/accounts.json`       | 整体覆盖  | 登录账号             |
| `POST /api/dicts`          | `mock/dicts.json`          | 整体覆盖  | 字典管理             |
| `POST /api/files`          | `mock/files.json`          | 整体覆盖  | 文件管理             |
| `POST /api/logs/login`     | `mock/logs-login.json`     | 头部追加  | 登录日志（自动记录） |
| `POST /api/logs/operation` | `mock/logs-operation.json` | 头部插入  | 操作日志（自动记录） |
| `GET/POST /api/settings`   | `settings.json`            | 读取/合并 | 应用设置             |

**接真实后端**：逐个把 `api.ts` 里的 URL 换成真实接口即可，页面代码不用动；`withOperationLog` / `reportLogin` 同理换地址。

## 权限体系

- 角色（`roles.json`）通过 `menus` 字段记录可见菜单 id，在「系统管理 → 角色权限」里勾选分配，写回后即时生效
- 侧边栏按当前登录角色的权限过滤；直接输入无权限的 URL 会被 `_authenticated` 布局的守卫拦截并跳 `/errors/403`
- 右上角头像下拉可临时切换角色（演示用），真实身份由登录账号决定
- 用户管理的角色（superadmin/admin/manager/cashier）会映射到权限角色码，见 `features/users/api.ts` 的 `mapUserRoleToCode`

## 开发约定

1. **路由薄、feature 厚**：`routes/` 里只做路由声明，页面实现写在 `features/` 对应模块里
2. **就近原则**：组件只被某个模块使用时放在模块内部（如 `features/users/components/`），被 2 个以上模块用到才提升到 `components/`
3. **`components/ui/` 是不可变区**：只通过 `pnpm dlx shadcn add <组件名>` 增删；要定制就在 `components/` 里包一层
4. **加新页面**：在 `src/routes/_authenticated/` 下新建文件即可，路由树自动生成；若要进多标签页，在 `config/page-registry.ts` 登记；若要进侧边栏，在 `config/nav.ts` 和 `mock/menus.json` 各加一条
5. **主题变量**：改配色、调暗黑模式（比如觉得不够黑）都改 `src/index.css` 里的 `:root` 和 `.dark` 两个代码块
6. **提交规范**：`git commit` 时 Husky 会自动对暂存文件跑 ESLint 修复 + Prettier 格式化，检查不过会被拒绝提交

## License

MIT
