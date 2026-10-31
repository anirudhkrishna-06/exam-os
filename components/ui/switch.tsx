import * as React from 'react'
import { cn } from '@/lib/utils/cn'

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    return (
      <label className={cn('relative inline-flex items-center cursor-pointer', className)}>
        <input
          type="checkbox"
          ref={ref}
          className="sr-only peer"
          onChange={(e) => {
            onChange?.(e)
            onCheckedChange?.(e.target.checked)
          }}
          {...props}
        />
        <div className="w-11 h-6 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-ring peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
      </label>
    )
  }
)
Switch.displayName = 'Switch'

export { Switch }

