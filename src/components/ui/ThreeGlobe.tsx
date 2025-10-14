import React from 'react'
import { VesselDashboardMockup } from './VesselDashboardMockup'

interface MacOSVesselDashboardProps {
  className?: string
  isDarkMode?: boolean
}

const MacOSVesselDashboard: React.FC<MacOSVesselDashboardProps> = ({ className, isDarkMode }) => {
  return <VesselDashboardMockup className={className} isDarkMode={isDarkMode} />
}

export { MacOSVesselDashboard as ThreeGlobe }