/**
 * Bot-optimized content for Platform page (/platform)
 */

export const platformContent = {
  title: 'FleetCore Platform: Enterprise Maritime Maintenance Architecture',
  description: 'Modern cloud-native platform with PostgreSQL + Supabase, 99.9% uptime SLA, dual-interval scheduling, automated PMS generation, and military-grade security. Built for maritime excellence.',
  
  content: `
    <h1>Enterprise Platform Architecture</h1>
    <strong>Modern Cloud-Native Infrastructure Built for Maritime Excellence</strong>
    
    <h2>🏗️ Three Pillars of Platform Excellence</h2>
    
    <h3>1. Enterprise-Grade Architecture</h3>
    <p><strong>Built on PostgreSQL + Supabase with 99.9% Uptime SLA</strong></p>
    <ul>
      <li><strong>Multi-Tenant with Row-Level Security (RLS):</strong> Complete data isolation between organizations</li>
      <li><strong>Real-Time Synchronization:</strong> Instant data updates across entire fleet</li>
      <li><strong>Automated Backup & Disaster Recovery:</strong> Point-in-time recovery, geo-redundant storage</li>
      <li><strong>Horizontal Scaling:</strong> Support for unlimited vessels without performance degradation</li>
      <li><strong>Cloud-Native Design:</strong> Auto-scaling, load balancing, distributed architecture</li>
    </ul>
    
    <h3>2. Intelligent Automation Engine</h3>
    <p><strong>90%+ Task Auto-Generation with AI-Powered Scheduling</strong></p>
    <ul>
      <li><strong>Dual-Interval Tracking:</strong> Both running hours AND calendar intervals monitored simultaneously</li>
      <li><strong>Automated PMS Import:</strong> One-click import from MAN, Wärtsilä, Caterpillar, Rolls-Royce</li>
      <li><strong>Crew Workload Optimization:</strong> Intelligent task distribution based on skills and availability</li>
      <li><strong>Port Stay Coordination:</strong> Maintenance scheduling aligned with vessel operations</li>
      <li><strong>Early Warning Systems:</strong> Dual-threshold alerts prevent missed maintenance</li>
    </ul>
    
    <h3>3. Maritime-Specific Design</h3>
    <p><strong>Purpose-Built for Maritime Operations with Built-In Compliance</strong></p>
    <ul>
      <li><strong>SOLAS 2024 Compliance Tracking:</strong> Safety equipment, inspections, surveys</li>
      <li><strong>STCW Role Hierarchy:</strong> Maritime-specific user permissions and access control</li>
      <li><strong>ISM Code Documentation:</strong> Automated audit trails and compliance reports</li>
      <li><strong>Class Society Requirements:</strong> DNV, Lloyd's Register, ABS, Bureau Veritas</li>
      <li><strong>Certificate Management:</strong> Automated renewal alerts and expiry tracking</li>
    </ul>

    <h2>🎯 Technical Differentiators vs Traditional CMMS</h2>
    
    <h3>Data Architecture Advantages</h3>
    <table>
      <tr>
        <th>Feature</th>
        <th>Traditional CMMS</th>
        <th>FleetCore Platform</th>
        <th>Impact</th>
      </tr>
      <tr>
        <td>Technology Stack</td>
        <td>1990s legacy databases</td>
        <td>Modern PostgreSQL + Supabase</td>
        <td>10x faster performance, 99.9% uptime</td>
      </tr>
      <tr>
        <td>Interval Tracking</td>
        <td>Calendar-only (every 3 months)</td>
        <td>Dual-interval (hours + calendar)</td>
        <td>Accurate timing, no over/under servicing</td>
      </tr>
      <tr>
        <td>Task Generation</td>
        <td>100% manual creation</td>
        <td>90%+ automated from OEM data</td>
        <td>Hours saved daily, zero setup time</td>
      </tr>
      <tr>
        <td>Fleet Integration</td>
        <td>Isolated vessel databases</td>
        <td>Unified fleet-wide database</td>
        <td>Cross-fleet analytics, shared knowledge</td>
      </tr>
      <tr>
        <td>Compliance</td>
        <td>Manual tracking or add-on module</td>
        <td>Built-in SOLAS/MARPOL/ISM</td>
        <td>100% compliance visibility, automated alerts</td>
      </tr>
      <tr>
        <td>Security</td>
        <td>Basic authentication</td>
        <td>Row-level security, multi-tenant</td>
        <td>Military-grade, full data isolation</td>
      </tr>
    </table>

    <h2>📦 Six Integrated Platform Modules</h2>
    
    <h3>1. PMS Core Module</h3>
    <p><strong>Foundation for All Maintenance Operations</strong></p>
    <ul>
      <li>Dual-interval task tracking (hours + calendar)</li>
      <li>Automated task generation from OEM schedules</li>
      <li>Schedule optimization algorithms</li>
      <li>Completion tracking with digital work records</li>
      <li>Overdue alerts with escalation workflows</li>
      <li>Always-recurring maintenance automation</li>
    </ul>
    
    <h3>2. Equipment Registry Module</h3>
    <p><strong>Centralized Equipment Database with Lifecycle Management</strong></p>
    <ul>
      <li>Equipment definitions shared across fleet</li>
      <li>Installation tracking with commissioning records</li>
      <li>Running hours monitoring per equipment</li>
      <li>Health scoring (0-100 scale) based on maintenance</li>
      <li>Manufacturer data integration (specs, manuals, drawings)</li>
      <li>Hierarchical organization (vessel → system → equipment)</li>
    </ul>
    
    <h3>3. Parts & Procurement Module</h3>
    <p><strong>Smart Inventory Management with Automated Ordering</strong></p>
    <ul>
      <li>Parts inventory tracking with stock levels</li>
      <li>Critical spares management for regulatory compliance</li>
      <li>Automated reorder point calculations</li>
      <li>Procurement alerts based on consumption patterns</li>
      <li>Usage analytics linked to maintenance tasks</li>
      <li>Supplier integration for streamlined ordering</li>
    </ul>
    
    <h3>4. Compliance Manager Module</h3>
    <p><strong>Regulatory Tracking and Certificate Management</strong></p>
    <ul>
      <li>SOLAS/MARPOL requirement tracking</li>
      <li>Certificate management with renewal alerts</li>
      <li>Survey scheduling (annual, intermediate, special)</li>
      <li>Audit trail automation for inspections</li>
      <li>Regulatory reporting (PSC, flag state, class society)</li>
      <li>Safety equipment inspection workflows</li>
    </ul>
    
    <h3>5. Analytics & Reporting Module</h3>
    <p><strong>Real-Time KPIs and Fleet-Wide Performance Insights</strong></p>
    <ul>
      <li>Maintenance completion rates by vessel/fleet</li>
      <li>Equipment health scores with trend analysis</li>
      <li>Cost tracking (labor, parts, downtime)</li>
      <li>Fleet benchmarking and performance comparison</li>
      <li>Custom dashboards for stakeholders</li>
      <li>Predictive analytics for failure prevention</li>
    </ul>
    
    <h3>6. User Management Module</h3>
    <p><strong>STCW-Compliant Role Hierarchy with Granular Permissions</strong></p>
    <ul>
      <li>Maritime role templates (Master, Chief Engineer, 2nd Engineer, etc.)</li>
      <li>Custom permissions per organization</li>
      <li>Multi-vessel assignments for shore-based staff</li>
      <li>Audit logging for all user actions</li>
      <li>SSO integration for enterprise authentication</li>
      <li>Mobile access control for onboard crew</li>
    </ul>

    <h2>🔗 Enterprise Integration Capabilities</h2>
    
    <h3>Equipment Manufacturers</h3>
    <p>Direct OEM PMS integration with:</p>
    <ul>
      <li>MAN Energy Solutions (engines, propulsion)</li>
      <li>Wärtsilä (engines, power generation, propulsion)</li>
      <li>Caterpillar (generators, engines)</li>
      <li>Rolls-Royce (propulsion, stabilizers, thrusters)</li>
      <li>ABB (automation, power systems)</li>
    </ul>
    
    <h3>ERP & Procurement Systems</h3>
    <p>Financial and procurement integration:</p>
    <ul>
      <li>SAP (ERP, financial management)</li>
      <li>Oracle NetSuite (cloud ERP)</li>
      <li>Microsoft Dynamics 365 (business applications)</li>
      <li>Odoo (open-source ERP)</li>
    </ul>
    
    <h3>Document Management Systems</h3>
    <p>Technical library integration:</p>
    <ul>
      <li>Microsoft SharePoint (document collaboration)</li>
      <li>Dropbox Business (file storage)</li>
      <li>Google Workspace (cloud storage)</li>
      <li>DocuWare (document management)</li>
    </ul>
    
    <h3>Class Societies & Compliance</h3>
    <p>Digital certification and inspection:</p>
    <ul>
      <li>DNV (Det Norske Veritas)</li>
      <li>Lloyd's Register</li>
      <li>American Bureau of Shipping (ABS)</li>
      <li>Bureau Veritas</li>
    </ul>

    <h2>🔐 Security & Compliance Features</h2>
    
    <h3>Enterprise Security</h3>
    <ul>
      <li><strong>Row-Level Security (RLS):</strong> Database-enforced access control</li>
      <li><strong>Multi-Tenant Isolation:</strong> Complete data separation between organizations</li>
      <li><strong>Encryption:</strong> At-rest and in-transit data encryption</li>
      <li><strong>Audit Logging:</strong> Complete trail of all system actions</li>
      <li><strong>SSO Integration:</strong> SAML, OAuth, Active Directory support</li>
      <li><strong>GDPR Compliance:</strong> Data privacy and user rights management</li>
    </ul>
    
    <h3>Maritime Compliance</h3>
    <ul>
      <li>SOLAS 2024 (Safety of Life at Sea)</li>
      <li>MARPOL (Marine Pollution Prevention)</li>
      <li>ISM Code (International Safety Management)</li>
      <li>MLC 2006 (Maritime Labour Convention)</li>
      <li>EEXI & CII (Energy Efficiency Regulations)</li>
    </ul>

    <h2>📈 Platform Performance Metrics</h2>
    <ul>
      <li><strong>99.9% Uptime SLA:</strong> Enterprise reliability with geo-redundancy</li>
      <li><strong>90%+ Automation Rate:</strong> Tasks auto-generated from OEM data</li>
      <li><strong>100% Compliance Tracking:</strong> SOLAS/MARPOL/ISM built-in</li>
      <li><strong>24/7 Support:</strong> Maritime domain experts available globally</li>
      <li><strong>500+ Vessels:</strong> Proven scalability for enterprise fleets</li>
      <li><strong>10x Performance:</strong> Modern architecture vs legacy CMMS</li>
    </ul>

    <h2>🚀 Implementation Timeline</h2>
    <h3>Week 1-2: Foundation</h3>
    <ul>
      <li>Organization setup and user provisioning</li>
      <li>Vessel onboarding and equipment cataloging</li>
      <li>OEM PMS schedule import and validation</li>
    </ul>
    
    <h3>Week 2-3: Integration</h3>
    <ul>
      <li>ERP and procurement system connectivity</li>
      <li>Document management integration</li>
      <li>Data migration from legacy systems</li>
    </ul>
    
    <h3>Week 3-4: Go-Live</h3>
    <ul>
      <li>User training (shore and vessel staff)</li>
      <li>Workflow activation and automation</li>
      <li>Continuous support and optimization</li>
    </ul>

    <h2>💼 Enterprise Pricing & Support</h2>
    <ul>
      <li><strong>Pricing Model:</strong> Per-vessel subscription with volume discounts</li>
      <li><strong>Implementation:</strong> Included with annual contracts</li>
      <li><strong>Training:</strong> Comprehensive onboard and shore-based programs</li>
      <li><strong>Support:</strong> 24/7 technical support with maritime experts</li>
      <li><strong>Updates:</strong> Continuous platform improvements and new features</li>
    </ul>

    <p><strong>Schedule a Platform Demo:</strong> https://calendly.com/fleetcore-ai/30min</p>
  `
};

