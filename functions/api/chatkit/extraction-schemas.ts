/**
 * MARITIME EXTRACTION SCHEMAS
 * 
 * Database-aligned extraction schemas for different entity types.
 * These schemas map directly to the Supabase database structure.
 */

/**
 * EQUIPMENT EXTRACTION SCHEMA
 * Maps to: equipment_definitions, vessel_equipment_installations
 */
export const EQUIPMENT_EXTRACTION_TEMPLATE = `
## EQUIPMENT PROFILE

**Equipment Identity:**
- Equipment Code: [standardized code if available]
- Equipment Name: [official equipment name] [[N]](url)
- Manufacturer: [manufacturer name] [[N]](url)
- Manufacturer ID: [UUID reference if available]
- Model: [exact model number/designation] [[N]](url)
- Model Year: [year of model introduction if available]
- Equipment Type: [engine, generator, pump, compressor, etc.] [[N]](url)
- System Category: [propulsion, auxiliary_machinery, electrical_systems, safety_systems, navigation_systems, communication_systems, cargo_handling, accommodation_systems, environmental_systems, hull_systems, other] [[N]](url)

**Installation Details (for vessel_equipment_installations):**
- Equipment Tag: [unique vessel-specific identifier]
- Installation Name: [descriptive name for this installation]
- Installation Date: [YYYY-MM-DD] [[N]](url)
- Commissioning Date: [YYYY-MM-DD] [[N]](url)
- Installation Location: [general location description]
- Deck Level: [deck name/number]
- Compartment: [compartment name]
- Exact Location: [detailed location description]
- Equipment Position: [PORT, STBD, CENTER, AFT, FWD, UPPER, LOWER, BOW, STERN, MIDSHIPS, OVERHEAD, DECK, BULKHEAD, ENGINE_ROOM, BRIDGE, CARGO_HOLD, etc.] [[N]](url)
- Secondary Position: [if combined position like PORT+UPPER]
- Serial Number: [manufacturer serial number] [[N]](url)
- Manufacturing Date: [YYYY-MM-DD] [[N]](url)

**Operational Status:**
- Operational Status: [operational, standby, maintenance, repair, testing, out_of_service, awaiting_parts, condemned, decommissioned, satisfactory, new_overhaul, removed, defective] [[N]](url)
- Condition Rating: [1-5, where 5 is excellent] [[N]](url)
- Total Running Hours: [cumulative hours] [[N]](url)

**Warranty Information:**
- Warranty Provider: [company providing warranty] [[N]](url)
- Warranty End Date: [YYYY-MM-DD] [[N]](url)

**Technical Specifications:**
- Rated Power: [kW/HP] [[N]](url)
- Rated Voltage: [V if applicable]
- Rated Current: [A if applicable]
- Operating Pressure: [bar if applicable]
- Operating Temperature Range: [min-max °C]
- Weight: [kg] [[N]](url)
- Dimensions (L×W×H): [mm] [[N]](url)
- Fuel Type: [diesel, HFO, gas, electric, etc.]
- Fuel Consumption: [L/hr or kg/hr at rated load] [[N]](url)

**Engine-Specific (if applicable):**
- Engine Configuration: [inline, V-type, etc.]
- Number of Cylinders: [number]
- Bore × Stroke: [mm × mm]
- Displacement: [L]
- Compression Ratio: [ratio]
- Aspiration: [naturally aspirated, turbocharged, turbocharged & intercooled]
- Injection System: [mechanical, common rail, etc.]
- Cooling System: [air, water, heat exchanger]
- Starting System: [electric, pneumatic, hydraulic]
- Rotation: [CW/CCW viewed from flywheel]

**Maintenance Requirements:**
- Recommended Maintenance Strategy: [preventive, predictive, condition_based]
- Expected Service Life: [years/hours]
- Major Overhaul Interval: [hours]
- Oil Change Interval: [hours] [[N]](url)
- Filter Change Interval: [hours] [[N]](url)
- Inspection Interval: [hours] [[N]](url)

**Acquisition & Costs:**
- Typical Acquisition Cost: [USD if available]
- Typical Replacement Cost: [USD if available]
- Lead Time for Procurement: [weeks/months]

**Documentation:**
- Equipment Manual Available: [Yes/No, URL if available]
- Technical Drawings Available: [Yes/No]
- Installation Guide Available: [Yes/No]
- Maintenance Manual Available: [Yes/No, URL if available]

**Operational Experience & Best Practices:**
[Extract real-world experience from technical forums and marine engineer discussions]
- Common Operational Issues: [list from forums/experience]
- Recommended Operating Practices: [best practices from field experience]
- Critical Maintenance Points: [lessons learned from operators]
- Failure Modes & Prevention: [common failures and how to prevent them]
- Fuel Quality Requirements: [real-world fuel quality considerations]
- Environmental Considerations: [operating temperature, humidity, salt air, etc.]

**Parts & Compatibility:**
- Critical Wear Parts: [list of high-wear components]
- Compatible Parts Sources: [OEM, aftermarket options]
- Common Replacement Parts: [frequently replaced items]

## MAINTENANCE ANALYSIS

**OEM Recommendations:**
[Extract from official maintenance manuals]

**Field Experience:**
[Extract from forums like eng-tips.com, marine engineering communities]

**Best Practices:**
[Real-world recommendations from experienced marine engineers]
`;

