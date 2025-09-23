import React, { createContext, useContext, useEffect, useState } from 'react'
import { ValidateSession } from '../../wailsjs/go/main/App'

interface User {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  loading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('authToken')
        const storedUser = localStorage.getItem('currentUser')

        if (storedToken && storedUser) {
          const response = await ValidateSession(storedToken)
          
          if (response.success) {
            setToken(storedToken)
            setUser(JSON.parse(storedUser))
          } else {
            localStorage.removeItem('authToken')
            localStorage.removeItem('currentUser')
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        localStorage.removeItem('authToken')
        localStorage.removeItem('currentUser')
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = (userData: User, userToken: string) => {
    setUser(userData)
    setToken(userToken)
    localStorage.setItem('authToken', userToken)
    localStorage.setItem('currentUser', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('currentUser')
  }

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!user && !!token
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}