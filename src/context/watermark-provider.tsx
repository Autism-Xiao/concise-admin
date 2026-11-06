import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { fetchWatermark, updateMyWatermark, type MyWatermarkPatch, type WatermarkView } from '@/lib/watermark'

/**
 * 页面水印数据源：登录后从后端拉一次，设置面板修改后同步刷新
 *
 * 为什么放 Provider 而不是每次渲染去读：水印配置在多个地方消费
 * （全屏绘制、设置抽屉、设置页预览），保持单一数据源才能改完即时生效。
 * 退出登录时本组件随布局卸载，避免换账号登录闪现上一个人的水印。
 */
interface WatermarkContextValue {
  /** null 表示尚未拉到（首屏一瞬间，此时不画水印避免闪烁错误内容） */
  config: WatermarkView | null
  /** 加载失败的原因（如后端不可达），页面据此降级 */
  error: string | null
  refresh: () => Promise<void>
  /** 修改当前用户水印（受后端 editable 约束，被锁定时会抛出原因文案） */
  update: (patch: MyWatermarkPatch) => Promise<void>
}

const WatermarkContext = createContext<WatermarkContextValue>({
  config: null,
  error: null,
  refresh: async () => undefined,
  update: async () => undefined
})

export function WatermarkProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<WatermarkView | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await fetchWatermark()
      setConfig(next)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      // 拉取失败时保持"无水印"而不是沿用旧值：失败降级不能变成绕过管控的口子
      setConfig(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const update = useCallback(async (patch: MyWatermarkPatch) => {
    const next = await updateMyWatermark(patch)
    setConfig(next)
    setError(null)
  }, [])

  const value = useMemo(() => ({ config, error, refresh, update }), [config, error, refresh, update])

  return <WatermarkContext.Provider value={value}>{children}</WatermarkContext.Provider>
}

export function useWatermark(): WatermarkContextValue {
  return useContext(WatermarkContext)
}
