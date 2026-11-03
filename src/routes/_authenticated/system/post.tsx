import { createFileRoute } from '@tanstack/react-router'
import { PostPage } from '@/features/system/post'

export const Route = createFileRoute('/_authenticated/system/post')({
  component: PostPage
})
