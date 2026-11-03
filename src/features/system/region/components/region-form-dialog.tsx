import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Region } from '../api'

interface RegionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  region: Region | null
  onSubmit: (values: Omit<Region, 'id'>) => void
}

const emptyForm = {
  name: '',
  shortName: '',
  fullName: '',
  areaCode: '',
  parentCode: '0',
  zipCode: '',
  pinyin: '',
  level: 0,
  levelText: '省份',
  lng: '',
  lat: ''
}

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应区划 */
export function RegionFormDialog({ open, onOpenChange, region, onSubmit }: RegionFormDialogProps) {
  const [form, setForm] = useState(() =>
    region
      ? {
          name: region.name,
          shortName: region.shortName,
          fullName: region.fullName,
          areaCode: region.areaCode,
          parentCode: region.parentCode,
          zipCode: region.zipCode,
          pinyin: region.pinyin,
          level: region.level,
          levelText: region.levelText,
          lng: region.lng,
          lat: region.lat
        }
      : emptyForm
  )

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{region ? '编辑区划' : '新增区划'}</DialogTitle>
          <DialogDescription>{region ? '修改区划信息后保存' : '填写信息创建新行政区划'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit(form)
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="region-name">名称</Label>
              <Input id="region-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="如 广东省" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-short">简称</Label>
              <Input id="region-short" value={form.shortName} onChange={e => set('shortName', e.target.value)} placeholder="如 广东" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-full">全称</Label>
              <Input id="region-full" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="如 广东" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-code">区划代码</Label>
              <Input id="region-code" value={form.areaCode} onChange={e => set('areaCode', e.target.value)} placeholder="如 440000000000" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-zip">邮编</Label>
              <Input id="region-zip" value={form.zipCode} onChange={e => set('zipCode', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-pinyin">拼音</Label>
              <Input id="region-pinyin" value={form.pinyin} onChange={e => set('pinyin', e.target.value)} placeholder="如 GuangDong" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-lng">经度</Label>
              <Input id="region-lng" value={form.lng} onChange={e => set('lng', e.target.value)} placeholder="如 113.266530" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-lat">纬度</Label>
              <Input id="region-lat" value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="如 23.132191" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