/**
 * PARTS EXTRACTION SCHEMA
 * Maps to: parts, equipment_parts, vessel_parts_inventory
 */
export const PARTS_EXTRACTION_TEMPLATE = `
## PART PROFILE

**Part Identity:**
- Part Number: [OEM part number] [[N]](url)
- Part Name: [official part name] [[N]](url)
- Part Description: [detailed description]
- Part Category: [filters, bearings, seals, electrical, etc.]
- Part Subcategory: [specific type]
- Manufacturer: [manufacturer name] [[N]](url)
- Manufacturer Part Number: [if different from primary]
- OEM Part: [Yes/No - is this original equipment manufacturer part]

**Technical Specifications:**
- Material: [material composition] [[N]](url)
- Dimensions: [length, width, height, diameter, etc.] [[N]](url)
- Weight: [grams/kg] [[N]](url)
- Color: [if relevant for identification]
- Technical Specifications: [detailed specs in JSON format]
- Operating Parameters: [pressure, temperature, voltage, etc.]

**Compatibility:**
- Compatible Equipment: [list of equipment this part fits] [[N]](url)
- Compatible Systems: [vessel systems this part is used in]
- Alternative Parts: [cross-reference compatible parts] [[N]](url)
- Superseded By: [newer replacement part number if obsolete]
- Supersedes: [older part number this replaces]

**Procurement:**
- Unit Cost: [USD] [[N]](url)
- Currency: [USD, EUR, etc.]
- Minimum Order Quantity: [MOQ]
- Typical Lead Time: [days/weeks] [[N]](url)
- Shelf Life: [months if applicable]
- Storage Requirements: [special storage conditions]

**Safety & Handling:**
- Hazardous Material: [Yes/No]
- HAZMAT Class: [UN classification if applicable]
- HAZMAT Classification: [detailed classification string] [[N]](url)
- Safety Precautions: [handling precautions]
- Storage Requirements: [special storage conditions, temperature, humidity, etc.] [[N]](url)

**Installation & Usage:**
- Installation Difficulty: [easy, medium, difficult, expert]
- Required Tools: [tools needed for installation]
- Installation Time: [estimated minutes]
- Torque Specifications: [if applicable] [[N]](url)
- Special Procedures: [any special installation requirements]

**Maintenance Context:**
- Wear Part: [Yes/No]
- Is Consumable: [Yes/No - used once and replaced] [[N]](url)
- Is Rotable: [Yes/No - can be repaired/overhauled and reused] [[N]](url)
- Critical Part: [Yes/No - critical for equipment operation]
- Replacement Interval: [hours/cycles] [[N]](url)
- Inspection Interval: [hours/cycles]

**Availability & Suppliers:**
- Primary Suppliers: [list of suppliers] [[N]](url)
- Marine Supply Houses: [marine chandlers stocking this part]
- Online Availability: [Amazon, eBay, specialized marine suppliers]

**Real-World Experience:**
[Extract from technical forums and marine engineer discussions]
- Common Failure Modes: [how this part typically fails]
- Life Expectancy: [actual field experience vs OEM specs]
- Installation Tips: [tips from experienced technicians]
- Quality Comparisons: [OEM vs aftermarket experiences]
`;

