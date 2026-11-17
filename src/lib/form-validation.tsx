import { useState } from 'react'

/**
 * 轻量表单校验层
 *
 * 为什么自己写而不是上 react-hook-form + zod：全站 18 个表单是自绘受控组件
 * （useState + onChange），引入 RHF 意味着全部重写，风险远大于收益。
 * 这里只提供三样东西：单条规则、批量校验、字段错误展示 —— 各表单保持现有结构不变，
 * 只在 handleSubmit 开头跑一次校验，把结果落到 errors state。
 *
 * 约定：
 * - 规则函数返回错误文案（string）或 null（通过）
 * - `optional()` 包一层即可让「非必填但有格式」的字段在留空时放行
 * - 校验失败时 `aria-invalid` 会自动给 Input 红边框（ui/input.tsx 内置样式），
 *   配合 `<FieldError>` 在字段底部显示红色提示 —— 对齐 Element Plus 的字段级反馈
 */

/** 单条校验规则：返回错误文案，null 表示通过。`all` 是全量表单值，供跨字段规则（如日期先后）使用 */
export type Validator = (value: string, all?: Record<string, unknown>) => string | null

/** 批量校验入参：字段名 → 规则列表（按顺序跑，第一条失败即记下） */
export type FieldRules = Record<string, Validator[]>

/** 批量校验结果：字段名 → 第一条错误文案 */
export type FieldErrors = Record<string, string>

// ---------------------------------------------------------------------------
// 常用正则（与后端 DTO 约束对齐）
// ---------------------------------------------------------------------------

/** 中国大陆手机号 */
const PHONE_RE = /^1[3-9]\d{9}$/
/** 座机：区号-号码，如 010-88886666 / 0755 88886666 */
const TEL_RE = /^0\d{2,3}[- ]?\d{7,8}$/
/** 邮箱（务实版：本地段@域名.后缀，不做 RFC 全量） */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** 编码类：字母开头，只含字母/数字/下划线/中划线 */
const CODE_RE = /^[A-Za-z][A-Za-z0-9_-]*$/
/** 行政区划代码：12 位数字 */
const AREA_CODE_RE = /^\d{12}$/
/** cron 表达式：5~7 段（秒 分 时 日 月 周 [年]），只做结构校验不做语义校验 */
const CRON_RE = /^\S+\s+\S+\s+\S+\s+\S+\s+\S+(\s+\S+){0,2}$/

// ---------------------------------------------------------------------------
// 单条规则
// ---------------------------------------------------------------------------

/** 必填（trim 后非空） */
export const required =
  (label: string): Validator =>
  value =>
    value.trim() ? null : `请填写${label}`

/** 必选（用于下拉等「0/'' 都可能合法」以外的场景：空串未选） */
export const requiredSelect =
  (label: string): Validator =>
  value =>
    value !== '' && value != null ? null : `请选择${label}`

/** 最小长度 */
export const minLength =
  (n: number, label = '长度'): Validator =>
  value =>
    value.trim().length >= n ? null : `${label}不能少于 ${n} 位`

/** 最大长度 */
export const maxLength =
  (n: number, label = '长度'): Validator =>
  value =>
    value.trim().length <= n ? null : `${label}不能超过 ${n} 位`

/** 中国大陆手机号 */
export const phone: Validator = value => (PHONE_RE.test(value.trim()) ? null : '请输入正确的手机号（11 位，1 开头）')

/** 手机号或座机（联系电话类字段） */
export const contactPhone: Validator = value => {
  const v = value.trim()
  return PHONE_RE.test(v) || TEL_RE.test(v) ? null : '请输入正确的手机号或座机号'
}

/** 邮箱 */
export const email: Validator = value => (EMAIL_RE.test(value.trim()) ? null : '请输入正确的邮箱地址')

/** 系统编码：字母开头，只含字母/数字/下划线/中划线（字典编码、角色权限字符、租户编码等） */
export const sysCode: Validator = value => (CODE_RE.test(value.trim()) ? null : '编码须以字母开头，只含字母、数字、下划线或中划线')

/** 自定义正则校验 */
export const pattern =
  (re: RegExp, message: string): Validator =>
  value =>
    re.test(value.trim()) ? null : message

