import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { HelmetProvider } from 'react-helmet-async'

// #region agent log - TDZ debug: confirm main.tsx reached (all vendor chunks initialized cleanly)
console.log('[DEBUG-12afc6][H-A-CONFIRM] main.tsx reached', {helmetProvider:typeof HelmetProvider,react:typeof React,ts:Date.now()});
// #endregion

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)

