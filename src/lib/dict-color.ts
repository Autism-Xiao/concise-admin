/**
 * 字典项语义色 → tailwind class
 *
 * 全站唯一调色板。业务代码不写颜色，只写 `<DictBadge code="xxx" value={v} />`；
 * 具体哪个状态是绿是红，由运营在「系统管理 → 数据字典」里配。
 *
 * 约束：
 * - **只认语义名，不存 tailwind class**：库里存 class 等于把亮色写死，暗色主题下对比度会崩，
 *   而且开放任意字符串拼进 className 就是样式注入面
 * - 后端 `src/modules/system/dict/dict.constants.ts` 的 DICT_COLORS 与这里**必须同步**，
 *   多一个少一个不会报错，只是界面上静默退化成纯文本
 * - 视觉沿用 `status-badge.tsx`：`bg-xxx-500/15` 浅底 + `text-xxx-600 dark:text-xxx-400` 深字 + 前置圆点
 */

/** 语义色选项（顺序即字典表单里的展示顺序） */
export const DICT_COLOR_OPTIONS = [
  { value: 'primary', label: '主色', short: '紫', className: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
  { value: 'success', label: '成功', short: '绿', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  { value: 'warning', label: '警告', short: '橙', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  { value: 'danger', label: '危险', short: '红', className: 'bg-destructive/15 text-destructive' },
  { value: 'info', label: '信息', short: '蓝', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  { value: 'neutral', label: '中性', short: '灰', className: 'bg-muted text-muted-foreground' }
] as const

export type DictColor = (typeof DICT_COLOR_OPTIONS)[number]['value']

const COLOR_CLASS = new Map<string, string>(DICT_COLOR_OPTIONS.map(item => [item.value, item.className] as [string, string]))

/** 是否合法语义色（后端导入/前端表单都靠这个白名单兜底） */
export function isDictColor(value: unknown): value is DictColor {
  return typeof value === 'string' && COLOR_CLASS.has(value)
}

/**
 * 语义色 → 徽标 class
 *
 * 未配置、或配了当前版本不认识的色（比如后端先加了新色、前端还没发版），
 * 一律返回 undefined，由调用方退化成纯文本 —— 宁可没颜色，也不要显示一个错的色。
 */
export function dictColorClass(color?: string | null): string | undefined {
  if (!color) return undefined
  return COLOR_CLASS.get(color)
}
