/**
 * MARITIME ENTITY TYPE DETECTOR
 * 
 * Intelligently detects the type of maritime query to route to specialized handlers:
 * - VESSEL: Ship/vessel queries (Dynamic 17, Stanford Pelican)
 * - EQUIPMENT: Machinery/equipment queries (Caterpillar C32, MAN engine)
 * - PART: Specific parts/components (fuel filters, impellers, bearings)
 * - REGULATION: Classification, certification, compliance queries
 * - PMS: Maintenance schedules, procedures, intervals
 * - GENERAL: General maritime topics
 */

export type EntityType = 'vessel' | 'equipment' | 'part' | 'regulation' | 'pms' | 'service' | 'event' | 'general';

export interface EntityDetectionResult {
  type: EntityType;
  confidence: number;
  entities: string[];
  context: string;
  searchStrategy: string;
}

// Comprehensive equipment manufacturer patterns
const EQUIPMENT_MANUFACTURERS = [
  // Engines
  'caterpillar', 'cat', 'cummins', 'man', 'wartsila', 'wärtsilä', 'yanmar', 'volvo penta',
  'detroit diesel', 'mtu', 'perkins', 'deutz', 'john deere', 'scania', 'mitsubishi',
  // Generators & Power
  'stamford', 'leroy somer', 'mecc alte', 'marathon', 'weg',
  // Propulsion & Thrusters
  'rolls royce', 'kongsberg', 'brunvoll', 'schottel', 'veth', 'nakashima',
  // HVAC & Refrigeration
  'carrier', 'daikin', 'trane', 'heinen & hopman',
  // Pumps & Compressors
  'grundfos', 'flygt', 'sulzer', 'spx', 'ingersoll rand', 'atlas copco',
  // Fire & Safety
  'marioff', 'hi-fog', 'kidde', 'wormald',
  // Navigation & Electronics
  'furuno', 'simrad', 'raytheon', 'sperry', 'jrc', 'transas'
];

// Equipment types
const EQUIPMENT_TYPES = [
  'engine', 'motor', 'generator', 'genset', 'compressor', 'pump', 'thruster',
  'propeller', 'propulsion', 'gearbox', 'alternator', 'transformer',
  'hvac', 'air conditioning', 'chiller', 'heat exchanger', 'boiler',
  'separator', 'purifier', 'incinerator', 'sewage treatment',
  'firefighting system', 'bilge system', 'ballast system',
  'radar', 'gps', 'autopilot', 'sonar', 'ecdis'
];

// Parts & components
const PART_KEYWORDS = [
  'filter', 'impeller', 'bearing', 'seal', 'gasket', 'o-ring', 'valve',
  'piston', 'cylinder', 'liner', 'injector', 'turbocharger', 'intercooler',
  'coupling', 'shaft', 'propeller blade', 'starter', 'alternator belt',
  'oil filter', 'fuel filter', 'air filter', 'water pump',
  'thermostat', 'sensor', 'switch', 'relay', 'breaker'
];

// Vessel type indicators (matches vessel_types table: 29 types)
const VESSEL_INDICATORS = [
  'vessel', 'ship', 'boat', 'craft', 'carrier',
  // Cargo vessels
  'tanker', 'bulk carrier', 'container ship', 'cargo ship', 'general cargo',
  'ro-ro', 'reefer', 'lng carrier', 'lpg carrier',
  // Offshore vessels
  'psv', 'ahts', 'supply vessel', 'crew boat', 'platform supply vessel',
  'anchor handling tug supply', 'offshore supply', 'rov support',
  'dive support vessel', 'construction vessel', 'cable layer',
  // Special purpose
  'tug', 'tugboat', 'research vessel', 'survey vessel', 'patrol boat',
  'fishing vessel', 'trawler', 'dredger', 'icebreaker',
  // Passenger
  'ferry', 'cruise ship', 'passenger ship', 'yacht', 'mega yacht'
];

