export interface Dept {
  id: number
  name: string
  leader: string
  sort: number
  /** 上级部门 id，null 为顶级 */
  parentId: number | null
}

export const depts: Dept[] = [
  { id: 1, name: '总公司', leader: '张伟', sort: 1, parentId: null },
  { id: 2, name: '技术部', leader: '李娜', sort: 1, parentId: 1 },
  { id: 3, name: '前端组', leader: '王强', sort: 1, parentId: 2 },
  { id: 4, name: '后端组', leader: '陈静', sort: 2, parentId: 2 },
  { id: 5, name: '测试组', leader: '周杰', sort: 3, parentId: 2 },
  { id: 6, name: '市场部', leader: '刘洋', sort: 2, parentId: 1 },
  { id: 7, name: '财务部', leader: '赵敏', sort: 3, parentId: 1 },
  { id: 8, name: '人事部', leader: '孙丽', sort: 4, parentId: 1 }
]

/** 计算部门层级深度（顶级为 0），用于表格缩进展示 */
export function getDepth(dept: Dept, list: Dept[]): number {
  let depth = 0
  let current = dept
  while (current.parentId != null && depth < 10) {
    const parent = list.find(d => d.id === current.parentId)
    if (!parent) break
    depth++
    current = parent
  }
  return depth
}
