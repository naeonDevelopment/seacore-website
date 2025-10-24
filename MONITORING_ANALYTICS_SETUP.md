# 📊 Complete Monitoring & Analytics Setup Guide

## Phase 3.2: Monitoring & Analytics Implementation

---

## **Part 1: Google Search Console Setup**

### Step 1: Property Verification

#### Option A: DNS Verification (Recommended for Cloudflare)
```
1. Go to: https://search.google.com/search-console
2. Add property: fleetcore.ai
3. Choose: DNS verification
4. Copy the TXT record value
5. Add to Cloudflare DNS:
   - Type: TXT
   - Name: fleetcore.ai
   - Content: [Google's verification string]
   - TTL: Auto
6. Click "Verify" in Search Console
```

#### Option B: HTML Tag Verification
Add to `index.html` <head>:
```html
<meta name="google-site-verification" content="YOUR_CODE_HERE" />
```

### Step 2: Submit Sitemap
```
1. In Search Console, go to Sitemaps
2. Enter: https://fleetcore.ai/sitemap.xml
3. Click Submit
4. Wait 24-48 hours for indexing
```

### Step 3: Key Reports to Monitor

#### **Coverage Report:**
- **Target:** 6/6 pages indexed
- **Check weekly** for errors
- Fix any "Excluded" pages immediately

#### **Rich Results Report:**
- **Monitor:**
  - FAQPage (should show 10 questions)
  - VideoObject (hero videos)
  - HowTo (implementation process)
  - Organization
- **Target:** 0 errors, 0 warnings

#### **Performance Report:**
Key metrics to track:
```
Queries to Monitor:
- Brand: "fleetcore", "fleet core"
- Product: "maritime maintenance software"
- Problem: "predictive maintenance maritime"
- Location: "maritime software Dubai"
- Competitor: "fleetcore vs [competitor]"
```

**Export Weekly:**
- Top performing queries
- Pages with highest impressions
- Queries with low CTR (<5%) - optimize these

#### **Core Web Vitals Report:**
Target thresholds:
- **LCP (Largest Contentful Paint):** <2.5s
- **FID (First Input Delay):** <100ms
- **CLS (Cumulative Layout Shift):** <0.1

**If metrics are poor:**
1. Check lazy loading implementation
2. Optimize hero videos
3. Review font loading
4. Check for layout shifts

### Step 4: Enhanced Search Appearance

Enable in Search Console:
- **Sitelinks:** Automatic (improve with good internal linking)
- **Site name:** Set to "fleetcore"
- **Logo:** Upload Light.svg (1200x630px version recommended)

---

## **Part 2: Bing Webmaster Tools**

### Setup (5 minutes):
```
1. Go to: https://www.bing.com/webmasters
2. Sign in with Microsoft account
3. Add site: fleetcore.ai
4. Choose: Import from Google Search Console (easiest)
   OR manually verify via DNS/HTML
5. Submit sitemap: https://fleetcore.ai/sitemap.xml
```

### Key Differences from Google:
- Bing crawls slower (be patient)
- Better structured data debugging tools
- More detailed SEO reports

### Monthly Tasks:
- Check indexation status
- Review SEO reports recommendations
- Monitor keyword rankings (different from Google)
- Check for crawl errors

---

## **Part 3: AI Search Engine Tracking**

### ChatGPT / OpenAI Visibility:

**Check if indexed:**
```
1. Ask ChatGPT: "What is fleetcore?"
2. Ask: "Tell me about fleetcore maritime maintenance"
3. Ask: "Compare fleetcore to traditional maritime software"
```

**Expected responses:**
- ✅ Mentions fleetcore by name
- ✅ Describes core features accurately
- ✅ Cites cost savings (20-30%)
- ✅ Mentions SOLAS/MARPOL compliance

**If not indexed:**
- Wait 2-3 weeks after middleware deployment
- Verify GPTBot isn't blocked in robots.txt
- Check middleware logs for GPTBot visits

