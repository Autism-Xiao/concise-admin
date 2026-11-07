import {
  BookOpen,
  FolderOpen,
  ListTodo,
  ListTree,
  LogIn,
  Megaphone,
  ScrollText,
  Server,
  ShieldCheck,
  UserCheck,
  Users,
  type LucideIcon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { hasPermission } from '@/lib/auth'

interface QuickEntry {
  path: string
  label: string
  icon: LucideIcon
  /** 目标页面的权限门槛；null 表示登录即可访问 */
  perm: string | null
}

/**
 * 快捷入口：门槛与目标页面完全一致（有权限才出现）
 *
 * 这一条不变式很重要：卡片上能点进去的页面，绝不会因为缺权限被甩到 403。
 * 「我的存储 / 任务看板 / 公告」三类是登录即可看，所以对任何账号都存在。
 */
const ENTRIES: QuickEntry[] = [
  { path: '/tasks', label: '任务看板', icon: ListTodo, perm: null },
  { path: '/system/file', label: '文件管理', icon: FolderOpen, perm: null },
  { path: '/system/notice', label: '通知公告', icon: Megaphone, perm: null },
  { path: '/system/users', label: '用户管理', icon: Users, perm: 'system:user:list' },
  { path: '/system/role', label: '角色权限', icon: ShieldCheck, perm: 'system:role:list' },
  { path: '/system/menu', label: '菜单管理', icon: ListTree, perm: 'system:menu:list' },
  { path: '/system/log/login', label: '登录日志', icon: LogIn, perm: 'system:log:login' },
  { path: '/system/log/operation', label: '操作日志', icon: ScrollText, perm: 'system:log:oper' },
  { path: '/system/dict', label: '数据字典', icon: BookOpen, perm: 'system:dict:list' },
  { path: '/ops/online', label: '在线用户', icon: UserCheck, perm: 'system:online:list' },
  { path: '/ops/server', label: '服务监控', icon: Server, perm: 'system:monitor:server' }
]

export function QuickEntriesCard({ onNavigate }: { onNavigate: (path: string) => void }) {
  const visible = ENTRIES.filter(entry => entry.perm === null || hasPermission(entry.perm))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">快捷入口</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-1.5">
          {visible.map(entry => (
            <button
              key={entry.path}
              type="button"
              onClick={() => onNavigate(entry.path)}
              className="hover:bg-accent flex flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 text-center transition-colors"
            >
              <entry.icon className="text-muted-foreground size-5" />
              <span className="text-xs leading-tight">{entry.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
