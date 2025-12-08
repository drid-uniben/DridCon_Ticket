"use client"
import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"
import { authApi } from "@/lib/api"

function CompleteRegistrationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [designation, setDesignation] = useState("")
  // Password fields removed: attendees do not set passwords as part of complete registration per spec
  const [department, setDepartment] = useState("")
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Verify invite token on mount
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError("Invalid or missing invitation link")
        setVerifying(false)
        return
      }
      try {
        const res = await authApi.verifyInvite(token)
        const data = res.data || res
        // Pre-fill email if provided
        if (data.email) setEmail(data.email)
        if (data.name) setName(data.name)
        if (data.phoneNumber) setPhone(data.phoneNumber)
        if (data.designation) setDesignation(data.designation)
        if (data.department) setDepartment(data.department)
      } catch {
        setError("Invalid or expired invitation link")
      } finally {
        setVerifying(false)
      }
    }
    verifyToken()
  }, [token])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name || !phone || !designation) {
      setError("Please fill in all required fields.")
      return
    }

    setLoading(true)
    try {
      await authApi.completeRegistration({
        inviteToken: token,
        name,
        phoneNumber: phone,
        designation,
        department,
      })
      setSuccess(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Registration failed. Please try again."
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-white p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="rounded-full bg-green-100 w-20 h-20 flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Registration Complete!</h1>
          <p className="text-zinc-600">Your ticket with QR code has been sent to your email.</p>
          <Button onClick={() => router.push("/")} className="bg-gradient-to-r from-purple-600 to-indigo-600">
            Go to Registration page
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-white py-10 px-4">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Logo size={80} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-900">Complete Your Registration</h1>
            <p className="text-sm text-zinc-600">Fill in the remaining details to get your ticket</p>
          </div>
        </div>

        {error && !verifying && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-xl space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
              placeholder="080********"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Designation *</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
              placeholder="e.g. PhD Student, Lecturer"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
              placeholder="e.g. Computer Science"
            />
          </div>

          {/* Password and confirm password removed from UI per spec */}

          <Button
            type="submit"
            disabled={loading || !!error}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {loading ? "Completing Registration…" : "Complete Registration"}
          </Button>
        </form>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-zinc-600">Loading...</p>
      </div>
    </div>
  )
}

export default function CompleteRegistrationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CompleteRegistrationContent />
    </Suspense>
  )
}
