(function() {
  let calendlyHooked = false;
  
  function hookCalendly() {
    if (calendlyHooked) return;
    const calendly = window.Calendly;
    if (!calendly || !calendly.initPopupWidget) return;
    
    const originalOpen = calendly.initPopupWidget;
    if (!originalOpen || originalOpen.__fcWrapped) return;
    
    calendly.initPopupWidget = function(options) {
      const result = originalOpen.call(this, options);
      
      // Add calendly-open class for styling
      try { 
        document.documentElement.classList.add('calendly-open'); 
      } catch (_) {}
      
      // Set iframe permissions for payment support
      setTimeout(() => {
        const iframe = document.querySelector('.calendly-overlay iframe');
        if (iframe) {
          iframe.setAttribute('allow', 'payment *');
        }
      }, 100);
      
      return result;
    };
    
    calendly.initPopupWidget.__fcWrapped = true;
    calendlyHooked = true;
  }
  
  // Click outside to close functionality
  document.addEventListener('click', function(e) {
    const overlay = document.querySelector('.calendly-overlay');
    if (!overlay) return;
    
    // Only close if clicking directly on the overlay (not on popup content)
    if (e.target === overlay) {
      window.Calendly.closePopupWidget();
    }
  }, true);
  
  // Hook Calendly
  hookCalendly();
  const hookInterval = setInterval(() => {
    if (calendlyHooked) {
      clearInterval(hookInterval);
      return;
    }
    hookCalendly();
  }, 250);
  setTimeout(() => clearInterval(hookInterval), 8000);
  
  // Observe for dynamically created elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        // Handle iframes
        if (node.nodeName === 'IFRAME' && node.src && String(node.src).includes('calendly.com')) {
          node.setAttribute('allow', 'payment *');
        }
        
        // If Calendly overlay is added
        if (node.nodeType === 1) {
          const el = /** @type {Element} */ (node);
          if (el.classList && el.classList.contains('calendly-overlay')) {
            try { 
              document.documentElement.classList.add('calendly-open');
            } catch (_) {}
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Observe removals to clear the calendly-open class
  const removalObserver = new MutationObserver(() => {
    const overlay = document.querySelector('.calendly-overlay');
    if (!overlay) {
      try { 
        document.documentElement.classList.remove('calendly-open');
      } catch (_) {}
    }
  });
  
  removalObserver.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
})();
