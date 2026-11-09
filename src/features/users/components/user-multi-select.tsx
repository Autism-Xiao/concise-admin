'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Search, X } from 'lucide-react'
import { cn } from 'cn'
import { fetchUsers, lookupUsers, type UserBrief } from '@/features/users/api'

/** 输入停顿多久才发请求（避免每敲一个字都打后端） */
const SEARCH_DEBOUNCE_MS = 250

interface UserMultiSelectProps {
  /** 已选用户 ID（后端存 ID，页面展示账号） */
  value: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  disabled?: boolean
  /**
   * 单选模式：选中一人后面板自动收起，再次点同一人则清空。
   * 供「任务负责人」这类只能有一个人的字段复用同一套搜索/回显逻辑。
   */
  single?: boolean
}

/**
 * 多选用户控件：输入框内是已选 chips + 搜索框，输入走服务端 keyword 搜索（账号/姓名/电话），
 * 点列表项即加入或移除，面板不关闭，可连续勾选多个。
 *
 * single=true 时退化为单选（选中即收起、单选一人）。
 *
 * 回显：已选 ID 由 `/users/lookup` 批量翻译成账号（搜索结果只覆盖当前页，不能只靠它），
 * 用户已被删除时退化为红色 `#id`，保存时仍按原 ID 传回，不会静默丢人。
 */
