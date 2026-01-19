import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default: 
          "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-500 hover:to-purple-500 focus-visible:ring-indigo-500 active:scale-[0.98]",
        destructive:
          "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:from-red-500 hover:to-rose-500 focus-visible:ring-red-500 active:scale-[0.98]",
        outline:
          "border border-white/20 bg-white/5 text-white shadow-sm hover:bg-white/10 hover:border-white/30 backdrop-blur-sm focus-visible:ring-white/50",
        secondary:
          "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700 focus-visible:ring-slate-500",
        ghost:
          "text-slate-300 hover:bg-white/10 hover:text-white",
        link: 
          "text-cyan-400 underline-offset-4 hover:underline hover:text-cyan-300",
        // Nouvelles variantes sci-fi
        neon:
          "relative bg-transparent border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] focus-visible:ring-cyan-500 overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-cyan-500/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500",
        cyber:
          "relative bg-slate-900 border border-purple-500/50 text-purple-300 hover:border-purple-400 hover:text-purple-200 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] focus-visible:ring-purple-500 after:absolute after:inset-0 after:bg-gradient-to-r after:from-purple-500/0 after:via-purple-500/10 after:to-purple-500/0 after:opacity-0 hover:after:opacity-100 after:transition-opacity",
        hologram:
          "relative bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-cyan-500/10 border border-cyan-500/30 text-cyan-300 backdrop-blur-md hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(0,245,255,0.2),inset_0_0_25px_rgba(0,245,255,0.05)] focus-visible:ring-cyan-400",
        danger:
          "bg-gradient-to-r from-red-900/80 to-red-800/80 border border-red-500/50 text-red-300 hover:from-red-800/80 hover:to-red-700/80 hover:border-red-400/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] focus-visible:ring-red-500",
        success:
          "bg-gradient-to-r from-emerald-900/80 to-emerald-800/80 border border-emerald-500/50 text-emerald-300 hover:from-emerald-800/80 hover:to-emerald-700/80 hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] focus-visible:ring-emerald-500",
        warning:
          "bg-gradient-to-r from-amber-900/80 to-orange-800/80 border border-amber-500/50 text-amber-300 hover:from-amber-800/80 hover:to-orange-700/80 hover:border-amber-400/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] focus-visible:ring-amber-500",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
