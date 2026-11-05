/** 触发浏览器下载：把后端返回的 blob 存为文件，用完立即释放 objectURL */
export function saveBlobFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * 下载后端文件（导出 / 导入模板）
 *
 * 走原生 fetch 而不是封装的 getApiResult：这里要的是 blob + Content-Disposition 文件名，
 * 不是统一 JSON 外壳。失败时尽量把后端的中文提示带出来，避免只看到「导出失败: 500」。
 */
export async function downloadFromApi(path: string, fallbackName: string): Promise<{ filename: string; blob: Blob }> {
  const token = localStorage.getItem('concise-token') ?? ''
  const res = await fetch(`/backend-api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  if (!res.ok) {
    let message = `请求失败（${res.status}）`
    try {
      const body = (await res.json()) as { message?: string | string[] }
      const text = Array.isArray(body.message) ? body.message.join('；') : body.message
      if (text) {
        message = text
      }
    } catch {
      // 非 JSON（如网关错误页），保留状态码提示
    }
    throw new Error(message)
  }
  const disposition = res.headers.get('content-disposition') ?? ''
  // 优先取 UTF-8 中文名（filename*），老格式 filename 兜底
  const utf8Name = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
  const filename = utf8Name ? decodeURIComponent(utf8Name) : (/filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName)
  return { filename, blob: await res.blob() }
}
