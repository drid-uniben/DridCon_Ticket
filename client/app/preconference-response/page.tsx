"use client"
import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"
import { authApi } from "@/lib/api"

function PreConferenceResponseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [response, setResponse] = useState<'yes' | 'no' | null>(null)

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing invitation link")
      setVerifying(false)
    } else {
      setVerifying(false)
    }
  }, [token])

  async function handleResponse(choice: 'yes' | 'no') {
    if (!token) {
      setError("Invalid invitation token")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await authApi.respondToPreConferenceInvite({ token, response: choice })
      setResponse(choice)
      setSuccess(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit response. Please try again."
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-50 via-indigo-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-50 via-indigo-50 to-white p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="rounded-full bg-green-100 w-20 h-20 flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Response Recorded!</h1>
          <p className="text-zinc-600">
            {response === 'yes' 
              ? "Thank you for confirming your attendance! Your pre-conference ticket will be sent to your email shortly."
              : "Thank you for your response. You're still confirmed for the main conference on January 21."
            }
          </p>
          <Button onClick={() => router.push("/")} className="bg-linear-to-r from-purple-600 to-indigo-600">
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-indigo-50 to-white py-10 px-4">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Logo size={80} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-900">Pre-Conference Session</h1>
            <p className="text-sm text-zinc-600">January 20, 2026 • Akin Deko Auditorium</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-xl space-y-4">
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-semibold text-zinc-900">
              Would you like to attend the Pre-Conference Session?
            </h2>
            <p className="text-sm text-zinc-600">
              This exclusive session focuses on commercializing research and innovation. 
              Your main conference access (January 21) is already confirmed.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              onClick={() => handleResponse('yes')}
              disabled={loading}
              className="w-full bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-6 text-lg"
            >
              {loading ? "Processing..." : "Yes, I want to attend"}
            </Button>
            <Button
              onClick={() => handleResponse('no')}
              disabled={loading}
              variant="outline"
              className="w-full py-6 text-lg"
            >
              {loading ? "Processing..." : "No, main conference only"}
            </Button>
          </div>

          <p className="text-xs text-zinc-500 text-center pt-4">
            This invitation is optional. Your choice will not affect your main conference registration.
          </p>
        </div>

        <p className="text-center text-sm text-zinc-600 mt-8">
          For questions, contact support at <a href="mailto:drid@uniben.edu" className="text-purple-600 hover:underline">drid@uniben.edu</a>
        </p>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-50 via-indigo-50 to-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-zinc-600">Loading...</p>
      </div>
    </div>
  )
}

export default function PreConferenceResponsePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PreConferenceResponseContent />
    </Suspense>
  )
}