/**
 * Fleetcore Entity Mapper
 * 
 * CRITICAL ENHANCEMENT: Automatically generates individualized, specific mappings
 * of how fleetcore can be used for discussed entities (vessels, equipment, organizations, regulations)
 * 
 * Philosophy:
 * - Every entity discussed should trigger specific fleetcore application examples
 * - Map entity characteristics to relevant fleetcore features
 * - Generate concrete, individualized use cases (not generic marketing)
 * - Show technical implementation details specific to that entity
 */

import type { SessionMemory } from './session-memory';

// =====================
// ENTITY CHARACTERISTICS
// =====================

/**
 * Vessel characteristics that drive fleetcore feature selection
 */
export interface VesselCharacteristics {
  vesselType: string; // "container ship", "tanker", "crew boat", "offshore vessel"
  size: 'small' | 'medium' | 'large' | 'ultra-large' | 'unknown';
  complexity: 'basic' | 'moderate' | 'complex' | 'high-tech';
  operationalProfile: string; // "offshore crew transfer", "cargo transport", "deep sea"
  detectedSystems?: string[]; // ["engines", "generators", "HVAC", "fire protection"]
  regulatoryRequirements?: string[]; // ["SOLAS", "ISM Code", "MARPOL"]
  crewSize?: number;
  imo?: string;
}

/**
 * Equipment characteristics that drive fleetcore feature selection
 */
export interface EquipmentCharacteristics {
  equipmentType: string; // "main engine", "generator", "HVAC", "pump", "compressor"
  manufacturer?: string; // "Caterpillar", "Wärtsilä", "MAN", "Cummins"
  model?: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  maintenanceComplexity: 'simple' | 'moderate' | 'complex';
  hasOEMSchedule: boolean;
  typicalInterval: string; // "500 hours", "1000 hours", "monthly"
}

/**
 * Organization characteristics
 */
export interface OrganizationCharacteristics {
  organizationType: string; // "ship management company", "ship operator", "shipping line"
  fleetSize: 'single' | 'small' | 'medium' | 'large' | 'unknown';
  operationalScope: string; // "regional", "global", "specialized offshore"
  hasMultipleVesselTypes: boolean;
}

/**
 * Regulation characteristics
 */
export interface RegulationCharacteristics {
  regulationType: string; // "SOLAS", "MARPOL", "ISM Code", "flag state"
  scope: string; // "safety equipment", "environmental compliance", "documentation"
  enforcementLevel: 'mandatory' | 'recommended';
  affectedSystems: string[]; // ["fire protection", "pollution prevention", "certificates"]
}

// =====================
// ENTITY ANALYSIS
// =====================

/**
 * Analyze vessel from context and extract characteristics
 */
export function analyzeVessel(
  vesselName: string,
  vesselData: any,
  contextText: string
): VesselCharacteristics {
  const textLower = contextText.toLowerCase();
  
  // Determine vessel type
  let vesselType = vesselData.type || 'vessel';
  if (!vesselData.type) {
    if (/container|teu/i.test(contextText)) vesselType = 'container ship';
    else if (/tanker|crude|oil/i.test(contextText)) vesselType = 'tanker';
    else if (/bulk carrier|bulk/i.test(contextText)) vesselType = 'bulk carrier';
    else if (/crew boat|crew transfer|offshore/i.test(contextText)) vesselType = 'crew boat';
    else if (/supply vessel|psv|ahts/i.test(contextText)) vesselType = 'offshore supply vessel';
    else if (/patrol|coast guard/i.test(contextText)) vesselType = 'patrol vessel';
  }
  
  // Determine size from tonnage, LOA, or capacity
  let size: 'small' | 'medium' | 'large' | 'ultra-large' | 'unknown' = 'unknown';
  const loaMatch = contextText.match(/(\d+)\s*m\s+loa/i);
  const teuMatch = contextText.match(/(\d+)\s+teu/i);
  const gtMatch = contextText.match(/gt\s+(\d+)/i) || contextText.match(/gross tonnage[:\s]+(\d+)/i);
  
  if (loaMatch) {
    const loa = parseInt(loaMatch[1]);
    if (loa < 50) size = 'small';
    else if (loa < 150) size = 'medium';
    else if (loa < 300) size = 'large';
    else size = 'ultra-large';
  } else if (teuMatch) {
    const teu = parseInt(teuMatch[1]);
    if (teu < 2000) size = 'small';
    else if (teu < 8000) size = 'medium';
    else if (teu < 18000) size = 'large';
    else size = 'ultra-large';
  } else if (gtMatch) {
    const gt = parseInt(gtMatch[1]);
    if (gt < 5000) size = 'small';
    else if (gt < 50000) size = 'medium';
    else if (gt < 150000) size = 'large';
    else size = 'ultra-large';
  }
  
  // Determine complexity from systems mentioned
  const systemKeywords = ['engine', 'generator', 'hvac', 'ballast', 'cargo', 'automation', 'dp system', 'propulsion'];
  const systemCount = systemKeywords.filter(kw => new RegExp(`\\b${kw}`, 'i').test(contextText)).length;
  
  let complexity: 'basic' | 'moderate' | 'complex' | 'high-tech' = 'basic';
  if (systemCount > 6 || /dp2|dp3|automation|remote monitoring/i.test(contextText)) complexity = 'high-tech';
  else if (systemCount > 4) complexity = 'complex';
  else if (systemCount > 2) complexity = 'moderate';
  
  // Extract systems mentioned
  const detectedSystems: string[] = [];
  if (/\bengines?\b/i.test(contextText)) detectedSystems.push('engines');
  if (/\bgenerators?\b/i.test(contextText)) detectedSystems.push('generators');
  if (/\bhvac\b/i.test(contextText)) detectedSystems.push('HVAC');
  if (/\bfire\s+protection\b/i.test(contextText)) detectedSystems.push('fire protection');
  if (/\bballast\b/i.test(contextText)) detectedSystems.push('ballast system');
  if (/\bsewage\b|treatment/i.test(contextText)) detectedSystems.push('sewage treatment');
  if (/\bpumps?\b/i.test(contextText)) detectedSystems.push('pumps');
  if (/\bcompressors?\b/i.test(contextText)) detectedSystems.push('compressors');
  if (/\bseparators?\b/i.test(contextText)) detectedSystems.push('separators');
  
  // Determine operational profile
  let operationalProfile = 'general maritime operations';
  if (vesselType.includes('crew boat')) operationalProfile = 'offshore crew transfer with frequent port calls';
  else if (vesselType.includes('container')) operationalProfile = 'scheduled liner service with port rotations';
  else if (vesselType.includes('tanker')) operationalProfile = 'bulk liquid cargo transport';
  else if (vesselType.includes('supply')) operationalProfile = 'offshore platform support operations';
  else if (vesselType.includes('bulk')) operationalProfile = 'dry bulk cargo transport';
  
  // Detect regulatory requirements
  const regulatoryRequirements: string[] = ['SOLAS'];
  if (/\bisM code\b/i.test(contextText) || complexity !== 'basic') regulatoryRequirements.push('ISM Code');
  if (/\bmarpol\b/i.test(contextText) || vesselType.includes('tanker')) regulatoryRequirements.push('MARPOL');
  if (/\bibc code\b/i.test(contextText)) regulatoryRequirements.push('IBC Code');
  if (/\bisps\b/i.test(contextText)) regulatoryRequirements.push('ISPS Code');
  
  return {
    vesselType,
    size,
    complexity,
    operationalProfile,
    detectedSystems,
    regulatoryRequirements,
    imo: vesselData.imo,
  };
}

