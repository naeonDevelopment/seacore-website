/**
 * useLazyLoad Hook
 * High-performance lazy loading for images and videos
 * Optimizes Core Web Vitals (LCP, CLS)
 */

import { useEffect, useRef, useState } from 'react';

interface UseLazyLoadOptions {
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for lazy loading media with IntersectionObserver
 * @param options Configuration options
 * @returns Ref to attach to element and loading state
 */
export function useLazyLoad<T extends HTMLElement>({
  rootMargin = '50px',
  threshold = 0.01,
  onLoad,
  onError
}: UseLazyLoadOptions = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const elementRef = useRef<T>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: load immediately
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(element);
          }
        });
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [rootMargin, threshold]);

  useEffect(() => {
    if (isInView && !isLoaded) {
      const element = elementRef.current;
      if (!element) return;

      // Handle different element types
      if (element instanceof HTMLImageElement) {
        const dataSrc = element.dataset.src;
        const dataSrcset = element.dataset.srcset;

        if (dataSrc) {
          const img = new Image();
          img.onload = () => {
            element.src = dataSrc;
            if (dataSrcset) element.srcset = dataSrcset;
            setIsLoaded(true);
            onLoad?.();
          };
          img.onerror = () => {
            const error = new Error(`Failed to load image: ${dataSrc}`);
            onError?.(error);
          };
          img.src = dataSrc;
        }
      } else if (element instanceof HTMLVideoElement) {
        const dataSrc = element.dataset.src;
        if (dataSrc) {
          element.src = dataSrc;
          element.load();
          element.onloadeddata = () => {
            setIsLoaded(true);
            onLoad?.();
          };
          element.onerror = () => {
            const error = new Error(`Failed to load video: ${dataSrc}`);
            onError?.(error);
          };
        }
      }
    }
  }, [isInView, isLoaded, onLoad, onError]);

  return { ref: elementRef, isLoaded, isInView };
}

/**
 * Hook for lazy loading background images
 * Useful for sections with background videos/images
 */
export function useLazyBackground(imageUrl: string, options: UseLazyLoadOptions = {}) {
  const { ref, isInView } = useLazyLoad<HTMLDivElement>(options);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  useEffect(() => {
    if (isInView && !backgroundLoaded) {
      const img = new Image();
      img.onload = () => {
        if (ref.current) {
          ref.current.style.backgroundImage = `url(${imageUrl})`;
          setBackgroundLoaded(true);
          options.onLoad?.();
        }
      };
      img.onerror = () => {
        const error = new Error(`Failed to load background: ${imageUrl}`);
        options.onError?.(error);
      };
      img.src = imageUrl;
    }
  }, [isInView, backgroundLoaded, imageUrl, ref, options]);

  return { ref, backgroundLoaded };
}

/**
 * Utility to preload critical images
 * Use for above-the-fold content
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Utility to preload critical videos
 */
export function preloadVideo(src: string, type: string = 'video/mp4'): Promise<void> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.onloadeddata = () => resolve();
    video.onerror = reject;
    video.preload = 'metadata';
    video.src = src;
    video.type = type;
  });
}

/**
 * Hook for responsive image loading
 * Loads appropriate size based on viewport
 */
export function useResponsiveImage(
  sources: { mobile: string; tablet: string; desktop: string },
  options: UseLazyLoadOptions = {}
) {
  const { ref, isInView } = useLazyLoad<HTMLImageElement>(options);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  useEffect(() => {
    if (!isInView) return;

    const getOptimalSource = () => {
      const width = window.innerWidth;
      if (width < 768) return sources.mobile;
      if (width < 1024) return sources.tablet;
      return sources.desktop;
    };

    const loadImage = () => {
      const optimalSrc = getOptimalSource();
      if (optimalSrc !== currentSrc) {
        setCurrentSrc(optimalSrc);
        if (ref.current) {
          ref.current.src = optimalSrc;
        }
      }
    };

    loadImage();

    // Reload on resize (with debounce)
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(loadImage, 250);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [isInView, sources, currentSrc, ref]);

  return { ref, currentSrc };
}

/**
 * Calculate optimal loading priority
 * Based on element position and importance
 */
export function calculateLoadingPriority(
  element: HTMLElement | null,
  importance: 'critical' | 'high' | 'medium' | 'low' = 'medium'
): 'eager' | 'lazy' {
  if (!element) return 'lazy';

  const rect = element.getBoundingClientRect();
  const isAboveFold = rect.top < window.innerHeight;
  
  if (importance === 'critical' || (importance === 'high' && isAboveFold)) {
    return 'eager';
  }

  return 'lazy';
}

