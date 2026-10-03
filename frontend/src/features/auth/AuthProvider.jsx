/**
 * Who is logged in? Exposes { user, login, logout, isLoading }.
 * The user is fetched with React Query from /api/auth/me/.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { tokens } from '@/lib/tokens'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  // React state (not just localStorage) so the UI re-renders on login/logout
  const [hasToken, setHasToken] = useState(() => Boolean(tokens.access))

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me/').then((r) => r.data),
    enabled: hasToken,
    retry: false,
    staleTime: Infinity,
  })

  const login = useCallback(
    async (username, password) => {
      const { data } = await api.post('/auth/token/', { username, password })
      tokens.set(data)
      setHasToken(true)
      await queryClient.fetchQuery({
        queryKey: ['me'],
        queryFn: () => api.get('/auth/me/').then((r) => r.data),
      })
    },
    [queryClient],
  )

  const logout = useCallback(() => {
    tokens.clear()
    setHasToken(false)
    queryClient.clear() // forget all cached data from this session
  }, [queryClient])

  // The API client fires this event when the session cannot be refreshed.
  useEffect(() => {
    const onExpired = () => {
      sessionStorage.setItem('auth.expired', '1')
      logout()
    }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [logout])

  const value = {
    user: hasToken ? user : null,
    isLoading: hasToken && isLoading,
    login,
    logout,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
