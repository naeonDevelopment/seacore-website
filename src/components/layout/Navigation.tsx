import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Sun,
  Moon
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FleetCoreLogo } from '@/components/ui/FleetCoreLogo'
import { cn } from '@/utils/cn'
import { useScrollDirection } from '@/hooks/useScrollDirection'

interface NavigationProps {
  darkMode: boolean
  toggleDarkMode: () => void
}

const Navigation: React.FC<NavigationProps> = ({ darkMode, toggleDarkMode }) => {
  const location = useLocation()
  const { scrollDirection } = useScrollDirection({ threshold: 20 })

  const navigationItems = [
    {
      id: 'solution',
      label: 'Solutions',
      href: '/solutions'
    },
    {
      id: 'platform',
      label: 'Platform',
      href: '/platform'
    },
    {
      id: 'about',
      label: 'About',
      href: '/about'
    },
    {
      id: 'contact',
      label: 'Contact',
      href: '/contact'
    }
  ]

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  // Mobile header visibility logic: hide when scrolling down, show when scrolling up
  const showMobileHeader = scrollDirection === 'up' || scrollDirection === 'initial'
  
  // Dock visibility logic: show when scrolling down, hide when scrolling up (opposite of header)
  const showDock = scrollDirection === 'down' || scrollDirection === 'initial'
  
  // Debug logging
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const qs = new URLSearchParams(window.location.search)
      const debugEnabled = qs.has('debugNav') || (window as any).__DEBUG_NAV === true
      if (!debugEnabled) return
    } catch {
      if ((window as any).__DEBUG_NAV !== true) return
    }
    console.log('Scroll Direction:', scrollDirection, '| Header:', showMobileHeader, '| Dock:', showDock)
  }, [scrollDirection, showMobileHeader, showDock])

  // Hide navigation on assistant page for fullscreen experience
  if (location.pathname === '/assistant') {
    return null
  }

  return (
    <>
      {/* Desktop Header - Always Visible */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 z-50 maritime-glass border-b border-white/20 dark:border-slate-700/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <FleetCoreLogo 
                variant={darkMode ? 'dark' : 'light'}
                className="transition-all duration-300 group-hover:scale-105" 
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="flex items-center space-x-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActiveRoute(item.href)
                      ? "text-maritime-600 bg-maritime-50 dark:bg-maritime-950/50"
                      : "text-slate-700 dark:text-slate-300 hover:text-maritime-600 hover:bg-maritime-50/50 dark:hover:bg-maritime-950/30"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Desktop Actions */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="w-10 h-10 text-slate-700 dark:text-slate-300"
                aria-label="Toggle theme"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header - Scroll Behavior */}
      <motion.nav 
        initial={{ y: 0 }}
        animate={{ 
          y: showMobileHeader ? 0 : -120 
        }}
        transition={{ 
          duration: 0.3, 
          ease: [0.25, 0.46, 0.45, 0.94] 
        }}
        style={{ 
          willChange: 'transform',
          backfaceVisibility: 'hidden' as const
        }}
        className="lg:hidden fixed top-0 left-0 right-0 z-50 maritime-glass border-b border-white/20 dark:border-slate-700/30"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Same as Desktop with Icon */}
            <Link to="/" className="flex items-center space-x-3 group">
              <FleetCoreLogo 
                variant={darkMode ? 'dark' : 'light'}
                className="transition-all duration-300 group-hover:scale-105" 
              />
            </Link>

            {/* Mobile Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="w-10 h-10 text-slate-700 dark:text-slate-300"
                aria-label="Toggle theme"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Bottom Dock Navigation - Floating */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ 
          y: showDock ? 0 : 150 
        }}
        transition={{ 
          duration: 0.3, 
          ease: [0.25, 0.46, 0.45, 0.94] 
        }}
        style={{ 
          willChange: 'transform',
          backfaceVisibility: 'hidden' as const
        }}
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pb-4 px-3"
      >
        <div className={cn(
          "maritime-glass border border-white/20 dark:border-slate-700/30",
          "rounded-3xl shadow-2xl mx-auto max-w-full"
        )}>
          <div className="flex items-center justify-between gap-1 px-2 py-3.5">
            {/* Navigation Items - Optimized for small screens */}
            {navigationItems.map((item) => {
              const isActive = isActiveRoute(item.href)
              
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={cn(
                    "relative flex items-center justify-center px-2 sm:px-3 py-3 rounded-xl",
                    "text-xs sm:text-sm font-semibold transition-all duration-200",
                    "flex-1 whitespace-nowrap min-w-0",
                    isActive
                      ? "text-maritime-600 bg-maritime-50 dark:bg-maritime-950/50"
                      : "text-slate-600 dark:text-slate-400 hover:text-maritime-600 dark:hover:text-maritime-400 hover:bg-maritime-50/30 dark:hover:bg-maritime-950/30"
                  )}
                >
                  {/* Label */}
                  <span className="relative z-10 truncate">
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </motion.div>
    </>
  )
}

export default Navigation