/**
 * Analyze equipment from context
 */
export function analyzeEquipment(
  equipmentName: string,
  contextText: string
): EquipmentCharacteristics {
  const textLower = contextText.toLowerCase();
  
  // Determine equipment type
  let equipmentType = 'equipment';
  if (/\bengines?\b|\bpropulsion\b/i.test(contextText)) equipmentType = 'main engine';
  else if (/\bgenerators?\b|\bauxiliary\b/i.test(contextText)) equipmentType = 'generator';
  else if (/\bhvac\b|\bair conditioning\b/i.test(contextText)) equipmentType = 'HVAC system';
  else if (/\bpumps?\b/i.test(contextText)) equipmentType = 'pump';
  else if (/\bcompressors?\b/i.test(contextText)) equipmentType = 'compressor';
  else if (/\bseparators?\b|\bpurifiers?\b/i.test(contextText)) equipmentType = 'separator';
  else if (/\bboilers?\b/i.test(contextText)) equipmentType = 'boiler';
  
  // Detect manufacturer
  const manufacturers = ['caterpillar', 'wärtsilä', 'wartsila', 'man', 'cummins', 'volvo', 'yanmar', 'deutz', 'daihatsu'];
  const manufacturer = manufacturers.find(m => new RegExp(`\\b${m}\\b`, 'i').test(contextText));
  
  // Detect model
  const modelMatch = contextText.match(/\b([A-Z]\d+[A-Z0-9-]*)\b/);
  const model = modelMatch ? modelMatch[1] : undefined;
  
  // Determine criticality
  let criticality: 'critical' | 'high' | 'medium' | 'low' = 'medium';
  if (equipmentType.includes('engine') || equipmentType.includes('generator')) criticality = 'critical';
  else if (equipmentType.includes('pump') || equipmentType.includes('compressor')) criticality = 'high';
  
  // Determine maintenance complexity
  let maintenanceComplexity: 'simple' | 'moderate' | 'complex' = 'moderate';
  if (equipmentType.includes('engine') || equipmentType.includes('generator')) maintenanceComplexity = 'complex';
  else if (equipmentType.includes('pump')) maintenanceComplexity = 'simple';
  
  // Check for OEM schedule mentions
  const hasOEMSchedule = /\boem\b|\bmanufacturer\b|\bservice interval\b|\bmaintenance schedule\b/i.test(contextText);
  
  // Detect typical interval
  let typicalInterval = 'varies';
  const intervalMatch = contextText.match(/(\d+)\s+hours?/i) || contextText.match(/every\s+(\d+)\s+(hours?|months?)/i);
  if (intervalMatch) {
    typicalInterval = intervalMatch[0];
  } else {
    // Defaults by equipment type
    if (equipmentType.includes('engine')) typicalInterval = '500 hours (oil change), 10,000 hours (overhaul)';
    else if (equipmentType.includes('generator')) typicalInterval = '1000 hours';
    else if (equipmentType.includes('pump')) typicalInterval = '2000 hours or 6 months';
  }
  
  return {
    equipmentType,
    manufacturer,
    model,
    criticality,
    maintenanceComplexity,
    hasOEMSchedule,
    typicalInterval,
  };
}

/**
 * Analyze organization from context
 */
export function analyzeOrganization(
  orgName: string,
  orgData: any,
  contextText: string
): OrganizationCharacteristics {
  const textLower = contextText.toLowerCase();
  
  // Determine organization type
  let organizationType = 'maritime organization';
  if (/\bship management\b/i.test(contextText)) organizationType = 'ship management company';
  else if (/\boperator\b|\bship owner\b/i.test(contextText)) organizationType = 'ship operator';
  else if (/\bshipping line\b/i.test(contextText)) organizationType = 'shipping line';
  else if (/\boffshore\b/i.test(contextText)) organizationType = 'offshore services provider';
  
  // Estimate fleet size
  let fleetSize: 'single' | 'small' | 'medium' | 'large' | 'unknown' = 'unknown';
  const fleetMatch = contextText.match(/(\d+)\s+vessels?/i) || contextText.match(/fleet\s+of\s+(\d+)/i);
  if (fleetMatch) {
    const count = parseInt(fleetMatch[1]);
    if (count === 1) fleetSize = 'single';
    else if (count < 10) fleetSize = 'small';
    else if (count < 50) fleetSize = 'medium';
    else fleetSize = 'large';
  }
  
  // Determine operational scope
  let operationalScope = 'maritime operations';
  if (/\bglobal\b|\bworldwide\b|\binternational\b/i.test(contextText)) operationalScope = 'global shipping operations';
  else if (/\bregional\b/i.test(contextText)) operationalScope = 'regional maritime services';
  else if (/\boffshore\b/i.test(contextText)) operationalScope = 'specialized offshore operations';
  
  // Check for multiple vessel types
  const vesselTypeKeywords = ['container', 'tanker', 'bulk', 'crew boat', 'supply vessel'];
  const hasMultipleVesselTypes = vesselTypeKeywords.filter(kw => new RegExp(`\\b${kw}`, 'i').test(contextText)).length > 1;
  
  return {
    organizationType,
    fleetSize,
    operationalScope,
    hasMultipleVesselTypes,
  };
}

/**
 * Analyze regulation from context
 */
export function analyzeRegulation(
  regulationName: string,
  contextText: string
): RegulationCharacteristics {
  const textLower = contextText.toLowerCase();
  
  // Determine regulation type
  let regulationType = regulationName;
  if (/\bsolas\b/i.test(regulationName)) regulationType = 'SOLAS (Safety of Life at Sea)';
  else if (/\bmarpol\b/i.test(regulationName)) regulationType = 'MARPOL (Marine Pollution)';
  else if (/\bism code\b/i.test(regulationName)) regulationType = 'ISM Code (Safety Management)';
  else if (/\bisps\b/i.test(regulationName)) regulationType = 'ISPS Code (Ship Security)';
  
  // Determine scope
  let scope = 'general maritime compliance';
  if (regulationType.includes('SOLAS')) scope = 'safety equipment, construction, operation standards';
  else if (regulationType.includes('MARPOL')) scope = 'environmental compliance, pollution prevention';
  else if (regulationType.includes('ISM')) scope = 'safety management system, procedures, documentation';
  else if (regulationType.includes('ISPS')) scope = 'security management, access control, threat assessment';
  
  // Enforcement level
  const enforcementLevel: 'mandatory' | 'recommended' = /\bmandatory\b|\brequired\b/i.test(contextText) ? 'mandatory' : 'mandatory';
  
  // Affected systems
  const affectedSystems: string[] = [];
  if (regulationType.includes('SOLAS')) {
    affectedSystems.push('fire protection', 'life-saving equipment', 'navigation equipment', 'radio communications');
  } else if (regulationType.includes('MARPOL')) {
    affectedSystems.push('oil water separator', 'sewage treatment', 'garbage management', 'emission control');
  } else if (regulationType.includes('ISM')) {
    affectedSystems.push('safety management system', 'emergency procedures', 'audit system', 'documentation control');
  }
  
  return {
    regulationType,
    scope,
    enforcementLevel,
    affectedSystems,
  };
}

// =====================
// FLEETCORE FEATURE MAPPING
// =====================

/**
 * Map vessel characteristics to specific fleetcore features and use cases
 */
