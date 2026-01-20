"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

type Props = {
  label?: string
  name?: string
  value: File | null
  onChange: (file: File | null) => void
  required?: boolean
}

export default function FileField({ label, name, value, onChange, required }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const preview = useMemo(() => (value ? URL.createObjectURL(value) : null), [value])

  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  const pickFile = () => inputRef.current?.click()

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0] ?? null

      if (!file) {
        onChange(null)
        return
      }

      // Validate accepted image formats
      const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
      if (!validTypes.includes(file.type)) {
        alert("Only PNG, JPG, JPEG, WEBP images are allowed.")
        onChange(null)
        return
      }

      // Validate max size (3MB)
      if (file.size > 3 * 1024 * 1024) {
        alert("Image must be under 3MB.")
        onChange(null)
        return
      }

      onChange(file)
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
      {label && (
        <span className="text-sm font-medium text-zinc-900">
          {label}
          {required && <span className="text-red-500">*</span>}
        </span>
      )}

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
        required={required}
      />

      {/* Upload box (hidden when preview exists) */}
      {!preview && (
        <div
          role="button"
          tabIndex={0}
          onClick={pickFile}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") pickFile()
          }}
          // Drag & Drop only enabled on desktop
          onDrop={(event) => {
            if (window.innerWidth >= 768) handleDrop(event)
          }}
          onDragOver={(event) => {
            if (window.innerWidth >= 768) {
              preventNavigation(event)
              setIsDragging(true)
            }
          }}
          onDragLeave={(event) => {
            if (window.innerWidth >= 768) {
              preventNavigation(event)
              setIsDragging(false)
            }
          }}
          className={cn(
            "flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed bg-white/70 p-5 text-sm transition",
            isDragging ? "border-purple-500/80 bg-purple-50" : "border-purple-200/80 text-zinc-600"
          )}
        >
          {/* MOBILE VIEW */}
          <div className="md:hidden flex flex-col items-center gap-1">
          <p className="text-base font-semibold text-zinc-900">
            Click to browse
          </p>
          <p className="text-xs text-zinc-500">PNG, JPG, JPEG, WEBP — Max 3MB</p>
          </div>

          {/* DESKTOP VIEW */}
          <div className="hidden md:flex flex-col items-center gap-1">
            <p className="text-base font-semibold text-zinc-900">
              Drag & drop or click to browse
            </p>
            <p className="text-xs text-zinc-500">PNG, JPG, JPEG, WEBP — Max 3MB</p>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {preview && (
        <div className="mt-4 w-full max-w-xs relative">
          {/* Preview Image */}
          <div className="relative w-full aspect-[4/3]">
            <Image
              src={preview}
              alt="Preview"
              fill
              sizes="(max-width: 640px) 100vw, 320px"
              className="rounded-xl border shadow-md object-cover"
            />
          </div>

          {/* X Remove Button */}
          <button
            type="button"
            onClick={() => {
              onChange(null)
              if (inputRef.current) inputRef.current.value = ""
            }}
            className="absolute top-2 right-2 bg-red-600 text-white w-8 h-8 rounded-full text-xs flex items-center justify-center shadow"
          >
            ✕
          </button>

          {/* CHANGE PHOTO BUTTON */}
          <button
            type="button"
            className="mt-3 w-full px-3 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700"
            onClick={pickFile}
          >
            Change Photo
          </button>
        </div>
      )}
    </div>
  )
}
