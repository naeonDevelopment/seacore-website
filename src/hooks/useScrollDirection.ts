import { useState, useEffect } from 'react'

type ScrollDirection = 'up' | 'down' | 'initial'

interface UseScrollDirectionOptions {
  threshold?: number
  initialDirection?: ScrollDirection
}

export const useScrollDirection = (options: UseScrollDirectionOptions = {}) => {
  const { threshold = 10, initialDirection = 'initial' } = options
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(initialDirection)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    let lastScrollY = window.pageYOffset
    let ticking = false

    const updateScrollDirection = () => {
      const currentScrollY = window.pageYOffset

      if (Math.abs(currentScrollY - lastScrollY) < threshold) {
        ticking = false
        return
      }

      if (currentScrollY < threshold) {
        setScrollDirection('initial')
      } else {
        setScrollDirection(currentScrollY > lastScrollY ? 'down' : 'up')
      }

      setScrollY(currentScrollY)
      lastScrollY = currentScrollY > 0 ? currentScrollY : 0
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [threshold])

  return { scrollDirection, scrollY }
}

