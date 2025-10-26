/**
 * Dynamic SEO Content Generator
 * Automatically generates optimized meta descriptions, keywords, and internal links
 * Based on page content and context
 */

export interface SEOContent {
  title: string;
  description: string;
  keywords: string[];
  internalLinks: InternalLink[];
  relatedContent: RelatedContent[];
  breadcrumbs: Breadcrumb[];
}

export interface InternalLink {
  text: string;
  url: string;
  context: string;
  relevanceScore: number;
}

export interface RelatedContent {
  title: string;
  url: string;
  description: string;
  category: string;
}

export interface Breadcrumb {
  name: string;
  url: string;
  position: number;
}

/**
 * Generate dynamic meta description based on page content
 * Optimized for search engines (155-160 characters)
 */
export function generateMetaDescription(
  pageType: string,
  mainKeywords: string[],
  valueProposition: string
): string {
  const templates: Record<string, (kw: string[], vp: string) => string> = {
    home: (kw, vp) => `${vp} ${kw.slice(0, 3).join(', ')}. Transform maritime operations.`,
    platform: (kw, vp) => `Enterprise platform: ${kw.slice(0, 4).join(', ')}. ${vp}`,
    solutions: (kw, vp) => `Maritime solutions: ${kw.slice(0, 3).join(', ')}. ${vp}`,
    about: (kw, vp) => `${vp} Leading ${kw[0]} provider. Dubai-based innovation team.`,
    contact: (kw, vp) => `Get started with ${kw[0]}. ${vp} Schedule demo today.`,
    assistant: (kw, vp) => `${vp}. Chat with AI: ${kw.slice(0, 3).join(', ')}. Free to use.`,
  };

  const generator = templates[pageType] || templates.home;
  const description = generator(mainKeywords, valueProposition);
  
  // Ensure optimal length (150-160 chars)
  return description.length > 160 
    ? description.substring(0, 157) + '...' 
    : description;
}

/**
 * Generate contextual keywords based on page content
 * Includes primary, secondary, and long-tail keywords
 */
export function generateKeywords(
  primaryTopic: string,
  features: string[],
  industry: string[]
): string[] {
  const keywords: string[] = [];
  
  // Primary keywords
  keywords.push(primaryTopic);
  
  // Feature-based keywords
  features.forEach(feature => {
    keywords.push(`${feature} ${primaryTopic}`);
    keywords.push(`${primaryTopic} ${feature}`);
  });
  
  // Industry-specific keywords
  industry.forEach(ind => {
    keywords.push(`${ind} ${primaryTopic}`);
    keywords.push(`${primaryTopic} for ${ind}`);
  });
  
  // Long-tail variations
  keywords.push(`how to ${primaryTopic}`);
  keywords.push(`best ${primaryTopic} platform`);
  keywords.push(`${primaryTopic} software`);
  
  // Remove duplicates and return top 15
  return [...new Set(keywords)].slice(0, 15);
}

/**
 * Generate automatic internal linking suggestions
 * Based on content relevance and SEO best practices
 */