// Vessel system categories (matches vessel_systems table: 13 categories)
const VESSEL_SYSTEM_CATEGORIES = [
  'propulsion',
  'auxiliary_machinery',
  'electrical_systems',
  'safety_systems',
  'navigation_systems',
  'communication_systems',
  'cargo_handling',
  'accommodation_systems',
  'environmental_systems',
  'hull_systems',
  'other'
];

// Equipment operational status (matches vessel_equipment_installations.operational_status)
const EQUIPMENT_STATUS_VALUES = [
  'operational', 'standby', 'maintenance', 'repair', 'testing',
  'out_of_service', 'awaiting_parts', 'condemned', 'decommissioned',
  'satisfactory', 'new_overhaul', 'removed', 'defective'
];

// Equipment position (matches vessel_equipment_installations.equipment_position enum)
const EQUIPMENT_POSITIONS = [
  'PORT', 'STBD', 'CENTER', 'AFT', 'FWD', 'UPPER', 'LOWER',
  'BOW', 'STERN', 'MIDSHIPS', 'OVERHEAD', 'DECK', 'BULKHEAD',
  'ENGINE_ROOM', 'BRIDGE', 'CARGO_HOLD', 'FORECASTLE', 'POOP_DECK',
  'WING_TANK', 'DOUBLE_BOTTOM', 'VOID_SPACE'
];

// Regulation/Compliance keywords
const REGULATION_KEYWORDS = [
  'class', 'classification', 'society', 'dnv', 'abs', 'lloyd', 'bureau veritas',
  'rina', 'ccs', 'nk', 'kr', 'rs', 'bv',
  'solas', 'marpol', 'ism', 'isps', 'mlc', 'stcw',
  'regulation', 'compliance', 'certification', 'survey', 'inspection',
  'statutory', 'flag state', 'port state control', 'psc'
];

// PMS/Maintenance keywords
const PMS_KEYWORDS = [
  'maintenance', 'pms', 'planned maintenance',
  'overhaul', 'inspection',
  'interval', 'schedule', 'procedure', 'checklist',
  'running hours', 'operating hours', 'maintenance schedule',
  'preventive maintenance', 'corrective maintenance'
];

// Service/Task keywords (standardized service types)
const SERVICE_KEYWORDS = [
  'oil change', 'filter replacement', 'lubrication', 'cleaning',
  'calibration', 'descaling', 'fluid replacement', 'system flush',
  'service task', 'routine service', 'filter change', 'oil service'
];

// Event/Incident keywords
const EVENT_KEYWORDS = [
  'breakdown', 'malfunction', 'defect', 'damage', 'failure',
  'collision', 'grounding', 'fire', 'flooding', 'pollution',
  'injury', 'near miss', 'incident', 'accident', 'hazardous occurrence',
  'equipment failure', 'system failure', 'emergency'
];

/**
 * Detect entity type from query using multi-layered pattern matching
 */
