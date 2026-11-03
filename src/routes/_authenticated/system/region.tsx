import { createFileRoute } from '@tanstack/react-router'
import { RegionPage } from '@/features/system/region'

export const Route = createFileRoute('/_authenticated/system/region')({ component: RegionPage })
