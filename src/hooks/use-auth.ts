import { useAuth as useAuthContext } from '@/contexts/auth-context'

export function useAuth() {
  return useAuthContext()
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
