import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { getAssetPath } from '@/utils/assetPath'

interface HeroVideoBackgroundProps {
  isDarkMode?: boolean
  className?: string
}

const HeroVideoBackground: React.FC<HeroVideoBackgroundProps> = ({ 
  isDarkMode = false, 
  className = '' 
}) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A')
  
  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isTransitioningRef = useRef(false)
  const videoAIndexRef = useRef<number>(0)
  const videoBIndexRef = useRef<number>(-1)
  const hasInitialPlayStartedRef = useRef(false)
  const mountPerfNowRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0)

  const videoSources = useMemo(() => [
    getAssetPath('assets/hero/h_h_1.mp4'),
    getAssetPath('assets/hero/h_h_2.mp4'),
    getAssetPath('assets/hero/h_h_3.mp4')
  ], [])

  // Phase 3 (Option A): poster is the *first frame* of h_h_1.mp4 for best perceived load.
  const posterSrc = useMemo(() => getAssetPath('assets/hero/h_h_1-firstframe.jpg'), [])

  const getDebugEnabled = () => {
    if (typeof window === 'undefined') return false
    try {
      const qs = new URLSearchParams(window.location.search)
      return qs.has('debugHeroVideo') || (window as any).__DEBUG_HERO_VIDEO === true
    } catch {
      return (window as any).__DEBUG_HERO_VIDEO === true
    }
  }

  const debugEnabledRef = useRef<boolean>(getDebugEnabled())

  const log = (message: string, ...args: unknown[]) => {
    if (!debugEnabledRef.current) return
    console.log(`HeroVideoBackground: ${message}`, ...args)
  }

  const logWarn = (message: string, ...args: unknown[]) => {
    if (!debugEnabledRef.current) return
    console.warn(`HeroVideoBackground: ${message}`, ...args)
  }

  const logError = (message: string, ...args: unknown[]) => {
    // Errors are always logged in production (needed for Phase 0 triage).
    console.error(`HeroVideoBackground: ${message}`, ...args)
  }

  type BufferedRange = { start: number; end: number }
  type VideoSnapshot = {
    readyState: number
    networkState: number
    paused: boolean
    ended: boolean
    muted: boolean
    currentTime: number
    duration: number | null
    playbackRate: number
    buffered: BufferedRange[]
    src: string
    currentSrc: string
    error: { code: number; message?: string } | null
  }

  type DebugEvent = {
    tMs: number
    player: 'A' | 'B' | 'system'
    type: string
    currentIndex: number
    activePlayer: 'A' | 'B'
    snapshot?: VideoSnapshot
    extra?: Record<string, unknown>
  }

  const debugEventsRef = useRef<DebugEvent[]>([])
  const ttffMsRef = useRef<number | null>(null) // time-to-first-frame
  const tPlayMsRef = useRef<number | null>(null) // time-to-playing

  const getBufferedRanges = (video: HTMLVideoElement): BufferedRange[] => {
    const ranges: BufferedRange[] = []
    try {
      for (let i = 0; i < video.buffered.length; i += 1) {
        ranges.push({ start: video.buffered.start(i), end: video.buffered.end(i) })
      }
    } catch {
      // ignore
    }
    return ranges
  }

  const snapshotVideo = (video: HTMLVideoElement): VideoSnapshot => {
    const err = video.error
    return {
      readyState: video.readyState,
      networkState: video.networkState,
      paused: video.paused,
      ended: video.ended,
      muted: video.muted,
      currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
      duration: Number.isFinite(video.duration) ? video.duration : null,
      playbackRate: video.playbackRate,
      buffered: getBufferedRanges(video),
      src: video.getAttribute('src') || '',
      currentSrc: video.currentSrc || '',
      error: err ? { code: err.code, message: (err as any).message } : null
    }
  }

  const pushDebugEvent = (event: Omit<DebugEvent, 'tMs' | 'currentIndex' | 'activePlayer'>) => {
    const tMs = (typeof performance !== 'undefined' ? performance.now() : 0) - mountPerfNowRef.current
    debugEventsRef.current.push({
      tMs,
      currentIndex: currentVideoIndex,
      activePlayer,
      ...event
    })
    // Cap memory
    if (debugEventsRef.current.length > 300) {
      debugEventsRef.current.splice(0, debugEventsRef.current.length - 300)
    }
  }

  const emitSystemInfo = () => {
    if (typeof window === 'undefined') return
    const navAny = navigator as any
    const connection = navAny.connection || navAny.mozConnection || navAny.webkitConnection
    pushDebugEvent({
      player: 'system',
      type: 'system_info',
      extra: {
        ua: navigator.userAgent,
        platform: (navigator as any).platform,
        language: navigator.language,
        saveData: Boolean(connection?.saveData),
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt
      }
    })
  }

  const emitResourceTiming = (src: string, label: string) => {
    if (typeof performance === 'undefined') return
    try {
      const entries = performance.getEntriesByName(src)
      if (!entries || entries.length === 0) return
      const last = entries[entries.length - 1] as PerformanceResourceTiming
      pushDebugEvent({
        player: 'system',
        type: 'resource_timing',
        extra: {
          label,
          name: last.name,
          initiatorType: (last as any).initiatorType,
          transferSize: (last as any).transferSize,
          encodedBodySize: (last as any).encodedBodySize,
          decodedBodySize: (last as any).decodedBodySize,
          duration: last.duration,
          startTime: last.startTime,
          responseStart: (last as any).responseStart,
          responseEnd: (last as any).responseEnd
        }
      })
    } catch {
      // ignore
    }
  }

  const installDebugApi = () => {
    if (typeof window === 'undefined') return
    ;(window as any).__heroVideoDebug = {
      get enabled() {
        return debugEnabledRef.current
      },
      set enabled(v: boolean) {
        debugEnabledRef.current = Boolean(v)
      },
      dump: () => {
        const report = {
          generatedAtIso: new Date().toISOString(),
          ttffMs: ttffMsRef.current,
          timeToPlayingMs: tPlayMsRef.current,
          currentVideoIndex,
          activePlayer,
          events: debugEventsRef.current
        }
        console.log('Hero video debug report:', report)
        return report
      },
      clear: () => {
        debugEventsRef.current = []
        ttffMsRef.current = null
        tPlayMsRef.current = null
        console.log('Hero video debug report cleared.')
      }
    }
  }

  const getInactiveVideo = () => {
    return activePlayer === 'A' ? videoBRef : videoARef
  }

  const getInactiveIndexRef = () => {
    return activePlayer === 'A' ? videoBIndexRef : videoAIndexRef
  }

  const getActiveVideo = () => {
    return activePlayer === 'A' ? videoARef.current : videoBRef.current
  }

  const getActiveIndexRef = () => {
    return activePlayer === 'A' ? videoAIndexRef : videoBIndexRef
  }

  const getNextIndex = () => {
    return (currentVideoIndex + 1) % videoSources.length
  }

  // Overlap/crossfade settings
  const OVERLAP_SECONDS = 1.5
  const FADE_DURATION_MS = 1500
  const MIN_INITIAL_BUFFER_SECONDS = 0.6
  const [isAVisible, setIsAVisible] = useState(true)
  const [isBVisible, setIsBVisible] = useState(false)
  const scheduledOverlapRef = useRef(false)

  // Start next video with 1.5s overlap and crossfade
  const handleTimeUpdate = (player: 'A' | 'B') => {
    if (isTransitioningRef.current || player !== activePlayer) return
    
    const activeVideo = getActiveVideo()
    const activeIndexRef = getActiveIndexRef()
    
    if (!activeVideo || !activeVideo.duration) return
    if (activeIndexRef.current !== currentVideoIndex) return

    const timeRemaining = activeVideo.duration - activeVideo.currentTime
    
    // Trigger when timeRemaining drops to or below OVERLAP_SECONDS
    if (timeRemaining > OVERLAP_SECONDS) return

    // Begin transition (guard against duplicate scheduling)
    if (scheduledOverlapRef.current) return
    
    scheduledOverlapRef.current = true
    isTransitioningRef.current = true
    const nextIndex = getNextIndex()
    const inactiveVideoRef = getInactiveVideo()
    const inactiveIndexRef = getInactiveIndexRef()
    log(`Starting crossfade ${currentVideoIndex} → ${nextIndex} (player ${activePlayer === 'A' ? 'B' : 'A'}) | timeRemaining=${timeRemaining.toFixed(3)}s`)
    pushDebugEvent({
      player: 'system',
      type: 'crossfade_start',
      extra: { from: currentVideoIndex, to: nextIndex, timeRemaining }
    })

    const hasSufficientBuffer = (video: HTMLVideoElement) => {
      if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return true
      if (video.buffered.length > 0) {
        try {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1)
          return bufferedEnd >= MIN_INITIAL_BUFFER_SECONDS
        } catch {
          // ignore
        }
      }
      return false
    }

    const awaitPaintedFrame = (video: HTMLVideoElement, timeoutMs: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          if (timeoutId) window.clearTimeout(timeoutId)
          resolve()
        }
        const fail = () => {
          if (done) return
          done = true
          reject(new Error('timeout_waiting_for_first_painted_frame'))
        }

        const anyVideo = video as any
        if (typeof anyVideo.requestVideoFrameCallback === 'function') {
          anyVideo.requestVideoFrameCallback(() => finish())
        } else {
          video.addEventListener('playing', finish, { once: true })
        }

        const timeoutId = typeof window !== 'undefined'
          ? window.setTimeout(fail, timeoutMs)
          : undefined
      })
    }

    const startCrossfade = async () => {
      const outgoingVideo = activeVideo
      
      if (inactiveVideoRef.current) {
        const v = inactiveVideoRef.current
        log(`Preparing incoming video index ${nextIndex} | readyState=${v.readyState} | paused=${v.paused} | time=${v.currentTime.toFixed(3)}s`)
        pushDebugEvent({
          player: inactiveVideoRef === videoBRef ? 'B' : 'A',
          type: 'incoming_prepare',
          snapshot: snapshotVideo(v),
          extra: { nextIndex }
        })
        
        // Only play if video is paused and at start
        if (v.paused && v.currentTime < 0.1) {
          v.currentTime = 0
          try {
            await v.play()
            log(`Incoming video ${nextIndex} started playing`)
            pushDebugEvent({
              player: inactiveVideoRef === videoBRef ? 'B' : 'A',
              type: 'incoming_play_resolved',
              snapshot: snapshotVideo(v),
              extra: { nextIndex }
            })
          } catch (error) {
            if ((error as DOMException)?.name === 'AbortError') {
              logWarn(`Incoming video ${nextIndex} play aborted (likely pause race). Retrying shortly.`)
              pushDebugEvent({
                player: inactiveVideoRef === videoBRef ? 'B' : 'A',
                type: 'incoming_play_abort',
                snapshot: snapshotVideo(v),
                extra: { nextIndex, errorName: (error as any)?.name }
              })
              setTimeout(() => {
                if (!v.paused) return
                v.play().catch((retryError) => {
                  if ((retryError as DOMException)?.name !== 'AbortError') {
                    logError(`Incoming video ${nextIndex} retry failed`, retryError)
                  }
                })
              }, 150)
            } else {
              logError(`Incoming video ${nextIndex} play error`, error)
              pushDebugEvent({
                player: inactiveVideoRef === videoBRef ? 'B' : 'A',
                type: 'incoming_play_error',
                snapshot: snapshotVideo(v),
                extra: { nextIndex, errorName: (error as any)?.name }
              })
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

      // Phase 3: "ready gate" for crossfade. Never fade-in an unpainted frame.
      // ready = first frame painted + buffer threshold met
      if (incomingVideo.paused) {
        logWarn(`Incoming video ${nextIndex} not playing; aborting crossfade to avoid blank fade.`)
        pushDebugEvent({
          player: inactiveVideoRef === videoBRef ? 'B' : 'A',
          type: 'incoming_gate_blocked_paused',
          snapshot: snapshotVideo(incomingVideo),
          extra: { nextIndex }
        })
        isTransitioningRef.current = false
        scheduledOverlapRef.current = false
        return
      }

      if (!hasSufficientBuffer(incomingVideo)) {
        logWarn(`Incoming video ${nextIndex} insufficient buffer; aborting crossfade to avoid stutter.`)
        pushDebugEvent({
          player: inactiveVideoRef === videoBRef ? 'B' : 'A',
          type: 'incoming_gate_blocked_buffer',
          snapshot: snapshotVideo(incomingVideo),
          extra: { nextIndex }
        })
        isTransitioningRef.current = false
        scheduledOverlapRef.current = false
        return
      }

      try {
        await awaitPaintedFrame(incomingVideo, 1200)
        pushDebugEvent({
          player: inactiveVideoRef === videoBRef ? 'B' : 'A',
          type: 'incoming_gate_painted_frame',
          snapshot: snapshotVideo(incomingVideo),
          extra: { nextIndex }
        })
      } catch (e) {
        logWarn(`Incoming video ${nextIndex} did not paint a frame in time; aborting crossfade.`, e)
        pushDebugEvent({
          player: inactiveVideoRef === videoBRef ? 'B' : 'A',
          type: 'incoming_gate_timeout_first_frame',
          snapshot: snapshotVideo(incomingVideo),
          extra: { nextIndex }
        })
        isTransitioningRef.current = false
        scheduledOverlapRef.current = false
        return
      }

      // Make incoming visible before changing opacity to prevent flash
      if (inactiveVideoRef === videoBRef) {
        setIsBVisible(true)
      } else {
        setIsAVisible(true)
      }

      // Switch visible player to trigger crossfade (opacity animation)
      setActivePlayer(prev => (prev === 'A' ? 'B' : 'A'))
      pushDebugEvent({
        player: 'system',
        type: 'crossfade_switch_active_player',
        extra: { nextIndex }
      })

      // After fade completes, pause outgoing video and update state
      setTimeout(() => {
        if (outgoingVideo && !outgoingVideo.paused) {
          outgoingVideo.pause()
          log(`Paused outgoing video index ${currentVideoIndex}`)
        }
        setCurrentVideoIndex(nextIndex)
        
        // Hide the outgoing player
        if (inactiveVideoRef === videoBRef) {
          setIsAVisible(false)
        } else {
          setIsBVisible(false)
        }
        
        isTransitioningRef.current = false
        scheduledOverlapRef.current = false
        log(`Crossfade complete. Active video index is now ${nextIndex}`)
        pushDebugEvent({
          player: 'system',
          type: 'crossfade_complete',
          extra: { nextIndex }
        })
      }, FADE_DURATION_MS)
    }

    const ensureReadyThenStart = () => {
      if (!inactiveVideoRef.current) { 
        isTransitioningRef.current = false
        scheduledOverlapRef.current = false
        return 
      }
      const inactiveVideo = inactiveVideoRef.current

      if (inactiveVideo.readyState >= 3 || inactiveVideo.duration > 0) {
        log(`Inactive video index ${nextIndex} ready immediately (readyState=${inactiveVideo.readyState}). Starting crossfade.`)
        startCrossfade()
        return
      }

      log(`Waiting for inactive video index ${nextIndex} to become ready (current readyState=${inactiveVideo.readyState})`)

      let resolved = false

      const cleanup = () => {
        inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough)
        inactiveVideo.removeEventListener('loadeddata', onLoadedData)
        if (timeoutId) {
          window.clearTimeout(timeoutId)
        }
      }

      const onReady = (eventName: string) => () => {
        if (resolved) return
        resolved = true
        log(`Inactive video index ${nextIndex} ready via ${eventName}`)
        cleanup()
        startCrossfade()
      }

      const onCanPlayThrough = onReady('canplaythrough')
      const onLoadedData = onReady('loadeddata')

      inactiveVideo.addEventListener('canplaythrough', onCanPlayThrough, { once: true })
      inactiveVideo.addEventListener('loadeddata', onLoadedData, { once: true })

      let timeoutId: number | undefined
      if (typeof window !== 'undefined') {
        timeoutId = window.setTimeout(() => {
          if (resolved) return
          resolved = true
          logWarn(`Timeout waiting for inactive video index ${nextIndex}. Forcing crossfade.`)
          pushDebugEvent({
            player: 'system',
            type: 'incoming_ready_timeout_force_crossfade',
            extra: { nextIndex, readyState: inactiveVideo.readyState }
          })
          cleanup()
          startCrossfade()
        }, 2500)
      }
    }

    // Load next video in inactive player if needed
    if (inactiveVideoRef.current) {
      if (inactiveIndexRef.current !== nextIndex) {
        inactiveIndexRef.current = nextIndex
        inactiveVideoRef.current.src = videoSources[nextIndex]
        if (posterSrc) {
          inactiveVideoRef.current.poster = posterSrc
        }
        inactiveVideoRef.current.preload = 'auto'
        inactiveVideoRef.current.load()
        log(`Loaded inactive video index ${nextIndex} into player ${inactiveVideoRef === videoBRef ? 'B' : 'A'}`)
        pushDebugEvent({
          player: inactiveVideoRef === videoBRef ? 'B' : 'A',
          type: 'incoming_load_assigned',
          snapshot: snapshotVideo(inactiveVideoRef.current),
          extra: { nextIndex }
        })
      }
      ensureReadyThenStart()
    } else {
      isTransitioningRef.current = false
      scheduledOverlapRef.current = false
    }
  }

  // Handle video end - safety fallback if crossfade somehow fails
  const handleVideoEnd = (player: 'A' | 'B') => {
    if (player === activePlayer && !isTransitioningRef.current) {
      // Reset transition flags if they got stuck
      isTransitioningRef.current = false
      scheduledOverlapRef.current = false
      logWarn(`Video player ${player} ended without transition. Resetting state guards.`)
    }
  }

  // Preload next video when current video is playing (earlier to avoid flashes)
  useEffect(() => {
    const activeVideo = getActiveVideo()
    if (!activeVideo || !activeVideo.duration) return
    if (isTransitioningRef.current) return
    
    const preloadNext = () => {
      const timeRemaining = activeVideo.duration - activeVideo.currentTime
      if (timeRemaining <= 3.0 && timeRemaining > 2.6) {
        const nextIndex = getNextIndex()
        const inactiveVideo = getInactiveVideo()
        const inactiveIndexRef = getInactiveIndexRef()
        
        if (inactiveVideo.current && inactiveIndexRef.current !== nextIndex) {
          inactiveIndexRef.current = nextIndex
          inactiveVideo.current.src = videoSources[nextIndex]
          if (posterSrc) {
            inactiveVideo.current.poster = posterSrc
          }
          inactiveVideo.current.preload = 'auto'
          inactiveVideo.current.load()
        }
      }
    }
    
    const interval = setInterval(preloadNext, 150)
    return () => clearInterval(interval)
  }, [currentVideoIndex, activePlayer, videoSources])

  // Opportunistically warm video cache during idle time (skip if user prefers data savings)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection?.saveData) {
        log('Skipping hero video prefetch due to Save-Data preference')
        return
      }
    }

    const controller = new AbortController()
    const targets = videoSources.slice(1) // video 0 handled via <link rel=\"preload\">

    const prefetch = (src: string) => {
      if (!src) return
      fetch(src, {
        method: 'GET',
        mode: 'no-cors',
        signal: controller.signal,
        headers: { Purpose: 'prefetch' }
      }).catch(() => {
        // Silent failure - network hints only
      })
    }

    const schedule = () => {
      targets.forEach(prefetch)
    }

    let idleHandle: number | null = null
    let timeoutHandle: number | null = null

    if (typeof (window as any).requestIdleCallback === 'function') {
      idleHandle = (window as any).requestIdleCallback(schedule, { timeout: 1500 })
    } else {
      timeoutHandle = window.setTimeout(schedule, 250)
    }

    return () => {
      controller.abort()
      if (idleHandle !== null && typeof (window as any).cancelIdleCallback === 'function') {
        (window as any).cancelIdleCallback(idleHandle)
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle)
      }
    }
  }, [videoSources])

  // Intersection Observer - pause when out of view, resume when in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            // Pause all videos when out of view
            pushDebugEvent({ player: 'system', type: 'intersection_out', extra: { ratio: entry.intersectionRatio } })
            videoARef.current?.pause()
            videoBRef.current?.pause()
          } else {
            // Resume only if not transitioning and video is actually paused
            // Small delay to avoid race conditions with scroll-triggered pauses
            pushDebugEvent({ player: 'system', type: 'intersection_in', extra: { ratio: entry.intersectionRatio } })
            setTimeout(() => {
              const activeVideo = getActiveVideo()
              if (activeVideo?.paused && !isTransitioningRef.current && !scheduledOverlapRef.current) {
                activeVideo.play().then(() => {
                  log('IntersectionObserver resumed active video')
                }).catch((error: DOMException) => {
                  // Ignore AbortError - it just means another pause() was called
                  if (error.name === 'AbortError') {
                    logWarn('IntersectionObserver play aborted (likely due to immediate pause).')
                    return
                  }
                  logError('IntersectionObserver play error', error)
                  pushDebugEvent({
                    player: activePlayer,
                    type: 'intersection_play_error',
                    snapshot: activeVideo ? snapshotVideo(activeVideo) : undefined,
                    extra: { errorName: error.name }
                  })
                })
              }
            }, 100)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [activePlayer])

  // Initialize first video with buffered autoplay guard
  useEffect(() => {
    const videoA = videoARef.current
    if (!videoA) return
    const videoAEl: HTMLVideoElement = videoA

    let cancelled = false
    let attempts = 0
    let bufferRetryTimeout: number | undefined
    const startedAt = performance.now()
    const INITIAL_BUFFER_TIMEOUT_MS = 3200

    const hasSufficientInitialBuffer = () => {
      if (videoAEl.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        return true
      }

      if (videoAEl.buffered.length > 0) {
        try {
          const bufferedEnd = videoAEl.buffered.end(videoAEl.buffered.length - 1)
          return bufferedEnd >= MIN_INITIAL_BUFFER_SECONDS
        } catch (bufferError) {
          logWarn('Unable to inspect initial buffer range', bufferError)
        }
      }

      return false
    }

    const scheduleRetry = (reason: string, delayMs: number) => {
      if (bufferRetryTimeout) {
        window.clearTimeout(bufferRetryTimeout)
      }
      bufferRetryTimeout = window.setTimeout(() => attemptPlay(reason), delayMs)
    }

    function attemptPlay(trigger: string) {
      if (cancelled || hasInitialPlayStartedRef.current) return

      if (!videoAEl.paused) {
        hasInitialPlayStartedRef.current = true
        log(`Initial video already playing when triggered by ${trigger}`)
        return
      }

      if (!hasSufficientInitialBuffer()) {
        const elapsed = performance.now() - startedAt
        if (elapsed < INITIAL_BUFFER_TIMEOUT_MS) {
          log(`Initial buffer below ${MIN_INITIAL_BUFFER_SECONDS}s (trigger: ${trigger}, elapsed: ${Math.round(elapsed)}ms). Waiting before play.`)
          scheduleRetry(`buffer-wait-${trigger}`, 160)
          return
        }
        logWarn(`Initial buffer threshold not met after ${Math.round(elapsed)}ms. Forcing play.`)
      }

      attempts += 1
      log(`Attempting to play initial video (trigger: ${trigger}, attempt: ${attempts})`)
      pushDebugEvent({
        player: 'A',
        type: 'initial_attempt_play',
        snapshot: snapshotVideo(videoAEl),
        extra: { trigger, attempt: attempts }
      })

      videoAEl.play()
        .then(() => {
          if (cancelled) return
          hasInitialPlayStartedRef.current = true
          log('Initial video 0 playing')
          if (tPlayMsRef.current === null) {
            tPlayMsRef.current = performance.now() - startedAt
          }
          pushDebugEvent({
            player: 'A',
            type: 'initial_play_resolved',
            snapshot: snapshotVideo(videoAEl),
            extra: { trigger, attempt: attempts, timeToPlayingMs: tPlayMsRef.current }
          })
        })
        .catch((playError: DOMException) => {
          if (cancelled) return

          if (playError.name === 'AbortError') {
            logWarn(`Initial play aborted (${trigger}). Retrying...`)
            pushDebugEvent({
              player: 'A',
              type: 'initial_play_abort',
              snapshot: snapshotVideo(videoAEl),
              extra: { trigger, attempt: attempts }
            })
            if (attempts < 6) {
              scheduleRetry(`retry-${trigger}`, 180)
            }
            return
          }

          logError('Initial video play error', playError)
          pushDebugEvent({
            player: 'A',
            type: 'initial_play_error',
            snapshot: snapshotVideo(videoAEl),
            extra: { trigger, attempt: attempts, errorName: playError.name }
          })
          if (attempts < 6) {
            scheduleRetry(`retry-${trigger}`, 260)
          }
        })
    }

    const onPlaying = () => {
      if (cancelled) return
      if (!hasInitialPlayStartedRef.current) {
        hasInitialPlayStartedRef.current = true
        log('Initial video confirmed playing (playing event)')
      }
      pushDebugEvent({
        player: 'A',
        type: 'event_playing',
        snapshot: snapshotVideo(videoAEl)
      })
    }

    const onCanPlayThrough = () => attemptPlay('canplaythrough')
    const onLoadedData = () => attemptPlay('loadeddata')
    const onProgress = () => attemptPlay('progress')

    log(`Initializing hero video player with ${videoSources.length} videos`)
    emitSystemInfo()
    installDebugApi()
    videoAIndexRef.current = 0
    videoAEl.src = videoSources[0]
    if (posterSrc) {
      videoAEl.poster = posterSrc
    }
    log(`Primed initial video 0 from ${videoSources[0]}`)
    videoAEl.preload = 'metadata'
    videoAEl.load()
    pushDebugEvent({
      player: 'A',
      type: 'initial_load',
      snapshot: snapshotVideo(videoAEl),
      extra: { src: videoSources[0], poster: posterSrc }
    })

    attemptPlay('immediate')

    videoAEl.addEventListener('playing', onPlaying)
    videoAEl.addEventListener('canplaythrough', onCanPlayThrough)
    videoAEl.addEventListener('loadeddata', onLoadedData)
    videoAEl.addEventListener('progress', onProgress)

    return () => {
      cancelled = true
      if (bufferRetryTimeout) {
        window.clearTimeout(bufferRetryTimeout)
      }
      videoAEl.removeEventListener('playing', onPlaying)
      videoAEl.removeEventListener('canplaythrough', onCanPlayThrough)
      videoAEl.removeEventListener('loadeddata', onLoadedData)
      videoAEl.removeEventListener('progress', onProgress)
    }
  }, [videoSources, posterSrc])

  // Phase 1 instrumentation: capture media events + TTFF and resource timing when debug enabled or on errors.
  useEffect(() => {
    const videoA = videoARef.current
    const videoB = videoBRef.current
    if (!videoA || !videoB) return

    const attach = (player: 'A' | 'B', video: HTMLVideoElement) => {
      const anyVideo = video as any
      const baseExtra = () => ({
        player,
        currentIndex: currentVideoIndex,
        activePlayer
      })

      const on = (type: string) => () => {
        // Always capture errors; capture all else only when debug enabled
        if (!debugEnabledRef.current && type !== 'error') return
        pushDebugEvent({ player, type: `event_${type}`, snapshot: snapshotVideo(video), extra: baseExtra() })

        if (type === 'loadeddata') {
          // Resource timing becomes available around here in many browsers.
          emitResourceTiming(video.currentSrc || video.getAttribute('src') || '', `${player}_loadeddata`)
        }
      }

      const onError = () => {
        const snap = snapshotVideo(video)
        pushDebugEvent({ player, type: 'event_error', snapshot: snap, extra: baseExtra() })
        logError(`Video ${player} error`, snap.error, snap)
      }

      const onFirstFrame = () => {
        if (ttffMsRef.current !== null) return
        ttffMsRef.current = (typeof performance !== 'undefined' ? performance.now() : 0) - mountPerfNowRef.current
        pushDebugEvent({ player, type: 'ttff_first_frame', snapshot: snapshotVideo(video), extra: { ttffMs: ttffMsRef.current } })
      }

      // Standard media events that correlate with buffering/failures
      const events: Array<{ type: string; handler: EventListener }> = [
        { type: 'loadstart', handler: on('loadstart') },
        { type: 'loadedmetadata', handler: on('loadedmetadata') },
        { type: 'loadeddata', handler: on('loadeddata') },
        { type: 'canplay', handler: on('canplay') },
        { type: 'canplaythrough', handler: on('canplaythrough') },
        { type: 'playing', handler: on('playing') },
        { type: 'pause', handler: on('pause') },
        { type: 'waiting', handler: on('waiting') },
        { type: 'stalled', handler: on('stalled') },
        { type: 'suspend', handler: on('suspend') },
        { type: 'abort', handler: on('abort') },
        { type: 'emptied', handler: on('emptied') },
        { type: 'seeking', handler: on('seeking') },
        { type: 'seeked', handler: on('seeked') }
      ]

      events.forEach(({ type, handler }) => video.addEventListener(type, handler))
      video.addEventListener('error', onError)

      // TTFF: use requestVideoFrameCallback when available, fall back to first 'playing'
      if (typeof anyVideo.requestVideoFrameCallback === 'function') {
        anyVideo.requestVideoFrameCallback(onFirstFrame)
      } else {
        video.addEventListener('playing', onFirstFrame, { once: true })
      }

      return () => {
        events.forEach(({ type, handler }) => video.removeEventListener(type, handler))
        video.removeEventListener('error', onError)
        video.removeEventListener('playing', onFirstFrame as any)
      }
    }

    const cleanupA = attach('A', videoA)
    const cleanupB = attach('B', videoB)
    return () => {
      cleanupA?.()
      cleanupB?.()
    }
    // Intentionally NOT depending on currentVideoIndex/activePlayer to keep handlers stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden z-10 ${className}`}>
      {/* Fallback gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 z-0" />

      {/* Video A - fades out during overlap */}
      <motion.video
        ref={videoARef}
        className="absolute inset-0 w-full h-full z-10"
        crossOrigin="anonymous"
        muted
        playsInline
        poster={posterSrc}
        preload="metadata"
        onTimeUpdate={() => handleTimeUpdate('A')}
        onEnded={() => handleVideoEnd('A')}
        onError={() => {
          console.error('❌ Video A error:', videoARef.current?.error)
        }}
        initial={{ opacity: activePlayer === 'A' ? 1 : 0 }}
        animate={{ opacity: activePlayer === 'A' ? 1 : 0 }}
        transition={{ duration: OVERLAP_SECONDS, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ 
          objectFit: 'cover',
          objectPosition: 'center',
          pointerEvents: activePlayer === 'A' ? 'auto' : 'none',
          zIndex: activePlayer === 'A' ? 20 : 10,
          visibility: isAVisible ? 'visible' : 'hidden'
        }}
      />

      {/* Video B - fades in during overlap */}
      <motion.video
        ref={videoBRef}
        className="absolute inset-0 w-full h-full z-10"
        crossOrigin="anonymous"
        muted
        playsInline
        poster={posterSrc}
        preload="metadata"
        onTimeUpdate={() => handleTimeUpdate('B')}
        onEnded={() => handleVideoEnd('B')}
        onError={() => {
          console.error('❌ Video B error:', videoBRef.current?.error)
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: activePlayer === 'B' ? 1 : 0 }}
        transition={{ duration: OVERLAP_SECONDS, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ 
          objectFit: 'cover',
          objectPosition: 'center',
          pointerEvents: activePlayer === 'B' ? 'auto' : 'none',
          zIndex: activePlayer === 'B' ? 20 : 10,
          visibility: isBVisible ? 'visible' : 'hidden'
        }}
      />

      {/* Theme overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-all duration-500 z-20 ${
          isDarkMode
            ? 'bg-gradient-to-tl from-slate-900/60 via-slate-900/30 to-transparent'
            : 'bg-gradient-to-tl from-white/60 via-white/30 to-transparent'
        }`}
      />

      {/* Additional overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-all duration-500 z-30 ${
          isDarkMode
            ? 'bg-slate-900/10'
            : 'bg-white/10'
        }`}
      />

    </div>
  )
}

export { HeroVideoBackground }
