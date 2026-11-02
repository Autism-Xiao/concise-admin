export interface App {
  name: string
  description: string
  connected: boolean
}

export const apps: App[] = [
  { name: 'Slack', description: '团队沟通与协作工具', connected: true },
  { name: 'GitHub', description: '代码托管与版本管理', connected: true },
  { name: 'Figma', description: '界面设计与原型协作', connected: false },
  { name: 'Notion', description: '笔记与知识库管理', connected: true },
  { name: 'Zoom', description: '视频会议与在线沟通', connected: false },
  { name: 'Stripe', description: '在线支付与账单管理', connected: false },
  { name: 'Docker', description: '容器化部署与运维', connected: true },
  { name: 'GitLab', description: 'CI/CD 与代码审查', connected: false }
]
