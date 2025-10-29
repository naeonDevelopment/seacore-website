/**
 * GDPR-Compliant Cookie Consent Modal
 * Two-layer design: Simple banner + detailed settings
 */

import { useState, useEffect } from 'react';
import { X, Cookie, Shield, BarChart3, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  shouldShowConsentModal, 
  acceptAll, 
  rejectAll, 
  savePreferences,
  type CookieCategories 
} from '@/utils/cookieConsent';
import { cn } from '@/utils/cn';

interface CookieConsentModalProps {
  onConsentGiven?: () => void;
}

export default function CookieConsentModal({ onConsentGiven }: CookieConsentModalProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookieCategories>({
    strictlyNecessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if we should show the modal
    if (shouldShowConsentModal()) {
      // Small delay to avoid jarring on page load
      setTimeout(() => setShowBanner(true), 500);
    }
  }, []);

  const handleAcceptAll = () => {
    acceptAll();
    setShowBanner(false);
    setShowSettings(false);
    onConsentGiven?.();
  };

  const handleRejectAll = () => {
    rejectAll();
    setShowBanner(false);
    setShowSettings(false);
    onConsentGiven?.();
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
    setShowSettings(false);
    setShowBanner(false);
    onConsentGiven?.();
  };

  const handleCustomize = () => {
    setShowSettings(true);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[99998]"
        aria-hidden="true"
      />

      {/* Simple Banner (Layer 1) */}
      {!showSettings && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-[99999] animate-slide-up"
          role="dialog"
          aria-labelledby="cookie-banner-title"
          aria-describedby="cookie-banner-description"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
            <div className="rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Cookie className="w-6 h-6 text-primary" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h2 id="cookie-banner-title" className="text-xl font-semibold text-foreground mb-2">
                    We value your privacy
                  </h2>
                  <p id="cookie-banner-description" className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
                    Essential cookies are required for site functionality. Optional cookies help us improve our services 
                    and provide you with relevant information.
                  </p>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleAcceptAll}
                      className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      Accept All
                    </button>
                    <button
                      onClick={handleRejectAll}
                      className="px-6 py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-muted-foreground focus:ring-offset-2"
                    >
                      Reject All
                    </button>
                    <button
                      onClick={handleCustomize}
                      className="px-6 py-2.5 border border-border text-foreground rounded-lg font-medium hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-muted-foreground focus:ring-offset-2"
                    >
                      Customize
                    </button>
                  </div>

                  {/* Policy Links */}
                  <div className="mt-4 text-xs text-muted-foreground">
                    <a 
                      href="/privacy-policy" 
                      className="underline hover:text-foreground transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </a>
                    {' • '}
                    <a 
                      href="/privacy-policy#cookies-tracking" 
                      className="underline hover:text-foreground transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Cookie Policy
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Settings Modal (Layer 2) */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-labelledby="cookie-settings-title"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-background border-b border-border p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-primary" />
                </div>
                <h2 id="cookie-settings-title" className="text-2xl font-bold text-foreground">
                  Cookie Preferences
                </h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Close cookie settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Manage your cookie preferences below. You can enable or disable different types of cookies. 
                Note that blocking some types of cookies may impact your experience on our site.
              </p>

              {/* Cookie Categories */}
              <div className="space-y-4">
                <CookieCategory
                  icon={Shield}
                  title="Strictly Necessary Cookies"
                  description="These cookies are essential for the website to function properly. They enable basic functions like page navigation, authentication, and security. The website cannot function properly without these cookies."
                  required={true}
                  checked={true}
                  examples={['Session ID', 'CSRF Token', 'Authentication']}
                />

                <CookieCategory
                  icon={Cookie}
                  title="Functional Cookies"
                  description="These cookies allow the website to remember choices you make (such as your theme preference or language) and provide enhanced, more personalized features."
                  required={false}
                  checked={preferences.functional}
                  onChange={(checked) => setPreferences({ ...preferences, functional: checked })}
                  examples={['Theme preference', 'Language selection', 'Conversation cache']}
                />

                <CookieCategory
                  icon={BarChart3}
                  title="Analytics Cookies"
                  description="These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our website and services."
                  required={false}
                  checked={preferences.analytics}
                  onChange={(checked) => setPreferences({ ...preferences, analytics: checked })}
                  examples={['Google Analytics (_ga, _gid)', 'Page views', 'Usage statistics']}
                />

                <CookieCategory
                  icon={Target}
                  title="Marketing Cookies"
                  description="These cookies are used to track visitors across websites and provide more relevant advertising. They may also be used to measure the effectiveness of advertising campaigns."
                  required={false}
                  checked={preferences.marketing}
                  onChange={(checked) => setPreferences({ ...preferences, marketing: checked })}
                  examples={['Calendly scheduling', 'Facebook Pixel', 'LinkedIn Insight Tag']}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-background border-t border-border p-6 flex flex-wrap gap-3 justify-end">
              <button
                onClick={handleRejectAll}
                className="px-6 py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-muted-foreground focus:ring-offset-2"
              >
                Reject All
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Save Preferences
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface CookieCategoryProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  required: boolean;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  examples?: string[];
}

function CookieCategory({ 
  icon: Icon, 
  title, 
  description, 
  required, 
  checked, 
  onChange,
  examples 
}: CookieCategoryProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-5 transition-all hover:border-muted-foreground/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {required && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  Always Active
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            
            {examples && examples.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-xs text-primary hover:underline flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary rounded"
              >
                {expanded ? 'Hide' : 'Show'} examples
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
            
            {expanded && examples && (
              <ul className="mt-2 text-xs text-muted-foreground space-y-1 pl-4">
                {examples.map((example, i) => (
                  <li key={i} className="list-disc">{example}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Toggle */}
        <div className="flex-shrink-0">
          {required ? (
            <div className="w-12 h-6 rounded-full bg-primary flex items-center justify-end px-1">
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
          ) : (
            <button
              onClick={() => onChange?.(!checked)}
              className={cn(
                'w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                checked ? 'bg-primary' : 'bg-muted'
              )}
              role="switch"
              aria-checked={checked}
              aria-label={`Toggle ${title}`}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full bg-white transition-transform',
                  checked ? 'translate-x-7' : 'translate-x-1'
                )}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

