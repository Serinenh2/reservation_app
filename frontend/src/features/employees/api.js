/** Server data for employees and their absences (administrators only). */
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useEmployees({ status, month }) {
  return useQuery({
    queryKey: ['employees', 'list', { status, month }],
    queryFn: () => api.get('/employees/', { params: { status, month } }).then((r) => r.data),
  })
}

export function useEmployee(id) {
  return useQuery({
    queryKey: ['employees', 'detail', String(id)],
    queryFn: () => api.get(`/employees/${id}/`).then((r) => r.data),
    enabled: Boolean(id),
  })
}

/** Create or update. Sent as multipart so photo / ID document files can go with it. */
export function useSaveEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...fields }) => {
      const form = new FormData()
      Object.entries(fields).forEach(([key, value]) => {
        if (value === undefined) return
        form.append(key, value === null ? '' : value)
      })
      return (id ? api.patch(`/employees/${id}/`, form) : api.post('/employees/', form)).then((r) => r.data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  })
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/employees/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  })
}

/** kind = 'photo' | 'id-document' */
export function useDeleteEmployeeFile(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (kind) => api.delete(`/employees/${id}/${kind}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  })
}

export function useAbsences(id, month) {
  return useQuery({
    queryKey: ['employees', 'absences', String(id), month],
    queryFn: () => api.get(`/employees/${id}/absences/`, { params: { month } }).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useAddAbsence(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (absence) => api.post(`/employees/${id}/absences/`, absence).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  })
}

export function useDeleteAbsence(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (absenceId) => api.delete(`/employees/${id}/absences/${absenceId}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  })
}

/**
 * Private files need the login token, so <img src="/api/..."> can't load them.
 * This downloads the file with the token and returns a temporary local URL.
 * `version` (e.g. updated_at) reloads it after a change.
 */
export function useAuthedFile(path, version) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!path) {
      setUrl(null)
      return undefined
    }
    let objectUrl
    let cancelled = false
    api
      .get(path, { responseType: 'blob' })
      .then((r) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(r.data)
        setUrl(objectUrl)
      })
      .catch(() => !cancelled && setUrl(null))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path, version])
  return url
}
