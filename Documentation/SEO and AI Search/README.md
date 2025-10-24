## fleetcore Website – SEO and AI Search Optimizations

This document audits the invisible SEO and AI search improvements implemented in the repository, explains how each works in this codebase, and notes recommended follow‑ups.

### What we implemented (invisible, no UI changes)

- Head manager for per‑route metadata
  - Library: `react-helmet-async`.
  - Provider added in `src/main.tsx` (`<HelmetProvider>` wraps the app).
  - Each page injects its own `<title>`, `<meta name="description">`, canonical, OG, and X (Twitter) tags via `<Helmet>`.

- Per‑page OG/X images
  - PNG assets added under `public/og/`:
    - Home: `home.png`
    - Solutions: `solution.png`
    - Platform: `platform.png`
    - About: `about.png`
    - Contact: `contact.png`
    - Privacy: `privacy_policy.png`
  - Pages point to these PNGs in their OG/X tags.

- Structured Data (JSON‑LD)
  - Sitewide (in `src/App.tsx`):
    - `WebSite` with `SearchAction` (for site search discoverability)
    - `ItemList` of `SiteNavigationElement` (navigation clarity)
  - Per page (in each `*Page.tsx`):
    - `WebPage`/`AboutPage`/`ContactPage`/`PrivacyPolicy` with `BreadcrumbList`
    - Hidden `FAQPage` blocks (answer snippets tuned for AI Overviews) – no UI output

- Indexing control
  - `public/robots.txt` created; `Disallow` set for unfinished industry routes.
  - "Coming soon" subroutes additionally inject `<meta name="robots" content="noindex, nofollow">` via `<Helmet>`.
  - `public/sitemap.xml` added for primary routes.

- Prerender/SSG for crawlers and AI
  - Tool: `react-snap` (postbuild).
  - Config in `package.json` (`reactSnap`) snapshots `/`, `/solutions`, `/platform`, `/about`, `/contact`, `/privacy-policy` into `dist/` so head/meta/JSON‑LD are present at fetch time.

### File‑level map

- `src/main.tsx`: wraps app with `HelmetProvider`.
- `src/App.tsx`: sitewide `<Helmet>` with `WebSite`/`SiteNavigationElement`; "coming soon" noindex metas.
- `src/pages/*Page.tsx`: per‑route `<Helmet>` with titles/descriptions/canonicals/OG/X + per‑page JSON‑LD (`WebPage` + `BreadcrumbList` + `FAQPage`).
- `public/robots.txt`, `public/sitemap.xml`, `public/og/*.png`.
- `package.json`: `postbuild: react-snap` and `reactSnap` config.

### Why this helps (SEO and AI search)

- Per‑route head tags: unique titles/descriptions/canonicals improve CTR and avoid duplication; OG/X enhances link sharing.
- JSON‑LD:
  - `WebSite` + `SearchAction` helps assistants/AI and search engines understand site search.
  - `BreadcrumbList` clarifies information architecture and can surface breadcrumb rich results.
  - `FAQPage` increases eligibility for answer surfaces (featured snippets, AI summaries) without adding on‑page UI.
- robots/sitemap: guides crawlers to index the right pages and skip placeholders.
- Prerender: search engines and AI fetch fully rendered HTML with head+JSON‑LD immediately, reducing CSR pitfalls.

### How to verify

1) Build + snapshot
   - `npm run build` (postbuild runs `react-snap`).
   - Inspect `dist/` HTML for each route: confirm `<title>`, `<meta>`, and `<script type="application/ld+json">` are present.

2) Validate structured data
   - Use Google Rich Results Test on the deployed URLs to verify `WebSite`, `WebPage`, `BreadcrumbList`, and `FAQPage` parse without errors.

3) Check robots/sitemap
   - `https://<domain>/robots.txt` lists disallowed unfinished routes and `Sitemap: ...`.
   - `https://<domain>/sitemap.xml` contains the route list.

4) Social previews
   - Use social/OG debuggers to confirm OG/X images resolve and preview correctly.

### Current best‑practice checklist (2025 quick audit)

- Titles/descriptions: present and unique across main routes.
- Canonicals: added per route.
- OG/X tags: present; X uses `name="twitter:*"` and site handle; images are PNG.
- JSON‑LD: present per page + sitewide; answer‑oriented `FAQPage` added.
- robots/sitemap: present; placeholders noindexed.
- Prerender: enabled; produces static HTML of pages for crawlers/AI.

### Recommendations / Next steps

- Organization JSON‑LD with `ContactPoint`
  - Add accurate company details (Dubai, email, phone) to an `Organization` JSON‑LD block (sitewide).

- 404 handling
  - Provide a `public/404.html` so platforms like Netlify return proper 404 instead of soft 404 for unknown paths.

- Search Console / Analytics
  - Submit the sitemap, monitor coverage and rich‑result parsers, and track performance.

- Performance polish (no visual change)
  - Add `loading="lazy"` to images and poster frames for videos; respect `prefers-reduced-motion` for heavy backgrounds.

- Scaling content authority
  - Publish real content for industry routes; add citations and author/company expertise pages to improve E‑E‑A‑T.

### Operational notes

- Content changes to titles/descriptions or FAQs are made in each page’s `<Helmet>` block.
- Adding new routes: update `sitemap.xml`, `robots.txt` (if needed), and `reactSnap.include` in `package.json` for pre-rendering.


