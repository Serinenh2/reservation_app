/**
 * JWT storage. This app runs on one office laptop, so localStorage is an
 * acceptable trade-off for simplicity. Tokens expire (see SIMPLE_JWT in
 * Django settings) and are cleared on logout.
 */
const ACCESS = 'auth.access'
const REFRESH = 'auth.refresh'

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS)
  },
  get refresh() {
    return localStorage.getItem(REFRESH)
  },
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS, access)
    if (refresh) localStorage.setItem(REFRESH, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS)
    localStorage.removeItem(REFRESH)
  },
}
