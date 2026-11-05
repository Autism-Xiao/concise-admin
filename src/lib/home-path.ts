import { HOME_PATH, PAGE_REGISTRY } from '@/config/page-registry'
import { computePermittedPaths } from './permissions'

/** 常驻页面：错误页与设置中心不依赖菜单授权，任何账号都能进，不能当「首页」候选 */
const NON_HOME_PREFIXES = ['/errors', '/settings', '/help-center']

/** 是否是可作为落地页的业务页面：前端已实现（在注册表里）且不是常驻页面 */
function isBusinessPage(path: string): boolean {
  if (!(path in PAGE_REGISTRY)) return false
  return !NON_HOME_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix + '/'))
}

/**
 * 解析当前账号的首页。
 *
 * 后端菜单树里没有「仪表盘」这个节点，只授权了某个业务菜单的账号并没有 /dashboard 权限。
 * 如果登录后仍然硬跳 /dashboard，就会被权限守卫拦到 403（表现为「有菜单权限却进不去一条数据」）。
 * 这里按「仪表盘 → 注册表顺序里第一个有权限的业务页面」选落地页。
 *
 * @param permitted 可见路径集合；null 表示超管（不过滤）
 * @returns 首页路由；null 表示该账号一个业务页面都没有（调用方展示「未分配菜单」提示）
 */
export function resolveHomePath(permitted: Set<string> | null): string | null {
  if (!permitted) return HOME_PATH
  if (permitted.has(HOME_PATH)) return HOME_PATH
  for (const path of Object.keys(PAGE_REGISTRY)) {
    if (permitted.has(path) && isBusinessPage(path)) return path
  }
  return null
}

/** 同步解析（读 localStorage 里的登录快照），供路由 beforeLoad / 标签页初始化使用 */
export function resolveHomePathFromStorage(): string {
  return resolveHomePath(computePermittedPaths()) ?? HOME_PATH
}
