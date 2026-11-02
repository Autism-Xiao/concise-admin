'use client'

import * as React from 'react'
import { cn } from 'cn'
import { Separator as BaseSeparator } from '@base-ui/react/separator'

function Separator({ className, orientation = 'horizontal', ...props }: React.ComponentProps<typeof BaseSeparator>) {
  return (
    <BaseSeparator
      data-slot="separator"
      orientation={orientation}
      className={cn(
        'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch',
        className
      )}
      {...props}
    />
  )
}

export { Separator }
