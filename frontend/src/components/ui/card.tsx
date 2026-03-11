import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative",
        "bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px]",
        "border border-cyan-500/[0.12]",
        "rounded-lg overflow-hidden",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

// Cyberpunk card with bevel and hover glow
const CyberCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    accent?: 'cyan' | 'purple' | 'red' | 'green' | 'orange'
  }
>(
  ({ className, accent = 'cyan', children, ...props }, ref) => {
    const accentMap = {
      cyan:   { border: 'rgba(0,245,255,0.15)',   glow: 'rgba(0,245,255,0.1)',   hoverBorder: 'rgba(0,245,255,0.35)',   hoverGlow: 'rgba(0,245,255,0.15)' },
      purple: { border: 'rgba(191,0,255,0.15)',   glow: 'rgba(191,0,255,0.08)', hoverBorder: 'rgba(191,0,255,0.35)',   hoverGlow: 'rgba(191,0,255,0.12)' },
      red:    { border: 'rgba(255,0,60,0.15)',    glow: 'rgba(255,0,60,0.08)',  hoverBorder: 'rgba(255,0,60,0.35)',    hoverGlow: 'rgba(255,0,60,0.12)'  },
      green:  { border: 'rgba(0,255,136,0.15)',   glow: 'rgba(0,255,136,0.08)', hoverBorder: 'rgba(0,255,136,0.35)',  hoverGlow: 'rgba(0,255,136,0.12)' },
      orange: { border: 'rgba(255,102,0,0.15)',   glow: 'rgba(255,102,0,0.08)', hoverBorder: 'rgba(255,102,0,0.35)', hoverGlow: 'rgba(255,102,0,0.12)' },
    }
    const a = accentMap[accent]
    return (
      <motion.div
        ref={ref}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "relative group",
          "bg-[rgba(10,5,32,0.85)] backdrop-blur-[12px]",
          "rounded-lg overflow-hidden",
          "transition-all duration-200",
          "[clip-path:polygon(12px_0%,100%_0%,100%_calc(100%-12px),calc(100%-12px)_100%,0%_100%,0%_12px)]",
          className
        )}
        style={{
          border: `1px solid ${a.border}`,
          boxShadow: `0 0 20px ${a.glow}`,
        }}
        {...(props as any)}
      >
        {children}
      </motion.div>
    )
  }
)
CyberCard.displayName = "CyberCard"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1.5 p-4 pb-3 border-b border-cyan-500/10", className)}
      {...props}
    />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-[11px] font-bold tracking-[0.15em] uppercase text-cyan-500/70",
        className
      )}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs text-slate-500", className)} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

const CardAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
)
CardAction.displayName = "CardAction"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-4 pt-3 border-t border-cyan-500/10", className)}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CyberCard, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