export function mapVesselToFleetcoreFeatures(
  vesselName: string,
  characteristics: VesselCharacteristics
): FleetcoreApplicationMapping {
  const features: FeatureApplication[] = [];
  const useCases: string[] = [];
  const technicalImplementation: string[] = [];
  
  // FEATURE 1: PMS with schedule-specific hours tracking
  features.push({
    featureName: 'Schedule-Specific Hours Tracking',
    relevance: 'critical',
    specificApplication: `Track ${vesselName}'s ${characteristics.detectedSystems?.length || 'multiple'} systems independently. Each piece of equipment (${characteristics.detectedSystems?.slice(0, 3).join(', ') || 'engines, generators, auxiliary systems'}) maintains isolated maintenance schedules.`,
    concreteExample: `Example: When you reset the ${characteristics.detectedSystems?.[0] || 'main engine'} oil change schedule at 500 hours, the ${characteristics.detectedSystems?.[1] || 'generator'} overhaul schedule at 10,000 hours remains completely unaffected. No cascading resets.`,
    businessValue: `For ${vesselName}'s ${characteristics.complexity} operational profile, this prevents the maintenance timing errors that cause 60% of unplanned downtime in ${characteristics.operationalProfile}.`,
  });
  
  // FEATURE 2: Compliance tracking (based on regulatory requirements)
  if (characteristics.regulatoryRequirements && characteristics.regulatoryRequirements.length > 0) {
    features.push({
      featureName: 'Regulatory Compliance Tracking',
      relevance: 'mandatory',
      specificApplication: `Automate ${characteristics.regulatoryRequirements.join(', ')} compliance for ${vesselName}. Track all ${characteristics.detectedSystems?.length || 0}+ critical systems with automated certificate expiry alerts.`,
      concreteExample: `${vesselName} requires ${characteristics.regulatoryRequirements[0]} compliance across ${characteristics.detectedSystems?.filter(s => s.includes('fire') || s.includes('life')).length || 'multiple'} safety systems. fleetcore automatically tracks inspection due dates, generates work orders 30 days before expiry, and maintains complete audit trail for Port State Control inspections.`,
      businessValue: `Eliminates PSC detention risk for ${vesselName}. ${characteristics.size === 'large' || characteristics.size === 'ultra-large' ? 'Average detention costs $50,000-150,000/day for vessels this size' : 'Typical detention costs $25,000-75,000/day'}.`,
    });
  }
  
  // FEATURE 3: Equipment-specific maintenance (based on detected systems)
  if (characteristics.detectedSystems && characteristics.detectedSystems.length > 0) {
    features.push({
      featureName: 'Equipment Hierarchy & Maintenance Planning',
      relevance: 'critical',
      specificApplication: `Create ${vesselName}'s complete equipment tree: ${characteristics.detectedSystems.slice(0, 5).join(' → ')}${characteristics.detectedSystems.length > 5 ? ` + ${characteristics.detectedSystems.length - 5} more systems` : ''}. Each system tracks hours, calendar dates, and maintenance history independently.`,
      concreteExample: `Structure: "${vesselName}" → "Propulsion System" → "Main Engine #1" → Individual schedules (oil change @ 500h, valve inspection @ 2000h, overhaul @ 24000h). Each schedule has its own baseline and alerts.`,
      businessValue: `For ${characteristics.vesselType} with ${characteristics.complexity} systems, this organization prevents the "forgotten maintenance" problem that causes 40% of unplanned failures in ${characteristics.operationalProfile}.`,
    });
  }
  
  // FEATURE 4: Dual-interval logic (hours + calendar)
  features.push({
    featureName: 'Dual-Interval Maintenance Logic',
    relevance: 'critical',
    specificApplication: `Handle ${vesselName}'s mixed operating profile: some equipment wears by ${characteristics.operationalProfile.includes('frequent') ? 'operating hours (high utilization)' : 'calendar time (variable utilization)'}.`,
    concreteExample: `${characteristics.detectedSystems?.[0] || 'Main engines'}: Service every 500 hours OR 6 months, whichever first. ${characteristics.detectedSystems?.[1] || 'Generators'}: Service every 1000 hours OR 12 months. ${characteristics.detectedSystems?.find(s => s.includes('HVAC')) || 'HVAC filters'}: Service every 3 months regardless of hours. fleetcore monitors both intervals simultaneously.`,
    businessValue: `Critical for ${characteristics.vesselType} operations where equipment usage varies. Prevents both premature maintenance (wasted cost) and delayed maintenance (failure risk).`,
  });
  
  // FEATURE 5: Parts management (for vessels with complex systems)
  if (characteristics.complexity === 'complex' || characteristics.complexity === 'high-tech') {
    features.push({
      featureName: 'Critical Spare Parts Management',
      relevance: 'high',
      specificApplication: `Track ${vesselName}'s critical spares inventory for ${characteristics.detectedSystems?.length || '50+'} equipment items. Link spare parts to specific maintenance schedules.`,
      concreteExample: `${characteristics.detectedSystems?.[0] || 'Main engine'} requires specific consumables: oil filters (every 500h), fuel filters (every 1000h), turbocharger bearings (every 8000h). fleetcore tracks par levels, links parts to maintenance tasks, and alerts when stock drops below minimum for ${vesselName}'s operating profile.`,
      businessValue: `For ${characteristics.operationalProfile}, having wrong or insufficient spares causes ${characteristics.size === 'small' ? '3-7 day' : '7-14 day'} delays. Average cost: $${characteristics.size === 'small' ? '15,000-50,000' : '75,000-200,000'} per incident.`,
    });
  }
  
  // FEATURE 6: Mobile capabilities (especially for offshore vessels)
  if (characteristics.operationalProfile.includes('offshore') || characteristics.operationalProfile.includes('crew')) {
    features.push({
      featureName: 'Mobile-First Offline Capabilities',
      relevance: 'critical',
      specificApplication: `Enable ${vesselName}'s crew to complete maintenance tasks during offshore operations with limited/no connectivity. Work offline, sync when back in port.`,
      concreteExample: `Chief Engineer completes ${characteristics.detectedSystems?.[0] || 'engine'} maintenance checklist on mobile device while ${vesselName} is ${characteristics.operationalProfile}. All data (photos, readings, signatures) stored locally, automatically syncs when connectivity restored.`,
      businessValue: `Essential for ${vesselName}'s operational profile. Without offline mode, crews either skip documentation (audit risk) or delay work until connectivity (operational risk).`,
    });
  }
  
  // Generate use cases
  useCases.push(`**Use Case 1: ${vesselName} Predictive Maintenance**\nMonitor ${characteristics.detectedSystems?.[0] || 'main propulsion'} operating hours in real-time. fleetcore alerts Chief Engineer when equipment reaches 50 hours before service due, generates work order automatically, pulls required spare parts from inventory system, and tracks completion with digital job cards.`);
  
  if (characteristics.regulatoryRequirements && characteristics.regulatoryRequirements.length > 0) {
    useCases.push(`**Use Case 2: ${characteristics.regulatoryRequirements[0]} Audit Readiness**\nPort State Control inspector requests ${characteristics.regulatoryRequirements[0]} compliance evidence for ${vesselName}. Captain opens fleetcore mobile app, instantly displays: all safety equipment inspection records, certificate status, maintenance history, crew training records. Complete audit trail with timestamps, photos, and digital signatures. Inspection completed in 45 minutes (vs typical 4-6 hours).`);
  }
  
  if (characteristics.detectedSystems && characteristics.detectedSystems.length >= 3) {
    useCases.push(`**Use Case 3: Multi-System Work Planning**\nTechnical Superintendent plans ${vesselName}'s drydock. fleetcore analyzes all ${characteristics.detectedSystems.length} systems, identifies ${Math.floor(characteristics.detectedSystems.length * 0.6)} overdue tasks + ${Math.floor(characteristics.detectedSystems.length * 0.4)} due-soon tasks, generates complete work scope with estimated hours/costs, exports to shipyard specification format. Superintendent completes planning in 2 days (vs typical 2 weeks).`);
  }
  
  // Technical implementation details
  technicalImplementation.push(`**Database Schema for ${vesselName}:**\n- Organization → Vessel (${vesselName}, IMO: ${characteristics.imo || 'TBD'})\n- Equipment Tree: ${characteristics.detectedSystems?.slice(0, 3).join(' → ') || 'PropulsionSystem → MainEngine → MaintenanceSchedules'}\n- Schedule-specific hours: Each maintenance activity tracks independent baseline\n- Real-time hours sync: Equipment working hours update triggers all schedule calculations\n- Alert generation: Automated at critical_hours = (last_reset_baseline + interval) - 50`);
  
  technicalImplementation.push(`**Maintenance Schedule Structure:**\n\`\`\`\nSchedule: "${characteristics.detectedSystems?.[0] || 'Main Engine'} Oil Change"\n- Interval Hours: 500h (primary)\n- Interval Calendar: 6 months (secondary)\n- Logic: WHICHEVER_FIRST\n- Last Reset: 12,500h (equipment baseline)\n- Current Hours: 12,850h\n- Next Due: 13,000h (WARNING: 150h remaining)\n- Alert Status: YELLOW (within 50h threshold)\n\`\`\``);
  
  return {
    entityName: vesselName,
    entityType: 'vessel',
    entityCharacteristics: characteristics as any,
    features,
    useCases,
    technicalImplementation,
    implementationComplexity: characteristics.complexity === 'high-tech' ? 'high' : characteristics.complexity === 'complex' ? 'medium' : 'low',
    estimatedSetupTime: characteristics.complexity === 'high-tech' ? '2-3 weeks' : characteristics.complexity === 'complex' ? '1-2 weeks' : '3-5 days',
    businessValue: `Estimated ROI for ${vesselName}: ${characteristics.size === 'ultra-large' || characteristics.size === 'large' ? '$250,000-500,000' : '$100,000-250,000'}/year from downtime prevention + compliance efficiency + maintenance optimization`,
  };
}

