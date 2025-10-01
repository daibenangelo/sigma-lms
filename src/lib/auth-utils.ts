// Simple auth utilities for client-side session management

export function getStoredSession() {
  if (typeof window === 'undefined') return null
  
  try {
    const session = localStorage.getItem('supabase.auth.token')
    return session ? JSON.parse(session) : null
  } catch {
    return null
  }
}

export function setStoredSession(session: any) {
  if (typeof window === 'undefined') return
  
  try {
    if (session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(session))
    } else {
      localStorage.removeItem('supabase.auth.token')
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem('supabase.auth.token')
  } catch {
    // Ignore localStorage errors
  }
}
