'use client'

import * as React from 'react'
import { cn } from 'cn'
import {
  LayoutDashboard, LayoutGrid, LayoutList, LayoutTemplate, House, Home, Building, Building2, Users, User, UserCog, UserPlus, UsersRound, Contact, IdCard, ShieldCheck, Shield, ShieldHalf, KeyRound, Lock, LockOpen, Unlock, Settings, Settings2, Cog, Wrench, Hammer, SlidersHorizontal, Database, HardDrive, Server, ServerCog, Cloud, CloudUpload, CloudDownload, Folder, FolderOpen, FolderTree, File, FileText, FileCode, FileImage, FileSpreadsheet, FileArchive, FileSearch, Files, BookOpen, BookMarked, NotebookPen, Pencil, ClipboardList, ClipboardCheck, ListTodo, ListChecks, List, CircleDot, CircleCheck, CircleAlert, CircleQuestionMark, Info, Search, Eye, EyeOff, Filter, Funnel, Download, Upload, RefreshCw, RotateCcw, ArrowRight, ArrowLeftRight, ArrowUpDown, Repeat, Recycle, Trash2, Archive, ArchiveRestore, Package, PackageOpen, Box, Boxes, ShoppingBag, ShoppingCart, Tag, Tags, Ticket, Percent, Wallet, CreditCard, Banknote, Coins, Receipt, Landmark, Store, Briefcase, Calendar, CalendarDays, CalendarClock, Clock, Timer, Hourglass, History, Bell, BellRing, MessageSquare, MessageCircle, Mail, MailOpen, Send, Inbox, Phone, AtSign, Globe, MapPin, Map, Navigation, Compass, Route, Link, Share2, QrCode, Star, Heart, Bookmark, Flag, Award, Trophy, Crown, Gem, Zap, Flame, Sparkles, Rocket, Target, Gauge, Activity, TrendingUp, TrendingDown, ChartColumn, ChartLine, ChartPie, Table, SquareKanban, GitBranch, GitMerge, Code, CodeXml, Terminal, SquareTerminal, Braces, Bug, FlaskConical, LifeBuoy, Headset, Bot, Brain, Cpu, MemoryStick, CircuitBoard, Monitor, Smartphone, Laptop, Printer, Camera, Image, Images, Video, Music, Mic, Volume2, Play, Pause, SquarePower, Power, ToggleLeft, Plug, Cable, Wifi, Bluetooth, Network, Workflow, Handshake, HeartHandshake, Scale, Gavel, ScrollText, Stethoscope, Pill, GraduationCap, Book, Library, Lightbulb, Puzzle, Blocks, Component, Layers, Shapes, Palette, Brush, Paintbrush, Droplet, Sun, Moon, Wind, Leaf, TreePine, Cat, Dog, Smile, SmilePlus, ImagePlus, FileQuestion, CircleHelp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/** 供菜单选择的常用图标（key 为 lucide 组件名，与菜单 icon 字段存储值一致） */
export const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, LayoutGrid, LayoutList, LayoutTemplate, House, Home, Building, Building2, Users, User, UserCog, UserPlus, UsersRound, Contact, IdCard, ShieldCheck, Shield, ShieldHalf, KeyRound, Lock, LockOpen, Unlock, Settings, Settings2, Cog, Wrench, Hammer, SlidersHorizontal, Database, HardDrive, Server, ServerCog, Cloud, CloudUpload, CloudDownload, Folder, FolderOpen, FolderTree, File, FileText, FileCode, FileImage, FileSpreadsheet, FileArchive, FileSearch, Files, BookOpen, BookMarked, NotebookPen, Pencil, ClipboardList, ClipboardCheck, ListTodo, ListChecks, List, CircleDot, CircleCheck, CircleAlert, CircleQuestionMark, Info, Search, Eye, EyeOff, Filter, Funnel, Download, Upload, RefreshCw, RotateCcw, ArrowRight, ArrowLeftRight, ArrowUpDown, Repeat, Recycle, Trash2, Archive, ArchiveRestore, Package, PackageOpen, Box, Boxes, ShoppingBag, ShoppingCart, Tag, Tags, Ticket, Percent, Wallet, CreditCard, Banknote, Coins, Receipt, Landmark, Store, Briefcase, Calendar, CalendarDays, CalendarClock, Clock, Timer, Hourglass, History, Bell, BellRing, MessageSquare, MessageCircle, Mail, MailOpen, Send, Inbox, Phone, AtSign, Globe, MapPin, Map, Navigation, Compass, Route, Link, Share2, QrCode, Star, Heart, Bookmark, Flag, Award, Trophy, Crown, Gem, Zap, Flame, Sparkles, Rocket, Target, Gauge, Activity, TrendingUp, TrendingDown, ChartColumn, ChartLine, ChartPie, Table, SquareKanban, GitBranch, GitMerge, Code, CodeXml, Terminal, SquareTerminal, Braces, Bug, FlaskConical, LifeBuoy, Headset, Bot, Brain, Cpu, MemoryStick, CircuitBoard, Monitor, Smartphone, Laptop, Printer, Camera, Image, Images, Video, Music, Mic, Volume2, Play, Pause, SquarePower, Power, ToggleLeft, Plug, Cable, Wifi, Bluetooth, Network, Workflow, Handshake, HeartHandshake, Scale, Gavel, ScrollText, Stethoscope, Pill, GraduationCap, Book, Library, Lightbulb, Puzzle, Blocks, Component, Layers, Shapes, Palette, Brush, Paintbrush, Droplet, Sun, Moon, Wind, Leaf, TreePine, Cat, Dog, Smile, SmilePlus, ImagePlus, FileQuestion, CircleHelp,
}

const ICON_NAMES = Object.keys(ICON_MAP)

interface IconPickerProps {
  /** 当前值（lucide 组件名，如 LayoutDashboard），空串表示未选 */
  value: string
  onChange: (name: string) => void
}

/**
 * 图标选择器：触发按钮实时预览当前图标（未选/名称无效时显示占位），
 * 弹层内支持按名称搜索 + 网格点选，选中后写回表单字段。
 */
export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [keyword, setKeyword] = React.useState('')

  // 注意：对该 TS 版本不能对图标组件做真值判断（TS2774），统一用 in 判定存在性
  const PreviewIcon = ICON_MAP[value]
  const hasIcon = value in ICON_MAP
  const filtered = React.useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return ICON_NAMES
    return ICON_NAMES.filter(name => name.toLowerCase().includes(kw))
  }, [keyword])

  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (next) setKeyword('')
      }}
    >
      <PopoverTrigger
        type="button"
        title="选择图标"
        aria-label="选择图标"
        className={cn(
          'ring-foreground/10 hover:bg-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1 outline-none focus-visible:ring-2',
          hasIcon ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {hasIcon ? <PreviewIcon className="size-4" /> : <SmilePlus className="size-4" />}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索图标名称，如 user / chart" className="h-8" />
          <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto">
            {filtered.map(name => {
              const Icon = ICON_MAP[name]
              const selected = name === value
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  aria-label={name}
                  className={cn(
                    'text-foreground/80 hover:bg-accent hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md outline-none',
                    selected && 'bg-primary/10 text-primary ring-primary/30 ring-1'
                  )}
                  onClick={() => {
                    onChange(name)
                    setOpen(false)
                  }}
                >
                  <Icon className="size-4" />
                </button>
              )
            })}
            {filtered.length === 0 && <p className="text-muted-foreground col-span-8 py-4 text-center text-xs">没有匹配的图标</p>}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">{filtered.length} 个图标</span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
            >
              清除图标
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
