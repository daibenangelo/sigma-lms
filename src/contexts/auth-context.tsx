'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔐 AuthProvider: Initializing auth state')

    // Get initial session
    const initializeAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('❌ AuthProvider: Session error:', error)
      } else {
        console.log('✅ AuthProvider: Initial session:', session?.user?.email || 'No user')
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 AuthProvider: Auth state change:', event, session?.user?.email || 'No user')
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      console.log('🧹 AuthProvider: Cleaning up subscription')
      subscription.unsubscribe()
    }
  }, []) // Remove user dependency to prevent loop

  const signOut = async () => {
    console.log('🚪 AuthProvider: Signing out')
    await supabase.auth.signOut()
  }

  const refreshAuth = async () => {
    console.log('🔄 AuthProvider: Force refreshing auth state')
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('❌ AuthProvider: Refresh error:', error)
    } else {
      console.log('✅ AuthProvider: Refresh result:', session?.user?.email || 'No user')
    }
    setSession(session)
    setUser(session?.user ?? null)
    setLoading(false)
  }

  const value = {
    user,
    session,
    loading,
    signOut,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}