"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"
import { scanApi } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser"
import { Result, Exception } from "@zxing/library"


type ScanResult = {
  id: string
  attendeeName: string
  email: string
  ticketType: string
  status: "success" | "already_scanned" | "invalid"
  scannedAt: string
  message?: string
  scanSource?: "qr" | "manual"
  scannedBy?: string
  checkedInAt?: string
  sessionType?: string
}

type ScanHistoryApiItem = {
  _id: string
  name?: string
  email?: string
  ticketType?: string
  scanStatus?: "success" | "already_scanned" | "invalid"
  scanSource?: "qr" | "manual"
  scannedAt?: string
  checkedInAt?: string
  checkInStatus?: "checked-in" | "not-checked-in"
  message?: string
  details?: {
    checkedInBy?: string
    checkedInAt?: string
    sessionType?: string
  }
  sessionType?: string
}

type ScanErrorDetails = {
  attendeeName?: string
  checkedInBy?: string
  checkedInAt?: string
  sessionType?: string
}

type ErrorPayload = {
  message?: string
  details?: ScanErrorDetails
}

type Attendee = {
  _id: string
  name?: string
  email?: string
  ticketType?: string
  qrCode?: string
  preConferenceQrCode?: string
  mainConferenceQrCode?: string
  checkInStatus?: "checked-in" | "not-checked-in"
  preConferenceCheckInStatus?: "checked-in" | "not-checked-in"
  mainConferenceCheckInStatus?: "checked-in" | "not-checked-in"
  preConferenceCheckInSource?: "qr" | "manual"
  mainConferenceCheckInSource?: "qr" | "manual"
}