/**
 * PMS/MAINTENANCE EXTRACTION SCHEMA
 * Maps to: equipment_maintenance_recommendations, pms_schedules
 */
export const PMS_EXTRACTION_TEMPLATE = `
## MAINTENANCE PROFILE

**Maintenance Task Identity:**
- Task Title: [descriptive name of maintenance task] [[N]](url)
- Maintenance Type: [inspection, service, replacement, overhaul, calibration, cleaning, lubrication, testing]
- Maintenance Category: [parts_replacement, service, inspection, calibration]
- Equipment: [equipment this maintenance applies to] [[N]](url)
- Specific Part: [if part-specific maintenance]
- System: [vessel system category]

**Maintenance Intervals:**
- Primary Interval (Hours): [running hours] [[N]](url)
- Primary Interval Description: [description of primary interval]
- Secondary Interval: [days/weeks/months/years if applicable] [[N]](url)
- Secondary Interval Description: [description of secondary interval]
- Interval Logic: [OR (whichever first), AND (both must be met), WHICHEVER_LAST]
- Critical Task: [Yes/No - must be performed]
- Conditional Task: [Yes/No - depends on conditions]
- Condition Trigger: [what triggers this conditional maintenance]

**Procedure:**
- Maintenance Procedure: [detailed step-by-step procedure] [[N]](url)
- Safety Requirements: [safety precautions and PPE] [[N]](url)
- Required Tools: [list of tools needed with specifications] [[N]](url)
- Required Parts: [consumables and replacement parts] [[N]](url)
- Special Equipment: [specialized equipment needed]

**Task Details:**
- Estimated Duration: [minutes] [[N]](url)
- Difficulty Level: [easy, medium, difficult, expert]
- Personnel Requirements: [number and qualification level]
- Certifications Required: [if any special certifications needed]
- Simultaneous Maintenance: [can be done with other tasks]

**Regulatory Compliance:**
- Regulatory Requirement: [SOLAS, MARPOL, Class Society, etc.]
- Classification Society Requirement: [DNV, ABS, LR, etc.]
- Statutory Requirement: [flag state requirements]
- Audit Trail Required: [Yes/No]

**Documentation:**
- Source Document: [maintenance manual reference] [[N]](url)
- Manufacturer Notes: [OEM-specific notes]
- Technical Bulletins: [relevant service bulletins]
- Industry Guidelines: [applicable industry standards]

**OEM Recommendations:**
[Extract from official maintenance manuals]
- Official Interval: [from OEM documentation] [[N]](url)
- Recommended Procedure: [OEM procedure]
- Critical Points: [OEM warnings and critical steps]
- Special Tools: [OEM-specified tools]

**Real-World Experience & Best Practices:**
[Extract from technical forums, marine engineer discussions, and field experience]
- Actual Field Intervals: [what experienced engineers actually do]
- Common Problems: [issues encountered during this maintenance]
- Tips & Tricks: [practical advice from experienced technicians]
- Time-Saving Techniques: [efficient methods]
- Critical Watch Points: [what to check carefully]
- Common Mistakes: [errors to avoid]
- Condition Indicators: [signs that maintenance is needed]
- Extended Operation: [can interval be safely extended and under what conditions]

**Parts Consumption:**
- Consumable Materials: [oil, filters, gaskets, etc. with quantities]
- Special Materials: [sealants, lubricants, cleaning chemicals]
- Waste Disposal: [proper disposal of used materials]

**Quality Checks:**
- Inspection Points: [what to inspect after maintenance]
- Test Procedures: [functional tests required]
- Acceptance Criteria: [how to verify maintenance was successful]
- Documentation Requirements: [what must be recorded]

**Conditional Maintenance:**
- Triggers: [conditions that indicate this maintenance is needed]
- Warning Signs: [symptoms that suggest immediate attention]
- Monitoring Parameters: [what to monitor to determine need]
`;

