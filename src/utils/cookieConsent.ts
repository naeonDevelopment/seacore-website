/**
 * GDPR-Compliant Cookie Consent Manager
 * Handles user consent for different cookie categories with full audit trail
 */

// Cookie Categories (GDPR Compliant)
export interface CookieCategories {
  strictlyNecessary: boolean; // Always true - no consent needed
  functional: boolean;         // Preferences, language, theme
  analytics: boolean;          // Google Analytics, usage tracking
  marketing: boolean;          // Calendly, advertising, remarketing
}

// Full consent record for GDPR compliance
export interface ConsentRecord {
  version: string;              // Consent modal version
  timestamp: number;            // Unix timestamp when consent given
  consentGiven: boolean;        // Overall consent status
  categories: CookieCategories; // Granular consent per category
  geolocation?: string;         // ISO country code (optional)
  userAgent: string;            // Browser user agent
  consentMethod: 'accept-all' | 'reject-all' | 'customize' | 'banner-accept' | 'banner-reject';
}

// Configuration
const STORAGE_KEY = 'fleetcore_cookie_consent';
const CONSENT_VERSION = '1.0.0';
const CONSENT_EXPIRY_DAYS = 365; // Re-ask after 1 year

/**
 * Check if consent record exists and is still valid
 */
export function hasValidConsent(): boolean {
  const consent = getConsentRecord();
  if (!consent) return false;
  
  // Check if consent is expired (older than 365 days)
  const expiryTime = consent.timestamp + (CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  if (Date.now() > expiryTime) {
    clearConsent(); // Clear expired consent
    return false;
  }
  
  // Check if version matches (re-ask if modal updated)
  if (consent.version !== CONSENT_VERSION) {
    clearConsent();
    return false;
  }
  
  return true;
}

/**
 * Get current consent record from localStorage
 */
export function getConsentRecord(): ConsentRecord | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as ConsentRecord;
  } catch (error) {
    console.error('Error reading consent record:', error);
    return null;
  }
}

/**
 * Save consent record to localStorage and trigger GTM update
 */
export function saveConsent(
  categories: CookieCategories,
  method: ConsentRecord['consentMethod']
): void {
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    timestamp: Date.now(),
    consentGiven: true,
    categories,
    userAgent: navigator.userAgent,
    consentMethod: method,
    // Optional: Add geolocation if you implement it
    // geolocation: await detectCountry()
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    
    // Trigger consent update for GTM and other listeners
    updateGTMConsent(categories);
    dispatchConsentEvent(categories);
    
    // Apply consent immediately
    applyConsent(categories);
  } catch (error) {
    console.error('Error saving consent record:', error);
  }
}

/**
 * Update Google Tag Manager consent state
 */
function updateGTMConsent(categories: CookieCategories): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  try {
    window.gtag('consent', 'update', {
      'security_storage': 'granted', // Always granted
      'functionality_storage': categories.functional ? 'granted' : 'denied',
      'analytics_storage': categories.analytics ? 'granted' : 'denied',
      'ad_storage': categories.marketing ? 'granted' : 'denied',
      'personalization_storage': categories.marketing ? 'granted' : 'denied',
    });
    
    console.log('[CookieConsent] GTM consent updated:', categories);
  } catch (error) {
    console.error('Error updating GTM consent:', error);
  }
}

/**
 * Dispatch custom event for other parts of the app
 */
function dispatchConsentEvent(categories: CookieCategories): void {
  const event = new CustomEvent('cookieConsentChanged', {
    detail: categories,
    bubbles: true,
  });
  window.dispatchEvent(event);
}

/**
 * Apply consent by loading/unloading scripts and services
 */
function applyConsent(categories: CookieCategories): void {
  // Load Calendly only if marketing consent given
  if (categories.marketing) {
    loadCalendlyScript();
  }
  
  // Analytics already handled by GTM consent mode
  
  // Clean up cookies if consent withdrawn
  if (!categories.analytics) {
    clearAnalyticsCookies();
  }
  if (!categories.marketing) {
    clearMarketingCookies();
  }
}

/**
 * Load Calendly script dynamically
 */
function loadCalendlyScript(): void {
  // Check if already loaded
  if (document.querySelector('script[src*="calendly.com"]')) {
    return;
  }
  
  // Load Calendly CSS
  const link = document.createElement('link');
  link.href = 'https://assets.calendly.com/assets/external/widget.css';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
  
  // Load Calendly JS
  const script = document.createElement('script');
  script.src = 'https://assets.calendly.com/assets/external/widget.js';
  script.type = 'text/javascript';
  script.async = true;
  document.body.appendChild(script);
  
  console.log('[CookieConsent] Calendly script loaded');
}

/**
 * Clear analytics cookies
 */
function clearAnalyticsCookies(): void {
  const analyticsCookies = ['_ga', '_gid', '_gat', '_gat_gtag_UA_', '_gat_gtag_G_'];
  analyticsCookies.forEach(name => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
}

/**
 * Clear marketing cookies
 */
function clearMarketingCookies(): void {
  const marketingCookies = ['_fbp', '_gcl_au', 'calendly_session'];
  marketingCookies.forEach(name => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
}

/**
 * Get current consent status for a specific category
 */
export function hasConsent(category: keyof CookieCategories): boolean {
  const record = getConsentRecord();
  if (!record) return false;
  return record.categories[category];
}

/**
 * Accept all cookies
 */
export function acceptAll(): void {
  const categories: CookieCategories = {
    strictlyNecessary: true,
    functional: true,
    analytics: true,
    marketing: true,
  };
  saveConsent(categories, 'accept-all');
}

/**
 * Reject all non-essential cookies
 */
export function rejectAll(): void {
  const categories: CookieCategories = {
    strictlyNecessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  };
  saveConsent(categories, 'reject-all');
}

/**
 * Save custom preferences
 */
export function savePreferences(categories: Partial<CookieCategories>): void {
  const fullCategories: CookieCategories = {
    strictlyNecessary: true, // Always true
    functional: categories.functional ?? false,
    analytics: categories.analytics ?? false,
    marketing: categories.marketing ?? false,
  };
  saveConsent(fullCategories, 'customize');
}

/**
 * Clear consent (for testing or user request)
 */
export function clearConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[CookieConsent] Consent cleared');
  } catch (error) {
    console.error('Error clearing consent:', error);
  }
}

/**
 * Check if user should see consent modal
 */
export function shouldShowConsentModal(): boolean {
  return !hasValidConsent();
}

/**
 * Initialize consent system on app load
 */
export function initializeConsent(): void {
  const consent = getConsentRecord();
  
  if (consent && hasValidConsent()) {
    // Apply existing consent
    applyConsent(consent.categories);
    updateGTMConsent(consent.categories);
  } else {
    // No valid consent - set GTM to denied (default)
    if (window.gtag) {
      window.gtag('consent', 'default', {
        'security_storage': 'granted',
        'functionality_storage': 'denied',
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
        'personalization_storage': 'denied',
      });
    }
  }
}

// Type declarations for window.gtag
declare global {
  interface Window {
    gtag?: (
      command: 'consent',
      action: 'default' | 'update',
      params: Record<string, string>
    ) => void;
    dataLayer?: any[];
  }
}

