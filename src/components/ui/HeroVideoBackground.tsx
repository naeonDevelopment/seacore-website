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
  const [isLoaded, setIsLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Video files - your uploaded videos (fallback to gradient if missing)
  const videoSources = useMemo(() => [
    getAssetPath('site/assets/hero/1759135641996t4i0q3dh.mp4'),
    getAssetPath('site/assets/hero/17591356490610kxg0kjh.mp4'),
    getAssetPath('site/assets/hero/1759135665622nquhcb0h.mp4'),
    getAssetPath('site/assets/hero/1759135676680nncwpukn.mp4')
  ], [])
  
  // Enable videos - they will gracefully fallback to gradient if missing
  const [videosAvailable, setVideosAvailable] = useState(true) // Re-enabled with fixed paths
  const [failedAttempts, setFailedAttempts] = useState(0)

  // Reset video state when video sources change
  useEffect(() => {
    console.log('🔄 Video sources changed, resetting state')
    setVideosAvailable(true)
    setFailedAttempts(0)
    setIsLoaded(false)
    setCurrentVideoIndex(0)
  }, [videoSources])

  // Debug logging
  useEffect(() => {
    console.log('🎬 HeroVideoBackground initialized')
    console.log('📁 Video sources:', videoSources)
    console.log('🎯 Current video index:', currentVideoIndex)
    console.log('✅ Videos available:', videosAvailable)
    
    return () => {
      console.log('🔥 HeroVideoBackground unmounting')
    }
  }, [])

  // Debug isLoaded state changes
  useEffect(() => {
    console.log('🔄 isLoaded state changed:', isLoaded)
    console.log('👁️ Video opacity should be:', isLoaded ? 1 : 0)
  }, [isLoaded])

  // Cycle through videos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % videoSources.length)
    }, 8000) // 8 seconds per video

    return () => clearInterval(interval)
  }, [videoSources.length])

  // Handle video load
  const handleVideoLoad = () => {
    console.log('✅ Video loaded successfully:', videoSources[currentVideoIndex])
    console.log('🎬 Setting isLoaded to true')
    console.log('🔍 Current component state before setting loaded:', { currentVideoIndex, videosAvailable, failedAttempts })
    setIsLoaded(true)
  }

  // Handle video error (fallback to gradient gracefully)
  const handleVideoError = (error: any) => {
    console.log('❌ Video failed to load:', videoSources[currentVideoIndex], error)
    setIsLoaded(false)
    
    const newFailedAttempts = failedAttempts + 1
    setFailedAttempts(newFailedAttempts)
    
    // If all videos have failed, disable video background gracefully
    if (newFailedAttempts >= videoSources.length) {
      console.log('🚫 All videos failed, using gradient background')
      setVideosAvailable(false)
    } else {
      // Try next video after a delay to prevent rapid cycling
      setTimeout(() => {
        const nextIndex = (currentVideoIndex + 1) % videoSources.length
        console.log('🔄 Trying next video:', videoSources[nextIndex])
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
      {/* Fallback gradient background - always show at lowest z-index */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 z-0" />

      {/* Video Background - Only render if videos are available */}
      {videosAvailable && (
        <motion.video
          ref={videoRef}
          key={currentVideoIndex}
          className="absolute inset-0 w-full h-full object-cover z-10"
          autoPlay
          muted
          playsInline
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          onEnded={handleVideoEnd}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          style={{ 
            backgroundColor: 'transparent'
          }}
        >
          <source src={videoSources[currentVideoIndex]} type="video/mp4" />
        </motion.video>
      )}

      {/* Theme-Aware Gradient Overlay - only show over video */}
      {isLoaded && videosAvailable && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-20 ${
            isDarkMode
              ? 'bg-gradient-to-tl from-slate-900/60 via-slate-900/30 to-transparent'
              : 'bg-gradient-to-tl from-white/60 via-white/30 to-transparent'
          }`}
        />
      )}

      {/* Additional overlay for better text readability - only show over video */}
      {isLoaded && videosAvailable && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-30 ${
            isDarkMode
              ? 'bg-slate-900/10'
              : 'bg-white/10'
          }`}
        />
      )}
    </div>
  )
}

export { HeroVideoBackground }
