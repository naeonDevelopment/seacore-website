import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Mail, 
  Linkedin,
  ExternalLink
} from 'lucide-react'
import { FleetCoreLogo } from '@/components/ui/FleetCoreLogo'

interface FooterProps {}

export const Footer: React.FC<FooterProps> = () => {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    platform: [
      { label: 'Solution', href: '/solutions' },
      { label: 'Platform', href: '/platform' },
      { label: 'About', href: '/about' }
    ],
    resources: [
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Imprint', href: '#', inactive: true }
    ]
  }

  const socialLinks = [
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/company/fleetcore-ai',
      icon: Linkedin
    }
  ]

  return (
    <footer className="bg-slate-900 text-white pb-24 lg:pb-0">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="inline-block mb-4">
              <FleetCoreLogo variant="dark" className="h-8" />
            </div>
            <p className="text-slate-400 text-sm mb-6 max-w-md">
              Maritime Technical Operating System - AI-powered maintenance intelligence platform 
              for modern fleet operations.
            </p>
            <div className="space-y-3">
              <a 
                href="mailto:hello@fleetcore.ai" 
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm group"
              >
                <Mail className="w-4 h-4" />
                <span>hello@fleetcore.ai</span>
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Platform</h3>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link 
                    to={link.href}
                    className="text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  {link.inactive ? (
                    <span className="text-slate-500 cursor-not-allowed text-sm opacity-50">
                      {link.label}
                    </span>
                  ) : (
                    <Link 
                      to={link.href}
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-slate-400 text-sm text-center md:text-left">
            © {currentYear} FleetCore. All rights reserved. Maritime Intelligence Platform.
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors group"
                aria-label={social.name}
              >
                <social.icon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

