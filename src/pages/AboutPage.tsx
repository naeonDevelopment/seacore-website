import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Ship, 
  Globe, 
  Users, 
  Target, 
  Lightbulb, 
  TrendingUp,
  MapPin,
  Network,
  Award,
  BookOpen,
  FileText,
  Download,
  ExternalLink,
  Anchor,
  Brain,
  Database,
  Wrench,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { ScrollGradientBackground } from '@/components/ui/ScrollGradientBackground'
import { AboutHeroBackground } from '@/components/ui/AboutHeroBackground'
import { VisionSectionBackground } from '@/components/ui/VisionSectionBackground'

interface AboutPageProps {}

export const AboutPage: React.FC<AboutPageProps> = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)

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

  // Story timeline milestones
  const storyMilestones = [
    {
      icon: Anchor,
      title: 'Deep Maritime Roots',
      description: 'Decades of hands-on experience in maritime operations, understanding the daily challenges fleet managers face with aging infrastructure and reactive maintenance approaches.',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      icon: Users,
      title: 'Extensive Industry Network',
      description: 'Built strong relationships across shipyards, classification societies, equipment manufacturers, and fleet operators worldwide, giving us unparalleled access to real-world operational data.',
      gradient: 'from-cyan-500 to-teal-600'
    },
    {
      icon: Brain,
      title: 'Software Engineering Excellence',
      description: 'Decades of experience in enterprise software development, combining maritime domain expertise with cutting-edge technology to solve complex operational challenges.',
      gradient: 'from-teal-500 to-emerald-600'
    },
    {
      icon: Wrench,
      title: 'Problem-First Approach',
      description: 'Rather than building technology looking for problems, we identified the critical gaps in maintenance intelligence and designed solutions based on real operational needs.',
      gradient: 'from-emerald-500 to-green-600'
    }
  ]

  // Global reach capabilities (startup-appropriate)
  const globalReach = [
    {
      icon: MapPin,
      title: 'Dubai Based',
      description: 'Strategically positioned at the crossroads of global maritime trade, with direct access to major shipping routes and maritime hubs.',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      icon: Globe,
      title: 'Global Vision',
      description: 'Building solutions for international maritime operations with multi-region support, compliance frameworks, and cloud infrastructure.',
      gradient: 'from-cyan-500 to-teal-600'
    },
    {
      icon: Network,
      title: 'Industry Connections',
      description: 'Leveraging extensive relationships with equipment manufacturers, classification societies, and maritime technology providers worldwide.',
      gradient: 'from-teal-500 to-emerald-600'
    },
    {
      icon: Brain,
      title: 'Technology First',
      description: 'Cloud-native platform designed for scale, supporting fleets of any size from day one with enterprise-grade infrastructure.',
      gradient: 'from-emerald-500 to-green-600'
    }
  ]

  // Strategy pillars
  const strategyPillars = [
    {
      icon: Database,
      title: 'Real-World Data Foundation',
      description: 'Collecting and analyzing actual maintenance events, failures, and conditions from operating vessels to build a global knowledge base of maritime equipment behavior.',
      benefits: [
        'Actual failure patterns, not theoretical models',
        'Condition-based insights from real operations',
        'Maintenance effectiveness tracking',
        'Equipment lifecycle data across fleets'
      ]
    },
    {
      icon: Brain,
      title: 'Intelligent Pattern Recognition',
      description: 'Using advanced analytics to correlate maintenance outcomes with operating conditions, maintenance practices, equipment age, and environmental factors.',
      benefits: [
        'Predictive failure analysis',
        'Optimal maintenance timing',
        'Cost-benefit optimization',
        'Risk-based prioritization'
      ]
    },
    {
      icon: Target,
      title: 'Continuous Learning System',
      description: 'Every maintenance event, inspection, and outcome feeds back into the system, making predictions more accurate and recommendations more effective over time.',
      benefits: [
        'Self-improving accuracy',
        'Fleet-wide knowledge sharing',
        'Adaptive to new equipment types',
        'Industry benchmark insights'
      ]
    }
  ]

  // Vision elements
  const visionElements = [
    {
      icon: TrendingUp,
      title: 'World\'s First Intelligent PMS',
      description: 'Building the first preventive maintenance system that learns from global fleet data to predict failures before they happen.',
      timeline: '2025-2027'
    },
    {
      icon: Network,
      title: 'Global Knowledge Network',
      description: 'Creating a comprehensive database of equipment behavior, maintenance outcomes, and operational conditions across the maritime industry.',
      timeline: '2026-2028'
    },
    {
      icon: Award,
      title: 'Industry Standard Platform',
      description: 'Establishing SeaCore as the reference platform for maritime maintenance intelligence, adopted by classification societies and industry bodies.',
      timeline: '2027-2030'
    }
  ]

  // Essential documentation (minimal)
  const essentialDocs = [
    {
      icon: FileText,
      title: 'Platform Overview',
      description: 'Comprehensive guide to SeaCore\'s maintenance intelligence platform and core features',
      size: '2.4 MB',
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      icon: BookOpen,
      title: 'Technical Documentation',
      description: 'API reference, integration guides, and implementation best practices',
      size: '5.1 MB',
      gradient: 'from-indigo-500 to-purple-600'
    },
    {
      icon: Award,
      title: 'Product Roadmap',
      description: 'Vision, upcoming features, and development timeline for 2025-2027',
      size: '1.8 MB',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      icon: Database,
      title: 'Data Architecture',
      description: 'Database schemas, security framework, and compliance documentation',
      size: '3.2 MB',
      gradient: 'from-pink-500 to-rose-600'
    }
  ]

  // Gradient sections for scroll background
  const gradientSections = [
    { 
      id: 'hero', 
      colors: { 
        primary: 'rgba(59, 130, 246, 1)', // Blue
        secondary: 'rgba(16, 185, 129, 1)' // Emerald
      },
      position: 'from-top-left'
    },
    { 
      id: 'story', 
      colors: { 
        primary: 'rgba(16, 185, 129, 1)', // Emerald
        secondary: 'rgba(14, 165, 233, 1)' // Sky
      },
      position: 'from-center'
    },
    { 
      id: 'presence', 
      colors: { 
        primary: 'rgba(14, 165, 233, 1)', // Sky
        secondary: 'rgba(99, 102, 241, 1)' // Indigo
      },
      position: 'from-top-right'
    },
    { 
      id: 'strategy', 
      colors: { 
        primary: 'rgba(99, 102, 241, 1)', // Indigo
        secondary: 'rgba(168, 85, 247, 1)' // Purple
      },
      position: 'from-bottom-left'
    },
    { 
      id: 'vision', 
      colors: { 
        primary: 'rgba(168, 85, 247, 1)', // Purple
        secondary: 'rgba(236, 72, 153, 1)' // Pink
      },
      position: 'from-center'
    },
    { 
      id: 'resources', 
      colors: { 
        primary: 'rgba(236, 72, 153, 1)', // Pink
        secondary: 'rgba(249, 115, 22, 1)' // Orange
      },
      position: 'from-bottom-right'
    }
  ]

  return (
    <div className="relative min-h-screen">
      {/* Dynamic Scroll Gradient Background */}
      <ScrollGradientBackground sections={gradientSections} />

      {/* Hero Section */}
      <section id="hero" className="relative pt-32 pb-20 overflow-hidden min-h-[85vh] flex items-center">
        {/* Background */}
        <AboutHeroBackground isDarkMode={isDarkMode} />
        
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
              <Ship className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">About SeaCore</span>
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
                Building the Future of
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
                Maritime Intelligence
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
              Decades of maritime expertise combined with advanced software engineering, 
              creating the world's first truly intelligent preventive maintenance platform.
            </p>

            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              style={{
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
              }}
            >
              <Button variant="gradient" size="xl" className="group">
                Learn Our Story
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="xl">
                <Download className="w-5 h-5" />
                Download Resources
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Story Section - Vertical Timeline */}
      <section id="story" className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mb-6">
              <Anchor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Our Story</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              <span className="maritime-gradient-text">From Maritime Operations</span>
              <br />
              to Intelligent Solutions
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Our journey began on the decks and in the engine rooms of operating vessels, 
              where we witnessed firsthand the challenges of reactive maintenance and aging fleet management.
            </p>
          </motion.div>

          {/* Vertical Timeline */}
          <div className="max-w-6xl mx-auto relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gradient-to-b from-blue-500 via-emerald-500 to-purple-500" />

            {/* Timeline Items */}
            <div className="space-y-16">
              {storyMilestones.map((milestone, index) => {
                const Icon = milestone.icon
                const isLeft = index % 2 === 0

                return (
                  <motion.div
                    key={milestone.title}
                    initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <div className={cn(
                      "flex items-center gap-8",
                      isLeft ? "flex-row" : "flex-row-reverse"
                    )}>
                      {/* Card - Takes up half width */}
                      <div className="flex-1">
                        <div className={cn(
                          "p-6 rounded-3xl border shadow-xl hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300",
                          index % 4 === 0 && "bg-gradient-to-br from-white via-blue-50/30 to-cyan-50/20 dark:from-slate-800 dark:via-blue-950/30 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800",
                          index % 4 === 1 && "bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 dark:from-slate-800 dark:via-emerald-950/30 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800",
                          index % 4 === 2 && "bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/20 dark:from-slate-800 dark:via-purple-950/30 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800",
                          index % 4 === 3 && "bg-gradient-to-br from-white via-pink-50/30 to-rose-50/20 dark:from-slate-800 dark:via-pink-950/30 dark:to-rose-950/20 border-pink-200 dark:border-pink-800"
                        )}>
                          <div className={cn(
                            "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg",
                            milestone.gradient
                          )}>
                            <Icon className="w-7 h-7 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 enterprise-heading">
                            {milestone.title}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 enterprise-body leading-relaxed">
                            {milestone.description}
                          </p>
                        </div>
                      </div>

                      {/* Timeline Node - Center */}
                      <div className="relative z-10">
                        <div className={cn(
                          "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-900",
                          milestone.gradient
                        )}>
                          <div className="w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>

                      {/* Spacer for other side */}
                      <div className="flex-1" />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Global Reach Section */}
      <section id="presence" className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-sky-100 to-indigo-100 dark:from-sky-900/30 dark:to-indigo-900/30 mb-6">
              <Globe className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <span className="text-sm font-medium text-sky-700 dark:text-sky-300">Global Reach</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              <span className="maritime-gradient-text">Built for Global</span> Maritime Operations
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Combining strategic location, industry expertise, and modern technology 
              to deliver maintenance intelligence solutions at scale.
            </p>
          </motion.div>

          {/* Capabilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {globalReach.map((capability, index) => {
              const Icon = capability.icon
              return (
                <motion.div
                  key={capability.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="h-full p-8 rounded-3xl border bg-white dark:bg-slate-800 shadow-xl hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 shadow-lg",
                      capability.gradient
                    )}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 enterprise-heading">
                      {capability.title}
                    </h3>
                    <p className="text-base text-slate-600 dark:text-slate-400 enterprise-body leading-relaxed">
                      {capability.description}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Strategy Section */}
      <section id="strategy" className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 mb-6">
              <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Our Strategy</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              <span className="maritime-gradient-text">Real-World Data,</span>
              <br />
              Real Solutions
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Building the world's most intelligent preventive maintenance system by learning from 
              actual equipment behavior, maintenance outcomes, and operating conditions.
            </p>
          </motion.div>

          {/* Strategy Pillars */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {strategyPillars.map((pillar, index) => {
              const Icon = pillar.icon
              return (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className={cn(
                    "h-full p-8 rounded-3xl border shadow-xl hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300",
                    index === 0 && "bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/20 dark:from-slate-800 dark:via-indigo-950/30 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800",
                    index === 1 && "bg-gradient-to-br from-white via-purple-50/30 to-pink-50/20 dark:from-slate-800 dark:via-purple-950/30 dark:to-pink-950/20 border-purple-200 dark:border-purple-800",
                    index === 2 && "bg-gradient-to-br from-white via-pink-50/30 to-rose-50/20 dark:from-slate-800 dark:via-pink-950/30 dark:to-rose-950/20 border-pink-200 dark:border-pink-800"
                  )}>
                    <div className={cn(
                      "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 shadow-lg",
                      index === 0 && "from-indigo-500 to-purple-600",
                      index === 1 && "from-purple-500 to-pink-600",
                      index === 2 && "from-pink-500 to-rose-600"
                    )}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 enterprise-heading">
                      {pillar.title}
                    </h3>
                    
                    <p className="text-base text-slate-600 dark:text-slate-400 mb-6 enterprise-body leading-relaxed">
                      {pillar.description}
                    </p>

                    <div className="space-y-3">
                      {pillar.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-700 dark:text-slate-300 enterprise-body">
                            {benefit}
                          </span>
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

      {/* Vision Section - Horizontal Timeline */}
      <section id="vision" className="py-24 relative overflow-hidden">
        {/* Parallax Background */}
        <VisionSectionBackground isDarkMode={isDarkMode} />
        
        <div className="container mx-auto px-4 relative z-50">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-6">
              <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Our Vision</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              The Future We're Building
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Creating an intelligent ecosystem where every vessel benefits from the collective knowledge 
              of the entire maritime industry.
            </p>
          </motion.div>

          {/* Horizontal Timeline */}
          <div className="max-w-7xl mx-auto">
            {/* Timeline Line */}
            <div className="relative">
              <div className="absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />
              
              {/* Timeline Items */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {visionElements.map((element, index) => {
                  const Icon = element.icon
                  return (
                    <motion.div
                      key={element.title}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.2 }}
                      viewport={{ once: true }}
                      className="relative"
                    >
                      {/* Timeline Node */}
                      <div className="flex justify-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg relative z-10">
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                      </div>

                      {/* Timeline Badge */}
                      <div className="flex justify-center mb-4">
                        <span className="text-sm font-bold px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg">
                          {element.timeline}
                        </span>
                      </div>

                      {/* Card Content */}
                      <div className="p-6 rounded-3xl border bg-white dark:bg-slate-800 shadow-xl hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 h-full">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 enterprise-heading text-center">
                          {element.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 enterprise-body leading-relaxed text-center">
                          {element.description}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Section - Minimal */}
      <section id="resources" className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-100 to-orange-100 dark:from-pink-900/30 dark:to-orange-900/30 mb-6">
              <BookOpen className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              <span className="text-sm font-medium text-pink-700 dark:text-pink-300">Resources</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              <span className="maritime-gradient-text">Essential</span> Documentation
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto enterprise-body">
              Download key resources to learn more about our platform and capabilities.
            </p>
          </motion.div>

          {/* Minimal Documentation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {essentialDocs.map((doc, index) => {
              const Icon = doc.icon
              return (
                <motion.div
                  key={doc.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="h-full p-6 rounded-2xl border bg-white dark:bg-slate-800 shadow-lg opacity-50 cursor-not-allowed flex flex-col relative">
                    {/* Coming Soon Badge */}
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs font-bold shadow-lg">
                      Coming Soon
                    </div>
                    
                    <div className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg opacity-60",
                      doc.gradient
                    )}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 enterprise-heading">
                      {doc.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 enterprise-body flex-1">
                      {doc.description}
                    </p>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        PDF · {doc.size}
                      </span>
                    </div>
                  </div>
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
            className="max-w-5xl mx-auto text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6 leading-tight">
              Ready to Transform Your
              <br />
              <span className="maritime-gradient-text">Fleet Operations</span>?
            </h2>

            <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 enterprise-body max-w-3xl mx-auto">
              Join the maritime operators who are already benefiting from intelligent maintenance 
              and real-world data-driven insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="gradient" size="xl" className="group">
                Schedule a Demo
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="xl">
                <FileText className="w-5 h-5" />
                Download Platform Overview
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
