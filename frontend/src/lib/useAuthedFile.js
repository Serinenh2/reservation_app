import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

/**
 * Private files need the login token, so <img src="/api/..."> can't load them.
 * This downloads the file with the token and returns a temporary local URL.
 * `version` (e.g. updated_at) reloads it after a change.
 *
 * The previous local URL is released only once the new one is shown, so an
 * <img> never points to a released URL while the new file downloads.
 */
export function useAuthedFile(path, version) {
  const [url, setUrl] = useState(null)
  const current = useRef(null)

  const replace = (next) => {
    const previous = current.current
    current.current = next
    setUrl(next)
    if (previous) setTimeout(() => URL.revokeObjectURL(previous), 1000)
  }

  useEffect(() => {
    if (!path) {
      replace(null)
      return undefined
    }
    let cancelled = false
    api
      .get(path, { responseType: 'blob' })
      .then((r) => !cancelled && replace(URL.createObjectURL(r.data)))
      .catch(() => !cancelled && replace(null))
    return () => {
      cancelled = true
    }
  }, [path, version]) // eslint-disable-line react-hooks/exhaustive-deps

  // Release the last one when the component goes away.
  useEffect(() => () => current.current && URL.revokeObjectURL(current.current), [])
  return url
}
