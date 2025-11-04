/**
 * SPECIALIZED MARITIME QUERY STRATEGIES
 * 
 * Multi-tier search strategies optimized for different entity types.
 * Each strategy targets specific authoritative sources and technical forums.
 */

import type { EntityType } from './entity-type-detector';

export interface SearchTier {
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  queries: string[];
  purpose: string;
}

export interface SpecializedStrategy {
  entityType: EntityType;
  tiers: SearchTier[];
  totalQueries: number;
}

/**
 * Generate specialized multi-tier search strategy based on entity type
 */
export function generateSpecializedStrategy(
  query: string,
  entityType: EntityType,
  entities: string[]
): SpecializedStrategy {
  
  switch (entityType) {
    case 'vessel':
      return generateVesselStrategy(query, entities);
    case 'equipment':
      return generateEquipmentStrategy(query, entities);
    case 'part':
      return generatePartStrategy(query, entities);
    case 'regulation':
      return generateRegulationStrategy(query, entities);
    case 'pms':
      return generatePMSStrategy(query, entities);
    case 'service':
      return generateServiceStrategy(query, entities);
    case 'event':
      return generateEventStrategy(query, entities);
    default:
      return generateGeneralStrategy(query);
  }
}

/**
 * VESSEL-SPECIFIC STRATEGY
 * Tier 1: Official registries (IMO, MMSI, specs)
 * Tier 2: AIS tracking (real-time position)
 * Tier 3: Fleet databases
 * Tier 4: Maritime news & history
 */
function generateVesselStrategy(query: string, entities: string[]): SpecializedStrategy {
  const vesselName = entities[0] || query;
  
  return {
    entityType: 'vessel',
    tiers: [
      {
        name: 'Official Registries',
        priority: 'critical',
        queries: [
          `${vesselName} vessel IMO MMSI call sign marinetraffic`,
          `${vesselName} vessel specifications equasis registry`,
          `${vesselName} ship particulars vesselfinder`,
          `${vesselName} vessel registration flag state`,
        ],
        purpose: 'Get official vessel identifiers and registration data'
      },
      {
        name: 'AIS Tracking',
        priority: 'high',
        queries: [
          `${vesselName} AIS position tracking current location`,
          `${vesselName} vessel destination ETA port calls`,
        ],
        purpose: 'Get real-time position and voyage data'
      },
      {
        name: 'Technical Specifications',
        priority: 'high',
        queries: [
          `${vesselName} technical specifications dimensions tonnages`,
          `${vesselName} main engines propulsion machinery`,
          `${vesselName} shipyard builder delivery date`,
        ],
        purpose: 'Get comprehensive technical specifications'
      },
      {
        name: 'Ownership & Management',
        priority: 'medium',
        queries: [
          `${vesselName} vessel owner operator management company`,
          `${vesselName} fleet company operations`,
        ],
        purpose: 'Get ownership and operational details'
      }
    ],
    totalQueries: 10
  };
}

/**
 * EQUIPMENT-SPECIFIC STRATEGY
 * Tier 1: OEM official documentation
 * Tier 2: Technical specifications & datasheets
 * Tier 3: Service manuals & maintenance guides
 * Tier 4: Real-world experience (forums, technical communities)
 */
