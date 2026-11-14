'use client'

import { Check, Moon, Monitor, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from './theme-provider'
import { cn } from '@/lib/utils/cn'

const options: { value: ThemePreference; label: string; description: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', description: 'Follows your device setting', icon: Monitor },
  { value: 'light', label: 'Light', description: 'Bright, high-contrast workspace', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Low-glare workspace for evenings', icon: Moon },
]

export function ThemeControls() {
  const { preference, setPreference } = useTheme()

  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Theme preference">
      {options.map(({ value, label, description, icon: Icon }) => {
        const selected = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(value)}
            className={cn(
              'relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'border-primary bg-primary/[0.08] shadow-sm' : 'border-border bg-background'
            )}
          >
            <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block truncate text-xs text-muted-foreground">{description}</span>
            </span>
            {selected && <Check className="absolute right-3 top-3 size-4 text-primary" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
