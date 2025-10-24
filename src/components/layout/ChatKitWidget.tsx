import React, { useEffect, useRef } from 'react';

/**
 * ChatKit Widget Component
 * Embeds OpenAI ChatKit widget with maritime expertise
 */

interface ChatKitWidgetProps {
  className?: string;
}

// Extend Window interface for ChatKit
declare global {
  interface Window {
    ChatKit?: {
      init: (elementId: string, options: any) => void;
    };
  }
}

export const ChatKitWidget: React.FC<ChatKitWidgetProps> = ({ className }) => {
  const chatKitRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  useEffect(() => {
    // Load ChatKit script
    const script = document.createElement('script');
    script.src = 'https://cdn.openai.com/chatkit/v1/chatkit.js';
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !chatKitRef.current) return;

    // Initialize ChatKit widget
    const initChatKit = async () => {
      try {
        // Create custom element if not already defined
        if (!customElements.get('chatkit-widget')) {
          console.log('Waiting for ChatKit custom element...');
          await customElements.whenDefined('chatkit-widget');
        }

        const chatkit = chatKitRef.current?.querySelector('chatkit-widget');
        if (!chatkit) return;

        // Configure the widget
        (chatkit as any).setOptions({
          api: {
            async getClientSecret(currentClientSecret: string | null) {
              try {
                if (!currentClientSecret) {
                  // Start new session
                  const res = await fetch('/api/chatkit/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  });
                  
                  if (!res.ok) throw new Error('Failed to start session');
                  
                  const data = await res.json();
                  return data.client_secret;
                }
                
                // Refresh existing session
                const res = await fetch('/api/chatkit/refresh', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ currentClientSecret }),
                });
                
                if (!res.ok) throw new Error('Failed to refresh session');
                
                const data = await res.json();
                return data.client_secret;
              } catch (error) {
                console.error('ChatKit API error:', error);
                throw error;
              }
            },
          },
          appearance: {
            // fleetcore branding
            primary_color: '#0ea5e9', // Ocean blue from your color scheme
            secondary_color: '#14b8a6', // Teal accent
            position: 'bottom-right',
            button_icon: '💬',
            greeting_message: 'Hi! I\'m your maritime maintenance expert. How can I help you today?',
            placeholder: 'Ask about maritime maintenance...',
            widget_title: 'fleetcore Assistant',
          },
          behavior: {
            auto_open: false,
            show_greeting: true,
            enable_file_upload: false,
          },
        });

        console.log('ChatKit widget initialized successfully');
      } catch (error) {
        console.error('Failed to initialize ChatKit:', error);
      }
    };

    initChatKit();
  }, [isLoaded]);

  return (
    <div ref={chatKitRef} className={className}>
      <chatkit-widget id="fleetcore-chat" />
    </div>
  );
};

export default ChatKitWidget;

