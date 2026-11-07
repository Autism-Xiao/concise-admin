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
    // 先读文本再尝试解析：网关错误时是 text/plain（upstream connect failed），
    // 直接 res.json() 会抛解析错误，把真正的「后端连不上」掩盖成 JSON 报错
    const raw = await res.text().catch(() => '')
    const brief = raw.trim().slice(0, 160)
    const gatewayFailed = res.status === 502 || res.status === 503 || res.status === 504
    if (gatewayFailed) {
      throw new Error(
        `后端服务不可用（HTTP ${res.status}）：${brief || '代理无法连接后端'}。请检查后端是否启动、代理端口是否与后端 PORT 一致`
      )
    }
    let message = `请求失败（HTTP ${res.status}）`
    if (brief) {
      try {
        const body = JSON.parse(raw) as { message?: string | string[] }
        const text = Array.isArray(body.message) ? body.message.join('；') : body.message
        message = text || `${message}：${brief}`
      } catch {
        message = `${message}：${brief}`
      }
    }
    throw new Error(message)
  }
  const disposition = res.headers.get('content-disposition') ?? ''
  // 优先取 UTF-8 中文名（filename*），老格式 filename 兜底
  const utf8Name = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
  const filename = utf8Name ? decodeURIComponent(utf8Name) : (/filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName)
  return { filename, blob: await res.blob() }
}
