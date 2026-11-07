/**
 * 全局请求活动计数
 *
 * 用途：切换租户后业务页面会重挂载并重新拉数据，这段时间页面处于 loading
 * （骨架屏 / 空表格）。为了不让用户看到「有数据 → 骨架 → 有数据」的跳变，
 * 我们在切换瞬间把旧画面冻结成一张快照盖在上面，**等新数据到齐再撤掉**。
 *
 * 「到齐」的判定就靠这里：所有走 `lib/http.ts` 的请求都会 begin/end 一次，
 * 没有在途请求 + 安静一小段时间 = 可以揭幕了。
 *
 * 注意：只统计 `http.ts` 的请求。页面里直接用 fetch 的请求（目前没有）不会被算进来，
 * 所以最终还有超时兜底，不会永久卡住。
 */

let inflight = 0

/** 请求发出（在 fetch 前调用） */
export function beginApiCall(): void {
  inflight += 1
}

/** 请求结束（在 fetch 的 finally 里调用，成功失败都要调，否则计数会泄漏） */
export function endApiCall(): void {
  inflight = Math.max(0, inflight - 1)
}

/** 当前在途请求数 */
export function getInflightCount(): number {
  return inflight
}
