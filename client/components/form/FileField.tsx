"use client"
import React, { useCallback, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type Props = {
  label?: string
  name?: string
  onChange: (file: File | null) => void
}

export default function FileField({ label, name, onChange }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const pickFile = () => inputRef.current?.click()

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0] ?? null
      if (!file) {
        onChange(null)
        setPreview(null)
        return
      }

      // Validate accepted image formats
      const validTypes = ["image/png", "image/jpeg", "image/jpg"]
      if (!validTypes.includes(file.type)) {
        alert("Only PNG, JPG and JPEG images are allowed.")
        onChange(null)
        setPreview(null)
        return
      }

      // Validate max size (3MB)
      if (file.size > 3 * 1024 * 1024) {
        alert("Image must be under 3MB.")
        onChange(null)
        setPreview(null)
        return
      }

      // Set preview
      setPreview(URL.createObjectURL(file))
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
      {label && <span className="text-sm font-medium text-zinc-900">{label}</span>}

      <div
        role="button"
        tabIndex={0}
        onClick={pickFile}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") pickFile()
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
          "flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed bg-white/70 p-5 text-sm transition",
          isDragging ? "border-purple-500/80 bg-purple-50" : "border-purple-200/80 text-zinc-600"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/png, image/jpeg"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />

        <p className="text-base font-semibold text-zinc-900">Drag & drop or click to browse</p>
        <p className="text-xs text-zinc-500">PNG, JPG, JPEG — Max 3MB</p>
      </div>

      {/* Image Preview */}
      {preview && (
        <div className="mt-4 space-y-3">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-w-xs rounded-xl border shadow-md"
          />

          <button
            type="button"
            className="px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600"
            onClick={() => {
              setPreview(null)
              onChange(null)
              if (inputRef.current) inputRef.current.value = ""
            }}
          >
            Remove Image
          </button>
        </div>
      )}
    </div>
  )
}
