import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "glass" | "cyber"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant: _variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full px-3 py-2",
          "bg-[rgba(5,0,15,0.8)]",
          "border border-cyan-500/[0.12] rounded-[4px]",
          "text-sm text-slate-200",
          "font-mono placeholder:text-slate-600",
          "transition-all duration-200",
          "focus:border-cyan-500/50 focus:outline-none",
          "focus:shadow-[0_0_0_2px_rgba(0,245,255,0.1),0_0_12px_rgba(0,245,255,0.15)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
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
