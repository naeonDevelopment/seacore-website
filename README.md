# SeaCore Enterprise Website

> **Agentic Maritime Intelligence Platform - Marketing Website**

Modern, high-performance enterprise marketing website showcasing SeaCore's revolutionary AI-powered maritime maintenance platform.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Deployment

### Netlify (Recommended)

This website is optimized for Netlify deployment:

1. **Connect Repository**: Link this GitHub repository to Netlify
2. **Auto-Deploy**: Automatic deployments on push to `main` branch
3. **Build Settings**: Pre-configured in `netlify.toml`
   - Build command: `npm run build`
   - Publish directory: `dist`

### Manual Deployment

Build the production bundle and deploy the `dist` folder to any static hosting service:

```bash
npm run build
# Deploy contents of 'dist/' folder
```

## 📁 Project Structure

```
seacore-website/
├── src/
│   ├── components/     # React components
│   │   ├── layout/     # Navigation, footer, etc.
│   │   └── ui/         # Reusable UI components
│   ├── pages/          # Page components (Home, Solutions, etc.)
│   ├── styles/         # Global styles
│   ├── utils/          # Utility functions
│   └── types/          # TypeScript types
├── public/             # Static assets
│   ├── assets/         # Images, videos
│   └── seacore-logo.svg
├── netlify.toml        # Netlify configuration
└── vite.config.ts      # Vite configuration
```

## 🎨 Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3.3
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Routing**: React Router DOM 6
- **3D Graphics**: Three.js
- **Charts**: Recharts

## 🎯 Features

- ⚡ Lightning-fast performance with Vite
- 🎨 Maritime-inspired glassmorphism design
- 📱 Fully responsive (mobile-first)
- 🌙 Dark mode support
- ♿ WCAG 2.2 AA accessibility
- 🔍 AI search optimized (structured data)
- 📊 Interactive data visualizations
- 🎬 Immersive video backgrounds
- 🌐 SEO optimized

## 📊 Performance Targets

- First Contentful Paint: < 1.2s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Lighthouse Score: > 95

## 🔧 Development

### Environment

- Node.js 20 (specified in `.nvmrc`)
- npm 10+

### Scripts

```bash
npm run dev        # Start dev server (port 8000)
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run type-check # TypeScript type checking
```

### Code Quality

- TypeScript strict mode enabled
- ESLint configured
- Prettier formatting (recommended)

## 🌍 Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

## 📝 License

MIT License - Copyright © 2025 SeaCore

## 🤝 Contributing

This is the official SeaCore enterprise marketing website. For contributions or issues, please contact the development team.

## 📞 Support

- Website: [seacore.ai](https://seacore.ai)
- Email: support@seacore.ai

---

**Built with ❤️ by the SeaCore Team**

