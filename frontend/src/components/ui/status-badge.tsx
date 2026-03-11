import * as React from "react"
import { cn } from "@/lib/utils"

type Status = 'online' | 'offline' | 'warning' | 'danger' | 'idle'

const statusConfig: Record<Status, { dot: string; text: string; label: string }> = {
  online:  { dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(0,255,136,0.8)]',  text: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', label: 'En ligne' },
  offline: { dot: 'bg-slate-500',                                           text: 'text-slate-500 border-slate-500/20 bg-slate-500/5',        label: 'Hors ligne' },
  warning: { dot: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]',   text: 'text-amber-400 border-amber-500/30 bg-amber-500/10',       label: 'Alerte' },
  danger:  { dot: 'bg-red-400 shadow-[0_0_6px_rgba(255,0,60,0.8)]',       text: 'text-red-400 border-red-500/30 bg-red-500/10',             label: 'Danger' },
  idle:    { dot: 'bg-blue-400 shadow-[0_0_6px_rgba(0,128,255,0.6)]',     text: 'text-blue-400 border-blue-500/30 bg-blue-500/10',          label: 'Inactif' },
}

interface StatusBadgeProps {
  status: Status
  label?: string
  className?: string
  pulse?: boolean
}

export function StatusBadge({ status, label, className, pulse = true }: StatusBadgeProps) {
  const c = statusConfig[status]
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5",
      "text-[10px] font-semibold tracking-[0.1em] uppercase",
      "rounded-[2px] border",
      c.text,
      className
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full flex-shrink-0",
        c.dot,
        pulse && status !== 'offline' && "animate-pulse"
      )} aria-hidden />
      {label ?? c.label}
    </span>
  )
}