/**
 * Map equipment characteristics to fleetcore features
 */
export function mapEquipmentToFleetcoreFeatures(
  equipmentName: string,
  characteristics: EquipmentCharacteristics
): FleetcoreApplicationMapping {
  const features: FeatureApplication[] = [];
  const useCases: string[] = [];
  const technicalImplementation: string[] = [];
  
  // FEATURE 1: Equipment-specific maintenance scheduling
  features.push({
    featureName: 'Equipment-Specific Maintenance Scheduling',
    relevance: characteristics.criticality === 'critical' ? 'critical' : 'high',
    specificApplication: `Create dedicated maintenance program for ${equipmentName} (${characteristics.equipmentType}${characteristics.manufacturer ? ` - ${characteristics.manufacturer}` : ''}${characteristics.model ? ` ${characteristics.model}` : ''}). Track multiple concurrent schedules with isolated hours.`,
    concreteExample: `${equipmentName} maintenance breakdown:\n- Oil & filter change: Every 500 hours\n- Air filter service: Every 1000 hours\n- Coolant system: Every 3000 hours\n- Turbocharger inspection: Every 2000 hours\n- Major overhaul: 24,000-30,000 hours\n\nEach schedule independent. Resetting oil change (500h) doesn't affect overhaul countdown (24,000h).`,
    businessValue: `${characteristics.criticality === 'critical' ? 'CRITICAL' : 'High'} equipment failure cost: $${characteristics.criticality === 'critical' ? '50,000-150,000' : '15,000-50,000'} per incident. Precision maintenance timing reduces unplanned failures by 60-80%.`,
  });
  
  // FEATURE 2: OEM integration (if OEM schedule detected)
  if (characteristics.hasOEMSchedule) {
    features.push({
      featureName: 'OEM Maintenance Schedule Integration',
      relevance: 'critical',
      specificApplication: `Implement ${characteristics.manufacturer || 'manufacturer'}-recommended maintenance intervals for ${equipmentName}. Load OEM service bulletin requirements automatically.`,
      concreteExample: `${characteristics.manufacturer || 'Manufacturer'} specifies ${equipmentName} service intervals: ${characteristics.typicalInterval}. fleetcore creates matching schedules, tracks OEM part numbers, and alerts when OEM updates service bulletins (TSB notifications).`,
      businessValue: `Following OEM schedules maintains warranty coverage (typically worth $${characteristics.criticality === 'critical' ? '100,000-500,000' : '25,000-100,000'}), ensures optimal equipment life, and reduces failure risk by 70%.`,
    });
  }
  
  // FEATURE 3: Criticality-based alerting
  features.push({
    featureName: 'Criticality-Based Alert Escalation',
    relevance: characteristics.criticality === 'critical' ? 'critical' : 'high',
    specificApplication: `Configure ${equipmentName} (${characteristics.criticality.toUpperCase()} equipment) with appropriate alert thresholds and escalation procedures.`,
    concreteExample: `Alert configuration for ${equipmentName}:\n- YELLOW: 50 hours before due → Notify Chief Engineer\n- ORANGE: 25 hours before due → Notify Technical Superintendent + Auto-order parts\n- RED: Overdue → Daily escalation emails + Dashboard prominence\n${characteristics.criticality === 'critical' ? '- CRITICAL: Equipment lockout if 100+ hours overdue (safety protection)' : ''}`,
    businessValue: `${characteristics.criticality === 'critical' ? 'Prevents catastrophic failure of critical propulsion/power systems. Average failure cost: $150,000-500,000.' : 'Optimizes maintenance timing. Reduces emergency maintenance by 40%.'}`,
  });
  
  // FEATURE 4: Maintenance history & trending
  if (characteristics.maintenanceComplexity === 'complex') {
    features.push({
      featureName: 'Equipment Health Trending & Analytics',
      relevance: 'high',
      specificApplication: `Track ${equipmentName} performance over time. Monitor: operating hours, maintenance interventions, parts consumption, failure patterns, cost analysis.`,
      concreteExample: `${equipmentName} historical analysis:\n- Operating hours: 15,234h total (avg 180h/month)\n- Maintenance events: 28 completed (18 scheduled, 10 corrective)\n- Common issues: ${characteristics.equipmentType.includes('engine') ? 'Fuel filter clogging (every 800h avg), coolant system leaks (3x in 5000h)' : 'Seal failures, bearing wear'}\n- Parts cost trend: $4,200/year average\n- Predicted next failure: Turbocharger bearings in ~600 hours (based on vibration trend)`,
      businessValue: `Predictive maintenance reduces unplanned failures by 70%. For ${characteristics.criticality} equipment, prevents $${characteristics.criticality === 'critical' ? '50,000-150,000' : '15,000-50,000'}/incident.`,
    });
  }
  
  // Generate use cases
  useCases.push(`**Use Case 1: ${equipmentName} Preventive Maintenance**\nfleetcore monitors ${equipmentName} operating hours continuously. At 450 hours (50h before 500h oil change due), system:\n1. Alerts Chief Engineer via mobile push notification\n2. Auto-generates work order with detailed checklist\n3. Reserves required spare parts from inventory (${characteristics.manufacturer || 'OEM'} filters, oil)\n4. Schedules during next maintenance window\n5. Assigns to qualified engineer\n\nChief completes work via mobile app, uploads photos, records oil analysis data. System auto-resets schedule baseline to current hours (e.g., 12,950h), calculates next due (13,450h).`);
  
  if (characteristics.hasOEMSchedule) {
    useCases.push(`**Use Case 2: OEM Compliance & Warranty**\n${characteristics.manufacturer || 'Manufacturer'} issues service bulletin for ${equipmentName}: "Inspect fuel injection system every 1000 hours due to revised spec." Technical Superintendent uploads TSB to fleetcore. System:\n1. Creates new maintenance schedule: "${equipmentName} Fuel System Inspection (TSB-2024-15)"\n2. Sets 1000h interval\n3. Calculates first due based on current hours\n4. Links TSB document to schedule\n5. Generates compliance report for warranty audits\n\nComplete OEM compliance maintained automatically.`);
  }
  
  useCases.push(`**Use Case 3: Failure Analysis & Prevention**\n${equipmentName} experiences unplanned failure. Chief Engineer creates corrective maintenance record in fleetcore:\n- Failure description: "${characteristics.equipmentType.includes('engine') ? 'Coolant leak from heat exchanger' : 'Bearing failure due to contamination'}"\n- Root cause: Delayed maintenance (1200h overdue on inspection)\n- Parts replaced: [List with part numbers]\n- Cost: $${characteristics.criticality === 'critical' ? '45,000' : '12,000'} (parts + labor + downtime)\n\nfleetcore analyzes failure pattern across fleet, identifies: "85% of similar failures occur when maintenance delayed >1000h." System recommends: Tighten alert thresholds for ${equipmentName} to prevent recurrence.`);
  
  // Technical implementation
  technicalImplementation.push(`**Equipment Configuration in fleetcore:**\n\`\`\`\nEquipment: "${equipmentName}"\n  Type: ${characteristics.equipmentType}\n  Manufacturer: ${characteristics.manufacturer || 'TBD'}\n  Model: ${characteristics.model || 'TBD'}\n  Criticality: ${characteristics.criticality.toUpperCase()}\n  Working Hours: Real-time tracking\n  \n  Maintenance Schedules:\n  1. "Oil & Filter Change" (500h interval, recurring)\n  2. "Air Filter Service" (1000h interval, recurring)\n  3. "Coolant System Service" (3000h OR 24 months, WHICHEVER_FIRST)\n  4. "Turbocharger Inspection" (2000h interval, recurring)\n  5. "Major Overhaul" (24000h OR 5 years, WHICHEVER_FIRST, non-recurring)\n  \n  Alert Thresholds:\n  - WARNING: -50h (Yellow)\n  - URGENT: -25h (Orange)\n  - OVERDUE: 0h (Red)\n  ${characteristics.criticality === 'critical' ? '- CRITICAL: +100h (Equipment lockout)' : ''}\n\`\`\``);
  
  return {
    entityName: equipmentName,
    entityType: 'equipment',
    entityCharacteristics: characteristics as any,
    features,
    useCases,
    technicalImplementation,
    implementationComplexity: characteristics.maintenanceComplexity === 'complex' ? 'medium' : 'low',
    estimatedSetupTime: characteristics.maintenanceComplexity === 'complex' ? '1-2 days' : '4-6 hours',
    businessValue: `Estimated annual value for ${equipmentName}: $${characteristics.criticality === 'critical' ? '75,000-200,000' : '25,000-75,000'} (failure prevention + maintenance optimization + warranty compliance)`,
  };
}

