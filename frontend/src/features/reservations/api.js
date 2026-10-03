/** Server data for reservations, payments, blocked dates and the calendar. */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Everything that shows reservation data must refresh after a change. */
function useInvalidateAll() {
  const queryClient = useQueryClient()
  return () =>
    ['reservations', 'calendar', 'clients'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }))
}

export function useReservations(filters, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['reservations', 'list', filters],
    queryFn: () => api.get('/reservations/', { params: filters }).then((r) => r.data),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useReservation(id) {
  return useQuery({
    queryKey: ['reservations', 'detail', String(id)],
    queryFn: () => api.get(`/reservations/${id}/`).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useSaveReservation() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      (id ? api.patch(`/reservations/${id}/`, data) : api.post('/reservations/', data)).then((r) => r.data),
    onSuccess: invalidate,
  })
}

/** action = 'cancel' | 'restore' */
export function useReservationAction(id) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (action) => api.post(`/reservations/${id}/${action}/`).then((r) => r.data),
    onSuccess: invalidate,
  })
}

/** Permanent delete (staff only). Cancel keeps the reservation in the history. */
export function useDeleteReservation(id) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: () => api.delete(`/reservations/${id}/`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['reservations', 'detail', String(id)] })
      invalidate()
    },
  })
}

export function useAddPayment(id) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (payment) => api.post(`/reservations/${id}/payments/`, payment).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useDeletePayment(id) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (paymentId) => api.delete(`/reservations/${id}/payments/${paymentId}/`).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useCalendar(start, end) {
  return useQuery({
    queryKey: ['calendar', start, end],
    queryFn: () => api.get('/calendar/', { params: { start, end } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })
}

export function useBlockedDates({ upcoming }) {
  return useQuery({
    queryKey: ['calendar', 'blocked', { upcoming }],
    queryFn: () => api.get('/blocked-dates/', { params: upcoming ? { upcoming: 1 } : {} }).then((r) => r.data),
  })
}

export function useBlockDate() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (data) => api.post('/blocked-dates/', data).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useUnblockDate() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (id) => api.delete(`/blocked-dates/${id}/`),
    onSuccess: invalidate,
  })
}
