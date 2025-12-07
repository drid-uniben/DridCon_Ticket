"use client"
import React, { useState } from "react"

export type DescriptionSection = {
  heading?: string
  text?: string
  items?: string[]
}

type Props = {
  title?: string
  sections: DescriptionSection[]
  previewSections?: number
}

function makeClickable(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return text.split(urlRegex).map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          className="text-purple-700 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export default function FormDescription({
  title,
  sections,
  previewSections = 2,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const visibleSections = expanded ? sections : sections.slice(0, previewSections)
  const showToggle = sections.length > previewSections

  return (
    <div className="space-y-4 rounded-3xl border border-purple-200 bg-gradient-to-b from-white via-purple-50 to-purple-100 p-6 shadow-2xl">
      {title && <h2 className="text-2xl font-semibold text-zinc-900">{title}</h2>}

      <div className="space-y-4 text-sm text-zinc-700">
        {visibleSections.map((section, index) => (
          <div key={index} className="space-y-2">
            {section.heading && (
              <p className="text-base font-semibold text-zinc-900">{section.heading}</p>
            )}

            {section.text && (
              <p className="leading-relaxed text-sm">
                {makeClickable(section.text)}
              </p>
            )}

            {section.items && (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-semibold uppercase tracking-wide text-purple-700"
        >
          {expanded ? "Show less" : "Keep reading"}
        </button>
      )}
    </div>
  )
}
