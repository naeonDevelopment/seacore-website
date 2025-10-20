import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { getAssetPath } from '@/utils/assetPath'

interface ArchitectureParallaxBackgroundProps {
  isDarkMode?: boolean
  className?: string
}

const ArchitectureParallaxBackground: React.FC<ArchitectureParallaxBackgroundProps> = ({ 
  isDarkMode = false, 
  className = '' 
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Detect mobile viewport
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Track scroll position relative to the container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })
  
  // Reduced parallax effect on mobile for better visibility
  const y = useTransform(scrollYProgress, [0, 1], isMobile ? [0, -20] : [0, -50])
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [1, 1.05] : [1, 1.15])
  
  // Use architecture section image
  const imageSrc = getAssetPath('assets/section_architecture/Generated Image October 05, 2025 - 7_33PM.png')

  // Debug logging
  useEffect(() => {
    console.log('🔍 ArchitectureParallaxBackground:', {
      imageSrc,
      isLoaded,
      isDarkMode
    })
  }, [isLoaded, isDarkMode])

  // Handle image load
  const handleImageLoad = () => {
    console.log('✅ Architecture background image loaded successfully from:', imageSrc)
    setIsLoaded(true)
  }

  // Handle image error (fallback to gradient gracefully)
  const handleImageError = (error: any) => {
    console.log('❌ Architecture background image failed to load from:', imageSrc)
    console.error('Error details:', error)
    setIsLoaded(false)
  }

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Fallback gradient background - always show - theme-aware */}
      <div className={`absolute inset-0 z-0 transition-colors duration-500 ${
        isDarkMode
          ? 'bg-gradient-to-br from-slate-800 via-blue-950 to-cyan-950'
          : 'bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50'
      }`} />

      {/* Parallax Image Background */}
      <motion.div
        className="absolute inset-0 w-full h-full z-10"
        style={{ y, scale }}
      >
        <motion.img
          src={imageSrc}
          alt="System Architecture Background"
          className="absolute inset-0 w-full h-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.8 }}
          style={{ 
            backgroundColor: 'transparent'
          }}
        />
      </motion.div>

      {/* Theme-Aware Gradient Overlay - Architecture theme colors */}
      {isLoaded && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-20 ${
            isDarkMode
              ? 'bg-gradient-to-tl from-slate-900/70 via-blue-900/50 to-cyan-900/30'
              : 'bg-gradient-to-tl from-white/70 via-blue-50/50 to-cyan-50/30'
          }`}
        />
      )}

      {/* Additional overlay for better text readability */}
      {isLoaded && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-30 ${
            isDarkMode
              ? 'bg-slate-900/20'
              : 'bg-white/20'
          }`}
        />
      )}

      {/* Subtle gradient vignette for depth */}
      <div className={`absolute inset-0 pointer-events-none z-40 ${
        isDarkMode
          ? 'bg-gradient-radial from-transparent via-transparent to-slate-950/30'
          : 'bg-gradient-radial from-transparent via-transparent to-slate-900/10'
      }`} />
    </div>
  )
}

export { ArchitectureParallaxBackground }
