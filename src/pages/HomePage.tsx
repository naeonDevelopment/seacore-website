import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { 
  ArrowRight, 
  Play, 
  Ship,
  Brain,
  Shield,
  Zap,
  Globe,
  TrendingUp,
  Users,
  Award,
  CheckCircle,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  DollarSign,
  Settings,
  BarChart3,
  Database,
  Wrench,
  Layers,
  Network,
  Workflow,
  Bell,
  FileCheck,
  User,
  Package,
  Calendar,
  Bot,
  Boxes,
  ExternalLink,
  Upload,
  Link2,
  Building2,
  Sailboat
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Collapsible } from '@/components/ui/Collapsible'
import { CapabilityCard } from '@/components/ui/CapabilityCard'
import { RoleCard } from '@/components/ui/RoleCard'
import { Carousel } from '@/components/ui/Carousel'
import { HeroVideoBackground } from '@/components/ui/HeroVideoBackground'
import { ExecutiveRoleVideoBackground } from '@/components/ui/ExecutiveRoleVideoBackground'
import { IndustryParallaxBackground } from '@/components/ui/IndustryParallaxBackground'
import { ScrollGradientBackground } from '@/components/ui/ScrollGradientBackground'
import { cn } from '@/utils/cn'
import { getIconGradient, getIconColor } from '@/utils/iconColors'

