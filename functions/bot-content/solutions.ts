/**
 * Bot-optimized content for Solutions page (/solutions)
 * Served to Googlebot, ChatGPT, Claude, Perplexity, Gemini
 *
 * ACCURACY VERIFIED: Aligned with SolutionsPage.tsx as of 2026-05-27
 */

import { blogContentFunnelSection, blogNavListItem } from './shared';

const LAST_UPDATED = '2026-05-27';

export function generateSolutionsContent(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>fleetcore — Maritime Maintenance Solutions</title>
  <meta name="description" content="AI-first maritime maintenance OS: five autonomous agents for maintenance, procurement, incidents, compliance, and fleet conversation. Three-layer ML stack, HITL governance, SOLAS/MARPOL compliance.">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="revised" content="${LAST_UPDATED}">
  <link rel="canonical" href="https://fleetcore.ai/solutions">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://fleetcore.ai/solutions">
  <meta property="og:title" content="fleetcore — Maritime Maintenance Solutions">
  <meta property="og:description" content="AI-first maritime maintenance OS with five autonomous agents, three-layer ML predictive stack, and HITL governance.">
  <meta property="og:image" content="https://fleetcore.ai/og/solution.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="fleetcore — Maritime Maintenance Solutions">
  <meta name="twitter:description" content="Five autonomous agents, three-layer ML stack, HITL governance, SOLAS/MARPOL compliance.">
  <meta name="twitter:image" content="https://fleetcore.ai/og/solution.png">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does fleetcore differ from traditional CMMS?",
        "acceptedAnswer": { "@type": "Answer", "text": "fleetcore is an AI-first maintenance operating system with five autonomous agents — not a CMMS. It predicts failures 200–800 hours ahead using a three-layer ML stack, automates procurement via a closed-loop agent, and gates every write action through a three-tier HITL governance model. Traditional CMMS only tracks completed work orders." }
      },
      {
        "@type": "Question",
        "name": "What are the five AI agents in fleetcore?",
        "acceptedAnswer": { "@type": "Answer", "text": "1) Predictive Maintenance Agent — ML RUL forecasts and proactive scheduling; 2) Procurement Intelligence Agent — automated inquiry drafts and ranked offer analysis; 3) Incident Intelligence Agent — anomaly detection and correlated alert triage; 4) Compliance Reporting Agent — SOLAS/MARPOL status and PSC readiness; 5) Conversational Fleet Intelligence Agent — natural language queries across your entire fleet." }
      },
      {
        "@type": "Question",
        "name": "What outcomes can maritime operators expect?",
        "acceptedAnswer": { "@type": "Answer", "text": "30–40% efficiency gains through autonomous agent workflows, 90%+ task auto-generation, 100% SOLAS/MARPOL compliance tracking, and predictive failure prevention 200–800 hours ahead of breakdown." }
      },
      {
        "@type": "Question",
        "name": "How does fleetcore's HITL governance model work?",
        "acceptedAnswer": { "@type": "Answer", "text": "Every AI-driven write action is gated by a Confidence Score (0–100%). Scores below 70% trigger automatic human escalation. Scores at or above 95% enable streamlined one-click approval. No agent action bypasses human review." }
      },
      {
        "@type": "Question",
        "name": "What is schedule-specific hours tracking?",
        "acceptedAnswer": { "@type": "Answer", "text": "An industry-first design where each maintenance schedule has its own independent hours counter. Resetting one schedule (e.g. oil change) does not affect others (e.g. engine overhaul), eliminating the leading cause of missed major maintenance events in traditional CMMS systems." }
      },
      {
        "@type": "Question",
        "name": "How does fleetcore automate SOLAS and MARPOL compliance?",
        "acceptedAnswer": { "@type": "Answer", "text": "The Compliance Reporting Agent continuously monitors SOLAS Chapter II-2, MARPOL Annex VI, ISM Code Regulation 10.3, and MLC 2006. Required tasks are auto-generated with regulatory references. PSC inspection readiness reports are available on demand, and certificate expiry alerts fire automatically." }
      }
    ]
  }
  </script>
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; color: #1e293b; }
    .status-badge { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: white; padding: 12px 20px; border-radius: 8px; display: inline-block; margin-bottom: 24px; font-weight: 600; }
    h1 { color: #0f172a; font-size: 2.5em; margin-bottom: 0.5em; }
    h2 { color: #1e293b; font-size: 1.8em; margin-top: 1.8em; border-bottom: 3px solid #e2e8f0; padding-bottom: 0.4em; }
    h3 { color: #334155; font-size: 1.4em; margin-top: 1.4em; }
    strong { color: #7c3aed; font-weight: 600; }
    ul { margin: 1em 0; padding-left: 2em; }
    li { margin: 0.6em 0; }
    table { width: 100%; border-collapse: collapse; margin: 1.5em 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th, td { border: 1px solid #cbd5e1; padding: 14px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    tr:nth-child(even) { background: #f8fafc; }
    .problem-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; margin: 20px 0; border-radius: 4px; }
    .solution-box { background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 16px 20px; margin: 20px 0; border-radius: 4px; }
    .agent-box { background: #ede9fe; border-left: 4px solid #4f46e5; padding: 12px 16px; margin: 12px 0; border-radius: 4px; font-size: 0.95em; }
  </style>
</head>
<body>

  <p><strong>fleetcore Solutions replaces reactive maritime maintenance with an AI-first maintenance operating system.</strong> Five autonomous agents run across every operational workflow — predictive maintenance, procurement, incident intelligence, compliance reporting, and fleet conversation. A three-layer ML predictive stack generates P05/P50/P95 remaining-useful-life forecasts per equipment installation, 200–800 hours ahead of failure. Every agent write action is gated by a three-tier HITL governance model using a Confidence Score. Traditional CMMS platforms track what happened; fleetcore predicts and prevents what will happen next.</p>

  <div class="status-badge">
    🤖 <strong>AI-First Solutions</strong> | <strong>Updated:</strong> ${LAST_UPDATED} | <strong>5 Autonomous Agents</strong>
  </div>

  <h1>What maintenance problems does fleetcore solve for maritime fleets?</h1>
  <p style="font-size: 1.2em; color: #475569;">Five autonomous agents, a three-layer ML predictive stack, and HITL governance — why maritime operators are choosing fleetcore over AMOS, SERTICA, and DNV Nauticus</p>

  <h2>The Four Problems Traditional CMMS Cannot Solve</h2>

  <h3>Problem 1: Reactive Maintenance — 40% Higher Operating Costs</h3>
  <div class="problem-box">
    <p>Traditional CMMS track work orders after breakdowns. No predictive capability. Unplanned failures cost $8,000–$15,000 more per incident than scheduled maintenance (Lloyd's List, 2024).</p>
  </div>
  <div class="agent-box">
    <strong>AI Solution:</strong> Three-layer ML predictive stack outputs P05/P50/P95 RUL per installation. The Predictive Maintenance Agent flags degradation 200–800 hours ahead of failure and proposes a maintenance window — before the breakdown occurs.
  </div>

  <h3>Problem 2: Data Silos — 35–40% Time on Manual Entry</h3>
  <div class="problem-box">
    <p>Information scattered across paper logs, Excel spreadsheets, emails, and disconnected databases. Querying a single equipment history can take hours across multiple systems.</p>
  </div>
  <div class="agent-box">
    <strong>AI Solution:</strong> Equipment DNA unifies every data signal per installation — historical records, live telemetry, sensor streams. The Conversational Fleet Intelligence Agent surfaces data across 500 vessels in a single natural language query in under 200ms.
  </div>

  <h3>Problem 3: Manual Scheduling Burden — Hours Daily Per Vessel</h3>
  <div class="problem-box">
    <p>Engineers manually create every task on calendar intervals with no optimization for crew workload, parts availability, or equipment health state.</p>
  </div>
  <div class="agent-box">
    <strong>AI Solution:</strong> The Predictive Maintenance Agent proposes schedule adjustments based on live health index. The Procurement Intelligence Agent closes the reorder-to-recommendation cycle without human effort — from ML-triggered reorder event to ranked supplier offer in minutes.
  </div>

  <h3>Problem 4: Isolated Fleet Operations — Repeated Failures Across Vessels</h3>
  <div class="problem-box">
    <p>Each vessel operates independently. Failure patterns and maintenance insights stay siloed; the same breakdown happens again on another vessel with identical equipment.</p>
  </div>
  <div class="agent-box">
    <strong>AI Solution:</strong> Cross-fleet federated learning: a failure pattern detected on one vessel immediately updates survival model priors for every vessel with the same equipment installation. Failures are a one-time event for the fleet, not a repeated one.
  </div>

  <h2>Five Autonomous Agents — Every Workflow Covered</h2>

  <h3>1. Predictive Maintenance Agent</h3>
  <p>Runs continuously against the three-layer ML predictive stack (historical maintenance records layer, live equipment telemetry layer, third-party sensor stream layer: vibrational, thermal, environmental). Computes a composite health index per installation and generates P05/P50/P95 remaining-useful-life forecasts. When the health index drops below threshold, the agent proposes a maintenance window for human approval.</p>
  <ul>
    <li>200–800 hour failure prediction horizon</li>
    <li>Composite health index across all three data layers</li>
    <li>Physics-based override layer for mission-critical equipment</li>
    <li>Proactive schedule proposals with one-click approval</li>
  </ul>

  <h3>2. Procurement Intelligence Agent</h3>
  <p>Ingests ML-predicted RUL signals to trigger reorder events ahead of need. Automatically drafts inquiry emails to ranked suppliers, analyzes incoming offers on price, lead time, and quality, and surfaces the best-value recommendation as a human-reviewable proposal. No manual sourcing required.</p>
  <ul>
    <li>ML RUL-triggered reorder events</li>
    <li>Automated ranked supplier inquiry drafting</li>
    <li>Offer analysis with multi-factor scoring</li>
    <li>One-click human approval with full audit trail</li>
  </ul>

  <h3>3. Incident Intelligence Agent</h3>
  <p>Monitors incoming event and alert streams across the fleet, applying multi-model streaming anomaly detection to identify correlated failure patterns. Drafts incident reports and escalations with supporting evidence for Chief Engineer review.</p>
  <ul>
    <li>Real-time cross-fleet anomaly detection</li>
    <li>Correlated alert triage reducing noise</li>
    <li>Evidence-backed incident draft generation</li>
    <li>Severity-weighted escalation routing</li>
  </ul>

  <h3>4. Compliance Reporting Agent</h3>
  <p>Maintains continuous compliance monitoring for SOLAS Chapter II-2, MARPOL Annex VI, ISM Code Regulation 10.3, and MLC 2006. Generates PSC inspection readiness reports on demand. Fires certificate expiry alerts 30, 14, and 7 days ahead. Creates automated compliance audit trails for class society surveys.</p>
  <ul>
    <li>SOLAS/MARPOL/ISM/MLC compliance monitoring</li>
    <li>On-demand PSC readiness report generation</li>
    <li>Certificate expiry alert chain</li>
    <li>Class society survey audit trail (DNV, LR, BV, ABS, ClassNK, RINA)</li>
  </ul>

  <h3>5. Conversational Fleet Intelligence Agent</h3>
  <p>Natural language interface across all fleet data — maintenance history, equipment health, procurement spend, compliance status, KPIs, and financial reports. Understands context across multi-session conversation with 30+ domain-specific handlers. Ask about a single equipment item or the entire fleet in plain language.</p>
  <ul>
    <li>30+ domain-specific query handlers</li>
    <li>Multi-session memory with context continuity</li>
    <li>Cross-fleet queries in under 200ms</li>
    <li>Structured reporting on demand (cost breakdowns, KPIs, compliance)</li>
  </ul>

  <h2>Three-Tier HITL Governance Model</h2>
  <p>Every AI-driven write action is gated by a Confidence Score — a 0–100% metric combining prediction accuracy, divergence from baseline, and training data recency. No agent action bypasses human review.</p>
  <table>
    <tr>
      <th>Tier</th>
      <th>Confidence Score</th>
      <th>Actions created</th>
      <th>Expiry</th>
    </tr>
    <tr>
      <td><strong>Tier 0 — Advisory</strong></td>
      <td>&lt; 50%</td>
      <td>In-app notification only. No write actions proposed.</td>
      <td>No expiry</td>
    </tr>
    <tr>
      <td><strong>Tier 1 — Semi-Automated</strong></td>
      <td>50–80%</td>
      <td>Schedule adjustment proposal, draft maintenance task, alert</td>
      <td>72 hours</td>
    </tr>
    <tr>
      <td><strong>Tier 2 — Accelerated</strong></td>
      <td>≥ 80%</td>
      <td>Predictive event, procurement pre-check, draft compliance report</td>
      <td>24h (12h safety-critical)</td>
    </tr>
  </table>

  <h2>Core System Capabilities</h2>

  <h3>Schedule-Specific Hours Tracking (Industry First)</h3>
  <p>Each maintenance schedule has its own independent hours counter. Reset the oil change schedule — the engine overhaul schedule keeps accumulating. Eliminates the leading cause of missed major maintenance events that appear in PSC detention reports for AMOS and SERTICA users.</p>
  <ul>
    <li><strong>Traditional CMMS:</strong> One hours counter per equipment — reset any schedule → all schedules reset</li>
    <li><strong>fleetcore:</strong> Independent counter per schedule — reset oil change → overhaul unaffected</li>
  </ul>

  <h3>Dual-Interval Task Management</h3>
  <p>Tasks are generated on both running hours AND calendar intervals. The system triggers whichever threshold is reached first. Engine oil change: 250 running hours OR 3 months — the platform monitors both and generates the task automatically.</p>

  <h3>Automated PMS Schedule Generation</h3>
  <p>Import manufacturer maintenance specifications and the system auto-generates a complete maintenance program with zero manual task creation. Pre-loaded OEM intelligence for MAN B&W, Wärtsilä, Caterpillar, Kongsberg, and 96+ manufacturers enables same-day setup.</p>

  <h3>Cross-Fleet Equipment Registry</h3>
  <p>Centralized equipment definitions shared across all vessels. Track identical equipment across your fleet with unified maintenance procedures. One MAN B&W 6S50ME definition covers the same engine across all vessels — maintenance history, performance data, and health scores aggregated automatically.</p>

  <h3>SOLAS/MARPOL Compliance Tracking</h3>
  <p>Built-in regulatory compliance monitoring managed by the Compliance Reporting Agent. Safety equipment inspections, certificate renewals, ISM/MLC requirements — all tracked with automatic alert chains and audit-ready documentation.</p>

  <h3>AI Procurement Intelligence</h3>
  <p>The Procurement Intelligence Agent ingests ML-predicted RUL signals, drafts ranked supplier inquiries automatically, analyzes received offers on price/lead time/quality, and presents a best-value recommendation. Procurement becomes a governed agent workflow, not a manual process.</p>

  <h3>ML Predictive Maintenance</h3>
  <p>Three-layer ML stack: historical maintenance layer (survival analysis, Equipment DNA fingerprinting), live equipment telemetry layer (composite health index, real-time anomaly detection), third-party sensor stream layer (vibrational, thermal, environmental sensors). Outputs P05/P50/P95 RUL per installation 200–800 hours ahead of failure.</p>

  <h2>Feature Comparison: fleetcore vs Traditional Maritime CMMS</h2>
  <table>
    <tr>
      <th>Capability</th>
      <th>Traditional CMMS (AMOS, SERTICA)</th>
      <th>fleetcore AI-First OS</th>
    </tr>
    <tr>
      <td><strong>Maintenance Approach</strong></td>
      <td>Reactive — tracks completed work orders</td>
      <td>Predictive — ML RUL forecasts 200–800h ahead</td>
    </tr>
    <tr>
      <td><strong>Hours Tracking</strong></td>
      <td>One counter per equipment — reset cascades all schedules</td>
      <td>Schedule-specific independent counters (industry first)</td>
    </tr>
    <tr>
      <td><strong>Scheduling</strong></td>
      <td>Manual calendar-based task creation</td>
      <td>Predictive Maintenance Agent proposes schedule adjustments</td>
    </tr>
    <tr>
      <td><strong>Procurement</strong></td>
      <td>Manual requisitions via email/phone</td>
      <td>Procurement Intelligence Agent — ML-triggered → ranked offer → one-click approval</td>
    </tr>
    <tr>
      <td><strong>Incident Response</strong></td>
      <td>Manual alert review, paper or email escalation</td>
      <td>Incident Intelligence Agent — correlated anomaly detection + drafted escalations</td>
    </tr>
    <tr>
      <td><strong>Compliance</strong></td>
      <td>Separate module or spreadsheet tracking</td>
      <td>Compliance Reporting Agent — continuous SOLAS/MARPOL/ISM monitoring</td>
    </tr>
    <tr>
      <td><strong>Fleet Data Access</strong></td>
      <td>Siloed per vessel, manual cross-vessel queries</td>
      <td>Conversational Fleet Intelligence — natural language across 500+ vessels in 200ms</td>
    </tr>
    <tr>
      <td><strong>Agent Governance</strong></td>
      <td>No agent layer — all actions require manual initiation</td>
      <td>Three-tier HITL — Confidence Score gates every write action</td>
    </tr>
    <tr>
      <td><strong>Fleet Learning</strong></td>
      <td>No cross-vessel learning — failures repeat</td>
      <td>Federated learning — failure pattern on one vessel updates priors fleet-wide</td>
    </tr>
    <tr>
      <td><strong>Real-Time Updates</strong></td>
      <td>Manual refresh or slow polling (5–30s delays)</td>
      <td>WebSocket subscriptions — &lt;200ms latency</td>
    </tr>
  </table>

  <h2>The OS Analogy: Why fleetcore Is an Operating System</h2>
  <p>Like Windows or Linux manage computer hardware resources, fleetcore manages maritime operations:</p>
  <ul>
    <li><strong>Abstraction Layer:</strong> Engineers see "Change Oil" — not complex interval calculations</li>
    <li><strong>Resource Management:</strong> Optimally allocates crew time, parts inventory, and vessel schedules</li>
    <li><strong>Process Scheduling:</strong> Priority-based task execution — critical safety tasks above routine inspections</li>
    <li><strong>File System (Data Layer):</strong> One unified query accesses data from 500 vessels and 5,000 equipment items</li>
    <li><strong>Agent Processes (Always-On):</strong> Five autonomous agents run as OS processes — Predictive Maintenance, Procurement Intelligence, Incident Response, Compliance Reporting, Fleet Conversation</li>
    <li><strong>Permission Kernel (HITL Governance):</strong> Confidence Score gates every privileged write action — no agent bypasses human review, just as no user-space process bypasses the OS kernel</li>
  </ul>

  <h2>Use Cases by Maritime Sector</h2>

  <h3>Commercial Fleet Operations (Bulk Carriers, Tankers, Container Ships)</h3>
  <ul>
    <li>ML-predicted maintenance windows reduce drydock overruns</li>
    <li>Procurement Agent automates spare parts ordering for multi-vessel fleets</li>
    <li>Compliance Agent tracks MARPOL Annex VI ECA requirements automatically</li>
    <li>Conversational Agent gives shore-based superintendents instant fleet visibility</li>
  </ul>

  <h3>Offshore Energy (Support Vessels, Drilling Rigs, FPSO)</h3>
  <ul>
    <li>Third-party sensor stream integration (vibrational, thermal) for harsh-environment equipment</li>
    <li>Physics-based override layer for mission-critical safety equipment</li>
    <li>Extended offshore compliance tracking without connectivity dependencies</li>
    <li>Incident Intelligence Agent monitors safety-critical systems with elevated alerting</li>
  </ul>

  <h3>Ship Management Companies</h3>
  <ul>
    <li>Multi-organization architecture — complete data isolation per vessel owner</li>
    <li>Cross-managed-fleet analytics through Conversational Agent</li>
    <li>Standardized procurement workflows and supplier leaderboards across managed fleet</li>
    <li>Aggregated compliance reporting for owner reporting obligations</li>
  </ul>

  <h2>Operational Impact</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Outcome</th>
      <th>Driver</th>
    </tr>
    <tr>
      <td><strong>Efficiency Gain</strong></td>
      <td>30–40%</td>
      <td>Autonomous agent workflows replacing manual processes</td>
    </tr>
    <tr>
      <td><strong>Tasks Auto-Generated</strong></td>
      <td>90%+</td>
      <td>ML-triggered scheduling + dual-interval PMS generation</td>
    </tr>
    <tr>
      <td><strong>Compliance Tracking</strong></td>
      <td>100%</td>
      <td>Compliance Reporting Agent — continuous SOLAS/MARPOL monitoring</td>
    </tr>
    <tr>
      <td><strong>AI Agents Active</strong></td>
      <td>5</td>
      <td>Running autonomously across every operational workflow</td>
    </tr>
  </table>

  <h2>Frequently Asked Questions</h2>

  <h3>How does fleetcore differ from AMOS and SERTICA?</h3>
  <p>AMOS and SERTICA are work-order tracking systems built in the 1990s–2000s. They share a single hours counter per equipment installation, meaning resetting one maintenance schedule resets all others — a documented root cause of missed overhauls in PSC inspections. fleetcore is an AI-first operating system with schedule-specific hours tracking (an industry first), five autonomous agents running across every workflow, and a three-layer ML predictive stack. Traditional CMMS record the past; fleetcore predicts and prevents the future.</p>

  <h3>What is the Procurement Intelligence Agent and how does it work?</h3>
  <p>The Procurement Intelligence Agent ingests ML-predicted remaining-useful-life signals from the Predictive Maintenance layer. When a component's predicted life falls below the configured reorder threshold, the agent automatically drafts ranked supplier inquiry emails, analyzes incoming offers on price, lead time, and quality, and presents a scored recommendation for one-click human approval. The full cycle — from ML trigger to approved purchase — requires zero manual sourcing effort.</p>

  <h3>How does fleetcore handle HITL governance?</h3>
  <p>Every AI-driven write action passes through a three-tier governance model governed by a Confidence Score (0–100%). Tier 0 (below 50%): advisory alerts only, no write actions. Tier 1 (50–80%): schedule proposals and draft tasks require human approval within 72 hours. Tier 2 (≥80%): accelerated path with predictive events and compliance drafts — 24-hour window (12h for safety-critical equipment). No agent writes to any record without explicit human approval.</p>

  <h3>What sensor types does the ML stack process?</h3>
  <p>The third-party sensor stream layer processes vibrational sensors (bearing and shaft vibration analysis), thermal sensors (exhaust gas temperature, coolant temperature trending), and environmental sensors (humidity, pressure). These streams feed into the composite health index alongside historical maintenance records and live equipment telemetry to produce P05/P50/P95 RUL forecasts per installation.</p>

  <h3>How does cross-fleet federated learning work?</h3>
  <p>When a failure pattern is detected on one vessel, the survival model priors for that equipment type are updated fleet-wide. This means a bearing failure on Vessel A immediately improves the RUL forecast accuracy for identical bearings on Vessels B through Z. Failures become a one-time event for the fleet rather than a recurring one — a fundamental capability gap in all traditional CMMS platforms.</p>

  <h3>Which class societies does fleetcore support?</h3>
  <p>fleetcore's Compliance Reporting Agent and audit trail satisfy survey requirements for DNV, Lloyd's Register (LR), Bureau Veritas (BV), American Bureau of Shipping (ABS), ClassNK, and RINA. Every maintenance task is logged with user attribution, timestamps, parts consumed, and work done descriptions. PSC inspection readiness reports are generated on demand.</p>

  ${blogContentFunnelSection()}

  <h2>Navigate fleetcore</h2>
  <nav>
    <ul>
      ${blogNavListItem()}
      <li><a href="/">fleetcore overview — AI-first maritime maintenance OS, five autonomous agents, agentic workflows</a></li>
      <li><a href="/ai">AI Intelligence — predictive ML stack, HITL governance, five agents deep-dive</a></li>
      <li><a href="/platform">Technical platform architecture — four excellence pillars, competitive comparison</a></li>
      <li><a href="/about">About fleetcore — ADGM maritime technology company, Abu Dhabi UAE</a></li>
      <li><a href="/contact">Schedule a 30-minute demo — enterprise pricing and implementation</a></li>
    </ul>
  </nav>

</body>
</html>
`;
}
