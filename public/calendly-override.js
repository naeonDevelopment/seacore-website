// Calendly iframe permission override and GLOBAL click interceptor
// This prevents Calendly's document-level click-to-close behavior

(function() {
  console.log('[Calendly Override] Script loaded');
  
  // CRITICAL: Global input interceptors at capture phase (before Calendly)
  const interceptEvents = ['pointerdown', 'mousedown', 'touchstart', 'click'];

  function isPointInsideWrapper(wrapper, event) {
    if (!wrapper) return false;
    const rect = wrapper.getBoundingClientRect();
    const touch = (event.touches && event.touches[0]) || (event.changedTouches && event.changedTouches[0]);
    const clientX = touch ? touch.clientX : event.clientX;
    const clientY = touch ? touch.clientY : event.clientY;
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return false;
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  function interceptHandler(e) {
    const overlay = document.querySelector('.calendly-overlay');
    if (!overlay) return; // No popup open

    const wrapper = document.querySelector('.calendly-popup-wrapper');
    // Try to find an explicit close button/icon within the popup
    const explicitCloseButton = document.querySelector('[aria-label="Close"], .calendly-popup-close, .calendly-popup-close-button, .calendly-popup-close-icon');

    // Prefer geometry hit-test to handle invisible overlays sitting above the wrapper
    const hitInsideByGeometry = isPointInsideWrapper(wrapper, e);
    // Fallback DOM containment check
    const hitInsideByDOM = wrapper && wrapper.contains(e.target);
    const clickedInsidePopup = !!(hitInsideByGeometry || hitInsideByDOM);
    const clickedCloseButton = explicitCloseButton && explicitCloseButton.contains(e.target);

    if (clickedInsidePopup && !clickedCloseButton) {
      // Clicked within the popup area - prevent Calendly's global close
      e.stopPropagation();
      e.stopImmediatePropagation();
      // Do NOT preventDefault to preserve inner controls unless it's a non-click pointer event
      if (e.type !== 'click') {
        // Prevent upstream handlers on pointerdown/touchstart/mousedown from closing
        e.preventDefault();
      }
      console.log('🛡️ Interaction intercepted - staying open');
    } else if (clickedCloseButton) {
      console.log('🔴 Close button clicked');
    } else {
      console.log('🔴 Clicked outside - closing');
    }
  }

  interceptEvents.forEach((evt) => {
    document.addEventListener(evt, interceptHandler, true);
  });
  
  
  console.log('✅ Global click interceptor installed');
  
  // Hook Calendly init even if Calendly loads after this script
  let calendlyHooked = false;
  function hookCalendly() {
    if (calendlyHooked) return;
    const calendly = window.Calendly;
    if (!calendly || !calendly.initPopupWidget) return;
    const originalOpen = calendly.initPopupWidget;
    if (!originalOpen || originalOpen.__fcWrapped) return;
    calendly.initPopupWidget = function(options) {
      console.log('[Calendly Override] initPopupWidget called');
      const result = originalOpen.call(this, options);
      try { document.documentElement.classList.add('calendly-open'); } catch (_) {}
      setTimeout(() => {
        const iframe = document.querySelector('.calendly-overlay iframe');
        if (iframe) {
          iframe.setAttribute('allow', 'payment *');
          iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
          console.log('✅ Calendly iframe permissions added:', iframe.getAttribute('allow'));
        }
      }, 100);
      return result;
    };
    calendly.initPopupWidget.__fcWrapped = true;
    calendlyHooked = true;
  }
  // Try immediately and poll briefly
  hookCalendly();
  const hookInterval = setInterval(() => {
    if (calendlyHooked) {
      clearInterval(hookInterval);
      return;
    }
    hookCalendly();
  }, 250);
  setTimeout(() => clearInterval(hookInterval), 8000);
  
  // Also observe for dynamically created iframes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        // Handle iframes
        if (node.nodeName === 'IFRAME' && node.src?.includes('calendly.com')) {
          node.setAttribute('allow', 'payment *');
          node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
          console.log('✅ Calendly iframe permissions added (via observer)');
        }
        // If Calendly overlay is added, add marker class to html
        if (node.nodeType === 1) {
          const el = /** @type {Element} */ (node);
          if (el.classList && el.classList.contains('calendly-overlay')) {
            try { document.documentElement.classList.add('calendly-open'); } catch (_) {}
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('[Calendly Override] Observer registered');

  // Observe removals to clear the calendly-open class when overlay disappears
  const removalObserver = new MutationObserver(() => {
    const overlay = document.querySelector('.calendly-overlay');
    if (!overlay) {
      try { document.documentElement.classList.remove('calendly-open'); } catch (_) {}
    }
  });
  removalObserver.observe(document.body, { childList: true, subtree: true });
})();

