import * as React from "react"
import { cn } from "@/lib/utils"

interface CardProps extends React.ComponentProps<"div"> {
  variant?: "default" | "glass" | "holo" | "glow" | "cyber";
  glowColor?: "cyan" | "purple" | "orange" | "green" | "red" | "blue";
}

function Card({ className, variant = "default", glowColor, ...props }: CardProps) {
  const variants = {
    default: "bg-card border-white/10",
    glass: "glass-card",
    holo: "holo-card",
    glow: "glass-card hover:glow-cyan",
    cyber: "cyber-border glass-card",
  };

  const glowColors = {
    cyan: "hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(0,245,255,0.15)]",
    purple: "hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]",
    orange: "hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]",
    green: "hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]",
    red: "hover:border-red-500/50 hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]",
    blue: "hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
  };

  return (
    <div
      data-slot="card"
      className={cn(
        "relative flex flex-col gap-6 rounded-xl border py-6 shadow-lg",
        "transition-all duration-500 ease-out",
        "hover:-translate-y-1",
        variants[variant],
        glowColor && glowColors[glowColor],
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "leading-none font-bold tracking-wide",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
