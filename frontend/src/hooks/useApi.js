import { useState, useEffect, useCallback } from 'react'

export const globalCache = {}

/**
 * Generic data-fetching hook.
 * Usage:
 *   const { data, loading, error, refetch } = useApi(fn, [deps])
 */
export function useApi(fn, deps = [], cacheKey = null) {
  const [data, setData]       = useState(cacheKey ? (globalCache[cacheKey] || null) : null)
  const [loading, setLoading] = useState(cacheKey ? !globalCache[cacheKey] : true)
  const [error, setError]     = useState(null)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      setData(result)
      if (cacheKey) globalCache[cacheKey] = result
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { run() }, [run])

  return { data, loading, error, refetch: run }
}

/**
 * Manual trigger hook — for form submissions / button clicks.
 * Usage:
 *   const { data, loading, error, execute } = useManualApi()
 *   execute(async () => runScreener(params))
 */
export function useManualApi(cacheKey = null) {
  const [data, setData]       = useState(cacheKey ? (globalCache[cacheKey] || null) : null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const execute = useCallback(async (fn) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      setData(result)
      if (cacheKey) globalCache[cacheKey] = result
      return result
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, execute }
}
