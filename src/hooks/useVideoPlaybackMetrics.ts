/**
 * Shared hook for tracking video playback SLO metrics.
 * Exposes a `dump()` method compatible with the Hero debug API pattern.
 * Used by HeroVideoBackground and ExecutiveRoleVideoBackground.
 */
import { useRef, useCallback } from 'react'

/** SLO budget targets for background video playback. */
export const VIDEO_PLAYBACK_SLO = {
  /** Target: first painted frame within 2 s of mount. */
  TTFF_BUDGET_MS: 2000,
  /** Target: smooth playback started within 3.5 s of mount. */
  SMOOTH_START_BUDGET_MS: 3500,
  /** Target: no more than 2 rebuffer events per session. */
  MAX_STALL_COUNT: 2,
} as const

export type PlaybackMetricEvent =
  | 'ttff'
  | 'smooth_start'
  | 'stall_start'
  | 'stall_end'
  | 'reveal'
  | 'load_start'
  | 'load_meta'
  | 'load_full'

export interface PlaybackSnapshot {
  event: PlaybackMetricEvent
  tMs: number
  extra?: Record<string, unknown>
}

/**
 * Shared hook for tracking video playback SLO metrics.
 * All timing is relative to component mount.
 */
export function useVideoPlaybackMetrics(componentId: string) {
  const mountTimeRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : 0
  )
  const ttffRef = useRef<number | null>(null)
  const smoothStartRef = useRef<number | null>(null)
  const stallCountRef = useRef<number>(0)
  const stallStartRef = useRef<number | null>(null)
  const totalStallMsRef = useRef<number>(0)
  const eventsRef = useRef<PlaybackSnapshot[]>([])

  const elapsed = () =>
    (typeof performance !== 'undefined' ? performance.now() : 0) -
    mountTimeRef.current

  const push = useCallback(
    (event: PlaybackMetricEvent, extra?: Record<string, unknown>) => {
      const tMs = elapsed()
      eventsRef.current.push({ event, tMs, extra })
      if (eventsRef.current.length > 200) {
        eventsRef.current.splice(0, eventsRef.current.length - 200)
      }
    },
    // elapsed is stable (only uses a ref); no deps needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const recordTTFF = useCallback(() => {
    if (ttffRef.current !== null) return
    ttffRef.current = elapsed()
    push('ttff', {
      ttffMs: ttffRef.current,
      sloMet: ttffRef.current <= VIDEO_PLAYBACK_SLO.TTFF_BUDGET_MS,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push])

  const recordSmoothStart = useCallback(() => {
    if (smoothStartRef.current !== null) return
    smoothStartRef.current = elapsed()
    push('smooth_start', {
      smoothStartMs: smoothStartRef.current,
      sloMet: smoothStartRef.current <= VIDEO_PLAYBACK_SLO.SMOOTH_START_BUDGET_MS,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push])

  const recordStallStart = useCallback(() => {
    if (stallStartRef.current !== null) return
    stallCountRef.current += 1
    stallStartRef.current = elapsed()
    push('stall_start', { stallCount: stallCountRef.current })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push])

  const recordStallEnd = useCallback(() => {
    if (stallStartRef.current === null) return
    const duration = elapsed() - stallStartRef.current
    totalStallMsRef.current += duration
    stallStartRef.current = null
    push('stall_end', {
      durationMs: duration,
      totalStallMs: totalStallMsRef.current,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push])

  const recordReveal = useCallback(() => {
    push('reveal', { tMs: elapsed() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push])

  const recordLoadStage = useCallback(
    (stage: 'load_start' | 'load_meta' | 'load_full') => {
      push(stage)
    },
    [push]
  )

  const dump = useCallback(
    () => ({
      component: componentId,
      generatedAt: new Date().toISOString(),
      ttffMs: ttffRef.current,
      ttffSloMet:
        ttffRef.current !== null
          ? ttffRef.current <= VIDEO_PLAYBACK_SLO.TTFF_BUDGET_MS
          : null,
      smoothStartMs: smoothStartRef.current,
      smoothStartSloMet:
        smoothStartRef.current !== null
          ? smoothStartRef.current <= VIDEO_PLAYBACK_SLO.SMOOTH_START_BUDGET_MS
          : null,
      stallCount: stallCountRef.current,
      stallCountSloMet: stallCountRef.current <= VIDEO_PLAYBACK_SLO.MAX_STALL_COUNT,
      totalStallMs: totalStallMsRef.current,
      events: eventsRef.current,
    }),
    [componentId]
  )

  return {
    recordTTFF,
    recordSmoothStart,
    recordStallStart,
    recordStallEnd,
    recordReveal,
    recordLoadStage,
    dump,
  }
}
