import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        // === CYBERPUNK VARIANTS ===
        default: [
          "relative overflow-hidden",
          "bg-gradient-to-br from-cyan-500/10 to-blue-500/10",
          "border border-cyan-500/40 text-cyan-400",
          "clip-cyber-sm",
          "hover:border-cyan-400 hover:text-cyan-300",
          "hover:shadow-[0_0_20px_rgba(0,245,255,0.4),0_0_60px_rgba(0,245,255,0.15),inset_0_0_20px_rgba(0,245,255,0.05)]",
          "hover:-translate-y-0.5",
          "active:translate-y-0",
        ],
        secondary: [
          "bg-transparent border border-slate-500/20 text-slate-400",
          "clip-cyber-sm",
          "hover:border-cyan-500/30 hover:text-cyan-400",
          "hover:shadow-[0_0_12px_rgba(0,245,255,0.2)]",
          "hover:-translate-y-px",
        ],
        destructive: [
          "relative overflow-hidden",
          "bg-red-500/10 border border-red-500/35 text-red-400",
          "clip-cyber-sm",
          "hover:bg-red-500/20 hover:border-red-400 hover:text-red-300",
          "hover:shadow-[0_0_20px_rgba(255,0,60,0.4),inset_0_0_20px_rgba(255,0,60,0.05)]",
          "hover:-translate-y-0.5",
        ],
        success: [
          "bg-emerald-500/8 border border-emerald-500/30 text-emerald-400",
          "clip-cyber-sm",
          "hover:bg-emerald-500/15 hover:border-emerald-400",
          "hover:shadow-[0_0_20px_rgba(0,255,136,0.35)]",
          "hover:-translate-y-0.5",
        ],
        outline: [
          "bg-transparent border border-cyan-500/20 text-slate-300",
          "hover:border-cyan-500/40 hover:text-cyan-400",
          "hover:bg-cyan-500/5",
          "hover:-translate-y-px",
        ],
        ghost: [
          "bg-transparent border border-transparent text-slate-500",
          "hover:bg-cyan-500/5 hover:border-cyan-500/15 hover:text-slate-400",
          "hover:-translate-y-px",
        ],
        link: "text-cyan-400 underline-offset-4 hover:underline hover:text-cyan-300 border-none bg-transparent",
        // === LEGACY / SPECIAL ===
        neon: [
          "border-2 border-cyan-500 text-cyan-400 bg-transparent",
          "hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] hover:bg-cyan-500/10",
          "hover:-translate-y-0.5",
        ],
        cyber: [
          "relative overflow-hidden",
          "border border-purple-500/50 text-purple-300 bg-purple-500/5",
          "clip-cyber-sm",
          "hover:border-purple-400 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]",
          "hover:-translate-y-0.5",
        ],
        hologram: [
          "border border-cyan-500/30 text-cyan-300",
          "bg-gradient-to-br from-cyan-500/5 to-purple-500/5",
          "backdrop-blur-sm",
          "hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(0,245,255,0.25)]",
          "hover:-translate-y-0.5",
        ],
        danger: [
          "bg-red-500/10 border border-red-500/35 text-red-400",
          "hover:bg-red-500/20 hover:border-red-400",
          "hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]",
          "hover:-translate-y-0.5",
        ],
        warning: [
          "bg-amber-500/10 border border-amber-500/35 text-amber-400",
          "hover:bg-amber-500/20 hover:border-amber-400",
          "hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]",
          "hover:-translate-y-0.5",
        ],
      },
      size: {
        default: "h-9 px-4 py-2 text-sm",
        sm: "h-7 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        xl: "h-13 px-8 text-lg",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7",
        "icon-lg": "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  shine?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, shine = false, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        {...(props as any)}
      >
        {shine && (
          <span
            className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[btn-shine_2.5s_ease_infinite]"
            aria-hidden
          />
        )}
        {children}
      </motion.button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
