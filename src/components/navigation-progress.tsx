import { useEffect, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'
import LoadingBar, { type LoadingBarRef } from 'react-top-loading-bar'

/** 路由切换时页面顶部的加载进度条 */
export function NavigationProgress() {
  const ref = useRef<LoadingBarRef>(null)
  const status = useRouterState({ select: s => s.status })

  useEffect(() => {
    if (status === 'pending') {
      ref.current?.continuousStart()
    } else {
      ref.current?.complete()
    }
  }, [status])

  return <LoadingBar color="var(--primary)" ref={ref} shadow={false} height={2} />
}
