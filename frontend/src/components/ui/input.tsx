import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "glass" | "cyber";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    const variants = {
      default: "border-slate-700 bg-slate-900/80 focus:border-cyan-500/50 focus:ring-cyan-500/20",
      glass: "border-white/10 bg-white/5 backdrop-blur-md focus:border-cyan-500/50 focus:ring-cyan-500/20",
      cyber: "border-purple-500/30 bg-slate-900/80 focus:border-purple-400/50 focus:ring-purple-500/20",
    };

    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-lg border px-3 py-2",
          "text-sm text-white font-medium",
          "placeholder:text-slate-500",
          // Transition
          "transition-all duration-300",
          // Focus states
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          // File input styles
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-cyan-400",
          // Variant styles
          variants[variant],
          // Glow effect on focus
          "focus:shadow-[0_0_15px_rgba(0,245,255,0.15)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