export function generateInternalLinks(
  currentPage: string,
  pageContent: string
): InternalLink[] {
  const linkMap: Record<string, InternalLink[]> = {
    '/': [
      {
        text: 'Chat with AI Assistant',
        url: '/assistant',
        context: 'Ask questions about maritime maintenance and regulations',
        relevanceScore: 0.97
      },
      {
        text: 'Explore Platform Architecture',
        url: '/platform',
        context: 'Learn about our enterprise-grade technology stack',
        relevanceScore: 0.95
      },
      {
        text: 'View Industry Solutions',
        url: '/solutions',
        context: 'Discover tailored solutions for your maritime sector',
        relevanceScore: 0.90
      },
      {
        text: 'Schedule Demo',
        url: '/contact',
        context: 'See how 20-30% cost reduction is achieved',
        relevanceScore: 0.85
      }
    ],
    '/platform': [
      {
        text: 'Try AI Assistant',
        url: '/assistant',
        context: 'Ask questions about platform features and capabilities',
        relevanceScore: 0.94
      },
      {
        text: 'Return to Home',
        url: '/',
        context: 'Overview of maritime intelligence platform',
        relevanceScore: 0.80
      },
      {
        text: 'Industry-Specific Solutions',
        url: '/solutions',
        context: 'See how our platform adapts to different sectors',
        relevanceScore: 0.92
      },
      {
        text: 'About fleetcore',
        url: '/about',
        context: 'Learn about our mission and technology leadership',
        relevanceScore: 0.75
      }
    ],
    '/solutions': [
      {
        text: 'Platform Details',
        url: '/platform',
        context: 'Technical architecture and capabilities',
        relevanceScore: 0.93
      },
      {
        text: 'Get Started',
        url: '/contact',
        context: 'Schedule consultation for your fleet',
        relevanceScore: 0.88
      },
      {
        text: 'Home',
        url: '/',
        context: 'Overview and key benefits',
        relevanceScore: 0.70
      }
    ],
    '/about': [
      {
        text: 'Platform Technology',
        url: '/platform',
        context: 'See our enterprise-grade architecture',
        relevanceScore: 0.85
      },
      {
        text: 'Contact Us',
        url: '/contact',
        context: 'Speak with our team',
        relevanceScore: 0.82
      }
    ],
    '/contact': [
      {
        text: 'Try AI Assistant First',
        url: '/assistant',
        context: 'Get instant answers before scheduling a call',
        relevanceScore: 0.89
      },
      {
        text: 'Learn More',
        url: '/platform',
        context: 'Understand our technology before demo',
        relevanceScore: 0.87
      },
      {
        text: 'View Solutions',
        url: '/solutions',
        context: 'Explore industry-specific offerings',
        relevanceScore: 0.84
      }
    ],
    '/assistant': [
      {
        text: 'Platform Details',
        url: '/platform',
        context: 'Deep dive into technical capabilities',
        relevanceScore: 0.96
      },
      {
        text: 'Schedule Demo',
        url: '/contact',
        context: 'Get personalized guidance from our team',
        relevanceScore: 0.93
      },
      {
        text: 'View Solutions',
        url: '/solutions',
        context: 'Explore sector-specific applications',
        relevanceScore: 0.88
      },
      {
        text: 'Home',
        url: '/',
        context: 'Return to main overview',
        relevanceScore: 0.75
      }
    ]
  };

  return linkMap[currentPage] || [];
}

/**
 * Generate related content recommendations
 * Using content similarity and user journey optimization
 */
export function generateRelatedContent(
  currentPage: string,
  userInterests: string[] = []
): RelatedContent[] {
  const contentMap: Record<string, RelatedContent[]> = {
    '/': [
      {
        title: 'Platform Architecture',
        url: '/platform',
        description: 'Explore our enterprise-grade cloud infrastructure and AI capabilities',
        category: 'Technical Deep-Dive'
      },
      {
        title: 'Solutions by Industry',
        url: '/solutions',
        description: 'Discover specialized solutions for your maritime sector',
        category: 'Industry Focus'
      },
      {
        title: 'Company Overview',
        url: '/about',
        description: 'Learn about our mission and technology leadership',
        category: 'About Us'
      }
    ],
    '/platform': [
      {
        title: 'Industry Solutions',
        url: '/solutions',
        description: 'See how these capabilities apply to your specific sector',
        category: 'Applications'
      },
      {
        title: 'Schedule Demo',
        url: '/contact',
        description: 'Experience the platform with personalized walkthrough',
        category: 'Get Started'
      }
    ],
    '/solutions': [
      {
        title: 'Technical Details',
        url: '/platform',
        description: 'Deep dive into the technology powering these solutions',
        category: 'Technology'
      },
      {
        title: 'Request Consultation',
        url: '/contact',
        description: 'Discuss your specific fleet requirements',
        category: 'Next Steps'
      }
    ]
  };

  return contentMap[currentPage] || [];
}

/**
 * Generate breadcrumb navigation for SEO and UX
 * Follows schema.org BreadcrumbList specification
 */
export function generateBreadcrumbs(pathname: string): Breadcrumb[] {
  const breadcrumbs: Breadcrumb[] = [
    { name: 'Home', url: '/', position: 1 }
  ];

  const pathMap: Record<string, string> = {
    '/platform': 'Platform',
    '/solutions': 'Solutions',
    '/about': 'About',
    '/contact': 'Contact',
    '/assistant': 'AI Assistant',
    '/privacy-policy': 'Privacy Policy'
  };

  if (pathname !== '/' && pathMap[pathname]) {
    breadcrumbs.push({
      name: pathMap[pathname],
      url: pathname,
      position: 2
    });
  }

  return breadcrumbs;
}

