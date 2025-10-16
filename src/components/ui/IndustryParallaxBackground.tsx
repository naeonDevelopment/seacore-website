import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { getAssetPath } from '@/utils/assetPath'

interface IndustryParallaxBackgroundProps {
  isDarkMode?: boolean
  className?: string
}

const IndustryParallaxBackground: React.FC<IndustryParallaxBackgroundProps> = ({ 
  isDarkMode = false, 
  className = '' 
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Track scroll position relative to the container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })
  
  // Linear parallax effect - smooth upward movement with linear zoom in
  const y = useTransform(scrollYProgress, [0, 1], [0, -50])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15])
  
  // Image path - simple filename for better URL compatibility (no leading slash for Vite public assets)
  const imageSrc = getAssetPath('assets/section_industries/industry-background.png')

  // Debug logging
  useEffect(() => {
    console.log('🔍 IndustryParallaxBackground:', {
      imageSrc,
      isLoaded,
      isDarkMode
    })
  }, [isLoaded, isDarkMode])

  // Handle image load
  const handleImageLoad = () => {
    console.log('✅ Industry background image loaded successfully from:', imageSrc)
    setIsLoaded(true)
  }

  // Handle image error (fallback to gradient gracefully)
  const handleImageError = (error: any) => {
    console.log('❌ Industry background image failed to load from:', imageSrc)
    console.error('Error details:', error)
    setIsLoaded(false)
  }

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Fallback gradient background - always show - theme-aware gray gradient */}
      <div className={`absolute inset-0 z-0 transition-colors duration-500 ${
        isDarkMode
          ? 'bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900'
          : 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200'
      }`} />

      {/* Parallax Image Background */}
      <motion.div
        className="absolute inset-0 w-full h-full z-10"
        style={{ y, scale }}
      >
        <motion.img
          src={imageSrc}
          alt="Maritime Industry Background"
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

      {/* Theme-Aware Gradient Overlay - Industry branding colors (lighter for better visibility) */}
      {isLoaded && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-20 ${
            isDarkMode
              ? 'bg-gradient-to-tl from-slate-900/60 via-slate-900/40 to-slate-900/20'
              : 'bg-gradient-to-tl from-white/60 via-white/40 to-white/20'
          }`}
        />
      )}

      {/* Additional overlay for better text readability */}
      {isLoaded && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-30 ${
            isDarkMode
              ? 'bg-slate-900/10'
              : 'bg-white/10'
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

export { IndustryParallaxBackground }

