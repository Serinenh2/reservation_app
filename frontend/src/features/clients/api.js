/** Server data for clients (React Query hooks). */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useClients({ search = '', page = 1 } = {}) {
  return useQuery({
    queryKey: ['clients', { search, page }],
    queryFn: () => api.get('/clients/', { params: { search: search || undefined, page } }).then((r) => r.data),
    placeholderData: keepPreviousData, // keep the table visible while typing
  })
}

export function useClient(id) {
  return useQuery({
    queryKey: ['clients', 'detail', String(id)],
    queryFn: () => api.get(`/clients/${id}/`).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useSaveClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      (id ? api.patch(`/clients/${id}/`, data) : api.post('/clients/', data)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['reservations'] }) // names shown in lists
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/clients/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })
}
