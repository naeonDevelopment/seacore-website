import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { 
  ArrowRight,
  Database,
  Calendar,
  Shield,
  TrendingUp,
  CheckCircle,
  Settings,
  Network,
  Layers,
  Cpu,
  LineChart,
  Lock,
  Users,
  Zap,
  Globe,
  Package,
  FileCheck,
  Activity,
  GitBranch,
  Clock,
  Target,
  BarChart3,
  Wrench,
  Ship,
  Award,
  Gauge
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { PlatformHeroBackground } from '@/components/ui/PlatformHeroBackground'
import { IntegrationsSectionBackground } from '@/components/ui/IntegrationsSectionBackground'
import { ScrollGradientBackground } from '@/components/ui/ScrollGradientBackground'

interface PlatformPageProps {}

export const PlatformPage: React.FC<PlatformPageProps> = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  const openCalendly = () => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({
        url: 'https://calendly.com/fleetcore-ai/30min'
      })
    }
  }

  // Detect dark mode from document class
  React.useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    // Initial check - CRITICAL: Run immediately on mount
    checkDarkMode()
    
    // Watch for changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    return () => observer.disconnect()
  }, [])

  // Core platform pillars
  const platformPillars = [
    {
      title: 'Enterprise-Grade Architecture',
      description: 'Built on modern PostgreSQL with Supabase, featuring multi-tenant isolation, real-time subscriptions, and 99.9% uptime SLA.',
      icon: Database,
      gradient: 'from-blue-500 to-indigo-600',
      keyFeatures: [
        'Multi-tenant with Row-Level Security (RLS)',
        'Real-time data synchronization',
        'Automated backup and disaster recovery',
        'Horizontal scaling capabilities'
      ]
    },
    {
      title: 'Intelligent Automation Engine',
      description: 'Advanced algorithms automatically generate, optimize, and manage maintenance schedules with minimal human intervention.',
      icon: Cpu,
      gradient: 'from-purple-500 to-violet-600',
      keyFeatures: [
        'Dual-interval tracking (hours + calendar)',
        '90%+ task auto-generation rate',
        'Crew workload optimization',
        'Port stay coordination'
      ]
    },
    {
      title: 'Maritime-Specific Design',
      description: 'Purpose-built for maritime operations with SOLAS/MARPOL compliance, STCW roles, and vessel hierarchy built into the core.',
      icon: Ship,
      gradient: 'from-emerald-500 to-teal-600',
      keyFeatures: [
        'SOLAS 2024 compliance tracking',
        'STCW-compliant role hierarchy',
        'ISM Code documentation support',
        'Class society requirements'
      ]
    }
  ]

  // Technical differentiators
  const technicalDifferentiators = [
    {
      category: 'Data Architecture',
      icon: Database,
      color: 'from-blue-500 to-indigo-600',
      features: [
        {
          name: 'Centralized Equipment Registry',
          description: 'Single source of truth for equipment definitions shared across entire fleet. One MAN B&W engine definition serves 50 vessels.',
          icon: Network,
          metric: '100% Data Consistency'
        },
        {
          name: 'Cross-Fleet Intelligence',
          description: 'Aggregated analytics across all vessels enable fleet-wide benchmarking, performance tracking, and optimization insights.',
          icon: BarChart3,
          metric: 'Fleet-Wide Analytics'
        },
        {
          name: 'Historical Data Preservation',
          description: 'Complete maintenance history retained indefinitely with full audit trails for compliance and trend analysis.',
          icon: Clock,
          metric: 'Unlimited History'
        }
      ]
    },
    {
      category: 'Automation & Intelligence',
      icon: Cpu,
      color: 'from-purple-500 to-pink-600',
      features: [
        {
          name: 'Dual-Interval Task Management',
          description: 'Unique capability to track both running hours AND calendar intervals. Tasks trigger on whichever threshold comes first.',
          icon: Calendar,
          metric: 'Industry-First Feature'
        },
        {
          name: 'Automated PMS Schedule Import',
          description: 'Import manufacturer PMS schedules and automatically generate all recurring tasks with correct intervals and procedures.',
          icon: FileCheck,
          metric: 'Zero Manual Setup'
        },
        {
          name: 'Smart Workload Distribution',
          description: 'Intelligent algorithms balance crew assignments considering skills, current workload, and operational constraints.',
          icon: Users,
          metric: '40% Time Savings'
        }
      ]
    },
    {
      category: 'Security & Compliance',
      icon: Shield,
      color: 'from-emerald-500 to-teal-600',
      features: [
        {
          name: 'Row-Level Security (RLS)',
          description: 'Database-enforced access control ensures users only see data for their organization and assigned vessels.',
          icon: Lock,
          metric: 'Military-Grade Security'
        },
        {
          name: 'Role-Based Permissions',
          description: 'Granular STCW-compliant maritime role hierarchy with custom permission templates per organization.',
          icon: Users,
          metric: '50+ Role Types'
        },
        {
          name: 'Built-in Regulatory Compliance',
          description: 'SOLAS/MARPOL requirements tracked automatically with alerts for upcoming surveys and certificate renewals.',
          icon: Award,
          metric: '100% Compliance Tracking'
        }
      ]
    }
  ]

  // Platform modules
  const platformModules = [
    {
      module: 'PMS Core',
      description: 'Complete planned maintenance system with automated scheduling',
      icon: Calendar,
      capabilities: [
        'Dual-interval task tracking',
        'Automated task generation',
        'Schedule optimization',
        'Completion tracking',
        'Overdue alerts'
      ],
      integration: 'Core module - foundation for all maintenance operations'
    },
    {
      module: 'Equipment Registry',
      description: 'Centralized equipment database with lifecycle management',
      icon: Package,
      capabilities: [
        'Equipment definitions',
        'Installation tracking',
        'Running hours monitoring',
        'Health scoring',
        'Manufacturer data'
      ],
      integration: 'Integrates with PMS, Parts, and Analytics modules'
    },
    {
      module: 'Parts & Procurement',
      description: 'Smart inventory management with procurement automation',
      icon: Wrench,
      capabilities: [
        'Parts inventory tracking',
        'Critical spares management',
        'Auto reorder points',
        'Procurement alerts',
        'Usage analytics'
      ],
      integration: 'Links to equipment and maintenance tasks'
    },
    {
      module: 'Compliance Manager',
      description: 'Regulatory tracking and certificate management',
      icon: Shield,
      capabilities: [
        'SOLAS/MARPOL tracking',
        'Certificate management',
        'Survey scheduling',
        'Audit trails',
        'Regulatory reporting'
      ],
      integration: 'Monitors all safety-critical equipment and tasks'
    },
    {
      module: 'Analytics & Reporting',
      description: 'Real-time KPIs and fleet-wide performance insights',
      icon: LineChart,
      capabilities: [
        'Maintenance KPIs',
        'Equipment health scores',
        'Cost tracking',
        'Fleet benchmarking',
        'Custom dashboards'
      ],
      integration: 'Aggregates data from all platform modules'
    },
    {
      module: 'User Management',
      description: 'STCW-compliant role hierarchy with granular permissions',
      icon: Users,
      capabilities: [
        'Maritime role templates',
        'Custom permissions',
        'Multi-vessel assignments',
        'Audit logging',
        'SSO integration'
      ],
      integration: 'Controls access across entire platform'
    }
  ]

  // Competitive advantages
  const competitiveAdvantages = [
    {
      advantage: 'Modern Technology Stack',
      traditional: 'Built on 1990s legacy systems with outdated databases',
      fleetcore: 'Modern PostgreSQL + Supabase with real-time capabilities and cloud-native architecture',
      impact: '10x faster performance, 99.9% uptime',
      icon: Zap
    },
    {
      advantage: 'Dual-Interval Tracking',
      traditional: 'Calendar-only maintenance intervals (every 3 months)',
      fleetcore: 'Both running hours AND calendar tracking with automatic task triggering',
      impact: 'Accurate maintenance timing, no over/under servicing',
      icon: Clock
    },
    {
      advantage: 'Automated Task Generation',
      traditional: 'Manual creation of every single maintenance task',
      fleetcore: 'Import PMS schedules, auto-generate all tasks with correct intervals',
      impact: '90%+ automation, hours saved daily',
      icon: FileCheck
    },
    {
      advantage: 'Cross-Fleet Intelligence',
      traditional: 'Each vessel operates in isolation with separate databases',
      fleetcore: 'Unified fleet-wide database with shared equipment definitions',
      impact: 'Fleet-wide analytics, consistent procedures',
      icon: Network
    },
    {
      advantage: 'Built-in Compliance',
      traditional: 'Regulatory tracking as add-on module or manual spreadsheets',
      fleetcore: 'SOLAS/MARPOL requirements integrated into core system',
      impact: '100% compliance visibility, automated alerts',
      icon: Shield
    },
    {
      advantage: 'Enterprise Security',
      traditional: 'Basic user authentication with shared database access',
      fleetcore: 'Row-level security with multi-tenant isolation and granular permissions',
      impact: 'Military-grade security, full data isolation',
      icon: Lock
    }
  ]

  // Integration capabilities - Platform Operations Focus
  const integrationCapabilities = [
    {
      category: 'Equipment Manufacturers',
      description: 'Direct integration with OEM maintenance schedules and technical documentation',
      partners: ['Caterpillar', 'MAN Energy Solutions', 'Wärtsilä', 'Rolls-Royce', 'ABB'],
      icon: Wrench
    },
    {
      category: 'ERP & Procurement Systems',
      description: 'Seamless financial integration, spare parts management, and purchase order workflows',
      partners: ['SAP', 'Oracle NetSuite', 'Microsoft Dynamics', 'Odoo'],
      icon: Database
    },
    {
      category: 'Document Management',
      description: 'Centralized technical library with automated document versioning and distribution',
      partners: ['SharePoint', 'Dropbox Business', 'Google Workspace', 'DocuWare'],
      icon: FileCheck
    },
    {
      category: 'Class Societies & Compliance',
      description: 'Digital certification, inspection scheduling, and automated compliance reporting',
      partners: ['DNV', 'Lloyd\'s Register', 'ABS', 'Bureau Veritas'],
      icon: Award
    }
  ]

  // Scroll gradient sections configuration - smooth color transitions
  const gradientSections = [
    { 
      id: 'hero', 
      colors: { 
        primary: 'rgba(99, 102, 241, 1)', // Indigo - platform overview
        secondary: 'rgba(139, 92, 246, 1)' // Violet - enterprise
      },
      position: 'from-center'
    },
    { 
      id: 'pillars', 
      colors: { 
        primary: 'rgba(34, 197, 94, 1)', // Green - growth/foundation
        secondary: 'rgba(16, 185, 129, 1)' // Emerald - stability
      },
      position: 'from-top-left'
    },
    { 
      id: 'differentiators', 
      colors: { 
        primary: 'rgba(168, 85, 247, 1)', // Purple - differentiation
        secondary: 'rgba(217, 70, 239, 1)' // Fuchsia - unique features
      },
      position: 'from-right'
    },
    { 
      id: 'modules', 
      colors: { 
        primary: 'rgba(59, 130, 246, 1)', // Blue - technical modules
        secondary: 'rgba(99, 102, 241, 1)' // Indigo - integration
      },
      position: 'from-bottom'
    },
    { 
      id: 'integrations', 
      colors: { 
        primary: 'rgba(6, 182, 212, 1)', // Cyan - connectivity
        secondary: 'rgba(20, 184, 166, 1)' // Teal - partnerships
      },
      position: 'from-left'
    },
    { 
      id: 'cta', 
      colors: { 
        primary: 'rgba(251, 146, 60, 1)', // Orange - action
        secondary: 'rgba(249, 115, 22, 1)' // Orange-red - urgency
      },
      position: 'from-center'
    }
  ]

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>fleetcore Platform: Agentic Maintenance OS Architecture | AI-Powered Automation System</title>
        <meta name="description" content="Agentic Maintenance Operating System architecture: autonomous AI agents, intelligent task automation, predictive maintenance engine, global learning graph. Self-evolving OS that powers automated fleet maintenance operations. Multi-OEM optimization, real-time intelligence." />
        <link rel="canonical" href="https://fleetcore.ai/platform" />
        <meta property="og:title" content="fleetcore Platform: AI Maritime Maintenance OS" />
        <meta property="og:description" content="Modern cloud architecture, dual-interval scheduling, SOLAS/MARPOL tracking, and fleet-wide analytics." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fleetcore.ai/platform" />
        <meta property="og:image" content="https://fleetcore.ai/og/platform.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "fleetcore Platform",
            "url": "https://fleetcore.ai/platform",
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://fleetcore.ai/" },
                { "@type": "ListItem", "position": 2, "name": "Platform", "item": "https://fleetcore.ai/platform" }
              ]
            },
            "mainEntity": {
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "What are fleetcore’s core pillars?",
                  "acceptedAnswer": { "@type": "Answer", "text": "Modern cloud architecture, intelligent automation, and maritime-specific design with built-in compliance." }
                },
                {
                  "@type": "Question",
                  "name": "Which modules are included?",
                  "acceptedAnswer": { "@type": "Answer", "text": "PMS Core, Equipment Registry, Parts & Procurement, Compliance Manager, Analytics & Reporting, and User Management." }
                }
              ]
            }
          })}
        </script>
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fleetcore_ai" />
        <meta name="twitter:title" content="fleetcore Platform: AI Maritime Maintenance OS" />
        <meta name="twitter:description" content="Modern cloud architecture, dual-interval scheduling, SOLAS/MARPOL tracking, and fleet-wide analytics." />
        <meta name="twitter:image" content="https://fleetcore.ai/og/platform.png" />
      </Helmet>
      {/* Dynamic Scroll Gradient Background */}
      <ScrollGradientBackground sections={gradientSections} />
      {/* Hero Section */}
      <section className="relative pt-16 lg:pt-24 pb-20 overflow-hidden min-h-[85vh] flex items-center">
        {/* Background */}
        <PlatformHeroBackground isDarkMode={isDarkMode} />
        
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
            {/* Badge */}
            <div 
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-8"
              style={{
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
              }}
            >
              <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Enterprise Platform Overview
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold enterprise-heading mb-8 leading-tight">
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
                Built for
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
                Maritime Excellence
              </span>
            </h1>

            {/* Subheadline */}
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
              Enterprise-grade platform combining <strong>modern cloud architecture, intelligent automation, 
              and maritime-specific workflows</strong> — purpose-built for the complexities of fleet maintenance management.
            </p>

            {/* Platform Features */}
            <div 
              className="flex flex-wrap gap-3 justify-center mb-12"
              style={{
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
              }}
            >
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                <Database className="w-4 h-4" />
                <span>Cloud-Native Architecture</span>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium">
                <Cpu className="w-4 h-4" />
                <span>Smart Automation</span>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                <Ship className="w-4 h-4" />
                <span>Maritime-First Design</span>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-sm font-medium">
                <Shield className="w-4 h-4" />
                <span>Enterprise Security</span>
              </div>
            </div>

            {/* CTAs removed per request */}
          </motion.div>
        </div>
      </section>

      {/* Platform Pillars */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 mb-6">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Platform Foundation</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              Three Pillars of Excellence
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Built on a foundation of modern technology, intelligent automation, and maritime domain expertise
            </p>
          </motion.div>

          {/* Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {platformPillars.map((pillar, index) => {
              const Icon = pillar.icon
              return (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="h-full p-8 rounded-3xl border bg-white dark:bg-slate-800 shadow-xl hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mx-auto mb-6 shadow-lg",
                      pillar.gradient
                    )}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100 enterprise-heading text-center">
                      {pillar.title}
                    </h3>

                    <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed text-center enterprise-body">
                      {pillar.description}
                    </p>

                    <div className="space-y-3">
                      {pillar.keyFeatures.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-700 dark:text-slate-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Technical Differentiators */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-6">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Technical Excellence</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              What Makes fleetcore Different
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Industry-leading capabilities that set a new standard for maritime maintenance platforms
            </p>
          </motion.div>

          {/* Differentiators by Category */}
          <div className="space-y-16 max-w-7xl mx-auto">
            {technicalDifferentiators.map((category, categoryIndex) => {
              const CategoryIcon = category.icon
              return (
                <motion.div
                  key={category.category}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: categoryIndex * 0.1 }}
                  viewport={{ once: true }}
                >
                  {/* Category Header - Centered */}
                  <div className="flex flex-col items-center gap-4 mb-8">
                    <div className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                      category.color
                    )}>
                      <CategoryIcon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 enterprise-heading text-center">
                      {category.category}
                    </h3>
                  </div>

                  {/* Features Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {category.features.map((feature, featureIndex) => {
                      const FeatureIcon = feature.icon
                      return (
                        <div
                          key={feature.name}
                          className="p-6 rounded-2xl border bg-card shadow-lg hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300"
                        >
                          <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                              <FeatureIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                                {feature.name}
                              </h4>
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                {feature.metric}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Platform Modules */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mb-6">
              <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Integrated Modules</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              Complete Platform Ecosystem
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Six integrated modules working together as a unified operating system for maritime maintenance
            </p>
          </motion.div>

          {/* Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {platformModules.map((module, index) => {
              const ModuleIcon = module.icon
              return (
                <motion.div
                  key={module.module}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className={cn(
                    "h-full p-6 rounded-3xl border shadow-xl overflow-hidden hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300",
                    index % 3 === 0 && "bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/20 dark:from-slate-800 dark:via-indigo-950/30 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800",
                    index % 3 === 1 && "bg-gradient-to-br from-white via-cyan-50/30 to-blue-50/20 dark:from-slate-800 dark:via-cyan-950/30 dark:to-blue-950/20 border-cyan-200 dark:border-cyan-800",
                    index % 3 === 2 && "bg-gradient-to-br from-white via-pink-50/30 to-rose-50/20 dark:from-slate-800 dark:via-pink-950/30 dark:to-rose-950/20 border-pink-200 dark:border-pink-800"
                  )}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg",
                        index % 3 === 0 && "from-indigo-500 to-purple-600",
                        index % 3 === 1 && "from-cyan-500 to-blue-600",
                        index % 3 === 2 && "from-pink-500 to-rose-600"
                      )}>
                        <ModuleIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1 enterprise-heading">
                          {module.module}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 enterprise-body">
                          {module.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {module.capabilities.map((capability, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className="text-xs text-slate-700 dark:text-slate-300">{capability}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        {module.integration}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Integration Capabilities */}
      <section className="py-24 relative overflow-hidden">
        {/* Background Image */}
        <IntegrationsSectionBackground isDarkMode={isDarkMode} />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 mb-6">
              <GitBranch className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Platform Integration</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              <span className="maritime-gradient-text">Seamless Enterprise Integration</span>
            </h2>
            <p className="text-xl text-black dark:text-white max-w-4xl mx-auto enterprise-body font-semibold">
              Connect with existing systems for maintenance intelligence and operational efficiency
            </p>
          </motion.div>

          {/* Integration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {integrationCapabilities.map((integration, index) => {
              const IntegrationIcon = integration.icon
              return (
                <motion.div
                  key={integration.category}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="p-6 rounded-2xl border bg-white dark:bg-slate-800 shadow-lg hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <IntegrationIcon className="w-7 h-7 text-white" />
                    </div>

                    <h3 className="text-lg font-bold text-center text-slate-900 dark:text-slate-100 mb-2 enterprise-heading">
                      {integration.category}
                    </h3>

                    <p className="text-sm text-center text-slate-600 dark:text-slate-400 mb-4 enterprise-body leading-relaxed">
                      {integration.description}
                    </p>

                    <div className="flex flex-wrap gap-2 justify-center">
                      {integration.partners.slice(0, 3).map((partner, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                        >
                          {partner}
                        </span>
                      ))}
                      {integration.partners.length > 3 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                          +{integration.partners.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Competitive Advantages */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 mb-6">
              <Award className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Competitive Edge</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              fleetcore vs Traditional CMMS
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Direct comparison showing how modern architecture delivers measurable advantages
            </p>
          </motion.div>

          {/* Comparison Table - Desktop Table, Mobile Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-7xl mx-auto"
          >
            {/* Desktop Table View (hidden on mobile) */}
            <div className="hidden md:block overflow-hidden rounded-3xl border shadow-2xl">
              {/* Table Header */}
              <div className="grid grid-cols-4 gap-4 p-6 bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 border-b-2 border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-slate-100 enterprise-heading">
                  Feature
                </div>
                <div className="font-bold text-red-600 dark:text-red-400 text-center">
                  Traditional CMMS
                </div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 text-center">
                  fleetcore Platform
                </div>
                <div className="font-bold text-blue-600 dark:text-blue-400 text-center">
                  Impact
                </div>
              </div>

              {/* Table Body */}
              <div className="bg-white dark:bg-slate-900">
                {competitiveAdvantages.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <motion.div
                      key={item.advantage}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      viewport={{ once: true }}
                      className={cn(
                        "grid grid-cols-4 gap-4 p-6 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200",
                        index % 2 === 0 && "bg-slate-50/50 dark:bg-slate-800/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-md",
                          index % 2 === 0 ? "from-blue-500 to-indigo-600" : "from-purple-500 to-violet-600"
                        )}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          {item.advantage}
                        </span>
                      </div>
                      <div className="flex items-center justify-center">
                        <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                          {item.traditional}
                        </p>
                      </div>
                      <div className="flex items-center justify-center">
                        <p className="text-xs text-slate-900 dark:text-slate-100 font-medium text-center">
                          {item.fleetcore}
                        </p>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 text-center flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {item.impact}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Mobile Card View (shown only on mobile) */}
            <div className="block md:hidden space-y-6">
              {competitiveAdvantages.map((item, index) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.advantage}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="rounded-2xl border shadow-lg overflow-hidden bg-white dark:bg-slate-900"
                  >
                    {/* Feature Header */}
                    <div className="p-4 bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 border-b-2 border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-md",
                          index % 2 === 0 ? "from-blue-500 to-indigo-600" : "from-purple-500 to-violet-600"
                        )}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 enterprise-heading text-lg">
                          {item.advantage}
                        </h3>
                      </div>
                    </div>

                    {/* Comparison Content */}
                    <div className="p-4 space-y-4">
                      {/* Traditional (Before) */}
                      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">
                            Traditional CMMS
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {item.traditional}
                        </p>
                      </div>

                      {/* fleetcore (After) */}
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                            fleetcore Platform
                          </span>
                        </div>
                        <p className="text-sm text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                          {item.fleetcore}
                        </p>
                      </div>

                      {/* Impact Banner */}
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
                        <div className="flex items-center justify-center gap-2">
                          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                            {item.impact}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
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
            className="max-w-5xl mx-auto"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
              <div className="text-center p-6 rounded-2xl border bg-white dark:bg-slate-800 shadow-lg">
                <div className="text-4xl font-bold maritime-gradient-text mb-2">99.9%</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Uptime SLA</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Enterprise reliability</div>
              </div>
              <div className="text-center p-6 rounded-2xl border bg-white dark:bg-slate-800 shadow-lg">
                <div className="text-4xl font-bold maritime-gradient-text mb-2">90%+</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Automation</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Tasks auto-generated</div>
              </div>
              <div className="text-center p-6 rounded-2xl border bg-white dark:bg-slate-800 shadow-lg">
                <div className="text-4xl font-bold maritime-gradient-text mb-2">100%</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Compliance</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">SOLAS/MARPOL tracking</div>
              </div>
              <div className="text-center p-6 rounded-2xl border bg-white dark:bg-slate-800 shadow-lg">
                <div className="text-4xl font-bold maritime-gradient-text mb-2">24/7</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Support</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Enterprise assistance</div>
              </div>
            </div>

            {/* Main CTA */}
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-8">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Ready to Transform Your Fleet
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6 leading-tight">
                Experience the Platform
                <br />
                <span className="maritime-gradient-text">Built for Maritime Excellence</span>
              </h2>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 enterprise-body max-w-3xl mx-auto">
                Join leading maritime operators who trust fleetcore's enterprise platform for critical
                maintenance operations across their entire fleet.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="gradient" size="xl" className="group" onClick={openCalendly}>
                  Schedule Platform Demo
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Link to="/about">
                  <Button variant="ghost" size="xl">
                    <Calendar className="w-5 h-5" />
                    Learn about fleetcore
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default PlatformPage
