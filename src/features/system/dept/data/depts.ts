export interface Dept {
  id: number
  name: string
  leader: string
  sort: number
  /** 上级部门 id，null 为顶级 */
  parentId: number | null
}

// mock 数据已清空，由真实接口替换
export const depts: Dept[] = []
