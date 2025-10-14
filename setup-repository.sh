#!/bin/bash

# SeaCore Website - Standalone Repository Setup Script
# This script copies source files and sets up the Git repository

set -e  # Exit on error

echo "🚀 SeaCore Website - Standalone Repository Setup"
echo "================================================="
echo ""

# Define paths
PARENT_DIR="/Users/theo.georgiev/Library/CloudStorage/GoogleDrive-theo.georgiev@gmail.com/My Drive/Seacore/code project/naeon-marine-navigator"
SOURCE_DIR="$PARENT_DIR/seacore-enterprise-website"
TARGET_DIR="$PARENT_DIR/seacore-website"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ Error: Source directory not found: $SOURCE_DIR"
  exit 1
fi

# Change to parent directory
cd "$PARENT_DIR"

echo "📁 Step 1: Copying source files from seacore-enterprise-website..."
echo ""

# Copy src folder
if [ -d "$SOURCE_DIR/src" ]; then
  echo "  Copying src/ folder..."
  cp -R "$SOURCE_DIR/src" "$TARGET_DIR/"
  echo "  ✅ src/ copied"
else
  echo "  ❌ src/ folder not found"
  exit 1
fi

# Copy public folder
if [ -d "$SOURCE_DIR/public" ]; then
  echo "  Copying public/ folder..."
  cp -R "$SOURCE_DIR/public" "$TARGET_DIR/"
  echo "  ✅ public/ copied"
else
  echo "  ❌ public/ folder not found"
  exit 1
fi

echo ""
echo "✅ All source files copied successfully!"
echo ""

# Change to target directory
cd "$TARGET_DIR"

echo "📦 Step 2: Installing dependencies..."
echo ""
npm install

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

echo "🔧 Step 3: Setting up Git repository..."
echo ""

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
  git init
  echo "  ✅ Git repository initialized"
else
  echo "  ℹ️  Git repository already initialized"
fi

# Add GitHub remote
if ! git remote | grep -q "origin"; then
  git remote add origin https://github.com/naeonDevelopment/seacore-website.git
  echo "  ✅ GitHub remote added"
else
  echo "  ℹ️  GitHub remote already exists"
  git remote -v
fi

echo ""
echo "✅ Git repository configured!"
echo ""

echo "📊 Step 4: Checking repository status..."
echo ""
git status

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Your standalone seacore-website repository is ready!"
echo ""
echo "📍 Location: $TARGET_DIR"
echo "🌐 GitHub: https://github.com/naeonDevelopment/seacore-website"
echo ""
echo "🚀 Next Steps:"
echo "1. Test the website:"
echo "   npm run dev"
echo "   # Visit http://localhost:8000"
echo ""
echo "2. Create initial commit:"
echo "   git add ."
echo "   git commit -m \"Initial commit: SeaCore Website standalone repository\""
echo ""
echo "3. Push to GitHub:"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "📚 For more information, see SETUP_INSTRUCTIONS.md"
echo ""

