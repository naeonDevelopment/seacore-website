import React from 'react'

interface ContactHeroBackgroundProps {
  isDarkMode: boolean
}

// Helper function to get asset path
const getAssetPath = (path: string) => {
  // In production, assets are in /site/assets/
  // In development, they're in /assets/
  const isProduction = import.meta.env.PROD
  return isProduction ? `/site/${path}` : `/${path}`
}

export const ContactHeroBackground: React.FC<ContactHeroBackgroundProps> = ({ isDarkMode }) => {
  // Use Contact hero image
  const imageSrc = getAssetPath('assets/hero_contact/hero_contact.png')

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
            : 'bg-gradient-to-b from-white/70 via-white/40 to-white/70'
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

