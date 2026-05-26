import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { HelmetProvider } from 'react-helmet-async'

// #region agent log - TDZ debug: confirm main.tsx reached (modules loaded cleanly)
fetch('http://127.0.0.1:7612/ingest/8d204304-9cf4-47d6-964a-569190a5d50a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'12afc6'},body:JSON.stringify({sessionId:'12afc6',location:'main.tsx:6',message:'main.tsx executing — all vendor chunks initialized',data:{helmetProvider:typeof HelmetProvider,react:typeof React},timestamp:Date.now(),hypothesisId:'H-A-B-C-D',runId:'run1'})}).catch(()=>{});
// #endregion

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)

