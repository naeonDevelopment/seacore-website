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
  
  // Executive Role section videos
  const videoSources = useMemo(() => [
    getAssetPath('assets/section_experts/vid_section_experts1.mp4'),
    getAssetPath('assets/section_experts/vid_section_experts_2.mp4')
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
    console.log('🎬 ExecutiveRoleVideoBackground: Initialized')
    return () => {
      console.log('🔥 ExecutiveRoleVideoBackground: Unmounting')
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
        console.log(`📦 ExecutiveRole: Preloading video ${index}: ${fileName}`)
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
        console.log('🚫 ExecutiveRole: All videos failed, using gradient background')
        setVideosAvailable(false)
        return
      }
      
      const nextIndex = getNextVideoIndex(currentIndex)
      const inactiveVideoRef = currentActive === 'A' ? videoBRef : videoARef
      const isInactiveLoaded = currentActive === 'A' ? isVideoBLoaded : isVideoALoaded
      
      console.log(`🔄 ExecutiveRole: Transition check: currentIndex=${currentIndex}, nextIndex=${nextIndex}, active=${currentActive}, inactiveLoaded=${isInactiveLoaded}`)
      
      // Only transition if inactive video is loaded and ready
      if (inactiveVideoRef.current && isInactiveLoaded) {
        console.log(`🎬 ExecutiveRole: Transitioning from video ${currentIndex} to ${nextIndex}`)
        
        // Switch active video (triggers crossfade)
        setActiveVideo(prev => prev === 'A' ? 'B' : 'A')
        setCurrentVideoIndex(nextIndex)
        
        // Start playing the newly active video
        inactiveVideoRef.current.currentTime = 0
        inactiveVideoRef.current.play().catch(err => {
          console.error('▶️ ExecutiveRole: Autoplay failed:', err)
        })
        
        // Preload the following video into the now-inactive element
        const followingIndex = getNextVideoIndex(nextIndex)
        const nowInactiveRef = currentActive === 'A' ? videoARef : videoBRef
        setTimeout(() => preloadVideo(nowInactiveRef, followingIndex), 1000)
      } else {
        console.log(`⏸️ ExecutiveRole: Delaying transition - inactive video not ready`)
      }
    }, 12000) // 12 seconds per video for executive section

    return () => clearInterval(interval)
  }, [videoSources.length, failedVideos]) // Minimal dependencies

  // Handle video load events
  const handleVideoALoad = () => {
    console.log(`✅ ExecutiveRole: Video A loaded (readyState: ${videoARef.current?.readyState})`)
    setVideoALoaded(true)
  }

  const handleVideoBLoad = () => {
    console.log(`✅ ExecutiveRole: Video B loaded (readyState: ${videoBRef.current?.readyState})`)
    setVideoBLoaded(true)
  }

  // Handle video errors
  const handleVideoError = (videoId: 'A' | 'B', index: number) => {
    console.log(`❌ ExecutiveRole: Video ${videoId} (index ${index}) failed to load`)
    
    setFailedVideos(prev => new Set(prev).add(index))
    
    if (videoId === 'A') {
      setVideoALoaded(false)
    } else {
      setVideoBLoaded(false)
    }
    
    // If too many videos failed, disable video background
    if (failedVideos.size + 1 >= videoSources.length) {
      console.log('🚫 ExecutiveRole: Too many video failures, using gradient background')
      setVideosAvailable(false)
    }
  }

  // Handle video end - loop current video
  const handleVideoEnd = (videoRef: React.RefObject<HTMLVideoElement>) => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(err => {
        console.error('▶️ ExecutiveRole: Loop playback failed:', err)
      })
    }
  }

  // Initialize first video on mount - ONLY ONCE
  useEffect(() => {
    console.log('🚀 ExecutiveRole: Initializing first video...')
    if (videoARef.current) {
      const firstVideoSrc = videoSources[0]
      console.log(`📹 ExecutiveRole: Loading first video: ${firstVideoSrc}`)
      videoARef.current.src = firstVideoSrc
      videoARef.current.load()
      
      // Preload second video after brief delay (if more than 1 video)
      if (videoSources.length > 1) {
        setTimeout(() => {
          console.log('⏰ ExecutiveRole: Preloading second video')
          preloadVideo(videoBRef, 1)
        }, 2000)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty array - run only on mount

  const isAnyVideoLoaded = videoALoaded || videoBLoaded

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Fallback gradient background - always visible - Executive theme colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-900 dark:to-emerald-950/30 z-0" />

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
            transition={{ duration: 1.2, ease: 'easeInOut' }}
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
            transition={{ duration: 1.2, ease: 'easeInOut' }}
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

      {/* Theme-Aware Gradient Overlay - Executive branding colors */}
      {isAnyVideoLoaded && videosAvailable && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-20 ${
            isDarkMode
              ? 'bg-gradient-to-tl from-slate-900/70 via-emerald-900/20 to-transparent'
              : 'bg-gradient-to-tl from-white/70 via-emerald-50/40 to-transparent'
          }`}
        />
      )}

      {/* Additional overlay for better text readability - Executive theme */}
      {isAnyVideoLoaded && videosAvailable && (
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
