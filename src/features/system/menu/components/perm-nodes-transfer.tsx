import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from 'cn'
import type { PermNode } from '../api'

interface PermNodesTransferProps {
  /** 左栏来源池（已按当前菜单推导好 perms，且已剔除右栏已有的） */
  pool: PermNode[]
  /** 右栏已赋予节点 */
  granted: PermNode[]
  onChange: (next: PermNode[]) => void
  /** 不可用提示（如路由地址未填导致 perms 推导不了），非空时禁用添加 */
  disabledHint?: string
}

const checkboxClass = 'accent-primary size-4 cursor-pointer'

/**
 * 权限节点穿梭框：
 * 左栏「全部节点」勾选后 > 移入右栏「已赋予节点」，右栏勾选后 < 移回。
 * 仅操作表单内存状态，点「保存」时才随表单一起提交（全量替换语义）。
 */
export function PermNodesTransfer({ pool, granted, onChange, disabledHint }: PermNodesTransferProps) {
  const [leftChecked, setLeftChecked] = useState<Set<string>>(new Set())
  const [rightChecked, setRightChecked] = useState<Set<string>>(new Set())

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    return next
  }

  const moveRight = () => {
    const picked = pool.filter(n => leftChecked.has(n.perms))
    if (picked.length === 0) return
    onChange([...granted, ...picked])
    setLeftChecked(new Set())
  }

  const moveLeft = () => {
    if (rightChecked.size === 0) return
    onChange(granted.filter(n => !rightChecked.has(n.perms)))
    setRightChecked(new Set())
  }

  const allLeftChecked = pool.length > 0 && leftChecked.size === pool.length
  const allRightChecked = granted.length > 0 && rightChecked.size === granted.length
  const addBlocked = disabledHint !== undefined && disabledHint !== ''

  const panelClass = 'bg-background ring-foreground/10 overflow-hidden rounded-md ring-1'
  const headerClass = 'bg-muted flex items-center justify-between border-b px-3 py-2 text-sm font-medium'
  const rowClass = 'hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm'

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      {/* 左栏：全部节点 */}
      <div className={panelClass}>
        <div className={headerClass}>
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              className={checkboxClass}
              aria-label="全选全部节点"
              checked={allLeftChecked}
              disabled={pool.length === 0}
              onChange={e => setLeftChecked(e.target.checked ? new Set(pool.map(n => n.perms)) : new Set())}
            />
            全部节点
          </span>
          <span className="text-muted-foreground text-xs">
            {leftChecked.size}/{pool.length}
          </span>
        </div>
        <div className="max-h-52 min-h-32 overflow-y-auto p-1">
          {pool.map(node => (
            <label key={node.perms} className={rowClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={leftChecked.has(node.perms)}
                onChange={() => setLeftChecked(prev => toggle(prev, node.perms))}
              />
              <span>{node.name}</span>
              <span className="text-muted-foreground ml-auto font-mono text-xs">{node.perms}</span>
            </label>
          ))}
          {pool.length === 0 && <p className="text-muted-foreground py-6 text-center text-xs">全部节点均已赋予</p>}
        </div>
      </div>

      {/* 中间：移动按钮 */}
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="icon"
          className="size-9"
          disabled={leftChecked.size === 0 || addBlocked}
          title={addBlocked ? disabledHint : '移到已赋予'}
          onClick={moveRight}
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="outline" className="size-9" disabled={rightChecked.size === 0} title="移回全部节点" onClick={moveLeft}>
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      {/* 右栏：已赋予节点 */}
      <div className={cn(panelClass, granted.length === 0 && 'opacity-90')}>
        <div className={headerClass}>
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              className={checkboxClass}
              aria-label="全选已赋予节点"
              checked={allRightChecked}
              disabled={granted.length === 0}
              onChange={e => setRightChecked(e.target.checked ? new Set(granted.map(n => n.perms)) : new Set())}
            />
            已赋予节点
          </span>
          <span className="text-muted-foreground text-xs">
            {rightChecked.size}/{granted.length}
          </span>
        </div>
        <div className="max-h-52 min-h-32 overflow-y-auto p-1">
          {granted.map(node => (
            <label key={node.perms} className={rowClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={rightChecked.has(node.perms)}
                onChange={() => setRightChecked(prev => toggle(prev, node.perms))}
              />
              <span>{node.name}</span>
              <span className="text-muted-foreground ml-auto font-mono text-xs">{node.perms}</span>
            </label>
          ))}
          {granted.length === 0 && <p className="text-muted-foreground py-6 text-center text-xs">无数据</p>}
        </div>
      </div>
    </div>
  )
}
