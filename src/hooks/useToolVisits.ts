import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'webtool_visit_counts'
const REMOTE_API_URL = 'https://api.example.com/tool-visits'

export interface VisitCounts {
  [toolId: string]: number
}

export interface ToolVisitData {
  toolId: string
  visits: number
}

export function useToolVisits() {
  const [localCounts, setLocalCounts] = useState<VisitCounts>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })
  const [remoteCounts, setRemoteCounts] = useState<VisitCounts | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localCounts))
  }, [localCounts])

  useEffect(() => {
    const fetchRemoteData = async () => {
      setLoading(true)
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        const response = await fetch(REMOTE_API_URL, {
          method: 'GET',
          signal: controller.signal,
        })
        clearTimeout(timeout)
        if (response.ok) {
          const data = await response.json()
          if (data && typeof data === 'object') {
            setRemoteCounts(data as VisitCounts)
          }
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }

    fetchRemoteData()
  }, [])

  const incrementVisit = useCallback((toolId: string) => {
    setLocalCounts((prev) => ({
      ...prev,
      [toolId]: (prev[toolId] || 0) + 1,
    }))
  }, [])

  const getVisitCount = useCallback((toolId: string): number => {
    if (remoteCounts && remoteCounts[toolId] !== undefined) {
      return remoteCounts[toolId]
    }
    return localCounts[toolId] || 0
  }, [remoteCounts, localCounts])

  const getHotRanking = useCallback((): ToolVisitData[] => {
    const counts: VisitCounts = remoteCounts || localCounts
    return Object.entries(counts)
      .map(([toolId, visits]) => ({ toolId, visits }))
      .sort((a, b) => b.visits - a.visits)
  }, [remoteCounts, localCounts])

  const resetAll = useCallback(() => {
    setLocalCounts({})
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    incrementVisit,
    getVisitCount,
    getHotRanking,
    loading,
    hasRemoteData: remoteCounts !== null,
    resetAll,
  }
}
