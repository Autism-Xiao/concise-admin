import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

const NOTIFICATION_ITEMS = [
  { key: 'comment', label: '评论与回复', desc: '有人评论或回复你时通知' },
  { key: 'mention', label: '@ 提及', desc: '有人 @ 你时通知' },
  { key: 'system', label: '系统通知', desc: '系统升级、维护等通知' },
  { key: 'marketing', label: '营销邮件', desc: '产品动态与活动邮件' }
] as const

export function NotificationsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ comment: true, mention: true, system: true, marketing: false })

  const toggle = (key: string, checked: boolean) => {
    setEnabled(prev => ({ ...prev, [key]: checked }))
    toast.success('通知偏好已更新（mock）')
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>通知</CardTitle>
        <CardDescription>选择你想接收的通知类型</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {NOTIFICATION_ITEMS.map(item => (
          <div key={item.key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-muted-foreground text-xs">{item.desc}</p>
            </div>
            <Switch checked={!!enabled[item.key]} onCheckedChange={checked => toggle(item.key, checked)} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
