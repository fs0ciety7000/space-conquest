import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none transition-all duration-300 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40",
        secondary:
          "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700",
        destructive:
          "border-transparent bg-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40",
        outline:
          "border-white/20 bg-transparent text-white hover:bg-white/10",
        // Nouvelles variantes sci-fi
        success:
          "border-transparent bg-emerald-600 text-white shadow-lg shadow-emerald-500/25",
        warning:
          "border-transparent bg-amber-600 text-white shadow-lg shadow-amber-500/25",
        info:
          "border-transparent bg-cyan-600 text-white shadow-lg shadow-cyan-500/25",
        neon:
          "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(0,245,255,0.3)] hover:shadow-[0_0_15px_rgba(0,245,255,0.5)]",
        cyber:
          "border-purple-500/50 bg-purple-500/10 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)] hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]",
        glow:
          "border-transparent bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]",
        pulse:
          "border-red-500/50 bg-red-500/20 text-red-400 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]",
        // Badges de statut
        online:
          "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]",
        offline:
          "border-slate-500/50 bg-slate-500/20 text-slate-400",
        busy:
          "border-amber-500/50 bg-amber-500/20 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