export default function AgentDashboardPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [stats, setStats] = useState({ totalScans: 0, successfulCheckIns: 0, successfulManualCheckIns: 0 })
  const [showHistory, setShowHistory] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Registered attendees (manual check-in UI)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [attendeesLoading, setAttendeesLoading] = useState(false)
  const [attendeesError, setAttendeesError] = useState<string | null>(null)
  const [attendeeSearch, setAttendeeSearch] = useState("")

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmSession, setConfirmSession] = useState<"pre-conference" | "main-conference">("main-conference")
  const [confirmAttendee, setConfirmAttendee] = useState<Attendee | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  // QR Scanner refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)

  const formatDateTime = useCallback((iso: string) => {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ""
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }, [])

  // Filter attendees based on search query
  const filteredAttendees = React.useMemo(() => {
    if (!attendeeSearch.trim()) {
      return attendees
    }
    const query = attendeeSearch.toLowerCase()
    return attendees.filter((a) => {
      const name = (a.name || "").toLowerCase()
      const email = (a.email || "").toLowerCase()
      return name.includes(query) || email.includes(query)
    })
  }, [attendees, attendeeSearch])

  const renderSourceBadge = useCallback((source?: "qr" | "manual") => {
    if (!source) return null
    const isManual = source === "manual"
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
          isManual ? "bg-indigo-100 text-indigo-800" : "bg-emerald-100 text-emerald-800"
        }`}
      >
        {isManual ? "Manual" : "QR"}
      </span>
    )
  }, [])

  const getErrorPayload = useCallback((err: unknown): ErrorPayload | null => {
    if (!err || typeof err !== "object") return null
    if (!("response" in err)) return null
    const response = (err as { response?: { data?: unknown } }).response
    if (!response || typeof response.data !== "object" || !response.data) return null
    const data = response.data as { message?: unknown; details?: unknown }
    const message = typeof data.message === "string" ? data.message : undefined
    const details =
      data.details && typeof data.details === "object"
        ? (data.details as ScanErrorDetails)
        : undefined
    return { message, details }
  }, [])

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



  const fetchScanHistory = useCallback(async () => {
    try {
      const response = await scanApi.getScanHistory()
      const payload = (response?.data ?? response) as {
        history?: ScanHistoryApiItem[]
        stats?: { totalScans: number; successfulCheckIns: number; successfulManualCheckIns?: number }
      }
      const history = Array.isArray(payload?.history) ? payload.history : []
      const stats = payload?.stats ?? { totalScans: 0, successfulCheckIns: 0, successfulManualCheckIns: 0 }
      
      const formattedHistory: ScanResult[] = history.map((item) => ({
        id: item._id,
        attendeeName: item.name || "Unknown",
        email: item.email || "",
        ticketType: item.ticketType || "",
        status: item.scanStatus || (item.checkInStatus === "checked-in" ? "success" : "invalid"),
        scannedAt: item.scannedAt || item.checkedInAt || new Date().toISOString(),
        message: item.message,
        scanSource: item.scanSource,
        scannedBy: item.details?.checkedInBy,
        checkedInAt: item.details?.checkedInAt,
        sessionType:
          item.sessionType === "pre-conference"
            ? "Pre-Conference"
            : item.sessionType === "main-conference"
              ? "Main Conference"
              : item.sessionType,
      }))
      setScanHistory(formattedHistory)
      setStats({
        totalScans: stats.totalScans,
        successfulCheckIns: stats.successfulCheckIns,
        successfulManualCheckIns: stats.successfulManualCheckIns ?? 0,
      })
    } catch (error) {
      console.error("Failed to fetch scan history:", error)
    }
  }, [])

  const fetchAttendees = useCallback(async () => {
    setAttendeesLoading(true)
    setAttendeesError(null)
    try {
      const res = await scanApi.getAttendees()
      const list = (res?.data ?? res) as Attendee[]
      setAttendees(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error("Failed to fetch attendees:", error)
      setAttendeesError("Failed to load registered people")
    } finally {
      setAttendeesLoading(false)
    }
  }, [])

  // Load scan history from server on initial load
  useEffect(() => {
    if (user && user.role === "agent") {
      fetchScanHistory()
      fetchAttendees()
    }
  }, [user, fetchScanHistory, fetchAttendees])

  const openManualConfirm = useCallback(
    (session: "pre-conference" | "main-conference", attendee: Attendee) => {
      setConfirmSession(session)
      setConfirmAttendee(attendee)
      setConfirmError(null)
      setConfirmOpen(true)
    },
    []
  )

  const doManualCheckIn = useCallback(async () => {
    if (!confirmAttendee?._id) return
    setConfirmLoading(true)
    setConfirmError(null)
    try {
      if (confirmSession === "pre-conference") {
        await scanApi.manualCheckInPreConference(confirmAttendee._id)
      } else {
        await scanApi.manualCheckInMainConference(confirmAttendee._id)
      }
      setConfirmOpen(false)
      setConfirmAttendee(null)
      await fetchAttendees()
      await fetchScanHistory()
    } catch (err: unknown) {
      const payload = getErrorPayload(err)
      const msg = payload?.message || "Manual check-in failed"
      setConfirmError(msg)
    } finally {
      setConfirmLoading(false)
    }
  }, [confirmAttendee, confirmSession, fetchAttendees, fetchScanHistory, getErrorPayload])

  // Scan handler for camera scan
  const handleCameraScan = useCallback(async (token: string) => {
    setIsScannerOpen(false)

    try {
      const res = await scanApi.scanQR(token)
      const data = res.data || res

      const result: ScanResult = {
        id: Date.now().toString(), // Temporary ID, will be replaced by fetch
        attendeeName: data?.name || "Unknown",
        email: data?.email || "",
        ticketType: data?.ticketType || "",
        status: "success",
        scannedAt: new Date().toISOString(),
        sessionType: data?.sessionType || "",
      }
      setLastResult(result)
    } catch (err: unknown) {
      let status: "already_scanned" | "invalid" = "invalid"
      let scannedByAgent: string | undefined = undefined
      let checkedInAtTime: string | undefined = undefined
      let attendeeName: string | undefined = undefined
      let sessionType: string | undefined = undefined
      let message: string | undefined = undefined

      const payload = getErrorPayload(err)
      if (payload?.message) {
        message = payload.message
        const msg = payload.message.toLowerCase()

        if (msg.includes("already") || msg.includes("used")) {
          status = "already_scanned"
          if (payload.details) {
            attendeeName = payload.details.attendeeName
            scannedByAgent = payload.details.checkedInBy
            checkedInAtTime = payload.details.checkedInAt
            sessionType = payload.details.sessionType
          }
        }
      }

      const result: ScanResult = {
        id: Date.now().toString(), // Temporary ID
        attendeeName: attendeeName || "N/A",
        email: "",
        ticketType: "",
        status,
        scannedAt: new Date().toISOString(),
        message,
        scannedBy: scannedByAgent,
        checkedInAt: checkedInAtTime,
        sessionType,
      }
      setLastResult(result)
    } finally {
      // Always re-fetch history to get the authoritative state from the server
      fetchScanHistory()
    }
  }, [fetchScanHistory, getErrorPayload])

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
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-indigo-50 to-white">
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

      <ConfirmDialog
        open={confirmOpen}
        title={
          confirmSession === "pre-conference"
            ? "Confirm Pre-Conference Manual Check-in"
            : "Confirm Main Conference Manual Check-in"
        }
        description={
          <div className="space-y-2">
            <p className="text-zinc-700">
              You are about to manually check in:
              <span className="font-semibold"> {confirmAttendee?.name || "Unknown"}</span>
            </p>
            <p className="text-zinc-600">
              <span className="font-medium">Email:</span> {confirmAttendee?.email || "—"}
            </p>
            <p className="text-zinc-600">
              <span className="font-medium">Ticket:</span> {confirmAttendee?.ticketType || "—"}
            </p>
            <p className="text-sm text-red-600">
              This action is not reversible. Please confirm you’re checking in the correct person.
            </p>
            {confirmError ? (
              <p className="text-sm text-red-600">{confirmError}</p>
            ) : null}
          </div>
        }
        confirmText={confirmSession === "pre-conference" ? "Check in (Pre-Conf)" : "Check in (Main Conf)"}
        cancelText="Cancel"
        variant="danger"
        loading={confirmLoading}
        onConfirm={doManualCheckIn}
        onCancel={() => {
          if (confirmLoading) return
          setConfirmOpen(false)
          setConfirmAttendee(null)
          setConfirmError(null)
        }}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow text-center">
            <p className="text-3xl font-bold text-green-600">{stats.successfulCheckIns}</p>
            <p className="text-sm text-zinc-500">Successful Check-ins</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow text-center">
            <p className="text-3xl font-bold text-zinc-900">{stats.totalScans}</p>
            <p className="text-sm text-zinc-500">Total Scans</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow text-center">
            <p className="text-3xl font-bold text-purple-700">{stats.successfulManualCheckIns}</p>
            <p className="text-sm text-zinc-500">Manual Check-ins</p>
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
                  {lastResult.sessionType && (
                    <p className="text-sm text-green-500 capitalize">{lastResult.sessionType}</p>
                  )}
                </>
              )}

              {lastResult.status === "already_scanned" && (
                <>
                  <div className="text-6xl mb-2">⚠️</div>
                  <h3 className="text-2xl font-bold text-yellow-700">Already Checked In</h3>
                  {lastResult.scannedBy && (
                    <p className="text-lg text-yellow-600 mt-2">
                      by {lastResult.scannedBy}
                      {lastResult.checkedInAt &&
                        ` at ${new Date(
                          lastResult.checkedInAt
                        ).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`}
                    </p>
                  )}
                  {lastResult.sessionType && (
                      <p className="text-sm text-yellow-700 capitalize mt-1">{lastResult.sessionType}</p>
                    )}
                </>
              )}

              {lastResult.status === "invalid" && (
                <>
                  <div className="text-6xl mb-2">❌</div>
                  <h3 className="text-2xl font-bold text-red-700">Scan Failed</h3>
                  <p className="text-sm text-red-500 mt-2">
                    {lastResult.message || "This QR code is not recognized"}
                  </p>
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
      {scan.sessionType && (
        <p className="text-xs text-zinc-600">
          {scan.sessionType}{scan.scanSource ? ` • ${scan.scanSource === "manual" ? "Manual" : "QR"}` : ""}
        </p>
      )}
      <p className="text-xs text-zinc-500">{formatDateTime(scan.scannedAt)}</p>
      {scan.status !== "success" && (scan.message || scan.scannedBy || scan.checkedInAt) ? (
        <p className="text-xs text-zinc-600">
          {scan.message || ""}
          {scan.scannedBy ? ` • Checked in by: ${scan.scannedBy}` : ""}
          {scan.checkedInAt ? ` • At: ${formatDateTime(scan.checkedInAt)}` : ""}
        </p>
      ) : null}
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

        {/* Registered People */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-zinc-900">Registered People</h2>
            <Button variant="outline" onClick={fetchAttendees} disabled={attendeesLoading}>
              Refresh
            </Button>
          </div>

          {attendeesError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              {attendeesError}
            </div>
          ) : null}

          <div className="bg-white rounded-2xl shadow p-4 overflow-x-auto">
            {attendeesLoading ? (
              <div className="text-sm text-zinc-500">Loading registered people…</div>
            ) : attendees.length === 0 ? (
              <div className="text-sm text-zinc-500">No attendees found.</div>
            ) : (
              <>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {attendeeSearch && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Showing {filteredAttendees.length} of {attendees.length} attendees
                    </p>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-zinc-50">
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Ticket</th>
                      <th className="text-center p-3">Pre-Conf</th>
                      <th className="text-center p-3">Main Conf</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendees.map((a) => {
                    const eligibleForPreConf = Boolean(a.preConferenceQrCode)
                    const preConfCheckedIn = a.preConferenceCheckInStatus === "checked-in"

                    const eligibleForMainConf = Boolean(a.qrCode || a.mainConferenceQrCode)
                    const mainCheckedIn =
                      a.mainConferenceQrCode
                        ? a.mainConferenceCheckInStatus === "checked-in"
                        : a.checkInStatus === "checked-in"

                    return (
                      <tr key={a._id} className="border-b hover:bg-zinc-50">
                        <td className="p-3">{a.name || "Unknown"}</td>
                        <td className="p-3 text-zinc-500">{a.email || ""}</td>
                        <td className="p-3">{a.ticketType || ""}</td>

                        <td className="p-3 text-center">
                          {!eligibleForPreConf ? (
                            <span className="text-zinc-400">N/A</span>
                          ) : preConfCheckedIn ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span>✅</span>
                              {renderSourceBadge(a.preConferenceCheckInSource)}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openManualConfirm("pre-conference", a)}
                            >
                              Check in
                            </Button>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          {!eligibleForMainConf ? (
                            <span className="text-zinc-400">N/A</span>
                          ) : mainCheckedIn ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span>✅</span>
                              {renderSourceBadge(a.mainConferenceCheckInSource)}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openManualConfirm("main-conference", a)}
                            >
                              Check in
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}