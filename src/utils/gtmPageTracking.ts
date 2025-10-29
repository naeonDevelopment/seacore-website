/**
 * Google Tag Manager Page Tracking for React SPA
 * Tracks virtual page views when routes change
 */

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

/**
 * Track a page view in GTM
 * Call this when the route changes in your SPA
 */
export function trackPageView(path: string, title?: string): void {
  if (typeof window === 'undefined' || !window.dataLayer) return;
  
  try {
    window.dataLayer.push({
      event: 'page_view',
      page_path: path,
      page_title: title || document.title,
      page_location: window.location.href,
    });
    
    console.log('[GTM] Page view tracked:', path);
  } catch (error) {
    console.error('[GTM] Error tracking page view:', error);
  }
}

/**
 * Track a custom event in GTM
 */
export function trackEvent(eventName: string, eventData?: Record<string, any>): void {
  if (typeof window === 'undefined' || !window.dataLayer) return;
  
  try {
    window.dataLayer.push({
      event: eventName,
      ...eventData,
    });
    
    console.log('[GTM] Event tracked:', eventName, eventData);
  } catch (error) {
    console.error('[GTM] Error tracking event:', error);
  }
}

/**
 * Track a conversion event (form submission, demo request, etc.)
 */
export function trackConversion(conversionType: string, value?: number, currency?: string): void {
  trackEvent('conversion', {
    conversion_type: conversionType,
    value,
    currency: currency || 'USD',
  });
}

