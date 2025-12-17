"use client"
import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"
import { adminApi } from "@/lib/api"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

type Attendee = {
  _id: string
  name: string
  email: string
  phoneNumber?: string
  ticketType: string
  department?: string
  designation: string
  paymentStatus: "pending" | "approved" | "declined"
  paymentProof?: string
  checkInStatus: "checked-in" | "not-checked-in"
  createdAt: string
}

type Agent = {
  _id: string
  name: string
  email: string
  createdAt: string
}

type DashboardDataType = {
  totalAttendeesCount: number
  checkedInAttendeesCount: number
  totalAgentsCount: number
  pendingApprovalsCount: number
}

type TabType = "pending" | "attendees" | "agents" | "manual" | "invite"

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>("pending")
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editedTicketType, setEditedTicketType] = useState<string>("")
  const [imageSrc, setImageSrc] = useState<string | null>(null)

  const [confirmState, setConfirmState] = useState<
    | { open: false }
    | {
        open: true
        action: "approve" | "decline"
        attendee: Attendee
      }
  >({ open: false })
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Dashbord tab counts
  const [dashboardData, setDashboardData] = useState<DashboardDataType>({
    totalAttendeesCount: 0,
    checkedInAttendeesCount: 0,
    totalAgentsCount: 0,
    pendingApprovalsCount: 0,
  })

  useEffect(() => {
    if (selectedAttendee?.paymentProof) {
      let objectUrl: string
      const fetchImage = async () => {
        try {
          const response = await fetch(selectedAttendee.paymentProof!)
          if (!response.ok) {
            throw new Error("Network response was not ok")
          }
          const blob = await response.blob()
          objectUrl = URL.createObjectURL(blob)
          setImageSrc(objectUrl)
        } catch (error) {
          console.error("Failed to fetch image:", error)
          setImageSrc(null) // Or a placeholder image
        }
      }

      fetchImage()

      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl)
        }
      }
    }
  }, [selectedAttendee])

  // Manual registration form
  const [manualForm, setManualForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    ticketType: "Student Pass",
    department: "",
    designation: "",
  })

  // Invite form
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    ticketType: "Student Pass",
    designation: "",
    department: "",
  })

  // Agent form
  const [agentForm, setAgentForm] = useState({
    name: "",
    email: "",
  })

  // Check auth on mount
  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/login")
    }
  }, [user, router])

  const fetchAttendees = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getAllAttendees()
      setAttendees(res.data || res || [])
    } catch {
      setMessage({ type: "error", text: "Failed to load attendees" })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getAgents()
      setAgents(res.data || res || [])
    } catch {
      setMessage({ type: "error", text: "Failed to load agents" })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getDashboardData()
      setDashboardData(res.data || res || {})
    } catch {
      setMessage({ type: "error", text: "Failed to load dashboard data" })
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch data based on active tab
  useEffect(() => {
    fetchDashboardData()
    if (activeTab === "pending" || activeTab === "attendees") {
      fetchAttendees()
    } else if (activeTab === "agents") {
      fetchAgents()
    }
  }, [activeTab, fetchAttendees, fetchAgents, fetchDashboardData])

  async function approveAttendee(id: string, ticketType: string) {
    try {
      await adminApi.approveRegistration(id, { ticketType })
      setMessage({ type: "success", text: "Attendee approved! QR code sent via email." })
      fetchAttendees()
      setIsModalOpen(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to approve attendee"
      setMessage({ type: "error", text: errorMessage })
    }
  }

  async function declineAttendee(id: string) {
    try {
      await adminApi.declineRegistration(id)
      setMessage({ type: "success", text: "Attendee declined" })
      fetchAttendees()
    } catch {
      setMessage({ type: "error", text: "Failed to decline attendee" })
    }
  }

  async function handleConfirmAction() {
    if (!confirmState.open) return
    setConfirmLoading(true)
    try {
      if (confirmState.action === "approve") {
        // Use edited ticket type if the details modal is open for the same attendee
        const ticketType =
          isModalOpen && selectedAttendee?._id === confirmState.attendee._id ? editedTicketType : confirmState.attendee.ticketType
        await approveAttendee(confirmState.attendee._id, ticketType)
      } else {
        await declineAttendee(confirmState.attendee._id)
        // If admin declines from within the details modal, close it to avoid stale state.
        if (isModalOpen && selectedAttendee?._id === confirmState.attendee._id) {
          setIsModalOpen(false)
        }
      }
      setConfirmState({ open: false })
    } finally {
      setConfirmLoading(false)
    }
  }

  async function handleManualRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await adminApi.manualRegister(manualForm)
      setMessage({ type: "success", text: "Attendee registered! QR code sent via email." })
      setManualForm({ name: "", email: "", phoneNumber: "", ticketType: "Student Pass", department: "", designation: "" })
      setActiveTab("attendees")
      fetchAttendees()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to register attendee"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { name, email, phoneNumber, ticketType, designation } = inviteForm
    if (name && email && phoneNumber && ticketType && designation) {
      setMessage({
        type: "error",
        text: "All required fields are filled. Please use the Manual Register tab for complete registrations.",
      })
      setLoading(false)
      return
    }

    try {
      await adminApi.inviteAttendee(inviteForm)
      setMessage({ type: "success", text: "Invitation sent!" })
      setInviteForm({
        name: "",
        email: "",
        phoneNumber: "",
        ticketType: "Student Pass",
        designation: "",
        department: "",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send invitation"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  async function handleAddAgent(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await adminApi.createAgent(agentForm)
      setMessage({ type: "success", text: "Agent added! Credentials sent via email." })
      setAgentForm({ name: "", email: "" })
      fetchAgents()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add agent"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    router.push("/login")
  }

  const pendingAttendees = attendees.filter((a) => a.paymentStatus === "pending")
  const allAttendees = attendees

  const tabs = [
    { id: "pending" as TabType, label: "Pending Approvals", count: dashboardData.pendingApprovalsCount },
    { id: "attendees" as TabType, label: "All Attendees", count: dashboardData.totalAttendeesCount },
    { id: "agents" as TabType, label: "Agents", count: dashboardData.totalAgentsCount },
    { id: "manual" as TabType, label: "Manual Register" },
    { id: "invite" as TabType, label: "Invite User" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-white">
      <ConfirmDialog
        open={confirmState.open}
        title={
          confirmState.open
            ? confirmState.action === "approve"
              ? "Approve payment?"
              : "Decline payment?"
            : ""
        }
        description={
          confirmState.open ? (
            <div className="space-y-2">
              <div>
                You’re about to <span className="font-medium">{confirmState.action}</span> payment for:
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <div className="font-medium text-zinc-900">{confirmState.attendee.name}</div>
                <div className="text-zinc-600">{confirmState.attendee.email}</div>
                <div className="text-zinc-600">Ticket: {confirmState.attendee.ticketType}</div>
              </div>
              {confirmState.action === "decline" ? (
                <div className="text-sm text-zinc-600">This will mark the payment as declined.</div>
              ) : (
                <div className="text-sm text-zinc-600">This will approve the payment and send the QR code via email.</div>
              )}
            </div>
          ) : null
        }
        confirmText={confirmState.open ? (confirmState.action === "approve" ? "Approve" : "Decline") : "Confirm"}
        cancelText="Cancel"
        variant={confirmState.open && confirmState.action === "decline" ? "danger" : "default"}
        loading={confirmLoading}
        onCancel={() => (confirmLoading ? null : setConfirmState({ open: false }))}
        onConfirm={handleConfirmAction}
      />
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={48} />
            <div>
              <h1 className="text-xl font-bold text-zinc-900">Admin Dashboard</h1>
              <p className="text-xs text-zinc-500">Welcome, {user?.name || "Admin"}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Message */}
        {message && (
          <div
            className={`mb-4 rounded-lg p-4 text-sm ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-4 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Pending Approvals */}
          {activeTab === "pending" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Pending Payment Approvals</h2>
              {loading ? (
                <p className="text-zinc-500">Loading...</p>
              ) : pendingAttendees.length === 0 ? (
                <p className="text-zinc-500">No pending approvals</p>
              ) : (
                <div className="space-y-4">
                  {pendingAttendees.map((attendee) => (
                    <div key={attendee._id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-zinc-900">{attendee.name}</p>
                        <p className="text-sm text-zinc-500">{attendee.email}</p>
                        <p className="text-xs text-zinc-400">
                          {attendee.ticketType} • {attendee.department || "No department"} • {new Date(attendee.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedAttendee(attendee)
                            setEditedTicketType(attendee.ticketType)
                            setIsModalOpen(true)
                          }}
                          variant="outline"
                        >
                          View Details
                        </Button>
                        <Button
                          onClick={() => setConfirmState({ open: true, action: "decline", attendee })}
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isModalOpen && selectedAttendee && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 px-4">
              <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Attendee Details</h2>
                </div>
                <div className="space-y-4">
                  <p><strong>Name:</strong> {selectedAttendee.name}</p>
                  <p><strong>Email:</strong> {selectedAttendee.email}</p>
                  <p><strong>Phone:</strong> {selectedAttendee.phoneNumber}</p>
                  <p><strong>Designation:</strong> {selectedAttendee.designation}</p>
                  <p><strong>Department:</strong> {selectedAttendee.department || "N/A"}</p>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Ticket Type</label>
                    <select
                      value={editedTicketType}
                      onChange={(e) => setEditedTicketType(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                    >
                      <option value="Student Pass">Student Pass (₦1,000)</option>
                      <option value="Researcher Standard">Researcher Standard (₦3,000)</option>
                      <option value="Researcher Premium">Researcher Premium (₦6,000)</option>
                    </select>
                  </div>
                  {selectedAttendee.paymentProof && (
                    <div className="mt-4">
                      <p className="font-medium mb-2">Payment Receipt</p>
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt="Payment Receipt"
                          className="w-full h-auto rounded-lg border"
                        />
                      ) : (
                        <p>Loading image...</p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 justify-end pt-4 sticky bottom-0 bg-white z-10 py-2">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                      Close
                    </Button>
                    <Button
                      onClick={() => setConfirmState({ open: true, action: "approve", attendee: selectedAttendee })}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All Attendees */}
          {activeTab === "attendees" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">All Attendees</h2>
              {loading ? (
                <p className="text-zinc-500">Loading...</p>
              ) : allAttendees.length === 0 ? (
                <p className="text-zinc-500">No attendees yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-zinc-50">
                        <th className="text-left p-3">Name</th>
                        <th className="text-left p-3">Email</th>
                        <th className="text-left p-3">Ticket</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-center p-3">Checked In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAttendees.map((a) => (
                        <tr key={a._id} className="border-b hover:bg-zinc-50">
                          <td className="p-3">{a.name}</td>
                          <td className="p-3 text-zinc-500">{a.email}</td>
                          <td className="p-3 capitalize">{a.ticketType}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                a.paymentStatus === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : a.paymentStatus === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {a.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3 text-center">{a.checkInStatus === "checked-in" ? "✅" : "❌"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Agents */}
          {activeTab === "agents" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Add New Agent</h2>
                <form onSubmit={handleAddAgent} className="flex flex-col md:flex-row gap-4">
                  <input
                    type="text"
                    value={agentForm.name}
                    onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                    placeholder="Full name"
                    className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                    required
                  />
                  <input
                    type="email"
                    value={agentForm.email}
                    onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                    placeholder="Email"
                    className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                    required
                  />
                  <Button type="submit" disabled={loading}>
                    {loading ? "Adding..." : "Add Agent"}
                  </Button>
                </form>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">All Agents</h2>
                {agents.length === 0 ? (
                  <p className="text-zinc-500">No agents yet</p>
                ) : (
                  <div className="space-y-3">
                    {agents.map((agent) => (
                      <div key={agent._id} className="border rounded-lg p-4">
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-sm text-zinc-500">{agent.email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manual Register */}
          {activeTab === "manual" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Manual Registration</h2>
              <p className="text-sm text-zinc-500 mb-4">Register an attendee directly. They will receive their QR code via email.</p>
              <form onSubmit={handleManualRegister} className="space-y-4 max-w-md">
                <input
                  type="text"
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                  required
                />
                <input
                  type="email"
                  value={manualForm.email}
                  onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                  placeholder="Email"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                  required
                />
                <input
                  type="tel"
                  value={manualForm.phoneNumber}
                  onChange={(e) => setManualForm({ ...manualForm, phoneNumber: e.target.value })}
                  placeholder="Phone number"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                  required
                />
                <input
                  type="text"
                  value={manualForm.designation}
                  onChange={(e) => setManualForm({ ...manualForm, designation: e.target.value })}
                  placeholder="Designation (e.g. PhD Student, Lecturer)"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                  required
                />
                <input
                  type="text"
                  value={manualForm.department}
                  onChange={(e) => setManualForm({ ...manualForm, department: e.target.value })}
                  placeholder="Department (optional)"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                />
                <select
                  value={manualForm.ticketType}
                  onChange={(e) => setManualForm({ ...manualForm, ticketType: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                >
                  <option value="Student Pass">Student Pass (₦1,000)</option>
                  <option value="Researcher Standard">Researcher Standard (₦3,000)</option>
                  <option value="Researcher Premium">Researcher Premium (₦6,000)</option>
                </select>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Registering..." : "Register Attendee"}
                </Button>
              </form>
            </div>
          )}

          {/* Invite User */}
          {activeTab === "invite" && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Invite User</h2>
              <p className="text-sm text-zinc-500 mb-4">Send an invitation link. The user will complete their registration.</p>
              <form onSubmit={handleInvite} className="space-y-4 max-w-md">
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                />
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="Email address"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                  required
                />
                <input
                  type="tel"
                  value={inviteForm.phoneNumber}
                  onChange={(e) => setInviteForm({ ...inviteForm, phoneNumber: e.target.value })}
                  placeholder="Phone number"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                />
                <input
                  type="text"
                  value={inviteForm.designation}
                  onChange={(e) => setInviteForm({ ...inviteForm, designation: e.target.value })}
                  placeholder="Designation (e.g. PhD Student, Lecturer)"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                />
                <input
                  type="text"
                  value={inviteForm.department}
                  onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                  placeholder="Department (optional)"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                />
                <select
                  value={inviteForm.ticketType}
                  onChange={(e) => setInviteForm({ ...inviteForm, ticketType: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
                >
                  <option value="Student Pass">Student Pass (₦1,000)</option>
                  <option value="Researcher Standard">Researcher Standard (₦3,000)</option>
                  <option value="Researcher Premium">Researcher Premium (₦6,000)</option>
                </select>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Sending..." : "Send Invitation"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
