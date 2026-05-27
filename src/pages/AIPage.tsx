import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  ArrowRight,
  Brain,
  Database,
  Shield,
  Clock,
  Layers,
  Package,
  FileCheck,
  Activity,
  Zap,
  Globe,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { AIHeroBackground } from '@/components/ui/AIHeroBackground'
import { AIProcurementSectionBackground } from '@/components/ui/AIProcurementSectionBackground'
import { ScrollGradientBackground } from '@/components/ui/ScrollGradientBackground'

const AIPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)

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

  // Research-backed maritime AI gaps (2026 landscape analysis)
  const maritimeAIGaps = [
    {
      title: 'The Right-Censoring Blind Spot',
      description: 'Maritime maintenance data is overwhelmingly right-censored — equipment is serviced before failure is ever observed. Standard regression and generic AI tools discard these observations entirely, producing biased RUL estimates that can be off by 30–50%. Academic research confirms this is the critical unsolved problem in every commercial maritime PMS platform today.',
      icon: BarChart3,
      color: 'from-red-500 to-rose-600',
      gap: 'AMOS, ABS NS, Kongsberg — none correct for censoring'
    },
    {
      title: 'Sensor Readings Without Operational DNA',
      description: 'Competitor condition monitoring captures RPM, temperature, and pressure readings. None embed the operational context that determines degradation rate: trade route, climate zone, load factor, fuel type, operator compliance behavior. A Caterpillar C32 on a Red Sea tanker and one on a North Atlantic bulk carrier degrade on entirely different curves — with identical OEM specifications.',
      icon: Activity,
      color: 'from-orange-500 to-amber-600',
      gap: 'Kongsberg Vessel Insight provides data, not context'
    },
    {
      title: 'Fleet Silos, No Cross-Fleet Learning',
      description: 'Every operator learns in complete isolation. An organization with 5 vessels trains on 5 vessels of survival data. Cross-fleet failure patterns, real-world interval corrections, and Weibull distribution priors never leave the organization. The failure that Fleet A observed 18 months ago has not informed Fleet B\'s maintenance intervals — even if they run identical equipment on identical routes.',
      icon: Database,
      color: 'from-blue-500 to-indigo-600',
      gap: 'No commercial platform aggregates anonymized cross-fleet patterns'
    },
    {
      title: 'The Governance Vacuum',
      description: 'Maritime AI in 2026 exists in one of two failure modes: AI that answers questions with no operational impact, or AI that acts autonomously and violates ISM Code §10 accountability requirements. The governed middle ground — autonomous preparation with mandatory human sign-off — does not exist in any competing platform. The industry is still choosing between "ChatGPT on top of AMOS" and "do it manually."',
      icon: Lock,
      color: 'from-yellow-500 to-orange-600',
      gap: 'ISM §10 accountability requires a human in the loop — always'
    },
    {
      title: 'The Procurement Dead End',
      description: 'Predictive maintenance tools tell you equipment will fail in 400 hours. None know that the critical part takes 600 hours from your usual supplier but 200 hours from an alternative. And none automatically draft the inquiry, route it to suppliers, parse inbound offers via LLM, and surface a ranked recommendation before you open your inbox. The RUL forecast and the procurement cycle are fully disconnected in every competing platform.',
      icon: Package,
      color: 'from-purple-500 to-fuchsia-600',
      gap: 'Prediction without procurement action is incomplete intelligence'
    },
    {
      title: 'Incidents Are Recorded, Never Predicted',
      description: 'Every maritime incident management system records events after failure. Risk registers are static spreadsheets — often unchanged since the last audit. Root cause analysis produces a filed document, not a prevention signal. No commercial platform correlates degradation intelligence and historical failure patterns to propose predictive incidents 200–800 hours before a failure window, bundled with corrective task templates, a procurement pre-check for required parts, and a compliance escalation path.',
      icon: Clock,
      color: 'from-teal-500 to-cyan-600',
      gap: 'All competitors: reactive recording. fleetcore: predictive proposal.'
    }
  ]

  // fleetcore AI capabilities
  const aiCapabilities = [
    {
      title: 'PMS & Task Intelligence',
      description: 'Ask about overdue tasks, this-week priorities, upcoming maintenance windows, and work order status across any vessel or the entire fleet.',
      icon: Activity,
      gradient: 'from-violet-500 to-indigo-600',
      query: '"What are the critical overdue tasks on Vessel Atlas this week?"',
      response: '3 critical tasks overdue — Main engine oil change (48h past due), Emergency generator test (12h past due), Fire pump inspection (7 days past due). Recommend immediate assignment.'
    },
    {
      title: 'Procurement Intelligence',
      description: 'Compare supplier offers, benchmark parts pricing across your supplier network, and surface the best historical prices for any part number.',
      icon: Package,
      gradient: 'from-fuchsia-500 to-purple-600',
      query: '"Best price we\'ve paid for Caterpillar oil filter OFP-3304?"',
      response: 'Lowest recorded: €8.40/unit from Marine Parts GmbH (Feb 2026, qty 50). Current open offer from Nordic Supply: €9.80. Recommend negotiating to Feb price.'
    },
    {
      title: 'Fleet-Wide Analytics',
      description: 'Natural language queries against your entire fleet database — aggregations, comparisons, trend analysis — powered by the Analyst DSL and structured read engine.',
      icon: BarChart3,
      gradient: 'from-blue-500 to-cyan-600',
      query: '"Which vessel has the most overdue tasks right now?"',
      response: 'Vessel Meridian leads with 7 overdue tasks (3 critical, 4 standard). Fleet average is 1.8 overdue/vessel. Meridian is 3.9× the fleet mean.'
    },
    {
      title: 'Event & Incident Query',
      description: 'Surface active incidents, in-progress events, and their linked corrective maintenance tasks across any vessel or the whole fleet.',
      icon: AlertTriangle,
      gradient: 'from-amber-500 to-orange-600',
      query: '"Show me all high-severity events from the last 30 days."',
      response: '4 high-severity events found: Starboard engine vibration anomaly (Vessel Atlas, open), Hydraulic pressure drop (Vessel Crest, resolved), ...'
    },
    {
      title: 'Compliance & Documentation',
      description: 'Instant answers to platform usage questions, regulatory procedure lookups, and certificate expiry checks — without leaving the chat.',
      icon: FileCheck,
      gradient: 'from-emerald-500 to-teal-600',
      query: '"When does the Class Survey expire for Vessel Atlas?"',
      response: 'Annual Class Survey expires in 47 days (15 Jul 2026). Intermediate Survey due in 14 months. Recommend scheduling 30-day prep inspection.'
    },
    {
      title: 'Financial & Operational Reports',
      description: 'Ask for maintenance cost breakdowns, procurement spend analysis, fleet-wide KPIs, and operational performance summaries. The AI reads across task history, procurement records, and event data to surface context-complete reports without exporting to a spreadsheet.',
      icon: Layers,
      gradient: 'from-teal-500 to-emerald-600',
      query: '"Total maintenance cost for Vessel Atlas in Q1 2026, broken down by category?"',
      response: 'Q1 2026 total: €47,820. Engine maintenance: 41% (€19,606) — up 12% vs Q4 driven by unplanned bearing replacement (€7,200). Deck equipment: 24%. HVAC: 18%. 4 cost-reduction opportunities identified.'
    }
  ]
  const FeaturedCapabilityIcon = aiCapabilities[0].icon

  // Autonomous agent workflows embedded across every operational domain
  const agenticWorkflows = [
    {
      agent: 'Predictive Maintenance',
      badge: 'Runs every 15 min',
      description: 'The ML orchestrator monitors every equipment installation. It runs GBSA survival analysis, computes Remaining Useful Life, detects divergence from OEM intervals, and proposes schedule adjustments — all bounded by ISM and SOLAS criticality limits.',
      icon: Activity,
      accentColor: 'border-l-violet-500',
      iconGradient: 'from-violet-500 to-indigo-600',
      badgeColor: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300',
      automated: [
        'GBSA survival analysis on every installation (23-feature model)',
        'Remaining Useful Life + divergence from OEM baseline detection',
        'Schedule interval adjustment proposals, criticality-bounded'
      ],
      gate: 'All PMS mutations require pms_management role approval'
    },
    {
      agent: 'Procurement Intelligence',
      badge: 'Auto-triggers on reorder',
      description: 'When parts inventory drops below the reorder threshold, an agent automatically drafts a procurement inquiry. Inbound supplier replies are parsed by LLM, benchmarked against historical prices, and ranked — before a human ever opens the inbox.',
      icon: Package,
      accentColor: 'border-l-fuchsia-500',
      iconGradient: 'from-fuchsia-500 to-purple-600',
      badgeColor: 'bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-700 dark:text-fuchsia-300',
      automated: [
        'Draft inquiry auto-created when quantity < reorder threshold',
        'Inbound email parsing → structured offer records via LLM',
        'Price benchmarking + supplier lead time ranking'
      ],
      gate: 'Procurement officer approves before sending or awarding'
    },
    {
      agent: 'Incident Intelligence',
      badge: 'Confidence Score ≥ 80%',
      description: 'At Tier 2 confidence, the agent proposes a predictive event before failure occurs — bundled with a corrective maintenance task. On root cause completion, it cascades into a new preventive schedule automatically.',
      icon: AlertTriangle,
      accentColor: 'border-l-amber-500',
      iconGradient: 'from-amber-500 to-orange-600',
      badgeColor: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
      automated: [
        'Severity mapped from RUL % (critical / high / medium / low)',
        'Bundled event + corrective task proposal, atomic on approval',
        'Root cause analysis → new preventive schedule cascade'
      ],
      gate: 'Event creation requires vessel_operations role approval'
    },
    {
      agent: 'Compliance Reporting',
      badge: 'Three ML report templates',
      description: 'Three system-level report templates are pre-populated automatically — weekly RUL summaries, anomaly alert reports, and interval adjustment recommendations. All are ai-draft artifacts. The machine prepares; the human decides.',
      icon: FileCheck,
      accentColor: 'border-l-emerald-500',
      iconGradient: 'from-emerald-500 to-teal-600',
      badgeColor: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
      automated: [
        'Weekly RUL summary report — pg_cron, Monday 08:00 UTC',
        'Anomaly alert report when Confidence Score ≥ 50%',
        'Interval adjustment recommendation with full audit chain'
      ],
      gate: 'Human must promote from ai-draft to submitted — never automated'
    }
  ]

  // ML intelligence layers (3-layer predictive stack)
  const mlLayers = [
    {
      layer: '01',
      name: 'Historical Prediction Engine',
      source: 'Maintenance history · Equipment DNA · Cross-fleet learning',
      description: 'Survival-curve ML models trained on censored maintenance records — where equipment is serviced before failure, those observations are preserved as partial information rather than discarded. Each equipment installation is fingerprinted with an operational context embedding that captures trade route, load profile, climate zone, and operator behavior. Cross-fleet federated learning aggregates anonymized survival patterns across organizations without sharing raw records.',
      keyTech: ['Censoring-aware: partial observations preserved, not discarded', 'Equipment DNA: operational context embedding per installation', 'Confidence-gated model progression: lightweight → full-accuracy', 'Federated cross-fleet learning — privacy-preserving survival priors'],
      output: 'P05 / P50 / P95 calibrated RUL bands',
      gradient: 'from-violet-500 to-indigo-600',
      icon: BarChart3
    },
    {
      layer: '02',
      name: 'Live Equipment Data Stream',
      source: 'Real-time sensors: RPM, temp, pressure, vibration, fuel',
      description: 'A multi-model streaming anomaly detection stack runs against live sensor data, combining complementary detectors that catch point anomalies, sustained mean shifts, and gradual drift independently. All sensor channels are fused into a composite 0–1 health degradation score. When the live signal accumulates sufficient confidence, it progressively overrides the historical estimate — with LLM classification identifying the dominant failure mode from the sensor pattern.',
      keyTech: ['Complementary anomaly detectors: point · shift · drift', 'Composite health index fusing all sensor channels (0–1)', 'AI-classified dominant failure mode from sensor pattern', 'Confidence-weighted fusion with historical predictions'],
      output: 'Health Index (0–1) · Dominant failure mode · Composite RUL fusion',
      gradient: 'from-blue-500 to-cyan-600',
      icon: Activity
    },
    {
      layer: '03',
      name: 'Third-Party Sensor Integration',
      source: 'Vibrational · Thermal imaging · Olfactory / gas sensors',
      description: 'External sensor streams — shaft vibration monitors, IR thermal cameras, and combustion gas analyzers — enter through a proprietary normalization layer that maps heterogeneous manufacturer protocols and physical units into a unified event schema. All normalized signals feed the live anomaly detection pipeline. Physics-based safety overrides act as hard boundaries: when physical limits are breached, the measured signal takes absolute precedence over any statistical model output.',
      keyTech: ['Proprietary normalization layer: maps any sensor protocol', 'Vibration: bearing health, alignment, resonance patterns', 'Thermal: heat distribution maps, cooling efficiency signals', 'Physics safety override: hard boundary regardless of model confidence'],
      output: 'Normalized sensor events → live anomaly pipeline',
      gradient: 'from-emerald-500 to-teal-600',
      icon: Zap
    }
  ]

  // Procurement automation cycle steps
  const procurementSteps = [
    { step: '01', label: 'Reorder Trigger', detail: 'Inventory level crosses threshold — quantities computed from consumption history', auto: true, icon: Package },
    { step: '02', label: 'Draft Inquiry', detail: 'Parts list assembled with quantities, vessel spec, and urgency from live RUL signal', auto: true, icon: FileCheck },
    { step: '03', label: 'Outbound to Suppliers', detail: 'Structured inquiry dispatched to all approved suppliers for the part category', auto: true, icon: Globe },
    { step: '04', label: 'Offer Parsing', detail: 'Inbound supplier emails parsed by AI — line items, prices, quantities, lead times extracted', auto: true, icon: Brain },
    { step: '05', label: 'Price Benchmark', detail: 'Offers ranked by price delta vs. history, lead time urgency, and supplier reliability score', auto: true, icon: BarChart3 },
    { step: '06', label: 'Award Decision', detail: 'Buyer receives context-complete ranked recommendation — the only human gate in the cycle', auto: false, icon: CheckCircle2 }
  ]

  // HITL Governance tiers
  const governanceTiers = [
    {
      tier: 'Tier 0',
      name: 'Advisory',
      description: 'In-app notification only. No proposals created. No tasks drafted. fleetcore surfaces the insight — you decide if action is needed.',
      confidenceLabel: 'Confidence Score < 50%',
      confidenceColor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
      borderColor: 'border-l-slate-400',
      creates: ['In-app notification'],
      expiry: 'No expiry — advisory only',
      icon: CheckCircle2,
      iconColor: 'text-slate-500'
    },
    {
      tier: 'Tier 1',
      name: 'Semi-Automated',
      description: 'A formal proposal is created for human review. A draft maintenance task is materialized for inspection. Email notification sent. You approve or reject within the window.',
      confidenceLabel: 'Confidence Score 50–80%',
      confidenceColor: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
      borderColor: 'border-l-amber-400',
      creates: ['Approval proposal', 'Draft maintenance task', 'Email notification'],
      expiry: '72-hour approval window',
      icon: Clock,
      iconColor: 'text-amber-500'
    },
    {
      tier: 'Tier 2',
      name: 'Accelerated',
      description: 'Critical-priority path. All Tier 1 actions plus a predictive event proposal, automatic procurement pre-check, and an AI-drafted compliance report. Escalates to secondary approver if unresolved.',
      confidenceLabel: 'Confidence Score ≥ 80%',
      confidenceColor: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
      borderColor: 'border-l-red-500',
      creates: ['Critical alert', 'Predictive event proposal', 'Procurement pre-order', 'Draft compliance report'],
      expiry: '24-hour window (12h for safety-critical equipment)',
      icon: Zap,
      iconColor: 'text-red-500'
    }
  ]

  const gradientSections = [
    {
      id: 'hero',
      colors: { primary: 'rgba(168, 85, 247, 1)', secondary: 'rgba(99, 102, 241, 1)' },
      position: 'from-center'
    },
    {
      id: 'problem',
      colors: { primary: 'rgba(244, 63, 94, 1)', secondary: 'rgba(251, 113, 133, 1)' },
      position: 'from-top-left'
    },
    {
      id: 'agents',
      colors: { primary: 'rgba(99, 102, 241, 1)', secondary: 'rgba(168, 85, 247, 1)' },
      position: 'from-left'
    },
    {
      id: 'predictive',
      colors: { primary: 'rgba(16, 185, 129, 1)', secondary: 'rgba(6, 182, 212, 1)' },
      position: 'from-top-right'
    },
    {
      id: 'procurement',
      colors: { primary: 'rgba(245, 158, 11, 1)', secondary: 'rgba(239, 68, 68, 1)' },
      position: 'from-bottom-left'
    },
    {
      id: 'capabilities',
      colors: { primary: 'rgba(168, 85, 247, 1)', secondary: 'rgba(217, 70, 239, 1)' },
      position: 'from-right'
    },
    {
      id: 'governance',
      colors: { primary: 'rgba(16, 185, 129, 1)', secondary: 'rgba(20, 184, 166, 1)' },
      position: 'from-bottom'
    },
    {
      id: 'cta',
      colors: { primary: 'rgba(99, 102, 241, 1)', secondary: 'rgba(124, 58, 237, 1)' },
      position: 'from-center'
    }
  ]

  const textShadow = isDarkMode
    ? '0 0 60px rgba(0,0,0,0.3), 0 0 120px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.25)'
    : '0 0 60px rgba(255,255,255,0.4), 0 0 120px rgba(255,255,255,0.3), 0 4px 30px rgba(255,255,255,0.35)'

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>fleetcore AI Agent | Maritime Fleet Intelligence</title>
        <meta name="description" content="fleetcore's AI agent answers any fleet question in natural language — tasks, events, procurement, compliance — with 30+ maritime handlers and session memory." />
        <link rel="canonical" href="https://fleetcore.ai/ai" />
        <meta property="og:title" content="fleetcore AI Agent | Maritime Fleet Intelligence" />
        <meta property="og:description" content="30+ maritime-domain handlers. Human-approved automation. Ask anything about your fleet." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fleetcore.ai/ai" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fleetcore_ai" />
        <meta name="twitter:title" content="fleetcore AI Agent | Maritime Fleet Intelligence" />
        <meta name="twitter:description" content="30+ maritime-domain handlers. Human-approved automation. Ask anything about your fleet." />
      </Helmet>

      <ScrollGradientBackground sections={gradientSections} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 overflow-hidden min-h-[85vh] flex items-center">
        <AIHeroBackground isDarkMode={isDarkMode} />

        <div className="container mx-auto px-4 relative z-50">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] }}
            style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 mb-8">
              <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-medium text-violet-700 dark:text-violet-300">AI-First Fleet Platform</span>
            </div>

            {/* H1 */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold enterprise-heading mb-6 leading-tight">
              <span className="text-black dark:text-white" style={{ textShadow }}>Not AI Added.</span>
              <br />
              <span className="maritime-gradient-text" style={{ textShadow }}>AI Built.</span>
            </h1>

            <p
              className="text-lg md:text-xl text-black dark:text-white enterprise-body mb-10 font-semibold max-w-3xl mx-auto"
              style={{ textShadow: isDarkMode
                ? '0 0 50px rgba(0,0,0,0.35), 0 3px 25px rgba(0,0,0,0.3)'
                : '0 0 50px rgba(255,255,255,0.45), 0 3px 25px rgba(255,255,255,0.4)'
              }}
            >
              Every maintenance cycle, procurement inquiry, incident alert, and compliance report
              is governed by a purpose-built agent. Humans stay in command — the platform does the preparation.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {[
                { label: 'Predictive ML Engine', icon: Activity, cls: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
                { label: 'Procurement Agent',    icon: Package,  cls: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300' },
                { label: '30+ AI Handlers',      icon: Layers,   cls: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
                { label: 'HITL Governance',      icon: Shield,   cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' }
              ].map(pill => (
                <div
                  key={pill.label}
                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${pill.cls}`}
                >
                  <pill.icon className="w-4 h-4" />
                  <span>{pill.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                variant="gradient"
                size="xl"
                className="group"
                onClick={() => {
                  if (window.Calendly) {
                    window.Calendly.initPopupWidget({ url: 'https://calendly.com/hello-fleetcore/30min' })
                  }
                }}
              >
                Book a fleetcore Demo
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Link to="/platform">
                <Button variant="ghost" size="xl">
                  <Globe className="w-5 h-5" />
                  Explore the Platform
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: WHY GENERIC AI FAILS ─────────────────────────────── */}
      <section className="py-10 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(239 68 68) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
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
              <span className="text-sm font-medium text-red-700 dark:text-red-300">Six Gaps No Competitor Has Solved</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              The Maritime AI Gap Is{' '}
              <span className="maritime-gradient-text">Wider Than You Think</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Maritime operators have tried AMOS, ABS NS, and Kongsberg with AI features attached.
              The problem isn't the AI — it's what those tools don't know, can't see, and aren't allowed to touch.
            </p>
          </motion.div>

          <div className="max-w-5xl mx-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {maritimeAIGaps.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.07 }}
                viewport={{ once: true }}
                className="py-7 grid grid-cols-[56px_1fr] md:grid-cols-[80px_1fr] gap-x-5 gap-y-2 group"
              >
                <div className="flex flex-col items-center gap-2 pt-0.5">
                  <span className="text-3xl font-black font-mono leading-none text-slate-200 dark:text-slate-700 tabular-nums select-none group-hover:text-slate-300 dark:group-hover:text-slate-600 transition-colors">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0', item.color)}>
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 enterprise-heading">
                    {item.title}
                  </h3>
                  <p className="text-[15px] text-slate-600 dark:text-slate-300 enterprise-body leading-relaxed mb-3">
                    {item.description}
                  </p>
                  <span className="inline-block text-xs font-mono text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 px-2.5 py-1 rounded">
                    {item.gap}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Architecture callout */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-14 max-w-4xl mx-auto"
          >
            <div className="rounded-3xl border bg-gradient-to-br from-violet-50/50 via-indigo-50/30 to-blue-50/50 dark:from-violet-950/20 dark:via-indigo-950/15 dark:to-blue-950/20 p-10 text-center">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 enterprise-heading">
                fleetcore Closes All Six Gaps — Simultaneously
              </h3>
              <p className="text-lg text-slate-600 dark:text-slate-300 enterprise-body mb-6">
                Not as six separate tools. As one integrated platform where censoring-aware ML predictions,
                live sensor streams, procurement automation, predictive incidents, and human governance are woven together from day one.
              </p>
              <div className="flex flex-wrap justify-center gap-3 text-sm">
                {['Censoring-Aware ML', 'Equipment DNA', 'Federated Learning', 'HITL Governance', 'Closed-Loop Procurement', 'Predictive Incidents'].map(tag => (
                  <span key={tag} className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 3: AGENTS AT EVERY LAYER ────────────────────────────── */}
      <section className="py-10 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025]">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(99 102 241) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 mb-6">
              <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Agentic Platform Architecture</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              AI Isn't a Feature.{' '}
              <span className="maritime-gradient-text">It's the Foundation.</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              fleetcore embeds purpose-built agents across every operational workflow. Each agent runs
              autonomously within defined bounds, prepares the decision, and routes it to the right human
              — governed by the same three-tier approval layer.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {agenticWorkflows.map((wf, index) => (
              <motion.div
                key={wf.agent}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-lg p-7 h-full hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', wf.iconGradient)}>
                        <wf.icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 enterprise-heading">{wf.agent}</h3>
                    </div>
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0', wf.badgeColor)}>{wf.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 enterprise-body leading-relaxed mb-5">{wf.description}</p>
                  <div className="mb-5">
                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2.5">Runs Automatically:</div>
                    <ul className="space-y-1.5">
                      {wf.automated.map(action => (
                        <li key={action} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <Zap className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{wf.gate}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: PREDICTIVE & PREVENTIVE INTELLIGENCE ────────────── */}
      <section className="py-16 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(16 185 129) 1px, transparent 0)',
            backgroundSize: '44px 44px'
          }} />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mb-6">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">ML Predictive Intelligence Stack</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              Your Fleet Learns From{' '}
              <span className="maritime-gradient-text">Every Running Hour</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Three converging data streams — historical survival data, live sensor signals, and third-party IoT feeds —
              feed a progressive ML architecture that computes calibrated Remaining Useful Life forecasts
              with P05/P50/P95 confidence bands for every equipment installation.
            </p>
          </motion.div>

          {/* Three ML layers — vertical pipeline */}
          <div className="relative max-w-4xl mx-auto mb-14">
            {/* Connecting gradient line */}
            <div className="absolute left-[19px] top-10 bottom-10 w-0.5 bg-gradient-to-b from-violet-300 via-blue-300 to-emerald-400 dark:from-violet-700 dark:via-blue-700 dark:to-emerald-700 hidden md:block" />

            <div className="space-y-6">
              {mlLayers.map((layer, index) => {
                const LayerIcon = layer.icon
                return (
                  <motion.div
                    key={layer.name}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7, delay: index * 0.15 }}
                    viewport={{ once: true }}
                    className="flex gap-5 items-stretch"
                  >
                    {/* Timeline node */}
                    <div className={cn('w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 z-10 shadow-md mt-4', layer.gradient)}>
                      <LayerIcon className="w-5 h-5 text-white" />
                    </div>
                    {/* Card */}
                    <div className="flex-1 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                        <div>
                          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-0.5">Layer {layer.layer} · {layer.source}</div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 enterprise-heading">{layer.name}</h3>
                        </div>
                        <div className={cn('text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r text-white whitespace-nowrap shrink-0 self-start', layer.gradient)}>
                          {layer.output}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 enterprise-body leading-relaxed mb-4">
                        {layer.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {layer.keyTech.map(tech => (
                          <span key={tech} className="flex items-center gap-1 text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* RUL preview callout — inspired by the actual dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto"
          >
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20 overflow-hidden shadow-lg">
              {/* Panel header */}
              <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">ML Remaining Useful Life Intelligence</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1 px-2 py-1 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                    ML Historical Data
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                    ML Live EQ Data
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    Live — 3s
                  </span>
                </div>
              </div>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Equipment</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-violet-500 uppercase tracking-wide">P05</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">P50 ↑</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">P95</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Conf</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      { name: 'Port Pump', p05: '307h', p50: '409h', p95: '511h', conf: '58%', status: 'Normal', confColor: 'text-amber-600 dark:text-amber-400' },
                      { name: 'C32 Marine Diesel Engine (CTR)', p05: '755h', p50: '1,007h', p95: '1,259h', conf: '45%', status: 'Normal', confColor: 'text-slate-500' },
                      { name: 'STBD Cooling Pump', p05: '387h', p50: '516h', p95: '645h', conf: '56%', status: 'Divergence', confColor: 'text-amber-600 dark:text-amber-400' },
                      { name: 'Air Compressor Unit', p05: '1,038h', p50: '1,384h', p95: '1,730h', conf: '63%', status: 'Normal', confColor: 'text-emerald-600 dark:text-emerald-400' }
                    ].map(row => (
                      <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-medium text-slate-800 dark:text-slate-200">{row.name}</td>
                        <td className="px-4 py-3.5 text-right text-sm text-slate-500 dark:text-slate-400 font-mono">{row.p05}</td>
                        <td className="px-4 py-3.5 text-right text-sm font-bold text-slate-900 dark:text-white font-mono">{row.p50}</td>
                        <td className="px-4 py-3.5 text-right text-sm text-slate-500 dark:text-slate-400 font-mono">{row.p95}</td>
                        <td className={cn('px-4 py-3.5 text-right text-sm font-semibold font-mono', row.confColor)}>{row.conf}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                            row.status === 'Normal'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          )}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Fusion formula */}
              <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 text-center">
                  Composite RUL = (1 − stream_confidence) × HPE_RUL + stream_confidence × LSPE_P50
                  <span className="ml-3 text-slate-400 dark:text-slate-500">— Weighted fusion activates at stream_confidence {'>'} 30%</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 5: AI PROCUREMENT AUTOMATION ────────────────────────── */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <AIProcurementSectionBackground isDarkMode={isDarkMode} />
        <div className="container mx-auto px-4 relative z-50">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mb-6">
              <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Closed-Loop Procurement Automation</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              From Reorder Alert{' '}
              <span className="maritime-gradient-text">to Ranked Offer.</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              The entire procurement cycle — from inventory threshold breach to ranked supplier recommendation —
              runs automatically. You open your inbox to a context-complete award decision, not a to-do list.
            </p>
          </motion.div>

          {/* 6-step procurement flow */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {procurementSteps.map((s, i) => {
                const StepIcon = s.icon
                return (
                  <motion.div
                    key={s.step}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: i * 0.08 }}
                    viewport={{ once: true }}
                  >
                    <div className={cn(
                      'rounded-2xl bg-white dark:bg-slate-800 shadow-lg border p-7 h-full transition-all duration-300',
                      s.auto
                        ? 'border-slate-200 dark:border-slate-700 hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442]'
                        : 'border-indigo-200 dark:border-indigo-800/60 hover:shadow-[8px_8px_0px_#312e81] hover:-translate-y-0.5'
                    )}>
                      <div className="flex items-start justify-between mb-5">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                          s.auto ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-indigo-500 to-violet-600'
                        )}>
                          <StepIcon className="w-5 h-5 text-white" />
                        </div>
                        <span className={cn(
                          'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide',
                          s.auto
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        )}>
                          {s.auto ? 'Automated' : 'Human Gate'}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-1.5">{s.step}</div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2 enterprise-heading leading-tight">
                        {s.label}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 enterprise-body leading-relaxed">
                        {s.detail}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* ML-Procurement bridge callout */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 p-7">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">ML × Procurement Bridge</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 enterprise-body leading-relaxed">
                When the Predictive Maintenance Agent computes a RUL estimate below 2× the average supplier lead time
                for critical parts, it automatically triggers a procurement pre-check. The procurement agent cross-references
                current inventory, computes required quantities, and fires the inquiry — before a human even sees the alert.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 p-7">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Price Intelligence & Lead Time Ranking</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 enterprise-body leading-relaxed">
                Inbound supplier offers are parsed by LLM, line items extracted, and benchmarked against a 2-year
                historical pricing dataset per part number. Offers are ranked by a composite score of price delta,
                quoted lead time vs. RUL urgency, and supplier reliability score — all before the buyer reviews.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 6: CAPABILITIES ──────────────────────────────────────── */}
      <section className="py-10 md:py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 mb-6">
              <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-medium text-violet-700 dark:text-violet-300">Conversational Fleet Intelligence</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              Ask Your Fleet. <span className="maritime-gradient-text">Get Live Answers.</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              The conversational layer connects directly to your live fleet database. 30+ specialist handlers,
              an analyst DSL for complex aggregations, and persistent session memory —
              grounded in real data, not general knowledge.
            </p>
          </motion.div>

          {/* Asymmetric layout: featured card left, 4 stacked right */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Featured card — left column */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="lg:row-span-2"
            >
              <div className="rounded-3xl border bg-white dark:bg-slate-800 shadow-lg p-8 h-full hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 flex flex-col">
                <div className={cn('w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6', aiCapabilities[0].gradient)}>
                  <FeaturedCapabilityIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 enterprise-heading">
                  {aiCapabilities[0].title}
                </h3>
                <p className="text-base text-slate-600 dark:text-slate-300 mb-6 enterprise-body leading-relaxed flex-1">
                  {aiCapabilities[0].description}
                </p>
                {/* Live AI chat preview — modelled on real product UI */}
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm flex flex-col text-[11px]">

                  {/* App header */}
                  <div className="flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                        <Activity className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">AI Intelligence</div>
                        <div className="text-[9px] text-slate-500">Dynamic Marine Services • Platform • 3 sessions</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-[9px] px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">Reset</span>
                      <span className="text-[9px] px-2 py-1 rounded bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-medium">New session</span>
                    </div>
                  </div>

                  {/* Session tabs */}
                  <div className="flex gap-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 overflow-hidden">
                    {[
                      { label: 'Show low-stock spare p...', active: false },
                      { label: 'Do we have any open ev...', active: false },
                      { label: 'Give me all overdue tasks ...', active: true },
                    ].map(tab => (
                      <div
                        key={tab.label}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded text-[9px] whitespace-nowrap shrink-0 leading-none',
                          tab.active
                            ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700'
                            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        )}
                      >
                        {tab.label}
                        <span className="text-slate-300 dark:text-slate-600 ml-0.5">×</span>
                      </div>
                    ))}
                  </div>

                  {/* Chat area */}
                  <div className="px-4 py-4 bg-white dark:bg-slate-900 space-y-3">

                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white px-3 py-2 rounded-xl rounded-tr-sm text-[10px] leading-relaxed max-w-[85%]">
                        Give me all overdue tasks in my organisation
                      </div>
                    </div>

                    {/* AI response */}
                    <motion.div
                      className="space-y-3"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.6 }}
                      viewport={{ once: true }}
                    >
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-relaxed">
                        Here are your fleet priorities for the week. You have{' '}
                        <span className="text-violet-600 dark:text-violet-400 font-semibold">78 overdue tasks</span>{' '}
                        and <span className="font-semibold text-slate-800 dark:text-slate-200">13 tasks</span> due this week.
                        Need to create a work order, assign tasks, or filter by vessel?
                      </p>

                      {/* Count badges */}
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-semibold border border-amber-200 dark:border-amber-800">Overdue: 78</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-semibold border border-blue-200 dark:border-blue-800">Due soon: 13</span>
                      </div>

                      {/* Section label */}
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Overdue / urgent (12 shown)</span>
                        <span className="text-[9px] text-violet-500 dark:text-violet-400">+ 66 more</span>
                      </div>

                      {/* Task table */}
                      <motion.div
                        className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden"
                        initial={{ opacity: 0, y: 6 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55, duration: 0.5 }}
                        viewport={{ once: true }}
                      >
                        {/* Header row */}
                        <div className="grid grid-cols-[64px_28px_1fr_52px] bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                          {['Vessel', 'P', 'Title', 'Status'].map(h => (
                            <div key={h} className="px-2 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wide truncate">{h}</div>
                          ))}
                        </div>

                        {/* Data rows */}
                        {[
                          { vessel: 'Dynamic 17', p: 'P3', title: 'Weekly Readiness Test — Functional Start and Pressure Build' },
                          { vessel: 'Dynamic 17', p: 'P4', title: "Weekly 'Start' Check — Visual Leak Inspection • Testing • 1w" },
                          { vessel: 'Dynamic 17', p: 'P4', title: 'Noise and Vibration Assessment • Inspection • 7w' },
                          { vessel: 'Dynamic 17', p: 'P4', title: 'Weekly Fuel and Battery Check • Inspection • 1w' },
                          { vessel: 'Dynamic 17', p: 'P3', title: 'Monthly Suction Strainer Cleaning • Cleaning • 1mo' },
                          { vessel: 'Dynamic 17', p: 'P3', title: 'Function Test — Steering Gear (Operational Test) • Testing • 1mo' },
                        ].map((row, i) => (
                          <motion.div
                            key={i}
                            className="grid grid-cols-[64px_28px_1fr_52px] border-b border-slate-50 dark:border-slate-800/40 last:border-0"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ delay: 0.65 + i * 0.05, duration: 0.3 }}
                            viewport={{ once: true }}
                          >
                            <div className="px-2 py-1.5 text-[9px] text-slate-500 dark:text-slate-500 truncate">{row.vessel}</div>
                            <div className="px-2 py-1.5 text-[9px] text-slate-400 truncate">{row.p}</div>
                            <div className="px-2 py-1.5 text-[9px] text-violet-600 dark:text-violet-400 truncate">{row.title}</div>
                            <div className="px-2 py-1.5 text-[9px] text-right">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px]">pending</span>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Second exchange — notification draft */}
                  <div className="px-4 pb-4 bg-white dark:bg-slate-900 space-y-3 border-t border-slate-50 dark:border-slate-800 pt-3">

                    {/* Second user message */}
                    <div className="flex justify-end">
                      <div className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white px-3 py-2 rounded-xl rounded-tr-sm text-[10px] leading-relaxed max-w-[90%]">
                        Draft a maintenance notification to the Chief Engineer on Dynamic 17 for the top 3 critical items
                      </div>
                    </div>

                    {/* AI draft response */}
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                      viewport={{ once: true }}
                      className="space-y-2"
                    >
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Draft created. Ready to send or edit before dispatch.
                      </p>

                      {/* Notification draft card */}
                      <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 overflow-hidden">
                        {/* Draft header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-amber-100/70 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800/40">
                          <div className="flex items-center gap-1.5">
                            <FileCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Draft Notification</span>
                          </div>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold">ai-draft</span>
                        </div>
                        {/* Draft body */}
                        <div className="px-3 py-2.5 space-y-1.5">
                          <div className="flex gap-2 text-[9px]">
                            <span className="text-slate-400 w-10 shrink-0">To:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Chief Engineer — M/V Dynamic 17</span>
                          </div>
                          <div className="flex gap-2 text-[9px]">
                            <span className="text-slate-400 w-10 shrink-0">Subj:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Action required — 3 overdue maintenance items</span>
                          </div>
                          <div className="border-t border-amber-200 dark:border-amber-800/40 pt-2 mt-1 text-[9px] text-slate-600 dark:text-slate-400 space-y-1 leading-relaxed">
                            <p>Chief,</p>
                            <p>The following items on Dynamic 17 require immediate attention:</p>
                            <p className="font-medium text-slate-700 dark:text-slate-300">1. [P3] Weekly Readiness Test — Functional Start &amp; Pressure Build — 5d overdue</p>
                            <p className="font-medium text-slate-700 dark:text-slate-300">2. [P3] Monthly Suction Strainer Cleaning — 31d overdue</p>
                            <p className="font-medium text-slate-700 dark:text-slate-300">3. [P3] Steering Gear Operational Test — 35d overdue</p>
                            <p>Please confirm assignment and scheduling.</p>
                          </div>
                        </div>
                        {/* Draft actions */}
                        <div className="flex gap-2 px-3 py-2 border-t border-amber-200 dark:border-amber-800/40">
                          <button className="flex-1 text-[9px] py-1.5 rounded border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-semibold text-center">Edit draft</button>
                          <button className="flex-1 text-[9px] py-1.5 rounded bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold text-center">Send to Chief Engineer</button>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Input bar */}
                  <div className="px-3 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <span className="text-[10px] text-slate-400 flex-1">Ask anything...</span>
                      <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                        <ArrowRight className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>

            {/* 4 stacked smaller cards — right column */}
            <div className="grid grid-cols-1 gap-6">
              {aiCapabilities.slice(1).map((cap, index) => (
                <motion.div
                  key={cap.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: (index + 1) * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="rounded-3xl border bg-white dark:bg-slate-800 shadow-lg p-6 h-full hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', cap.gradient)}>
                        <cap.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 enterprise-heading">
                          {cap.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 enterprise-body mt-1 leading-relaxed">
                          {cap.description}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 p-3">
                      <div className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-1 font-mono">Real Query:</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed">
                        {cap.query}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* ── SECTION 7: HITL GOVERNANCE ───────────────────────────────────── */}
      <section className="py-10 md:py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mb-6">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Three-Tier AI Governance</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6">
              fleetcore Proposes. <span className="maritime-gradient-text">Humans Decide.</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto enterprise-body">
              Every AI-driven action is gated by a Confidence Score — a 0–100% measure combining
              prediction accuracy, divergence from baseline, and training data depth.
              Higher confidence enables more autonomous preparation; final execution always requires human approval.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {governanceTiers.map((tier, index) => (
              <motion.div
                key={tier.tier}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.15 }}
                viewport={{ once: true }}
              >
                <div className="rounded-3xl border bg-white dark:bg-slate-800 shadow-lg p-8 h-full hover:shadow-[8px_8px_0px_#2a3442] hover:-translate-y-0.5 hover:border-[#2a3442] transition-all duration-300 border-slate-200 dark:border-slate-700">
                  {/* Tier badge + confidence score */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">
                      {tier.tier}
                    </span>
                    <span className={cn('text-xs font-semibold px-3 py-1 rounded-full', tier.confidenceColor)}>
                      {tier.confidenceLabel}
                    </span>
                  </div>

                  {/* Icon + name */}
                  <div className="flex items-center gap-3 mb-4">
                    <tier.icon className={cn('w-6 h-6', tier.iconColor)} />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 enterprise-heading">
                      {tier.name}
                    </h3>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 enterprise-body leading-relaxed mb-6">
                    {tier.description}
                  </p>

                  {/* What gets created */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                      fleetcore Creates:
                    </div>
                    <ul className="space-y-1">
                      {tier.creates.map(item => (
                        <li key={item} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Expiry */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold">Window: </span>{tier.expiry}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Invariant callout */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            viewport={{ once: true }}
            className="mt-12 max-w-4xl mx-auto"
          >
            <div className="rounded-3xl border bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-cyan-50/50 dark:from-emerald-950/20 dark:via-teal-950/15 dark:to-cyan-950/20 p-10 text-center">
              <BookOpen className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 enterprise-heading">
                Three Non-Negotiable Invariants
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-6">
                {[
                  { label: 'Human approval required', detail: 'No AI output directly mutates your maintenance schedules or tasks.' },
                  { label: 'Every action is auditable', detail: 'Every AI proposal carries the originating prediction ID and confidence score.' },
                  { label: 'Always reversible', detail: 'Approved changes retain rollback capability. Draft artifacts auto-archive on expiry.' }
                ].map(inv => (
                  <div key={inv.label} className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{inv.label}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 enterprise-body">{inv.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 8: STATS + CTA ───────────────────────────────────────── */}
      <section className="py-10 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-indigo-600/10 to-blue-600/10 dark:from-violet-600/5 dark:via-indigo-600/5 dark:to-blue-600/5" />

        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto"
          >
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {[
                { value: '5', label: 'Autonomous Agents', detail: 'Maintenance, procurement, incidents, compliance, conversational AI' },
                { value: '30+', label: 'AI Handlers', detail: 'Specialist logic for every fleet domain' },
                { value: '100%', label: 'Audit Coverage', detail: 'Every AI action traceable to its originating prediction' }
              ].map(stat => (
                <div key={stat.label} className="text-center p-8 rounded-3xl border bg-white dark:bg-slate-800 shadow-lg">
                  <div className="text-5xl font-bold maritime-gradient-text mb-2">{stat.value}</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{stat.label}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">{stat.detail}</div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 mb-8">
                <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  See fleetcore AI in Action
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold enterprise-heading mb-6 leading-tight">
                Ready to Ask Your Fleet
                <br />
                <span className="maritime-gradient-text">Anything?</span>
              </h2>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 enterprise-body max-w-3xl mx-auto">
                Five autonomous agents. Live fleet data. Three-tier governance.
                Built for the maritime operators who need intelligence without losing accountability.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="gradient"
                  size="xl"
                  className="group"
                  onClick={() => {
                    if (window.Calendly) {
                      window.Calendly.initPopupWidget({ url: 'https://calendly.com/hello-fleetcore/30min' })
                    }
                  }}
                >
                  Book a fleetcore Demo
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Link to="/platform">
                  <Button variant="ghost" size="xl">
                    <Globe className="w-5 h-5" />
                    Explore the Platform
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

export default AIPage
