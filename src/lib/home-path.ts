import { HOME_PATH } from '@/config/page-registry'

/**
 * 解析当前账号的首页。
 *
 * 首页是「工作台/概览」：路由守卫白名单放行（`isPathAllowed`），概览数据由后端按权限逐块裁剪
 * （没权限的块返回 null，页面表现为更少的卡片，而不是整页 403）。
 * 因此落地页恒为首页，任何角色都是同一个入口 —— 这也是「首页」该有的语义。
 *
 * 侧边栏的首页入口走**动态菜单**：后端 `GET /v1/auth/permissions` 会把菜单表里的
 * `/dashboard` 节点补进菜单树（角色没勾选也补），前端按菜单配置的排序/名称渲染，
 * 不再有硬编码的顶部固定项。
 */
export function resolveHomePath(): string {
  return HOME_PATH
}

/** 供路由 beforeLoad / 标签页初始化同步调用（首页不再依赖权限集合，直接返回常量） */
export function resolveHomePathFromStorage(): string {
  return HOME_PATH
}
