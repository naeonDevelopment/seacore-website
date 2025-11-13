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

  const videoSources = useMemo(() => [
    getAssetPath('assets/hero/h_h_1.mp4'),
    getAssetPath('assets/hero/h_h_2.mp4'),
    getAssetPath('assets/hero/h_h_3.mp4')
  ], [])

  const posterSrc = useMemo(() => getAssetPath('assets/hero/hero-poster.svg'), [])

  const log = (message: string, ...args: unknown[]) => {
    console.log(`🎥 Hero: ${message}`, ...args)
  }

  const logWarn = (message: string, ...args: unknown[]) => {
    console.warn(`⚠️ Hero: ${message}`, ...args)
  }

  const logError = (message: string, ...args: unknown[]) => {
    console.error(`❌ Hero: ${message}`, ...args)
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

    const awaitFirstFrame = (video: HTMLVideoElement): Promise<void> => {
      return new Promise((resolve) => {
        const anyVideo = video as any
        if (typeof anyVideo.requestVideoFrameCallback === 'function') {
          anyVideo.requestVideoFrameCallback(() => resolve())
          return
        }
        const onPlaying = () => {
          video.removeEventListener('playing', onPlaying)
          resolve()
        }
        video.addEventListener('playing', onPlaying, { once: true })
      })
    }

    const startCrossfade = async () => {
      const outgoingVideo = activeVideo
      
      if (inactiveVideoRef.current) {
        const v = inactiveVideoRef.current
        log(`Preparing incoming video index ${nextIndex} | readyState=${v.readyState} | paused=${v.paused} | time=${v.currentTime.toFixed(3)}s`)
        
        // Only play if video is paused and at start
        if (v.paused && v.currentTime < 0.1) {
          v.currentTime = 0
          try {
            await v.play()
            log(`Incoming video ${nextIndex} started playing`)
          } catch (error) {
            if ((error as DOMException)?.name === 'AbortError') {
              logWarn(`Incoming video ${nextIndex} play aborted (likely pause race). Retrying shortly.`)
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
            }
          }
        }
      }

      // Ensure incoming becomes visible only after first frame rendered
      if (inactiveVideoRef.current && inactiveVideoRef.current.paused === false) {
        await awaitFirstFrame(inactiveVideoRef.current)
      }

      // Make incoming visible before changing opacity to prevent flash
      if (inactiveVideoRef === videoBRef) {
        setIsBVisible(true)
      } else {
        setIsAVisible(true)
      }

      // Switch visible player to trigger crossfade (opacity animation)
      setActivePlayer(prev => (prev === 'A' ? 'B' : 'A'))

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
          clearTimeout(timeoutId)
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

      let timeoutId: ReturnType<typeof setTimeout> | undefined
      if (typeof window !== 'undefined') {
        timeoutId = window.setTimeout(() => {
          if (resolved) return
          resolved = true
          logWarn(`Timeout waiting for inactive video index ${nextIndex}. Forcing crossfade.`)
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
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null

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
            videoARef.current?.pause()
            videoBRef.current?.pause()
          } else {
            // Resume only if not transitioning and video is actually paused
            // Small delay to avoid race conditions with scroll-triggered pauses
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

    let cancelled = false
    let attempts = 0
    let bufferRetryTimeout: ReturnType<typeof setTimeout> | undefined
    const startedAt = performance.now()
    const INITIAL_BUFFER_TIMEOUT_MS = 3200

    const hasSufficientInitialBuffer = () => {
      if (videoA.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        return true
      }

      if (videoA.buffered.length > 0) {
        try {
          const bufferedEnd = videoA.buffered.end(videoA.buffered.length - 1)
          return bufferedEnd >= MIN_INITIAL_BUFFER_SECONDS
        } catch (bufferError) {
          logWarn('Unable to inspect initial buffer range', bufferError)
        }
      }

      return false
    }

    const scheduleRetry = (reason: string, delayMs: number) => {
      if (bufferRetryTimeout) {
        clearTimeout(bufferRetryTimeout)
      }
      bufferRetryTimeout = window.setTimeout(() => attemptPlay(reason), delayMs)
    }

    function attemptPlay(trigger: string) {
      if (cancelled || hasInitialPlayStartedRef.current) return

      if (!videoA.paused) {
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

      videoA.play()
        .then(() => {
          if (cancelled) return
          hasInitialPlayStartedRef.current = true
          log('Initial video 0 playing')
        })
        .catch((playError: DOMException) => {
          if (cancelled) return

          if (playError.name === 'AbortError') {
            logWarn(`Initial play aborted (${trigger}). Retrying...`)
            if (attempts < 6) {
              scheduleRetry(`retry-${trigger}`, 180)
            }
            return
          }

          logError('Initial video play error', playError)
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
    }

    const onCanPlayThrough = () => attemptPlay('canplaythrough')
    const onLoadedData = () => attemptPlay('loadeddata')
    const onProgress = () => attemptPlay('progress')

    log(`Initializing hero video player with ${videoSources.length} videos`)
    videoAIndexRef.current = 0
    videoA.src = videoSources[0]
    if (posterSrc) {
      videoA.poster = posterSrc
    }
    log(`Primed initial video 0 from ${videoSources[0]}`)
    videoA.preload = 'metadata'
    videoA.load()

    attemptPlay('immediate')

    videoA.addEventListener('playing', onPlaying)
    videoA.addEventListener('canplaythrough', onCanPlayThrough)
    videoA.addEventListener('loadeddata', onLoadedData)
    videoA.addEventListener('progress', onProgress)

    return () => {
      cancelled = true
      if (bufferRetryTimeout) {
        clearTimeout(bufferRetryTimeout)
      }
      videoA.removeEventListener('playing', onPlaying)
      videoA.removeEventListener('canplaythrough', onCanPlayThrough)
      videoA.removeEventListener('loadeddata', onLoadedData)
      videoA.removeEventListener('progress', onProgress)
    }
  }, [videoSources, posterSrc])


  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden z-10 ${className}`}>
      {/* Fallback gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 z-0" />

      {/* Video A - fades out during overlap */}
      <motion.video
        ref={videoARef}
        className="absolute inset-0 w-full h-full z-10"
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