### Claude / Anthropic Visibility:

**Test similarly:**
```
"What do you know about fleetcore maritime platform?"
```

### Perplexity Tracking:

**Check:**
```
Search: "fleetcore maritime maintenance"
Search: "predictive maintenance maritime software"
```

**Monitor:**
- Direct citations vs. general mentions
- Link inclusion
- Answer accuracy

---

## **Part 4: Analytics Integration**

### Google Analytics 4 Setup:

#### Step 1: Create GA4 Property
```
1. Go to: https://analytics.google.com
2. Create Property: "fleetcore"
3. Set timezone: Dubai (UTC+4)
4. Get Measurement ID: G-XXXXXXXXXX
```

#### Step 2: Add to Site

Create: `src/utils/analytics.ts`
```typescript
// Google Analytics 4
export const GA_TRACKING_ID = 'G-XXXXXXXXXX';

// Initialize GA4
export const initGA = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('js', new Date());
    window.gtag('config', GA_TRACKING_ID, {
      page_path: window.location.pathname,
    });
  }
};

// Track page views
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

// Track custom events
export const trackEvent = (action: string, params: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params);
  }
};
```

Add to `index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

#### Step 3: Set Up Events

Track these key actions:
```typescript
// Demo requests
trackEvent('schedule_demo', {
  page: '/contact',
  method: 'calendly'
});

// External link clicks
trackEvent('outbound_click', {
  link_url: url,
  link_domain: domain
});

// Video plays
trackEvent('video_play', {
  video_title: 'Hero Video',
  location: 'homepage'
});

// Form submissions
trackEvent('form_submit', {
  form_name: 'Contact Form',
  form_location: '/contact'
});
```

### Enhanced Ecommerce (Optional for future):
```typescript
// Track "product" views (for demo requests)
trackEvent('view_item', {
  items: [{
    item_id: 'demo_enterprise',
    item_name: 'Enterprise Demo',
    item_category: 'Demo'
  }]
});
```

---

## **Part 5: Conversion Tracking**

### Define Key Conversions:

1. **Demo Scheduled** (Primary)
   - Calendly widget opened
   - Demo meeting booked
   - Thank you page visited

2. **Contact Form** (Secondary)
   - Form started
   - Form completed
   - Email sent

3. **Engaged Visit** (Micro-conversion)
   - >60 seconds on site
   - >2 pages viewed
   - Video played

4. **Content Engagement**
   - Platform page visited
   - Solutions page visited
   - About page visited

### Conversion Tracking Code:

```typescript
// Demo scheduled
trackEvent('conversion', {
  send_to: 'AW-CONVERSION_ID/CONVERSION_LABEL',
  value: 1000, // Estimated value
  currency: 'USD',
  transaction_id: Date.now().toString()
});

