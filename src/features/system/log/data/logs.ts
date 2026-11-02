export type LogStatus = '成功' | '失败'

export interface LogEntry {
  id: number
  user: string
  action: string
  ip: string
  time: string
  status: LogStatus
}

const usersPool = ['zhangsan', 'lisi', 'wangwu', 'admin', 'zhaoliu']
const actionsPool = ['登录系统', '新增用户', '修改角色', '删除菜单', '导出数据', '修改字典', '新增部门', '修改密码']

const pad = (n: number) => String(n).padStart(2, '0')

// 确定性生成 mock 日志，按时间倒序（最新在前）
export const logs: LogEntry[] = Array.from({ length: 28 }, (_, i) => {
  const n = 28 - i
  const minutes = 9 * 60 + n * 23
  return {
    id: n,
    user: usersPool[n % usersPool.length],
    action: actionsPool[n % actionsPool.length],
    ip: `192.168.1.${100 + (n % 20)}`,
    time: `2026-11-${n > 14 ? '02' : '01'} ${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}:${pad((n * 37) % 60)}`,
    status: n % 4 === 3 ? '失败' : '成功'
  }
})
