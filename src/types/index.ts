// Enterprise Website Types

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  description?: string;
  children?: NavigationItem[];
}

export interface HeroSection {
  headline: string;
  subheadline: string;
  description: string;
  primaryCTA: {
    text: string;
    href: string;
  };
  secondaryCTA: {
    text: string;
    href: string;
  };
}

export interface ValueProposition {
  id: string;
  title: string;
  description: string;
  icon: string;
  metrics?: {
    value: string;
    label: string;
  };
}

export interface IndustrySegment {
  id: string;
  name: string;
  description: string;
  icon: string;
  href: string;
  challenges: string[];
  solutions: string[];
  metrics: {
    value: string;
    label: string;
  }[];
}

export interface CaseStudy {
  id: string;
  title: string;
  company: string;
  industry: string;
  challenge: string;
  solution: string;
  results: {
    metric: string;
    value: string;
    description: string;
  }[];
  testimonial?: {
    quote: string;
    author: string;
    position: string;
  };
}

export interface TechnicalFeature {
  id: string;
  name: string;
  description: string;
  category: 'agentic' | 'intelligence' | 'compliance' | 'integration';
  icon: string;
  benefits: string[];
  technicalSpecs?: {
    [key: string]: string;
  };
}

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    annual: number;
  };
  features: string[];
  limitations?: string[];
  popular?: boolean;
  enterprise?: boolean;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface ContactForm {
  name: string;
  email: string;
  company: string;
  role: string;
  industry: string;
  message: string;
  interests: string[];
}

export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

