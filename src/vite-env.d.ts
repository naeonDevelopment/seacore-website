/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Calendly type definitions
interface CalendlyPopupOptions {
  url: string
  prefill?: {
    name?: string
    email?: string
    firstName?: string
    lastName?: string
    customAnswers?: {
      [key: string]: string
    }
  }
  utm?: {
    [key: string]: string
  }
}

interface Calendly {
  initPopupWidget(options: CalendlyPopupOptions): void
  showPopupWidget(url: string): void
  closePopupWidget(): void
}

interface Window {
  Calendly?: Calendly
}

