import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navigation from '@/components/layout/Navigation'
import ScrollToTop from '@/components/layout/ScrollToTop'
import HomePage from '@/pages/HomePage'
import SolutionsPage from '@/pages/SolutionsPage'
import PlatformPage from '@/pages/PlatformPage'
import AboutPage from '@/pages/AboutPage'
import '@/styles/globals.css'

function App() {
  const [darkMode, setDarkMode] = useState(false)

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <Router basename={import.meta.env.DEV ? '/' : '/site'}>
      <ScrollToTop />
      <div className="min-h-screen bg-background text-foreground">
        <Navigation darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            
            {/* Solutions Routes */}
            <Route path="/solutions" element={<SolutionsPage />} />
            <Route path="/solutions/commercial-shipping" element={<div className="pt-24 p-8">Commercial Fleet Solutions Coming Soon</div>} />
            <Route path="/solutions/offshore-energy" element={<div className="pt-24 p-8">Offshore Energy Solutions Coming Soon</div>} />
            <Route path="/solutions/cruise-lines" element={<div className="pt-24 p-8">Cruise & Passenger Solutions Coming Soon</div>} />
            <Route path="/solutions/naval-defense" element={<div className="pt-24 p-8">Naval & Defense Solutions Coming Soon</div>} />
            <Route path="/solutions/port-operations" element={<div className="pt-24 p-8">Port Operations Solutions Coming Soon</div>} />
            <Route path="/solutions/yacht-superyacht" element={<div className="pt-24 p-8">Yacht & Superyacht Solutions Coming Soon</div>} />
            
            {/* Platform Route */}
            <Route path="/platform" element={<PlatformPage />} />
            
            {/* Resources Routes */}
            <Route path="/resources" element={<div className="pt-24 p-8">Resources Page Coming Soon</div>} />
            <Route path="/resources/knowledge-base" element={<div className="pt-24 p-8">Knowledge Base Coming Soon</div>} />
            <Route path="/resources/reports" element={<div className="pt-24 p-8">Industry Reports Coming Soon</div>} />
            <Route path="/resources/webinars" element={<div className="pt-24 p-8">Webinars Coming Soon</div>} />
            
            {/* Case Studies Route */}
            <Route path="/case-studies" element={<div className="pt-24 p-8">Case Studies Coming Soon</div>} />
            
            {/* About Route */}
            <Route path="/about" element={<AboutPage />} />
            
            {/* Contact Route */}
            <Route path="/contact" element={<div className="pt-24 p-8">Contact Page Coming Soon</div>} />
            
            {/* 404 Route */}
            <Route path="*" element={<div className="pt-24 p-8 text-center">Page Not Found</div>} />
          </Routes>
        </main>

        {/* Footer placeholder */}
        <footer className="bg-slate-900 text-white py-12">
          <div className="container mx-auto px-4 text-center">
            <p>&copy; 2025 SeaCore. All rights reserved. Maritime Intelligence Platform.</p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
