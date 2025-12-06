"use client"
import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"
import api from "@/lib/api"
import { AxiosError } from "axios"

type ScanResult = {
  id: string
  attendeeName: string
  email: string
  ticketType: string
  status: "success" | "already_scanned" | "invalid"
  scannedAt: string
  scannedBy?: string
}

export default function AgentDashboardPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [qrInput, setQrInput] = useState("")
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Check auth on mount
  useEffect(() => {
    if (!user || user.role !== "agent") {
      router.push("/login")
    }
  }, [user, router])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Load scan history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("scanHistory")
    if (saved) {
      try {
        setScanHistory(JSON.parse(saved))
      } catch {
        // ignore parse errors
      }
    }
  }, [])

  async function handleScan(e: React.FormEvent) {
    e.preventDefault()
    if (!qrInput.trim() || scanning) return

    setScanning(true)
    setLastResult(null)

    try {
      const res = await api.post("/scan/verify", { qrCode: qrInput })
      const data = res.data.data || res.data

      const result: ScanResult = {
        id: Date.now().toString(),
        attendeeName: data.attendee?.name || "Unknown",
        email: data.attendee?.email || "",
        ticketType: data.attendee?.ticketType || "",
        status: "success",
        scannedAt: new Date().toISOString(),
      }

      setLastResult(result)
      addToHistory(result)
    } catch (err) {
      let status: "already_scanned" | "invalid" = "invalid"
      let errorMessage = "Invalid QR code"
      let scannedBy = undefined

      if (err instanceof AxiosError) {
        const resData = err.response?.data
        errorMessage = resData?.message ?? errorMessage
        if (errorMessage.toLowerCase().includes("already") || errorMessage.toLowerCase().includes("used")) {
          status = "already_scanned"
          scannedBy = resData?.scannedBy
        }
      }

      const result: ScanResult = {
        id: Date.now().toString(),
        attendeeName: "N/A",
        email: "",
        ticketType: "",
        status,
        scannedAt: new Date().toISOString(),
        scannedBy,
      }

      setLastResult(result)
      addToHistory(result)
    } finally {
      setScanning(false)
      setQrInput("")
      inputRef.current?.focus()
    }
  }

  function addToHistory(result: ScanResult) {
    const updated = [result, ...scanHistory].slice(0, 50)
    setScanHistory(updated)
    localStorage.setItem("scanHistory", JSON.stringify(updated))
  }

  function clearHistory() {
    setScanHistory([])
    localStorage.removeItem("scanHistory")
  }

  function handleLogout() {
    localStorage.removeItem("accessToken")
    logout()
    router.push("/login")
  }

  const successCount = scanHistory.filter((s) => s.status === "success").length

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={48} />
            <div>
              <h1 className="text-xl font-bold text-zinc-900">Agent Scanner</h1>
              <p className="text-xs text-zinc-500">Welcome, {user?.name || "Agent"}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow text-center">
            <p className="text-3xl font-bold text-green-600">{successCount}</p>
            <p className="text-sm text-zinc-500">Successful Check-ins</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow text-center">
            <p className="text-3xl font-bold text-zinc-900">{scanHistory.length}</p>
            <p className="text-sm text-zinc-500">Total Scans</p>
          </div>
        </div>

        {/* Scanner */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-center">Scan QR Code</h2>
          <form onSubmit={handleScan} className="space-y-4">
            <input
              ref={inputRef}
              type="text"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="Scan or enter QR code..."
              className="w-full rounded-lg border border-zinc-300 px-4 py-4 text-lg text-center focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
              autoFocus
            />
            <Button
              type="submit"
              disabled={scanning || !qrInput.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 py-6 text-lg"
            >
              {scanning ? "Verifying..." : "Verify Entry"}
            </Button>
          </form>

          {/* Last Result */}
          {lastResult && (
            <div
              className={`mt-6 rounded-xl p-6 text-center ${
                lastResult.status === "success"
                  ? "bg-green-50 border-2 border-green-500"
                  : lastResult.status === "already_scanned"
                  ? "bg-yellow-50 border-2 border-yellow-500"
                  : "bg-red-50 border-2 border-red-500"
              }`}
            >
              {lastResult.status === "success" && (
                <>
                  <div className="text-6xl mb-2">✅</div>
                  <h3 className="text-2xl font-bold text-green-700">Entry Granted</h3>
                  <p className="text-lg text-green-600 mt-2">{lastResult.attendeeName}</p>
                  <p className="text-sm text-green-500 capitalize">{lastResult.ticketType} ticket</p>
                </>
              )}
              {lastResult.status === "already_scanned" && (
                <>
                  <div className="text-6xl mb-2">⚠️</div>
                  <h3 className="text-2xl font-bold text-yellow-700">Already Checked In</h3>
                  {lastResult.scannedBy && (
                    <p className="text-sm text-yellow-600 mt-2">Previously scanned by: {lastResult.scannedBy}</p>
                  )}
                </>
              )}
              {lastResult.status === "invalid" && (
                <>
                  <div className="text-6xl mb-2">❌</div>
                  <h3 className="text-2xl font-bold text-red-700">Invalid QR Code</h3>
                  <p className="text-sm text-red-500 mt-2">This QR code is not recognized</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* History Toggle */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-purple-600 hover:underline"
          >
            {showHistory ? "Hide" : "Show"} Scan History ({scanHistory.length})
          </button>
          {scanHistory.length > 0 && (
            <button onClick={clearHistory} className="text-sm text-red-500 hover:underline">
              Clear History
            </button>
          )}
        </div>

        {/* History */}
        {showHistory && scanHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-4 space-y-2">
            {scanHistory.map((scan) => (
              <div
                key={scan.id}
                className={`rounded-lg p-3 text-sm flex justify-between items-center ${
                  scan.status === "success"
                    ? "bg-green-50"
                    : scan.status === "already_scanned"
                    ? "bg-yellow-50"
                    : "bg-red-50"
                }`}
              >
                <div>
                  <p className="font-medium">{scan.attendeeName}</p>
                  <p className="text-xs text-zinc-500">{new Date(scan.scannedAt).toLocaleTimeString()}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    scan.status === "success"
                      ? "bg-green-200 text-green-800"
                      : scan.status === "already_scanned"
                      ? "bg-yellow-200 text-yellow-800"
                      : "bg-red-200 text-red-800"
                  }`}
                >
                  {scan.status === "success" ? "✓" : scan.status === "already_scanned" ? "⚠" : "✗"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
