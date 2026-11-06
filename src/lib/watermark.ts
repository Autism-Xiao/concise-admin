import { getApiResult } from '@/lib/http'

export type WatermarkDensity = 'compact' | 'default' | 'loose'
export type WatermarkMode = 'optional' | 'forced' | 'off'

/**
 * 后端下发的生效水印配置
 *
 * lines 已经是最终文本（占位符由后端解析），前端只负责绘制，
 * 不再做任何字符串替换——用户名、IP、时间的可信来源在服务端。
 */
export interface WatermarkView {
  enabled: boolean
  lines: string[]
  density: string
  opacity: number
  rotate: number
  fontSize: number
  mode: WatermarkMode
  enforced: number
  /** false 表示被管理员锁定，前端把开关置灰并展示 reason */
  editable: boolean
  reason: string | null
  /** 用户自己的原始设置（null = 跟随全局），设置面板据此显示"已自定义/跟随全局" */
  custom: {
    enabled: number | null
    content: string | null
    density: string | null
  }
}

/** 用户自助修改只允许这三项；样式参数（opacity/rotate/fontSize）只归全局策略 */
export interface MyWatermarkPatch {
  enabled?: boolean | null
  content?: string | null
  density?: WatermarkDensity | null
}

/** 全局水印策略（admin 维护） */
export interface WatermarkSetting {
  enabled: number
  mode: WatermarkMode
  content: string
  density: string
  opacity: number
  rotate: number
  fontSize: number
}

export interface WatermarkSettingPatch {
  enabled?: boolean
  mode?: WatermarkMode
  content?: string
  density?: WatermarkDensity
  opacity?: number
  rotate?: number
  fontSize?: number
}

/** 管理员给指定用户的水印设置 */
export interface UserWatermarkPatch {
  enabled?: boolean | null
  enforced?: 0 | 1 | 2
  content?: string | null
  density?: WatermarkDensity | null
}

export interface UserWatermarkState {
  enabled: number | null
  enforced: 0 | 1 | 2
  content: string | null
  density: string | null
}

export function fetchWatermark(): Promise<WatermarkView> {
  return getApiResult<WatermarkView>('/backend-api/v1/users/me/watermark')
}

export function updateMyWatermark(patch: MyWatermarkPatch): Promise<WatermarkView> {
  return getApiResult<WatermarkView>('/backend-api/v1/users/me/watermark', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  })
}

export function fetchWatermarkSetting(): Promise<WatermarkSetting> {
  return getApiResult<WatermarkSetting>('/backend-api/v1/system/watermark')
}

export function updateWatermarkSetting(patch: WatermarkSettingPatch): Promise<WatermarkSetting> {
  return getApiResult<WatermarkSetting>('/backend-api/v1/system/watermark', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  })
}

export function updateUserWatermark(userId: string, patch: UserWatermarkPatch): Promise<UserWatermarkState> {
  return getApiResult<UserWatermarkState>(`/backend-api/v1/users/${userId}/watermark`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  })
}
