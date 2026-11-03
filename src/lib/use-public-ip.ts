import { useEffect, useState } from 'react'

// 公网 IP 浏览器端拿不到，走第三方接口查询；模块级缓存只查一次，
// 失败（内网 / 离线）时回退到本机回环地址
let cachedIp: string | null = null
let pending: Promise<string> | null = null

export function fetchPublicIp(): Promise<string> {
  if (cachedIp) return Promise.resolve(cachedIp)
  pending ??= fetch('https://api.ipify.org?format=text', { signal: AbortSignal.timeout(3000) })
    .then(res => {
      if (!res.ok) throw new Error(String(res.status))
      return res.text()
    })
    .then(ip => {
      cachedIp = ip.trim()
      return cachedIp
    })
    .catch(() => '127.0.0.1')
  return pending
}

export function usePublicIp(): string {
  const [ip, setIp] = useState(cachedIp ?? '')
  useEffect(() => {
    let alive = true
    void fetchPublicIp().then(value => {
      if (alive) setIp(value)
    })
    return () => {
      alive = false
    }
  }, [])
  return ip
}
