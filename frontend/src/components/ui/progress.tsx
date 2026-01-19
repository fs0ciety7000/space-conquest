import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  variant?: "default" | "gradient" | "glow" | "cyber";
  color?: "cyan" | "purple" | "orange" | "green" | "red" | "blue";
  showGlow?: boolean;
  animated?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant = "default", color = "cyan", showGlow = true, animated = true, ...props }, ref) => {
  
  const colorClasses = {
    cyan: {
      bg: "bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-500",
      glow: "shadow-[0_0_15px_rgba(0,245,255,0.5)]",
      indicator: "bg-cyan-400",
    },
    purple: {
      bg: "bg-gradient-to-r from-purple-600 via-purple-400 to-purple-500",
      glow: "shadow-[0_0_15px_rgba(168,85,247,0.5)]",
      indicator: "bg-purple-400",
    },
    orange: {
      bg: "bg-gradient-to-r from-orange-600 via-orange-400 to-orange-500",
      glow: "shadow-[0_0_15px_rgba(249,115,22,0.5)]",
      indicator: "bg-orange-400",
    },
    green: {
      bg: "bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-500",
      glow: "shadow-[0_0_15px_rgba(34,197,94,0.5)]",
      indicator: "bg-emerald-400",
    },
    red: {
      bg: "bg-gradient-to-r from-red-600 via-red-400 to-red-500",
      glow: "shadow-[0_0_15px_rgba(239,68,68,0.5)]",
      indicator: "bg-red-400",
    },
    blue: {
      bg: "bg-gradient-to-r from-blue-600 via-blue-400 to-blue-500",
      glow: "shadow-[0_0_15px_rgba(59,130,246,0.5)]",
      indicator: "bg-blue-400",
    },
  };

  const variants = {
    default: colorClasses[color].bg,
    gradient: `${colorClasses[color].bg} animate-gradient`,
    glow: `${colorClasses[color].bg} ${colorClasses[color].glow}`,
    cyber: `bg-gradient-to-r from-slate-800 via-purple-600 to-cyan-500`,
  };

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full",
        "bg-slate-800/50 border border-white/5",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full transition-all duration-500 relative",
          variants[variant],
          showGlow && colorClasses[color].glow,
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      >
        {/* Effet de brillance animé - couleur adaptée */}
        {animated && (
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              style={{
                animation: 'shimmer 2s ease-in-out infinite',
              }}
            />
          </div>
        )}
        
        {/* Point lumineux au bout */}
        {showGlow && (value || 0) > 0 && (
          <div 
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-pulse",
              colorClasses[color].indicator,
              colorClasses[color].glow
            )}
          />
        )}
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
