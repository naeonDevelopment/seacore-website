/**
 * OptimizedVideo Component
 * High-performance video component with lazy loading and adaptive quality
 * Optimizes for bandwidth and performance
 */

import React, { useEffect, useState } from 'react';
import { useLazyLoad } from '@/hooks/useLazyLoad';
import { cn } from '@/utils/cn';

interface OptimizedVideoProps extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'loading' | 'onError' | 'onLoad'> {
  src: string;
  poster?: string;
  priority?: boolean;
  className?: string;
  preload?: 'none' | 'metadata' | 'auto';
  adaptiveQuality?: boolean;
  fallbackImage?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const OptimizedVideo: React.FC<OptimizedVideoProps> = ({
  src,
  poster,
  priority = false,
  className,
  preload = 'metadata',
  adaptiveQuality = true,
  fallbackImage,
  onLoad,
  onError,
  ...props
}) => {
  const { ref, isLoaded, isInView } = useLazyLoad<HTMLVideoElement>({
    onLoad,
    onError,
    threshold: 0.1,
    rootMargin: priority ? '0px' : '300px'
  });

  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [showFallback, setShowFallback] = useState(false);

  // Detect connection speed for adaptive quality
  useEffect(() => {
    if (!adaptiveQuality) return;

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        setConnectionSpeed('slow');
        // Show fallback image on very slow connections
        if (fallbackImage) {
          setShowFallback(true);
        }
      } else if (effectiveType === '3g') {
        setConnectionSpeed('medium');
      } else {
        setConnectionSpeed('fast');
      }
    }
  }, [adaptiveQuality, fallbackImage]);

  // Handle video errors and show fallback
  const handleVideoError = (_event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.warn('Video failed to load, showing fallback');
    if (fallbackImage) {
      setShowFallback(true);
    }
    onError?.(new Error('Video load failed'));
  };

  // Don't load video on slow connections, show fallback
  if (showFallback && fallbackImage) {
    return (
      <img
        src={fallbackImage}
        alt="Video fallback"
        className={cn('w-full h-full object-cover', className)}
      />
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Poster image placeholder */}
      {poster && !isLoaded && (
        <img
          src={poster}
          alt="Video poster"
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            'transition-opacity duration-500',
            isInView ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Video element */}
      <video
        ref={ref}
        data-src={priority ? undefined : src}
        src={priority ? src : undefined}
        poster={poster}
        preload={connectionSpeed === 'slow' ? 'none' : preload}
        playsInline
        muted
        loop
        onError={handleVideoError}
        className={cn(
          'w-full h-full object-cover',
          'transition-opacity duration-500',
          isLoaded && isInView ? 'opacity-100' : 'opacity-0'
        )}
        {...props}
      />

      {/* Loading indicator */}
      {!isLoaded && !poster && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse" />
      )}

      {/* Slow connection warning (optional) */}
      {connectionSpeed === 'slow' && !showFallback && (
        <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded">
          Loading...
        </div>
      )}
    </div>
  );
};

export default OptimizedVideo;

