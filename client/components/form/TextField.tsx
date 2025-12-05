"use client"
import React from "react"

type Props = {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  placeholder?: string
}

export default function TextField({ label, name, value, onChange, required, placeholder }: Props) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="text-sm font-medium">{label}{required ? " *" : ""}</span>
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2"
        required={required}
      />
    </label>
  )
}