const HomePage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Detect dark mode from document class
  React.useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    // Initial check
    checkDarkMode()
    
    // Watch for changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  // Enterprise Maritime Core Capabilities
  const coreCapabilities = [
    {
      title: 'OEM PMS Integration & Auto-Scheduling',
      description: 'Import manufacturer PMS recommendations and automatically generate vessel-specific maintenance schedules based on working hours and time intervals with dual-threshold early warning systems.',
      metric: { value: '94%', label: 'Automated Task Generation', percentage: 94 },
      icon: Calendar,
      gradient: 'from-emerald-500 to-teal-600',
      features: ['OEM PMS import', 'Auto-schedule generation', 'Dual-interval tracking', 'Schedule-specific hours', 'Early warning alerts', 'Always-recurring schedules'],
      badge: {
        text: 'Automated PMS',
        icon: CheckCircle,
        color: 'bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 text-emerald-700 dark:text-emerald-300'
      }
    },
    {
      title: 'Event-Based Unplanned Maintenance',
      description: 'Digital transformation of paper-based breakdown reporting with real-time event capture, automatic workflow routing, root cause analysis, and seamless integration with planned maintenance system.',
      metric: { value: '100%', label: 'Digital Event Tracking', percentage: 100 },
      icon: AlertTriangle,
      gradient: 'from-red-500 to-orange-600',
      features: ['Real-time event capture', 'Automatic PMS linking', 'Work done records', 'Photo documentation', 'Notification automation', 'Audit trail compliance'],
      badge: {
        text: 'Event System',
        icon: Bell,
        color: 'bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 text-red-700 dark:text-red-300'
      }
    },
    {
      title: 'Equipment Lifecycle Management',
      description: 'Complete equipment tracking from installation to decommissioning with hierarchical system organization, working hours monitoring, health assessments, and manufacturer documentation integration.',
      metric: { value: '500+', label: 'Equipment Items per Vessel', percentage: 100 },
      icon: Settings,
      gradient: 'from-blue-500 to-indigo-600',
      features: ['Installation tracking', 'Working hours monitoring', 'Health assessments', 'System hierarchy', 'Serial number tracking', 'Position management'],
      badge: {
        text: 'Full Lifecycle',
        icon: Wrench,
        color: 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300'
      }
    },
    {
      title: 'Intelligent Spare Parts Management',
      description: 'Comprehensive inventory control with automated stock level monitoring, critical parts flagging, consumption tracking, and predictive ordering based on maintenance schedules and historical usage patterns.',
      metric: { value: '91%', label: 'Stock Optimization', percentage: 91 },
      icon: Package,
      gradient: 'from-cyan-500 to-blue-600',
      features: ['Critical parts tracking', 'Stock level alerts', 'Consumption analysis', 'Predictive ordering', 'Supplier integration', 'Cost optimization'],
      badge: {
        text: 'Smart Inventory',
        icon: Boxes,
        color: 'bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 text-cyan-700 dark:text-cyan-300'
      }
    },
    {
      title: 'SOLAS 2024 Compliance Management',
      description: 'Automated regulatory compliance tracking with SOLAS 2024, MARPOL, and ISM Code requirements built directly into maintenance workflows, inspection schedules, and documentation management.',
      metric: { value: '100%', label: 'Regulatory Compliance', percentage: 100 },
      icon: Shield,
      gradient: 'from-purple-500 to-violet-600',
      features: ['SOLAS 2024 integration', 'MARPOL tracking', 'ISM Code compliance', 'Audit trail automation', 'Certificate management', 'Port State Control readiness'],
      badge: {
        text: 'Compliant',
        icon: Award,
        color: 'bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 text-purple-700 dark:text-purple-300'
      }
    },
    {
      title: 'Multi-Tenant Fleet Intelligence',
      description: 'Enterprise-grade multi-organization architecture with role-based access control, STCW-compliant user management, cross-vessel learning patterns, and centralized fleet performance analytics.',
      metric: { value: '500+', label: 'Vessels Supported', percentage: 100 },
      icon: Ship,
      gradient: 'from-indigo-500 to-purple-600',
      features: ['Multi-organization support', 'STCW role management', 'Fleet-wide analytics', 'Cross-vessel learning', 'Performance benchmarking', 'Centralized visibility'],
      badge: {
        text: 'Enterprise Scale',
        icon: Globe,
        color: 'bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300'
      }
    },
    {
      title: 'Digital Documentation & Reporting',
      description: 'Paperless operations with digital work done records, photo documentation, PDF report generation, automated compliance reports, and comprehensive audit trails for all maintenance activities.',
      metric: { value: '100%', label: 'Paperless Operations', percentage: 100 },
      icon: FileCheck,
      gradient: 'from-orange-500 to-amber-600',
      features: ['Digital work records', 'Photo attachments', 'PDF generation', 'Audit trail tracking', 'Compliance reports', 'Historical documentation'],
      badge: {
        text: 'Paperless',
        icon: CheckCircle,
        color: 'bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-700 dark:text-orange-300'
      }
    },
    {
      title: 'Advanced Analytics & Intelligence',
      description: 'Data-driven decision making with predictive maintenance algorithms, equipment health scoring, performance trend analysis, cost optimization insights, and AI-powered failure pattern recognition.',
      metric: { value: '87%', label: 'Prediction Accuracy', percentage: 87 },
      icon: Brain,
      gradient: 'from-pink-500 to-rose-600',
      features: ['Predictive analytics', 'Health scoring', 'Trend analysis', 'Cost optimization', 'Pattern recognition', 'Performance insights'],
      badge: {
        text: 'AI Analytics',
        icon: Bot,
        color: 'bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 text-pink-700 dark:text-pink-300'
      }
    }
  ]

  // Enterprise Integration Process
  const integrationProcess = [
    {
      step: '01',
      title: 'Fleet & Equipment Onboarding',
      description: 'Rapid fleet setup with one-click PMS schedule generation from OEM recommendations, automated task creation, and vessel documentation upload for complete technical history.',
      features: ['One-Click PMS Schedules', 'Auto Task Generation', 'Document Upload', 'Equipment Cataloging'],
      icon: Upload,
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      step: '02',
      title: 'System Integration & Intelligence',
      description: 'Connect existing ERP, inventory, and procurement systems for enhanced operational precision and cross-platform intelligence through secure API integration.',
      features: ['ERP Connectivity', 'Inventory Integration', 'Procurement Systems', 'Data Synchronization'],
      icon: Link2,
      gradient: 'from-purple-500 to-violet-600'
    },
    {
      step: '03',
      title: 'Operational Excellence',
      description: 'Day-to-day operations powered by automated workflows with strategic human-in-the-loop decision points and seamless out-of-platform operation strategies for maximum flexibility.',
      features: ['Automated Workflows', 'Human-in-the-Loop Strategy', 'Out-of-Platform Operations', 'Continuous Optimization'],
      icon: Workflow,
      gradient: 'from-emerald-500 to-teal-600'
    }
  ]

  // Executive Role Solutions
  const executiveRoles = [
    {
      role: 'Technical Superintendent',
      metric: { value: 500, suffix: '+ Vessels', label: 'Enterprise Fleet Scale', color: 'text-blue-600 dark:text-blue-400' },
      description: 'Shore-based fleet technical oversight with centralized equipment tracking, standardized maintenance procedures, and regulatory audit readiness across multiple vessels and organizations.',
      benefits: [
        'Multi-vessel equipment lifecycle visibility',
        'Standardized PMS across entire fleet',
        'Port State Control audit preparation',
        'Cross-vessel performance benchmarking',
        'Shore-to-ship technical coordination'
      ],
      icon: Ship,
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      role: 'Chief Engineer',
      metric: { value: 24, suffix: '/7', label: 'Real-Time Monitoring', color: 'text-emerald-600 dark:text-emerald-400' },
      description: 'Vessel-level maintenance command with dual-interval scheduling, continuous equipment monitoring, event-driven breakdown management, and crew task coordination.',
      benefits: [
        'Dual-interval PMS (hours + time-based)',
        'Schedule-specific hours tracking',
        'Instant event capture for breakdowns',
        'Crew workload optimization',
        'Equipment history at your fingertips'
      ],
      icon: Wrench,
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      role: 'Fleet Operations Team',
      metric: { value: 100, suffix: '% Digital', label: 'Paperless Operations', color: 'text-purple-600 dark:text-purple-400' },
      description: 'Task-integrated operational intelligence with digital documentation, spare parts tracking, workflow-embedded analytics, and comprehensive compliance audit trails.',
      benefits: [
        'Digital work done records with photos',
        'Spare parts consumption tracking',
        'Task-driven operational insights',
        'STCW-compliant user permissions',
        'Complete regulatory audit trails'
      ],
      icon: BarChart3,
      gradient: 'from-purple-500 to-violet-600'
    }
  ]

  const industries = [
    { id: 'commercial', name: 'Commercial Fleet', icon: Ship, href: '/solutions/commercial-shipping', category: 'fleet' },
    { id: 'offshore', name: 'Offshore Energy', icon: Zap, href: '/solutions/offshore-energy', category: 'operations' },
    { id: 'cruise', name: 'Cruise & Passenger', icon: Users, href: '/solutions/cruise-lines', category: 'fleet' },
    { id: 'naval', name: 'Naval & Defense', icon: Shield, href: '/solutions/naval-defense', category: 'system' },
    { id: 'ports', name: 'Port Operations', icon: Building2, href: '/solutions/port-operations', category: 'intelligence' },
    { id: 'yacht', name: 'Yacht & Superyacht', icon: Sailboat, href: '/solutions/yacht-superyacht', category: 'auxiliary' }
  ]

  // Scroll gradient sections configuration - smooth color transitions
  const gradientSections = [
    { 
      id: 'challenges', 
      colors: { 
        primary: 'rgba(251, 113, 133, 1)', // Rose - challenges/problems
        secondary: 'rgba(251, 146, 60, 1)' // Orange - urgency
      },
      position: 'from-top-left'
    },
    { 
      id: 'solutions', 
      colors: { 
        primary: 'rgba(34, 197, 94, 1)', // Green - solutions/growth
        secondary: 'rgba(16, 185, 129, 1)' // Emerald - success
      },
      position: 'from-right'
    },
    { 
      id: 'capabilities', 
      colors: { 
        primary: 'rgba(147, 51, 234, 1)', // Purple - innovation
        secondary: 'rgba(168, 85, 247, 1)' // Violet - technology
      },
      position: 'from-bottom'
    },
    { 
      id: 'integration', 
      colors: { 
        primary: 'rgba(59, 130, 246, 1)', // Blue - integration/connectivity
        secondary: 'rgba(99, 102, 241, 1)' // Indigo - systems
      },
      position: 'from-left'
    },
    { 
      id: 'cta', 
      colors: { 
        primary: 'rgba(6, 182, 212, 1)', // Cyan - action/energy
        secondary: 'rgba(14, 165, 233, 1)' // Sky - clarity
      },
      position: 'from-center'
    }
  ]

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>fleetcore: Agentic Maintenance Operating System | Global Maritime Intelligence Platform</title>
        <meta name="description" content="Transform fleet operations with centralized OEM intelligence from 100+ manufacturers and real-world global maintenance data. AI-powered maintenance OS delivers vendor-neutral optimization, predictive automation, and cross-fleet learning. Eliminate reactive maintenance, reduce costs 20-30%, ensure compliance." />
        <link rel="canonical" href="https://fleetcore.ai/" />
        <meta property="og:title" content="fleetcore: Agentic Maintenance Operating System" />
        <meta property="og:description" content="Centralized OEM intelligence from 100+ maritime manufacturers. Vendor-neutral maintenance OS delivers predictive automation, cross-fleet optimization, regulatory compliance. Transform reactive operations into strategic asset management." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fleetcore.ai/" />
        <meta property="og:image" content="https://fleetcore.ai/og/home.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fleetcore_ai" />
        <meta name="twitter:title" content="fleetcore: Agentic Maintenance Operating System" />
        <meta name="twitter:description" content="Global maritime maintenance intelligence: 100+ OEM manufacturers and real-world maintenance data unified. Vendor-neutral optimization, predictive analytics, automated compliance. Transform fleet operations with proven 20-30% cost reduction." />
        <meta name="twitter:image" content="https://fleetcore.ai/og/home.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["WebPage", "FAQPage"],
            "name": "fleetcore Home",
            "url": "https://fleetcore.ai/",
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://fleetcore.ai/" }
              ]
            },
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is fleetcore?",
                "acceptedAnswer": { "@type": "Answer", "text": "An AI-powered maritime maintenance OS that automates scheduling, ensures SOLAS/MARPOL compliance, and delivers fleet-wide intelligence." }
              },
              {
                "@type": "Question",
                "name": "Who is fleetcore for?",
                "acceptedAnswer": { "@type": "Answer", "text": "Enterprise maritime operators—technical superintendents, chief engineers, and fleet operations teams managing multi-vessel fleets." }
              }
            ]
          })}
        </script>
      </Helmet>
      {/* Dynamic Scroll Gradient Background */}
      <ScrollGradientBackground sections={gradientSections} />
      {/* Hero Section - Two Column Layout with Video Background */}
      <section className="relative pt-16 lg:pt-24 pb-24 lg:pb-20 overflow-hidden min-h-[80vh] flex items-center">
        {/* Fallback gradients (shown while video loads) - behind video */}
        <div className="absolute inset-0 bg-gradient-to-br from-maritime-50/50 via-ocean-50/30 to-signal-50/20 dark:from-maritime-950/50 dark:via-ocean-950/30 dark:to-signal-950/20 z-0"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.05),transparent_50%)] z-0"></div>
        
        {/* Video Background - above gradients */}
        <HeroVideoBackground isDarkMode={isDarkMode} />
        
        <div className="container mx-auto px-4 relative z-50">
          {/* Desktop Only - Original Badge Above Headings */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5,
              ease: [0.25, 0.1, 0.25, 1.0]
            }}
            className="text-center mb-12 px-4 hidden md:block"
            style={{ 
              willChange: 'opacity, transform',
              transform: 'translateZ(0)'
            }}
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-maritime-100 to-ocean-100 dark:from-maritime-900/30 dark:to-ocean-900/30 max-w-full">
              <Database className="w-5 h-5 flex-shrink-0 text-maritime-600 dark:text-maritime-400" />
              <span className="text-sm font-medium text-maritime-700 dark:text-maritime-300 text-center leading-snug">
                Centralized knowledge base • Verified OEM recommendations • Individual vessel intelligence
              </span>
            </div>
          </motion.div>

          <div className="max-w-4xl mx-auto text-center mb-12">
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.6,
                delay: 0.1,
                ease: [0.25, 0.1, 0.25, 1.0]
              }}
              className="space-y-6"
              style={{ 
                willChange: 'opacity, transform',
                transform: 'translateZ(0)'
              }}
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold enterprise-heading leading-tight">
                <span 
                  className="maritime-gradient-text block" 
                  style={{ 
                    textShadow: isDarkMode
                      ? '0 0 60px rgba(0,0,0,0.3), 0 0 120px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.25)'
                      : '0 0 60px rgba(255,255,255,0.4), 0 0 120px rgba(255,255,255,0.3), 0 4px 30px rgba(255,255,255,0.35)',
                    filter: isDarkMode ? 'brightness(1.6) saturate(1.05)' : 'brightness(0.7) saturate(1.2)',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}
                >
                  Maritime Technical
                </span>
                <span 
                  className="text-black dark:text-white block" 
                  style={{ 
                    textShadow: isDarkMode
                      ? '0 0 60px rgba(0,0,0,0.3), 0 0 120px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.25)'
                      : '0 0 60px rgba(255,255,255,0.4), 0 0 120px rgba(255,255,255,0.3), 0 4px 30px rgba(255,255,255,0.35)',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}
                >
                  Operating System
                </span>
              </h1>
              
              <p 
                className="text-lg md:text-xl text-black dark:text-white enterprise-body leading-relaxed max-w-3xl mx-auto font-semibold" 
                style={{ 
                  textShadow: isDarkMode
                    ? '0 0 50px rgba(0,0,0,0.35), 0 0 100px rgba(0,0,0,0.25), 0 3px 25px rgba(0,0,0,0.3)'
                    : '0 0 50px rgba(255,255,255,0.45), 0 0 100px rgba(255,255,255,0.35), 0 3px 25px rgba(255,255,255,0.4)',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              >
                Bridge OEM PMS with Real-World Operations - Condition Monitoring, Predictive Maintenance & Automated Workflows
              </p>

              {/* Mobile Only - Feature Pills Below Description */}
              <div className="flex flex-wrap gap-1.5 justify-center px-4 md:hidden mb-2">
                <div className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30 text-sky-700 dark:text-sky-300 text-xs font-medium whitespace-nowrap">
                  <Database className="w-3 h-3 flex-shrink-0" />
                  <span>Centralized Knowledge Base</span>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium whitespace-nowrap">
                  <CheckCircle className="w-3 h-3 flex-shrink-0" />
                  <span>Verified OEM Recommendations</span>
                </div>
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-teal-100 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30 text-teal-700 dark:text-teal-300 text-xs sm:text-sm font-medium whitespace-nowrap">
                  <Ship className="w-3 h-3 flex-shrink-0" />
                  <span>Individual Vessel Intelligence</span>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium whitespace-nowrap">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span>Automated Scheduling</span>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium whitespace-nowrap">
                  <Brain className="w-3 h-3 flex-shrink-0" />
                  <span>AI Layer</span>
                </div>
              </div>

              {/* Desktop Only - System Architecture Tags Below Description */}
              <div className="hidden md:flex flex-wrap gap-3 justify-center px-4">
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium whitespace-nowrap">
                  <Database className="w-4 h-4 flex-shrink-0" />
                  <span>Global Database</span>
                </div>
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium whitespace-nowrap">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Automated Scheduling</span>
                </div>
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium whitespace-nowrap">
                  <Brain className="w-4 h-4 flex-shrink-0" />
                  <span>AI Intelligence Layer</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5,
              delay: 0.3,
              ease: [0.25, 0.1, 0.25, 1.0]
            }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4"
            style={{ 
              willChange: 'opacity, transform',
              transform: 'translateZ(0)'
            }}
          >
            <Button 
              variant="gradient" 
              size="xl" 
              className="group w-full sm:w-auto"
              onClick={() => {
                if (window.Calendly) {
                  window.Calendly.initPopupWidget({
                    url: 'https://calendly.com/hello-fleetcore/30min',
                    parentElement: document.body,
                    embedType: 'PopupWidget'
                  });
                }
              }}
            >
              <span className="truncate">Schedule a Product Demo</span>
              <ArrowRight className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="ghost" size="xl" className="group relative w-full sm:w-auto">
              <Play className="w-5 h-5 flex-shrink-0" />
              <span className="relative inline-block overflow-hidden">
                <span className="inline-block transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-full whitespace-nowrap">
                  Watch Platform Overview
                </span>
                <span className="inline-block transition-all duration-300 opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0 absolute inset-0 whitespace-nowrap">
                  Video Coming Soon
                </span>
              </span>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Maritime Challenges Section - Collapsible */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 mb-6">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">Maritime Industry Challenges</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-6 enterprise-heading">
              The Maritime Maintenance Crisis
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto enterprise-body">
              Traditional maintenance practices are costing the maritime industry billions in unplanned downtime, 
              regulatory violations, and operational inefficiencies.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Challenge Statistics - Left Side */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-6 flex flex-col justify-center mt-16"
            >
              {/* Challenge 1 - Unplanned Maintenance Financial Impact */}
              <Collapsible
                trigger={
                  <div className="flex items-center justify-start w-full px-6 py-4">
                    <div className="flex items-center">
                      <div className="p-2 rounded-2xl bg-red-100 dark:bg-red-900/30 mr-4">
                        <DollarSign className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-red-600 dark:text-red-400">$17B+ annually</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Global maintenance overrun costs</p>
                    </div>
                    </div>
                  </div>
                }
                className="rounded-3xl border bg-card text-card-foreground shadow-lg cursor-pointer hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 group overflow-hidden"
              >
                <div className="px-6 pb-6">
                  <p className="text-slate-700 dark:text-slate-300 enterprise-body">
                    The maritime industry faces over $17 billion in annual losses globally due to unplanned maintenance, 
                    equipment failures, and inefficient repair processes. Individual vessels experience $20,000-$40,000 
                    in unexpected costs per year from emergency repairs, delayed schedules, and lost operational time.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col space-y-1">
                      <div className="inline-flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>Source: Ship Universe 2025</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Collapsible>

              {/* Challenge 2 - Reactive vs. Predictive Maintenance Gap */}
              <Collapsible
                trigger={
                  <div className="flex items-center justify-start w-full px-6 py-4">
                    <div className="flex items-center">
                      <div className="p-2 rounded-2xl bg-orange-100 dark:bg-orange-900/30 mr-4">
                        <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-orange-600 dark:text-orange-400">40%</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Higher costs from reactive maintenance</p>
                    </div>
                    </div>
                  </div>
                }
                className="rounded-3xl border bg-card text-card-foreground shadow-lg cursor-pointer hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 group overflow-hidden"
              >
                <div className="px-6 pb-6">
                  <p className="text-slate-700 dark:text-slate-300 enterprise-body">
                    Reactive "break-fix" maintenance strategies cost 40% more than predictive approaches, creating 
                    a vicious cycle of unplanned downtime and emergency interventions. Aging global fleets compound this 
                    challenge, with overwhelming maintenance demands affecting crew morale, operational safety, and vessel availability.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="inline-flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>Source: Maritime Technology Review 2025</span>
                    </div>
                  </div>
                </div>
              </Collapsible>

              {/* Challenge 3 - Manual PMS & Regulatory Compliance Burden */}
              <Collapsible
                trigger={
                  <div className="flex items-center justify-start w-full px-6 py-4">
                    <div className="flex items-center">
                      <div className="p-2 rounded-2xl bg-yellow-100 dark:bg-yellow-900/30 mr-4">
                        <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-yellow-600 dark:text-yellow-400">3 Years</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Poor CII ratings trigger mandatory corrective action</p>
                    </div>
                    </div>
                  </div>
                }
                className="rounded-3xl border bg-card text-card-foreground shadow-lg cursor-pointer hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 group overflow-hidden"
              >
                <div className="px-6 pb-6">
                  <p className="text-slate-700 dark:text-slate-300 enterprise-body">
                    Paper checklists and spreadsheet PMS trap data in silos, delay work orders, and make audits painful. IMO's 2023 efficiency rules (EEXI & CII) require documented performance tracking, and three consecutive years of poor CII ratings trigger mandatory corrective action plans. When "paper trails" can't prove compliance, vessels face operational restrictions. fleetcore replaces manual effort with an agentic PMS that plans, executes, and proves compliance automatically.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button 
                      onClick={() => window.open('https://www.imo.org/en/OurWork/Environment/Pages/Air-Pollution.aspx', '_blank')}
                      className="inline-flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Source: International Maritime Organization</span>
                    </button>
                  </div>
                </div>
              </Collapsible>
            </motion.div>

            {/* Solution Preview - Right Side */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="p-8 pl-12">
                  <div className="text-left mb-8">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 enterprise-heading">
                      fleetcore's Solution
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-8 enterprise-body">
                      Our agentic maritime intelligence platform transforms these challenges into competitive advantages 
                      through AI-powered predictive maintenance and automated compliance management.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 enterprise-body">
                        <strong>Predictive Intelligence:</strong> Prevent failures before they occur
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 enterprise-body">
                        <strong>Automated Compliance:</strong> 100% SOLAS/MARPOL/ISM adherence
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 enterprise-body">
                        <strong>Cross-Manufacturer Optimization:</strong> Vendor-neutral intelligence
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 enterprise-body">
                        <strong>Real-Time Monitoring:</strong> 24/7 fleet intelligence
                      </span>
                    </div>
                  </div>

              </div>
            </motion.div>
          </div>

          {/* Proven Results Card - Below Two Columns */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="md:mt-16"
          >
            <div className="max-w-4xl mx-auto">
              <div className="rounded-3xl border bg-card text-card-foreground shadow-lg maritime-glass-card p-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4 enterprise-heading">
                    Proven Results
                  </div>
                  <p className="text-lg text-slate-600 dark:text-slate-400 enterprise-body max-w-2xl mx-auto">
                    Reduce maintenance costs by up to 40% through predictive analytics and automated compliance management
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How fleetcore Solves These Challenges - Solution Architecture */}
      <section className="relative overflow-hidden md:py-12">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(59 130 246) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 mb-6">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">The fleetcore Solution</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              <span className="maritime-gradient-text">Three-Layer Architecture</span>
              <br />
              <span className="text-slate-900 dark:text-slate-100">That Eliminates Maintenance Chaos</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              fleetcore transforms reactive maintenance into proactive intelligence through a systematic approach 
              that bridges OEM recommendations with real-world operations
            </p>
          </motion.div>

          {/* Three-Column Solution Architecture - Preview Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            
            {/* Layer 1: Data Foundation */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="rounded-3xl border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 dark:from-slate-800 dark:via-blue-950/30 dark:to-indigo-950/20 shadow-xl p-8 h-full hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 group">
                {/* Layer Badge */}
                <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-6">
                  Layer 1
                </div>

                {/* Icon */}
                <div className="mb-6">
                  <div 
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300"
                  >
                    <Database className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 text-center enterprise-heading">
                  Centralized Data Hub
                </h3>

                {/* Subtitle */}
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-4 text-center">
                  The Foundation
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center enterprise-body leading-relaxed">
                  Unified database normalizing OEM specs, manufacturer recommendations, and SOLAS requirements
                </p>

                {/* Key Features - Minimal Preview */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      OEM PMS import automation
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      SOLAS compliance tracking
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Real-time equipment monitoring
                    </span>
                  </div>
                </div>

                {/* Impact Metric */}
                <div className="mt-auto p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700 text-center">
                  <div className="text-3xl font-bold maritime-gradient-text mb-1">100%</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Data Centralization</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Single source of truth</div>
                </div>
              </div>
            </motion.div>

            {/* Layer 2: Automation Engine */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 dark:from-slate-800 dark:via-emerald-950/30 dark:to-teal-950/20 shadow-xl p-8 h-full hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 group">
                {/* Layer Badge */}
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-6">
                  Layer 2
                </div>

                {/* Icon */}
                <div className="mb-6">
                  <div 
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300"
                  >
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 text-center enterprise-heading">
                  Automated Scheduling Engine
                </h3>

                {/* Subtitle */}
                <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 text-center">
                  The Automation
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center enterprise-body leading-relaxed">
                  Intelligent algorithms auto-generate and optimize maintenance schedules based on running hours and calendar intervals
                </p>

                {/* Key Features - Minimal Preview */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Dual-interval task tracking
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Crew workload optimization
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Port stay coordination
                    </span>
                  </div>
                </div>

                {/* Impact Metric */}
                <div className="mt-auto p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-200 dark:border-emerald-700 text-center">
                  <div className="text-3xl font-bold maritime-gradient-text mb-1">90%+</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Automation Rate</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Tasks auto-generated</div>
                </div>
              </div>
            </motion.div>

            {/* Layer 3: Intelligence Layer */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="rounded-3xl border border-purple-200 dark:border-purple-800 bg-gradient-to-br from-white via-purple-50/30 to-violet-50/20 dark:from-slate-800 dark:via-purple-950/30 dark:to-violet-950/20 shadow-xl p-8 h-full hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 group">
                {/* Layer Badge */}
                <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-6">
                  Layer 3
                </div>

                {/* Icon */}
                <div className="mb-6">
                  <div 
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300"
                  >
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 text-center enterprise-heading">
                  Intelligence & Analytics
                </h3>

                {/* Subtitle */}
                <div className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-4 text-center">
                  The Innovation
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center enterprise-body leading-relaxed">
                  Advanced analytics identify patterns, predict risks, and optimize operations through continuous monitoring
                </p>

                {/* Key Features - Minimal Preview */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Fleet-wide pattern analysis
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Predictive maintenance alerts
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      Cost tracking & forecasting
                    </span>
                  </div>
                </div>

                {/* Impact Metric */}
                <div className="mt-auto p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/30 border border-purple-200 dark:border-purple-700 text-center">
                  <div className="text-3xl font-bold maritime-gradient-text mb-1">30-40%</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Efficiency Gain</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Through smart automation</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom: The Complete System Flow */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto"
          >
            <div className="rounded-3xl border bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/15 dark:to-purple-950/20 p-8 md:p-12 relative overflow-hidden">
              {/* Subtle Background Pattern */}
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                  backgroundSize: '32px 32px'
                }}></div>
              </div>

              <div className="relative z-10">
                <h3 className="text-2xl md:text-3xl font-bold text-center text-slate-900 dark:text-slate-100 mb-4 enterprise-heading">
                  How It All Works Together
                </h3>
                <p className="text-center text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto">
                  A seamless integration of data, automation, and intelligence that transforms your maritime operations from reactive to predictive
                </p>
                
                {/* Process Flow */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center mb-10">
                  {/* Step 1 */}
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <FileCheck className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Import OEM PMS Data</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Manufacturer recommendations and equipment specifications loaded into centralized database</p>
                  </div>

                  {/* Arrow */}
                  <div className="hidden md:flex justify-center">
                    <ArrowRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>

                  {/* Step 2 */}
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Settings className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Automated Task Creation</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Intelligent scheduling based on time intervals and running hours with crew optimization</p>
                  </div>

                  {/* Arrow */}
                  <div className="hidden md:flex justify-center">
                    <ArrowRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  {/* Step 3 */}
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Predictive Optimization</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Real-time monitoring and analytics for continuous performance improvement and cost reduction</p>
                  </div>
                </div>

                {/* Results Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-slate-300/50 dark:border-slate-600/50">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">$17B+</div>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Industry Problem Addressed</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Annual maintenance overrun costs eliminated through systematic prevention</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">40%</div>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Cost Reduction Achieved</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Reactive maintenance costs eliminated through predictive approach</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">100%</div>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Regulatory Compliance</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Automated SOLAS/MARPOL/ISM adherence with audit trails</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA to Solutions Page */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <Link to="/solutions">
              <Button variant="gradient" size="lg" className="group">
                Explore Full Technical Architecture
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Enterprise Maritime Core Capabilities */}
      <section className="pt-24 md:pb-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 mb-6">
              <Network className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Enterprise Maritime Core Capabilities</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              Eight Comprehensive Capabilities
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Complete maritime maintenance intelligence — from automated PMS scheduling to regulatory compliance, 
              designed for enterprise-grade reliability and operational excellence.
            </p>
          </motion.div>
        </div>

        {/* Carousel container with dark background and rounded corners */}
        <div className="w-full flex justify-center md:px-8 lg:px-12">
          <div className="w-full md:w-[85%] bg-slate-800 dark:bg-slate-900 md:rounded-3xl overflow-hidden pt-12 md:pt-20 pb-12 md:pb-20 px-0 md:px-8">
            <Carousel
              itemsPerView={3}
              mobileItemsPerView={1}
              gap={32}
              mobileGap={16}
              autoPlay={true}
              autoPlayInterval={6000}
              className="w-full"
              itemWidth={420}
              useMobilePercentage={true}
              itemClassName="mt-6"
            >
              {coreCapabilities.map((capability, index) => (
                <CapabilityCard
                  key={capability.title}
                  title={capability.title}
                  description={capability.description}
                  metric={capability.metric}
                  icon={capability.icon}
                  gradient={capability.gradient}
                  features={capability.features}
                  badge={capability.badge}
                  delay={index * 0.1}
                  comingSoon={capability.title === 'Advanced Analytics & Intelligence'}
                />
              ))}
            </Carousel>
          </div>
        </div>
      </section>

      {/* Enterprise Solutions by Executive Role */}
      <section className="relative py-8 md:py-19 overflow-hidden">
        {/* Fallback gradients (shown while video loads) - behind video */}
        <div className="absolute inset-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 z-0"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.05),transparent_50%)] z-0"></div>
        
        {/* Executive Role Video Background - above gradients */}
        <ExecutiveRoleVideoBackground isDarkMode={isDarkMode} />
        
        <div className="container mx-auto px-4 relative z-50">
            <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mb-6">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Enterprise Solutions by Executive Role</span>
                  </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              <span className="maritime-gradient-text">Strategic Solutions for </span>
              <span className="text-black dark:text-white">Leadership and Operations</span>
            </h2>
            <p className="text-xl text-black dark:text-white max-w-4xl mx-auto enterprise-body font-semibold">
              Designed for C-level executives and technical leadership in enterprise maritime operations
            </p>
            </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {executiveRoles.map((role, index) => (
              <RoleCard
                key={role.role}
                role={role.role}
                metric={role.metric}
                description={role.description}
                benefits={role.benefits}
                icon={role.icon}
                gradient={role.gradient}
                delay={index * 0.1}
              />
            ))}
          </div>

        </div>
      </section>

      {/* Enterprise Integration Process */}
      <section className="py-8 md:py-24 pb-14 md:pb-32">
        <div className="container mx-auto px-4">
            <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 mb-6">
              <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Enterprise Integration Process</span>
                    </div>
            
            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              Three-Step Enterprise Process
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              From system integration to automated workflow execution
            </p>
          </motion.div>

          {/* Modern Responsive Timeline Design */}
          <div className="w-full md:w-[85%] mx-auto px-4 md:px-0">
            {/* Timeline Container */}
            <div className="relative">
              {/* Desktop: Horizontal Timeline Line */}
              <div className="hidden md:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-emerald-200 dark:from-blue-800 dark:via-purple-800 dark:to-emerald-800"></div>
              
              {/* Mobile: Vertical Timeline Line */}
              <div className="md:hidden absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-emerald-200 dark:from-blue-800 dark:via-purple-800 dark:to-emerald-800"></div>
              
              {/* Steps Grid - Responsive */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8 mb-12">
                {integrationProcess.map((process, index) => (
                  <motion.div
                    key={process.step}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: index * 0.2 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    {/* Timeline Node - Desktop: Centered, Mobile: Left-aligned */}
                    <div className="flex md:justify-center justify-start mb-6 md:mb-8">
                      <div className="relative z-10">
                        <div className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg bg-gradient-to-br",
                          process.gradient
                        )}>
                          {process.step}
                        </div>
                        {/* Pulse Animation */}
                        <div className={cn(
                          "absolute inset-0 rounded-full bg-gradient-to-br opacity-20 animate-ping",
                          process.gradient
                        )}></div>
                      </div>
                    </div>
                    
                    {/* Step Card - Mobile: Left margin to offset from timeline */}
                    <div className="rounded-3xl border bg-white dark:bg-slate-800 shadow-xl p-6 hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 h-full ml-0 md:ml-0">
                      {/* Icon & Title */}
                      <div className="flex flex-col items-center text-center mb-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg mb-3", process.gradient)}>
                          <process.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Step {process.step}
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">
                          {process.title}
                        </h3>
                      </div>
                      
                      {/* Description */}
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed text-center">
                        {process.description}
                      </p>
                      
                      {/* Features List */}
                      <div className="space-y-3">
                        {process.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start space-x-3 md:ml-4">
                            <div className={cn(
                              "w-2 h-2 rounded-full flex-shrink-0 mt-1.5",
                              index === 0 ? "bg-blue-600 dark:bg-blue-400" : 
                              index === 1 ? "bg-purple-600 dark:bg-purple-400" : 
                              "bg-emerald-600 dark:bg-emerald-400"
                            )}></div>
                            <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Router */}
      <section className="py-8 md:py-20 relative overflow-hidden">
        {/* Parallax Background Image */}
        <IndustryParallaxBackground isDarkMode={isDarkMode} />
        
        <div className="container mx-auto px-4 relative z-50">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800 mb-6">
              <Globe className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Built for Your Industry</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              <span className="maritime-gradient-text">Maritime Solutions</span> Across All Sectors
            </h2>
            <p className="text-xl text-black dark:text-white max-w-3xl mx-auto enterprise-body font-semibold">
              Specialized solutions tailored to the unique challenges of maritime sectors
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {industries.map((industry, index) => (
              <motion.div
                key={industry.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link to={industry.href}>
                  <div
                    className="text-center p-6 group rounded-3xl border shadow-lg cursor-pointer hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 bg-white dark:bg-slate-800 overflow-visible"
                    style={{ minHeight: 170, minWidth: 170 }}
                  >
                    <div className={cn(
                      "w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 bg-gradient-to-br",
                      getIconGradient(industry.category)
                    )}>
                      <industry.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={cn(
                      "font-semibold text-slate-900 dark:text-slate-100 transition-colors text-sm overflow-visible px-1",
                      getIconColor(industry.category).replace('text-', 'group-hover:text-')
                    )}>
                      {industry.name}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="pt-14 pb-6 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-maritime-600/10 via-ocean-600/10 to-signal-600/10 dark:from-maritime-600/5 dark:via-ocean-600/5 dark:to-signal-600/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.05),transparent_50%)]"></div>
        
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center max-w-5xl mx-auto"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-maritime-100 to-ocean-100 dark:from-maritime-900/30 dark:to-ocean-900/30 mb-8">
              <Zap className="w-5 h-5 text-maritime-600 dark:text-maritime-400" />
              <span className="text-sm font-medium text-maritime-700 dark:text-maritime-300">
                Transform Your Maritime Operations Today
              </span>
            </div>

            <h2 className="text-4xl md:text-6xl font-bold enterprise-heading mb-8 leading-tight">
              Ready to Transform Your 
              <span className="maritime-gradient-text"> Maritime Operations</span>?
            </h2>
            
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-12 enterprise-body leading-relaxed">
              Join the maritime intelligence revolution. See how fleetcore can optimize your fleet operations 
              with enterprise-grade reliability and measurable ROI.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center px-4">
              <Button 
                variant="gradient" 
                size="xl" 
                className="group w-full sm:w-auto"
                onClick={() => {
                  if (window.Calendly) {
                    window.Calendly.initPopupWidget({
                      url: 'https://calendly.com/hello-fleetcore/30min'
                    });
                  }
                }}
              >
                <span className="truncate">Schedule Enterprise Demo</span>
                <ArrowUpRight className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Button>
              <Link to="/contact" className="w-full sm:w-auto">
                <Button variant="ghost" size="xl" className="group relative w-full sm:w-auto">
                  <User className="w-5 h-5 flex-shrink-0" />
                  <span className="relative inline-block">Go to Contact</span>
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
