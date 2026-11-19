/**
 * 字典项语义色 / 自定义色 → 渲染样式
 *
 * 全站唯一调色板。业务代码不写颜色，只写 `<DictBadge code="xxx" value={v} />`；
 * 具体哪个状态是绿是红，由运营在「系统管理 → 数据字典」里配。
 *
 * 约束：
 * - **语义色只认名字，不存 tailwind class**：库里存 class 等于把亮色写死，暗色主题下对比度会崩
 * - **自定义色只认严格 #RRGGBB**（可不带 #）：不能用动态 class（Tailwind JIT 扫不到），
 *   走 inline style + color-mix 混入主题前景/背景，明暗主题都可读，且杜绝样式注入
 * - 后端 `src/modules/system/dict/dict.constants.ts` 的 DICT_COLORS 与本文件的语义色**必须同步**，
 *   多一个少一个不会报错，只是界面上静默退化成纯文本
 * - 视觉沿用 `status-badge.tsx`：浅底 + 深字 + 前置圆点
 */

import type { CSSProperties } from 'react'

/** 语义色选项（顺序即字典表单里的展示顺序） */
export const DICT_COLOR_OPTIONS = [
  { value: 'primary', label: '主色', short: '紫', className: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
  { value: 'success', label: '成功', short: '绿', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  { value: 'warning', label: '警告', short: '橙', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  { value: 'danger', label: '危险', short: '红', className: 'bg-destructive/15 text-destructive' },
  { value: 'info', label: '信息', short: '蓝', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  { value: 'neutral', label: '中性', short: '灰', className: 'bg-muted text-muted-foreground' }
] as const

export type DictSemanticColor = (typeof DICT_COLOR_OPTIONS)[number]['value']

/** 字典 color 字段的存储值：语义名 或 #RRGGBB */
export type DictColor = DictSemanticColor | (string & {})

const CLASS_BY_SEMANTIC = new Map<string, string>(DICT_COLOR_OPTIONS.map(item => [item.value, item.className] as [string, string]))
const HEX_PATTERN = /^#?([0-9a-fA-F]{6})$/

/** 是否合法语义色 */
export function isDictColor(value: unknown): value is DictSemanticColor {
  return typeof value === 'string' && CLASS_BY_SEMANTIC.has(value)
}

/** HEX 归一成 #RRGGBB（大写）；非 HEX 返回 null */
export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = HEX_PATTERN.exec(value.trim())
  return match ? `#${match[1].toUpperCase()}` : null
}

/** 是否合法字典色（语义名 / 合法 HEX） */
export function isDictColorValue(value: unknown): boolean {
  return isDictColor(value) || normalizeHexColor(value) !== null
}

/**
 * 颜色 → 渲染方式
 * - className：语义色走预设 class（明暗主题已调好对比度）
 * - style：自定义 HEX 走 inline style，color-mix 混入主题背景/前景保证可读
 * - null：未配置或非法，调用方退化成纯文本 —— 宁可没颜色，也不要显示一个错的色
 */
export interface DictColorVisual {
  className?: string
  style?: CSSProperties
}

export function dictColorVisual(color?: string | null): DictColorVisual | null {
  if (!color) return null
  if (isDictColor(color)) return { className: CLASS_BY_SEMANTIC.get(color) }
  const hex = normalizeHexColor(color)
  if (!hex) return null
  return {
    style: {
      // 15% 色 + 主题背景：浅色主题是浅底，暗色主题是深底，自动跟随
      backgroundColor: `color-mix(in oklab, ${hex} 15%, var(--background))`,
      // 50% 色 + 主题前景：混入足够的 foreground 保证任何色值下都有可读对比度
      color: `color-mix(in oklab, ${hex} 50%, var(--foreground))`
    }
  }
}

/**
 * @deprecated 用 dictColorVisual 替代：自定义色没有静态 class，必须走 inline style。
 * 仅保留给尚未迁移的调用方；新代码不要用。
 */
export function dictColorClass(color?: string | null): string | undefined {
  return isDictColor(color) ? CLASS_BY_SEMANTIC.get(color) : undefined
}
