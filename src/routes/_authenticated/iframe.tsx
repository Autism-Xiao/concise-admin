import { createFileRoute } from '@tanstack/react-router'
import { IframePage } from '@/features/iframe'

/** 内链菜单承载页：?url= 为完整 http/https 地址（见 features/iframe/index.tsx） */
export const Route = createFileRoute('/_authenticated/iframe')({
  validateSearch: (search: Record<string, unknown>): { url: string } => ({
    url: typeof search.url === 'string' ? search.url : ''
  }),
  component: IframePageWrapper
})

function IframePageWrapper() {
  const { url } = Route.useSearch()
  return <IframePage url={url} />
}
