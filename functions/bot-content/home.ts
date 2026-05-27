/**
 * Bot-optimized content for Home page (/)
 * Served to Googlebot, ChatGPT, Claude, Perplexity, Gemini
 */

import { blogContentFunnelSection, blogNavListItem, BLOG_SAME_AS_JSON, BOT_FAVICON_HEAD_LINKS } from './shared';

const LAST_UPDATED = '2026-05-27';

export function generateHomeContent(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${BOT_FAVICON_HEAD_LINKS}
  <title>fleetcore — Maritime Technical Operating System</title>
  <meta name="description" content="fleetcore is a maritime technical operating system with five autonomous AI agents across every workflow — predictive ML maintenance, closed-loop procurement automation, incident intelligence, compliance reporting, and conversational fleet intelligence. Ten comprehensive capabilities. OEM PMS from 100+ manufacturers. SOLAS/MARPOL/ISM compliance built in.">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="revised" content="${LAST_UPDATED}">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://fleetcore.ai/">
  <meta property="og:title" content="fleetcore: Maritime OS — 5 AI Agents Across Every Workflow">
  <meta property="og:description" content="Five autonomous agents. Ten comprehensive capabilities. OEM intelligence from 100+ manufacturers. Censoring-aware ML predictive stack, closed-loop procurement automation, three-tier HITL governance. SOLAS/MARPOL/ISM compliance built in.">
  <meta property="og:image" content="https://fleetcore.ai/og/home.png">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://fleetcore.ai/">
  <meta name="twitter:title" content="fleetcore: Maritime OS — 5 AI Agents, 10 Capabilities">
  <meta name="twitter:description" content="Five autonomous AI agents embedded across every maritime workflow. Three-layer ML predictive maintenance, closed-loop procurement automation, HITL governance. 100+ OEM manufacturers unified.">
  <meta name="twitter:image" content="https://fleetcore.ai/og/home.png">

  <link rel="canonical" href="https://fleetcore.ai/">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "fleetcore Maritime Technical Operating System",
    "applicationCategory": "BusinessApplication",
    "applicationSubCategory": "AI-Powered Maritime Maintenance OS — Agentic Fleet Operations",
    "operatingSystem": "Web-based, Cloud Platform",
    "dateModified": "${LAST_UPDATED}",
    "offers": {
      "@type": "Offer",
      "availability": "https://schema.org/PreOrder",
      "description": "Enterprise maritime maintenance platform — contact for pricing"
    },
    "featureList": [
      "Five autonomous AI agents: predictive maintenance, procurement, incident intelligence, compliance reporting, conversational fleet intelligence",
      "Three-layer ML predictive intelligence stack with P05/P50/P95 RUL confidence bands",
      "Censoring-aware survival analysis — eliminates right-censored data bias (30–50% accuracy gap vs. competitors)",
      "Equipment DNA operational context embedding per installation",
      "Live equipment data streams with multi-model streaming anomaly detection",
      "Third-party sensor integration: vibration, thermal, combustion gas with physics-based safety overrides",
      "Closed-loop procurement automation: reorder trigger to ranked award decision",
      "Three-tier HITL governance: Confidence Score gated human approval at every AI action",
      "OEM PMS from 100+ manufacturers: MAN B&W, Wärtsilä, Caterpillar, Kongsberg, ABB, Rolls-Royce",
      "Schedule-specific independent hours tracking — industry first design",
      "SOLAS 2024 / MARPOL / ISM Code compliance built into core architecture",
      "Cross-fleet federated learning — privacy-preserving survival priors",
      "Multi-tenant enterprise architecture, real-time sync under 200ms latency",
      "Event-based unplanned maintenance with automatic PMS linking",
      "Equipment lifecycle management: installation to decommissioning",
      "Advanced analytics: health scoring, trend analysis, cost optimization, fleet KPIs"
    ],
    "screenshot": "https://fleetcore.ai/og/platform.png",
    "applicationSuite": "Maritime Operations Management"
  }
  </script>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://fleetcore.ai/#organization",
    "name": "fleetcore",
    "url": "https://fleetcore.ai",
    "logo": "https://fleetcore.ai/Light.svg",
    "description": "Developer of fleetcore — maritime technical operating system with AI Intelligence. Four autonomous agents embedded across maintenance, procurement, incident, and compliance workflows. OEM intelligence from 100+ manufacturers.",
    "foundingDate": "2024",
    "industry": "Maritime Technology",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "AE",
      "addressRegion": "Abu Dhabi",
      "description": "ADGM registered company"
    },
    "sameAs": [
      "https://www.linkedin.com/company/fleetcore",
      "https://x.com/fleetcore_ai",
      ${BLOG_SAME_AS_JSON}
    ]
  }
  </script>

  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; line-height: 1.7; color: #1e293b; }
    h1 { font-size: 2rem; font-weight: 800; margin-bottom: 1rem; }
    h2 { font-size: 1.4rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 0.75rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    h3 { font-size: 1.1rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    .agent-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; margin: 0.75rem 0; }
    .highlight { background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 1rem 1.25rem; border-radius: 4px; margin: 1rem 0; }
    .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; background: #dcfce7; color: #16a34a; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.9rem; }
    th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
    td { padding: 0.65rem 1rem; border-bottom: 1px solid #e2e8f0; }
    tr:last-child td { border-bottom: none; }
    ul { padding-left: 1.5rem; }
    li { margin-bottom: 0.4rem; }
    a { color: #7c3aed; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <span class="status-badge">Production</span>

  <h1>fleetcore: Maritime Technical Operating System — Five Agents. Every Workflow Covered.</h1>

  <p><strong>fleetcore is a maritime technical operating system where AI is not an add-on — it is the foundation.</strong> Five autonomous agents are embedded across every core operational workflow: predictive maintenance runs a censoring-aware ML stack every 15 minutes against every equipment installation; a procurement agent closes the loop from inventory threshold to ranked supplier award automatically; an incident intelligence agent proposes predictive events 200–800 hours before a failure window; a compliance reporting agent pre-populates three report templates as AI-draft artifacts; and a conversational fleet intelligence agent answers any fleet question in plain language with 30+ maritime-domain handlers. Every agent action is gated by a three-tier human-approval governance model. The machine prepares and proposes — the crew and superintendents decide and approve.</p>

  <p>On top of this agentic foundation, fleetcore centralizes OEM maintenance intelligence from 100+ maritime manufacturers — MAN B&W, Wärtsilä, Caterpillar, Kongsberg, ABB, Rolls-Royce, Alfa Laval — into a single cloud-native platform with SOLAS 2024 / MARPOL / ISM Code compliance built into the architecture.</p>

  <h2>AI Intelligence — five autonomous agents at every layer</h2>

  <div class="highlight">
    <p><strong>Five Agents. Every Workflow Covered.</strong> Every maintenance cycle, procurement inquiry, incident alert, compliance report, and fleet conversation is governed by a purpose-built agent. Humans stay in command — the platform does the preparation.</p>
  </div>

  <div class="agent-card">
    <h3>Predictive Maintenance Agent — runs every 15 minutes</h3>
    <p>Censoring-aware survival analysis runs continuously against every equipment installation using maintenance history, Equipment DNA operational embeddings, and cross-fleet federated priors. Outputs calibrated P05/P50/P95 Remaining Useful Life bands. Detects divergence from OEM baseline and proposes schedule interval adjustments bounded by criticality class (SOLAS-critical and important equipment have separate limits). Complements historical predictions with live streaming anomaly detection and third-party sensor feeds.</p>
    <p><strong>Human gate:</strong> All schedule and task mutations require role-gated approval — the agent never modifies operational records directly.</p>
  </div>

  <div class="agent-card">
    <h3>Procurement Intelligence Agent — auto-triggers on reorder</h3>
    <p>When inventory drops below the reorder threshold (computed from consumption history), the agent assembles a structured inquiry, dispatches it to all approved suppliers, parses inbound responses via AI to extract line items and prices, benchmarks offers against historical pricing data, and ranks them by price delta, lead time vs. RUL urgency, and supplier reliability. The ML-Procurement Bridge also triggers a pre-check automatically when a RUL estimate falls below twice the average supplier lead time for critical parts.</p>
    <p><strong>Human gate:</strong> Award decision is always manual. Initial inquiry drafts require procurement role review before dispatch.</p>
  </div>

  <div class="agent-card">
    <h3>Incident Intelligence Agent — Confidence Score ≥ 80%</h3>
    <p>At Tier 2 confidence, the agent proposes a predictive incident 200–800 hours before the failure window — bundled with a corrective maintenance task template as an atomic unit. Severity is mapped from RUL percentage (critical / high / medium / low). On root cause completion, cascades into a new preventive schedule proposal. Escalates to secondary approver if unresolved within the expiry window.</p>
    <p><strong>Human gate:</strong> Incident creation and corrective task assignment require operations role approval — predictive events are proposals, not automatic record mutations.</p>
  </div>

  <div class="agent-card">
    <h3>Compliance Reporting Agent — three ML report templates</h3>
    <p>Three report templates are pre-populated automatically: weekly RUL summary (Monday 08:00 UTC) aggregating predictions across the fleet; anomaly alert report triggered by confidence threshold breach; and interval adjustment recommendation with full audit chain and regulatory justification. All are created as AI-draft artifacts. Promotion to submitted status requires explicit human action — never automated.</p>
    <p><strong>Human gate:</strong> Draft promotion is always manual — the machine prepares, the human submits.</p>
  </div>

  <div class="agent-card">
    <h3>Conversational Fleet Intelligence Agent — 30+ maritime domain handlers</h3>
    <p>Ask any fleet question in plain language: overdue tasks, inventory levels, RUL forecasts, procurement status, compliance certificates, crew records, fleet KPIs, and financial cost breakdowns. Multi-session memory maintains vessel context across conversations. Intent routing across 30+ domain-specific handlers. The conversational agent reads across all modules and surfaces the answer — no switching between screens.</p>
    <p><strong>Human gate:</strong> Read-only by default. Any write actions (task creation, approvals, record mutations) follow the same Confidence Score HITL model as the four operational agents.</p>
  </div>

  <p>→ <a href="/ai">Full AI Intelligence documentation</a></p>

  <h2>Three-layer ML Predictive Intelligence Stack</h2>

  <p>The predictive maintenance agent draws from three data layers fused into a single confidence-weighted composite RUL:</p>
  <ul>
    <li><strong>Layer 1 — Historical Prediction Engine:</strong> Censoring-aware survival analysis trained on right-censored maintenance records. Equipment DNA operational context embedding per installation. Confidence-gated model progression adapts complexity to available data. Federated cross-fleet learning aggregates anonymized survival patterns across organizations.</li>
    <li><strong>Layer 2 — Live Equipment Data Stream:</strong> Complementary streaming anomaly detectors running in parallel — catching point anomalies, sustained mean shifts, and gradual drift independently. All sensor channels fused into a 0–1 composite health index with AI-classified dominant failure mode. Confidence-weighted fusion with historical predictions progressively favors the live signal as it accumulates confidence.</li>
    <li><strong>Layer 3 — Third-Party Sensor Integration:</strong> Shaft vibration monitors, IR thermal cameras, and combustion gas analyzers enter through a proprietary normalization layer that maps heterogeneous manufacturer protocols into a unified sensor event schema. Physics-based safety overrides enforce hard boundaries regardless of model confidence.</li>
  </ul>

  <h2>Closed-loop procurement automation</h2>

  <p>The entire procurement cycle runs automatically across six phases with one human gate — the award decision:</p>
  <ol>
    <li><strong>Reorder Trigger (Automated)</strong> — inventory drops below threshold computed from consumption history</li>
    <li><strong>Draft Inquiry (Automated)</strong> — parts list assembled with quantities, vessel spec, and RUL-derived urgency</li>
    <li><strong>Outbound Dispatch (Automated)</strong> — structured inquiry dispatched to all approved suppliers</li>
    <li><strong>Offer Parsing (Automated)</strong> — inbound responses parsed by AI to extract prices, quantities, and lead times</li>
    <li><strong>Price Benchmark (Automated)</strong> — offers ranked by price delta, lead time vs. RUL urgency, supplier reliability</li>
    <li><strong>Award Decision (Human Gate)</strong> — buyer receives context-complete ranked recommendation and makes the final call</li>
  </ol>

  <h2>OEM PMS intelligence from 100+ manufacturers</h2>

  <p>fleetcore centralizes maintenance intelligence from over 100 maritime equipment manufacturers into a single vendor-neutral source of truth. Equipment naming is automatically normalized across vessels — "CAT", "Caterpillar", and "Cat Engine" resolve to the same entity. One-click PMS import pre-loads manufacturer-verified maintenance schedules. Vessel onboarding from days or weeks to hours.</p>

  <p><strong>Supported manufacturers include:</strong> MAN B&W (6S50MC-C, 6L70ME-C, 5G80ME-C), Wärtsilä (32, W20, W26, 20DF), Caterpillar (3516B, C32, 3406), Kongsberg (K-Chief, AutoChief C20), ABB (Azipod, turbochargers), Rolls-Royce, Alfa Laval, Wartsila (heat exchangers), and 90+ additional manufacturers across main engines, auxiliary systems, deck equipment, safety systems, and HVAC.</p>

  <h2>Schedule-specific independent hours tracking (industry first)</h2>

  <p>Traditional PMS systems use one hours counter per equipment installation. Resetting the counter for an oil change accidentally resets all other schedules for that equipment — including the major overhaul counter. fleetcore introduced schedule-specific independent counters: each maintenance schedule tracks its own hours. Reset the oil change counter; the overhaul counter continues unaffected. This eliminates the leading cause of missed maintenance events in multi-schedule equipment and is an industry-first design in the maritime PMS space.</p>

  <h2>SOLAS 2024, MARPOL, and ISM Code compliance</h2>

  <p>Regulatory compliance is built into the core architecture — not a separate module. Maintenance tasks are automatically linked to regulatory requirements. Compliance audit trail and documentation management are structured around ISM Code and class society survey requirements for DNV, Lloyd's Register, Bureau Veritas, ABS, ClassNK, and RINA.</p>
  <ul>
    <li><strong>SOLAS 2024:</strong> Fire protection, detection, extinction (Chapter II-2); life-saving appliances (Chapter III)</li>
    <li><strong>MARPOL Annex VI:</strong> Air pollution, sulfur limits in ECAs, carbon intensity requirements</li>
    <li><strong>ISM Code Regulation 10.3:</strong> Maintenance of ship and equipment, documented procedures</li>
    <li><strong>Certificate management:</strong> Automatic expiry tracking and renewal alerts across all class, flag, and statutory certificates</li>
    <li><strong>Port State Control readiness:</strong> Real-time compliance percentage dashboard and inspection preparation tools</li>
  </ul>

  <h2>Three-tier HITL governance model</h2>

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
      <td>Schedule adjustment proposal, draft maintenance task, alert, email notification</td>
      <td>72 hours</td>
    </tr>
    <tr>
      <td><strong>Tier 2 — Accelerated</strong></td>
      <td>≥ 80%</td>
      <td>All Tier 1 + predictive event, procurement pre-check, draft compliance report</td>
      <td>24h (12h safety-critical)</td>
    </tr>
  </table>

  <h2>The maritime maintenance crisis fleetcore addresses</h2>

  <ul>
    <li><strong>$17B+ annually</strong> — global maritime maintenance overrun costs from unplanned breakdowns, delayed schedules, and emergency repairs (Ship Universe 2025)</li>
    <li><strong>$25,000–$50,000 per day</strong> — PSC detention costs from maintenance failures; regulatory violations, port delays, reputational damage</li>
    <li><strong>$8,000–$15,000 more per incident</strong> — reactive vs. planned maintenance premium (Lloyd's List, 2024)</li>
    <li><strong>Right-censoring bias:</strong> Competitor PMS platforms discard right-censored maintenance observations, producing biased RUL estimates off by 30–50%. fleetcore uses censoring-aware survival analysis.</li>
    <li><strong>Governance vacuum:</strong> Maritime AI exists in two failure modes — chatbots with no operational impact, or autonomous systems that violate ISM §10. fleetcore implements the governed middle ground.</li>
    <li><strong>Disconnected prediction and procurement:</strong> No competing platform connects the RUL forecast to the procurement cycle. fleetcore closes this loop automatically.</li>
  </ul>

  <h2>fleetcore vs. AMOS, SERTICA, DNV Nauticus</h2>

  <table>
    <tr>
      <th>Dimension</th>
      <th>AMOS / SERTICA / DNV Nauticus</th>
      <th>fleetcore</th>
    </tr>
    <tr>
      <td><strong>Architecture</strong></td>
      <td>Desktop-first, Windows-installed, VPN required; batch sync</td>
      <td>Cloud-native; real-time synchronization under 200ms</td>
    </tr>
    <tr>
      <td><strong>AI agents</strong></td>
      <td>None or basic rule-based alerts</td>
      <td>Four autonomous agents across all core workflows</td>
    </tr>
    <tr>
      <td><strong>Predictive ML</strong></td>
      <td>Threshold alerts; censored data discarded</td>
      <td>Three-layer censoring-aware ML stack: P05/P50/P95 calibrated RUL</td>
    </tr>
    <tr>
      <td><strong>Procurement</strong></td>
      <td>Manual inquiries; no AI involvement</td>
      <td>Closed-loop: trigger → draft → dispatch → parse → benchmark → award</td>
    </tr>
    <tr>
      <td><strong>OEM intelligence</strong></td>
      <td>Manual entry per vessel; no cross-manufacturer normalization</td>
      <td>Pre-loaded PMS from 100+ OEMs; automatic manufacturer normalization</td>
    </tr>
    <tr>
      <td><strong>Hours tracking</strong></td>
      <td>Single counter per equipment — resets all schedules</td>
      <td>Schedule-specific independent counters (industry first)</td>
    </tr>
    <tr>
      <td><strong>Governance</strong></td>
      <td>Binary: manual or autonomous (ISM §10 risk)</td>
      <td>Three-tier Confidence Score gated HITL — always a human gate</td>
    </tr>
    <tr>
      <td><strong>Compliance</strong></td>
      <td>Separate module; manual documentation</td>
      <td>SOLAS / MARPOL / ISM embedded in core architecture</td>
    </tr>
    <tr>
      <td><strong>Implementation</strong></td>
      <td>3–6 months enterprise deployment</td>
      <td>Vessel onboarding in hours with pre-loaded OEM intelligence</td>
    </tr>
  </table>

  <h2>Target operators and vessel types</h2>

  <p><strong>Operator types:</strong> Ship management companies (fleet-wide standardization, multi-owner support), vessel operators (real-time technical superintendents, chief engineers), ship owners (asset value protection, regulatory assurance), offshore energy operators (FPSO, OSV, AHTS fleet management).</p>

  <p><strong>Vessel types supported:</strong> VLCC and Aframax tankers, bulk carriers (Handysize through Capesize), container ships, LNG carriers, AHTS and PSV offshore support vessels, FPSO units, cruise ships, RoPax ferries, naval patrol vessels, superyachts, and all IMO-classified vessel types.</p>

  <h2>Ten comprehensive capabilities</h2>

  <ol>
    <li><strong>OEM PMS Integration &amp; Auto-Scheduling</strong> — Import manufacturer PMS recommendations and automatically generate vessel-specific maintenance schedules based on working hours and time intervals. Dual-threshold early warning. Always-recurring schedules. 94% automated task generation.</li>
    <li><strong>Event-Based Unplanned Maintenance</strong> — Digital transformation of paper-based breakdown reporting. Real-time event capture, automatic workflow routing, root cause analysis, seamless PMS integration. 100% digital event tracking.</li>
    <li><strong>Equipment Lifecycle Management</strong> — Complete tracking from installation to decommissioning. Hierarchical system organization, working hours monitoring, health assessments, manufacturer documentation integration. 500+ equipment items per vessel.</li>
    <li><strong>Intelligent Spare Parts Management</strong> — Automated stock level monitoring, critical parts flagging, consumption tracking, predictive ordering based on maintenance schedules and usage patterns. 91% stock optimization.</li>
    <li><strong>SOLAS 2024 Compliance Management</strong> — Automated regulatory compliance tracking for SOLAS 2024, MARPOL, and ISM Code built into maintenance workflows. Certificate management, Port State Control readiness. 100% regulatory compliance.</li>
    <li><strong>Multi-Tenant Fleet Intelligence</strong> — Enterprise-grade multi-organization architecture with STCW-compliant role management, cross-vessel learning, centralized fleet performance analytics. 500+ vessels supported.</li>
    <li><strong>Digital Documentation &amp; Reporting</strong> — Paperless operations: digital work done records, photo documentation, PDF generation, automated compliance reports, comprehensive audit trails. 100% paperless operations.</li>
    <li><strong>Advanced Analytics &amp; Intelligence</strong> — Equipment health scoring, performance trend analysis, cost optimization insights, failure pattern recognition, fleet-wide KPI dashboards. 87% prediction accuracy.</li>
    <li><strong>Predictive Maintenance Intelligence</strong> — Three-layer ML system: censoring-aware survival analysis, live operational data streams, third-party sensor feeds. P05/P50/P95 RUL confidence bands. Equipment DNA embeddings. Cross-fleet federated learning. Physics-based safety overrides. 95% RUL forecast accuracy.</li>
    <li><strong>Closed-Loop Procurement Automation</strong> — Inventory threshold breach triggers the full cycle automatically: AI-drafted inquiry → supplier dispatch → offer parsing → price benchmarking → ranked recommendation. Human gate at award. Under 1 hour trigger-to-ranked-offer.</li>
  </ol>

  <h2>Frequently asked questions</h2>

  <h3>What is fleetcore?</h3>
  <p>fleetcore is a maritime technical operating system where AI is embedded across every operational workflow. Five autonomous agents handle predictive maintenance, procurement automation, incident intelligence, compliance reporting, and fleet conversation. Ten comprehensive capabilities span OEM PMS integration, equipment lifecycle, intelligent parts management, SOLAS compliance, and more — all governed by a three-tier HITL model.</p>

  <h3>What are the five AI agents in fleetcore?</h3>
  <p>1) Predictive Maintenance Agent — runs every 15 min, produces P05/P50/P95 RUL forecasts from a three-layer ML stack. 2) Procurement Intelligence Agent — closes the loop from inventory reorder trigger to ranked supplier recommendation automatically. 3) Incident Intelligence Agent — proposes predictive events 200–800 hours before failure, gated at 80% Confidence Score. 4) Compliance Reporting Agent — pre-populates three ML report templates as AI-draft artifacts. 5) Conversational Fleet Intelligence Agent — 30+ maritime-domain handlers covering tasks, inventory, RUL, compliance, financials, and fleet KPIs.</p>

  <h3>How does fleetcore's predictive maintenance differ from AMOS or ABS NS?</h3>
  <p>Three fundamental differences: (1) Censoring correctness — AMOS and ABS NS discard right-censored maintenance observations, producing biased RUL estimates off by 30–50%. fleetcore uses censoring-aware survival analysis that treats partial observations as informative data. (2) Equipment DNA — fleetcore embeds operational context per installation (trade route, climate zone, load factor, operator behavior). The same engine on a Red Sea tanker and a North Atlantic bulk carrier gets different survival priors. (3) Three-layer fusion — historical predictions, live streaming anomaly signals, and third-party sensor feeds combined into a confidence-weighted composite RUL.</p>

  <h3>What is schedule-specific hours tracking?</h3>
  <p>Each maintenance schedule tracks its own independent hours counter. Resetting the oil change counter (250h) does not affect the overhaul counter (8,000h). Traditional systems use one counter per equipment — resetting one schedule resets all. This is an industry-first design that eliminates the leading cause of missed maintenance events in multi-schedule equipment.</p>

  <h3>How does the closed-loop procurement automation work?</h3>
  <p>Inventory threshold breach → AI drafts inquiry → dispatched to approved suppliers → inbound responses parsed by AI → offers benchmarked and ranked → buyer receives recommendation → buyer makes the award. The only human gate is the award decision. The ML-Procurement Bridge also fires a pre-check automatically when RUL falls below twice the average supplier lead time for critical parts.</p>

  <h3>What is the three-tier HITL governance model?</h3>
  <p>Every AI-driven action is gated by a Confidence Score (0–100). Tier 0 (below 50%): advisory alerts only, no write actions. Tier 1 (50–80%): schedule adjustment proposals, draft tasks, require role-gated approval within 72 hours. Tier 2 (80%+): accelerated critical path — all Tier 1 plus predictive event, procurement pre-check, draft compliance report — 24-hour window (12h for safety-critical equipment). The platform never writes directly to operational records without explicit human approval.</p>

  <h3>Which vessel types and classification societies does fleetcore support?</h3>
  <p>All major IMO-classified vessel types. Compliance audit trail and documentation are structured for DNV, Lloyd's Register, Bureau Veritas, ABS, ClassNK, and RINA class society survey requirements.</p>

  <h3>How long does vessel onboarding take?</h3>
  <p>A single vessel can be onboarded in hours rather than weeks. Pre-loaded OEM intelligence from 100+ manufacturers provides manufacturer-verified maintenance schedules. Operators import existing PMS via CSV or connect directly; the system auto-generates vessel-specific schedules.</p>

  ${blogContentFunnelSection()}

  <h2>Navigate fleetcore</h2>
  <nav>
    <ul>
      ${blogNavListItem()}
      <li><a href="/ai">AI Intelligence — five autonomous agents, ML predictive stack, closed-loop procurement, conversational fleet intelligence</a></li>
      <li><a href="/platform">Platform architecture — how fleetcore's agentic maintenance OS works</a></li>
      <li><a href="/solutions">Solutions — maritime maintenance use cases, schedule-specific hours, compliance, predictive maintenance</a></li>
      <li><a href="/about">About fleetcore — ADGM-registered maritime technology company, Abu Dhabi UAE</a></li>
      <li><a href="/contact">Schedule a demo — enterprise pricing and fleet implementation</a></li>
    </ul>
  </nav>

  <p><strong>Schedule a demo:</strong> <a href="https://calendly.com/hello-fleetcore/30min">https://calendly.com/hello-fleetcore/30min</a></p>
  <p><strong>Contact:</strong> <a href="https://fleetcore.ai/contact">https://fleetcore.ai/contact</a></p>

</body>
</html>
`;
}
