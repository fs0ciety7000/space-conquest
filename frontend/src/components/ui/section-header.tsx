import * as React from "react"
import { cn } from "@/lib/utils"

type AccentColor = 'cyan' | 'purple' | 'red' | 'green' | 'orange' | 'yellow'

const accentGradients: Record<AccentColor, string> = {
  cyan:   'from-cyan-400 to-transparent',
  purple: 'from-purple-400 to-transparent',
  red:    'from-red-400 to-transparent',
  green:  'from-emerald-400 to-transparent',
  orange: 'from-orange-400 to-transparent',
  yellow: 'from-yellow-400 to-transparent',
}

const accentTexts: Record<AccentColor, string> = {
  cyan:   'text-cyan-500/70',
  purple: 'text-purple-500/70',
  red:    'text-red-500/70',
  green:  'text-emerald-500/70',
  orange: 'text-orange-500/70',
  yellow: 'text-yellow-500/70',
}

interface SectionHeaderProps {
  title: string
  icon?: React.ReactNode
  accent?: AccentColor
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({
  title,
  icon,
  accent = 'cyan',
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-2",
      "pb-2 mb-4 border-b border-cyan-500/10",
      className
    )}>
      <div className="flex items-center gap-2">
        {/* Accent vertical bar */}
        <div className={cn(
          "w-[3px] h-4 rounded-full bg-gradient-to-b flex-shrink-0",
          accentGradients[accent]
        )} />
        {icon && (
          <span className={cn("text-sm", accentTexts[accent])}>{icon}</span>
        )}
        <h3 className={cn(
          "text-[11px] font-bold tracking-[0.15em] uppercase",
          accentTexts[accent]
        )}>
          {title}
        </h3>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
