import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        compact: true,
        plugins: []
      }
    }),
    {
      name: 'copy-cloudflare-headers',
      closeBundle() {
        try {
          copyFileSync(
            path.resolve(__dirname, '_headers'),
            path.resolve(__dirname, 'dist/_headers')
          )
        } catch (e) {
          console.warn('Could not copy _headers file:', e)
        }
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: '/', // Root path for standalone deployment
  server: {
    port: 8000,
    host: true,
  },
  preview: {
    port: 4173,
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps for strict CSP
    minify: 'esbuild',
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          animations: ['framer-motion'],
        },
      },
    },
  },
  esbuild: {
    legalComments: 'none',
    pure: ['console.log', 'console.debug'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
})

