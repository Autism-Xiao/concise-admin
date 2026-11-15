import { createFileRoute } from '@tanstack/react-router'
import { CodegenPage } from '@/features/system/codegen'

export const Route = createFileRoute('/_authenticated/system/codegen')({
  component: CodegenPage
})
