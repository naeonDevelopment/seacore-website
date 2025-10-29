/**
 * Cookie Settings Button
 * Allows users to re-open cookie preferences at any time (GDPR requirement)
 */

import { useState } from 'react';
import { Cookie } from 'lucide-react';
import CookieConsentModal from './CookieConsentModal';

export default function CookieSettingsButton() {
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    setShowModal(true);
  };

  const handleConsentGiven = () => {
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:underline"
        aria-label="Manage cookie preferences"
      >
        <Cookie className="w-4 h-4" />
        <span>Cookie Settings</span>
      </button>

      {/* Temporarily mount modal to force it to show */}
      {showModal && (
        <div key={Date.now()}>
          <CookieConsentModal onConsentGiven={handleConsentGiven} />
        </div>
      )}
    </>
  );
}

