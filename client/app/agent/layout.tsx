"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    // Check if user is logged in and is agent
    const token = localStorage.getItem("accessToken")
    if (!token || !user || user.role !== "agent") {
      router.push("/login")
    }
  }, [user, router])

  // Show nothing while checking auth
  if (!user || user.role !== "agent") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Checking authorization...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
