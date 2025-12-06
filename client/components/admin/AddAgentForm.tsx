"use client"
import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

type Agent = {
  id: string
  name: string
  email: string
  username?: string
  password?: string
}

function generatePassword(len = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()"
  let out = ""
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export default function AddAgentForm({ onAdded }: { onAdded: (a: Agent) => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !email.trim()) return setError("Name and email are required")
    setLoading(true)
    try {
      // Frontend-only: simulate POST to backend and generate credentials here
      const username = email
      const password = generatePassword(12)

      // optional: attempt to persist via api (will fail if backend missing) but we keep optimistic
      try {
        await api.post("/admin/agents", { name, email, username })
      } catch {
        // ignore network/backend error in frontend-only implementation
      }

      const agent = { id: Date.now().toString(), name, email, username, password }
      onAdded(agent)
      setName("")
      setEmail("")
    } catch {
      setError("Failed to add agent")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-zinc-700">Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="Jane Doe" />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="jane@example.com" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} variant="default">
          {loading ? "Adding…" : "Add agent"}
        </Button>
      </div>
    </form>
  )
}
