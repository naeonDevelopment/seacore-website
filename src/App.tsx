import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Navigation from '@/components/layout/Navigation'
import Footer from '@/components/layout/Footer'
import ScrollToTop from '@/components/layout/ScrollToTop'
import HomePage from '@/pages/HomePage'
import SolutionsPage from '@/pages/SolutionsPage'
import PlatformPage from '@/pages/PlatformPage'
import AboutPage from '@/pages/AboutPage'
import ContactPage from '@/pages/ContactPage'
import AssistantPage from '@/pages/AssistantPage'
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage'
import '@/styles/globals.css'
import { Helmet } from 'react-helmet-async'

// Layout component that conditionally renders navigation
function AppLayout({ darkMode, toggleDarkMode }: { darkMode: boolean; toggleDarkMode: () => void }) {
  const location = useLocation();
  const isAssistantPage = location.pathname === '/assistant';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hide Navigation on Assistant page */}
      {!isAssistantPage && <Navigation darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}
        
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            
            {/* Solutions Routes */}
            <Route path="/solutions" element={<SolutionsPage />} />
            <Route path="/solutions/commercial-shipping" element={<><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><div className="pt-24 p-8">Commercial Fleet Solutions Coming Soon</div></>} />
            <Route path="/solutions/offshore-energy" element={<><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><div className="pt-24 p-8">Offshore Energy Solutions Coming Soon</div></>} />
            <Route path="/solutions/cruise-lines" element={<><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><div className="pt-24 p-8">Cruise & Passenger Solutions Coming Soon</div></>} />
            <Route path="/solutions/naval-defense" element={<><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><div className="pt-24 p-8">Naval & Defense Solutions Coming Soon</div></>} />
            <Route path="/solutions/port-operations" element={<><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><div className="pt-24 p-8">Port Operations Solutions Coming Soon</div></>} />
            <Route path="/solutions/yacht-superyacht" element={<><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><div className="pt-24 p-8">Yacht & Superyacht Solutions Coming Soon</div></>} />
            
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
            <Route path="/contact" element={<ContactPage />} />
            
            {/* AI Assistant Route */}
            <Route path="/assistant" element={<AssistantPage darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />
            
            {/* Privacy Policy Route */}
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            
            {/* 404 Route */}
            <Route path="*" element={<div className="pt-24 p-8 text-center">Page Not Found</div>} />
          </Routes>
        </main>

      {/* Hide Footer on Assistant page */}
      {!isAssistantPage && <Footer />}
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false)

  // Initialize theme from localStorage (default to light mode)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    
    if (savedTheme === 'dark') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    } else {
      // Ensure light mode is set (remove any dark class)
      setDarkMode(false)
      document.documentElement.classList.remove('dark')
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
    <Router basename="/">
      <Helmet>
        <title>fleetcore - Agentic Maritime Intelligence Platform</title>
        <meta name="description" content="AI-powered maritime maintenance OS: predictive scheduling, SOLAS/MARPOL automation, and fleet-wide intelligence." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "fleetcore",
            "url": "https://fleetcore.ai/",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://fleetcore.ai/search?q={query}",
              "query-input": "required name=query"
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": [
              { "@type": "SiteNavigationElement", "name": "Solutions", "url": "https://fleetcore.ai/solutions" },
              { "@type": "SiteNavigationElement", "name": "Platform", "url": "https://fleetcore.ai/platform" },
              { "@type": "SiteNavigationElement", "name": "About", "url": "https://fleetcore.ai/about" },
              { "@type": "SiteNavigationElement", "name": "Contact", "url": "https://fleetcore.ai/contact" }
            ]
          })}
        </script>
      </Helmet>
      <ScrollToTop />
      <AppLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
    </Router>
  )
}

export default App
