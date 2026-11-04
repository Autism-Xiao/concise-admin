/** 触发浏览器下载：把后端返回的 blob 存为文件，用完立即释放 objectURL */
export function saveBlobFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