function generateEquipmentStrategy(query: string, entities: string[]): SpecializedStrategy {
  const equipmentModel = entities[0] || query;
  
  return {
    entityType: 'equipment',
    tiers: [
      {
        name: 'OEM Official Documentation',
        priority: 'critical',
        queries: [
          `${equipmentModel} official specifications datasheet site:*.com`,
          `${equipmentModel} technical manual PDF site:manufacturer.com`,
          `${equipmentModel} product brochure specifications`,
        ],
        purpose: 'Get official manufacturer specifications'
      },
      {
        name: 'Technical Specifications',
        priority: 'critical',
        queries: [
          `${equipmentModel} power output displacement specifications`,
          `${equipmentModel} dimensions weight fuel consumption`,
          `${equipmentModel} performance curve ratings`,
        ],
        purpose: 'Get detailed technical specifications'
      },
      {
        name: 'Maintenance & Service',
        priority: 'high',
        queries: [
          `${equipmentModel} maintenance schedule intervals recommendations`,
          `${equipmentModel} service bulletin technical circular`,
          `${equipmentModel} overhaul procedure manual`,
        ],
        purpose: 'Get maintenance procedures and intervals'
      },
      {
        name: 'Real-World Experience',
        priority: 'high',
        queries: [
          `${equipmentModel} marine engineer experience site:eng-tips.com`,
          `${equipmentModel} field experience problems solutions forum`,
          `${equipmentModel} best practices reliability forum`,
          `${equipmentModel} common issues troubleshooting tips`,
        ],
        purpose: 'Get real-world technical experience and best practices'
      },
      {
        name: 'Parts & Compatibility',
        priority: 'medium',
        queries: [
          `${equipmentModel} parts catalog cross reference`,
          `${equipmentModel} compatible parts alternatives`,
        ],
        purpose: 'Get parts information and compatibility'
      }
    ],
    totalQueries: 13
  };
}

/**
 * PART-SPECIFIC STRATEGY
 * Tier 1: OEM parts catalogs
 * Tier 2: Cross-reference databases
 * Tier 3: Marine suppliers
 * Tier 4: Technical specifications
 */
function generatePartStrategy(query: string, entities: string[]): SpecializedStrategy {
  const partDescription = entities.join(' ') || query;
  
  return {
    entityType: 'part',
    tiers: [
      {
        name: 'OEM Parts Catalogs',
        priority: 'critical',
        queries: [
          `${partDescription} OEM part number catalog`,
          `${partDescription} manufacturer parts list`,
          `${partDescription} genuine parts specifications`,
        ],
        purpose: 'Find official part numbers and specifications'
      },
      {
        name: 'Cross-Reference & Alternatives',
        priority: 'high',
        queries: [
          `${partDescription} cross reference equivalent parts`,
          `${partDescription} alternative compatible parts`,
          `${partDescription} aftermarket replacement options`,
        ],
        purpose: 'Find compatible and alternative parts'
      },
      {
        name: 'Marine Suppliers',
        priority: 'high',
        queries: [
          `${partDescription} marine supplier stock availability`,
          `${partDescription} marine parts distributor`,
        ],
        purpose: 'Find suppliers and availability'
      },
      {
        name: 'Technical Specifications',
        priority: 'medium',
        queries: [
          `${partDescription} specifications dimensions material`,
          `${partDescription} installation procedure torque specs`,
        ],
        purpose: 'Get technical specifications and installation data'
      }
    ],
    totalQueries: 10
  };
}

/**
 * REGULATION-SPECIFIC STRATEGY
 * Tier 1: Classification society rules
 * Tier 2: International conventions (IMO)
 * Tier 3: Flag state regulations
 * Tier 4: Industry guidelines
 */
function generateRegulationStrategy(query: string, entities: string[]): SpecializedStrategy {
  const regulationTopic = entities.join(' ') || query;
  
  return {
    entityType: 'regulation',
    tiers: [
      {
        name: 'Classification Society Rules',
        priority: 'critical',
        queries: [
          `${regulationTopic} DNV rules site:dnv.com`,
          `${regulationTopic} ABS rules site:abs.org`,
          `${regulationTopic} Lloyd's Register rules site:lr.org`,
          `${regulationTopic} Bureau Veritas rules site:bureauveritas.com`,
        ],
        purpose: 'Get class society requirements'
      },
      {
        name: 'International Conventions',
        priority: 'critical',
        queries: [
          `${regulationTopic} SOLAS requirements site:imo.org`,
          `${regulationTopic} MARPOL regulations site:imo.org`,
          `${regulationTopic} IMO guidelines standards`,
        ],
        purpose: 'Get international maritime regulations'
      },
      {
        name: 'Flag State & PSC',
        priority: 'high',
        queries: [
          `${regulationTopic} flag state requirements`,
          `${regulationTopic} port state control deficiencies`,
        ],
        purpose: 'Get flag state and PSC requirements'
      },
      {
        name: 'Industry Guidelines',
        priority: 'medium',
        queries: [
          `${regulationTopic} industry best practices guidelines`,
          `${regulationTopic} classification notation requirements`,
        ],
        purpose: 'Get industry standards and best practices'
      }
    ],
    totalQueries: 11
  };
}

