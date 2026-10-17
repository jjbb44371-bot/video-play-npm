import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister
} from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true
    getMe()
      .then((current) => {
        if (!active) return
        setUser(current)
        setStatus('ready')
      })
      .catch(() => {
        if (!active) return
        setStatus('ready')
      })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const current = await apiLogin(credentials)
    setUser(current)
    return current
  }, [])

  const register = useCallback(async (data) => {
    const current = await apiRegister(data)
    setUser(current)
    return current
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
