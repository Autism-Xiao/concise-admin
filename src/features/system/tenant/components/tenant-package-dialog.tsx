import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RolePermissionDialog, type MenuTreeNode } from '@/features/system/role/components/role-permission-dialog'
import { isUnavailableError, userMessageOf } from '@/lib/api-error'
import { fetchTenantPackage, saveTenantPackage, type Tenant } from './api'

interface TenantPackageDialogProps {
  tenant: Tenant
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 租户功能套餐：勾选该租户可用的租户级菜单/按钮（平台级菜单不在此列）
 *
 * 复用角色授权弹窗的勾选树（RolePermissionDialog），只是标题/描述不同。
 * 收窄套餐不会回收角色既有授权——超出套餐的授权在读取端（登录菜单树）被交集过滤，
 * 角色授权端也会拒绝再授未开通的菜单。
 */
export function TenantPackageDialog({ tenant, open, onOpenChange }: TenantPackageDialogProps) {
  const [tree, setTree] = useState<MenuTreeNode[] | null>(null)
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    fetchTenantPackage(tenant.id)
      .then(detail => {
        setTree(detail.tree as MenuTreeNode[])
        setCheckedIds(detail.menuIds)
      })
      .catch(e => setError(userMessageOf(e, '加载失败')))
      .finally(() => setLoading(false))
  }, [open, tenant.id])

  const handleSubmit = (menuIds: string[]) => {
    setSaving(true)
    saveTenantPackage(tenant.id, menuIds)
      .then(result => {
        toast.success(`「${tenant.name}」功能套餐已保存（${result.total} 项）`)
        onOpenChange(false)
      })
      .catch(e => toast.error(userMessageOf(e, '保存失败')))
      .finally(() => setSaving(false))
  }

  if (loading) {
    return (
      <RolePermissionDialog
        key={`pkg-loading-${tenant.id}`}
        open={open}
        onOpenChange={onOpenChange}
        role={{ id: String(tenant.id), roleName: tenant.name, roleCode: 'tenant-package' }}
        tree={[]}
        checkedIds={[]}
        title="功能套餐"
        description="正在加载菜单树…"
        onSubmit={() => undefined}
      />
    )
  }

  if (error) {
    return (
      <RolePermissionDialog
        key={`pkg-error-${tenant.id}`}
        open={open}
        onOpenChange={onOpenChange}
        role={{ id: String(tenant.id), roleName: tenant.name, roleCode: 'tenant-package' }}
        tree={[]}
        checkedIds={[]}
        title="功能套餐"
        description={`${error}${isUnavailableError(new Error()) ? '' : '，可关闭后重试'}`}
        onSubmit={() => undefined}
      />
    )
  }

  return (
    <RolePermissionDialog
      key={`pkg-${tenant.id}`}
      open={open}
      onOpenChange={onOpenChange}
      role={{ id: String(tenant.id), roleName: tenant.name, roleCode: 'tenant-package' }}
      tree={tree ?? []}
      checkedIds={checkedIds}
      saving={saving}
      title="功能套餐"
      description={`勾选租户「${tenant.name}」可使用的功能菜单（含按钮权限）。收窄后不影响角色已有授权，但超出套餐的菜单不再显示、权限码不再下发；角色授权端也会拒绝授未开通的菜单。`}
      onSubmit={handleSubmit}
    />
  )
}
