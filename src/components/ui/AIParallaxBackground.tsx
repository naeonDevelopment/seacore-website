import React, { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

interface AIParallaxBackgroundProps {
  isDarkMode?: boolean
  className?: string
}

const AIParallaxBackground: React.FC<AIParallaxBackgroundProps> = ({
  isDarkMode = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  })

  const y = useTransform(scrollYProgress, [0, 1], isMobile ? [0, -20] : [0, -50])
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [1, 1.04] : [1, 1.12])

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Base gradient */}
      <div
        className={`absolute inset-0 z-0 transition-colors duration-500 ${
          isDarkMode
            ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950'
            : 'bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50'
        }`}
      />

      {/* Parallax gradient layer */}
      <motion.div
        className="absolute inset-0 z-10 w-full h-full"
        style={{ y, scale }}
      >
        <div
          className="w-full h-full"
          style={{
            background: isDarkMode
              ? 'radial-gradient(ellipse 90% 70% at 40% 50%, rgba(59,130,246,0.20) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)'
              : 'radial-gradient(ellipse 90% 70% at 40% 50%, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.07) 40%, transparent 70%)'
          }}
        />
      </motion.div>

      {/* Neural dot-grid overlay */}
      <div
        className="absolute inset-0 z-20 opacity-[0.025] dark:opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(59,130,246,1) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Theme-aware gradient overlay for readability */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-500 z-30 ${
          isDarkMode
            ? 'bg-gradient-to-tl from-slate-900/65 via-blue-900/40 to-indigo-900/25'
            : 'bg-gradient-to-tl from-white/65 via-blue-50/40 to-indigo-50/25'
        }`}
      />

      {/* Vignette for depth */}
      <div
        className={`absolute inset-0 pointer-events-none z-40 ${
          isDarkMode
            ? 'bg-gradient-to-b from-slate-900/20 via-transparent to-slate-900/20'
            : 'bg-gradient-to-b from-white/20 via-transparent to-white/20'
        }`}
      />
    </div>
  )
}

export { AIParallaxBackground }
