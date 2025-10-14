import React from 'react'

interface PlatformHeroBackgroundProps {
  isDarkMode: boolean
}

// Helper function to get asset path
const getAssetPath = (path: string) => {
  // In production, assets are in /site/assets/
  // In development, they're in /assets/
  const isProduction = import.meta.env.PROD
  return isProduction ? `/site/${path}` : `/${path}`
}

export const PlatformHeroBackground: React.FC<PlatformHeroBackgroundProps> = ({ isDarkMode }) => {
  // Use Platform hero image
  const imageSrc = getAssetPath('assets/hero_platform/Generated Image October 06, 2025 - 5_12PM.png')

  return (
    <>
      {/* Static Image Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('${imageSrc}')`,
          zIndex: 0
        }}
      />
      
      {/* Theme-aware gradient overlay for text readability */}
      <div 
        className={`absolute inset-0 ${
          isDarkMode 
            ? 'bg-gradient-to-b from-slate-900/30 via-slate-900/10 to-slate-900/30' 
            : 'bg-gradient-to-b from-white/40 via-white/15 to-white/40'
        }`}
        style={{ zIndex: 1 }}
      />
    </>
  )
}
