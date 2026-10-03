/**
 * Everything the whole app needs, wrapped once around <App />.
 * Order matters: QueryClient -> Theme -> Toasts -> Auth.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { ToastProvider } from '@/components/ui'
import { AuthProvider } from '@/features/auth/AuthProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // data is "fresh" for 30s
      refetchOnWindowFocus: false,
      retry: (count, error) => count < 1 && !error?.response, // retry network errors once
    },
  },
})

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
