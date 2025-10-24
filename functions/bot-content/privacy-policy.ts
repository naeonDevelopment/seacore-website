/**
 * Bot-optimized content for Privacy Policy page (/privacy-policy)
 * Served to Googlebot, ChatGPT, Claude, Perplexity, Gemini
 */

const LAST_UPDATED = '2025-10-24';

export function generatePrivacyPolicyContent(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FleetCore Privacy Policy - Data Protection & GDPR Compliance</title>
  <meta name="description" content="FleetCore privacy policy: GDPR compliant, organization-based data isolation, Row-Level Security, data encryption, and comprehensive audit trails.">
  <meta name="robots" content="index, follow">
  <meta name="revised" content="${LAST_UPDATED}">
  <link rel="canonical" href="https://fleetcore.ai/privacy-policy">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 1200px; margin: 0 auto; padding: 20px; color: #1e293b; }
    h1 { color: #0f172a; font-size: 2.5em; margin-bottom: 0.5em; }
    h2 { color: #1e293b; font-size: 1.8em; margin-top: 1.8em; border-bottom: 3px solid #e2e8f0; padding-bottom: 0.4em; }
    h3 { color: #334155; font-size: 1.4em; margin-top: 1.4em; }
    strong { color: #0ea5e9; font-weight: 600; }
    ul { margin: 1em 0; padding-left: 2em; }
    li { margin: 0.6em 0; }
  </style>
</head>
<body>

  <h1>Privacy Policy</h1>
  <p><strong>Last Updated:</strong> ${LAST_UPDATED}</p>
  <p><strong>Effective Date:</strong> Q1 2026 Production Launch</p>

  <h2>1. Introduction</h2>
  <p>FleetCore ("we", "our", "us") is committed to protecting the privacy and security of your personal and operational data. This Privacy Policy explains how we collect, use, store, and protect data when you use the FleetCore Maritime Navigator platform.</p>

  <h2>2. Data We Collect</h2>
  
  <h3>2.1 Account Information</h3>
  <ul>
    <li>Name, email address, job title</li>
    <li>Organization affiliation</li>
    <li>User role and permissions</li>
    <li>Authentication credentials (securely hashed)</li>
  </ul>
  
  <h3>2.2 Operational Data</h3>
  <ul>
    <li>Vessel information (IMO number, vessel type, operational status)</li>
    <li>Equipment installations and specifications</li>
    <li>Maintenance schedules and task records</li>
    <li>Working hours tracking data</li>
    <li>Event and incident reports</li>
    <li>File attachments (photos, videos, documents)</li>
  </ul>
  
  <h3>2.3 Usage Data</h3>
  <ul>
    <li>Login timestamps and IP addresses</li>
    <li>Feature usage patterns</li>
    <li>System performance metrics</li>
    <li>Error logs and diagnostic data</li>
  </ul>

  <h2>3. How We Use Your Data</h2>
  
  <h3>3.1 Primary Purposes</h3>
  <ul>
    <li><strong>Platform Operation:</strong> Provide maritime maintenance management services</li>
    <li><strong>Compliance Tracking:</strong> Enable SOLAS/MARPOL/ISM Code compliance monitoring</li>
    <li><strong>Analytics:</strong> Generate equipment health scores and operational insights</li>
    <li><strong>Real-Time Monitoring:</strong> Deliver live equipment status updates</li>
  </ul>
  
  <h3>3.2 Security & Support</h3>
  <ul>
    <li>User authentication and authorization</li>
    <li>System security monitoring</li>
    <li>Technical support and troubleshooting</li>
    <li>Platform performance optimization</li>
  </ul>

  <h2>4. Data Security</h2>
  
  <h3>4.1 Technical Security Measures</h3>
  <ul>
    <li><strong>Row-Level Security (RLS):</strong> PostgreSQL RLS ensuring organization-based data isolation</li>
    <li><strong>Multi-Tenant Architecture:</strong> Complete data separation between organizations</li>
    <li><strong>Encryption:</strong> Data encrypted at rest and in transit (TLS/SSL)</li>
    <li><strong>Authentication:</strong> JWT-based secure authentication with Supabase Auth</li>
    <li><strong>Audit Trails:</strong> Complete activity logging with user attribution and timestamps</li>
  </ul>
  
  <h3>4.2 Access Control</h3>
  <ul>
    <li>Role-based access control (RBAC) with granular permissions</li>
    <li>Dual access pattern: System admins (global) + Organization users (isolated)</li>
    <li>Security definer functions preventing policy recursion</li>
    <li>Automatic session timeout and re-authentication requirements</li>
  </ul>

  <h2>5. Data Retention</h2>
  
  <h3>5.1 Operational Data</h3>
  <ul>
    <li><strong>Active Data:</strong> Retained for duration of organization subscription</li>
    <li><strong>Historical Records:</strong> Maintenance history retained for regulatory compliance (typically 5-10 years)</li>
    <li><strong>Audit Trails:</strong> Complete activity logs retained per organization data retention policy</li>
  </ul>
  
  <h3>5.2 Account Termination</h3>
  <ul>
    <li>30-day grace period for data export after account cancellation</li>
    <li>Complete data deletion upon request (Right to Erasure)</li>
    <li>Backup data purged according to backup retention schedule</li>
  </ul>

  <h2>6. Data Sharing & Third Parties</h2>
  
  <h3>6.1 No Data Selling</h3>
  <p><strong>We do not sell, rent, or trade your data to third parties under any circumstances.</strong></p>
  
  <h3>6.2 Service Providers</h3>
  <ul>
    <li><strong>Supabase (Database & Infrastructure):</strong> Secure cloud hosting and database services</li>
    <li><strong>Monitoring & Analytics:</strong> System performance and error tracking (anonymized)</li>
  </ul>
  
  <h3>6.3 Legal Requirements</h3>
  <p>We may disclose data when required by law, court order, or regulatory authority, but only to the extent legally required.</p>

  <h2>7. GDPR Compliance</h2>
  
  <h3>7.1 Your Rights Under GDPR</h3>
  <ul>
    <li><strong>Right to Access:</strong> Request copy of your personal and operational data</li>
    <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
    <li><strong>Right to Erasure:</strong> Request deletion of your data</li>
    <li><strong>Right to Data Portability:</strong> Export your data in standard formats (CSV, JSON)</li>
    <li><strong>Right to Restrict Processing:</strong> Limit how we process your data</li>
    <li><strong>Right to Object:</strong> Object to certain data processing activities</li>
  </ul>
  
  <h3>7.2 Data Protection Officer</h3>
  <p>For GDPR-related inquiries, contact our Data Protection Officer at: <a href="https://fleetcore.ai/contact">https://fleetcore.ai/contact</a></p>

  <h2>8. International Data Transfers</h2>
  <p>Data is stored on Supabase infrastructure with geographic redundancy. For EU/EEA users, data residency options are available to ensure GDPR compliance.</p>

  <h2>9. Cookies & Tracking</h2>
  
  <h3>9.1 Essential Cookies</h3>
  <ul>
    <li>Authentication tokens (required for login)</li>
    <li>Session management (required for platform operation)</li>
  </ul>
  
  <h3>9.2 Optional Cookies</h3>
  <ul>
    <li>Analytics cookies (with explicit consent)</li>
    <li>Performance monitoring (anonymized)</li>
  </ul>

  <h2>10. Children's Privacy</h2>
  <p>FleetCore is an enterprise maritime platform not intended for use by individuals under 18 years of age. We do not knowingly collect data from children.</p>

  <h2>11. Changes to This Policy</h2>
  <p>We may update this Privacy Policy periodically. Significant changes will be communicated via email to organization administrators. Continued use of the platform after changes constitutes acceptance of updated policy.</p>

  <h2>12. Contact Information</h2>
  <p><strong>Privacy Inquiries:</strong> <a href="https://fleetcore.ai/contact">https://fleetcore.ai/contact</a></p>
  <p><strong>Data Protection Officer:</strong> Available through contact form</p>
  <p><strong>General Support:</strong> <a href="https://fleetcore.ai">https://fleetcore.ai</a></p>

  <h2>13. Regulatory Compliance</h2>
  <ul>
    <li><strong>GDPR:</strong> General Data Protection Regulation (EU)</li>
    <li><strong>ISO 27001:</strong> Information Security Management (in progress)</li>
    <li><strong>SOC 2 Type II:</strong> Security, Availability, Processing Integrity (planned)</li>
  </ul>

</body>
</html>
`;
}
