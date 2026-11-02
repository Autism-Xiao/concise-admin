interface ViewTransition {
  ready: Promise<void>
  finished: Promise<void>
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (update: () => void) => ViewTransition
}

/** 主题切换时播放"左上 → 右下"扫光过渡；浏览器不支持 View Transitions 或用户开启了减少动态效果时，自动降级为直接切换 */
export function startThemeTransition(update: () => void) {
  const doc = document as DocumentWithViewTransition
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion || typeof doc.startViewTransition !== 'function') {
    update()
    return
  }
  try {
    doc.startViewTransition(update)
  } catch {
    // 过渡启动失败（如上一次过渡未结束），降级为直接切换
    update()
  }
}
