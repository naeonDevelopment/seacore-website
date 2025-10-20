import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Mail,
  Phone,
  MapPin,
  Calendar,
  Linkedin,
  Facebook,
  MessageSquare,
  Clock,
  Globe,
  CheckCircle,
  ArrowRight,
  Briefcase,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { ScrollGradientBackground } from '@/components/ui/ScrollGradientBackground'
import { ContactHeroBackground } from '@/components/ui/ContactHeroBackground'
import { Helmet } from 'react-helmet-async'

interface ContactPageProps {}

export const ContactPage: React.FC<ContactPageProps> = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const calendlyContainerRef = React.useRef<HTMLDivElement | null>(null)

  // Local X (formerly Twitter) logo as SVG component
  const XLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 4L20 20M20 4L4 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )

  const scrollToBooking = () => {
    const el = document.getElementById('booking')
    if (!el) return
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (_) {
      // Fallback for browsers without smooth option support
      const top = el.getBoundingClientRect().top + window.pageYOffset - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  // Detect dark mode from document class
  React.useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    checkDarkMode()
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    return () => observer.disconnect()
  }, [])

  // Load Calendly inline widget script once
  React.useEffect(() => {
    // Ensure Calendly CSS is present
    const existingCss = document.querySelector('link[href*="assets.calendly.com/assets/external/widget.css"]') as HTMLLinkElement | null
    if (!existingCss) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://assets.calendly.com/assets/external/widget.css'
      document.head.appendChild(link)
    }

    const initInline = () => {
      if (window.Calendly && calendlyContainerRef.current) {
        window.Calendly.initInlineWidget({
          url: 'https://calendly.com/fleetcore-ai/30min',
          parentElement: calendlyContainerRef.current
        })
      }
    }

    const existing = document.querySelector('script[src*="assets.calendly.com/assets/external/widget.js"]') as HTMLScriptElement | null
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://assets.calendly.com/assets/external/widget.js'
      script.async = true
      script.onload = initInline
      document.body.appendChild(script)
    } else {
      // Script already present; try to init immediately
      initInline()
    }
  }, [])

  // Contact methods
  const contactMethods = [
    {
      icon: Mail,
      title: 'Email Us',
      description: 'Get in touch via email for general inquiries',
      value: 'hello (at) fleetcore.ai',
      action: 'mailto:hello@fleetcore.ai',
      gradient: 'from-blue-500 to-cyan-600',
      active: true
    },
    {
      icon: Phone,
      title: 'Call Us',
      description: 'Speak directly with our team',
      value: '+961 3 905 100',
      action: 'tel:+9613905100',
      gradient: 'from-emerald-500 to-teal-600',
      active: true
    },
    {
      icon: MapPin,
      title: 'Visit Us',
      description: 'Office location details',
      value: 'Dubai',
      action: '#location',
      gradient: 'from-purple-500 to-pink-600',
      active: false
    }
  ]

  // Social media links
  const socialLinks = [
    {
      icon: Linkedin,
      name: 'LinkedIn',
      description: 'Connect with us professionally',
      url: 'https://linkedin.com/company/fleetcore-ai',
      gradient: 'from-blue-600 to-blue-700',
      handle: '@fleetcore-ai',
      active: true
    },
    {
      icon: XLogo,
      name: 'X',
      description: 'Follow for updates and insights',
      url: '#',
      gradient: 'from-sky-400 to-blue-500',
      handle: 'Coming Soon',
      active: false,
      externalIconUrl: 'https://cdn.simpleicons.org/x/FFFFFF'
    },
    {
      icon: Facebook,
      name: 'Facebook',
      description: 'Community updates and news',
      url: '#',
      gradient: 'from-blue-500 to-blue-700',
      handle: 'Coming Soon',
      active: false
    },
    {
      icon: MessageSquare,
      name: 'Blog',
      description: 'Read our latest articles and insights',
      url: '#',
      gradient: 'from-orange-500 to-red-600',
      handle: 'Coming Soon',
      active: false
    }
  ]

  // Office hours
  const officeHours = [
    { day: 'Monday - Friday', hours: '9:00 AM - 6:00 PM GST' },
    { day: 'Saturday', hours: '10:00 AM - 2:00 PM GST' },
    { day: 'Sunday', hours: 'Closed' }
  ]

  // Why contact us reasons
  const contactReasons = [
    {
      icon: Calendar,
      title: 'Schedule a Demo',
      description: 'See the platform in action with a personalized walkthrough'
    },
    {
      icon: Briefcase,
      title: 'Enterprise Solutions',
      description: 'Discuss custom solutions for your fleet operations'
    },
    {
      icon: MessageSquare,
      title: 'Technical Support',
      description: 'Get help with implementation and integration'
    },
    {
      icon: Building2,
      title: 'Partnership Opportunities',
      description: 'Explore collaboration and partnership possibilities'
    }
  ]

  // Scroll gradient sections
  const gradientSections = [
    { 
      id: 'hero', 
      colors: { 
        primary: 'rgba(59, 130, 246, 1)', // Blue
        secondary: 'rgba(16, 185, 129, 1)' // Emerald
      },
      position: 'from-center'
    },
    { 
      id: 'methods', 
      colors: { 
        primary: 'rgba(16, 185, 129, 1)', // Emerald
        secondary: 'rgba(168, 85, 247, 1)' // Purple
      },
      position: 'from-top-left'
    },
    { 
      id: 'booking', 
      colors: { 
        primary: 'rgba(168, 85, 247, 1)', // Purple
        secondary: 'rgba(236, 72, 153, 1)' // Pink
      },
      position: 'from-right'
    },
    { 
      id: 'social', 
      colors: { 
        primary: 'rgba(14, 165, 233, 1)', // Sky
        secondary: 'rgba(99, 102, 241, 1)' // Indigo
      },
      position: 'from-bottom'
    }
  ]

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Contact FleetCore</title>
        <meta name="description" content="Book a demo or reach our team by email or phone. Fast response, global support." />
        <link rel="canonical" href="https://fleetcore.ai/contact" />
        <meta property="og:title" content="Contact FleetCore" />
        <meta property="og:description" content="Book a demo or reach our team by email or phone." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fleetcore.ai/contact" />
        <meta property="og:image" content="/og/contact.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            "name": "Contact FleetCore",
            "url": "https://fleetcore.ai/contact",
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://fleetcore.ai/" },
                { "@type": "ListItem", "position": 2, "name": "Contact", "item": "https://fleetcore.ai/contact" }
              ]
            },
            "mainEntity": {
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "How can I schedule a demo?",
                  "acceptedAnswer": { "@type": "Answer", "text": "Use the Calendly widget on this page or email hello@fleetcore.ai to book a session." }
                },
                {
                  "@type": "Question",
                  "name": "What is the best contact method?",
                  "acceptedAnswer": { "@type": "Answer", "text": "Email hello@fleetcore.ai or call +961 3 905 100 for sales and enterprise inquiries." }
                }
              ]
            }
          })}
        </script>
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fleetcore_ai" />
        <meta name="twitter:title" content="Contact FleetCore" />
        <meta name="twitter:description" content="Book a demo or reach our team by email or phone." />
        <meta name="twitter:image" content="/og/contact.png" />
      </Helmet>
      {/* Dynamic Scroll Gradient Background */}
      <ScrollGradientBackground sections={gradientSections} />

      {/* Hero Section */}
      <section className="relative pt-16 lg:pt-32 pb-20 overflow-hidden min-h-[85vh] flex items-center">
        {/* Background */}
        <ContactHeroBackground isDarkMode={isDarkMode} />
        
        <div className="container mx-auto px-4 relative z-50">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.6,
              ease: [0.25, 0.1, 0.25, 1.0]
            }}
            className="max-w-5xl mx-auto text-center"
            style={{ 
              willChange: 'opacity, transform',
              transform: 'translateZ(0)'
            }}
          >
            <div 
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 dark:from-blue-900/30 dark:to-emerald-900/30 mb-8"
              style={{
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
              }}
            >
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Get In Touch</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight enterprise-heading">
              <span 
                className="text-black dark:text-white"
                style={{ 
                  textShadow: isDarkMode
                    ? '0 0 60px rgba(0,0,0,0.3), 0 0 120px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.25)'
                    : '0 0 60px rgba(255,255,255,0.4), 0 0 120px rgba(255,255,255,0.3), 0 4px 30px rgba(255,255,255,0.35)',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              >
                Let's Transform
              </span>
              <br />
              <span 
                className="maritime-gradient-text"
                style={{ 
                  textShadow: isDarkMode
                    ? '0 0 60px rgba(0,0,0,0.3), 0 0 120px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.25)'
                    : '0 0 60px rgba(255,255,255,0.4), 0 0 120px rgba(255,255,255,0.3), 0 4px 30px rgba(255,255,255,0.35)',
                  filter: isDarkMode ? 'brightness(1.6) saturate(1.05)' : 'brightness(0.7) saturate(1.2)',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              >
                Your Fleet Operations
              </span>
            </h1>

            <p 
              className="text-lg md:text-xl text-black dark:text-white enterprise-body max-w-3xl mx-auto mb-12 font-semibold"
              style={{ 
                textShadow: isDarkMode
                  ? '0 0 50px rgba(0,0,0,0.35), 0 0 100px rgba(0,0,0,0.25), 0 3px 25px rgba(0,0,0,0.3)'
                  : '0 0 50px rgba(255,255,255,0.45), 0 0 100px rgba(255,255,255,0.35), 0 3px 25px rgba(255,255,255,0.4)',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
              }}
            >
              Whether you're ready for a demo, have questions about our platform, or want to discuss 
              enterprise solutions — we're here to help.
            </p>

            {/* Contact Highlights */}
            <div 
              className="flex flex-wrap gap-3 justify-center"
              style={{
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
              }}
            >
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                <Clock className="w-4 h-4" />
                <span>Fast Response</span>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                <MessageSquare className="w-4 h-4" />
                <span>Multi-Channel Support</span>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-sm font-medium">
                <Globe className="w-4 h-4" />
                <span>Global Reach</span>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium">
                <Briefcase className="w-4 h-4" />
                <span>Enterprise Support</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mb-6">
              <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Contact Methods</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              Multiple Ways to <span className="maritime-gradient-text">Connect</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto enterprise-body">
              Choose the communication channel that works best for you
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {contactMethods.map((method, index) => {
              const Icon = method.icon
              const CardWrapper = method.active ? 'a' : 'div'
              
              return (
                <motion.div
                  key={method.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <CardWrapper
                    {...(method.active ? { href: method.action } : {})}
                    className={cn(
                      "block h-full p-8 rounded-3xl border bg-white dark:bg-slate-800 shadow-xl transition-all duration-300 relative",
                      method.active 
                        ? "hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442]"
                        : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {!method.active && (
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs font-bold shadow-lg">
                        Coming Soon
                      </div>
                    )}
                    
                    <div className={cn(
                      "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mx-auto mb-6 shadow-lg",
                      method.gradient,
                      !method.active && "opacity-60"
                    )}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 enterprise-heading text-center">
                      {method.title}
                    </h3>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 enterprise-body text-center">
                      {method.description}
                    </p>
                    
                    <p className="text-lg font-semibold maritime-gradient-text text-center">
                      {method.value}
                    </p>
                  </CardWrapper>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Calendly Booking Section */}
      <section id="booking" className="py-24 relative overflow-hidden bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-6">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Book a Meeting</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              <span className="maritime-gradient-text">Schedule</span> a Personalized Demo
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto enterprise-body mb-12">
              See FleetCore in action. Book a time that works for you and we'll provide a comprehensive 
              walkthrough tailored to your fleet's needs.
            </p>
          </motion.div>

          {/* Why Schedule Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-12">
            {contactReasons.map((reason, index) => {
              const Icon = reason.icon
              return (
                <motion.div
                  key={reason.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="p-6 rounded-2xl border bg-white dark:bg-slate-800 shadow-lg h-full transition-all duration-300 hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442]">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 shadow-lg">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 enterprise-heading">
                      {reason.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 enterprise-body">
                      {reason.description}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Calendly Embed Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto"
          >
            <div className="rounded-3xl border bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
              <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 enterprise-heading">
                      Select Your Preferred Time
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 enterprise-body">
                      Choose a convenient time slot for your personalized demo
                    </p>
                  </div>
                  <Clock className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              
              {/* Calendly Inline Embed */}
              <div className="aspect-[9/16] md:aspect-[4/3] lg:aspect-[16/10] bg-white dark:bg-slate-900">
                <div ref={calendlyContainerRef} className="w-full h-full" style={{ minWidth: '320px', height: '100%' }} />
              </div>
            </div>

            {/* Office Hours */}
            <div className="mt-8 p-6 rounded-2xl border bg-white dark:bg-slate-800 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 enterprise-heading">
                  Office Hours
                </h3>
              </div>
              <div className="space-y-2">
                {officeHours.map((schedule, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {schedule.day}
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {schedule.hours}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Media Section */}
      <section className="py-24 relative overflow-hidden bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-sky-100 to-indigo-100 dark:from-sky-900/30 dark:to-indigo-900/30 mb-6">
              <Globe className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <span className="text-sm font-medium text-sky-700 dark:text-sky-300">Connect With Us</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              Follow Our <span className="maritime-gradient-text">Journey</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto enterprise-body">
              Stay updated with the latest maritime technology insights, product updates, and industry news
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {socialLinks.map((social, index) => {
              const Icon = social.icon
              return (
                <motion.div
                  key={social.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  {social.active ? (
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full p-8 rounded-3xl border bg-white dark:bg-slate-800 shadow-xl hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300"
                    >
                      <div className={cn(
                        "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mx-auto mb-6 shadow-lg",
                        social.gradient
                      )}>
                        {social.externalIconUrl ? (
                          <img src={social.externalIconUrl} alt={social.name} className="w-8 h-8" />
                        ) : (
                          <Icon className="w-8 h-8 text-white" />
                        )}
                      </div>
                      
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 enterprise-heading text-center">
                        {social.name}
                      </h3>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 enterprise-body text-center">
                        {social.description}
                      </p>
                      
                      <p className="text-base font-semibold maritime-gradient-text text-center">
                        {social.handle}
                      </p>
                    </a>
                  ) : (
                    <div
                      className="block h-full p-8 rounded-3xl border bg-white dark:bg-slate-800 shadow-xl transition-all duration-300 opacity-50 cursor-not-allowed relative"
                    >
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs font-bold shadow-lg">
                        Coming Soon
                      </div>
                      <div className={cn(
                        "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mx-auto mb-6 shadow-lg opacity-60",
                        social.gradient
                      )}>
                        {social.externalIconUrl ? (
                          <img src={social.externalIconUrl} alt={social.name} className="w-8 h-8" />
                        ) : (
                          <Icon className="w-8 h-8 text-white" />
                        )}
                      </div>
                      
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 enterprise-heading text-center">
                        {social.name}
                      </h3>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 enterprise-body text-center">
                        {social.description}
                      </p>
                      
                      <p className="text-base font-semibold text-slate-500 dark:text-slate-400 text-center">
                        {social.handle}
                      </p>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="p-12 rounded-3xl border bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 shadow-2xl">
              <CheckCircle className="w-16 h-16 text-emerald-600 dark:text-emerald-400 mx-auto mb-6" />
              
              <h2 className="text-3xl md:text-4xl font-bold enterprise-heading mb-4">
                Ready to Get Started?
              </h2>
              
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 enterprise-body">
                Join leading maritime operators who trust FleetCore for their fleet maintenance operations
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  type="button"
                  onClick={scrollToBooking}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 h-14 rounded-xl px-10 text-lg group"
                >
                  <Calendar className="w-5 h-5" />
                  Book Your Demo Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a href="mailto:hello@fleetcore.ai">
                  <Button variant="outline" size="xl">
                    <Mail className="w-5 h-5" />
                    hello@fleetcore.ai
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default ContactPage

