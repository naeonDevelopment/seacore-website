import React from 'react'

interface PlatformHeroBackgroundProps {
  isDarkMode: boolean
}

// Helper function to get asset path
const getAssetPath = (path: string) => {
  // Assets are always in /assets/
  return `/${path}`
}

export const PlatformHeroBackground: React.FC<PlatformHeroBackgroundProps> = ({ isDarkMode }) => {
  // Use Integration section image for hero
  const imageSrc = getAssetPath('assets/section_integrations/Generated Image October 06, 2025 - 5_16PM.png')

  return (
    <>
      {/* Static Image Background */}
      <div 
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url('${imageSrc}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          height: '110%',
          top: 0,
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
        style={{ 
          zIndex: 1,
          willChange: 'opacity',
          transform: 'translateZ(0)'
        }}
      />
    </>
  )
}
