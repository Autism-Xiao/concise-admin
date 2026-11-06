import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { createRegion, fetchRegionByCode, fetchRegionChildren, updateRegion, type Region } from '../api'

interface RegionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  region: Region | null
  /** 保存成功后回调（父页面刷新列表） */
  onSaved: () => void
}

const LEVEL_TEXTS = ['省份', '城市', '区县', '街道']

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应区划 */
export function RegionFormDialog({ open, onOpenChange, region, onSaved }: RegionFormDialogProps) {
  const [name, setName] = useState(region?.name ?? '')
  const [shortName, setShortName] = useState(region?.shortName ?? '')
  const [fullName, setFullName] = useState(region?.fullName ?? '')
  const [areaCode, setAreaCode] = useState(region?.areaCode ?? '')
  const [cityCode, setCityCode] = useState(region?.cityCode ?? '')
  const [zipCode, setZipCode] = useState(region?.zipCode ?? '')
  const [pinyin, setPinyin] = useState(region?.pinyin ?? '')
  const [lng, setLng] = useState(region?.lng ?? '')
  const [lat, setLat] = useState(region?.lat ?? '')

  // 级联选上级：选到哪一级，上级就是哪级（都不选 = 顶级省份）
  const [provinces, setProvinces] = useState<Region[] | null>(null)
  const [cities, setCities] = useState<Region[]>([])
  const [districts, setDistricts] = useState<Region[]>([])
  const [parentProvince, setParentProvince] = useState('')
  const [parentCity, setParentCity] = useState('')
  const [parentDistrict, setParentDistrict] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRegionChildren('0')
      .then(setProvinces)
      .catch(e => toast.error(e instanceof Error ? e.message : '加载省级区划失败'))
  }, [])

  // 编辑时按 parentCode 反查祖先链，回填级联选择
  useEffect(() => {
    if (!region || region.parentCode === '0') return
    let cancelled = false
    ;(async () => {
      try {
        let current = await fetchRegionByCode(region.parentCode)
        const chain: Region[] = [current]
        while (chain.length < 3 && current.parentCode !== '0') {
          current = await fetchRegionByCode(current.parentCode)
          chain.unshift(current)
        }
        if (cancelled) return
        if (chain[0]) setParentProvince(chain[0].areaCode)
        if (chain[1]) setParentCity(chain[1].areaCode)
        if (chain[2]) setParentDistrict(chain[2].areaCode)
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? `回填上级区划失败：${e.message}` : '回填上级区划失败')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [region])

  // 级联懒加载：effect 只负责拉数据，「清空下级选择」放在 onChange 里，避免编辑回填被清掉
  useEffect(() => {
    if (!parentProvince) {
      setCities([])
      return
    }
    fetchRegionChildren(parentProvince)
      .then(setCities)
      .catch(() => setCities([]))
  }, [parentProvince])

  useEffect(() => {
    if (!parentCity) {
      setDistricts([])
      return
    }
    fetchRegionChildren(parentCity)
      .then(setDistricts)
      .catch(() => setDistricts([]))
  }, [parentCity])

  const handleProvinceChange = (code: string) => {
    setParentProvince(code)
    setParentCity('')
    setParentDistrict('')
    setCities([])
    setDistricts([])
  }

  const handleCityChange = (code: string) => {
    setParentCity(code)
    setParentDistrict('')
    setDistricts([])
  }

  /** 级联深度即层级：0 省 / 1 市 / 2 区县 / 3 街道 */
  const level = parentDistrict ? 3 : parentCity ? 2 : parentProvince ? 1 : 0
  const parentCode = parentDistrict || parentCity || parentProvince || '0'
  const isEdit = !!region

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        areaCode: areaCode.trim(),
        parentCode,
        level,
        shortName: shortName.trim() || undefined,
        fullName: fullName.trim() || undefined,
        pinyin: pinyin.trim() || undefined,
        cityCode: cityCode.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        lng: lng.trim() || undefined,
        lat: lat.trim() || undefined
      }
      if (isEdit && region) {
        await updateRegion(region.id, payload)
        toast.success('区划已更新')
      } else {
        await createRegion(payload)
        toast.success('区划已创建')
      }
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const provinceItems: Record<string, string> = { '': '顶级（新增省级）', ...Object.fromEntries((provinces ?? []).map(p => [p.areaCode, p.name])) }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑区划' : '新增区划'}</DialogTitle>
          <DialogDescription>
            层级由上级决定：{LEVEL_TEXTS[level]}
            {isEdit ? '（编辑时可整体换上级，下级区划会一并跟着移动）' : ''}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>上级区划（逐级选择，选到哪级上级就是哪级）</Label>
            {provinces === null ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <Select value={parentProvince} onValueChange={handleProvinceChange} items={provinceItems}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">顶级（新增省级）</SelectItem>
                    {provinces.map(p => (
                      <SelectItem key={p.areaCode} value={p.areaCode}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {parentProvince && (
                  <Select value={parentCity} onValueChange={handleCityChange} items={Object.fromEntries(cities.map(c => [c.areaCode, c.name]))}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择城市" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(c => (
                        <SelectItem key={c.areaCode} value={c.areaCode}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {parentCity && (
                  <Select value={parentDistrict} onValueChange={setParentDistrict} items={Object.fromEntries(districts.map(d => [d.areaCode, d.name]))}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择区县" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map(d => (
                        <SelectItem key={d.areaCode} value={d.areaCode}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="region-name">名称</Label>
              <Input id="region-name" value={name} onChange={e => setName(e.target.value)} placeholder="如 深圳市" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-short">简称</Label>
              <Input id="region-short" value={shortName} onChange={e => setShortName(e.target.value)} placeholder="如 深圳" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-code">区划代码</Label>
              <Input id="region-code" value={areaCode} onChange={e => setAreaCode(e.target.value)} placeholder="如 440300000000" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-pinyin">拼音</Label>
              <Input id="region-pinyin" value={pinyin} onChange={e => setPinyin(e.target.value)} placeholder="如 ShenZhen" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-citycode">城市代码（电话区号）</Label>
              <Input id="region-citycode" value={cityCode} onChange={e => setCityCode(e.target.value)} placeholder="如 0755" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-zip">邮编</Label>
              <Input id="region-zip" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="如 518000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-lng">经度</Label>
              <Input id="region-lng" value={lng} onChange={e => setLng(e.target.value)} placeholder="如 114.057868" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region-lat">纬度</Label>
              <Input id="region-lat" value={lat} onChange={e => setLat(e.target.value)} placeholder="如 22.543099" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="region-full">全称（可选，默认同名称）</Label>
            <Input id="region-full" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="默认同名称" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
