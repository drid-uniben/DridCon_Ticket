import { redirect } from 'next/navigation'

export default function AdminLoginRedirect() {
  // Permanently redirect to the unified login page
  redirect('/login')
}
