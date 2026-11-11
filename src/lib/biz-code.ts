/**
 * 前端业务码登记表（与后端 src/common/enums/biz-error-code.enum.ts 对应）
 *
 * 只登记**前端真正按码分支**的码，不做全量镜像 —— 后端 40+ 个码里绝大多数
 * 只需要展示 message（后端 message 本身就是给用户看的人话），逐个映射等于
 * 维护两份真相。判断「要不要登记」的标准和后端一样：有没有消费方。
 *
 * 规则：
 * - 值必须与后端枚举一致，改后端码时同步这里（冻结段的值永不改）
 * - 登记时在下一行注释写清消费方（哪个组件拿它做什么）
 * - 完整码表以后端枚举文件为准，这里不放未消费的码
 */
export const BIZ_CODE = {
  /** 登录页：锁定时禁用提交按钮并显示倒计时（登录失败次数过多） */
  ACCOUNT_LOCKED: 1009,
  /** 登录页：账号开了两步验证但没填动态码 → 弹出 6 位动态码输入框 */
  TOTP_REQUIRED: 2105,
  /** 登录页：两步验证码不对/过期 → 清空输入框让用户重试 */
  TOTP_INVALID: 2106,
  /** 导入弹窗：文件结构不对（缺关键列）→ 引导用户下载模板对照填写 */
  IMPORT_HEADER_MISMATCH: 6103,
  /** 导入弹窗：文件没内容（空文件 / 只有表头）→ 引导用户下载模板填写 */
  IMPORT_EMPTY: 6104
} as const

export type BizCode = (typeof BIZ_CODE)[keyof typeof BIZ_CODE]

/** 是否属于「导入模板问题」类错误（缺列 / 没数据行），调用方据此引导下载模板 */
export function isImportTemplateError(code: number | undefined): boolean {
  return code === BIZ_CODE.IMPORT_HEADER_MISMATCH || code === BIZ_CODE.IMPORT_EMPTY
}
