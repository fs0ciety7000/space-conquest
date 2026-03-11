import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase rounded-[2px] border transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
        secondary:   "bg-slate-500/10 border-slate-500/20 text-slate-400",
        destructive: "bg-red-500/10 border-red-500/30 text-red-400",
        outline:     "bg-transparent border-cyan-500/20 text-cyan-500/70",
        success:     "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        warning:     "bg-amber-500/10 border-amber-500/30 text-amber-400",
        purple:      "bg-purple-500/10 border-purple-500/30 text-purple-400",
        orange:      "bg-orange-500/10 border-orange-500/30 text-orange-400",
        // Legacy variants kept for backward compat
        info:        "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
        neon:        "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(0,245,255,0.3)]",
        cyber:       "border-purple-500/50 bg-purple-500/10 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]",
        glow:        "border-transparent bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]",
        pulse:       "border-red-500/50 bg-red-500/20 text-red-400 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]",
        online:      "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]",
        offline:     "border-slate-500/50 bg-slate-500/20 text-slate-400",
        busy:        "border-amber-500/50 bg-amber-500/20 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  asChild?: boolean
}

function Badge({ className, variant, dot = false, asChild: _asChild, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse flex-shrink-0" aria-hidden />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