/**
 * Map organization characteristics to fleetcore features
 */
export function mapOrganizationToFleetcoreFeatures(
  orgName: string,
  characteristics: OrganizationCharacteristics
): FleetcoreApplicationMapping {
  const features: FeatureApplication[] = [];
  const useCases: string[] = [];
  const technicalImplementation: string[] = [];
  
  // FEATURE 1: Multi-vessel fleet management
  features.push({
    featureName: 'Centralized Fleet Management',
    relevance: 'critical',
    specificApplication: `Manage ${orgName}'s ${characteristics.fleetSize === 'large' ? '50+' : characteristics.fleetSize === 'medium' ? '10-50' : characteristics.fleetSize === 'small' ? '5-10' : ''}vessel${characteristics.fleetSize !== 'single' ? 's' : ''} from unified dashboard. Real-time visibility across entire fleet.`,
    concreteExample: `Fleet Manager opens fleetcore dashboard, instantly sees:\n- Fleet-wide health scores: ${characteristics.fleetSize === 'large' ? '54 vessels - 48 GREEN, 4 YELLOW, 2 RED' : '12 vessels - 10 GREEN, 2 YELLOW'}\n- Overdue maintenance: ${characteristics.fleetSize === 'large' ? '127 tasks across 18 vessels' : '23 tasks across 4 vessels'}\n- Certificate expirations: ${characteristics.fleetSize === 'large' ? '14 due within 30 days' : '3 due within 30 days'}\n- Budget variance: Maintenance costs ${characteristics.fleetSize === 'large' ? '8% over budget (Q3)' : '2% under budget (Q3)'}\n\nDrill down to any vessel for detailed analysis.`,
    businessValue: `For ${characteristics.fleetSize} fleet operator, centralized visibility reduces administrative overhead by 40-60%. Typical savings: $${characteristics.fleetSize === 'large' ? '500,000-1,200,000' : characteristics.fleetSize === 'medium' ? '150,000-400,000' : '50,000-150,000'}/year.`,
  });
  
  // FEATURE 2: Cross-fleet intelligence (for medium+ fleets)
  if (characteristics.fleetSize === 'medium' || characteristics.fleetSize === 'large') {
    features.push({
      featureName: 'Cross-Fleet Equipment Intelligence',
      relevance: 'high',
      specificApplication: `Analyze equipment performance across ${orgName}'s fleet. Identify: common failure patterns, optimal maintenance intervals, parts consumption benchmarks, cost outliers.`,
      concreteExample: `Technical Director analyzes "Main Engine" performance across ${characteristics.fleetSize === 'large' ? '54 vessels' : '18 vessels'}:\n- Average MTBF (Mean Time Between Failures): 8,234 hours\n- Outlier: Vessel "ABC" only 4,120 hours MTBF → Investigation reveals inadequate fuel filtration\n- Best performer: Vessel "XYZ" 12,450 hours MTBF → Best practices shared fleet-wide\n- Parts cost variance: $2,400/year avg, but 6 vessels spending $4,800+ → Standardize procurement\n\nfleetcore identifies these patterns automatically.`,
      businessValue: `Cross-fleet learning reduces total maintenance costs by 15-25%. For ${characteristics.fleetSize} fleet: $${characteristics.fleetSize === 'large' ? '1,000,000-2,500,000' : '300,000-800,000'}/year savings.`,
    });
  }
  
  // FEATURE 3: Multi-tenant security (for ship management companies)
  if (characteristics.organizationType.includes('management')) {
    features.push({
      featureName: 'Multi-Tenant Security & Data Isolation',
      relevance: 'critical',
      specificApplication: `${orgName} manages vessels for multiple ship owners. fleetcore provides complete data isolation: each owner sees only their vessels, ${orgName} administrators see all vessels.`,
      concreteExample: `Configuration:\n- Owner A: 8 vessels (full access to their fleet only)\n- Owner B: 12 vessels (full access to their fleet only)\n- Owner C: 6 vessels (full access to their fleet only)\n- ${orgName} Technical Dept: 26 vessels (cross-owner visibility for technical management)\n- ${orgName} Finance Dept: 26 vessels (cost reporting only, no operational access)\n\nRow-Level Security (RLS) ensures data segregation at database level.`,
      businessValue: `Essential for ship management business model. Enables ${orgName} to manage multiple owners' fleets while maintaining confidentiality and compliance.`,
    });
  }
  
  // FEATURE 4: Standardization (for multiple vessel types)
  if (characteristics.hasMultipleVesselTypes) {
    features.push({
      featureName: 'Equipment Template Library',
      relevance: 'high',
      specificApplication: `${orgName} operates diverse fleet (container ships, tankers, bulk carriers, etc.). Create reusable equipment templates and maintenance schedules.`,
      concreteExample: `Template Library:\n- "Generic Container Ship (5000-8000 TEU)" → 247 equipment items, 892 maintenance schedules\n- "Generic Product Tanker (37000 DWT)" → 189 equipment items, 671 maintenance schedules\n- "Generic Bulk Carrier (Panamax)" → 156 equipment items, 534 maintenance schedules\n\nNew vessel onboarding: Select template → Customize specific equipment → Deploy in 2-3 days (vs 3-4 weeks manual setup).`,
      businessValue: `Reduces onboarding time by 85%, ensures fleet-wide standardization, enables benchmarking. Value: $${characteristics.fleetSize === 'large' ? '200,000-400,000' : '75,000-150,000'}/year in efficiency gains.`,
    });
  }
  
  // Generate use cases
  useCases.push(`**Use Case 1: Fleet-Wide Compliance Audit**\nISM Code internal audit for ${orgName}. Auditor uses fleetcore to review:\n1. All ${characteristics.fleetSize === 'large' ? '54' : characteristics.fleetSize === 'medium' ? '18' : '8'} vessels simultaneously\n2. Safety equipment inspection records (100% completion required)\n3. Crew training compliance (certificates, drills, competency assessments)\n4. Non-conformity tracking and closure\n5. Management review documentation\n\nComplete audit in 5 days (vs 4-6 weeks with paper systems). Generate compliance report with single click.`);
  
  if (characteristics.fleetSize === 'medium' || characteristics.fleetSize === 'large') {
    useCases.push(`**Use Case 2: Fleet Optimization Initiative**\n${orgName} CFO launches cost reduction program. Technical Director uses fleetcore analytics:\n1. Identify highest-cost equipment across fleet: "Main Engines" = $${characteristics.fleetSize === 'large' ? '4.2M' : '1.8M'}/year\n2. Analyze maintenance patterns: Emergency maintenance = ${characteristics.fleetSize === 'large' ? '28%' : '22%'} of total (target: <15%)\n3. Find best practices: Top 3 vessels maintain <10% emergency ratio\n4. Implement fleet-wide: Standardize PM intervals based on top performers\n5. Monitor impact: Emergency maintenance drops to 14% over 12 months\n\nCost savings: $${characteristics.fleetSize === 'large' ? '600,000' : '250,000'}/year`);
  }
  
  // Technical implementation
  technicalImplementation.push(`**${orgName} Organization Structure:**\n\`\`\`\nOrganization: "${orgName}"\n  Type: ${characteristics.organizationType}\n  \n  Vessels: ${characteristics.fleetSize === 'large' ? '50+' : characteristics.fleetSize === 'medium' ? '10-50' : characteristics.fleetSize === 'small' ? '5-10' : '1'}\n  \n  User Roles:\n  - Fleet Manager (1): Full fleet visibility, strategic analytics\n  - Technical Superintendents (${characteristics.fleetSize === 'large' ? '8' : characteristics.fleetSize === 'medium' ? '3' : '1'}): Vessel group management\n  - Shore-based Engineers (${characteristics.fleetSize === 'large' ? '12' : characteristics.fleetSize === 'medium' ? '4' : '2'}): Technical support, procurement\n  - Vessel Masters (${characteristics.fleetSize === 'large' ? '54' : characteristics.fleetSize === 'medium' ? '18' : '8'}): Own vessel only\n  - Chief Engineers (${characteristics.fleetSize === 'large' ? '54' : characteristics.fleetSize === 'medium' ? '18' : '8'}): Own vessel maintenance\n  \n  Row-Level Security: Automatic data isolation per role\n\`\`\``);
  
  return {
    entityName: orgName,
    entityType: 'organization',
    entityCharacteristics: characteristics as any,
    features,
    useCases,
    technicalImplementation,
    implementationComplexity: characteristics.fleetSize === 'large' ? 'high' : characteristics.fleetSize === 'medium' ? 'medium' : 'low',
    estimatedSetupTime: characteristics.fleetSize === 'large' ? '6-8 weeks' : characteristics.fleetSize === 'medium' ? '3-4 weeks' : '1-2 weeks',
    businessValue: `Estimated annual ROI for ${orgName}: $${characteristics.fleetSize === 'large' ? '2,000,000-5,000,000' : characteristics.fleetSize === 'medium' ? '500,000-1,500,000' : characteristics.fleetSize === 'small' ? '150,000-400,000' : '75,000-150,000'} (downtime reduction + maintenance optimization + compliance efficiency + cross-fleet intelligence)`,
  };
}