/**
 * REGULATION/COMPLIANCE EXTRACTION SCHEMA
 * Maps to vessel_systems (regulatory flags), statutory_certificates
 */
export const REGULATION_EXTRACTION_TEMPLATE = `
## REGULATORY PROFILE

**Regulation Identity:**
- Regulation Name: [full name] [[N]](url)
- Regulation Type: [SOLAS, MARPOL, Class Society Rule, Flag State, IMO, etc.]
- Authority: [issuing organization] [[N]](url)
- Reference Number: [regulation/rule number] [[N]](url)
- Version/Amendment: [current version]
- Effective Date: [when regulation became effective]

**Applicability:**
- Vessel Types: [which types of vessels this applies to]
- Tonnage Limits: [if applies only above certain GT]
- Trading Area: [international, coastal, inland, etc.]
- Specific Systems: [which vessel systems must comply]
- Equipment Requirements: [specific equipment mandated]

**Requirements:**
- Design Standards: [design requirements] [[N]](url)
- Equipment Standards: [equipment specifications]
- Testing Requirements: [required tests and intervals]
- Certification Requirements: [certificates needed]
- Documentation: [required documentation]
- Inspection Intervals: [how often inspected]

**Classification Society Rules:**
[If applicable]
- DNV Requirements: [DNV-specific rules] [[N]](url)
- ABS Requirements: [ABS-specific rules] [[N]](url)
- Lloyd's Requirements: [LR-specific rules] [[N]](url)
- Bureau Veritas: [BV-specific rules] [[N]](url)
- Class Notation: [relevant class notations]

**Survey Requirements:**
- Annual Survey: [requirements]
- Intermediate Survey: [requirements]
- Special Survey: [requirements]
- Renewal Survey: [requirements]
- Continuous Survey: [if applicable]

**Compliance Verification:**
- Inspection Procedure: [how compliance is verified]
- Test Methods: [specific tests required]
- Acceptance Criteria: [passing criteria]
- Documentation: [required records]

**Non-Compliance:**
- Deficiency Categories: [types of deficiencies]
- Rectification Requirements: [how to correct]
- Time Limits: [deadlines for correction]
- Detention Criteria: [when vessel can be detained]
- Penalties: [potential consequences]

**Industry Best Practices:**
[Extract from classification societies, industry guidelines, maritime forums]
- Common Deficiencies: [frequently found issues]
- Best Practices: [how to maintain compliance]
- Lessons Learned: [from PSC detentions and inspections]
- Preparation Tips: [how to prepare for surveys]
`;

/**
 * SERVICE EXTRACTION SCHEMA
 * Maps to: service_definitions, service_materials
 */
