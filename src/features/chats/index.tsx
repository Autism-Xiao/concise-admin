import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const conversations = [
  { id: 1, name: '张伟', lastMessage: '好的，明天见', time: '10:30' },
  { id: 2, name: '李娜', lastMessage: '文档我发你了', time: '09:15' },
  { id: 3, name: '王强', lastMessage: '这个需求下周排期', time: '昨天' }
]

export function ChatsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">聊天</h1>
      <div className="max-w-md divide-y rounded-md border">
        {conversations.map(c => (
          <div key={c.id} className="hover:bg-muted/50 flex items-center gap-3 p-3">
            <Avatar>
              <AvatarFallback>{c.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{c.name}</div>
              <div className="text-muted-foreground truncate text-sm">{c.lastMessage}</div>
            </div>
            <div className="text-muted-foreground text-xs">{c.time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
