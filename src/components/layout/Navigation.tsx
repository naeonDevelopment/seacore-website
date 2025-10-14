import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Menu, 
  X, 
  Sun,
  Moon
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SeaCoreLogo } from '@/components/ui/SeaCoreLogo'
import { cn } from '@/utils/cn'

interface NavigationProps {
  darkMode: boolean
  toggleDarkMode: () => void
}

const Navigation: React.FC<NavigationProps> = ({ darkMode, toggleDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  const navigationItems = [
    {
      id: 'home',
      label: 'Home',
      href: '/'
    },
    {
      id: 'solution',
      label: 'Solution',
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
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-[9999999] maritime-glass border-b border-white/20 dark:border-slate-700/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <SeaCoreLogo className="transition-all duration-300 group-hover:scale-105 w-36 h-9" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
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
          <div className="hidden lg:flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="w-10 h-10"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button variant="gradient" size="sm">
              Sign In
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="w-10 h-10"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              className="w-10 h-10"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden border-t border-white/20 dark:border-slate-700/30"
            >
              <div className="py-4 space-y-2">
                {navigationItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.href}
                    className={cn(
                      "block px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200",
                      isActiveRoute(item.href)
                        ? "text-maritime-600 bg-maritime-50 dark:bg-maritime-950/50"
                        : "text-slate-700 dark:text-slate-300 hover:text-maritime-600 hover:bg-maritime-50/50"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="pt-4 border-t border-white/20 dark:border-slate-700/30">
                  <Button variant="gradient" className="w-full">
                    Sign In
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

export default Navigation
