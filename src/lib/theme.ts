type DocumentWithViewTransition = Document & {
  startViewTransition?: (update: () => void) => void
}

/** 主题切换时播放"左上 → 右下"扫光过渡，不支持的浏览器直接切换 */
export function startThemeTransition(update: () => void) {
  const doc = document as DocumentWithViewTransition
  if (doc.startViewTransition) {
    doc.startViewTransition(update)
  } else {
    update()
  }
}
