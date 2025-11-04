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

  // Start next video with 1.5s overlap and crossfade
  const handleTimeUpdate = (player: 'A' | 'B') => {
    if (isTransitioningRef.current || player !== activePlayer) return
    const activeVideo = getActiveVideo()
    const activeIndexRef = getActiveIndexRef()
    if (!activeVideo || activeIndexRef.current !== currentVideoIndex || !activeVideo.duration) return

    const timeRemaining = activeVideo.duration - activeVideo.currentTime
    if (timeRemaining > OVERLAP_SECONDS || timeRemaining <= OVERLAP_SECONDS - 0.2) return

    // Begin transition
    isTransitioningRef.current = true
    const nextIndex = getNextIndex()
    const inactiveVideoRef = getInactiveVideo()
    const inactiveIndexRef = getInactiveIndexRef()

    const startCrossfade = () => {
      // ensure outgoing keeps playing until fade completes
      const outgoingVideo = activeVideo
      if (inactiveVideoRef.current) {
        inactiveVideoRef.current.currentTime = 0
        inactiveVideoRef.current.play().catch(() => {})
      }

      // brief white pulse to mask any single-frame load
      setFlashVisible(true)
      setTimeout(() => setFlashVisible(false), 250)

      // Switch visible player to trigger crossfade
      setActivePlayer(prev => (prev === 'A' ? 'B' : 'A'))

      // After fade completes, pause outgoing to avoid double playback
      setTimeout(() => {
        if (outgoingVideo && !outgoingVideo.paused) outgoingVideo.pause()
        // Now that fade is done, advance the logical index
        setCurrentVideoIndex(nextIndex)
        isTransitioningRef.current = false
      }, FADE_DURATION_MS)
    }

    const ensureReadyThenStart = () => {
      if (!inactiveVideoRef.current) { isTransitioningRef.current = false; return }
      if (inactiveVideoRef.current.readyState >= 3) {
        startCrossfade()
      } else {
        const onReady = () => {
          inactiveVideoRef.current?.removeEventListener('canplaythrough', onReady)
          inactiveVideoRef.current?.removeEventListener('canplay', onReady)
          startCrossfade()
        }
        inactiveVideoRef.current.addEventListener('canplaythrough', onReady, { once: true })
        inactiveVideoRef.current.addEventListener('canplay', onReady, { once: true })
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
    }
  }

  // Transition to next video
  const transitionToNext = async () => {
    if (isTransitioningRef.current) return
    
    const activeVideo = getActiveVideo()
    const activeIndexRef = getActiveIndexRef()
    
    if (!activeVideo || activeIndexRef.current !== currentVideoIndex) return
    
    isTransitioningRef.current = true
    const nextIndex = getNextIndex()
    const inactiveVideo = getInactiveVideo()
    const inactiveIndexRef = getInactiveIndexRef()
    
    console.log(`🔄 Transitioning from video ${currentVideoIndex} to ${nextIndex}`)
    
    // Pause current video
    activeVideo.pause()
    
    if (!inactiveVideo.current) {
      isTransitioningRef.current = false
      return
    }
    
    // Ensure next video is loaded
    if (inactiveIndexRef.current !== nextIndex) {
      inactiveIndexRef.current = nextIndex
      inactiveVideo.current.src = videoSources[nextIndex]
      inactiveVideo.current.preload = 'auto'
      inactiveVideo.current.load()
    }
    
    // Wait for video to be ready
    const waitForReady = (video: HTMLVideoElement): Promise<void> => {
      return new Promise((resolve) => {
        if (video.readyState >= 4) {
          resolve()
          return
        }
        const handleReady = () => {
          video.removeEventListener('canplaythrough', handleReady)
          resolve()
        }
        video.addEventListener('canplaythrough', handleReady, { once: true })
      })
    }
    
    try {
      await waitForReady(inactiveVideo.current)
      inactiveVideo.current.currentTime = 0
      await inactiveVideo.current.play()
      
      console.log(`✅ Started playing video ${nextIndex}`)
      
      // Update active player and index
      setActivePlayer(prev => prev === 'A' ? 'B' : 'A')
      setCurrentVideoIndex(nextIndex)
      
      setTimeout(() => {
        isTransitioningRef.current = false
      }, 1000)
      
    } catch (error) {
      console.error(`❌ Play error:`, error)
      isTransitioningRef.current = false
    }
  }

  // Handle video end
  const handleVideoEnd = (player: 'A' | 'B') => {
    if (player !== activePlayer || isTransitioningRef.current) return
    const activeIndexRef = getActiveIndexRef()
    if (activeIndexRef.current !== currentVideoIndex) return
    transitionToNext()
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

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            videoARef.current?.pause()
            videoBRef.current?.pause()
          } else {
            const activeVideo = getActiveVideo()
            if (activeVideo?.paused and not isTransitioningRef.current) {
              activeVideo.play().catch(() => {})
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

  // Initialize first video only
  useEffect(() => {
    if (!videoARef.current) return
    
    const videoA = videoARef.current
    videoAIndexRef.current = 0
    videoA.src = videoSources[0]
    videoA.preload = 'auto'
    videoA.load()
    
    const playVideo = () => {
      videoA.play().catch(() => {})
    }
    
    videoA.addEventListener('canplaythrough', playVideo, { once: true })
    videoA.addEventListener('canplay', playVideo, { once: true })
  }, [videoSources])

  // Ensure only active video plays, pause inactive
  useEffect(() => {
    const activeVideo = getActiveVideo()
    const inactiveVideo = getInactiveVideo()
    
    // Pause inactive video
    if (inactiveVideo.current && !inactiveVideo.current.paused) {
      inactiveVideo.current.pause()
    }
    
    // Ensure active video plays
    if (activeVideo && activeVideo.paused && !isTransitioningRef.current) {
      activeVideo.play().catch(() => {})
    }
  }, [activePlayer])

  // Preload next video after transition
  useEffect(() => {
    if (currentVideoIndex === 0) return // Skip on initial mount
    
    const nextIndex = getNextIndex()
    const inactiveVideo = getInactiveVideo()
    const inactiveIndexRef = getInactiveIndexRef()
    
    if (inactiveVideo.current and inactiveIndexRef.current !== nextIndex) {
      inactiveIndexRef.current = nextIndex
      inactiveVideo.current.src = videoSources[nextIndex]
      inactiveVideo.current.preload = 'auto'
      inactiveVideo.current.load()
    }
  }, [currentVideoIndex, activePlayer, videoSources])

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
          zIndex: activePlayer === 'A' ? 20 : 10
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
          zIndex: activePlayer === 'B' ? 20 : 10
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
