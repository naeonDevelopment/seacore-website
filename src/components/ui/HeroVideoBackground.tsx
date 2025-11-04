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

  // Handle video time update - transition with smooth overlap
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
    const OVERLAP_DURATION = 1.5 // Start crossfade 1.5 seconds before end
    
    // Preload next video early (3 seconds before end)
    if (timeRemaining <= PRELOAD_TIME && timeRemaining > (PRELOAD_TIME - 0.3)) {
      const inactiveVideo = getInactiveVideo()
      const inactiveIndexRef = getInactiveIndexRef()
      const nextIndex = getNextIndex()
      
      // Preload if not already loaded
      if (inactiveVideo.current && inactiveIndexRef.current !== nextIndex) {
        console.log(`📥 Early preloading video ${nextIndex} (${timeRemaining.toFixed(2)}s remaining)`)
        inactiveIndexRef.current = nextIndex
        inactiveVideo.current.src = videoSources[nextIndex]
        inactiveVideo.current.load()
      }
    }
    
    // Start transition 1.5 seconds before end (with buffer to prevent multiple triggers)
    if (timeRemaining <= OVERLAP_DURATION && timeRemaining > (OVERLAP_DURATION - 0.2)) {
      isTransitioningRef.current = true
      
      const inactiveVideo = getInactiveVideo()
      const inactiveIndexRef = getInactiveIndexRef()
      const nextIndex = getNextIndex()
      
      console.log(`🔄 Video ${currentIndex} - ${timeRemaining.toFixed(2)}s remaining, starting overlap transition to ${nextIndex}`)
      
      // Ensure next video is loaded in inactive player
      if (inactiveVideo.current) {
        // If wrong video is loaded, load the correct one
        if (inactiveIndexRef.current !== nextIndex) {
          console.log(`📥 Loading video ${nextIndex} into inactive player`)
          inactiveIndexRef.current = nextIndex
          inactiveVideo.current.src = videoSources[nextIndex]
          inactiveVideo.current.load()
          
          // Wait for video to be fully ready before playing (use canplaythrough for smoother playback)
          const handleCanPlay = () => {
            // Small delay to ensure video is fully ready
            setTimeout(() => {
              inactiveVideo.current!.currentTime = 0
              inactiveVideo.current!.play()
                .then(() => {
                  console.log(`✅ Started playing video ${nextIndex} (overlapping with video ${currentIndex})`)
                  
                  // Ensure outgoing video continues playing during crossfade
                  const outgoingVideo = activePlayer === 'A' ? videoARef.current : videoBRef.current
                  if (outgoingVideo && outgoingVideo.paused) {
                    outgoingVideo.play().catch(() => {})
                  }
                  
                  // Small delay before crossfade to ensure new video is playing smoothly
                  setTimeout(() => {
                    // Start crossfade - both videos playing during overlap
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
                    }, 1500) // Match crossfade duration
                  }, 100) // Small delay to ensure smooth playback start
                })
                .catch(e => {
                  console.error(`❌ Play error for video ${nextIndex}:`, e)
                  isTransitioningRef.current = false
                })
            }, 50) // Small delay to ensure video is ready
            inactiveVideo.current?.removeEventListener('canplaythrough', handleCanPlay)
            inactiveVideo.current?.removeEventListener('canplay', handleCanPlay)
          }
          
          // Prefer canplaythrough for smoother playback, fallback to canplay
          if (inactiveVideo.current.readyState >= 3) {
            // Already ready, play immediately
            handleCanPlay()
          } else {
            inactiveVideo.current.addEventListener('canplaythrough', handleCanPlay, { once: true })
            inactiveVideo.current.addEventListener('canplay', handleCanPlay, { once: true })
          }
        } else {
          // Video already preloaded, ensure it's ready and play it
          if (inactiveVideo.current.readyState >= 3) {
            // Video is ready, play it
            inactiveVideo.current.currentTime = 0
            inactiveVideo.current.play()
              .then(() => {
                console.log(`✅ Started playing preloaded video ${nextIndex} (overlapping with video ${currentIndex})`)
                
                // Ensure outgoing video continues playing during crossfade
                const outgoingVideo = activePlayer === 'A' ? videoARef.current : videoBRef.current
                if (outgoingVideo && outgoingVideo.paused) {
                  outgoingVideo.play().catch(() => {})
                }
                
                // Small delay before crossfade to ensure smooth playback
                setTimeout(() => {
                  // Start crossfade - both videos playing during overlap
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
                  }, 1500) // Match crossfade duration
                }, 100) // Small delay to ensure smooth playback start
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
                  console.log(`✅ Started playing video ${nextIndex} (overlapping with video ${currentIndex})`)
                  
                  const outgoingVideo = activePlayer === 'A' ? videoARef.current : videoBRef.current
                  if (outgoingVideo && outgoingVideo.paused) {
                    outgoingVideo.play().catch(() => {})
                  }
                  
                  setTimeout(() => {
                    setActivePlayer(prev => {
                      const newPlayer = prev === 'A' ? 'B' : 'A'
                      setCurrentVideoIndex(nextIndex)
                      console.log(`✅ Crossfade started to player ${newPlayer}, showing video ${nextIndex}`)
                      return newPlayer
                    })
                    
                    setTimeout(() => {
                      isTransitioningRef.current = false
                      console.log(`✅ Transition complete, video ${nextIndex} is now active`)
                    }, 1500)
                  }, 100)
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
        transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
        onEnded={() => {
          // Handle video ending naturally - ensure smooth transition
          if (activePlayer === 'A' && videoAIndexRef.current === currentVideoIndex) {
            console.log('📼 Video A ended naturally')
            // If transition hasn't started yet, trigger it
            if (!isTransitioningRef.current) {
              handleTimeUpdate('A')
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
          // Handle video ending naturally - ensure smooth transition
          if (activePlayer === 'B' && videoBIndexRef.current === currentVideoIndex) {
            console.log('📼 Video B ended naturally')
            // If transition hasn't started yet, trigger it
            if (!isTransitioningRef.current) {
              handleTimeUpdate('B')
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
