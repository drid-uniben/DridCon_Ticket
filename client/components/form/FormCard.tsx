"use client"
import React from "react"
import { cn } from "@/lib/utils"

type Props = {
  heading?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export default function FormCard({ heading, description, children, className }: Props) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-purple-200/70 bg-white/80 p-5 shadow-2xl shadow-purple-100/50 backdrop-blur",
        className
      )}
    >
      {heading && <h4 className="mb-2 text-lg font-semibold text-zinc-900">{heading}</h4>}
      {description && <p className="mb-4 text-sm text-zinc-500">{description}</p>}
      <div className="space-y-2">{children}</div>
    </section>
  )
}