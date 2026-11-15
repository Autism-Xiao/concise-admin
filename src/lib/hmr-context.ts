import { createContext, type Context } from 'react'

/**
 * 跨 HMR 复用的 Context 工厂。
 *
 * 为什么要这个：Vite 热更新时会**重新执行模块**，`createContext()` 因此产出**新的** Context 对象；
 * 而已经挂载在树上的 Provider 仍然持有旧对象，新模块里的 `useContext` 读到 undefined/null，
 * 于是 `useXxx must be used within XxxProvider` 直接抛错、整页被路由错误边界接管。
 *
 * 触发场景不是理论问题：代码生成器「执行生成」会把前端产物写进 src/（page-registry、i18n、路由树），
 * 一次写盘连带 HMR 重新执行 provider 模块，页面当场崩成「Something went wrong!」。
 *
 * 做法：Context 实例按 key 挂在 globalThis 上，模块重新执行时取回同一个对象。
 * 注意：key 必须全局唯一且**永不改名**——改 key 等价于换了一个新 Context，旧 Provider 立刻失联。
 */
export function createHmrSafeContext<T>(key: string, defaultValue: T): Context<T> {
  const store = globalThis as typeof globalThis & { __conciseContexts?: Map<string, Context<unknown>> }
  store.__conciseContexts ??= new Map<string, Context<unknown>>()

  const existing = store.__conciseContexts.get(key)
  if (existing) return existing as Context<T>

  const created = createContext<T>(defaultValue)
  store.__conciseContexts.set(key, created as Context<unknown>)
  return created
}