/** 行政区划代码：12 位数字 */
export const areaCode: Validator = value => (AREA_CODE_RE.test(value.trim()) ? null : '区划代码须为 12 位数字')

/** cron 表达式结构（5~7 段，空格分隔） */
export const cron: Validator = value => (CRON_RE.test(value.trim()) ? null : 'cron 须为 5~7 段、空格分隔，如 0 0 3 * * *')

/** 整数范围（数字输入框） */
export const intRange =
  (min: number, max: number, label = '数值'): Validator =>
  value => {
    const n = Number(value)
    if (!Number.isInteger(n)) return `${label}须为整数`
    if (n < min || n > max) return `${label}须在 ${min} ~ ${max} 之间`
    return null
  }

/** 数值范围（允许小数，经纬度、金额这类字段用） */
export const numberRange =
  (min: number, max: number, label = '数值'): Validator =>
  value => {
    const n = Number(value)
    if (Number.isNaN(n)) return `${label}须为数字`
    if (n < min || n > max) return `${label}须在 ${min} ~ ${max} 之间`
    return null
  }

/** 金额：非负，最多两位小数 */
export const amount: Validator = value => {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return '金额须为非负数字，最多两位小数'
  return null
}

/** 日期先后：endKey 字段必须 ≥ startKey 字段（都有值时才比较） */
export const dateAfter =
  (startKey: string, endKey: string, startLabel = '开始时间', endLabel = '结束时间'): Validator =>
  (_value, all?: Record<string, unknown>) => {
    if (!all) return null
    const s = String(all[startKey] ?? '')
    const e = String(all[endKey] ?? '')
    if (!s || !e) return null
    return e >= s ? null : `${endLabel}不能早于${startLabel}`
  }

/**
 * 非必填包装：留空（trim 后为空串）直接放行，有值才跑后面的规则。
 * 注意：required 不能被 optional 包（语义冲突）；跨字段规则用 `allValues` 传全量。
 */
export function optional(...rules: Validator[]): Validator {
  return (value, all) => {
    if (!value.trim()) return null
    for (const rule of rules) {
      const error = rule(value, all)
      if (error) return error
    }
    return null
  }
}

/** 必填包装：先跑 required 再跑格式规则 */
export function requiredWith(label: string, ...rules: Validator[]): Validator {
  const base = required(label)
  return (value, all) => base(value) ?? rules.reduce<string | null>((acc, rule) => acc ?? rule(value, all), null)
}

// ---------------------------------------------------------------------------
// 批量校验
// ---------------------------------------------------------------------------

/**
 * 跑一组字段规则，返回错误表（空对象 = 全部通过）
 *
 * 值统一转字符串再交给规则；number 0 会变成 '0'，不会被 required 误判。
 * 跨字段规则（dateAfter）会拿到全量 values。
 */
export function validateFields(rules: FieldRules, values: Record<string, unknown>): FieldErrors {
  const errors: FieldErrors = {}
  for (const [key, fieldRules] of Object.entries(rules)) {
    const value = String(values[key] ?? '')
    for (const rule of fieldRules) {
      const error = rule(value, values)
      if (error) {
        errors[key] = error
        break
      }
    }
  }
  return errors
}

/** 组件里管 errors state 的便捷 hook：提交校验 + 输入时清掉对应字段的错误 */
export function useFieldErrors() {
  const [errors, setErrors] = useState<FieldErrors>({})

  /** 提交前调用：有错误返回 false（调用方直接 return，不提交） */
  const runValidation = (rules: FieldRules, values: Record<string, unknown>): boolean => {
    const next = validateFields(rules, values)
    setErrors(next)
    return Object.keys(next).length === 0
  }

  /** 字段变更时调用：清掉该字段的错误提示（输入了新值，旧错误不再成立） */
  const clearError = (key: string) =>
    setErrors(prev => (prev[key] ? { ...prev, [key]: '' } : prev))

  const reset = () => setErrors({})

  return { errors, runValidation, clearError, reset }
}

/** 字段底部红色提示（对齐 Element Plus 的字段级错误文案） */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-destructive text-xs leading-4" role="alert">
      {message}
    </p>
  )
}
