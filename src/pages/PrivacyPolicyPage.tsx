import React from 'react'
import { motion } from 'framer-motion'
import { 
  Shield,
  Lock,
  Eye,
  FileText,
  Database,
  Globe,
  Mail,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Helmet } from 'react-helmet-async'

interface PrivacyPolicyPageProps {}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = () => {
  const sections = [
    {
      id: 'information-collection',
      title: 'Information We Collect',
      icon: Database,
      content: [
        {
          subtitle: 'Data Controller',
          text: 'The Data Controller for your personal information is FLEETCORE LTD (trade name: fleetcore), a Private Company Limited by Shares registered in the Abu Dhabi Global Market (ADGM), United Arab Emirates — Company Registration No. 35547, registered office: Office 2201.C11-D04, Floor 22, Sky Tower, Shams Abu Dhabi, Al Reem Island, Abu Dhabi, United Arab Emirates. Contact: hello@fleetcore.ai'
        },
        {
          subtitle: 'Personal Information',
          text: 'When you interact with fleetcore, we may collect the following personal information:',
          list: [
            'Contact details: Name, email address, phone number, company name, job title',
            'Account information: Username, password (encrypted), profile information',
            'Communication data: Messages, inquiries, support requests',
            'Meeting data: Scheduling preferences via Calendly integration',
            'Technical data: IP address, browser type, device information, operating system'
          ]
        },
        {
          subtitle: 'Usage Information',
          text: 'We automatically collect information about your interaction with our website and platform:',
          list: [
            'Website analytics: Pages visited, time spent, navigation patterns',
            'Platform usage: Features accessed, maintenance records created, system interactions',
            'Performance data: Load times, errors, system performance metrics'
          ]
        },
        {
          subtitle: 'Maritime Operations Data',
          text: 'If you use our platform, we collect operational data necessary to provide our services:',
          list: [
            'Vessel information: Fleet details, equipment specifications, vessel hierarchy',
            'Maintenance records: PMS schedules, work orders, inspection reports',
            'Equipment data: Running hours, maintenance history, parts inventory',
            'Compliance data: Certificates, surveys, regulatory documentation'
          ]
        }
      ]
    },
    {
      id: 'how-we-use',
      title: 'How We Use Your Information',
      icon: Eye,
      content: [
        {
          subtitle: 'Service Delivery',
          list: [
            'Provide and maintain our maritime maintenance intelligence platform',
            'Process and execute maintenance scheduling and automation',
            'Generate analytics, reports, and predictive insights',
            'Ensure SOLAS/MARPOL compliance tracking',
            'Facilitate fleet-wide data synchronization'
          ]
        },
        {
          subtitle: 'Communication',
          list: [
            'Respond to inquiries, support requests, and demo scheduling',
            'Send platform updates, maintenance notifications, and system alerts',
            'Provide product announcements and feature releases',
            'Share industry insights, best practices, and maritime intelligence'
          ]
        },
        {
          subtitle: 'Platform Improvement',
          list: [
            'Analyze usage patterns to enhance user experience',
            'Develop and improve AI algorithms and predictive models',
            'Conduct research and development for new features',
            'Optimize system performance and reliability',
            'Aggregate anonymized data for fleet-wide benchmarking'
          ]
        },
        {
          subtitle: 'Legal Compliance',
          list: [
            'Comply with applicable maritime regulations and standards',
            'Respond to legal requests and prevent fraud',
            'Enforce our terms of service and protect user rights',
            'Maintain audit trails for regulatory compliance'
          ]
        },
        {
          subtitle: 'Lawful Basis for Processing',
          text: 'Under the ADGM Data Protection Regulations 2021 (Art. 5), we rely on the following legal bases:',
          list: [
            'Contract performance (Art. 5(1)(b)): Service delivery, account management, maintenance scheduling and platform operation',
            'Legitimate interests (Art. 5(1)(f)): Platform improvement, analytics, AI model development, fraud prevention and security — our legitimate interests are not overridden by your rights',
            'Legal obligation (Art. 5(1)(c)): Responding to legal requests, maintaining audit trails, SOLAS/MARPOL compliance recordkeeping',
            'Consent (Art. 5(1)(a)): Marketing communications and non-essential analytics cookies — you may withdraw consent at any time without affecting prior lawful processing'
          ]
        }
      ]
    },
    {
      id: 'data-sharing',
      title: 'Data Sharing and Disclosure',
      icon: Globe,
      content: [
        {
          subtitle: 'We Do Not Sell Your Data',
          text: 'fleetcore does not sell, rent, or trade your personal information to third parties for marketing purposes.'
        },
        {
          subtitle: 'Service Providers',
          text: 'We share data with trusted service providers who assist in delivering our services:',
          list: [
            'Cloud infrastructure: Supabase (PostgreSQL hosting, authentication, real-time sync)',
            'Scheduling: Calendly (meeting scheduling and calendar integration)',
            'Analytics: Website analytics providers (anonymized usage statistics)',
            'Communication: Email service providers (transactional and notification emails)',
            'Payment processing: Secure payment gateways (if applicable)'
          ]
        },
        {
          subtitle: 'Business Transfers',
          text: 'In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity. We will notify you of any such change.'
        },
        {
          subtitle: 'Legal Requirements',
          text: 'We may disclose your information when required by law, court order, or to protect the rights, property, or safety of fleetcore, our users, or the public.'
        },
        {
          subtitle: 'Multi-Tenant Architecture',
          text: 'fleetcore uses row-level security (RLS) to ensure complete data isolation between organizations. Your operational data is never visible to other customers.'
        }
      ]
    },
    {
      id: 'data-security',
      title: 'Data Security',
      icon: Lock,
      content: [
        {
          subtitle: 'Technical Safeguards',
          list: [
            'Encryption: Data encrypted in transit (TLS/SSL) and at rest (AES-256)',
            'Authentication: Multi-factor authentication (MFA) support',
            'Access Control: Role-based permissions with STCW-compliant hierarchy',
            'Database Security: Row-level security (RLS) for multi-tenant isolation',
            'Infrastructure: Enterprise-grade cloud infrastructure with 99.9% uptime SLA'
          ]
        },
        {
          subtitle: 'Operational Safeguards',
          list: [
            'Regular security audits and penetration testing',
            'Automated backup and disaster recovery procedures',
            'Employee access controls and security training',
            'Incident response and breach notification protocols',
            'Continuous monitoring and threat detection'
          ]
        },
        {
          subtitle: 'Data Retention',
          text: 'We retain your personal information for as long as necessary to provide our services and comply with legal obligations:',
          list: [
            'Account data: Retained while your account is active, plus 90 days post-deletion',
            'Maintenance records: Retained indefinitely for compliance and historical analysis',
            'Communication logs: Retained for 3 years for customer service purposes',
            'Analytics data: Anonymized and retained for 5 years for trend analysis'
          ]
        }
      ]
    },
    {
      id: 'your-rights',
      title: 'Your Privacy Rights',
      icon: CheckCircle,
      content: [
        {
          subtitle: 'Access and Correction',
          text: 'You have the right to access, update, or correct your personal information at any time through your account settings or by contacting us.'
        },
        {
          subtitle: 'Data Portability',
          text: 'You can request a copy of your data in a machine-readable format (CSV, JSON) for transfer to another service.'
        },
        {
          subtitle: 'Deletion',
          text: 'You may request deletion of your personal information, subject to our legal retention requirements. Maintenance records may be retained for regulatory compliance.'
        },
        {
          subtitle: 'Opt-Out',
          text: 'You can opt-out of marketing communications at any time using the unsubscribe link in emails or through your account settings. Transactional and service-related communications cannot be opted out.'
        },
        {
          subtitle: 'Restriction and Objection',
          text: 'You can request restriction of processing or object to certain uses of your data, such as analytics or profiling.'
        },
        {
          subtitle: 'ADGM Data Protection Rights (Primary Applicable Law)',
          text: 'As a company registered in the Abu Dhabi Global Market, we are subject to the ADGM Data Protection Regulations 2021 (DPR 2021). Under Art. 13–19, all data subjects have the right to: access (Art. 13), rectification (Art. 14), erasure (Art. 15), restriction of processing (Art. 16), data portability (Art. 18), and objection to processing (Art. 19). You also have the right to withdraw consent at any time (Art. 6(3)); withdrawal does not affect the lawfulness of prior processing.',
          list: [
            'GDPR (EU/EEA): Right to data portability, right to be forgotten, right to restrict processing',
            'UK GDPR: Similar rights to EU GDPR',
            'CCPA (California): Right to know what data is collected, right to opt-out of sale (we do not sell data)',
            'Other jurisdictions: Contact us for information about your local privacy rights'
          ]
        },
        {
          subtitle: 'Right to Lodge a Complaint (Art. 11(2)(d))',
          text: 'You have the right to lodge a complaint with the ADGM Commissioner of Data Protection (Office of Data Protection — ODP) without prejudice to any other administrative or judicial remedy. The ODP can be reached at: https://www.adgm.com/operating-in-adgm/office-of-data-protection/overview. You may also refer the ODP\'s handling of your complaint to the ADGM Court within 3 months of their decision.'
        }
      ]
    },
    {
      id: 'cookies-tracking',
      title: 'Cookies and Tracking Technologies',
      icon: FileText,
      content: [
        {
          subtitle: 'What We Use',
          text: 'We use cookies and similar tracking technologies to enhance your experience:',
          list: [
            'Essential cookies: Required for platform functionality and authentication',
            'Analytics cookies: Track website usage and user behavior (anonymized)',
            'Preference cookies: Remember your settings and preferences',
            'Session cookies: Maintain your login session and user state'
          ]
        },
        {
          subtitle: 'Third-Party Tracking',
          text: 'We integrate with third-party services that may use their own cookies:',
          list: [
            'Google Tag Manager & Analytics: Website traffic analysis, user behavior tracking, and conversion measurement',
            'Calendly: Scheduling and meeting management',
            'Performance monitoring: System health and error tracking'
          ]
        },
        {
          subtitle: 'Your Cookie Choices',
          text: 'You have full control over which cookies we use. Use our Cookie Consent Modal to manage your preferences at any time. You can also control cookies through your browser settings. Note that disabling essential cookies may impact platform functionality. To update your preferences, click "Cookie Settings" in the footer or clear your browser data to see the consent modal again.'
        }
      ]
    },
    {
      id: 'third-party-services',
      title: 'Third-Party Services',
      icon: ExternalLink,
      content: [
        {
          subtitle: 'Service Integrations',
          text: 'fleetcore integrates with third-party services to enhance functionality:',
          list: [
            'Supabase: Backend infrastructure, database, authentication, real-time sync',
            'Google Tag Manager & Analytics: Website analytics, conversion tracking, and user behavior analysis',
            'Calendly: Meeting scheduling and calendar management',
            'Email providers: Transactional emails and notifications'
          ]
        },
        {
          subtitle: 'Third-Party Privacy Policies',
          text: 'Each integrated service has its own privacy policy. We encourage you to review:',
          list: [
            'Supabase Privacy Policy: https://supabase.com/privacy',
            'Google Privacy Policy: https://policies.google.com/privacy',
            'Calendly Privacy Policy: https://calendly.com/privacy',
            'Our service providers process data on our behalf under strict contractual obligations'
          ]
        }
      ]
    },
    {
      id: 'international-transfers',
      title: 'International Data Transfers',
      icon: Globe,
      content: [
        {
          subtitle: 'Global Operations',
          text: 'fleetcore serves maritime operations worldwide. Your data may be transferred to and processed in countries other than your country of residence.'
        },
        {
          subtitle: 'Transfer Safeguards',
          text: 'We ensure adequate protection for international data transfers through:',
          list: [
            'ADGM Standard Contractual Clauses (SCCs) adopted by the ADGM Commissioner of Data Protection on 11 August 2021 (Art. 42(2) ADGM DPR 2021)',
            'EU Standard Contractual Clauses (EU Commission 2021 SCCs) where the ADGM Commissioner has approved their equivalency under Art. 42(2)',
            'Adequacy decisions: transfers to jurisdictions assessed as adequate by the ADGM Commissioner (including EU and UK) under Art. 41',
            'Binding Corporate Rules (BCRs) approved under Art. 43 ADGM DPR 2021',
            'Explicit consent of the data subject after being informed of the risks (Art. 44(1)(a)), for infrequent transfers only'
          ]
        },
        {
          subtitle: 'Data Residency',
          text: 'Enterprise customers can request data residency in specific regions. Contact us for multi-region deployment options.'
        }
      ]
    },
    {
      id: 'childrens-privacy',
      title: "Children's Privacy",
      icon: AlertTriangle,
      content: [
        {
          text: 'fleetcore\'s services are intended for business and professional use. We do not knowingly collect personal information from individuals under 18 years of age. If we become aware that we have collected data from a minor, we will promptly delete it.'
        }
      ]
    },
    {
      id: 'changes-to-policy',
      title: 'Changes to This Privacy Policy',
      icon: FileText,
      content: [
        {
          text: 'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or business operations. We will notify you of material changes by:'
        },
        {
          list: [
            'Posting the updated policy on our website with a "Last Updated" date',
            'Sending email notifications to registered users for significant changes',
            'Displaying in-app notifications when you log into the platform',
            'Requiring acknowledgment of changes for continued use'
          ]
        },
        {
          text: 'Your continued use of fleetcore after changes take effect constitutes acceptance of the updated Privacy Policy.'
        }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>fleetcore Privacy Policy</title>
        <meta name="description" content="How fleetcore collects, uses, and protects your data across our platform and website." />
        <link rel="canonical" href="https://fleetcore.ai/privacy-policy" />
        <meta property="og:title" content="fleetcore Privacy Policy" />
        <meta property="og:description" content="How fleetcore collects, uses, and protects your data across our platform and website." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fleetcore.ai/privacy-policy" />
        <meta property="og:image" content="https://fleetcore.ai/og/privacy_policy.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["PrivacyPolicy", "FAQPage"],
            "name": "fleetcore Privacy Policy",
            "url": "https://fleetcore.ai/privacy-policy",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What personal data do you collect?",
                "acceptedAnswer": { "@type": "Answer", "text": "Contact details, usage data, and operational data necessary to provide our services, as described on this page." }
              },
              {
                "@type": "Question",
                "name": "How can I contact fleetcore about privacy?",
                "acceptedAnswer": { "@type": "Answer", "text": "Email hello@fleetcore.ai. We respond to privacy requests within 30 days." }
              }
            ]
          })}
        </script>
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fleetcore_ai" />
        <meta name="twitter:title" content="fleetcore Privacy Policy" />
        <meta name="twitter:description" content="How fleetcore collects, uses, and protects your data across our platform and website." />
        <meta name="twitter:image" content="https://fleetcore.ai/og/privacy_policy.png" />
      </Helmet>
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 mb-8">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Privacy Policy</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold enterprise-heading mb-6">
              Privacy Policy
            </h1>

            <p className="text-lg text-slate-600 dark:text-slate-400 enterprise-body mb-8">
              Your privacy is important to us. This policy explains how fleetcore collects, uses, 
              protects, and shares your personal information.
            </p>

            <div className="flex flex-wrap gap-4 justify-center text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span><strong>Last Updated:</strong> 27 February 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span><strong>Effective Date:</strong> 27 February 2026</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="md:py-12 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Table of Contents
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-slate-800 hover:shadow-md transition-shadow duration-200"
                >
                  <section.icon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {index + 1}. {section.title}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-16">
            {sections.map((section, sectionIndex) => (
              <motion.div
                key={section.id}
                id={section.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: sectionIndex * 0.05 }}
                viewport={{ once: true }}
                className="scroll-mt-24"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <section.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 enterprise-heading">
                      {sectionIndex + 1}. {section.title}
                    </h2>
                  </div>
                </div>

                <div className="space-y-6 ml-16">
                  {section.content.map((item, itemIndex) => (
                    <div key={itemIndex} className="space-y-3">
                      {item.subtitle && (
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                          {item.subtitle}
                        </h3>
                      )}
                      {item.text && (
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          {item.text}
                        </p>
                      )}
                      {item.list && (
                        <ul className="space-y-2">
                          {item.list.map((listItem, listIndex) => (
                            <li key={listIndex} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                              <span className="text-slate-600 dark:text-slate-400 text-sm">
                                {listItem}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl border bg-white dark:bg-slate-800 shadow-lg"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 enterprise-heading mb-2">
                    Contact Us About Privacy
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    If you have questions, concerns, or requests regarding this Privacy Policy or our 
                    data practices, please contact us:
                  </p>
                </div>
              </div>

              <div className="space-y-4 ml-16">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</div>
                    <a href="mailto:hello@fleetcore.ai" className="text-blue-600 dark:text-blue-400 hover:underline">
                      hello@fleetcore.ai
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Location</div>
                    <span className="text-slate-600 dark:text-slate-400">Abu Dhabi Global Market (ADGM), Abu Dhabi, United Arab Emirates</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Supervisory Authority</div>
                    <a
                      href="https://www.adgm.com/registration-authority/complaints/submit-a-complaint"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                      ADGM Office of Data Protection — Lodge a Complaint
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    We will respond to privacy inquiries within two months of receipt (Art. 10(3) ADGM DPR 2021). For complex or numerous requests, this may be extended by one further month; we will notify you within two months of receipt if an extension is required. For urgent data protection concerns, please mark your email as "URGENT: Privacy Request."
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/contact" className="flex-1">
                  <Button variant="gradient" className="w-full">
                    Contact Us
                  </Button>
                </Link>
                <Link to="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PrivacyPolicyPage

