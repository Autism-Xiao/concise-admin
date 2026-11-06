import { useEffect, useState } from 'react'
import { Pencil, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/context/locale-provider'
import { useShortcuts } from '@/context/shortcut-provider'
import { SHORTCUT_LABEL_KEYS, SHORTCUT_IDS, comboFromEvent, displayCombo, type ShortcutId } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'

/**
 * 快捷键设置（偏好设置抽屉里的「快捷键」区）
 *
 * 交互：点「修改」进入录制态，按下任意合法组合即保存；
 * Esc 取消录制、Backspace 清除绑定；与其他快捷键冲突时拒绝保存并提示。
 */
export function ShortcutSettings() {
  const { t } = useLocale()
  const { shortcuts, setShortcut, reset } = useShortcuts()
  const [recording, setRecording] = useState<ShortcutId | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 录制态：window 捕获阶段截获按键，先于快捷键调度中心处理
  useEffect(() => {
    if (!recording) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setRecording(null)
        setError(null)
        return
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        setShortcut(recording, '')
        setRecording(null)
        setError(null)
        return
      }
      const combo = comboFromEvent(e)
      if (!combo) {
        setError(t('shortcut.invalid'))
        return
      }
      const conflict = SHORTCUT_IDS.find(id => id !== recording && shortcuts[id] === combo)
      if (conflict) {
        // t() 不支持插值，占位符手动替换
        setError(t('shortcut.conflict').replace('{name}', t(SHORTCUT_LABEL_KEYS[conflict])))
        return
      }
      setShortcut(recording, combo)
      setRecording(null)
      setError(null)
    }
    // 捕获阶段 + stopPropagation：拦在快捷键调度中心（window 冒泡）之前
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, shortcuts])

  return (
    <div className="space-y-2">
      {SHORTCUT_IDS.map(id => {
        const combo = shortcuts[id]
        const isRecording = recording === id
        return (
          <div key={id} className="flex items-center justify-between gap-3">
            <span className="text-sm">{t(SHORTCUT_LABEL_KEYS[id])}</span>
            <div className="flex items-center gap-2">
              {isRecording ? (
                <kbd className="bg-muted text-muted-foreground animate-pulse rounded border px-2 py-0.5 text-xs">{t('shortcut.pressTip')}</kbd>
              ) : (
                <kbd
                  className={cn(
                    'bg-muted min-w-20 rounded border px-2 py-0.5 text-center text-xs',
                    !combo && 'text-muted-foreground border-dashed'
                  )}
                >
                  {combo ? displayCombo(combo) : t('shortcut.unset')}
                </kbd>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                title={t('shortcut.edit')}
                disabled={!!recording}
                onClick={() => {
                  setError(null)
                  setRecording(id)
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
          </div>
        )
      })}
      {error && <p className="text-destructive text-xs">{error}</p>}
      <p className="text-muted-foreground text-xs">{t('shortcut.hint')}</p>
      <Button variant="outline" size="sm" disabled={!!recording} onClick={reset}>
        <RotateCcw className="size-3.5" />
        {t('shortcut.reset')}
      </Button>
    </div>
  )
}
