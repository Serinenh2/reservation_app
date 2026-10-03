/**
 * Occasions and extra services share the same API shape:
 *   kind = 'occasions' | 'services'
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useCatalog(kind, { activeOnly = false } = {}) {
  return useQuery({
    queryKey: ['catalog', kind, { activeOnly }],
    queryFn: () => api.get(`/catalog/${kind}/`, { params: activeOnly ? { active: 1 } : {} }).then((r) => r.data),
  })
}

export function useSaveCatalogItem(kind) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      (id ? api.patch(`/catalog/${kind}/${id}/`, data) : api.post(`/catalog/${kind}/`, data)).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', kind] }),
  })
}
