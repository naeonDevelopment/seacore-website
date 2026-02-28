import React from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  User,
  Briefcase,
  Mail,
  AlertTriangle,
  ExternalLink,
  Shield,
  Globe,
  CheckCircle,
  Calendar,
  MapPin
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Helmet } from 'react-helmet-async'

interface ImprintPageProps {}

export const ImprintPage: React.FC<ImprintPageProps> = () => {
  const sections = [
    {
      id: 'company-information',
      title: 'Company Information',
      icon: Building2,
      content: [
        {
          subtitle: 'Legal Identity',
          list: [
            'Legal company name: FLEETCORE LTD',
            'Approved trade name: FLEETCORE',
            'Company registration number: 35547',
            'Type of legal entity: Private Company Limited by Shares',
            'Incorporation date: 27 February 2026',
          ]
        },
        {
          subtitle: 'Registered Office Address',
          text: 'Office 2201.C11-D04, Floor 22, Sky Tower, Shams Abu Dhabi, Al Reem Island, Abu Dhabi, United Arab Emirates'
        },
        {
          subtitle: 'Regulatory Authority',
          text: 'FLEETCORE LTD is registered with and regulated by the Abu Dhabi Global Market (ADGM) Registration Authority. ADGM is an international financial centre established in Abu Dhabi, United Arab Emirates.',
          list: [
            'Regulatory body: ADGM Registration Authority',
            'Verify document code: COMPANIES-54579205',
            'Public register: https://www.adgm.com/public-registers'
          ]
        }
      ]
    },
    {
      id: 'management-responsibility',
      title: 'Management & Responsibility',
      icon: User,
      content: [
        {
          subtitle: 'Chief Executive Officer',
          text: 'Nadim Habr is the Chief Executive Officer of FLEETCORE LTD and the authorised signatory per the ADGM Commercial Licence No. 35547. He bears responsibility for the content of this website in accordance with applicable ADGM regulations.'
        },
        {
          subtitle: 'Authorised Signatory',
          list: [
            'Name: Nadim Habr',
            'Role: CEO & Authorised Signatory',
            'Authorisation: Severally authorised to sign on behalf of FLEETCORE LTD per ADGM Commercial Licence No. 35547'
          ]
        },
        {
          subtitle: 'Editorial Responsibility',
          text: 'The management of FLEETCORE LTD is responsible for the content published on this website. For questions regarding editorial content, please contact us at hello@fleetcore.ai.'
        }
      ]
    },
    {
      id: 'business-activity',
      title: 'Business Activity',
      icon: Briefcase,
      content: [
        {
          subtitle: 'Registered Business Activity',
          list: [
            'Registered category: Innovation – Tech Start-Up',
            'Classification: Other Economic Activities (ADGM)',
            'Platform category: Maritime Technical Operating System'
          ]
        },
        {
          subtitle: 'What We Do',
          text: 'fleetcore develops and operates an AI-powered maritime maintenance intelligence platform, providing predictive maintenance scheduling, SOLAS/MARPOL compliance automation, and fleet-wide operational intelligence for maritime operators worldwide.'
        }
      ]
    },
    {
      id: 'contact-information',
      title: 'Contact Information',
      icon: Mail,
      content: [
        {
          subtitle: 'General Enquiries',
          list: [
            'Email: hello@fleetcore.ai',
            'Website: https://fleetcore.ai',
            'Response time: We aim to respond within 2 business days'
          ]
        },
        {
          subtitle: 'Registered Address',
          text: 'Office 2201.C11-D04, Floor 22, Sky Tower, Shams Abu Dhabi, Al Reem Island, Abu Dhabi, United Arab Emirates'
        },
        {
          subtitle: 'Data Protection Enquiries',
          text: 'For enquiries specifically related to personal data and privacy, please refer to our Privacy Policy or contact us at hello@fleetcore.ai with the subject line "Data Protection Request".'
        }
      ]
    },
    {
      id: 'content-liability',
      title: 'Content Liability',
      icon: AlertTriangle,
      content: [
        {
          subtitle: 'Accuracy of Information',
          text: 'The content of this website has been compiled with meticulous care and to the best of our knowledge. However, we cannot guarantee the accuracy, completeness, or topicality of any content provided. We reserve the right to change, supplement, or delete parts of the website or the entire website without prior notice.'
        },
        {
          subtitle: 'No Professional Advice',
          text: 'The information provided on this website is for general informational purposes only and does not constitute legal, financial, technical, or professional advice. You should not act upon the information on this website without seeking independent professional advice appropriate to your specific circumstances.'
        },
        {
          subtitle: 'Limitation of Liability',
          text: 'To the fullest extent permitted by applicable ADGM law, FLEETCORE LTD shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your access to or use of this website or reliance on any content contained herein.'
        }
      ]
    },
    {
      id: 'external-links',
      title: 'External Links',
      icon: ExternalLink,
      content: [
        {
          subtitle: 'Third-Party Websites',
          text: 'This website may contain links to external websites operated by third parties. These links are provided for your convenience and informational purposes only. FLEETCORE LTD has no control over the content, privacy practices, or availability of those external sites and accepts no responsibility for them.'
        },
        {
          subtitle: 'No Endorsement',
          text: 'The inclusion of any link does not imply endorsement, approval, or recommendation by FLEETCORE LTD of the linked website or any content, product, or service offered there. We encourage you to review the privacy policies and terms of use of any third-party websites you visit.'
        },
        {
          subtitle: 'Reporting Problematic Links',
          text: 'If you notice a link on our website that you consider problematic or inappropriate, please notify us at hello@fleetcore.ai and we will review and, where necessary, remove the link without delay.'
        }
      ]
    },
    {
      id: 'intellectual-property',
      title: 'Intellectual Property',
      icon: Shield,
      content: [
        {
          subtitle: 'Copyright Notice',
          text: '© 2026 FLEETCORE LTD. All rights reserved. The content, design, graphics, logos, icons, images, text, and software on this website are the exclusive property of FLEETCORE LTD or its content suppliers and are protected by applicable intellectual property laws.'
        },
        {
          subtitle: 'Permitted Use',
          list: [
            'You may view and print content from this website for personal, non-commercial use only',
            'You must retain all copyright and proprietary notices on any copies made',
            'Any commercial use, reproduction, distribution, or modification requires the express prior written consent of FLEETCORE LTD'
          ]
        },
        {
          subtitle: 'Trade Marks',
          text: 'The trade name "FLEETCORE" is an approved trade name registered with the ADGM Registration Authority under Commercial Licence No. 35547. Unauthorised use of the fleetcore name, logo, or brand is prohibited.'
        }
      ]
    },
    {
      id: 'governing-law',
      title: 'Governing Law & Jurisdiction',
      icon: Globe,
      content: [
        {
          subtitle: 'Applicable Law',
          text: 'This website and any disputes arising from its use, or from the information contained herein, are governed by the laws of the Abu Dhabi Global Market (ADGM), including the ADGM Companies Regulations 2020 and the ADGM Data Protection Regulations 2021, and, where applicable, the laws of the United Arab Emirates.'
        },
        {
          subtitle: 'Dispute Resolution',
          list: [
            'Primary jurisdiction: ADGM Courts (Abu Dhabi Global Market Courts)',
            'Alternative dispute resolution: ADGM Arbitration Centre',
            'Seat of arbitration: Abu Dhabi, United Arab Emirates',
            'Applicable arbitration rules: ADGM Arbitration Centre Rules (latest edition)'
          ]
        },
        {
          subtitle: 'User Acknowledgement',
          text: 'By accessing this website, you acknowledge and agree that any dispute, claim, or controversy arising out of or relating to this website or its content shall be subject to the exclusive jurisdiction of the ADGM Courts, unless otherwise agreed in writing.'
        }
      ]
    },
    {
      id: 'regulatory-verification',
      title: 'Regulatory Verification',
      icon: CheckCircle,
      content: [
        {
          subtitle: 'ADGM Public Register',
          text: 'FLEETCORE LTD is a registered company in the Abu Dhabi Global Market. You can independently verify our registration details on the ADGM Public Register at https://www.adgm.com/public-registers — search for "FLEETCORE LTD" or registration number 35547.'
        },
        {
          subtitle: 'Commercial Licence Verification',
          list: [
            'Document verification code: COMPANIES-54579205',
            'Verification portal: https://www.registration.adgm.com',
            'Issuing authority: ADGM Registration Authority',
            'Commercial Licence number: 35547',
            'Licence period: 27 February 2026 – 26 February 2027'
          ]
        },
        {
          subtitle: 'Data Protection Registration',
          text: 'As a data controller processing personal data, FLEETCORE LTD is registered with the ADGM Office of Data Protection in accordance with the ADGM Data Protection Regulations 2021. For information about our data practices, please refer to our Privacy Policy.'
        }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>fleetcore Imprint — Legal Notice</title>
        <meta name="description" content="Legal notice and company information for FLEETCORE LTD, registered in the Abu Dhabi Global Market (ADGM), UAE. Registration No. 35547." />
        <link rel="canonical" href="https://fleetcore.ai/imprint" />
        <meta property="og:title" content="fleetcore Imprint — Legal Notice" />
        <meta property="og:description" content="Legal notice and company information for FLEETCORE LTD, registered in the Abu Dhabi Global Market (ADGM), UAE." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fleetcore.ai/imprint" />
        <meta property="og:image" content="https://fleetcore.ai/og/home.png" />
        <meta property="og:image:secure_url" content="https://fleetcore.ai/og/home.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="fleetcore — Agentic Maritime Intelligence Platform" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="fleetcore Imprint — Legal Notice" />
        <meta name="twitter:description" content="Legal notice and company information for FLEETCORE LTD, registered in ADGM, Abu Dhabi, UAE." />
        <meta name="twitter:image" content="https://fleetcore.ai/og/home.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "FLEETCORE LTD",
            "alternateName": "fleetcore",
            "url": "https://fleetcore.ai",
            "email": "hello@fleetcore.ai",
            "legalName": "FLEETCORE LTD",
            "foundingDate": "2026-02-27",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Office 2201.C11-D04, Floor 22, Sky Tower, Shams Abu Dhabi",
              "addressLocality": "Al Reem Island",
              "addressRegion": "Abu Dhabi",
              "addressCountry": "AE"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "email": "hello@fleetcore.ai",
              "contactType": "customer service"
            }
          })}
        </script>
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
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Legal Notice</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold enterprise-heading mb-6">
              Imprint
            </h1>

            <p className="text-lg text-slate-600 dark:text-slate-400 enterprise-body mb-8">
              Legal notice and mandatory disclosure information for FLEETCORE LTD,
              registered in the Abu Dhabi Global Market (ADGM), United Arab Emirates.
            </p>

            <div className="flex flex-wrap gap-4 justify-center text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span><strong>Last Updated:</strong> 27 February 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span><strong>Jurisdiction:</strong> Abu Dhabi Global Market, UAE</span>
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
              Contents
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
                    Contact Us
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    For any questions regarding this legal notice, or to exercise rights under applicable law,
                    please reach out to us directly.
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

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Registered Office</div>
                    <span className="text-slate-600 dark:text-slate-400">
                      Office 2201.C11-D04, Floor 22, Sky Tower,<br />
                      Shams Abu Dhabi, Al Reem Island,<br />
                      Abu Dhabi, United Arab Emirates
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">ADGM Public Register</div>
                    <a
                      href="https://www.adgm.com/public-registers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      adgm.com/public-registers
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    We will respond to all legal enquiries within 5 business days. For urgent matters,
                    please mark your email as "URGENT: Legal Notice".
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/contact" className="flex-1">
                  <Button variant="gradient" className="w-full">
                    Contact Us
                  </Button>
                </Link>
                <Link to="/privacy-policy" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Privacy Policy
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

export default ImprintPage
