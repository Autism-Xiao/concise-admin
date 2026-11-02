import { useEffect, useState } from 'react'
import { Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/context/locale-provider'

export function FullscreenToggle() {
  const { t } = useLocale()
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    // 兜底：按 ESC 等方式退出全屏时同步状态
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        setIsFullscreen(false)
      } else {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      }
    } catch {
      // 浏览器拒绝全屏请求（如权限限制），保持原状态
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} title={isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}>
      {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
      <span className="sr-only">{isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}</span>
    </Button>
  )
}