export function UserMultiSelect({ value, onChange, placeholder = '搜索账号或姓名，可多选', disabled, single = false }: UserMultiSelectProps) {
  const [keyword, setKeyword] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  /** 当前搜索结果（服务端分页，最多 100 条） */
  const [options, setOptions] = useState<UserBrief[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loadFailed, setLoadFailed] = useState(false)
  /** 已选 ID → 账号信息缓存，保证 chips 一直能显示账号 */
  const [briefs, setBriefs] = useState<Record<string, UserBrief>>({})
  /** 查过但确实拿不到账号的 ID（用户已删除 / 后端没有 lookup 接口），避免死循环重查 */
  const failedRef = useRef<Set<string>>(new Set())
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 数组引用每次都变，用拼串做依赖，避免无意义的重复请求
  const valueKey = value.join(',')

  /* ---------- 回显：把已选 ID 翻译成账号 ---------- */
  useEffect(() => {
    const ids = valueKey ? valueKey.split(',') : []
    // 依赖里带 briefs：拿到账号后会再跑一次，这时 missing 为空自然停下
    const missing = ids.filter(id => id && !briefs[id] && !failedRef.current.has(id))
    if (!missing.length) return
    let alive = true

    /** 优先 lookup（按 ID 精确、一次拿全）；失败或空结果退回用户列表兜底（后端未升级时也能显示） */
    const resolve = async (): Promise<UserBrief[]> => {
      try {
        const list = await lookupUsers(missing)
        if (list.length) return list
      } catch {
        // 后端还没这个接口（404）或网络异常，走下面的列表兜底
      }
      const res = await fetchUsers()
      return (res.records ?? []).map(u => ({ id: u.id, username: u.username, realname: u.realname }))
    }

    resolve()
      .then(list => {
        if (!alive) return
        const hit: UserBrief[] = []
        const next: Record<string, UserBrief> = {}
        list.forEach(item => {
          next[item.id] = item
        })
        missing.forEach(id => {
          const found = next[id]
          if (found) hit.push(found)
        })
        if (hit.length) {
          setBriefs(prev => {
            const merged = { ...prev }
            hit.forEach(item => {
              merged[item.id] = item
            })
            return merged
          })
        }
        // 一个都没命中（账号已删 / 后端不可用）：记下避免反复重试，chip 保留红色 #id
        if (!hit.length) missing.forEach(id => failedRef.current.add(id))
      })
      .catch(() => {
        if (alive) missing.forEach(id => failedRef.current.add(id))
      })

    return () => {
      alive = false
    }
  }, [valueKey, briefs])

  /* ---------- 搜索：服务端 keyword 模糊匹配账号/姓名/电话 ---------- */
  useEffect(() => {
    if (!open) return
    const kw = keyword.trim()
    let alive = true
    setLoading(true)
    const timer = setTimeout(
      () => {
        fetchUsers(kw)
          .then(res => {
            if (!alive) return
            const list = (res.records ?? []).map(u => ({ id: u.id, username: u.username, realname: u.realname }))
            setOptions(list)
            setActiveIndex(0)
            setLoadFailed(false)
          })
          .catch(() => {
            if (!alive) return
            setOptions([])
            setLoadFailed(true)
          })
          .finally(() => {
            if (alive) setLoading(false)
          })
      },
      kw ? SEARCH_DEBOUNCE_MS : 0
    )
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [open, keyword])

  /* ---------- 点击面板外收起 ---------- */
  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  const toggle = (user: UserBrief) => {
    const selected = value.includes(user.id)
    if (!selected) {
      // 顺手缓存账号信息，chip 立刻就有账号显示，不必等 lookup
      setBriefs(prev => (prev[user.id] ? prev : { ...prev, [user.id]: user }))
    }
    if (single) {
      // 单选：点已选中的等于取消，点新的人直接替换并收起面板
      onChange(selected ? [] : [user.id])
      setKeyword('')
      setOpen(false)
      return
    }
    onChange(selected ? value.filter(id => id !== user.id) : [...value, user.id])
    inputRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    // 输入框为空时退格删最后一个（和系统标签输入框一致的习惯）
    if (e.key === 'Backspace' && !keyword && value.length) {
      onChange(value.slice(0, -1))
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!open) {
        setOpen(true)
        return
      }
      e.preventDefault()
      const delta = e.key === 'ArrowDown' ? 1 : -1
      setActiveIndex(i => Math.min(Math.max(i + delta, 0), Math.max(options.length - 1, 0)))
      return
    }
    if (e.key === 'Enter') {
      if (!open) {
        setOpen(true)
        return
      }
      const target = options[activeIndex]
      if (target) {
        e.preventDefault()
        toggle(target)
      }
      return
    }
    if (e.key === 'Escape' && open) {
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          'ring-foreground/10 focus-within:ring-ring flex min-h-9 flex-wrap items-center gap-1 rounded-md px-2 py-1 ring-1',
          disabled && 'pointer-events-none opacity-60'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(id => {
          const brief = briefs[id]
          return (
            <span
              key={id}
              className={cn(
                'inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-xs',
                brief ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
              )}
              title={brief ? `${brief.username}${brief.realname ? `（${brief.realname}）` : ''}` : `${id}（账号已不存在）`}
            >
              <span className="truncate">{brief ? (brief.realname ? `${brief.username}（${brief.realname}）` : brief.username) : `#${id}`}</span>
              <button
                type="button"
                aria-label={`移除 ${brief?.username ?? id}`}
                className="hover:text-destructive shrink-0 opacity-70"
                onClick={e => {
                  e.stopPropagation()
                  onChange(value.filter(v => v !== id))
                }}
              >
                <X className="size-3" />
              </button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          data-multiselect-input
          aria-label="搜索用户账号或姓名"
          value={keyword}
          disabled={disabled}
          autoComplete="off"
          placeholder={value.length === 0 ? placeholder : ''}
          className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-sm"
          onChange={e => {
            setKeyword(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <Search className="text-muted-foreground size-3.5 shrink-0" />
      </div>

      {open && (
        <div data-multiselect-panel className="bg-popover ring-foreground/10 absolute z-50 mt-1 w-full overflow-hidden rounded-lg shadow-md ring-1">
          <div className="max-h-56 overflow-y-auto py-1">
            {loading && (
              <p className="text-muted-foreground flex items-center gap-2 px-2 py-3 text-xs">
                <Loader2 className="size-3 animate-spin" /> 搜索中…
              </p>
            )}
            {!loading &&
              options.map((user, index) => {
                const selected = value.includes(user.id)
                return (
                  <button
                    key={user.id}
                    type="button"
                    // 阻止默认 mousedown，保持输入框焦点，方便连续勾选
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => toggle(user)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn('flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm', index === activeIndex && 'bg-accent')}
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded border',
                        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                      )}
                    >
                      {selected && <Check className="size-3" />}
                    </span>
                    <span className="truncate">{user.username}</span>
                    {user.realname && <span className="text-muted-foreground truncate text-xs">{user.realname}</span>}
                  </button>
                )
              })}
            {!loading && options.length === 0 && (
              <p className="text-muted-foreground px-2 py-3 text-xs">
                {loadFailed ? '无法加载用户列表（可能缺少用户查看权限）' : keyword.trim() ? '没有匹配的用户' : '暂无可选用户'}
              </p>
            )}
          </div>
          <div className="border-border/60 flex items-center justify-between border-t px-2 py-1.5">
            <span className="text-muted-foreground text-xs">{single ? (value.length ? '已指派（点其他人可替换）' : '未指派') : `已选 ${value.length} 人`}</span>
            {value.length > 0 && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
                onClick={() => onChange([])}
              >
                清空
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
