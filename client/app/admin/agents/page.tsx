"use client"
import React, { useState } from "react"
import AddAgentForm from "@/components/admin/AddAgentForm"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"

type Agent = {
  id: string
  name: string
  email: string
  username?: string
  password?: string
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])

  function handleAdded(a: Agent) {
    setAgents((s) => [a, ...s])
  }

  return (
    <div className="min-h-screen bg-purple-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center gap-4">
          <Logo size={64} />
          <div>
            <h1 className="text-2xl font-bold">Admin — Agent Management</h1>
            <p className="text-sm text-zinc-600">Add agents and generate credentials (frontend simulation)</p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="rounded-2xl bg-white p-5 shadow">
              <h3 className="mb-3 text-lg font-semibold">Add new agent</h3>
              <AddAgentForm onAdded={handleAdded} />
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="rounded-2xl bg-white p-5 shadow">
              <div className="flex items-center justify-between">
                <h3 className="mb-3 text-lg font-semibold">Agents</h3>
                <Button variant="outline" size="sm" onClick={() => setAgents([])}>Clear</Button>
              </div>

              {agents.length === 0 ? (
                <p className="text-sm text-zinc-500">No agents yet. Add one using the form.</p>
              ) : (
                <ul className="space-y-3">
                  {agents.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-zinc-500">{a.email}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-xs text-zinc-500">username</div>
                        <div className="font-mono text-sm">{a.username}</div>
                        <div className="text-xs text-zinc-500 mt-1">password</div>
                        <div className="font-mono text-sm">{a.password}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
