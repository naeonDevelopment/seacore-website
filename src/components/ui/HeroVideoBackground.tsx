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
  const videoAIndexRef = useRef<number>(0) // Track which video is loaded in player A
  const videoBIndexRef = useRef<number>(-1) // Track which video is loaded in player B (-1 = none)

  const videoSources = useMemo(() => [
    getAssetPath('assets/hero/h_h_1.mp4'),
    getAssetPath('assets/hero/h_h_2.mp4'),
    getAssetPath('assets/hero/h_h_3.mp4')
  ], [])

  // Get the inactive video ref and next video index
  const getInactiveVideo = () => {
    return activePlayer === 'A' ? videoBRef : videoARef
  }

  const getInactiveIndexRef = () => {
    return activePlayer === 'A' ? videoBIndexRef : videoAIndexRef
  }

  const getActiveIndexRef = () => {
    return activePlayer === 'A' ? videoAIndexRef : videoBIndexRef
  }

  const getNextIndex = () => {
    return (currentVideoIndex + 1) % videoSources.length
  }

  // Handle video time update - sequential playback with preloading
  const handleTimeUpdate = (player: 'A' | 'B') => {
    // Only handle if this is the active player and we're not already transitioning
    if (isTransitioningRef.current || player !== activePlayer) return
    
    const activeVideo = player === 'A' ? videoARef.current : videoBRef.current
    if (!activeVideo || !activeVideo.duration) return
    
    const activeIndexRef = getActiveIndexRef()
    const currentIndex = activeIndexRef.current
    
    // Only process if this is the current active video
    if (currentIndex !== currentVideoIndex) return
    
    const timeRemaining = activeVideo.duration - activeVideo.currentTime
    const PRELOAD_TIME = 3.0 // Start loading next video 3 seconds before end
    const TRANSITION_TIME = 0.2 // Start transition 0.2 seconds before end (sequential, not overlapping)
    
    // Preload next video early (3 seconds before end) - but don't play it yet
    if (timeRemaining <= PRELOAD_TIME && timeRemaining > (PRELOAD_TIME - 0.3)) {
      const inactiveVideo = getInactiveVideo()
      const inactiveIndexRef = getInactiveIndexRef()
      const nextIndex = getNextIndex()
      
      // Preload if not already loaded
      if (inactiveVideo.current && inactiveIndexRef.current !== nextIndex) {
        console.log(`📥 Preloading video ${nextIndex} (${timeRemaining.toFixed(2)}s remaining)`)
        inactiveIndexRef.current = nextIndex
        inactiveVideo.current.src = videoSources[nextIndex]
        inactiveVideo.current.load()
        // Don't play it yet - just preload
      }
    }
    
    // Start transition right before end (sequential playback, not overlapping)
    if (timeRemaining <= TRANSITION_TIME && timeRemaining > 0.05) {
      isTransitioningRef.current = true
      
      const inactiveVideo = getInactiveVideo()
      const inactiveIndexRef = getInactiveIndexRef()
      const nextIndex = getNextIndex()
      
      console.log(`🔄 Video ${currentIndex} ending, transitioning to ${nextIndex} (sequential playback)`)
      
      // Pause the outgoing video first (sequential, not overlapping)
      const outgoingVideo = activePlayer === 'A' ? videoARef.current : videoBRef.current
      if (outgoingVideo) {
        outgoingVideo.pause()
      }
      
      // Ensure next video is loaded in inactive player
      if (inactiveVideo.current) {
        // If wrong video is loaded, load the correct one
        if (inactiveIndexRef.current !== nextIndex) {
          console.log(`📥 Loading video ${nextIndex} into inactive player`)
          inactiveIndexRef.current = nextIndex
          inactiveVideo.current.src = videoSources[nextIndex]
          inactiveVideo.current.load()
          
          // Wait for video to be fully ready before playing
          const handleCanPlay = () => {
            inactiveVideo.current!.currentTime = 0
            inactiveVideo.current!.play()
              .then(() => {
                console.log(`✅ Started playing video ${nextIndex} (sequential, after video ${currentIndex})`)
                
                // Start crossfade immediately - only new video playing
                setActivePlayer(prev => {
                  const newPlayer = prev === 'A' ? 'B' : 'A'
                  setCurrentVideoIndex(nextIndex)
                  console.log(`✅ Crossfade started to player ${newPlayer}, showing video ${nextIndex}`)
                  return newPlayer
                })
                
                // Reset transition flag after crossfade completes
                setTimeout(() => {
                  isTransitioningRef.current = false
                  console.log(`✅ Transition complete, video ${nextIndex} is now active`)
                }, 800) // Faster crossfade for sequential playback
              })
              .catch(e => {
                console.error(`❌ Play error for video ${nextIndex}:`, e)
                isTransitioningRef.current = false
              })
            inactiveVideo.current?.removeEventListener('canplaythrough', handleCanPlay)
            inactiveVideo.current?.removeEventListener('canplay', handleCanPlay)
          }
          
          // Prefer canplaythrough for smoother playback, fallback to canplay
          if (inactiveVideo.current.readyState >= 3) {
            handleCanPlay()
          } else {
            inactiveVideo.current.addEventListener('canplaythrough', handleCanPlay, { once: true })
            inactiveVideo.current.addEventListener('canplay', handleCanPlay, { once: true })
          }
        } else {
          // Video already preloaded, play it sequentially
          if (inactiveVideo.current.readyState >= 3) {
            inactiveVideo.current.currentTime = 0
            inactiveVideo.current.play()
              .then(() => {
                console.log(`✅ Started playing preloaded video ${nextIndex} (sequential, after video ${currentIndex})`)
                
                // Start crossfade immediately - only new video playing
                setActivePlayer(prev => {
                  const newPlayer = prev === 'A' ? 'B' : 'A'
                  setCurrentVideoIndex(nextIndex)
                  console.log(`✅ Crossfade started to player ${newPlayer}, showing video ${nextIndex}`)
                  return newPlayer
                })
                
                // Reset transition flag after crossfade completes
                setTimeout(() => {
                  isTransitioningRef.current = false
                  console.log(`✅ Transition complete, video ${nextIndex} is now active`)
                }, 800) // Faster crossfade for sequential playback
              })
              .catch(e => {
                console.error(`❌ Play error for video ${nextIndex}:`, e)
                isTransitioningRef.current = false
              })
          } else {
            // Video not quite ready yet, wait for it
            const handleReady = () => {
              inactiveVideo.current!.currentTime = 0
              inactiveVideo.current!.play()
                .then(() => {
                  console.log(`✅ Started playing video ${nextIndex} (sequential, after video ${currentIndex})`)
                  
                  setActivePlayer(prev => {
                    const newPlayer = prev === 'A' ? 'B' : 'A'
                    setCurrentVideoIndex(nextIndex)
                    console.log(`✅ Crossfade started to player ${newPlayer}, showing video ${nextIndex}`)
                    return newPlayer
                  })
                  
                  setTimeout(() => {
                    isTransitioningRef.current = false
                    console.log(`✅ Transition complete, video ${nextIndex} is now active`)
                  }, 800)
                })
                .catch(e => {
                  console.error(`❌ Play error for video ${nextIndex}:`, e)
                  isTransitioningRef.current = false
                })
              inactiveVideo.current?.removeEventListener('canplaythrough', handleReady)
              inactiveVideo.current?.removeEventListener('canplay', handleReady)
            }
            
            inactiveVideo.current.addEventListener('canplaythrough', handleReady, { once: true })
            inactiveVideo.current.addEventListener('canplay', handleReady, { once: true })
          }
        }
      }
    }
  }

  // Intersection Observer - only pauses when out of view, doesn't interfere with transitions
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            // Pause both videos when out of view
            videoARef.current?.pause()
            videoBRef.current?.pause()
          } else {
            // When in view, ensure BOTH videos are playing (for smooth overlap)
            // Don't interfere during transitions
            if (!isTransitioningRef.current) {
              const activeVideo = activePlayer === 'A' ? videoARef.current : videoBRef.current
              const inactiveVideo = activePlayer === 'A' ? videoBRef.current : videoARef.current
              
              // Play active video
              if (activeVideo && activeVideo.paused) {
                activeVideo.play().catch(() => {})
              }
              
              // Play inactive video if it's currently playing (during overlap)
              // This ensures smooth transitions aren't interrupted
              if (inactiveVideo && !inactiveVideo.paused && !inactiveVideo.ended) {
                // Already playing, don't interfere
              }
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
    
    // Initialize video A with first video
    if (videoARef.current) {
      const videoA = videoARef.current
      videoAIndexRef.current = 0
      console.log('🎬 Loading video 0 into player A:', videoSources[0])
      videoA.src = videoSources[0]
      videoA.load()
      
      let hasPlayed = false
      
      // Multiple fallback strategies for playback
      const attemptPlay = () => {
        if (hasPlayed) return
        hasPlayed = true
        
        console.log('✅ Video 0 ready, attempting to play')
        videoA.play()
          .then(() => {
            console.log('✅ Video 0 playing successfully in player A')
          })
          .catch(e => {
            console.error('❌ Play error for video 0:', e)
            hasPlayed = false
          })
      }
      
      // Try multiple events to ensure playback starts
      videoA.addEventListener('canplaythrough', attemptPlay, { once: true })
      videoA.addEventListener('canplay', attemptPlay, { once: true })
      videoA.addEventListener('loadeddata', () => {
        console.log('📦 Video 0 loaded data')
        setTimeout(() => {
          if (!hasPlayed && videoA.readyState >= 2) {
            attemptPlay()
          }
        }, 500)
      }, { once: true })
      
      // Error handling
      videoA.addEventListener('error', (e) => {
        console.error('❌ Video A error:', e)
        const error = videoA.error
        if (error) {
          console.error('Video A error code:', error.code)
          console.error('Video A error message:', error.message)
        }
      })
      
      // Timeout fallback
      setTimeout(() => {
        if (!hasPlayed && videoA.readyState >= 2) {
          console.log('⏱️ Timeout fallback: attempting to play video 0')
          attemptPlay()
        }
      }, 2000)
    }
    
    // Preload second video into player B with aggressive preloading
    if (videoBRef.current && videoSources.length > 1) {
      videoBIndexRef.current = 1
      console.log('🎬 Preloading video 1 into player B:', videoSources[1])
      videoBRef.current.src = videoSources[1]
      videoBRef.current.load()
      
      // Wait for video 1 to be ready to ensure smooth transition
      videoBRef.current.addEventListener('canplaythrough', () => {
        console.log('✅ Video 1 fully preloaded and ready')
      }, { once: true })
    }
  }, [videoSources])

  // Preload next video when transition completes
  // Note: We don't pause the inactive video to allow smooth overlap
  useEffect(() => {
    // After transition completes, preload the next video into the now-inactive player
    const nextIndex = (currentVideoIndex + 1) % videoSources.length
    const inactiveVideo = getInactiveVideo()
    const inactiveIndexRef = getInactiveIndexRef()
    
    // Preload next video if not already loaded
    if (inactiveVideo.current && inactiveIndexRef.current !== nextIndex) {
      console.log(`🎬 Preloading next video ${nextIndex} into inactive player`)
      inactiveIndexRef.current = nextIndex
      inactiveVideo.current.src = videoSources[nextIndex]
      inactiveVideo.current.load()
      
      // Wait for video to be ready for smooth playback
      inactiveVideo.current.addEventListener('canplaythrough', () => {
        console.log(`✅ Video ${nextIndex} fully preloaded and ready`)
      }, { once: true })
    }
    
    // Don't pause the outgoing video - let it play until it naturally ends
    // This ensures smooth overlap during the crossfade
  }, [currentVideoIndex, activePlayer, videoSources])

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
        autoPlay
        preload="auto"
        onTimeUpdate={() => handleTimeUpdate('A')}
        onError={(e) => {
          console.error('❌ Video A error:', e)
          const video = videoARef.current
          if (video?.error) {
            console.error('Video A error code:', video.error.code)
            console.error('Video A error message:', video.error.message)
          }
        }}
        animate={{ opacity: activePlayer === 'A' ? 1 : 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        onEnded={() => {
          // Handle video ending naturally - trigger sequential transition
          if (activePlayer === 'A' && videoAIndexRef.current === currentVideoIndex && !isTransitioningRef.current) {
            console.log('📼 Video A ended naturally, triggering sequential transition')
            isTransitioningRef.current = true
            
            const inactiveVideo = getInactiveVideo()
            const inactiveIndexRef = getInactiveIndexRef()
            const nextIndex = getNextIndex()
            
            // Pause the outgoing video
            if (videoARef.current) {
              videoARef.current.pause()
            }
            
            // Start next video
            if (inactiveVideo.current && inactiveIndexRef.current === nextIndex) {
              inactiveVideo.current.currentTime = 0
              inactiveVideo.current.play()
                .then(() => {
                  console.log(`✅ Started playing video ${nextIndex} after video ${currentVideoIndex} ended`)
                  setActivePlayer(prev => prev === 'A' ? 'B' : 'A')
                  setCurrentVideoIndex(nextIndex)
                  setTimeout(() => {
                    isTransitioningRef.current = false
                  }, 800)
                })
                .catch(e => {
                  console.error(`❌ Play error:`, e)
                  isTransitioningRef.current = false
                })
            }
          }
        }}
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
        autoPlay
        preload="auto"
        onTimeUpdate={() => handleTimeUpdate('B')}
        onEnded={() => {
          // Handle video ending naturally - trigger sequential transition
          if (activePlayer === 'B' && videoBIndexRef.current === currentVideoIndex && !isTransitioningRef.current) {
            console.log('📼 Video B ended naturally, triggering sequential transition')
            isTransitioningRef.current = true
            
            const inactiveVideo = getInactiveVideo()
            const inactiveIndexRef = getInactiveIndexRef()
            const nextIndex = getNextIndex()
            
            // Pause the outgoing video
            if (videoBRef.current) {
              videoBRef.current.pause()
            }
            
            // Start next video
            if (inactiveVideo.current && inactiveIndexRef.current === nextIndex) {
              inactiveVideo.current.currentTime = 0
              inactiveVideo.current.play()
                .then(() => {
                  console.log(`✅ Started playing video ${nextIndex} after video ${currentVideoIndex} ended`)
                  setActivePlayer(prev => prev === 'A' ? 'B' : 'A')
                  setCurrentVideoIndex(nextIndex)
                  setTimeout(() => {
                    isTransitioningRef.current = false
                  }, 800)
                })
                .catch(e => {
                  console.error(`❌ Play error:`, e)
                  isTransitioningRef.current = false
                })
            }
          }
        }}
        onError={(e) => {
          console.error('❌ Video B error:', e)
          const video = videoBRef.current
          if (video?.error) {
            console.error('Video B error code:', video.error.code)
            console.error('Video B error message:', video.error.message)
          }
        }}
        animate={{ opacity: activePlayer === 'B' ? 1 : 0 }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
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
