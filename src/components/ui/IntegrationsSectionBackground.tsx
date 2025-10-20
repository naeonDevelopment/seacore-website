import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

interface IntegrationsSectionBackgroundProps {
  isDarkMode: boolean
}

// Helper function to get asset path
const getAssetPath = (path: string) => {
  // Assets are always in /assets/
  return `/${path}`
}

export const IntegrationsSectionBackground: React.FC<IntegrationsSectionBackgroundProps> = ({ isDarkMode }) => {
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
  
  // Use Platform hero image for integrations section
  const imageSrc = getAssetPath('assets/hero_platform/Generated Image October 06, 2025 - 5_12PM.png')

  // Handle image load
  const handleImageLoad = () => {
    setIsLoaded(true)
  }

  // Handle image error
  const handleImageError = () => {
    setIsLoaded(false)
  }

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden z-0">
      {/* Fallback gradient background - theme-aware */}
      <div className={`absolute inset-0 transition-colors duration-500 ${
        isDarkMode
          ? 'bg-gradient-to-br from-slate-800 via-cyan-950 to-indigo-950'
          : 'bg-gradient-to-br from-slate-100 via-cyan-50 to-indigo-50'
      }`} />

      {/* Parallax Image Background */}
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={{ y, scale }}
      >
        <motion.img
          src={imageSrc}
          alt="Integration Background"
          className={`absolute inset-0 w-full h-full ${
            isMobile ? 'object-contain' : 'object-cover'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.8 }}
          style={{ 
            backgroundColor: 'transparent',
            objectPosition: isMobile ? 'center center' : 'center center'
          }}
        />
      </motion.div>

      {/* Theme-Aware Gradient Overlay - Integration theme colors */}
      {isLoaded && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
            isDarkMode
              ? 'bg-gradient-to-tl from-slate-900/60 via-cyan-900/40 to-indigo-900/20'
              : 'bg-gradient-to-tl from-white/60 via-cyan-50/40 to-indigo-50/20'
          }`}
        />
      )}

      {/* Additional overlay for better text readability */}
      {isLoaded && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
            isDarkMode
              ? 'bg-slate-900/10'
              : 'bg-white/10'
          }`}
        />
      )}

      {/* Subtle gradient vignette for depth */}
      <div className={`absolute inset-0 pointer-events-none ${
        isDarkMode
          ? 'bg-gradient-radial from-transparent via-transparent to-slate-950/20'
          : 'bg-gradient-radial from-transparent via-transparent to-slate-900/5'
      }`} />
    </div>
  )
}
