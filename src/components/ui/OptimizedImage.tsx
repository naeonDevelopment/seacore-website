/**
 * OptimizedImage Component
 * High-performance image component with lazy loading and blur-up effect
 * Optimizes LCP and CLS for better Core Web Vitals
 */

import React from 'react';
import { useLazyLoad } from '@/hooks/useLazyLoad';
import { cn } from '@/utils/cn';

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'onError' | 'onLoad'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  blurDataURL?: string;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  blurDataURL,
  className,
  objectFit = 'cover',
  onLoad,
  onError,
  ...props
}) => {
  const { ref, isLoaded, isInView } = useLazyLoad<HTMLImageElement>({
    onLoad,
    onError,
    threshold: 0.01,
    rootMargin: priority ? '0px' : '200px' // Load critical images earlier
  });

  // Calculate aspect ratio for preventing CLS
  const aspectRatio = width && height ? (height / width) * 100 : undefined;

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        paddingBottom: aspectRatio ? `${aspectRatio}%` : undefined,
        width: width ? `${width}px` : '100%',
        height: !aspectRatio && height ? `${height}px` : undefined
      }}
    >
      {/* Blur placeholder */}
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 w-full h-full',
            `object-${objectFit}`,
            'blur-2xl scale-110 transition-opacity duration-300',
            isInView ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Main image */}
      <img
        ref={ref}
        data-src={priority ? undefined : src}
        src={priority ? src : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        className={cn(
          'absolute inset-0 w-full h-full',
          `object-${objectFit}`,
          'transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        {...props}
      />

      {/* Loading skeleton */}
      {!isLoaded && !blurDataURL && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse" />
      )}
    </div>
  );
};

export default OptimizedImage;

