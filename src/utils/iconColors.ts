// Icon color strategy based on FleetCore's settings system
// Replicating the multi-color approach from OrganizationAwareSettings

export const getIconGradient = (categoryId: string) => {
  const categoryGradients = {
    'fleet': 'from-blue-500/70 to-indigo-600/70',           // Fleet management - blue/indigo
    'operations': 'from-emerald-500/70 to-teal-600/70',     // Operations - emerald/teal  
    'system': 'from-red-500/70 to-rose-600/70',             // System config - red/rose
    'intelligence': 'from-amber-500/70 to-orange-600/70',   // Intelligence - amber/orange
    'support': 'from-slate-500/70 to-gray-600/70',          // Support - slate/gray
    'mechanical': 'from-purple-500/70 to-violet-600/70',    // Mechanical systems - purple/violet
    'environmental': 'from-cyan-500/70 to-sky-600/70',      // Environmental systems - cyan/sky
    'auxiliary': 'from-pink-500/70 to-fuchsia-600/70',      // Auxiliary systems - pink/fuchsia
    'agentic-ai': 'from-blue-500/70 to-indigo-600/70',      // AI systems - blue/indigo
    'global-intelligence': 'from-emerald-500/70 to-teal-600/70', // Global intelligence - emerald/teal
    'regulatory': 'from-red-500/70 to-rose-600/70',         // Regulatory - red/rose
    'predictive': 'from-amber-500/70 to-orange-600/70',     // Predictive - amber/orange
    'multi-tenant': 'from-purple-500/70 to-violet-600/70',  // Multi-tenant - purple/violet
    'vendor-neutral': 'from-cyan-500/70 to-sky-600/70'      // Vendor neutral - cyan/sky
  };
  return categoryGradients[categoryId as keyof typeof categoryGradients] || 'from-gray-500/70 to-slate-600/70';
};

export const getIconColor = (categoryId: string) => {
  const iconColors = {
    'fleet': 'text-blue-600 dark:text-blue-400',
    'operations': 'text-emerald-600 dark:text-emerald-400',
    'system': 'text-red-600 dark:text-red-400',
    'intelligence': 'text-amber-600 dark:text-amber-400',
    'support': 'text-slate-600 dark:text-slate-400',
    'mechanical': 'text-purple-600 dark:text-purple-400',
    'environmental': 'text-cyan-600 dark:text-cyan-400',
    'auxiliary': 'text-pink-600 dark:text-pink-400',
    'agentic-ai': 'text-blue-600 dark:text-blue-400',
    'global-intelligence': 'text-emerald-600 dark:text-emerald-400',
    'regulatory': 'text-red-600 dark:text-red-400',
    'predictive': 'text-amber-600 dark:text-amber-400',
    'multi-tenant': 'text-purple-600 dark:text-purple-400',
    'vendor-neutral': 'text-cyan-600 dark:text-cyan-400'
  };
  return iconColors[categoryId as keyof typeof iconColors] || 'text-gray-600 dark:text-gray-400';
};

export const getIconBackgroundColor = (categoryId: string) => {
  const backgroundColors = {
    'fleet': 'bg-blue-100 dark:bg-blue-900/30',
    'operations': 'bg-emerald-100 dark:bg-emerald-900/30',
    'system': 'bg-red-100 dark:bg-red-900/30',
    'intelligence': 'bg-amber-100 dark:bg-amber-900/30',
    'support': 'bg-slate-100 dark:bg-slate-900/30',
    'mechanical': 'bg-purple-100 dark:bg-purple-900/30',
    'environmental': 'bg-cyan-100 dark:bg-cyan-900/30',
    'auxiliary': 'bg-pink-100 dark:bg-pink-900/30',
    'agentic-ai': 'bg-blue-100 dark:bg-blue-900/30',
    'global-intelligence': 'bg-emerald-100 dark:bg-emerald-900/30',
    'regulatory': 'bg-red-100 dark:bg-red-900/30',
    'predictive': 'bg-amber-100 dark:bg-amber-900/30',
    'multi-tenant': 'bg-purple-100 dark:bg-purple-900/30',
    'vendor-neutral': 'bg-cyan-100 dark:bg-cyan-900/30'
  };
  return backgroundColors[categoryId as keyof typeof backgroundColors] || 'bg-gray-100 dark:bg-gray-900/30';
};