// Contact form submission
trackEvent('generate_lead', {
  value: 500,
  currency: 'USD'
});
```

---

## **Part 6: Performance Monitoring**

### Core Web Vitals Monitoring:

#### Real User Monitoring (RUM):
Add to site:
```typescript
// src/utils/performanceMonitoring.ts
export function reportWebVitals() {
  if ('web-vital' in window) {
    const {getCLS, getFID, getLCP} = require('web-vitals');
    
    getCLS((metric) => {
      trackEvent('web_vitals', {
        name: 'CLS',
        value: metric.value,
        rating: metric.rating
      });
    });
    
    getFID((metric) => {
      trackEvent('web_vitals', {
        name: 'FID',
        value: metric.value,
        rating: metric.rating
      });
    });
    
    getLCP((metric) => {
      trackEvent('web_vitals', {
        name: 'LCP',
        value: metric.value,
        rating: metric.rating
      });
    });
  }
}
```

### Cloudflare Analytics:

Already built-in! Check:
```
1. Cloudflare Dashboard
2. Select: fleetcore.ai domain
3. Go to: Analytics & Logs
```

**Monitor:**
- Requests per day
- Bandwidth usage
- Cache hit ratio (target: >85%)
- Threats blocked
- Bot traffic percentage

---

## **Part 7: SEO Monitoring Automation**

### Weekly Automated Reports:

Create script: `scripts/seo-monitor.js`
```javascript
// Pseudo-code for weekly SEO check
async function weeklyS SEOCheck() {
  // 1. Check sitemap accessibility
  const sitemap = await fetch('https://fleetcore.ai/sitemap.xml');
  
  // 2. Verify all pages return 200
  const pages = ['/', '/platform', '/solutions', '/about', '/contact', '/privacy-policy'];
  for (const page of pages) {
    const response = await fetch(`https://fleetcore.ai${page}`);
    console.log(`${page}: ${response.status}`);
  }
  
  // 3. Check robots.txt
  const robots = await fetch('https://fleetcore.ai/robots.txt');
  
  // 4. Validate structured data
  for (const page of pages) {
    const html = await fetch(`https://fleetcore.ai${page}`).then(r => r.text());
    const schemas = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/gs);
    console.log(`${page}: ${schemas?.length || 0} schemas found`);
  }
  
  // 5. Email report
  await sendEmail({
    to: 'tech@fleetcore.ai',
    subject: 'Weekly SEO Health Check',
    body: generateReport()
  });
}
```

Run weekly via cron or GitHub Actions.

---

## **Part 8: Competitive Intelligence**

### Monitor Competitors:

**Tools:**
1. **Ahrefs Site Explorer** - Track backlinks, keywords
2. **SEMrush** - Compare rankings
3. **Google Alerts** - Brand mentions

**Set up alerts for:**
```
- "maritime maintenance software"
- "predictive maintenance maritime"
- "SOLAS compliance software"
- "[competitor name] + news"
- "fleetcore" (your brand)
```

---

## **Dashboard Setup**

### Create SEO Dashboard (Google Data Studio/Looker):

**KPIs to Display:**
1. **Organic Traffic** (GA4)
   - Total sessions
   - New vs. returning
   - By page

2. **Search Performance** (Search Console)
   - Total impressions
   - Average position
   - CTR
   - Total clicks

3. **Indexation** (Search Console)
   - Pages indexed
   - Coverage errors
   - Rich results valid

4. **Technical** (Cloudflare + Custom)
   - Page load time
   - Core Web Vitals
   - Uptime %

5. **Conversions** (GA4)
   - Demo requests
   - Contact form submissions
   - Engagement rate

### Update Frequency:
- **Daily:** Organic traffic, conversions
- **Weekly:** Rankings, indexation status
- **Monthly:** Backlinks, competitive analysis

---

## **Alerting Rules**

Set up alerts for:

### Critical (Immediate action):
- Site down (uptime < 99%)
- Search Console coverage errors
- Security issues
- Core Web Vitals degradation

### High (Within 24h):
- Rankings drop >3 positions
- Traffic drop >20% week-over-week
- Conversion rate drop >10%

### Medium (Weekly review):
- New backlinks
- Keyword opportunities
- Featured snippet losses

---

## **Success Metrics Timeline**

### Week 1:
- ✅ All tools set up and verified
- ✅ Baseline metrics recorded
- ✅ First reports generated

### Month 1:
- 20%+ increase in impressions
- 5+ rich results active
- All pages indexed
- <2.5s LCP on all pages

### Quarter 1:
- 50%+ increase in organic traffic
- 10+ featured snippets won
- 3+ keyword page 1 rankings
- 5%+ conversion rate

---

**Implementation Status:**
- [x] Google Search Console - Ready to set up
- [x] Bing Webmaster - Import from GSC
- [x] GA4 Integration - Code provided
- [x] Conversion tracking - Events defined
- [x] Performance monitoring - Tools ready
- [x] Automated reporting - Script template provided

**Next:** Implement and start tracking!

