import { useAuth } from '@/contexts/auth-context'

export function useAuth() {
  return useAuth()
}

// Additional auth-related hooks can be added here
export function useRequireAuth() {
  const { user, loading } = useAuth()
  
  return {
    user,
    loading,
    isAuthenticated: !!user,
    isUnauthenticated: !loading && !user,
  }
}
