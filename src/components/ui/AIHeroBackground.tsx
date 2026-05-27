import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { getAssetPath } from '@/utils/assetPath'

interface AIHeroBackgroundProps {
  isDarkMode?: boolean
  className?: string
}

const AIHeroBackground: React.FC<AIHeroBackgroundProps> = ({
  isDarkMode = false,
  className = ''
}) => {
  const [isLoaded, setIsLoaded] = useState(false)

  const imageSrc = getAssetPath('assets/hero_ai/AI-hero.webp')

  const handleImageLoad = () => {
    setIsLoaded(true)
  }

  const handleImageError = (error: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('AI hero image failed to load:', imageSrc, error)
    setIsLoaded(false)
  }

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Fallback gradient — violet/indigo AI brand palette */}
      <div
        className={`absolute inset-0 z-0 transition-colors duration-500 ${
          isDarkMode
            ? 'bg-gradient-to-br from-violet-950/60 via-indigo-950/40 to-blue-950/30'
            : 'bg-gradient-to-br from-violet-50/60 via-indigo-50/40 to-blue-50/30'
        }`}
      />

      {/* Hero image */}
      <motion.div
        className="absolute inset-0 w-full h-full z-10"
        style={{ transform: 'translateZ(0)' }}
      >
        <motion.img
          src={imageSrc}
          alt="AI Hero Background"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          onLoad={handleImageLoad}
          onError={handleImageError}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] }}
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

      {/* Readability gradient — bottom-up */}
      {isLoaded && (
        <div
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-20 ${
            isDarkMode
              ? 'bg-gradient-to-t from-slate-900/70 via-slate-900/40 to-slate-900/20'
              : 'bg-gradient-to-t from-white/70 via-white/40 to-white/20'
          }`}
          style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
        />
      )}

      {/* Additional light wash */}
      {isLoaded && (
        <div
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-30 ${
            isDarkMode ? 'bg-slate-900/20' : 'bg-white/30'
          }`}
          style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
        />
      )}

      {/* Violet radial glow for AI brand accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(168,85,247,0.08),transparent_60%)] z-40" />
    </div>
  )
}

export { AIHeroBackground }