/**
 * Map regulation to fleetcore features
 */
export function mapRegulationToFleetcoreFeatures(
  regulationName: string,
  characteristics: RegulationCharacteristics
): FleetcoreApplicationMapping {
  const features: FeatureApplication[] = [];
  const useCases: string[] = [];
  const technicalImplementation: string[] = [];
  
  // FEATURE 1: Regulation-specific compliance tracking
  features.push({
    featureName: `${characteristics.regulationType} Compliance Management`,
    relevance: 'mandatory',
    specificApplication: `Automate ${characteristics.regulationType} compliance tracking across all affected systems: ${characteristics.affectedSystems.join(', ')}. Maintain audit trail for flag state and PSC inspections.`,
    concreteExample: `${characteristics.regulationType} compliance dashboard shows:\n- Affected equipment: ${characteristics.affectedSystems.length} system categories\n- Inspection schedules: Annual, 5-yearly, continuous\n- Certificate status: ${characteristics.affectedSystems.filter((_, i) => i % 3 === 0).length} due within 90 days\n- Non-conformities: 0 open (target: 0 at all times)\n- Audit history: Complete records since vessel delivery\n\nAll requirements mapped to specific fleetcore maintenance schedules.`,
    businessValue: `${characteristics.regulationType} non-compliance risk: Vessel detention ($50,000-150,000/day), fines ($5,000-50,000), reputational damage. fleetcore ensures 100% compliance readiness.`,
  });
  
  // FEATURE 2: Certificate tracking
  features.push({
    featureName: 'Certificate Lifecycle Management',
    relevance: 'mandatory',
    specificApplication: `Track all ${characteristics.regulationType}-related certificates: issuance, renewal, expiration, verification. Automated alerts 90/60/30 days before expiry.`,
    concreteExample: `Certificate tracking for ${characteristics.regulationType}:\n- Certificate types: ${characteristics.regulationType.includes('SOLAS') ? 'Safety Equipment Certificate, Radio Certificate, Cargo Ship Safety Certificate' : characteristics.regulationType.includes('MARPOL') ? 'IOPP Certificate, Sewage Certificate, Air Pollution Certificate' : 'Document of Compliance, Safety Management Certificate'}\n- Expiry tracking: Automated countdown\n- Renewal workflow: Alert → Generate work order → Schedule survey → Upload new certificate\n- Verification: Link certificate to specific equipment/inspections\n- PSC readiness: One-click certificate package export`,
    businessValue: `Expired certificates = PSC detention. Average cost: $125,000/incident. fleetcore prevents 100% of certificate-related detentions.`,
  });
  
  // FEATURE 3: System-specific compliance
  for (const system of characteristics.affectedSystems.slice(0, 2)) {
    features.push({
      featureName: `${system.charAt(0).toUpperCase() + system.slice(1)} Compliance`,
      relevance: 'mandatory',
      specificApplication: `Implement ${characteristics.regulationType} requirements for ${system}. Track all mandatory inspections, tests, and maintenance activities.`,
      concreteExample: getSystemSpecificExample(system, characteristics.regulationType),
      businessValue: `${system} failure to meet ${characteristics.regulationType} = immediate detention. Prevention value: $50,000-150,000 per vessel per year.`,
    });
  }
  
  // Generate use cases
  useCases.push(`**Use Case 1: ${characteristics.regulationType} Inspection Preparation**\nVessel scheduled for ${characteristics.regulationType.includes('SOLAS') ? 'Annual SOLAS Survey' : characteristics.regulationType.includes('MARPOL') ? 'Annual MARPOL Survey' : 'ISM Code Internal Audit'}. Chief Engineer uses fleetcore:\n1. Review inspection checklist (${characteristics.affectedSystems.length * 15} items)\n2. Verify all maintenance records complete and up-to-date\n3. Check certificate validity: All ${characteristics.affectedSystems.length} certificates current\n4. Generate inspection package: 230-page PDF with all evidence\n5. Submit to surveyor 7 days before survey\n\nSurvey completed in single day, zero deficiencies noted. Typical survey preparation: 2-3 weeks. With fleetcore: 2-3 days.`);
  
  useCases.push(`**Use Case 2: Port State Control Readiness**\nVessel arrives in ${characteristics.regulationType.includes('MARPOL') ? 'European' : 'US'} port. PSC inspector conducts surprise inspection focused on ${characteristics.regulationType}. Captain opens fleetcore mobile app:\n- Displays: All ${characteristics.regulationType}-required equipment\n- Shows: Inspection records with dates, photos, inspector signatures\n- Proves: 100% compliance with maintenance intervals\n- Provides: Digital certificates, training records, drill logs\n\nInspector satisfied with documentation quality and completeness. Inspection duration: 90 minutes (vs typical 4-6 hours). No deficiencies, no detention.`);
  
  if (characteristics.regulationType.includes('ISM')) {
    useCases.push(`**Use Case 3: Management Review & Continuous Improvement**\nDesignated Person Ashore (DPA) conducts quarterly management review per ISM Code. fleetcore provides:\n1. Safety performance metrics: Incident rate, near-miss trend, audit findings\n2. Maintenance effectiveness: PM compliance rate (target: >95%), emergency ratio (target: <15%)\n3. Non-conformity analysis: 23 NCs raised, 21 closed, 2 overdue\n4. Training compliance: 94% of crew current (6% require renewal within 30 days)\n5. Objective evidence: Complete audit trail for certification\n\nManagement review completed in 2 hours (vs 1-2 days manual compilation). Action items automatically converted to work orders in fleetcore.`);
  }
  
  // Technical implementation
  technicalImplementation.push(`**${characteristics.regulationType} Compliance Configuration:**\n\`\`\`\nRegulation: "${characteristics.regulationType}"\n  Scope: ${characteristics.scope}\n  Enforcement: ${characteristics.enforcementLevel}\n  \n  Affected Systems (${characteristics.affectedSystems.length}):\n${characteristics.affectedSystems.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}\n  \n  Compliance Schedules:\n  - Annual inspections: ${characteristics.affectedSystems.filter((_, i) => i % 2 === 0).length} schedules\n  - 5-yearly surveys: ${characteristics.affectedSystems.filter((_, i) => i % 3 === 0).length} schedules\n  - Continuous monitoring: ${characteristics.affectedSystems.filter((_, i) => i % 2 === 1).length} parameters\n  \n  Certificate Tracking:\n  - Primary certificates: ${characteristics.regulationType.includes('SOLAS') ? '5' : characteristics.regulationType.includes('MARPOL') ? '4' : '2'}\n  - Equipment certificates: ${characteristics.affectedSystems.length}\n  - Renewal alerts: 90/60/30 days\n\`\`\``);
  
  return {
    entityName: regulationName,
    entityType: 'regulation',
    entityCharacteristics: characteristics as any,
    features,
    useCases,
    technicalImplementation,
    implementationComplexity: characteristics.affectedSystems.length > 5 ? 'high' : characteristics.affectedSystems.length > 3 ? 'medium' : 'low',
    estimatedSetupTime: characteristics.affectedSystems.length > 5 ? '2-3 weeks' : characteristics.affectedSystems.length > 3 ? '1-2 weeks' : '3-5 days',
    businessValue: `Compliance value: Detention prevention ($50,000-150,000/incident), fine avoidance ($5,000-50,000/violation), audit efficiency (70% time reduction). Annual value: $150,000-400,000 per vessel.`,
  };
}