/**
 * PMS-SPECIFIC STRATEGY
 * Tier 1: OEM maintenance manuals
 * Tier 2: Maintenance interval recommendations
 * Tier 3: Service procedures & checklists
 * Tier 4: Real-world maintenance experience
 */
function generatePMSStrategy(query: string, entities: string[]): SpecializedStrategy {
  const maintenanceTopic = entities.join(' ') || query;
  
  return {
    entityType: 'pms',
    tiers: [
      {
        name: 'OEM Maintenance Documentation',
        priority: 'critical',
        queries: [
          `${maintenanceTopic} maintenance manual PDF`,
          `${maintenanceTopic} service schedule intervals`,
          `${maintenanceTopic} recommended maintenance OEM`,
        ],
        purpose: 'Get official maintenance schedules'
      },
      {
        name: 'Service Procedures',
        priority: 'high',
        queries: [
          `${maintenanceTopic} maintenance procedure step by step`,
          `${maintenanceTopic} service checklist inspection points`,
          `${maintenanceTopic} overhaul procedure manual`,
        ],
        purpose: 'Get detailed maintenance procedures'
      },
      {
        name: 'Maintenance Intervals',
        priority: 'high',
        queries: [
          `${maintenanceTopic} maintenance intervals running hours`,
          `${maintenanceTopic} service frequency recommendations`,
          `${maintenanceTopic} inspection schedule periods`,
        ],
        purpose: 'Get maintenance interval recommendations'
      },
      {
        name: 'Real-World Experience',
        priority: 'high',
        queries: [
          `${maintenanceTopic} maintenance experience best practices forum`,
          `${maintenanceTopic} service tips recommendations marine engineer`,
          `${maintenanceTopic} common maintenance issues solutions`,
        ],
        purpose: 'Get practical maintenance experience from forums'
      },
      {
        name: 'Parts & Materials',
        priority: 'medium',
        queries: [
          `${maintenanceTopic} required parts maintenance kit`,
          `${maintenanceTopic} consumables lubricants specifications`,
        ],
        purpose: 'Get parts and materials requirements'
      }
    ],
    totalQueries: 13
  };
}

/**
 * SERVICE-SPECIFIC STRATEGY
 * Tier 1: OEM service manuals and procedures
 * Tier 2: Step-by-step guides
 * Tier 3: Required materials and tools
 * Tier 4: Best practices from technicians
 */
function generateServiceStrategy(query: string, entities: string[]): SpecializedStrategy {
  const serviceTopic = entities.join(' ') || query;
  
  return {
    entityType: 'service',
    tiers: [
      {
        name: 'OEM Service Manuals',
        priority: 'critical',
        queries: [
          `${serviceTopic} service procedure manual PDF`,
          `${serviceTopic} step by step procedure`,
          `${serviceTopic} official service manual`,
        ],
        purpose: 'Get official service procedures'
      },
      {
        name: 'Required Materials',
        priority: 'high',
        queries: [
          `${serviceTopic} required materials consumables`,
          `${serviceTopic} parts list tools needed`,
        ],
        purpose: 'Get materials and tools requirements'
      },
      {
        name: 'Safety & Compliance',
        priority: 'high',
        queries: [
          `${serviceTopic} safety requirements PPE`,
          `${serviceTopic} environmental compliance waste disposal`,
        ],
        purpose: 'Get safety and environmental requirements'
      },
      {
        name: 'Best Practices',
        priority: 'medium',
        queries: [
          `${serviceTopic} best practices tips forum`,
          `${serviceTopic} common problems troubleshooting`,
        ],
        purpose: 'Get practical advice from technicians'
      }
    ],
    totalQueries: 9
  };
}

