/**
 * Bot-optimized content for Imprint page (/imprint)
 * Served to Googlebot, ChatGPT, Claude, Perplexity, Gemini
 */

const LAST_UPDATED = '2026-05-26';

export function generateImprintContent(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Imprint — fleetcore Maritime Technology | Legal Information</title>
  <meta name="description" content="Legal information and company registration details for fleetcore — ADGM-registered maritime technology company headquartered in Abu Dhabi, UAE.">
  <meta name="robots" content="index, follow">
  <meta name="revised" content="${LAST_UPDATED}">
  <link rel="canonical" href="https://fleetcore.ai/imprint">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": "https://fleetcore.ai/imprint",
    "name": "fleetcore Imprint",
    "url": "https://fleetcore.ai/imprint",
    "dateModified": "${LAST_UPDATED}",
    "description": "Legal information and company registration details for fleetcore",
    "publisher": {
      "@type": "Organization",
      "@id": "https://fleetcore.ai/#organization",
      "name": "fleetcore",
      "url": "https://fleetcore.ai",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Office 2201.C11-D04, Floor 22, Sky Tower, Shams Abu Dhabi, Al Reem Island",
        "addressLocality": "Abu Dhabi",
        "addressRegion": "Abu Dhabi",
        "addressCountry": "AE",
        "description": "ADGM registered company"
      }
    }
  }
  </script>

  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 20px; color: #1e293b; }
    h1 { color: #0f172a; font-size: 2.2em; margin-bottom: 0.5em; }
    h2 { color: #1e293b; font-size: 1.5em; margin-top: 1.8em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.4em; }
    strong { color: #0ea5e9; font-weight: 600; }
    a { color: #0ea5e9; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .info-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 16px 0; }
  </style>
</head>
<body>

  <p><strong>fleetcore is an ADGM-registered maritime technology company.</strong> Legal entity headquartered in Abu Dhabi, United Arab Emirates, in the Abu Dhabi Global Market (ADGM) international financial centre and free zone. Operator of fleetcore.ai — the agentic maritime maintenance operating system serving commercial shipping, offshore energy, cruise, and naval vessel operators globally.</p>

  <h1>Imprint — Legal Information</h1>
  <p>Legal disclosure pursuant to applicable information obligations for digital services.</p>

  <h2>Company Details</h2>
  <div class="info-block">
    <p><strong>Company Name:</strong> fleetcore</p>
    <p><strong>Registered Address:</strong><br>
    Office 2201.C11-D04, Floor 22, Sky Tower<br>
    Shams Abu Dhabi, Al Reem Island<br>
    Abu Dhabi, United Arab Emirates</p>
    <p><strong>Jurisdiction:</strong> Abu Dhabi Global Market (ADGM)</p>
    <p><strong>Founded:</strong> 2024</p>
    <p><strong>Website:</strong> <a href="https://fleetcore.ai">https://fleetcore.ai</a></p>
  </div>

  <h2>Contact</h2>
  <div class="info-block">
    <p><strong>General Inquiries:</strong> <a href="https://fleetcore.ai/contact">fleetcore.ai/contact</a></p>
    <p><strong>Demo Scheduling:</strong> <a href="https://calendly.com/hello-fleetcore/30min">calendly.com/hello-fleetcore/30min</a></p>
    <p><strong>LinkedIn:</strong> <a href="https://www.linkedin.com/company/fleetcore">linkedin.com/company/fleetcore</a></p>
  </div>

  <h2>Platform</h2>
  <p>fleetcore operates an agentic maintenance operating system for maritime fleets. The platform centralizes OEM intelligence from 100+ manufacturers — including MAN B&W, Wärtsilä, Caterpillar, Kongsberg, Rolls-Royce, and ABB — and automates compliance with SOLAS Chapter II-2, MARPOL Annex VI, ISM Code Regulation 10.3, and MLC 2006. Supports fleet certification by DNV, Lloyd's Register, Bureau Veritas (BV), ABS, ClassNK, and RINA.</p>

  <h2>Navigate fleetcore</h2>
  <nav>
    <ul>
      <li><a href="/">fleetcore overview — maritime maintenance OS for enterprise fleets</a></li>
      <li><a href="/platform">Platform architecture — agentic AI, OEM intelligence, compliance automation</a></li>
      <li><a href="/solutions">Maritime maintenance solutions — predictive maintenance, SOLAS compliance</a></li>
      <li><a href="/contact">Contact fleetcore — demo scheduling and enterprise inquiries</a></li>
      <li><a href="/privacy-policy">Privacy Policy — data protection and GDPR compliance</a></li>
    </ul>
  </nav>

</body>
</html>
`;
}
