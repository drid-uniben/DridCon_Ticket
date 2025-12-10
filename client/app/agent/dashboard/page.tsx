"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"
import { scanApi } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser"
import { Result, Exception } from "@zxing/library"


type ScanResult = {
  id: string
  attendeeName: string
  email: string
  ticketType: string
  status: "success" | "already_scanned" | "invalid"
  scannedAt: string
  scannedBy?: string
  checkedInAt?: string
}

export default function AgentDashboardPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [stats, setStats] = useState({ totalScans: 0, successfulCheckIns: 0 })
  const [showHistory, setShowHistory] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // QR Scanner refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)

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



  // Load scan history from server
  useEffect(() => {
    const fetchScanHistory = async () => {
      try {
        const response = await scanApi.getScanHistory()
        const { history, stats } = response.data
        
        const formattedHistory: ScanResult[] = history.map((item: any) => ({
          id: item._id,
          attendeeName: item.name || "Unknown",
          email: item.email || "",
          ticketType: item.ticketType || "",
          status: item.checkInStatus === "checked-in" ? "success" : "invalid",
          scannedAt: item.checkedInAt,
          scannedBy: item.checkedInBy?.name,
        }))
        setScanHistory(formattedHistory)
        setStats(stats)
      } catch (error) {
        console.error("Failed to fetch scan history:", error)
      }
    }
    
    if (user && user.role === "agent") {
      fetchScanHistory()
    }
  }, [user])
  
  const addToHistory = useCallback(
    (result: ScanResult) => {
      const updated = [result, ...scanHistory].slice(0, 50);
      setScanHistory(updated);
      // Update stats locally
      setStats(prevStats => ({
        totalScans: prevStats.totalScans + 1,
        successfulCheckIns: result.status === 'success' 
          ? prevStats.successfulCheckIns + 1 
          : prevStats.successfulCheckIns
      }));
    },
    [scanHistory]
  );

  // Scan handler for camera scan
  const handleCameraScan = useCallback(async (token: string) => {
    setIsScannerOpen(false)
    setScanning(true)

    try {
      const res = await scanApi.scanQR(token)
      const data = res.data || res

      const result: ScanResult = {
        id: Date.now().toString(),
        attendeeName: data?.name || "Unknown",
        email: data?.email || "",
        ticketType: data?.ticketType || "",
        status: "success",
        scannedAt: new Date().toISOString(),
      }

      setLastResult(result)
      addToHistory(result)
    } catch (err: any) {
      let status: "already_scanned" | "invalid" = "invalid"
      let scannedByAgent: string | undefined = undefined
      let checkedInAtTime: string | undefined = undefined

      if (err.response && err.response.data) {
        const { message, details } = err.response.data;
        const msg = (message as string).toLowerCase();

        if (msg.includes("already") || msg.includes("used")) {
          status = "already_scanned"
          if (details) {
            attendeeName = details.attendeeName
            scannedByAgent = details.checkedInBy
            checkedInAtTime = details.checkedInAt
          }
        }
      }

      const result: ScanResult = {
        id: Date.now().toString(),
        attendeeName: attendeeName || "N/A",
        email: "",
        ticketType: "",
        status,
        scannedAt: new Date().toISOString(),
        scannedBy: scannedByAgent,
        checkedInAt: checkedInAtTime,
      }

      setLastResult(result)
      addToHistory(result)
    } finally {
      setScanning(false)
    }
  }, [addToHistory])

  useEffect(() => {
    if (!isScannerOpen) {
      if (controlsRef.current) {
        controlsRef.current.stop()
        controlsRef.current = null
      }
      return
    }

    const codeReader = new BrowserQRCodeReader()

    const startCamera = async () => {
      try {
        const devices = await BrowserQRCodeReader.listVideoInputDevices()
        if (devices.length === 0) return

        const selectedDeviceId =
          devices.find((d: MediaDeviceInfo) => d.label.toLowerCase().includes("back"))?.deviceId || devices[0].deviceId

        controlsRef.current = await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current!,
          (
            result: Result | undefined,
            error: Exception | undefined,
            controls: IScannerControls
          ) => {
            if (result) {
              controls.stop()
              controlsRef.current = null
              handleCameraScan(result.getText())
            }
            if (error && error.name !== "NotFoundException") {
              console.error(error)
            }
          }
        )
      } catch (err) {
        console.error("Camera error:", err)
      }
    }

    startCamera()

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop()
        controlsRef.current = null
      }
    }
  }, [handleCameraScan, isScannerOpen])


  async function handleLogout() {
    await logout()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={48} />
            <div>
              <h1 className="text-xl font-bold text-zinc-900">Frontdesk Scanner</h1>
              <p className="text-xs text-zinc-500">Welcome, {user?.name || "Frontdesk"}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>Point your camera at the QR code.</DialogDescription>
          </DialogHeader>
          <div className="bg-black rounded-lg overflow-hidden h-64 mt-4">
            <video ref={videoRef} className="w-full h-full object-cover" />
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow text-center">
            <p className="text-3xl font-bold text-green-600">{stats.successfulCheckIns}</p>
            <p className="text-sm text-zinc-500">Successful Check-ins</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow text-center">
            <p className="text-3xl font-bold text-zinc-900">{stats.totalScans}</p>
            <p className="text-sm text-zinc-500">Total Scans</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-center">Scan QR Code</h2>

          <Button
            onClick={() => setIsScannerOpen(true)}
            className="w-full mb-4 bg-purple-600  hover:bg-purple-700 py-6 text-lg"
          >
            Open Camera Scanner
          </Button>

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
                    <p className="text-lg text-yellow-600 mt-2">
                      by {lastResult.scannedBy}
                      {lastResult.checkedInAt && ` at ${lastResult.checkedInAt}`}
                    </p>
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
            null
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