/**
 * Generate complete SEO content package for a page
 */
export function generatePageSEO(
  pageType: string,
  pathname: string,
  context: {
    mainKeywords?: string[];
    features?: string[];
    industries?: string[];
    valueProposition?: string;
  }
): SEOContent {
  const {
    mainKeywords = ['maritime maintenance', 'predictive maintenance', 'fleet management'],
    features = ['AI automation', 'SOLAS compliance', 'predictive analytics'],
    industries = ['commercial shipping', 'offshore energy', 'cruise operations'],
    valueProposition = 'AI-powered maritime maintenance reducing costs by 20-30%'
  } = context;

  return {
    title: generatePageTitle(pageType, mainKeywords[0]),
    description: generateMetaDescription(pageType, mainKeywords, valueProposition),
    keywords: generateKeywords(mainKeywords[0], features, industries),
    internalLinks: generateInternalLinks(pathname, ''),
    relatedContent: generateRelatedContent(pathname),
    breadcrumbs: generateBreadcrumbs(pathname)
  };
}

/**
 * Generate optimized page title
 */
function generatePageTitle(pageType: string, mainKeyword: string): string {
  const titleMap: Record<string, string> = {
    home: `fleetcore - ${mainKeyword} | AI Maritime Platform`,
    platform: `Platform - ${mainKeyword} | fleetcore`,
    solutions: `Solutions - ${mainKeyword} | fleetcore`,
    about: `About fleetcore - Maritime Intelligence Leadership`,
    contact: `Contact - Get Started with ${mainKeyword}`,
    assistant: `AI Assistant - ${mainKeyword} | fleetcore`,
  };

  return titleMap[pageType] || `fleetcore - ${mainKeyword}`;
}

/**
 * Calculate content relevance score for internal linking
 * Based on keyword overlap and semantic similarity
 */
export function calculateRelevanceScore(
  sourceContent: string,
  targetContent: string,
  sharedKeywords: string[]
): number {
  let score = 0;
  
  // Keyword presence (0-40 points)
  const keywordMatches = sharedKeywords.filter(kw => 
    sourceContent.toLowerCase().includes(kw.toLowerCase()) &&
    targetContent.toLowerCase().includes(kw.toLowerCase())
  );
  score += Math.min(keywordMatches.length * 10, 40);
  
  // Content length similarity (0-20 points)
  const lengthRatio = Math.min(sourceContent.length, targetContent.length) / 
                      Math.max(sourceContent.length, targetContent.length);
  score += lengthRatio * 20;
  
  // Topic relevance (0-40 points)
  // This could be enhanced with ML-based semantic similarity
  const topicWords = ['maritime', 'fleet', 'maintenance', 'compliance', 'vessel'];
  const topicMatches = topicWords.filter(word =>
    sourceContent.toLowerCase().includes(word) &&
    targetContent.toLowerCase().includes(word)
  );
  score += Math.min(topicMatches.length * 8, 40);
  
  return Math.min(score, 100) / 100; // Normalize to 0-1
}

/**
 * Generate AI-optimized FAQ questions based on content
 */
export function generateAIOptimizedFAQs(
  topic: string,
  keyFeatures: string[],
  benefits: string[]
): Array<{ question: string; answer: string }> {
  return [
    {
      question: `What is ${topic}?`,
      answer: `${topic} is ${benefits[0]} through ${keyFeatures.slice(0, 2).join(' and ')}.`
    },
    {
      question: `How does ${topic} work?`,
      answer: `${topic} works by ${keyFeatures.slice(0, 3).join(', ')}, delivering ${benefits[0]}.`
    },
    {
      question: `How much does ${topic} cost?`,
      answer: `${topic} offers enterprise pricing with demonstrated ROI through ${benefits[0]}.`
    },
    {
      question: `Who uses ${topic}?`,
      answer: `${topic} is used by maritime operators seeking ${benefits.slice(0, 2).join(' and ')}.`
    }
  ];
}

