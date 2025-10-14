# SeaCore Website - Standalone Repository Setup

This document guides you through setting up the seacore-website as a standalone Git repository connected to GitHub.

## 📋 Current Status

✅ Configuration files created:
- package.json
- vite.config.ts
- tsconfig.json
- tsconfig.node.json
- tailwind.config.js
- postcss.config.js
- index.html
- .gitignore
- .nvmrc
- netlify.toml
- README.md

⏳ **Next Steps: Copy source files and set up Git**

---

## 🚀 Quick Setup (Run These Commands)

### Step 1: Copy Source Files

Run this command to copy all source files from seacore-enterprise-website:

```bash
cd "/Users/theo.georgiev/Library/CloudStorage/GoogleDrive-theo.georgiev@gmail.com/My Drive/Seacore/code project/naeon-marine-navigator"

# Copy src folder
cp -R ./seacore-enterprise-website/src ./seacore-website/

# Copy public folder
cp -R ./seacore-enterprise-website/public ./seacore-website/

echo "✅ Source files copied successfully!"
```

### Step 2: Install Dependencies

```bash
cd seacore-website
npm install
```

### Step 3: Test the Setup

```bash
npm run dev
```

Visit http://localhost:8000 to verify everything works!

---

## 🔧 Git Repository Setup

### Initialize Git Repository

```bash
cd "/Users/theo.georgiev/Library/CloudStorage/GoogleDrive-theo.georgiev@gmail.com/My Drive/Seacore/code project/naeon-marine-navigator/seacore-website"

# Initialize git
git init

# Add GitHub remote
git remote add origin https://github.com/naeonDevelopment/seacore-website.git

# Verify remote
git remote -v
```

### Create Initial Commit

```bash
# Stage all files (respects .gitignore)
git add .

# Create initial commit
git commit -m "Initial commit: SeaCore Website standalone repository

- React 18 + TypeScript + Vite setup
- Maritime-themed glassmorphism design
- Full dark mode support
- Responsive mobile-first design
- SEO optimized with structured data
- Video backgrounds and animations
- Netlify deployment ready"

# Push to GitHub
git push -u origin main
```

If the `main` branch doesn't exist on GitHub yet, you might need:

```bash
# Create and push to main branch
git branch -M main
git push -u origin main
```

---

## 📁 Directory Structure

After setup, your repository should look like:

```
seacore-website/
├── .git/                  # Git repository
├── .gitignore            # Git ignore rules
├── node_modules/         # Dependencies (not in git)
├── public/               # Static assets
│   ├── assets/          # Images and videos
│   └── seacore-logo.svg
├── src/                  # Source code
│   ├── components/      # React components
│   │   ├── layout/     # Navigation, etc.
│   │   └── ui/         # UI components
│   ├── pages/          # Page components
│   ├── styles/         # CSS files
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript config
├── tailwind.config.js   # Tailwind config
├── netlify.toml         # Netlify deployment
└── README.md            # Documentation
```

---

## 🌐 GitHub Repository Information

**Repository:** https://github.com/naeonDevelopment/seacore-website

**Remote URL:** `https://github.com/naeonDevelopment/seacore-website.git`

**Branch:** `main`

---

## 🎯 Verification Checklist

After setup, verify:

- [ ] All source files copied from seacore-enterprise-website
- [ ] Dependencies installed successfully (`node_modules/` exists)
- [ ] Dev server runs without errors (`npm run dev`)
- [ ] Website accessible at http://localhost:8000
- [ ] Git repository initialized (`.git/` folder exists)
- [ ] GitHub remote added (`git remote -v` shows origin)
- [ ] Initial commit created
- [ ] Code pushed to GitHub (`git push`)

---

## 🛠️ Available Commands

```bash
# Development
npm run dev          # Start dev server (port 8000)
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking

# Git Operations
git status           # Check repository status
git log             # View commit history
git push            # Push to GitHub
git pull            # Pull from GitHub
```

---

## 📝 Notes

1. **First Push**: If this is the first push, you may need to create the repository on GitHub first or ensure it's empty.

2. **Git Configuration**: Make sure your git is configured:
   ```bash
   git config user.name "Your Name"
   git config user.email "your.email@example.com"
   ```

3. **GitHub Authentication**: You may need to authenticate with GitHub. Use:
   - Personal Access Token (PAT)
   - SSH keys
   - GitHub CLI (`gh auth login`)

4. **Large Files**: The video files in `public/assets/` might be large. Consider using Git LFS if needed.

---

## 🚨 Troubleshooting

### Issue: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/naeonDevelopment/seacore-website.git
```

### Issue: "Permission denied" when pushing
- Check GitHub authentication
- Use HTTPS with Personal Access Token
- Or set up SSH keys

### Issue: Dependencies fail to install
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 8000 already in use
```bash
# Kill existing process
lsof -ti:8000 | xargs kill -9

# Or change port in vite.config.ts
```

---

## ✅ Success!

Once complete, your standalone seacore-website repository will be:
- ✅ Fully functional React application
- ✅ Connected to GitHub
- ✅ Ready for collaborative development
- ✅ Configured for Netlify deployment
- ✅ Independent of the main naeon-marine-navigator project

**Repository Link:** https://github.com/naeonDevelopment/seacore-website

---

**Need Help?** Check the main [README.md](./README.md) for development documentation.

