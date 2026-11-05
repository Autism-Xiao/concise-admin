/**
 * 导入失败明细的可读化。
 *
 * 后端目前仍会把数据库唯一约束错误原样透出（如
 * `Duplicate entry '18611111111' for key 'sys_user.uniq_sys_user_phone'`），
 * 用户看不懂、也暴露了表结构。这里做一层展示兜底：
 * 命中已知约束就翻译成中文，未命中则原样返回。
 *
 * 注意：这是显示层兜底，根治在后端 importUsers 里预检并给出业务错误。
 */
const DUPLICATE_FIELDS: Record<string, string> = {
  'sys_user.uniq_sys_user_phone': '手机号',
  'sys_user.uniq_sys_user_email': '邮箱',
  'sys_user.uniq_sys_user_username': '登录账号',
  'sys_role.uniq_sys_role_code': '角色编码',
  'sys_role.idx_role_code': '角色编码'
}

export function humanizeImportError(message: string): string {
  const dup = /Duplicate entry '([^']*)' for key '([^']+)'/i.exec(message)
  if (!dup) return message
  const field = DUPLICATE_FIELDS[dup[2]]
  return field ? `${field}「${dup[1]}」已被其他记录占用，请修改后重试` : '存在重复数据（唯一约束冲突），请检查后重试'
}
