import type { TranslationKey } from '@/config/i18n'

/**
 * 全局快捷键注册表
 *
 * 设计：组合键用规范字符串表示（如 "Ctrl+Shift+L"），存 localStorage，用户可在
 * 偏好设置里改绑。匹配规则：Ctrl 同时接受 e.ctrlKey 或 e.metaKey（Mac 上 ⌘ 等效 Ctrl，
 * 与项目里既有 Ctrl+J / Ctrl+B 的行为保持一致），其余修饰键严格匹配。
 *
 * 新加快捷键的规矩：在 SHORTCUT_DEFAULTS 加默认组合，在 SHORTCUT_META 加文案，
 * 然后在对应组件里 useShortcutAction(id, handler) 注册动作。
 */

export const SHORTCUT_DEFAULTS = {
  commandMenu: 'Ctrl+J',
  toggleSidebar: 'Ctrl+B',
  lockScreen: 'Ctrl+Shift+L',
  toggleFullscreen: 'Ctrl+Alt+F'
} as const

export type ShortcutId = keyof typeof SHORTCUT_DEFAULTS

/** 快捷键清单（设置界面的展示顺序即此数组的顺序） */
export const SHORTCUT_IDS = Object.keys(SHORTCUT_DEFAULTS) as ShortcutId[]

export const SHORTCUT_LABEL_KEYS: Record<ShortcutId, TranslationKey> = {
  commandMenu: 'shortcut.commandMenu',
  toggleSidebar: 'shortcut.toggleSidebar',
  lockScreen: 'shortcut.lockScreen',
  toggleFullscreen: 'shortcut.toggleFullscreen'
}

/** 未设置组合（清除后的状态）：保留 key 但置空串，匹配时跳过 */
export const EMPTY_COMBO = ''

const STORAGE_KEY = 'concise-shortcuts'
export const SHORTCUTS_CHANGED_EVENT = 'concise-shortcuts-changed'

/** 读本地已保存的快捷键（缺省项回退默认值） */
export function loadShortcuts(): Record<ShortcutId, string> {
  const saved: Partial<Record<ShortcutId, string>> = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<Record<ShortcutId, string>>
    } catch {
      return {}
    }
  })()
  const result = {} as Record<ShortcutId, string>
  for (const id of SHORTCUT_IDS) {
    result[id] = typeof saved[id] === 'string' ? saved[id] : SHORTCUT_DEFAULTS[id]
  }
  return result
}

/** 保存单个快捷键并广播变化（Provider 监听事件刷新 state） */
export function saveShortcut(id: ShortcutId, combo: string): void {
  const current = loadShortcuts()
  current[id] = combo
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  window.dispatchEvent(new Event(SHORTCUTS_CHANGED_EVENT))
}

/** 恢复全部默认 */
export function resetShortcuts(): void {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(SHORTCUTS_CHANGED_EVENT))
}

/**
 * 从键盘事件提取规范组合串；不可绑定时返回 null（无修饰键、Esc/Tab 等功能键）
 * 规则：至少含 Ctrl/Alt/Meta 之一，防止纯字母键吞掉正常输入
 */
export function comboFromEvent(e: KeyboardEvent): string | null {
  const hasModifier = e.ctrlKey || e.metaKey || e.altKey
  if (!hasModifier) return null
  const key = normalizeKey(e.key)
  if (!key) return null
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  parts.push(key)
  return parts.join('+')
}

function normalizeKey(key: string): string | null {
  // 功能键：Esc/Tab/Enter/空格不作为绑定键（Esc 留给取消录制等交互）
  if (['Escape', 'Tab', 'Enter', ' ', 'CapsLock'].includes(key)) return null
  // F1~F24 / 方向键直接可用
  if (/^F\d{1,2}$/.test(key) || /^Arrow\w+$/.test(key)) return key
  // 单字符（字母/数字/符号）：字母统一大写，避免大小写状态影响匹配
  if (key.length === 1) return key.toUpperCase()
  return null
}

/** 事件是否命中组合串；Ctrl 视作 e.ctrlKey 或 e.metaKey（Mac 等效） */
export function comboMatches(e: KeyboardEvent, combo: string): boolean {
  if (!combo) return false
  const parts = combo.split('+')
  const key = parts[parts.length - 1]
  const modifiers = parts.slice(0, -1)
  const needCtrl = modifiers.includes('Ctrl')
  const needAlt = modifiers.includes('Alt')
  const needShift = modifiers.includes('Shift')
  if (needCtrl !== (e.ctrlKey || e.metaKey)) return false
  if (needAlt !== e.altKey) return false
  if (needShift !== e.shiftKey) return false
  const normalized = normalizeKey(e.key)
  if (!normalized) return false
  // 单字符键不区分大小写；功能键精确匹配
  return key.length === 1 ? normalized.toUpperCase() === key.toUpperCase() : normalized === key
}

/** 展示用文案：Mac 下用 ⌘/⌥/⇧，其余平台保持 Ctrl/Alt/Shift */
export function displayCombo(combo: string): string {
  if (!combo) return ''
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
  if (!isMac) return combo.split('+').join(' + ')
  const symbols: Record<string, string> = { Ctrl: '⌘', Alt: '⌥', Shift: '⇧', Meta: '⌘' }
  return combo
    .split('+')
    .map(part => symbols[part] ?? part)
    .join(' ')
}
