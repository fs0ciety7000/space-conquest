import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

type ProgressVariant = 'default' | 'danger' | 'success' | 'energy' | 'metal' | 'crystal' | 'deuterium'

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  variant?: ProgressVariant
}

const fillVariants: Record<ProgressVariant, string> = {
  default:    "from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(0,245,255,0.5)]",
  danger:     "from-red-600 to-red-400 shadow-[0_0_8px_rgba(255,0,60,0.5)]",
  success:    "from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(0,255,136,0.5)]",
  energy:     "from-amber-600 to-yellow-400 shadow-[0_0_8px_rgba(255,238,0,0.4)]",
  metal:      "from-orange-600 to-orange-400 shadow-[0_0_8px_rgba(255,102,0,0.4)]",
  crystal:    "from-cyan-600 to-sky-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]",
  deuterium:  "from-green-600 to-green-400 shadow-[0_0_8px_rgba(34,197,94,0.4)]",
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant = 'default', ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-1.5 w-full overflow-hidden rounded-[2px]",
      "bg-cyan-500/5 border border-cyan-500/10",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 bg-gradient-to-r rounded-[2px] transition-all duration-500",
        fillVariants[variant]
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