// =====================
// TYPE DEFINITIONS
// =====================

export interface FeatureApplication {
  featureName: string;
  relevance: 'critical' | 'mandatory' | 'high' | 'medium' | 'low';
  specificApplication: string;
  concreteExample: string;
  businessValue: string;
}

export interface FleetcoreApplicationMapping {
  entityName: string;
  entityType: 'vessel' | 'equipment' | 'organization' | 'regulation';
  entityCharacteristics: any;
  features: FeatureApplication[];
  useCases: string[];
  technicalImplementation: string[];
  implementationComplexity: 'low' | 'medium' | 'high';
  estimatedSetupTime: string;
  businessValue: string;
}

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Get system-specific compliance example
 */
function getSystemSpecificExample(system: string, regulationType: string): string {
  const examples: Record<string, string> = {
    'fire protection': `Fire protection equipment compliance:\n- Fire extinguishers: Annual inspection + 5-year hydrostatic test\n- Fire hoses: Annual pressure test\n- Fire pumps: Weekly test runs (logged in fleetcore)\n- Fixed fire suppression: Annual inspection + remote release test\n- Fire doors: Quarterly operational check\nfleetcore tracks each item individually, generates work orders, maintains complete audit trail.`,
    
    'life-saving equipment': `Life-saving equipment compliance:\n- Lifeboats: Annual inspection + 5-year load test\n- Life rafts: Annual service at approved station\n- Life jackets: Annual inspection (all 24 units)\n- EPIRB: Annual battery check + registration verification\n- Immersion suits: Annual inspection\nAll equipment tagged with QR codes, inspection history tracked in fleetcore mobile app.`,
    
    'oil water separator': `Oil Water Separator (OWS) compliance:\n- Daily operation log (Oil Record Book Part I entries)\n- Monthly filter cleaning/replacement\n- Annual calibration and test\n- 15 ppm alarm test (weekly)\n- Bilge management procedures\nfleetcore automates ORB entries, tracks filter change intervals, ensures 15 ppm compliance for MARPOL Annex I.`,
    
    'sewage treatment': `Sewage Treatment Plant compliance:\n- Daily chlorine residual check\n- Weekly operational test\n- Monthly maintenance (per OEM schedule)\n- Annual performance test (50 persons capacity verification)\n- Discharge monitoring (when within 12nm)\nfleetcore logs all tests, maintains MARPOL Annex IV compliance documentation.`,
    
    'safety management system': `Safety Management System (SMS) documentation:\n- Company policies and procedures (digital library in fleetcore)\n- Risk assessments linked to equipment\n- Non-conformity tracking and closure\n- Management review records\n- Audit schedules and findings\n- Emergency response procedures\nComplete ISM Code compliance maintained in fleetcore SMS module.`,
  };
  
  return examples[system.toLowerCase()] || `${system} compliance tracking with automated inspection schedules, test requirements, and certification management per ${regulationType}.`;
}