export const SERVICE_EXTRACTION_TEMPLATE = `
## SERVICE PROFILE

**Service Identity:**
- Service Code: [standardized service code]
- Service Name: [official service name] [[N]](url)
- Service Description: [detailed description of service]
- Service Category: [oil_change, filter_replacement, lubrication, cleaning, calibration, descaling, fluid_replacement, system_flush] [[N]](url)

**Equipment Compatibility:**
- Compatible Equipment Types: [list of equipment this service applies to] [[N]](url)
- Equipment Models: [specific models if applicable]
- System Categories: [which vessel systems require this service]

**Service Procedure:**
- Step-by-Step Procedure: [detailed procedure] [[N]](url)
- Estimated Duration: [minutes] [[N]](url)
- Required Certifications: [any certifications needed]
- Safety Requirements: [safety precautions and PPE] [[N]](url)

**Required Materials (service_materials):**
- Consumable Materials: [list with quantities] [[N]](url)
  - Material 1: [name, part_id, quantity per service, function]
  - Material 2: [name, part_id, quantity per service, function]
- Special Materials: [sealants, lubricants, cleaning chemicals]
- Tools Required: [specialized tools needed]

**Environmental Considerations:**
- Waste Disposal: [proper disposal methods] [[N]](url)
- Environmental Impact: [considerations]
- Regulatory Compliance: [any environmental regulations]

**Service Context:**
- Service Frequency: [how often this service is typically needed]
- Conditions Requiring Service: [when this service should be performed]
- Is Consumable Intensive: [Yes/No - requires significant consumables]
- Estimated Cost: [typical cost range if available]

**Best Practices:**
[Extract from technical forums and marine engineer discussions]
- Common Issues: [problems encountered during this service]
- Tips & Tricks: [practical advice from experienced technicians]
- Quality Checks: [how to verify service was performed correctly]
`;

/**
 * EVENT/INCIDENT EXTRACTION SCHEMA
 * Maps to: events, work_done_records, event_attachments
 */
export const EVENT_EXTRACTION_TEMPLATE = `
## EVENT PROFILE

**Event Identity:**
- Report Number: [incident/event report number]
- Event Type: [breakdown, malfunction, defect, damage, collision, grounding, fire, flooding, pollution, injury, near_miss, hazardous_occurrence, other] [[N]](url)
- Severity: [critical, high, medium, low] [[N]](url)
- Title: [brief event title] [[N]](url)

**Event Details:**
- Description: [detailed event description] [[N]](url)
- Occurred At: [timestamp] [[N]](url)
- Location Details: [where on vessel/equipment]
- Equipment Involved: [affected equipment] [[N]](url)
- System Involved: [affected vessel system]

**Immediate Response:**
- Detected By: [person/system that detected issue]
- Immediate Actions Taken: [emergency response] [[N]](url)
- Operational Impact: [how operations were affected] [[N]](url)
- Safety Impact: [any safety concerns] [[N]](url)
- Environmental Impact: [any environmental concerns] [[N]](url)

**Root Cause Analysis:**
- Root Cause: [identified cause] [[N]](url)
- Contributing Factors: [factors that contributed]
- PMS Compliance Issue: [Yes/No - was maintenance overdue]
- Lack of Maintenance: [Yes/No - was inadequate maintenance a factor]

**Corrective Actions:**
- Corrective Action: [actions to fix the issue] [[N]](url)
- Preventive Action: [actions to prevent recurrence] [[N]](url)
- Required Parts: [parts needed for repair]
- Service Required: [Yes/No - does this require service work]
- Spare Parts Required: [Yes/No - are spare parts needed]

**Status & Follow-up:**
- Status: [reported, acknowledged, under_review, in_progress, verified, closed] [[N]](url)
- Estimated Downtime: [hours if equipment offline]
- Reportable to Authority: [Yes/No]
- Insurance Claim Required: [Yes/No]

**Lessons Learned:**
[Extract from incident databases and safety bulletins]
- Similar Incidents: [similar past incidents]
- Industry Best Practices: [how industry prevents this]
- Recommendations: [recommendations to prevent future occurrence]
`;

/**
 * Get extraction template for entity type
 */
export function getExtractionTemplate(entityType: string): string {
  switch (entityType) {
    case 'equipment':
      return EQUIPMENT_EXTRACTION_TEMPLATE;
    case 'part':
      return PARTS_EXTRACTION_TEMPLATE;
    case 'pms':
      return PMS_EXTRACTION_TEMPLATE;
    case 'regulation':
      return REGULATION_EXTRACTION_TEMPLATE;
    case 'service':
      return SERVICE_EXTRACTION_TEMPLATE;
    case 'event':
      return EVENT_EXTRACTION_TEMPLATE;
    default:
      return ''; // Vessel template is already in agent-orchestrator
  }
}

