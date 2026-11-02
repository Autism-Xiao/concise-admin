import * as React from 'react'
import { cn } from 'cn'
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors',
        'data-checked:bg-primary data-unchecked:bg-input',
        'focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-background pointer-events-none block size-4 rounded-full shadow-sm ring-0 transition-transform',
          'data-checked:translate-x-4 data-unchecked:translate-x-0.5'
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
