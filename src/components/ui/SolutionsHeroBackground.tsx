import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getAssetPath } from '@/utils/assetPath'

interface SolutionsHeroBackgroundProps {
  isDarkMode?: boolean
  className?: string
}

const SolutionsHeroBackground: React.FC<SolutionsHeroBackgroundProps> = ({ 
  isDarkMode = false, 
  className = '' 
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Use light image for hero (dark image is used in Architecture section)
  const imageSrc = getAssetPath('assets/hero_solutions/Generated Image October 05, 2025 - 2_47PM.png')

  // Debug logging
  useEffect(() => {
    console.log('🔍 SolutionsHeroBackground:', {
      imageSrc,
      isLoaded,
      isDarkMode
    })
  }, [isLoaded, isDarkMode])

  // Handle image load
  const handleImageLoad = () => {
    console.log('✅ Solutions hero image loaded successfully from:', imageSrc)
    setIsLoaded(true)
  }

  // Handle image error (fallback to gradient gracefully)
  const handleImageError = (error: any) => {
    console.log('❌ Solutions hero image failed to load from:', imageSrc)
    console.error('Error details:', error)
    setIsLoaded(false)
  }

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Fallback gradient background - always show - theme-aware gradient */}
      <div className={`absolute inset-0 z-0 transition-colors duration-500 ${
        isDarkMode
          ? 'bg-gradient-to-br from-indigo-950/50 via-purple-950/30 to-pink-950/20'
          : 'bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/20'
      }`} />

      {/* Static Image Background */}
      <motion.div
        className="absolute inset-0 w-full h-full z-10"
        style={{
          transform: 'translateZ(0)'
        }}
      >
        <motion.img
          src={imageSrc}
          alt="Solutions Hero Background"
          className="absolute inset-0 w-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ 
            duration: 0.6,
            ease: [0.25, 0.1, 0.25, 1.0]
          }}
          style={{ 
            backgroundColor: 'transparent',
            willChange: 'opacity',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            height: '110%',
            top: 0,
            objectPosition: 'center top'
          }}
        />
      </motion.div>

      {/* Theme-Aware Gradient Overlay for better text readability */}
      {isLoaded && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-20 ${
            isDarkMode
              ? 'bg-gradient-to-t from-slate-900/70 via-slate-900/40 to-slate-900/20'
              : 'bg-gradient-to-t from-white/70 via-white/40 to-white/20'
          }`}
          style={{
            willChange: 'opacity',
            transform: 'translateZ(0)'
          }}
        />
      )}

      {/* Additional overlay for content readability */}
      {isLoaded && (
        <div 
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-30 ${
            isDarkMode
              ? 'bg-slate-900/20'
              : 'bg-white/30'
          }`}
          style={{
            willChange: 'opacity',
            transform: 'translateZ(0)'
          }}
        />
      )}

      {/* Radial gradient for AI theme */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05),transparent_50%)] z-40"></div>
    </div>
  )
}

export { SolutionsHeroBackground }
