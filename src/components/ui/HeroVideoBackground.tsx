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
  // State for dual-video crossfade system
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [activeVideo, setActiveVideo] = useState<'A' | 'B'>('A')
  const [videoALoaded, setVideoALoaded] = useState(false)
  const [videoBLoaded, setVideoBLoaded] = useState(false)
  
  // Refs for video elements
  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)
  
  // Refs to access current state in interval (avoid dependency issues)
  const currentVideoIndexRef = useRef(currentVideoIndex)
  const activeVideoRef = useRef(activeVideo)
  const videoALoadedRef = useRef(videoALoaded)
  const videoBLoadedRef = useRef(videoBLoaded)
  
  // Video sources
  const videoSources = useMemo(() => [
    getAssetPath('assets/hero/h_h_1.mp4'),
    getAssetPath('assets/hero/h_h_2.mp4'),
    getAssetPath('assets/hero/h_h_3.mp4')
  ], [])
  
  const [videosAvailable, setVideosAvailable] = useState(true)
  const [failedVideos, setFailedVideos] = useState<Set<number>>(new Set())

  // Keep refs in sync with state
  useEffect(() => { currentVideoIndexRef.current = currentVideoIndex }, [currentVideoIndex])
  useEffect(() => { activeVideoRef.current = activeVideo }, [activeVideo])
  useEffect(() => { videoALoadedRef.current = videoALoaded }, [videoALoaded])
  useEffect(() => { videoBLoadedRef.current = videoBLoaded }, [videoBLoaded])

  // Component mount/unmount logging
  useEffect(() => {
    console.log('🎬 HeroVideoBackground: Initialized')
    return () => {
      console.log('🔥 HeroVideoBackground: Unmounting')
    }
  }, [])

  // Get next valid video index (skip failed videos)
  const getNextVideoIndex = (current: number): number => {
    let nextIndex = (current + 1) % videoSources.length
    let attempts = 0
    
    while (failedVideos.has(nextIndex) && attempts < videoSources.length) {
      nextIndex = (nextIndex + 1) % videoSources.length
      attempts++
    }
    
    return nextIndex
  }

  // Preload video into inactive element
  const preloadVideo = (videoRef: React.RefObject<HTMLVideoElement>, index: number) => {
    if (videoRef.current && !failedVideos.has(index)) {
      const src = videoSources[index]
      const fileName = src.split('/').pop()
      
      // Only load if different video
      if (!videoRef.current.src.includes(fileName || '')) {
        console.log(`📦 Preloading video ${index}: ${fileName}`)
        videoRef.current.src = src
        videoRef.current.load()
      }
    }
  }

  // STABLE interval - no dependencies, uses refs for current state
  useEffect(() => {
    const interval = setInterval(() => {
      // Access current state via refs
      const currentIndex = currentVideoIndexRef.current
      const currentActive = activeVideoRef.current
      const isVideoALoaded = videoALoadedRef.current
      const isVideoBLoaded = videoBLoadedRef.current
      
      // Check if all videos have failed
      if (failedVideos.size >= videoSources.length) {
        console.log('🚫 All videos failed, using gradient background')
        setVideosAvailable(false)
        return
      }
      
      const nextIndex = getNextVideoIndex(currentIndex)
      const inactiveVideoRef = currentActive === 'A' ? videoBRef : videoARef
      const isInactiveLoaded = currentActive === 'A' ? isVideoBLoaded : isVideoALoaded
      
      console.log(`🔄 Transition check: currentIndex=${currentIndex}, nextIndex=${nextIndex}, active=${currentActive}, inactiveLoaded=${isInactiveLoaded}`)
      
      // Only transition if inactive video is loaded and ready
      if (inactiveVideoRef.current && isInactiveLoaded) {
        console.log(`🎬 Transitioning from video ${currentIndex} to ${nextIndex}`)
        
        // Switch active video (triggers crossfade)
        setActiveVideo(prev => prev === 'A' ? 'B' : 'A')
        setCurrentVideoIndex(nextIndex)
        
        // Start playing the newly active video
        inactiveVideoRef.current.currentTime = 0
        inactiveVideoRef.current.play().catch(err => {
          console.error('▶️ Autoplay failed:', err)
        })
        
        // Preload the following video into the now-inactive element
        const followingIndex = getNextVideoIndex(nextIndex)
        const nowInactiveRef = currentActive === 'A' ? videoARef : videoBRef
        setTimeout(() => preloadVideo(nowInactiveRef, followingIndex), 1000)
      } else {
        console.log(`⏸️ Delaying transition - inactive video not ready`)
      }
    }, 8000) // 8 seconds per video

    return () => clearInterval(interval)
  }, [videoSources.length, failedVideos]) // Minimal dependencies

  // Handle video load events
  const handleVideoALoad = () => {
    console.log(`✅ Video A loaded (readyState: ${videoARef.current?.readyState})`)
    setVideoALoaded(true)
  }

  const handleVideoBLoad = () => {
    console.log(`✅ Video B loaded (readyState: ${videoBRef.current?.readyState})`)
    setVideoBLoaded(true)
  }

  // Handle video errors
  const handleVideoError = (videoId: 'A' | 'B', index: number) => {
    console.log(`❌ Video ${videoId} (index ${index}) failed to load`)
    
    setFailedVideos(prev => new Set(prev).add(index))
    
    if (videoId === 'A') {
      setVideoALoaded(false)
    } else {
      setVideoBLoaded(false)
    }
    
    // If too many videos failed, disable video background
    if (failedVideos.size + 1 >= videoSources.length) {
      console.log('🚫 Too many video failures, using gradient background')
      setVideosAvailable(false)
    }
  }

  // Handle video end - loop current video
  const handleVideoEnd = (videoRef: React.RefObject<HTMLVideoElement>) => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(err => {
        console.error('▶️ Loop playback failed:', err)
      })
    }
  }

  // Initialize first video on mount - ONLY ONCE
  useEffect(() => {
    console.log('🚀 Initializing first video...')
    if (videoARef.current) {
      const firstVideoSrc = videoSources[0]
      console.log(`📹 Loading first video: ${firstVideoSrc}`)
      videoARef.current.src = firstVideoSrc
      videoARef.current.load()
      
      // Preload second video after brief delay
      setTimeout(() => {
        console.log('⏰ Preloading second video')
        preloadVideo(videoBRef, 1)
      }, 2000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty array - run only on mount

  const isAnyVideoLoaded = videoALoaded || videoBLoaded

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Fallback gradient background - always visible */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 z-0" />

      {/* Dual Video Elements for Seamless Crossfade */}
      {videosAvailable && (
        <>
          {/* Video A */}
          <motion.video
            ref={videoARef}
            className="absolute inset-0 w-full h-full z-10"
            autoPlay
            muted
            playsInline
            preload="auto"
            onLoadedData={handleVideoALoad}
            onError={() => handleVideoError('A', activeVideo === 'A' ? currentVideoIndex : getNextVideoIndex(currentVideoIndex))}
            onEnded={() => handleVideoEnd(videoARef)}
            animate={{ opacity: activeVideo === 'A' && videoALoaded ? 1 : 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            style={{ 
              backgroundColor: 'transparent',
              objectFit: 'cover',
              objectPosition: 'center center',
              position: 'absolute',
              pointerEvents: 'none'
            }}
          />

          {/* Video B */}
          <motion.video
            ref={videoBRef}
            className="absolute inset-0 w-full h-full z-10"
            autoPlay={false}
            muted
            playsInline
            preload="auto"
            onLoadedData={handleVideoBLoad}
            onError={() => handleVideoError('B', activeVideo === 'B' ? currentVideoIndex : getNextVideoIndex(currentVideoIndex))}
            onEnded={() => handleVideoEnd(videoBRef)}
            animate={{ opacity: activeVideo === 'B' && videoBLoaded ? 1 : 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            style={{ 
              backgroundColor: 'transparent',
              objectFit: 'cover',
              objectPosition: 'center center',
              position: 'absolute',
              pointerEvents: 'none'
            }}
          />
        </>
      )}

      {/* Theme-Aware Gradient Overlay - only show over video */}
      {isAnyVideoLoaded && videosAvailable && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-20 ${
            isDarkMode
              ? 'bg-gradient-to-tl from-slate-900/60 via-slate-900/30 to-transparent'
              : 'bg-gradient-to-tl from-white/60 via-white/30 to-transparent'
          }`}
        />
      )}

      {/* Additional overlay for better text readability - only show over video */}
      {isAnyVideoLoaded && videosAvailable && (
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