export function detectEntityType(query: string): EntityDetectionResult {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  
  let scores = {
    vessel: 0,
    equipment: 0,
    part: 0,
    regulation: 0,
    pms: 0,
    service: 0,
    event: 0,
    general: 0
  };
  
  const entities: string[] = [];
  
  // ==================
  // 1. VESSEL DETECTION
  // ==================
  
  // Check for vessel name patterns (capitalized words, numbers)
  const vesselNamePattern = /\b([A-Z][a-z]+\s+[A-Z][a-z]+|\b[A-Z][a-z]+\s+\d+|\b[A-Z]{2,}\s+[A-Z][a-z]+)\b/g;
  const vesselMatches = query.match(vesselNamePattern);
  if (vesselMatches && vesselMatches.length > 0) {
    scores.vessel += 30 * vesselMatches.length;
    entities.push(...vesselMatches);
  }
  
  // Vessel-specific queries
  if (/\b(imo|mmsi|call sign|vessel name|ship name)\b/i.test(lowerQuery)) {
    scores.vessel += 40;
  }
  
  // Vessel type mentions
  VESSEL_INDICATORS.forEach(indicator => {
    if (lowerQuery.includes(indicator)) {
      scores.vessel += 15;
      entities.push(indicator);
    }
  });
  
  // ==================
  // 2. EQUIPMENT DETECTION
  // ==================
  
  // Equipment manufacturer
  EQUIPMENT_MANUFACTURERS.forEach(mfr => {
    if (lowerQuery.includes(mfr)) {
      scores.equipment += 25;
      entities.push(mfr);
    }
  });
  
  // Equipment types
  EQUIPMENT_TYPES.forEach(type => {
    if (lowerQuery.includes(type)) {
      scores.equipment += 20;
      entities.push(type);
    }
  });
  
  // Model number patterns (e.g., "C32", "6CTA 8.3", "MAN 9L21/31")
  const modelPattern = /\b([A-Z]{1,4}\d{1,4}[A-Z]?|[A-Z]\d+[A-Z]+|\d{1,2}[A-Z]{2,4}\s*\d+\.?\d*)\b/g;
  const modelMatches = query.match(modelPattern);
  if (modelMatches && modelMatches.length > 0) {
    scores.equipment += 30;
    entities.push(...modelMatches);
  }
  
  // ==================
  // 3. PART DETECTION
  // ==================
  
  PART_KEYWORDS.forEach(part => {
    if (lowerQuery.includes(part)) {
      scores.part += 25;
      entities.push(part);
    }
  });
  
  // Part number patterns (e.g., "P/N 12345", "PN-6789")
  if (/\b(p\/n|part\s*number|pn|part\s*#)\s*[:.]?\s*\w+/i.test(lowerQuery)) {
    scores.part += 35;
  }
  
  // ==================
  // 4. REGULATION DETECTION
  // ==================
  
  REGULATION_KEYWORDS.forEach(keyword => {
    if (lowerQuery.includes(keyword)) {
      scores.regulation += 30;
      entities.push(keyword);
    }
  });
  
  // ==================
  // 5. PMS DETECTION
  // ==================
  
  PMS_KEYWORDS.forEach(keyword => {
    if (lowerQuery.includes(keyword)) {
      scores.pms += 25;
      entities.push(keyword);
    }
  });
  
  // Interval patterns (e.g., "every 500 hours", "monthly maintenance")
  if (/\b(every|interval|due|schedule)\s+\d+\s*(hours?|days?|weeks?|months?|years?)/i.test(lowerQuery)) {
    scores.pms += 30;
  }
  
  // ==================
  // 6. SERVICE DETECTION
  // ==================
  
  SERVICE_KEYWORDS.forEach(keyword => {
    if (lowerQuery.includes(keyword)) {
      scores.service += 35;
      entities.push(keyword);
    }
  });
  
  // Specific service task patterns
  if (/\b(how to|perform|do)\s+(oil change|filter replacement|lubrication)/i.test(lowerQuery)) {
    scores.service += 30;
  }
  
  // ==================
  // 7. EVENT DETECTION
  // ==================
  
  EVENT_KEYWORDS.forEach(keyword => {
    if (lowerQuery.includes(keyword)) {
      scores.event += 30;
      entities.push(keyword);
    }
  });
  
  // Event reporting patterns
  if (/\b(report|log|record)\s+(breakdown|incident|failure|accident)/i.test(lowerQuery)) {
    scores.event += 35;
  }
  
  // ==================
  // DETERMINE TYPE
  // ==================
  
  const maxScore = Math.max(...Object.values(scores));
  const type = (Object.keys(scores) as EntityType[]).find(k => scores[k] === maxScore) || 'general';
  
  // Confidence calculation (0-100)
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.round((maxScore / totalScore) * 100) : 0;
  
  // Context description
  const context = generateContext(type, entities);
  
  // Search strategy
  const searchStrategy = getSearchStrategy(type);
  
  return {
    type,
    confidence,
    entities: [...new Set(entities)], // Remove duplicates
    context,
    searchStrategy
  };
}

function generateContext(type: EntityType, entities: string[]): string {
  const entityList = entities.slice(0, 3).join(', ');
  
  switch (type) {
    case 'vessel':
      return `Vessel query detected. Focus on vessel registries (MarineTraffic, VesselFinder, Equasis), AIS data, and fleet information. Entities: ${entityList}`;
    case 'equipment':
      return `Equipment query detected. Target OEM documentation, technical manuals, specification sheets, and equipment databases. Entities: ${entityList}`;
    case 'part':
      return `Parts/component query detected. Search for part catalogs, cross-reference databases, OEM parts lists, and supplier information. Entities: ${entityList}`;
    case 'regulation':
      return `Regulatory/compliance query detected. Focus on classification society rules, SOLAS/MARPOL requirements, flag state regulations, and certification standards. Entities: ${entityList}`;
    case 'pms':
      return `Maintenance/PMS query detected. Target maintenance manuals, service bulletins, OEM recommendations, and planned maintenance systems. Entities: ${entityList}`;
    case 'service':
      return `Service task query detected. Target standardized service procedures (oil change, filter replacement, lubrication, cleaning, calibration). Focus on step-by-step procedures and required materials. Entities: ${entityList}`;
    case 'event':
      return `Event/incident query detected. Focus on incident reporting, breakdown analysis, failure investigation, and corrective actions. Target safety bulletins and incident databases. Entities: ${entityList}`;
    default:
      return `General maritime query. Use broad maritime intelligence sources.`;
  }
}

function getSearchStrategy(type: EntityType): string {
  switch (type) {
    case 'vessel':
      return 'registry-focused';
    case 'equipment':
      return 'technical-documentation';
    case 'part':
      return 'catalog-focused';
    case 'regulation':
      return 'regulatory-authority';
    case 'pms':
      return 'maintenance-manual';
    case 'service':
      return 'service-procedure';
    case 'event':
      return 'incident-investigation';
    default:
      return 'general-maritime';
  }
}

/**
 * Get specialized source hints for entity type
 */
/**
 * Export database-aligned constants for use in extraction schemas
 */
export const DB_VESSEL_SYSTEM_CATEGORIES = VESSEL_SYSTEM_CATEGORIES;
export const DB_EQUIPMENT_STATUS_VALUES = EQUIPMENT_STATUS_VALUES;
export const DB_EQUIPMENT_POSITIONS = EQUIPMENT_POSITIONS;

/**
 * Get specialized source hints for entity type
 */
export function getSourceHints(type: EntityType): string[] {
  switch (type) {
    case 'vessel':
      return [
        'marinetraffic.com',
        'vesselfinder.com',
        'equasis.org',
        'myshiptracking.com',
        'fleetmon.com',
        'searates.com'
      ];
    case 'equipment':
      return [
        'caterpillar.com',
        'cummins.com',
        'man-es.com',
        'wartsila.com',
        'yanmar.com',
        'volvopenta.com',
        'kongsberg.com',
        'rolls-royce.com'
      ];
    case 'part':
      return [
        'parts catalogs',
        'oem parts lists',
        'marine suppliers',
        'cross-reference databases'
      ];
    case 'regulation':
      return [
        'dnv.com',
        'abs.org',
        'lr.org',
        'imo.org',
        'classnk.or.jp',
        'bureauveritas.com'
      ];
    case 'pms':
      return [
        'maintenance manuals',
        'service bulletins',
        'oem documentation',
        'technical circulars'
      ];
    case 'service':
      return [
        'service procedures',
        'oem service manuals',
        'step-by-step guides',
        'maintenance handbooks'
      ];
    case 'event':
      return [
        'incident databases',
        'safety bulletins',
        'failure analysis reports',
        'maritime accident investigation'
      ];
    default:
      return [];
  }
}

