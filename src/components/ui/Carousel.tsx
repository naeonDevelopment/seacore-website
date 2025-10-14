import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/utils/cn"
import { Button } from "./Button"

interface CarouselProps {
  children: React.ReactNode[]
  className?: string
  itemsPerView?: number
  gap?: number
  showControls?: boolean
  autoPlay?: boolean
  autoPlayInterval?: number
  itemWidth?: number // optional fixed item width (px)
  itemClassName?: string // optional class for each item wrapper
}

const Carousel: React.FC<CarouselProps> = ({
  children,
  className,
  itemsPerView = 3,
  gap = 24,
  showControls = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  itemWidth,
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

  const totalItems = children.length
  const maxIndex = Math.max(0, totalItems - itemsPerView)
  
  // Create infinite loop by duplicating items
  const extendedChildren = React.useMemo(() => {
    if (totalItems <= itemsPerView) return children
    return [...children, ...children, ...children]
  }, [children, totalItems, itemsPerView])

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
    if (autoPlay && !isHovered && !isDragging && totalItems > itemsPerView) {
      const interval = setInterval(nextSlide, autoPlayInterval)
      return () => clearInterval(interval)
    }
  }, [autoPlay, isHovered, isDragging, nextSlide, autoPlayInterval, totalItems, itemsPerView])

  const computedItemWidth = itemWidth
    ? `${itemWidth}px`
    : `calc((100% - ${(itemsPerView - 1) * gap}px) / ${itemsPerView})`

  // Measure item heights to normalize to tallest
  React.useLayoutEffect(() => {
    const heights = itemRefs.current
      .filter(Boolean)
      .map((el) => (el ? el.offsetHeight : 0))
    const max = heights.length ? Math.max(...heights) : null
    if (max && max !== maxItemHeight) setMaxItemHeight(max)
  }, [children, itemWidth, gap])

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
    if (totalItems > itemsPerView) {
      setCurrentIndex(totalItems)
    }
  }, [totalItems, itemsPerView])

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
    const itemWidthWithGap = (itemWidth || 320) + gap
    const dragProgress = -deltaX / itemWidthWithGap
    
    setDragOffset(dragProgress)
  }, [isDragging, dragStart.x, itemWidth, gap])

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

  return (
    <div 
      className={cn("relative w-full overflow-x-hidden overflow-y-visible px-16", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Carousel Container */}
      <div 
        ref={containerRef}
        className="overflow-visible w-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <motion.div
          className="flex w-auto"
          animate={{
            x: itemWidth 
              ? `-${(currentIndex + dragOffset) * (itemWidth + gap)}px` 
              : `-${(currentIndex + dragOffset) * (100 / itemsPerView)}%`
          }}
          transition={{
            type: isDragging ? "tween" : "spring",
            stiffness: 300,
            damping: 30,
            duration: isDragging ? 0 : 0.6
          }}
          style={{ gap: `${gap}px` }}
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
      {showControls && totalItems > itemsPerView && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 maritime-glass-card w-12 h-12 rounded-full shadow-lg hover:shadow-xl"
            onClick={prevSlide}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 maritime-glass-card w-12 h-12 rounded-full shadow-lg hover:shadow-xl"
            onClick={nextSlide}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </>
      )}

      {/* Dots Indicator */}
      {totalItems > itemsPerView && (
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
