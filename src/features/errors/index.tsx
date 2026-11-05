import { ErrorPage } from './error-page'

export { NoMenuAccess } from './no-menu-access'

export function UnauthorizedError() {
  return <ErrorPage code="401" title="未授权" description="请先登录后再访问该页面。" />
}

export function ForbiddenError() {
  return <ErrorPage code="403" title="禁止访问" description="你没有权限访问该页面，请联系管理员。" />
}

export function NotFoundError() {
  return <ErrorPage code="404" title="页面不存在" description="你访问的页面不存在或已被移除。" />
}

export function InternalServerError() {
  return <ErrorPage code="500" title="服务器错误" description="服务器开小差了，请稍后再试。" />
}

export function MaintenanceError() {
  return <ErrorPage code="503" title="系统维护中" description="系统正在维护升级，请稍后再试。" />
}
