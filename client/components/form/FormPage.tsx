"use client"
import React, { useState } from "react"
import { AxiosError } from "axios"
import FormDescription, { type DescriptionSection } from "./FormDescription"
import TextField from "./TextField"
import RadioField from "./RadioField"
import FileField from "./FileField"
import FormCard from "./FormCard"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import Logo from "@/components/Logo"

export default function FormPage() {
  const { user, login } = useAuth()

  // prefill user if available (mock)
  React.useEffect(() => {
    if (!user) login({ name: "", email: "" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [ticket, setTicket] = useState("student")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const descriptionSections: DescriptionSection[] = [
    {
      heading: "Overview",
      text:
        "The Directorate of Research, Innovation and Development, UNIBEN, invites researchers, students, and innovators to a dynamic conference and innovation fair that highlights the creativity and impact of the campus community.",
    },
    {
      heading: "Why attend",
      items: [
        "Participate in keynote sessions and themed panels",
        "Connect with entrepreneurs, researchers, and global-minded peers",
        "Access certificates, digital materials, and showcase opportunities",
      ],
    },
    {
      heading: "Student Pass (₦1,000 – Early Bird)",
      items: [
        "Access to all keynote sessions, exhibitions, and panel discussions",
        "Certificate of Attendance",
        "Networking opportunities with researchers and innovators",
        "Eligibility for the Student Innovation Pitch session",
      ],
    },
    {
      heading: "Researcher Regular (₦3,000 – Early Bird)",
      items: [
        "Access to conference sessions, exhibitions, and panel discussions",
        "Certificate of Participation",
        "Access to digital conference materials and presentation slides",
        "Light refreshments",
      ],
    },
    {
      heading: "Researcher Premium (₦6,000 – Early Bird)",
      items: [
        "All Regular benefits, plus VIP seating at keynotes and panels",
        "Premium conference package with branded keepsakes and refreshments",
        "Recognition in the official conference brochure as a Premium Delegate",
        "Lunch included",
      ],
    },
    {
      heading: "Payment Details",
      items: [
        "Bank Name: UNIBEN MFB",
        "Account Number: 1100097619",
        "Account Name: RESEARCH INNOVATION AND DEVELOPMENT FAIR",
      ],
    },
    {
      heading: "Registration Process",
      items: [
        "Upload your transfer receipt using the provided form or payment link",
        "Once payment is confirmed, a registration link will be emailed to you",
      ],
    },
    {
      heading: "More info",
      text: "Visit https://sites.google.com/uniben.edu/dridrecon for background, session details, and speaker line-ups.",
    },
  ]

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const form = new FormData()
      form.append("name", name)
      form.append("email", email)
      form.append("phone", phone)
      form.append("ticket", ticket)
      if (file) form.append("receipt", file)

      // Example endpoint - replace with actual server route
      await api.post("/forms/submit", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      setMessage("Submitted successfully. Check your email for confirmation.")
      setName("")
      setEmail("")
      setPhone("")
      setTicket("student")
      setFile(null)
    } catch (err) {
      let errorMessage = "Submission failed. Try again."

      if (err instanceof AxiosError) {
        errorMessage = err.response?.data?.message ?? errorMessage
      } else if (err instanceof Error) {
        errorMessage = err.message
      }

      setMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-purple-100 to-white py-10 px-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex items-center gap-4">
          <Logo size={80} />
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Research, Innovation, and Enterprise</h1>
            <p className="text-sm text-zinc-600">Positioning UNIBEN for National Development and Global Relevance</p>
          </div>
        </header>

        <FormDescription title="About the event" sections={descriptionSections} previewSections={1} />

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormCard heading="Contact information" description="Tell us how to reach you.">
            <div className="space-y-4">
              <TextField label="Name" name="name" value={name} onChange={setName} required placeholder="Full name" />
              <TextField label="Email" name="email" value={email} onChange={setEmail} required placeholder="you@example.com" />
              <TextField label="Phone Number" name="phone" value={phone} onChange={setPhone} required placeholder="080********" />
            </div>
          </FormCard>

          <FormCard heading="Preferred ticket" description="Choose the best experience for you.">
            <RadioField
              label=""
              name="ticket"
              value={ticket}
              onChange={setTicket}
              options={[
                { label: "Student Pass (₦1,000)", value: "student" },
                { label: "Researcher Standard (₦3,000)", value: "standard" },
                { label: "Researcher Premium (₦6,000)", value: "premium" },
              ]}
            />
          </FormCard>

          <FormCard heading="Upload payment receipt" description="Drag & drop or click to browse.">
            <FileField label="" name="receipt" onChange={setFile} />
            {file && <p className="mt-3 text-sm text-purple-700">Selected file: {file.name}</p>}
            <div className="mt-4 space-y-1 rounded-2xl bg-purple-50/80 p-4 text-sm text-zinc-600">
              <p className="text-xs uppercase tracking-wide text-purple-600">Payment information</p>
              <p>Bank Name: UNIBEN MFB</p>
              <p>Account Number: 1100097619</p>
              <p>Account Name: RESEARCH INNOVATION AND DEVELOPMENT FAIR</p>
            </div>
          </FormCard>

          <FormCard>
            {message && <p className="mb-4 text-sm text-zinc-700">{message}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Submitting…" : "Submit"}
            </Button>
          </FormCard>
        </form>
      </div>
    </div>
  )
}
