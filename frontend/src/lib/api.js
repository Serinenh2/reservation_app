/**
 * One Axios instance for the whole app.
 *  - adds the JWT access token to every request
 *  - sends the current language (Django answers in fr/ar)
 *  - when the access token expires (401), gets a new one with the refresh
 *    token ONCE, then replays the request. If that fails -> logout.
 */
import axios from 'axios'
import i18n from '@/i18n'
import { tokens } from './tokens'

export const api = axios.create({ baseURL: '/api', timeout: 20000 })

api.interceptors.request.use((config) => {
  const access = tokens.access
  if (access) config.headers.Authorization = `Bearer ${access}`
  config.headers['Accept-Language'] = i18n.language
  return config
})

let refreshing = null // shared promise so parallel 401s refresh only once

async function refreshAccessToken() {
  const refresh = tokens.refresh
  if (!refresh) throw new Error('no refresh token')
  // plain axios: must NOT go through the interceptors above
  const { data } = await axios.post('/api/auth/token/refresh/', { refresh })
  tokens.set(data)
  return data.access
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthCall = original?.url?.startsWith('/auth/token')
    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true
      try {
        refreshing = refreshing || refreshAccessToken()
        const access = await refreshing
        original.headers.Authorization = `Bearer ${access}`
        return api(original)
      } catch {
        tokens.clear()
        window.dispatchEvent(new Event('auth:expired'))
      } finally {
        refreshing = null
      }
    }
    return Promise.reject(error)
  },
)

/**
 * Turn an Axios error into a translation key the UI can show.
 * Field errors (400) are returned separately so forms can highlight fields.
 */
export function describeError(error) {
  if (!error?.response) return { messageKey: 'errors.network', fieldErrors: {} }
  const { status, data } = error.response
  if (status === 403) return { messageKey: 'errors.forbidden', fieldErrors: {} }
  if (status === 409) return { messageKey: `errors.codes.${data?.code || 'conflict'}`, fieldErrors: {} }
  if (status === 400 && data && typeof data === 'object') {
    return { messageKey: 'errors.validation', fieldErrors: data }
  }
  return { messageKey: 'errors.generic', fieldErrors: {} }
}

/**
 * Django returns error codes like {"event_date": ["date_blocked"]}.
 * Returns the translated message for one field, or undefined.
 * Unknown codes fall back to a generic "invalid value" text.
 */
export function fieldError(t, fieldErrors, key, fallbackKey = key.includes('email') ? 'errors.invalidEmail' : 'errors.invalidValue') {
  const value = fieldErrors?.[key]
  if (!value) return undefined
  const code = String(Array.isArray(value) ? value[0] : value)
  return t(`errors.codes.${code}`, { defaultValue: t(fallbackKey) })
}
