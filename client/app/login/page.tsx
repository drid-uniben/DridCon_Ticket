"use client"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"
import api from "@/lib/api"
import { AxiosError } from "axios"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Call backend login endpoint
      const res = await api.post("/auth/login", { email, password })
      const { user, accessToken } = res.data.data || res.data

      // Store token in localStorage
      if (accessToken) {
        localStorage.setItem("accessToken", accessToken)
      }

      // Set user in context
      login({ name: user?.name || "User", email: user?.email || email, role: user?.role })

      // Redirect based on role
      if (user?.role === "admin") {
        router.push("/admin/dashboard")
      } else if (user?.role === "agent") {
        router.push("/agent/dashboard")
      } else {
        router.push("/")
      }
    } catch (err) {
      let errorMessage = "Login failed. Check your credentials."
      if (err instanceof AxiosError) {
        errorMessage = err.response?.data?.message ?? errorMessage
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-white p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Logo size={80} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-900">Welcome back</h1>
            <p className="text-sm text-zinc-600">Sign in to access your dashboard</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-xl space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-xs text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/" className="text-purple-600 hover:underline">
              Register here
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
