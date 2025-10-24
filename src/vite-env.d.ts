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

// Extend Window for Calendly (existing)
interface Window {
  Calendly?: {
    initPopupWidget: (options: { url: string; parentElement?: HTMLElement; embedType?: string }) => void;
  };
}
