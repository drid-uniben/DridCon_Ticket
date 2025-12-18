"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"

type ConfirmDialogVariant = "default" | "danger"

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ConfirmDialogVariant
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

/**
 * Lightweight confirm dialog (no external deps).
 * - Accessible: role="dialog", aria-modal, Esc to close, click-backdrop to close.
 * - Good default UX: focus management + disabled confirm when loading.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null)
  const confirmBtnRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    if (!open) return

    // Focus confirm by default for quick approve flows.
    const t = window.setTimeout(() => confirmBtnRef.current?.focus(), 0)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
      if (e.key === "Tab") {
        // Minimal focus trap for 2 buttons
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        )
        if (!focusables || focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null

        if (e.shiftKey) {
          if (active === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (active === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onCancel])

  if (!open) return null

  const dangerStyles =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-95"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-zinc-200 p-5"
      >
        <h3 id="confirm-dialog-title" className="text-base font-semibold text-zinc-900">
          {title}
        </h3>

        {description ? (
          <div className="mt-2 text-sm text-zinc-600 leading-relaxed">{description}</div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>

          <Button
            ref={(el) => {
              // Button from shadcn may not forward ref typed correctly; handle gracefully
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              confirmBtnRef.current = el as any
            }}
            onClick={onConfirm}
            disabled={loading}
            className={dangerStyles}
          >
            {loading ? "Please wait..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}