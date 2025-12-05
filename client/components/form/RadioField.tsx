"use client"
import React from "react"

type Option = { label: string; value: string }

type Props = {
  label?: string
  name: string
  value: string
  onChange: (v: string) => void
  options: Option[]
}

export default function RadioField({ label, name, value, onChange, options }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label key={opt.value} className="inline-flex items-center gap-2">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="h-4 w-4"
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
