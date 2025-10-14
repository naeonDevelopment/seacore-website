import React from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'

interface GradientSection {
  id: string
  colors: {
    primary: string
    secondary: string
  }
  position: string
}

interface ScrollGradientBackgroundProps {
  sections: GradientSection[]
}

const ScrollGradientBackground: React.FC<ScrollGradientBackgroundProps> = ({ sections }) => {
  const { scrollYProgress } = useScroll()

  // Create smooth spring animation for scroll
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  // Calculate section transitions with overlap for seamless blending
  const sectionCount = sections.length
  
  // Create color arrays for interpolation
  const primaryColors = sections.map(s => s.colors.primary)
  const secondaryColors = sections.map(s => s.colors.secondary)
  
  // Create interpolation points (0, 0.25, 0.5, 0.75, 1 for 5 sections)
  const points = sections.map((_, i) => i / (sectionCount - 1))
  
  // Interpolate colors smoothly across scroll
  const primaryColor = useTransform(smoothProgress, points, primaryColors)
  const secondaryColor = useTransform(smoothProgress, points, secondaryColors)
  
  // Smooth rotation animation
  const rotation = useTransform(smoothProgress, [0, 1], [0, 180])
  const smoothRotation = useSpring(rotation, {
    stiffness: 50,
    damping: 20
  })

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Single subtle animated gradient */}
      <motion.div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: useTransform(
            [primaryColor, secondaryColor, smoothRotation],
            ([p, s, r]) => `linear-gradient(${r}deg, ${p} 0%, ${s} 100%)`
          ),
          opacity: 0.06
        }}
      />
    </div>
  )
}

export { ScrollGradientBackground }

