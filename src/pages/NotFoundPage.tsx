import React from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Home, Ship, ArrowRight } from 'lucide-react'
import { FleetCoreLogo } from '@/components/ui/FleetCoreLogo'

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Helmet>
        <title>Page Not Found — fleetcore</title>
        <meta name="description" content="The page you requested could not be found. Navigate back to fleetcore's maritime maintenance platform." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <div className="p-6">
        <Link to="/" aria-label="fleetcore home">
          <FleetCoreLogo variant="dark" className="h-7" />
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center">
              <Ship className="w-10 h-10 text-sky-400" />
            </div>
          </div>

          <p className="text-sky-400 font-mono text-sm tracking-widest uppercase mb-3">404</p>
          <h1 className="text-3xl font-bold text-white mb-4">Page not found</h1>
          <p className="text-slate-400 text-base mb-8 leading-relaxed">
            This page has drifted off course. Let&rsquo;s navigate you back to the fleetcore platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              Back to homepage
            </Link>
            <Link
              to="/platform"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
            >
              Explore the platform
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Solutions', href: '/solutions' },
              { label: 'Platform', href: '/platform' },
              { label: 'About', href: '/about' },
              { label: 'Contact', href: '/contact' },
            ].map(({ label, href }) => (
              <Link
                key={href}
                to={href}
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
