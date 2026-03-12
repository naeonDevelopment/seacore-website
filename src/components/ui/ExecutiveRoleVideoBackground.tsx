import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { getAssetPath } from '@/utils/assetPath'
import {
  hasSufficientBuffer,
  awaitFirstPaintedFrame,
  awaitPlaybackStability,
  isConstrainedConnection,
  getConnectionHints,
  MIN_BUFFER_SECONDS,
} from '@/utils/videoReadiness'
import { useVideoPlaybackMetrics } from '@/hooks/useVideoPlaybackMetrics'

interface ExecutiveRoleVideoBackgroundProps {
  isDarkMode?: boolean
  className?: string
}

/**
 * Three-stage loading lifecycle for offscreen section video:
 *   idle     → component mounted, no media fetched, gradient visible
 *   metadata → near viewport (≥350 px away), fetch metadata only
 *   full     → in viewport, fetch full + play + gate reveal
 */
type LoadStage = 'idle' | 'metadata' | 'full'

const ExecutiveRoleVideoBackground: React.FC<ExecutiveRoleVideoBackgroundProps> = ({
  isDarkMode = false,
  className = '',
}) => {
  // ── Video crossfade state ────────────────────────────────────────────────
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A')
  const [isAVisible, setIsAVisible] = useState(true)
  const [isBVisible, setIsBVisible] = useState(false)

  // ── Reveal state — gradient shows until readiness gate passes ────────────
  const [isRevealed, setIsRevealed] = useState(false)

  // ── Refs: video elements ─────────────────────────────────────────────────
  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Refs: sync state for async callbacks ─────────────────────────────────
  const activePlayerRef = useRef<'A' | 'B'>('A')
  const isRevealedRef = useRef(false)
  const loadStageRef = useRef<LoadStage>('idle')
  const isTransitioningRef = useRef(false)
  const scheduledOverlapRef = useRef(false)
  const hasPlayStartedRef = useRef(false)
  const videoAIndexRef = useRef<number>(0)
  const videoBIndexRef = useRef<number>(-1)

  // Keep activePlayerRef in sync
  useEffect(() => {
    activePlayerRef.current = activePlayer
  }, [activePlayer])

  // ── Crossfade constants ───────────────────────────────────────────────────
  const OVERLAP_SECONDS = 1.5
  const FADE_DURATION_MS = 1500

  // ── Video sources — adaptive by connection quality ──────────────────────
  //
  // High renditions (≥4G / unknown): full-quality files
  // Medium rendition (3G): use the pre-existing compressed vid_section_experts_1.mp4
  //   (1.5 MB vs 9.4 MB) for the first video; second video degrades gracefully.
  //
  // On constrained connections (2G / save-data): no video at all (gradient only).
  const videoSources = useMemo(() => {
    const { effectiveType } = getConnectionHints()
    const isMedium = effectiveType === '3g'
    return [
      getAssetPath(
        isMedium
          ? 'assets/section_experts/vid_section_experts_1.mp4'  // 1.5 MB compressed
          : 'assets/section_experts/vid_section_experts1.mp4'   // 9.4 MB full-quality
      ),
      getAssetPath('assets/section_experts/vid_section_experts_2.mp4'),
    ]
  }, [])

  // ── Poster: first-frame image for intentional freeze-frame ──────────────
  // Generated via: bash scripts/video/encode_renditions.sh
  // If the file does not exist, the gradient serves as the freeze-frame.
  const posterSrc = useMemo(
    () => getAssetPath('assets/section_experts/vid_section_experts1-firstframe.jpg'),
    []
  )

  // ── Metrics ───────────────────────────────────────────────────────────────
  // All callbacks returned by the hook are stable (useCallback with empty/stable deps
  // inside the hook). Destructure to stable references so dep arrays don't churn.
  const {
    recordTTFF,
    recordSmoothStart,
    recordStallStart,
    recordStallEnd,
    recordReveal,
    recordLoadStage,
    dump,
  } = useVideoPlaybackMetrics('ExecutiveRoleVideo')

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getActiveVideo = useCallback((): HTMLVideoElement | null => {
    return activePlayerRef.current === 'A' ? videoARef.current : videoBRef.current
  }, [])

  const getActiveIndexRef = useCallback(() => {
    return activePlayerRef.current === 'A' ? videoAIndexRef : videoBIndexRef
  }, [])

  const getInactiveVideoRef = useCallback(() => {
    return activePlayerRef.current === 'A' ? videoBRef : videoARef
  }, [])

  const getInactiveIndexRef = useCallback(() => {
    return activePlayerRef.current === 'A' ? videoBIndexRef : videoAIndexRef
  }, [])

  const getNextIndex = useCallback((fromIndex: number) => {
    return (fromIndex + 1) % videoSources.length
  }, [videoSources.length])

  // ── Initial reveal gate ───────────────────────────────────────────────────
  /**
   * Gates the gradient→video reveal on:
   *   1. First painted frame (TTFF)
   *   2. Short stability window without `waiting`
   * Always resolves — worst case after timeouts, to prevent indefinite freeze.
   */
  const attemptReveal = useCallback(async (video: HTMLVideoElement) => {
    if (isRevealedRef.current) return

    // 1. Await first painted frame for TTFF metric
    try {
      await awaitFirstPaintedFrame(video, 1500)
      recordTTFF()
    } catch {
      // Timeout — proceed to avoid indefinite static background
    }

    // 2. Stability window
    if (isRevealedRef.current) return
    const { stable } = await awaitPlaybackStability(video, 300)

    if (!isRevealedRef.current) {
      isRevealedRef.current = true
      setIsRevealed(true)
      recordReveal()
      if (stable) recordSmoothStart()
    }
  }, [recordTTFF, recordReveal, recordSmoothStart])

  // ── Stall tracking ────────────────────────────────────────────────────────
  useEffect(() => {
    const videoA = videoARef.current
    const videoB = videoBRef.current
    if (!videoA || !videoB) return

    const attach = (video: HTMLVideoElement) => {
      const onWaiting = () => recordStallStart()
      const onPlaying = () => recordStallEnd()
      video.addEventListener('waiting', onWaiting)
      video.addEventListener('playing', onPlaying)
      return () => {
        video.removeEventListener('waiting', onWaiting)
        video.removeEventListener('playing', onPlaying)
      }
    }

    const cleanA = attach(videoA)
    const cleanB = attach(videoB)
    return () => {
      cleanA()
      cleanB()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Expose debug API ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    ;(window as any).__executiveVideoDebug = {
      dump,
      stage: () => loadStageRef.current,
      revealed: () => isRevealedRef.current,
    }
  }, [dump])

  // ── Crossfade: time-update handler ────────────────────────────────────────
  const handleTimeUpdate = (player: 'A' | 'B') => {
    if (!isRevealedRef.current) return // no crossfade before initial reveal
    if (isTransitioningRef.current || player !== activePlayerRef.current) return

    const activeVideo = getActiveVideo()
    const activeIdxRef = getActiveIndexRef()

    if (!activeVideo || !activeVideo.duration) return
    if (activeIdxRef.current !== currentVideoIndex) return

    const timeRemaining = activeVideo.duration - activeVideo.currentTime
    if (timeRemaining > OVERLAP_SECONDS) return
    if (scheduledOverlapRef.current) return

    scheduledOverlapRef.current = true
    isTransitioningRef.current = true

    const nextIndex = getNextIndex(currentVideoIndex)
    const inactiveVideoRef = getInactiveVideoRef()
    const inactiveIdxRef = getInactiveIndexRef()

    const startCrossfade = async () => {
      const outgoingVideo = activeVideo

      // Start incoming video
      if (inactiveVideoRef.current) {
        const v = inactiveVideoRef.current
        if (v.paused && v.currentTime < 0.1) {
          v.currentTime = 0
          try {
            await v.play()
          } catch (err) {
            if ((err as DOMException)?.name === 'AbortError') {
              setTimeout(() => {
                if (!v.paused) return
                v.play().catch(() => {})
              }, 150)
            } else {
              console.error('Executive crossfade play error:', err)
            }
          }
        }
      }

      const incomingVideo = inactiveVideoRef.current
      if (!incomingVideo) {
        isTransitioningRef.current = false
        scheduledOverlapRef.current = false
        return
      }

      // Buffer gate — abort crossfade rather than show stutter
      if (incomingVideo.paused || !hasSufficientBuffer(incomingVideo, MIN_BUFFER_SECONDS)) {
        console.warn('Executive: incoming video not ready for crossfade — aborting')
        isTransitioningRef.current = false
        scheduledOverlapRef.current = false
        return
      }

      // First-frame gate
      try {
        await awaitFirstPaintedFrame(incomingVideo, 1200)
      } catch {
        // Timeout — allow crossfade with whatever frame is available
      }

      // Make incoming layer visible before opacity change to prevent flash
      if (inactiveVideoRef === videoBRef) {
        setIsBVisible(true)
      } else {
        setIsAVisible(true)
      }

      setActivePlayer(prev => {
        const next = prev === 'A' ? 'B' : 'A'
        activePlayerRef.current = next
        return next
      })

      setTimeout(() => {
        if (outgoingVideo && !outgoingVideo.paused) outgoingVideo.pause()
        setCurrentVideoIndex(nextIndex)

        if (inactiveVideoRef === videoBRef) {
          setIsAVisible(false)
        } else {
          setIsBVisible(false)
        }

        isTransitioningRef.current = false
        scheduledOverlapRef.current = false
      }, FADE_DURATION_MS)
    }

    const ensureReadyThenStart = () => {
      if (!inactiveVideoRef.current) {
        isTransitioningRef.current = false
        scheduledOverlapRef.current = false
        return
      }
      if (inactiveVideoRef.current.readyState >= 3) {
        void startCrossfade()
      } else {
        const onReady = () => void startCrossfade()
        inactiveVideoRef.current.addEventListener('canplaythrough', onReady, { once: true })
        // Force crossfade after 2.5s regardless to prevent getting stuck
        setTimeout(() => {
          inactiveVideoRef.current?.removeEventListener('canplaythrough', onReady)
          if (isTransitioningRef.current) void startCrossfade()
        }, 2500)
      }
    }

    if (inactiveVideoRef.current) {
      if (inactiveIdxRef.current !== nextIndex) {
        inactiveIdxRef.current = nextIndex
        inactiveVideoRef.current.src = videoSources[nextIndex]
        inactiveVideoRef.current.preload = 'auto'
        inactiveVideoRef.current.load()
      }
      ensureReadyThenStart()
    } else {
      isTransitioningRef.current = false
      scheduledOverlapRef.current = false
    }
  }

  const handleVideoEnd = (player: 'A' | 'B') => {
    if (player === activePlayerRef.current && !isTransitioningRef.current) {
      isTransitioningRef.current = false
      scheduledOverlapRef.current = false
    }
  }

  // ── Preload next video during active playback ──────────────────────────────
  useEffect(() => {
    const activeVideo = getActiveVideo()
    if (!activeVideo || !activeVideo.duration) return
    if (isTransitioningRef.current) return

    const preloadNext = () => {
      const timeRemaining = activeVideo.duration - activeVideo.currentTime
      if (timeRemaining <= 3.0 && timeRemaining > 2.6) {
        const nextIndex = getNextIndex(currentVideoIndex)
        const inactiveVideoRef = getInactiveVideoRef()
        const inactiveIdxRef = getInactiveIndexRef()
        if (inactiveVideoRef.current && inactiveIdxRef.current !== nextIndex) {
          inactiveIdxRef.current = nextIndex
          inactiveVideoRef.current.src = videoSources[nextIndex]
          inactiveVideoRef.current.preload = 'auto'
          inactiveVideoRef.current.load()
        }
      }
    }

    const interval = setInterval(preloadNext, 150)
    return () => clearInterval(interval)
  }, [currentVideoIndex, videoSources, getActiveVideo, getInactiveVideoRef, getInactiveIndexRef, getNextIndex])

  // ── Stage 1: Near-viewport observer — metadata warmup ─────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    const nearObserver = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (loadStageRef.current !== 'idle') return

        loadStageRef.current = 'metadata'
        recordLoadStage('load_meta')

        const videoA = videoARef.current
        if (!videoA) return

        videoAIndexRef.current = 0
        videoA.src = videoSources[0]
        videoA.preload = 'metadata'
        videoA.load()

        // Only needed once
        nearObserver.disconnect()
      },
      { rootMargin: '350px 0px', threshold: 0 }
    )

    if (containerRef.current) nearObserver.observe(containerRef.current)
    return () => nearObserver.disconnect()
  }, [videoSources, recordLoadStage])

  // ── Stage 2: In-viewport observer — full load + play + reveal gate ─────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    const inViewObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return

        if (!entry.isIntersecting) {
          // Pause all when scrolled out of view
          videoARef.current?.pause()
          videoBRef.current?.pause()
          return
        }

        // ── Skip on constrained connections (save-data / 2G) ────────────────
        if (isConstrainedConnection()) return

        const videoA = videoARef.current
        if (!videoA) return

        // ── Upgrade from metadata to full if needed ──────────────────────────
        if (loadStageRef.current === 'idle' || loadStageRef.current === 'metadata') {
          const previousStage = loadStageRef.current

          // If still idle (near observer hadn't fired), assign src first
          if (previousStage === 'idle') {
            videoAIndexRef.current = 0
            videoA.src = videoSources[0]
          }

          loadStageRef.current = 'full'
          recordLoadStage('load_full')
          videoA.preload = 'auto'

          // Call load() only when upgrading from idle.
          // When upgrading from metadata, the browser is already fetching —
          // play() will seamlessly continue buffering without an explicit load().
          if (previousStage === 'idle') {
            videoA.load()
          }
        }

        // ── Initial play attempt ─────────────────────────────────────────────
        if (!hasPlayStartedRef.current && !isRevealedRef.current) {
          hasPlayStartedRef.current = true

          const tryPlay = async () => {
            try {
              await videoA.play()
              await attemptReveal(videoA)
            } catch (err) {
              if ((err as DOMException)?.name === 'AbortError') {
                // Transient abort — retry shortly
                setTimeout(() => {
                  if (isRevealedRef.current) return
                  videoA.play()
                    .then(() => attemptReveal(videoA))
                    .catch(() => {})
                }, 250)
              } else {
                console.error('Executive: initial play error', err)
              }
            }
          }

          // Wait for enough data before calling play().
          // Guard with `tryPlayScheduled` to prevent both canplaythrough and
          // loadeddata (which fires earlier) from each calling tryPlay().
          if (videoA.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            void tryPlay()
          } else {
            let tryPlayScheduled = false
            const onCanPlay = () => {
              if (tryPlayScheduled) return
              tryPlayScheduled = true
              void tryPlay()
            }
            videoA.addEventListener('canplaythrough', onCanPlay, { once: true })
            videoA.addEventListener('loadeddata', onCanPlay, { once: true })
          }

          return
        }

        // ── Resume if returning to view after first reveal ───────────────────
        if (isRevealedRef.current) {
          const activeVideo = getActiveVideo()
          if (activeVideo?.paused && !isTransitioningRef.current && !scheduledOverlapRef.current) {
            activeVideo.play().catch((err) => {
              if ((err as DOMException)?.name !== 'AbortError') {
                console.error('Executive: resume error', err)
              }
            })
          }
        }
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) inViewObserver.observe(containerRef.current)
    return () => inViewObserver.disconnect()
  }, [videoSources, attemptReveal, recordLoadStage, getActiveVideo])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden z-10 ${className}`}>

      {/*
        Intentional freeze-frame layer.
        Shows the gradient AND the first-frame poster (when generated) until isRevealed.
        The poster image matches the video's first frame, preventing any visual pop
        when the video layer dissolves in.
      */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-900 dark:to-emerald-950/30 z-0" />
      {/* First-frame poster — only shown until video is revealed */}
      {!isRevealed && (
        <img
          src={posterSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center z-1 opacity-0"
          // Opacity-0 visually hides the img but keeps it in DOM so the browser
          // caches it for future sessions. Remove this once poster is confirmed generated.
          onLoad={(e) => {
            // Once loaded, reveal the poster as actual freeze-frame
            ;(e.currentTarget as HTMLImageElement).style.opacity = '1'
          }}
          onError={(e) => {
            // Poster not yet generated — silently hide; gradient is the freeze-frame
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      )}

      {/*
        Video layer: fades in from opacity 0 when readiness gate passes.
        Inner crossfade between A/B operates independently once revealed.
      */}
      <motion.div
        className="absolute inset-0 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: isRevealed ? 1 : 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Video A */}
        <motion.video
          ref={videoARef}
          className="absolute inset-0 w-full h-full"
          muted
          playsInline
          preload="none"
          onTimeUpdate={() => handleTimeUpdate('A')}
          onEnded={() => handleVideoEnd('A')}
          onError={() => console.error('Executive Video A error:', videoARef.current?.error)}
          initial={{ opacity: activePlayer === 'A' ? 1 : 0 }}
          animate={{ opacity: activePlayer === 'A' ? 1 : 0 }}
          transition={{ duration: OVERLAP_SECONDS, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            pointerEvents: activePlayer === 'A' ? 'auto' : 'none',
            zIndex: activePlayer === 'A' ? 20 : 10,
            visibility: isAVisible ? 'visible' : 'hidden',
          }}
        />

        {/* Video B */}
        <motion.video
          ref={videoBRef}
          className="absolute inset-0 w-full h-full"
          muted
          playsInline
          preload="none"
          onTimeUpdate={() => handleTimeUpdate('B')}
          onEnded={() => handleVideoEnd('B')}
          onError={() => console.error('Executive Video B error:', videoBRef.current?.error)}
          initial={{ opacity: 0 }}
          animate={{ opacity: activePlayer === 'B' ? 1 : 0 }}
          transition={{ duration: OVERLAP_SECONDS, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            pointerEvents: activePlayer === 'B' ? 'auto' : 'none',
            zIndex: activePlayer === 'B' ? 20 : 10,
            visibility: isBVisible ? 'visible' : 'hidden',
          }}
        />
      </motion.div>

      {/* Theme overlays */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-500 z-20 ${
          isDarkMode
            ? 'bg-gradient-to-tl from-slate-900/70 via-emerald-900/20 to-transparent'
            : 'bg-gradient-to-tl from-white/70 via-emerald-50/40 to-transparent'
        }`}
      />
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-500 z-30 ${
          isDarkMode ? 'bg-emerald-900/15' : 'bg-emerald-50/20'
        }`}
      />
    </div>
  )
}

export { ExecutiveRoleVideoBackground }