/**
 * EVENT-SPECIFIC STRATEGY
 * Tier 1: Incident databases and safety bulletins
 * Tier 2: Root cause analysis
 * Tier 3: Corrective actions
 * Tier 4: Lessons learned
 */
function generateEventStrategy(query: string, entities: string[]): SpecializedStrategy {
  const eventTopic = entities.join(' ') || query;
  
  return {
    entityType: 'event',
    tiers: [
      {
        name: 'Incident Databases',
        priority: 'critical',
        queries: [
          `${eventTopic} incident report database`,
          `${eventTopic} safety bulletin warning`,
          `${eventTopic} accident investigation report`,
        ],
        purpose: 'Get incident data and safety bulletins'
      },
      {
        name: 'Root Cause Analysis',
        priority: 'high',
        queries: [
          `${eventTopic} root cause analysis`,
          `${eventTopic} failure analysis investigation`,
          `${eventTopic} contributing factors`,
        ],
        purpose: 'Get root cause information'
      },
      {
        name: 'Corrective Actions',
        priority: 'high',
        queries: [
          `${eventTopic} corrective action preventive measures`,
          `${eventTopic} repair procedure fix`,
        ],
        purpose: 'Get corrective and preventive actions'
      },
      {
        name: 'Lessons Learned',
        priority: 'medium',
        queries: [
          `${eventTopic} lessons learned best practices`,
          `${eventTopic} similar incidents prevention`,
        ],
        purpose: 'Get lessons learned from similar incidents'
      }
    ],
    totalQueries: 10
  };
}

/**
 * GENERAL MARITIME STRATEGY
 * Fallback for queries that don't fit specific categories
 */
function generateGeneralStrategy(query: string): SpecializedStrategy {
  return {
    entityType: 'general',
    tiers: [
      {
        name: 'Primary Maritime Sources',
        priority: 'high',
        queries: [
          `${query} maritime`,
          `${query} shipping industry`,
          `${query} offshore operations`,
        ],
        purpose: 'Get general maritime information'
      },
      {
        name: 'Technical Resources',
        priority: 'medium',
        queries: [
          `${query} technical specifications`,
          `${query} industry standards`,
        ],
        purpose: 'Get technical details'
      }
    ],
    totalQueries: 5
  };
}

/**
 * Convert strategy to flat query list for query planner
 */
export function strategyToQueryList(strategy: SpecializedStrategy): Array<{
  query: string;
  purpose: string;
  priority: string;
}> {
  const queries: Array<{ query: string; purpose: string; priority: string }> = [];
  
  for (const tier of strategy.tiers) {
    for (const query of tier.queries) {
      queries.push({
        query,
        purpose: `${tier.name}: ${tier.purpose}`,
        priority: tier.priority
      });
    }
  }
  
  return queries;
}

/**
 * Get technical forum sites for real-world experience
 */
export function getTechnicalForumSites(): string[] {
  return [
    'eng-tips.com',
    'marineengineering.com',
    'gcaptain.com',
    'sailnet.com',
    'thehulltruth.com',
    'reddit.com/r/maritime',
    'reddit.com/r/marineengineering',
    'yachtforums.com'
  ];
}

/**
 * Get OEM/manufacturer sites for official documentation
 */
export function getOEMSites(): string[] {
  return [
    'caterpillar.com',
    'cummins.com',
    'man-es.com',
    'wartsila.com',
    'yanmar.com',
    'volvopenta.com',
    'kongsberg.com',
    'rolls-royce.com',
    'brunvoll.no',
    'schottel.de',
    'stamford-avk.com',
    'grundfos.com',
    'sulzer.com'
  ];
}

/**
 * Get classification society sites for regulatory information
 */
export function getClassificationSocietySites(): string[] {
  return [
    'dnv.com',
    'abs.org',
    'lr.org',
    'bureauveritas.com',
    'rina.org',
    'classnk.or.jp',
    'krs.co.kr',
    'ccs.org.cn',
    'imo.org'
  ];
}

