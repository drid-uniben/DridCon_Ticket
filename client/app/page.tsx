"use client"
import React from "react"
import { AuthProvider } from "@/context/AuthContext"
import FormPage from "@/components/form/FormPage"

export default function Home() {
  return (
    <AuthProvider>
      <FormPage />
    </AuthProvider>
  )
}
