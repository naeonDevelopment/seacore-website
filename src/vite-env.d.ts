/// <reference types="vite/client" />

// Global Window extensions
interface Window {
  Calendly?: {
    initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void;
    initPopupWidget: (options: { url: string; parentElement?: HTMLElement; embedType?: string }) => void;
  };
}
