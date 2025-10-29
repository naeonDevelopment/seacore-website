import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '@/utils/gtmPageTracking'

/**
 * ScrollToTop component - automatically scrolls to top on route changes
 * This ensures pages always load at the top when navigating between routes
 * Also tracks page views in Google Tag Manager for SPA navigation
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    // Scroll to top smoothly when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Use 'instant' for immediate scroll, 'smooth' for animated
    })
    
    // Track page view in GTM for SPA navigation
    // Small delay to ensure document.title is updated
    setTimeout(() => {
      trackPageView(pathname);
    }, 100);
  }, [pathname])

  return null
}

export default ScrollToTop
