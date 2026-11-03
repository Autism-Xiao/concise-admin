// 轻量 HTTP 封装：统一 JSON 请求、错误处理
// 之后接真实后端时，在这里加 baseURL、鉴权头、错误码处理即可
export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, ...init })
  if (!res.ok) {
    throw new Error(`请求失败: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}
