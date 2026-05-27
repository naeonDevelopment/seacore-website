import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { getAssetPath } from '@/utils/assetPath'

interface AIGovernanceSectionBackgroundProps {
  isDarkMode?: boolean
  className?: string
}

const AIGovernanceSectionBackground: React.FC<AIGovernanceSectionBackgroundProps> = ({
  isDarkMode = false,
  className = ''
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  })

  const y = useTransform(scrollYProgress, [0, 1], isMobile ? [0, -20] : [0, -50])
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [1, 1.05] : [1, 1.15])

  const imageSrc = getAssetPath('assets/section_ai/AI-Section.png')

  useEffect(() => {
    console.log('🔍 AIGovernanceSectionBackground:', { imageSrc, isLoaded, isDarkMode })
  }, [isLoaded, isDarkMode])

  const handleImageLoad = () => {
    console.log('✅ AI governance section image loaded from:', imageSrc)
    setIsLoaded(true)
  }

  const handleImageError = (error: any) => {
    console.log('❌ AI governance section image failed to load from:', imageSrc)
    console.error('Error details:', error)
    setIsLoaded(false)
  }

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Fallback gradient — emerald/teal governance palette */}
      <div className={`absolute inset-0 z-0 transition-colors duration-500 ${
        isDarkMode
          ? 'bg-gradient-to-br from-slate-800 via-emerald-950 to-teal-950'
          : 'bg-gradient-to-br from-slate-100 via-emerald-50 to-teal-50'
      }`} />

      {/* Parallax image background */}
      <motion.div
        className="absolute inset-0 w-full h-full z-10"
        style={{ y, scale }}
      >
        <motion.img
          src={imageSrc}
          alt="AI Governance Background"
          className="absolute inset-0 w-full h-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.8 }}
          style={{ backgroundColor: 'transparent' }}
        />
      </motion.div>

      {/* Theme-aware gradient overlay — emerald/teal tint */}
      {isLoaded && (
        <div
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-20 ${
            isDarkMode
              ? 'bg-gradient-to-tl from-slate-900/70 via-emerald-900/50 to-teal-900/30'
              : 'bg-gradient-to-tl from-white/70 via-emerald-50/50 to-teal-50/30'
          }`}
        />
      )}

      {/* Additional readability wash */}
      {isLoaded && (
        <div
          className={`absolute inset-0 pointer-events-none transition-all duration-500 z-30 ${
            isDarkMode ? 'bg-slate-900/20' : 'bg-white/20'
          }`}
        />
      )}

      {/* Depth vignette */}
      <div className={`absolute inset-0 pointer-events-none z-40 ${
        isDarkMode
          ? 'bg-gradient-radial from-transparent via-transparent to-slate-950/30'
          : 'bg-gradient-radial from-transparent via-transparent to-slate-900/10'
      }`} />
    </div>
  )
}

export { AIGovernanceSectionBackground }
