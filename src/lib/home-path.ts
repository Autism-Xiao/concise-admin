import { HOME_PATH } from '@/config/page-registry'

/**
 * 解析当前账号的首页。
 *
 * 历史背景：以前后端菜单树里没有「仪表盘」节点时，没有该菜单授权的账号访问 /dashboard
 * 会被权限守卫拦到 403，所以这里有一套「仪表盘 → 注册表顺序里第一个有权限的业务页」的兜底，
 * 结果是不同账号登录后落在不同页面，换账号后经常找不到「首页」在哪。
 *
 * 现在首页是**常驻页面**（`isPathAllowed` 里 /dashboard 在白名单中），概览数据按权限逐块裁剪：
 * 没权限的块后端直接返回 null，页面表现为「更少的卡片」而不是整页被拦。
 * 因此落地页恒为首页，任何角色都是同一个入口 —— 这也是「首页」该有的语义。
 */
export function resolveHomePath(): string {
  return HOME_PATH
}

/** 供路由 beforeLoad / 标签页初始化同步调用（首页不再依赖权限集合，直接返回常量） */
export function resolveHomePathFromStorage(): string {
  return HOME_PATH
}