// =====================
// MAIN ORCHESTRATOR
// =====================

/**
 * Main orchestrator: Analyze context and generate individualized fleetcore mapping
 */
export function generateFleetcoreMapping(
  entityName: string,
  entityType: 'vessel' | 'equipment' | 'organization' | 'regulation' | 'auto',
  sessionMemory: SessionMemory | null,
  contextText: string
): FleetcoreApplicationMapping | null {
  console.log(`\n🎯 GENERATING FLEETCORE MAPPING for ${entityName} (type: ${entityType})`);
  
  // Auto-detect entity type if needed
  if (entityType === 'auto') {
    entityType = detectEntityType(entityName, contextText);
    console.log(`   Auto-detected type: ${entityType}`);
  }
  
  // Get entity data from session memory
  const vesselData = sessionMemory?.accumulatedKnowledge.vesselEntities[entityName.toLowerCase()];
  const companyData = sessionMemory?.accumulatedKnowledge.companyEntities[entityName.toLowerCase()];
  
  // Generate mapping based on entity type
  let mapping: FleetcoreApplicationMapping | null = null;
  
  switch (entityType) {
    case 'vessel': {
      const characteristics = analyzeVessel(entityName, vesselData || {}, contextText);
      mapping = mapVesselToFleetcoreFeatures(entityName, characteristics);
      break;
    }
    
    case 'equipment': {
      const characteristics = analyzeEquipment(entityName, contextText);
      mapping = mapEquipmentToFleetcoreFeatures(entityName, characteristics);
      break;
    }
    
    case 'organization': {
      const characteristics = analyzeOrganization(entityName, companyData || {}, contextText);
      mapping = mapOrganizationToFleetcoreFeatures(entityName, characteristics);
      break;
    }
    
    case 'regulation': {
      const characteristics = analyzeRegulation(entityName, contextText);
      mapping = mapRegulationToFleetcoreFeatures(entityName, characteristics);
      break;
    }
    
    default:
      console.warn(`   ⚠️ Unknown entity type: ${entityType}`);
      return null;
  }
  
  if (mapping) {
    console.log(`   ✅ Generated mapping with ${mapping.features.length} features, ${mapping.useCases.length} use cases`);
  }
  
  return mapping;
}

/**
 * Detect entity type from context
 */
function detectEntityType(entityName: string, contextText: string): 'vessel' | 'equipment' | 'organization' | 'regulation' {
  const textLower = contextText.toLowerCase();
  const nameLower = entityName.toLowerCase();
  
  // Regulation detection
  if (/\bsolas\b|\bmarpol\b|\bism code\b|\bisps\b/i.test(entityName)) return 'regulation';
  
  // Vessel detection
  if (/\bvessel\b|\bship\b|\bimo\b|\bteu\b|\bdwt\b|\bflag\b/i.test(textLower)) return 'vessel';
  if (/\b(mv|ms|mt)\s/i.test(entityName)) return 'vessel';
  
  // Equipment detection
  if (/\bengines?\b|\bgenerators?\b|\bpumps?\b|\bcompressors?\b|\bhvac\b/i.test(textLower)) return 'equipment';
  if (/\bcaterpillar\b|\bwärtsilä\b|\bman\b|\bcummins\b/i.test(nameLower)) return 'equipment';
  
  // Organization detection
  if (/\bcompany\b|\boperator\b|\bshipping line\b|\bmanagement\b/i.test(textLower)) return 'organization';
  if (/\bmarine\b|\bshipping\b|\bservices\b|\bgroup\b/i.test(nameLower)) return 'organization';
  
  // Default to vessel if contains numbers (common in vessel names)
  if (/\d+/.test(entityName)) return 'vessel';
  
  // Default to organization
  return 'organization';
}

/**
 * Format mapping as markdown for inclusion in response
 */
export function formatMappingAsMarkdown(mapping: FleetcoreApplicationMapping): string {
  let markdown = `\n\n---\n\n## 🎯 How fleetcore Applies to ${mapping.entityName}\n\n`;
  
  // Add characteristics summary
  markdown += `**Entity Profile:** ${mapping.entityType}\n`;
  if (mapping.entityType === 'vessel') {
    const char = mapping.entityCharacteristics as VesselCharacteristics;
    markdown += `- Type: ${char.vesselType}\n`;
    markdown += `- Size: ${char.size}\n`;
    markdown += `- Complexity: ${char.complexity}\n`;
    markdown += `- Systems: ${char.detectedSystems?.length || 0} detected (${char.detectedSystems?.slice(0, 3).join(', ')}${(char.detectedSystems?.length || 0) > 3 ? '...' : ''})\n`;
  } else if (mapping.entityType === 'equipment') {
    const char = mapping.entityCharacteristics as EquipmentCharacteristics;
    markdown += `- Type: ${char.equipmentType}\n`;
    markdown += `- Criticality: ${char.criticality.toUpperCase()}\n`;
    if (char.manufacturer) markdown += `- Manufacturer: ${char.manufacturer}\n`;
    markdown += `- Maintenance Complexity: ${char.maintenanceComplexity}\n`;
  }
  
  markdown += `\n### 📋 Relevant fleetcore Features (${mapping.features.length})\n\n`;
  
  // Add top 3 features
  mapping.features.slice(0, 3).forEach((feature, idx) => {
    markdown += `**${idx + 1}. ${feature.featureName}** ${feature.relevance === 'critical' || feature.relevance === 'mandatory' ? '⚠️ CRITICAL' : ''}\n\n`;
    markdown += `${feature.specificApplication}\n\n`;
    markdown += `*Example:* ${feature.concreteExample}\n\n`;
    markdown += `💰 *Value:* ${feature.businessValue}\n\n`;
  });
  
  // Add primary use case
  if (mapping.useCases.length > 0) {
    markdown += `### 💡 Real-World Use Case\n\n`;
    markdown += `${mapping.useCases[0]}\n\n`;
  }
  
  // Add implementation summary
  markdown += `### ⚙️ Implementation\n\n`;
  markdown += `- **Complexity:** ${mapping.implementationComplexity}\n`;
  markdown += `- **Setup Time:** ${mapping.estimatedSetupTime}\n`;
  markdown += `- **Annual Value:** ${mapping.businessValue}\n\n`;
  
  // Add CTA
  markdown += `💡 **Ready to see this in action?** [Schedule a demo](https://calendly.com/hello-fleetcore/30min) to explore how fleetcore can transform ${mapping.entityName}'s maintenance operations.\n\n`;
  
  return markdown;
}

