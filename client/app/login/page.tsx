"use client"
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"

export default function LoginPage() {
  const router = useRouter()
  const { login, user } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError(null)
  setLoading(true)

  try {
    await login({ email, password })
  } catch (err: any) {
    let message = "Login failed. Please check your email and password."

    if (err?.response) {
      if (err.response.status === 400 || err.response.status === 401) {
        message = "Invalid email or password."
      } 
      else if (err.response.status === 404) {
        message = "Account not found."
      } 
      else if (err.response.status >= 500) {
        message = "Server error. Please try again later."
      }
    } 
    
    else if (err?.message?.includes("Network")) {
      message = "Network error. Please check your connection."
    }

    setError(message)
  } finally {
    setLoading(false)
  }
}


  // Redirect when user is set after successful login
  React.useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin/dashboard")
      } else if (user.role === "agent") {
        router.push("/agent/dashboard")
      } else {
        router.push("/")
      }
    }
  }, [user, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-white p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Logo size={80} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-900">Welcome Back</h1>
            <p className="text-sm text-zinc-600">DridCon Management Portal</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl bg-white p-8 shadow-xl border border-purple-100 space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSubmit(e)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-zinc-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                placeholder="your@email.com"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSubmit(e)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-zinc-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                placeholder="••••••••"
                disabled={loading}
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 py-3 text-lg font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>

          {/* Info Cards */}
          <div className="pt-6 border-t border-zinc-200">
            <p className="text-xs text-zinc-600 text-center mb-4">
              This portal is for administrators and authorized agents only
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl mb-1">👤</div>
                <p className="text-xs font-semibold text-purple-900">Admin</p>
                <p className="text-xs text-purple-700">Full access</p>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <div className="text-2xl mb-1">📱</div>
                <p className="text-xs font-semibold text-indigo-900">Agent</p>
                <p className="text-xs text-indigo-700">Check-in only</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-zinc-500 pt-4">
            Need to register for the event?{" "}
            <Link href="/" className="text-purple-600 hover:underline font-medium">
              Register here
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
