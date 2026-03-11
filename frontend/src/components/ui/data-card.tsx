import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface DataCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: React.ReactNode
  accent?: 'cyan' | 'purple' | 'red' | 'green' | 'orange' | 'yellow'
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
  onClick?: () => void
}

const accentConfig = {
  cyan:   { text: 'text-cyan-400',    border: 'border-cyan-500/15',    glow: 'hover:shadow-[0_0_20px_rgba(0,245,255,0.1)]',    bar: 'bg-cyan-500/30' },
  purple: { text: 'text-purple-400',  border: 'border-purple-500/15',  glow: 'hover:shadow-[0_0_20px_rgba(191,0,255,0.1)]',    bar: 'bg-purple-500/30' },
  red:    { text: 'text-red-400',     border: 'border-red-500/15',     glow: 'hover:shadow-[0_0_20px_rgba(255,0,60,0.1)]',     bar: 'bg-red-500/30' },
  green:  { text: 'text-emerald-400', border: 'border-emerald-500/15', glow: 'hover:shadow-[0_0_20px_rgba(0,255,136,0.1)]',    bar: 'bg-emerald-500/30' },
  orange: { text: 'text-orange-400',  border: 'border-orange-500/15',  glow: 'hover:shadow-[0_0_20px_rgba(255,102,0,0.1)]',   bar: 'bg-orange-500/30' },
  yellow: { text: 'text-yellow-400',  border: 'border-yellow-500/15',  glow: 'hover:shadow-[0_0_20px_rgba(255,238,0,0.1)]',   bar: 'bg-yellow-500/30' },
}

export function DataCard({
  label,
  value,
  unit,
  icon,
  accent = 'cyan',
  trend,
  trendValue,
  className,
  onClick,
}: DataCardProps) {
  const a = accentConfig[accent]
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      className={cn(
        "relative group p-3",
        "bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px]",
        "border rounded-[4px]",
        "[clip-path:polygon(10px_0%,100%_0%,100%_calc(100%-10px),calc(100%-10px)_100%,0%_100%,0%_10px)]",
        "transition-all duration-200",
        a.border, a.glow,
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Top accent line */}
      <div className={cn("absolute top-0 left-0 right-0 h-[1px] opacity-60", a.bar)} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {icon && <span className={cn("text-xs", a.text)}>{icon}</span>}
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-slate-500 truncate">
              {label}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn("text-lg font-bold font-mono tabular-nums leading-none", a.text)}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && <span className="text-[10px] text-slate-500 font-mono">{unit}</span>}
          </div>
        </div>
        {trend && trendValue && (
          <span className={cn(
            "text-[10px] font-mono font-semibold flex-shrink-0",
            trend === 'up' && "text-emerald-400",
            trend === 'down' && "text-red-400",
            trend === 'neutral' && "text-slate-500",
          )}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '●'} {trendValue}
          </span>
        )}
      </div>
    </motion.div>
  )
}
