import { createFileRoute } from '@tanstack/react-router'
import { ChatsPage } from '@/features/chats'

export const Route = createFileRoute('/_authenticated/chats')({
  component: ChatsPage
})
