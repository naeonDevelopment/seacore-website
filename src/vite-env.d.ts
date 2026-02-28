/// <reference types="vite/client" />

// ChatKit Web Component Types
declare namespace JSX {
  interface IntrinsicElements {
    'chatkit-widget': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        id?: string;
      },
      HTMLElement
    >;
  }
}

// Global Window extensions
interface Window {
  Calendly?: {
    initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void;
    initPopupWidget: (options: { url: string; parentElement?: HTMLElement; embedType?: string }) => void;
  };
  __activeSessionId?: string;
}
