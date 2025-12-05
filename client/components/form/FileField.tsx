"use client"
import React, { useCallback, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type Props = {
  label?: string
  name?: string
  acceptedTypes?: string
  onChange: (file: File | null) => void
}

export default function FileField({ label, name, acceptedTypes = "image/*,application/pdf", onChange }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const pickFile = () => inputRef.current?.click()

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const next = files?.[0] ?? null
      onChange(next)
    },
    [onChange]
  )

  const preventNavigation = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    preventNavigation(event)
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {label && <span className="text-sm font-medium text-zinc-900">{label}</span>}
      <div
        role="button"
        tabIndex={0}
        onClick={pickFile}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            pickFile()
          }
        }}
        onDrop={handleDrop}
        onDragOver={(event) => {
          preventNavigation(event)
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          preventNavigation(event)
          setIsDragging(false)
        }}
        className={cn(
          "flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed bg-white/70 p-5 text-sm text-zinc-600 transition",
          isDragging ? "border-primary/80 bg-primary/10" : "border-purple-200/80" 
        )}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={acceptedTypes}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <p className="text-base font-semibold text-zinc-900">Drag & drop or click to browse</p>
        <p className="text-xs text-zinc-500">PDF, JPG, PNG (max 10MB)</p>
      </div>
    </div>
  )
}
