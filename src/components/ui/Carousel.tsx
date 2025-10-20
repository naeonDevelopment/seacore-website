import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/utils/cn"
import { Button } from "./Button"

interface CarouselProps {
  children: React.ReactNode[]
  className?: string
  itemsPerView?: number
  mobileItemsPerView?: number // items per view on mobile
  gap?: number
  mobileGap?: number // gap on mobile
  showControls?: boolean
  autoPlay?: boolean
  autoPlayInterval?: number
  itemWidth?: number // optional fixed item width (px)
  mobileItemWidth?: number // optional fixed item width on mobile
  useMobilePercentage?: boolean // use percentage-based width on mobile for better centering
  itemClassName?: string // optional class for each item wrapper
}

const Carousel: React.FC<CarouselProps> = ({
  children,
  className,
  itemsPerView = 3,
  mobileItemsPerView = 1,
  gap = 24,
  mobileGap = 0,
  showControls = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  itemWidth,
  mobileItemWidth,
  useMobilePercentage = false,
  itemClassName
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isHovered, setIsHovered] = React.useState(false)
  const [maxItemHeight, setMaxItemHeight] = React.useState<number | null>(null)
  const itemRefs = React.useRef<Array<HTMLDivElement | null>>([])
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState({ x: 0, scrollLeft: 0 })
  const [dragOffset, setDragOffset] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = React.useState(false)

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Use mobile-specific values when on mobile
  const activeItemsPerView = isMobile ? mobileItemsPerView : itemsPerView
  const activeGap = isMobile ? mobileGap : gap
  
  // On mobile with percentage mode, use null to trigger percentage calculation
  const activeItemWidth = isMobile 
    ? (useMobilePercentage ? null : mobileItemWidth)
    : itemWidth

  const totalItems = children.length
  const maxIndex = Math.max(0, totalItems - activeItemsPerView)
  
  // Create infinite loop by duplicating items
  const extendedChildren = React.useMemo(() => {
    if (totalItems <= activeItemsPerView) return children
    return [...children, ...children, ...children]
  }, [children, totalItems, activeItemsPerView])

  const nextSlide = React.useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev + 1
      // Reset to beginning of second set when reaching end of first set
      if (newIndex >= totalItems * 2) {
        setTimeout(() => setCurrentIndex(totalItems), 0)
        return totalItems
      }
      return newIndex
    })
  }, [totalItems])

  const prevSlide = React.useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev - 1
      // Reset to end of second set when reaching beginning of first set
      if (newIndex < totalItems) {
        setTimeout(() => setCurrentIndex(totalItems * 2 - 1), 0)
        return totalItems * 2 - 1
      }
      return newIndex
    })
  }, [totalItems])

  // Auto-play functionality
  React.useEffect(() => {
    if (autoPlay && !isHovered && !isDragging && totalItems > activeItemsPerView) {
      const interval = setInterval(nextSlide, autoPlayInterval)
      return () => clearInterval(interval)
    }
  }, [autoPlay, isHovered, isDragging, nextSlide, autoPlayInterval, totalItems, activeItemsPerView])

  // Calculate item width - on mobile with percentage mode, use 85% of container width
  const computedItemWidth = activeItemWidth
    ? `${activeItemWidth}px`
    : isMobile && useMobilePercentage
    ? '85%'
    : `calc((100% - ${(activeItemsPerView - 1) * activeGap}px) / ${activeItemsPerView})`

  // Measure item heights to normalize to tallest
  React.useLayoutEffect(() => {
    const heights = itemRefs.current
      .filter(Boolean)
      .map((el) => (el ? el.offsetHeight : 0))
    const max = heights.length ? Math.max(...heights) : null
    if (max && max !== maxItemHeight) setMaxItemHeight(max)
  }, [children, activeItemWidth, activeGap])

  React.useEffect(() => {
    const onResize = () => {
      const heights = itemRefs.current
        .filter(Boolean)
        .map((el) => (el ? el.offsetHeight : 0))
      const max = heights.length ? Math.max(...heights) : null
      setMaxItemHeight(max)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Initialize to middle set for infinite loop
  React.useEffect(() => {
    if (totalItems > activeItemsPerView) {
      setCurrentIndex(totalItems)
    }
  }, [totalItems, activeItemsPerView])

  // Mouse drag handlers - smooth dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, scrollLeft: currentIndex })
    setDragOffset(0)
    e.preventDefault()
  }

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const deltaX = e.clientX - dragStart.x
    const effectiveWidth = activeItemWidth || (containerRef.current.offsetWidth * 0.85)
    const itemWidthWithGap = effectiveWidth + activeGap
    const dragProgress = -deltaX / itemWidthWithGap
    
    setDragOffset(dragProgress)
  }, [isDragging, dragStart.x, activeItemWidth, activeGap])

  const handleMouseUp = React.useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    // Determine if we should slide to next/prev based on drag distance
    if (Math.abs(dragOffset) > 0.3) {
      if (dragOffset > 0) {
        nextSlide()
      } else {
        prevSlide()
      }
    }
    
    setDragOffset(0)
  }, [isDragging, dragOffset, nextSlide, prevSlide])

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Touch drag handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.touches[0].clientX, scrollLeft: currentIndex })
    setDragOffset(0)
  }

  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const deltaX = e.touches[0].clientX - dragStart.x
    const effectiveWidth = activeItemWidth || (containerRef.current.offsetWidth * 0.85)
    const itemWidthWithGap = effectiveWidth + activeGap
    const dragProgress = -deltaX / itemWidthWithGap
    
    setDragOffset(dragProgress)
  }, [isDragging, dragStart.x, activeItemWidth, activeGap])

  const handleTouchEnd = React.useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    // Determine if we should slide to next/prev based on drag distance
    if (Math.abs(dragOffset) > 0.3) {
      if (dragOffset > 0) {
        nextSlide()
      } else {
        prevSlide()
      }
    }
    
    setDragOffset(0)
  }, [isDragging, dragOffset, nextSlide, prevSlide])

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)
      return () => {
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleTouchMove, handleTouchEnd])

  return (
    <div 
      className={cn("relative w-full overflow-x-hidden overflow-y-visible", isMobile && useMobilePercentage ? "px-2" : "px-4 md:px-16", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Carousel Container */}
      <div 
        ref={containerRef}
        className="overflow-visible w-full cursor-grab active:cursor-grabbing touch-pan-y"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <motion.div
          className="flex w-auto"
          animate={{
            x: activeItemWidth 
              ? `-${(currentIndex + dragOffset) * (activeItemWidth + activeGap)}px` 
              : isMobile && useMobilePercentage
              ? `calc(-${(currentIndex + dragOffset) * 85}% - ${(currentIndex + dragOffset) * activeGap}px + 7.5%)`
              : `-${(currentIndex + dragOffset) * (100 / activeItemsPerView)}%`
          }}
          transition={{
            type: isDragging ? "tween" : "spring",
            stiffness: 300,
            damping: 30,
            duration: isDragging ? 0 : 0.6
          }}
          style={{ gap: `${activeGap}px` }}
        >
          {extendedChildren.map((child, index) => (
            <div
              key={`${index % totalItems}-${Math.floor(index / totalItems)}`}
              className={cn("flex-shrink-0", itemClassName, "h-auto")}
              style={{ width: computedItemWidth, height: maxItemHeight ?? undefined, marginTop: itemClassName ? undefined : undefined }}
              ref={(el) => {
                if (index < itemRefs.current.length) {
                  itemRefs.current[index] = el
                }
              }}
            >
              {child}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Navigation Controls */}
      {showControls && totalItems > activeItemsPerView && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-50 maritime-glass-card w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg hover:shadow-xl"
            onClick={prevSlide}
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-50 maritime-glass-card w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg hover:shadow-xl"
            onClick={nextSlide}
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </>
      )}

      {/* Dots Indicator */}
      {totalItems > activeItemsPerView && (
        <div className="flex justify-center space-x-2 mt-8">
          {Array.from({ length: totalItems }).map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                (currentIndex % totalItems) === index
                  ? "bg-maritime-600 w-8"
                  : "bg-slate-300 dark:bg-slate-600 hover:bg-maritime-400"
              )}
              onClick={() => setCurrentIndex(totalItems + index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { Carousel }
