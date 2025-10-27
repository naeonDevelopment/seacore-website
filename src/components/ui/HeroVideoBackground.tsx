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
  const loadedVideosRef = useRef<Set<number>>(new Set([0])) // Track loaded video indices

  const videoSources = useMemo(() => [
    getAssetPath('assets/hero/h_h_1.mp4'),
    getAssetPath('assets/hero/h_h_2.mp4'),
    getAssetPath('assets/hero/h_h_3.mp4')
  ], [])

  // Get the inactive video ref and next video index
  const getInactiveVideo = () => {
    return activePlayer === 'A' ? videoBRef : videoARef
  }

  const getNextIndex = () => {
    return (currentVideoIndex + 1) % videoSources.length
  }

  // Handle time update on active video
  const handleTimeUpdate = (player: 'A' | 'B') => {
    if (isTransitioningRef.current || player !== activePlayer) return
    
    const activeVideo = player === 'A' ? videoARef.current : videoBRef.current
    if (!activeVideo) return
    
    const timeRemaining = activeVideo.duration - activeVideo.currentTime
    
    // Start transition 1.5 seconds before end (triggers at ~6.5 seconds)
    if (timeRemaining <= 1.5 && timeRemaining > 1.4) {
      isTransitioningRef.current = true
      
      const inactiveVideo = getInactiveVideo()
      const nextIndex = getNextIndex()
      
      console.log(`🔄 Transitioning from video ${currentVideoIndex} to ${nextIndex}`)
      
      // Play the already-preloaded video
      if (inactiveVideo.current) {
        inactiveVideo.current.currentTime = 0
        inactiveVideo.current.play()
          .then(() => console.log(`✅ Playing video ${nextIndex}`))
          .catch(e => console.error(`❌ Play error for video ${nextIndex}:`, e))
      }
      
      // Swap active player after 1.2 seconds (completes at ~7.7s, before video ends at 8s)
      setTimeout(() => {
        setActivePlayer(prev => prev === 'A' ? 'B' : 'A')
        setCurrentVideoIndex(nextIndex)
        isTransitioningRef.current = false
        console.log(`✅ Swapped to player ${activePlayer === 'A' ? 'B' : 'A'}, video ${nextIndex}`)
      }, 1200)
    }
  }

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            videoARef.current?.pause()
            videoBRef.current?.pause()
          } else {
            const activeVideo = activePlayer === 'A' ? videoARef.current : videoBRef.current
            if (activeVideo?.paused) {
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

  // Initialize first video and preload second video
  useEffect(() => {
    console.log('🎬 Hero Video Player: Initializing')
    loadedVideosRef.current = new Set([0])
    
    if (videoARef.current) {
      console.log('🎬 Loading video 0:', videoSources[0])
      videoARef.current.src = videoSources[0]
      videoARef.current.load()
      
      // Wait for video to be ready before playing
      const handleCanPlay = () => {
        console.log('✅ Video 0 ready, playing')
        videoARef.current?.play().catch(e => console.error('Play error:', e))
      }
      
      videoARef.current.addEventListener('canplaythrough', handleCanPlay, { once: true })
    }
    
    // Eagerly preload the next video for smooth transitions
    if (videoBRef.current && videoSources.length > 1) {
      console.log('🎬 Preloading video 1:', videoSources[1])
      videoBRef.current.src = videoSources[1]
      videoBRef.current.load()
      loadedVideosRef.current.add(1)
    }
  }, [videoSources])

  // Preload next video when active player changes
  useEffect(() => {
    const nextIndex = getNextIndex()
    const inactiveVideo = getInactiveVideo()
    
    // If the next video isn't already loaded, preload it
    if (inactiveVideo.current && !loadedVideosRef.current.has(nextIndex)) {
      console.log(`🎬 Preloading video ${nextIndex}: ${videoSources[nextIndex]}`)
      inactiveVideo.current.src = videoSources[nextIndex]
      inactiveVideo.current.load()
      loadedVideosRef.current.add(nextIndex)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayer, currentVideoIndex])

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden z-10 ${className}`}>
      {/* Fallback gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 z-0" />

      {/* Video A */}
      <motion.video
        ref={videoARef}
        className="absolute inset-0 w-full h-full z-10"
        muted
        playsInline
        preload="auto"
        onTimeUpdate={() => handleTimeUpdate('A')}
        animate={{ opacity: activePlayer === 'A' ? 1 : 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        style={{ 
          objectFit: 'cover',
          objectPosition: 'center'
        }}
      />

      {/* Video B */}
      <motion.video
        ref={videoBRef}
        className="absolute inset-0 w-full h-full z-10"
        muted
        playsInline
        preload="auto"
        onTimeUpdate={() => handleTimeUpdate('B')}
        animate={{ opacity: activePlayer === 'B' ? 1 : 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        style={{ 
          objectFit: 'cover',
          objectPosition: 'center'
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
