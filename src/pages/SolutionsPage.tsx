import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  ArrowRight,
  Database,
  Calendar,
  Zap,
  Shield,
  TrendingUp,
  AlertTriangle,
  Clock,
  Settings,
  Network,
  Layers,
  Cpu,
  LineChart,
  Activity,
  GitBranch,
  Globe,
  Package,
  FileCheck,
  Brain,
  Bot,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { SolutionsHeroBackground } from '@/components/ui/SolutionsHeroBackground'
import { ArchitectureParallaxBackground } from '@/components/ui/ArchitectureParallaxBackground'
import { ScrollGradientBackground } from '@/components/ui/ScrollGradientBackground'

const SolutionsPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)

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

  // Traditional CMMS limitations - verified industry challenges
  const traditionalLimitations = [
    {
      title: 'Reactive Maintenance Model',
      description: 'Traditional systems only track work orders after breakdowns occur. No predictive capabilities to anticipate failures or optimize maintenance timing.',
      icon: AlertTriangle,
      color: 'from-red-500 to-orange-600',
      impact: '40% Higher Operating Costs'
    },
    {
      title: 'Data Silos & Manual Entry',
      description: 'Information scattered across paper logs, Excel spreadsheets, emails, and multiple disconnected databases. Manual data entry leads to errors and delays.',
      icon: Database,
      color: 'from-orange-500 to-amber-600',
      impact: '35-40% Time on Data Entry'
    },
    {
      title: 'Manual Scheduling Burden',
      description: 'Engineers manually create and schedule every maintenance task based on calendar intervals. No optimization for crew workload, parts availability, or operational constraints.',
      icon: Clock,
      color: 'from-yellow-500 to-orange-600',
      impact: 'Hours Daily Per Vessel'
    },
    {
      title: 'Isolated Fleet Operations',
      description: 'Each vessel operates independently with no knowledge sharing. Equipment failures and maintenance insights remain siloed within individual vessels.',
      icon: Network,
      color: 'from-blue-500 to-indigo-600',
      impact: 'Repeated Failures Across Fleet'
    }
  ]

  // Advanced Maintenance Capabilities - actual system features
  const maintenanceCapabilities = [
    {
      title: 'Dual-Interval Task Management',
      description: 'Automatically track and generate maintenance tasks based on both running hours AND calendar intervals. System monitors equipment hours and creates tasks when either threshold is reached.',
      icon: Clock,
      useCase: 'Engine oil change: every 250 running hours OR 3 months → whichever comes first',
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      title: 'Automated PMS Schedule Generation',
      description: 'Import manufacturer maintenance schedules and automatically generate recurring tasks for all equipment. System creates complete maintenance programs with zero manual task creation.',
      icon: FileCheck,
      useCase: 'Import Caterpillar engine schedule → 150 maintenance tasks auto-created with correct intervals',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      title: 'Cross-Fleet Equipment Registry',
      description: 'Centralized equipment definitions shared across all vessels. Track identical equipment across your fleet with unified maintenance procedures and performance data.',
      icon: Network,
      useCase: 'MAN B&W 6S50ME engine on 5 vessels → one definition, consistent maintenance across fleet',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      title: 'SOLAS/MARPOL Compliance Tracking',
      description: 'Built-in regulatory compliance monitoring for safety equipment, certificates, and inspections. Automatic alerts for upcoming surveys and certificate renewals.',
      icon: Shield,
      useCase: 'Safety equipment inspection due → 30-day alert → automatic task assignment → compliance verified',
      gradient: 'from-orange-500 to-red-600'
    },
    {
      title: 'AI Procurement Intelligence',
      description: 'Procurement Intelligence Agent ingests ML-predicted RUL signals to trigger reorder events ahead of need. Automatically drafts ranked supplier inquiries, analyzes offers, and surfaces the best-value recommendation for human approval.',
      icon: Package,
      useCase: 'RUL < 300h detected → agent drafts inquiry to 3 suppliers → ranked offer analysis → 1-click approval',
      gradient: 'from-amber-500 to-orange-600',
      aiTag: true
    },
    {
      title: 'ML Predictive Maintenance',
      description: 'Three-layer machine learning stack processes historical maintenance records, live equipment telemetry, and third-party sensor streams to compute a composite health index and P05/P50/P95 remaining-useful-life forecast per installation.',
      icon: Brain,
      useCase: 'Composite health drops below threshold → P50 RUL = 280h → agent schedules maintenance window proactively',
      gradient: 'from-violet-500 to-purple-600',
      aiTag: true
    },
  ]

  // Why Operating System analogy
  const operatingSystemFeatures = [
    {
      title: 'Abstraction Layer',
      description: 'Like how an OS abstracts hardware complexity, fleetcore abstracts maintenance complexity from end users.',
      icon: Layers,
      example: 'Engineers see "Change Oil" task, not complex interval calculations'
    },
    {
      title: 'Resource Management',
      description: 'OS manages CPU and memory; fleetcore manages crew time, parts inventory, and vessel schedules.',
      icon: Settings,
      example: 'Optimal allocation of 12 crew members across 50 maintenance tasks'
    },
    {
      title: 'Process Scheduling',
      description: 'OS schedules programs; fleetcore schedules maintenance with priority-based execution.',
      icon: Calendar,
      example: 'Critical safety tasks get priority over routine inspections'
    },
    {
      title: 'File System (Data Layer)',
      description: 'OS provides unified file access; fleetcore provides unified maintenance data across every vessel.',
      icon: Database,
      example: 'One query accesses data from 500 vessels, 5000 equipment items'
    },
    {
      title: 'Agent Processes (Always-On)',
      description: 'An OS runs background processes that manage the system. fleetcore runs five always-on AI agents — each owning a specific operational domain and acting autonomously within it.',
      icon: Bot,
      example: 'Predictive Maintenance Agent, Procurement Agent, Incident Intelligence, Compliance, Fleet Conversation — all running in parallel'
    },
    {
      title: 'Permission Kernel (HITL Governance)',
      description: 'An OS kernel gates privileged operations via permission checks. fleetcore\'s HITL governance gates every agent write action through a Confidence Score — no autonomous change bypasses human review.',
      icon: Lock,
      example: 'Confidence Score < 70% → auto-escalate to human · ≥ 95% → streamlined approval · 100% write ops gated'
    }
  ]

  // Scroll gradient sections configuration - smooth color transitions matching content themes
  const gradientSections = [
    { 
      id: 'hero', 
      colors: { 
        primary: 'rgba(16, 185, 129, 1)', // Emerald - modern solution
        secondary: 'rgba(20, 184, 166, 1)' // Teal - innovation
      },
      position: 'from-center'
    },
    { 
      id: 'traditional-problems', 
      colors: { 
        primary: 'rgba(244, 63, 94, 1)', // Rose - traditional problems
        secondary: 'rgba(251, 113, 133, 1)' // Pink - limitations
      },
      position: 'from-top-left'
    },
    { 
      id: 'three-layers', 
      colors: { 
        primary: 'rgba(99, 102, 241, 1)', // Indigo - architecture
        secondary: 'rgba(124, 58, 237, 1)' // Violet - system layers
      },
      position: 'from-right'
    },
    { 
      id: 'ai-capabilities', 
      colors: { 
        primary: 'rgba(168, 85, 247, 1)', // Purple - advanced capabilities
        secondary: 'rgba(217, 70, 239, 1)' // Fuchsia - automation
      },
      position: 'from-bottom'
    },
    { 
      id: 'operating-system', 
      colors: { 
        primary: 'rgba(59, 130, 246, 1)', // Blue - operating system
        secondary: 'rgba(14, 165, 233, 1)' // Sky - technical excellence
      },
      position: 'from-left'
    },
    { 
      id: 'impact-cta', 
      colors: { 
        primary: 'rgba(6, 182, 212, 1)', // Cyan - transformation
        secondary: 'rgba(34, 211, 238, 1)' // Cyan-light - action
      },
      position: 'from-center'
    }
  ]

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Maritime Maintenance Solutions · 5 AI Agents · Predictive ML Stack | fleetcore</title>
        <meta name="description" content="fleetcore replaces reactive CMMS with an AI-first maintenance OS: 5 autonomous agents across maintenance, procurement, incidents, compliance, and fleet conversation. Three-layer ML predictive stack, HITL governance, SOLAS/MARPOL compliance." />
        <link rel="canonical" href="https://fleetcore.ai/solutions" />
        <meta property="og:title" content="Maritime Maintenance Solutions · 5 AI Agents · Predictive ML Stack | fleetcore" />
        <meta property="og:description" content="Five autonomous agents replace reactive maintenance with predictive intelligence: ML RUL forecasts, closed-loop procurement, incident response, compliance automation, and conversational fleet intelligence." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fleetcore.ai/solutions" />
        <meta property="og:image" content="https://fleetcore.ai/og/solution.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["WebPage", "FAQPage"],
            "name": "Solutions",
            "url": "https://fleetcore.ai/solutions",
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://fleetcore.ai/" },
                { "@type": "ListItem", "position": 2, "name": "Solutions", "item": "https://fleetcore.ai/solutions" }
              ]
            },
            "mainEntity": [
              {
                "@type": "Question",
                "name": "How does fleetcore differ from traditional CMMS?",
                "acceptedAnswer": { "@type": "Answer", "text": "fleetcore is an AI-first maintenance operating system with five autonomous agents—not a CMMS. It predicts failures 200–800 hours ahead using a three-layer ML stack, automates procurement via a closed-loop agent, and gates every write action through a three-tier HITL governance model. Traditional CMMS only tracks completed work orders." }
              },
              {
                "@type": "Question",
                "name": "What are the five AI agents in fleetcore?",
                "acceptedAnswer": { "@type": "Answer", "text": "1) Predictive Maintenance Agent — ML RUL forecasts + proactive scheduling; 2) Procurement Intelligence Agent — automated inquiry drafts and ranked offer analysis; 3) Incident Intelligence Agent — anomaly detection and correlated alert triage; 4) Compliance Reporting Agent — SOLAS/MARPOL status and PSC readiness; 5) Conversational Fleet Intelligence Agent — natural language queries across your entire fleet." }
              },
              {
                "@type": "Question",
                "name": "What outcomes can maritime operators expect from fleetcore?",
                "acceptedAnswer": { "@type": "Answer", "text": "30–40% efficiency gains through autonomous agent workflows, 90%+ task auto-generation, 100% SOLAS/MARPOL compliance tracking, and predictive failure prevention 200–800 hours ahead of breakdown." }
              },
              {
                "@type": "Question",
                "name": "How does fleetcore's HITL governance model work?",
                "acceptedAnswer": { "@type": "Answer", "text": "Every AI-driven write action is gated by a Confidence Score (0–100%). Scores below 70% trigger automatic human escalation. Scores at or above 95% enable streamlined one-click approval. No agent action bypasses human review." }
              }
            ]
          })}
        </script>
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fleetcore_ai" />
        <meta name="twitter:title" content="Maritime Maintenance Solutions · 5 AI Agents · Predictive ML Stack | fleetcore" />
        <meta name="twitter:description" content="Five autonomous agents replace reactive maintenance with predictive intelligence: ML RUL forecasts, closed-loop procurement, incident response, compliance automation, and conversational fleet intelligence." />
        <meta name="twitter:image" content="https://fleetcore.ai/og/solution.png" />
      </Helmet>
      {/* Dynamic Scroll Gradient Background */}
      <ScrollGradientBackground sections={gradientSections} />
      
      {/* Hero Section - AI-Powered Maritime Technical Operating System */}
      <section className="relative pt-24 pb-20 overflow-hidden min-h-[85vh] flex items-center">
        {/* Static Image Background */}
        <SolutionsHeroBackground isDarkMode={isDarkMode} />

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
                Maritime Technical Operating System
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
                Not Just Software.
              </span>
              <br />
              <span 
                className="maritime-gradient-text" 
                style={{ 
                  textShadow: isDarkMode
                    ? '0 0 60px rgba(0,0,0,0.3), 0 0 120px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.25)'
                    : '0 0 60px rgba(255,255,255,0.4), 0 0 120px rgba(255,255,255,0.3), 0 4px 30px rgba(255,255,255,0.35)',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              >
                An Operating System
              </span>
              <br />
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
                For
              </span>{' '}
              <span 
                className="maritime-gradient-text" 
                style={{ 
                  textShadow: isDarkMode
                    ? '0 0 60px rgba(0,0,0,0.3), 0 0 120px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.25)'
                    : '0 0 60px rgba(255,255,255,0.4), 0 0 120px rgba(255,255,255,0.3), 0 4px 30px rgba(255,255,255,0.35)',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              >
                Maritime Intelligence
              </span>
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
                .
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
              Traditional CMMS systems only track maintenance. fleetcore embeds <strong>five autonomous agents across every operational workflow</strong> — from predictive maintenance to procurement — so your team focuses on decisions, not data entry.
            </p>

            {/* Key Features Tags */}
            <div 
              className="flex flex-wrap gap-3 justify-center mb-12"
              style={{
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
              }}
            >
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium">
                <Brain className="w-4 h-4" />
                <span>5 Autonomous AI Agents</span>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium">
                <Activity className="w-4 h-4" />
                <span>Predictive ML Stack</span>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                <Network className="w-4 h-4" />
                <span>Fleet-Wide Intelligence</span>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                <Shield className="w-4 h-4" />
                <span>SOLAS Compliance</span>
              </div>
            </div>

          </motion.div>
        </div>
      </section>

      {/* Section 1: The Problem with Traditional Systems */}
      <section className="py-10 md:py-24 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(239 68 68) 1px, transparent 0)`,
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
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 mb-6">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">Traditional CMMS Limitations</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              Why Traditional Systems Fail
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Legacy CMMS platforms were built in the 1990s for tracking — not for intelligence. 
              They record what happened but can't predict what will happen next.
            </p>
          </motion.div>

          {/* Limitation Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {traditionalLimitations.map((limitation, index) => (
              <motion.div
                key={limitation.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="rounded-3xl border bg-white dark:bg-slate-800 shadow-lg p-8 h-full hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 group">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className={cn("p-3 rounded-xl bg-gradient-to-br flex-shrink-0", limitation.color)}>
                      <limitation.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        {limitation.title}
                      </h3>
                      <div className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">
                        Impact: {limitation.impact}
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 enterprise-body">
                    {limitation.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* The Shift Statement */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-16 max-w-4xl mx-auto"
          >
            <div className="rounded-3xl border bg-gradient-to-br from-violet-50/50 via-purple-50/30 to-indigo-50/50 dark:from-violet-950/20 dark:via-purple-950/15 dark:to-indigo-950/20 p-12 text-center">
              <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4 enterprise-heading">
                Five Agents. Every Problem Solved.
              </h3>
              <p className="text-xl text-slate-600 dark:text-slate-300 enterprise-body mb-6">
                We're not improving traditional CMMS — we're replacing it with an 
                <strong className="maritime-gradient-text"> AI-first operating system</strong> where five autonomous agents run in parallel across maintenance, procurement, incidents, compliance, and fleet conversation.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {['Predictive Maintenance', 'Procurement Intelligence', 'Incident Response', 'Compliance Reporting', 'Fleet Conversation'].map((agent) => (
                  <div key={agent} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-800/50 text-xs font-medium text-violet-700 dark:text-violet-300">
                    <Bot className="w-3 h-3" />
                    {agent}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 2: AI Capabilities Deep Dive */}
      <section className="py-10 md:py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 mb-6">
              <Settings className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              <span className="text-sm font-medium text-pink-700 dark:text-pink-300">Advanced Maintenance Capabilities</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              Core System Capabilities
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Six integrated capabilities — including two AI agent-powered layers for predictive intelligence and
              autonomous procurement — that automate and optimize every aspect of maritime maintenance.
            </p>
          </motion.div>

          {/* Maintenance Capabilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {maintenanceCapabilities.map((capability, index) => (
              <motion.div
                key={capability.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div 
                  className="rounded-3xl border bg-white dark:bg-slate-800 shadow-lg p-6 h-full hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 flex flex-col"
                >
                  {/* Icon + AI badge row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn("w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center", capability.gradient)}>
                      <capability.icon className="w-7 h-7 text-white" />
                    </div>
                    {(capability as { aiTag?: boolean }).aiTag && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800/50 text-xs font-semibold text-violet-700 dark:text-violet-300">
                        <Brain className="w-3 h-3" />
                        AI Agent
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 enterprise-heading">
                    {capability.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 enterprise-body leading-relaxed flex-1">
                    {capability.description}
                  </p>

                  {/* Use Case */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                      Real-World Example:
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {capability.useCase}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Why "Operating System" Analogy */}
      <section className="py-10 md:py-24 relative overflow-hidden">
        {/* Parallax Background */}
        <ArchitectureParallaxBackground isDarkMode={isDarkMode} />
        
        <div className="container mx-auto px-4 relative z-50">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 mb-6">
              <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Operating System Architecture</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              Why We Call It an <span className="maritime-gradient-text">Operating System</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Like Windows, macOS, or Linux manage your computer's resources, fleetcore manages your maritime 
              operations — abstracting complexity, optimizing resources, and providing a unified interface.
            </p>
          </motion.div>

          {/* Operating System Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {operatingSystemFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="rounded-2xl border bg-white dark:bg-slate-800 shadow-lg p-6 h-full hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                        {feature.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 enterprise-body">
                    {feature.description}
                  </p>
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="text-xs font-mono text-blue-700 dark:text-blue-300">
                      {feature.example}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* Section 5: The Impact & CTA */}
      <section className="py-10 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 dark:from-blue-600/5 dark:via-purple-600/5 dark:to-pink-600/5"></div>

        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              <div className="text-center p-6 rounded-3xl border bg-white dark:bg-slate-800 shadow-lg">
                <div className="text-4xl font-bold maritime-gradient-text mb-2">30-40%</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Efficiency Gain</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Automated scheduling and optimization</div>
              </div>
              <div className="text-center p-6 rounded-3xl border bg-white dark:bg-slate-800 shadow-lg">
                <div className="text-4xl font-bold maritime-gradient-text mb-2">90%+</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Tasks Auto-Generated</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Minimal manual task creation</div>
              </div>
              <div className="text-center p-6 rounded-3xl border bg-white dark:bg-slate-800 shadow-lg">
                <div className="text-4xl font-bold maritime-gradient-text mb-2">100%</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Compliance Tracking</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">SOLAS/MARPOL built-in monitoring</div>
              </div>
              <div className="text-center p-6 rounded-3xl border bg-white dark:bg-slate-800 shadow-lg">
                <div className="text-4xl font-bold maritime-gradient-text mb-2">5</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">AI Agents</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Running autonomously across every workflow</div>
              </div>
            </div>

            {/* Main CTA */}
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-8">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Transform Your Fleet Operations
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6 leading-tight">
                Ready to Automate Your Fleet with
                <br />
                <span className="maritime-gradient-text">Intelligent Maintenance</span>?
              </h2>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 enterprise-body max-w-3xl mx-auto">
                See how fleetcore's maintenance operating system — backed by five autonomous AI agents and a three-layer ML predictive stack — automates 90%+ of your tasks, improves efficiency by 30–40%, and ensures full compliance.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="gradient" 
                  size="xl" 
                  className="group"
                  onClick={() => {
                    if (window.Calendly) {
                      window.Calendly.initPopupWidget({
                        url: 'https://calendly.com/hello-fleetcore/30min'
                      });
                    }
                  }}
                >
                  Schedule Demo
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Link to="/ai">
                  <Button variant="ghost" size="xl">
                    <Brain className="w-5 h-5" />
                    Explore AI Intelligence
                  </Button>
                </Link>
                <Link to="/platform">
                  <Button variant="ghost" size="xl">
                    <Globe className="w-5 h-5" />
                    Platform Features
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

export default SolutionsPage


