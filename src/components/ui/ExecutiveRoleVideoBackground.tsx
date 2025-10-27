import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { getAssetPath } from '@/utils/assetPath'

interface ExecutiveRoleVideoBackgroundProps {
  isDarkMode?: boolean
  className?: string
}

const ExecutiveRoleVideoBackground: React.FC<ExecutiveRoleVideoBackgroundProps> = ({ 
  isDarkMode = false, 
  className = '' 
}) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A')
  
  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isTransitioningRef = useRef(false)

  const videoSources = useMemo(() => [
    getAssetPath('assets/section_experts/vid_section_experts1.mp4'),
    getAssetPath('assets/section_experts/vid_section_experts_2.mp4')
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
      
      // Load next video into inactive player
      if (inactiveVideo.current) {
        inactiveVideo.current.src = videoSources[nextIndex]
        inactiveVideo.current.load()
        inactiveVideo.current.currentTime = 0
        inactiveVideo.current.play().catch(() => {})
      }
      
      // Swap active player after 1.2 seconds (completes at ~7.7s, before video ends at 8s)
      setTimeout(() => {
        setActivePlayer(prev => prev === 'A' ? 'B' : 'A')
        setCurrentVideoIndex(nextIndex)
        isTransitioningRef.current = false
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

  // Initialize first video
  useEffect(() => {
    if (videoARef.current) {
      videoARef.current.src = videoSources[0]
      videoARef.current.load()
      videoARef.current.play().catch(() => {})
    }
  }, [videoSources])

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden z-10 ${className}`}>
      {/* Fallback gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-900 dark:to-emerald-950/30 z-0" />

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
            ? 'bg-gradient-to-tl from-slate-900/70 via-emerald-900/20 to-transparent'
            : 'bg-gradient-to-tl from-white/70 via-emerald-50/40 to-transparent'
        }`}
      />

      {/* Additional overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-all duration-500 z-30 ${
          isDarkMode
            ? 'bg-emerald-900/15'
            : 'bg-emerald-50/20'
        }`}
      />
    </div>
  )
}

export { ExecutiveRoleVideoBackground }
