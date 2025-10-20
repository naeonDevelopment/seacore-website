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
  const [isLoaded, setIsLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Executive Role section videos - section_experts assets
  const videoSources = useMemo(() => [
    getAssetPath('assets/section_experts/vid_section_experts1.mp4'),
    getAssetPath('assets/section_experts/vid_section_experts2.mp4')
  ], [])
  
  // Enable videos - they will gracefully fallback to gradient if missing
  const [videosAvailable, setVideosAvailable] = useState(true) // Re-enabled with fixed paths
  const [failedAttempts, setFailedAttempts] = useState(0)

  // Reset video state when video sources change
  useEffect(() => {
    console.log('🔄 ExecutiveRole Video sources changed, resetting state')
    setVideosAvailable(true)
    setFailedAttempts(0)
    setIsLoaded(false)
    setCurrentVideoIndex(0)
  }, [videoSources])

  // Debug logging
  useEffect(() => {
    console.log('🎬 ExecutiveRoleVideoBackground initialized')
    console.log('📁 Video sources:', videoSources)
    console.log('🎯 Current video index:', currentVideoIndex)
    console.log('✅ Videos available:', videosAvailable)
    
    return () => {
      console.log('🔥 ExecutiveRoleVideoBackground unmounting')
    }
  }, [])

  // Debug isLoaded state changes
  useEffect(() => {
    console.log('🔄 ExecutiveRole isLoaded state changed:', isLoaded)
    console.log('👁️ ExecutiveRole Video opacity should be:', isLoaded ? 1 : 0)
  }, [isLoaded])

  // Cycle through videos - longer intervals for executive content
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % videoSources.length)
    }, 12000) // 12 seconds per video for more professional pacing

    return () => clearInterval(interval)
  }, [videoSources.length])

  // Handle video load
  const handleVideoLoad = () => {
    console.log('✅ ExecutiveRole Video loaded successfully:', videoSources[currentVideoIndex])
    console.log('🎬 ExecutiveRole Setting isLoaded to true')
    console.log('🔍 ExecutiveRole Current component state before setting loaded:', { currentVideoIndex, videosAvailable, failedAttempts })
    setIsLoaded(true)
  }

  // Handle video error (fallback to gradient gracefully)
  const handleVideoError = (error: any) => {
    console.log('❌ ExecutiveRole Video failed to load:', videoSources[currentVideoIndex], error)
    setIsLoaded(false)
    
    const newFailedAttempts = failedAttempts + 1
    setFailedAttempts(newFailedAttempts)
    
    // If all videos have failed, disable video background gracefully
    if (newFailedAttempts >= videoSources.length) {
      console.log('🚫 ExecutiveRole All videos failed, using gradient background')
      setVideosAvailable(false)
    } else {
      // Try next video after a delay to prevent rapid cycling
      setTimeout(() => {
        const nextIndex = (currentVideoIndex + 1) % videoSources.length
        console.log('🔄 ExecutiveRole Trying next video:', videoSources[nextIndex])
        setCurrentVideoIndex(nextIndex)
      }, 1000) // 1 second delay
    }
  }

  // Handle video end (for seamless looping)
  const handleVideoEnd = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play()
    }
  }

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Fallback gradient background - always show - Executive theme colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-900 dark:to-emerald-950/30 z-0" />

      {/* Video Background - Only render if videos are available */}
      {videosAvailable && (
        <motion.video
          ref={videoRef}
          key={currentVideoIndex}
          className="absolute inset-0 w-full h-full z-10"
          autoPlay
          muted
          playsInline
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          onEnded={handleVideoEnd}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.8 }} // Slightly longer transition for executive content
          style={{ 
            backgroundColor: 'transparent',
            objectFit: 'cover',
            objectPosition: 'center center'
          }}
        >
          <source src={videoSources[currentVideoIndex]} type="video/mp4" />
        </motion.video>
      )}

      {/* Theme-Aware Gradient Overlay - Executive branding colors */}
      {isLoaded && videosAvailable && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-20 ${
            isDarkMode
              ? 'bg-gradient-to-tl from-slate-900/70 via-emerald-900/20 to-transparent'
              : 'bg-gradient-to-tl from-white/70 via-emerald-50/40 to-transparent'
          }`}
        />
      )}

      {/* Additional overlay for better text readability - Executive theme */}
      {isLoaded && videosAvailable && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-30 ${
            isDarkMode
              ? 'bg-emerald-900/15'
              : 'bg-emerald-50/20'
          }`}
        />
      )}
    </div>
  )
}

export { ExecutiveRoleVideoBackground }
