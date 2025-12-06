"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi, getUserData, clearAllData } from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'agent' | 'user'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
  isAgent: boolean
  isUser: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getUserData()
        if (userData) {
          const response = await authApi.getMe()
          if (response.success) {
            setUser(response.user)
          } else {
            await clearAllData()
            setUser(null)
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        await clearAllData()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const response = await authApi.login(credentials)
      if (response.success && response.user) {
        setUser(response.user)
      } else {
        throw new Error('Login failed')
      }
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isAgent: user?.role === 'agent',
    isUser: user?.role === 'user',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: 'admin' | 'agent' | 'user'
) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth()

    useEffect(() => {
      if (!loading && !user) {
        window.location.href = '/login'
      } else if (!loading && user && requiredRole && user.role !== requiredRole) {
        window.location.href = '/'
      }
    }, [user, loading])

    if (loading || !user) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )
    }

    if (requiredRole && user.role !== requiredRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600">Access Denied</p>
          </div>
        </div>
      )
    }

    return <Component {...(props as P)} />
  }
}

export default AuthContext