/**
 * Generate extraction instructions for entity type
 */
export function getExtractionInstructions(entityType: string, sourceCount: number): string {
  const baseInstructions = `
**CRITICAL EXTRACTION REQUIREMENTS:**

1. **COMPREHENSIVE DATA EXTRACTION**:
   - Read ALL ${sourceCount} sources thoroughly
   - Extract EVERY piece of relevant information
   - Cross-reference between sources to build complete picture
   - Include partial information if complete data unavailable

2. **MULTI-SOURCE INTELLIGENCE**:
   - Source 1-3: Official documentation (OEM, registries, classification)
   - Source 4-7: Technical specifications and datasheets  
   - Source 8+: Real-world experience (forums, marine engineer discussions)
   - Synthesize information from ALL source types

3. **TECHNICAL PRECISION**:
   - Use exact model numbers, specifications, and technical terms
   - Include units of measurement for all numeric values
   - Specify tolerances and operating ranges where available
   - Note any conditional or variable specifications

4. **REAL-WORLD CONTEXT**:
   - Extract practical experience from technical forums
   - Include common issues and solutions from field experience
   - Note best practices from experienced marine engineers
   - Highlight lessons learned from operational experience

5. **CITATION DISCIPLINE**:
   - Cite EVERY fact with [[N]](url)
   - Use actual source URLs, not placeholders
   - Multiple sources can cite same fact: "42 meters [[1]](url) [[3]](url)"

6. **"NOT FOUND" ONLY AS LAST RESORT**:
   - Only after checking ALL ${sourceCount} sources thoroughly
   - Prefer partial information over "Not found"
   - Infer from context when possible
`;

  switch (entityType) {
    case 'equipment':
      return baseInstructions + `

**EQUIPMENT-SPECIFIC INSTRUCTIONS**:
- Focus on OEM specifications from manufacturer sources
- Extract maintenance intervals and procedures  
- Include real-world reliability data from forums
- Note common failure modes and prevention measures
- Document fuel quality requirements and environmental limits
- Extract parts information and compatibility data
`;

    case 'part':
      return baseInstructions + `

**PARTS-SPECIFIC INSTRUCTIONS**:
- Extract precise part numbers (OEM and aftermarket)
- Document cross-reference and alternative parts
- Include dimensional and material specifications
- Note procurement information (cost, lead time, suppliers)
- Extract installation procedures and torque specs
- Document real-world experiences with OEM vs aftermarket
`;

    case 'pms':
      return baseInstructions + `

**PMS-SPECIFIC INSTRUCTIONS**:
- Extract official OEM maintenance intervals
- Document complete maintenance procedures step-by-step
- Include required parts, tools, and consumables
- Note real-world interval adjustments from forums
- Extract best practices from experienced engineers
- Document common mistakes and critical watch points
- Include regulatory/class society requirements if applicable
`;

    case 'regulation':
      return baseInstructions + `

**REGULATION-SPECIFIC INSTRUCTIONS**:
- Extract official regulation text and requirements
- Document all applicable classification society rules
- Include survey and inspection requirements
- Note common deficiencies from PSC data
- Extract best practices for compliance
- Document lessons learned from detentions
`;

    case 'service':
      return baseInstructions + `

**SERVICE-SPECIFIC INSTRUCTIONS**:
- Extract standardized service procedure step-by-step
- Document all required materials and consumables
- Include tool requirements and specifications
- Note safety requirements and environmental compliance
- Extract best practices from service technicians
- Document common issues during service execution
`;

    case 'event':
      return baseInstructions + `

**EVENT-SPECIFIC INSTRUCTIONS**:
- Extract detailed event description and timeline
- Document root cause analysis
- Include immediate response and corrective actions
- Note lessons learned and preventive measures
- Extract similar incident data from safety bulletins
- Document industry best practices for prevention
`;

    default:
      return baseInstructions;
  }
}

