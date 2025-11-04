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

  const videoSources = useMemo(() => [
    getAssetPath('assets/hero/h_h_1.mp4'),
    getAssetPath('assets/hero/h_h_2.mp4'),
    getAssetPath('assets/hero/h_h_3.mp4')
  ], [])

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
  const [flashVisible, setFlashVisible] = useState(false)
  const [isAVisible, setIsAVisible] = useState(true)
  const [isBVisible, setIsBVisible] = useState(false)
  const scheduledOverlapRef = useRef(false)

  // Start next video with 1.5s overlap and crossfade
  const handleTimeUpdate = (player: 'A' | 'B') => {
    // Early exit logging
    if (isTransitioningRef.current) {
      // Don't log every frame during transition
      return
    }
    if (player !== activePlayer) return
    
    const activeVideo = getActiveVideo()
    const activeIndexRef = getActiveIndexRef()
    
    if (!activeVideo) {
      console.warn('❌ handleTimeUpdate: No active video')
      return
    }
    
    if (!activeVideo.duration) {
      // Video duration not loaded yet - log only once
      if (activeVideo.currentTime > 0 && activeVideo.currentTime < 0.1) {
        console.warn(`⚠️ Video ${currentVideoIndex} has no duration (currentTime: ${activeVideo.currentTime.toFixed(3)})`)
      }
      return
    }
    
    if (activeIndexRef.current !== currentVideoIndex) {
      console.warn(`⚠️ Index mismatch: activeIndexRef=${activeIndexRef.current}, currentVideoIndex=${currentVideoIndex}`)
      return
    }

    const timeRemaining = activeVideo.duration - activeVideo.currentTime
    
    // Log when we're getting close to trigger point
    if (timeRemaining <= OVERLAP_SECONDS + 0.5 && timeRemaining > OVERLAP_SECONDS) {
      console.log(`⏱️ Approaching crossfade trigger: ${timeRemaining.toFixed(2)}s remaining (target: ${OVERLAP_SECONDS}s)`)
    }
    
    if (timeRemaining > OVERLAP_SECONDS || timeRemaining <= OVERLAP_SECONDS - 0.2) return

    // Begin transition (guard against duplicate scheduling)
    if (scheduledOverlapRef.current) {
      console.log(`⚠️ Crossfade already scheduled, skipping duplicate (currentVideo: ${currentVideoIndex})`)
      return
    }
    
    console.log(`🎬 TRIGGERING CROSSFADE: ${currentVideoIndex} → ${getNextIndex()} (timeRemaining: ${timeRemaining.toFixed(2)}s, activePlayer: ${activePlayer}, duration: ${activeVideo.duration.toFixed(2)}s)`)
    
    scheduledOverlapRef.current = true
    isTransitioningRef.current = true
    const nextIndex = getNextIndex()
    const inactiveVideoRef = getInactiveVideo()
    const inactiveIndexRef = getInactiveIndexRef()

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
      // ensure outgoing keeps playing until fade completes
      const outgoingVideo = activeVideo
      if (inactiveVideoRef.current) {
        // Critical: Only play if video is actually paused AND not already playing
        const v = inactiveVideoRef.current
        console.log(`📹 Inactive video state - paused: ${v.paused}, currentTime: ${v.currentTime.toFixed(3)}, readyState: ${v.readyState}`)
        
        // Check both paused state and currentTime to avoid double playback
        if (v.paused && v.currentTime < 0.1) {
          v.currentTime = 0
          try {
            await v.play()
            console.log(`✅ Started crossfade playback for video ${nextIndex} (${activePlayer} → ${activePlayer === 'A' ? 'B' : 'A'})`)
          } catch (error) {
            console.error(`❌ Crossfade play error:`, error)
          }
        } else if (!v.paused) {
          console.log(`⚠️ Video ${nextIndex} already playing (paused: ${v.paused}, time: ${v.currentTime.toFixed(3)}), skipping duplicate play()`)
        } else {
          console.log(`⚠️ Video ${nextIndex} not in expected state (paused: ${v.paused}, time: ${v.currentTime.toFixed(3)})`)
        }
      }

      // brief white pulse to mask any single-frame load
      setFlashVisible(true)
      setTimeout(() => setFlashVisible(false), 250)

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

      // After fade completes, pause outgoing to avoid double playback
      setTimeout(() => {
        if (outgoingVideo && !outgoingVideo.paused) {
          outgoingVideo.pause()
          console.log(`⏸️ Paused outgoing video after crossfade`)
        }
        // Now that fade is done, advance the logical index
        setCurrentVideoIndex(nextIndex)
        // Hide the outgoing player completely to prevent any visibility
        if (inactiveVideoRef === videoBRef) {
          // We switched from A to B, so hide A
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
        startCrossfade()
      } else {
        const onReady = () => {
          inactiveVideoRef.current?.removeEventListener('canplaythrough', onReady)
          startCrossfade()
        }
        inactiveVideoRef.current.addEventListener('canplaythrough', onReady, { once: true })
      }
    }

    // Load next video in inactive player if needed
    if (inactiveVideoRef.current) {
      if (inactiveIndexRef.current !== nextIndex) {
        inactiveIndexRef.current = nextIndex
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

  // Handle video end - DISABLED: crossfade handles transitions before video ends
  // This is a safety fallback only if crossfade somehow fails
  const handleVideoEnd = (player: 'A' | 'B') => {
    // If we reach the end, the crossfade should have already happened
    // Log a warning but don't transition (prevents double playback)
    if (player === activePlayer && !isTransitioningRef.current) {
      console.warn(`⚠️ Video ${currentVideoIndex} ended without crossfade transition. Crossfade should trigger at ${OVERLAP_SECONDS}s before end.`)
      // Reset transition flags in case they got stuck
      isTransitioningRef.current = false
      scheduledOverlapRef.current = false
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
          inactiveVideo.current.preload = 'auto'
          inactiveVideo.current.load()
        }
      }
    }
    
    const interval = setInterval(preloadNext, 150)
    return () => clearInterval(interval)
  }, [currentVideoIndex, activePlayer, videoSources])

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
            const activeVideo = getActiveVideo()
            if (activeVideo?.paused && !isTransitioningRef.current && !scheduledOverlapRef.current) {
              activeVideo.play().catch((error) => {
                console.error('❌ IntersectionObserver play error:', error)
              })
            }
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

  // Initialize first video only - single play attempt
  useEffect(() => {
    if (!videoARef.current) return
    
    const videoA = videoARef.current
    videoAIndexRef.current = 0
    videoA.src = videoSources[0]
    videoA.preload = 'auto'
    videoA.load()
    
    console.log(`🎥 Initializing video player with first video: ${videoSources[0]}`)
    
    let hasPlayed = false
    const playVideo = () => {
      if (hasPlayed) {
        console.warn('⚠️ Initial video already started, skipping duplicate play')
        return
      }
      hasPlayed = true
      
      console.log(`▶️ Starting initial video playback (duration: ${videoA.duration ? videoA.duration.toFixed(2) + 's' : 'unknown'})`)
      
      videoA.play()
        .then(() => {
          console.log(`✅ Initial video 0 playing (duration: ${videoA.duration.toFixed(2)}s)`)
        })
        .catch((error) => {
          console.error('❌ Initial video play error:', error)
          hasPlayed = false // Reset on error to allow retry
        })
    }
    
    // Only use canplaythrough for more reliable playback
    videoA.addEventListener('canplaythrough', playVideo, { once: true })
    
    return () => {
      videoA.removeEventListener('canplaythrough', playVideo)
    }
  }, [videoSources])

  // Ensure only active video plays, pause inactive
  // REMOVED: This useEffect was causing double playback by competing with handleTimeUpdate
  // The crossfade logic in handleTimeUpdate already handles play/pause correctly

  // Preload next video after transition - REMOVED: consolidated into handleTimeUpdate preload
  // The preload logic at line 195-219 handles this more efficiently during playback

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
        preload="auto"
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

      {/* White pulse overlay on transition start */}
      {flashVisible && (
        <div className="absolute inset-0 z-40 pointer-events-none bg-white/40 animate-pulse" style={{ animationDuration: '250ms' }} />
      )}
    </div>
  )
}

export { HeroVideoBackground }
