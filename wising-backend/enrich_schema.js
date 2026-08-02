const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, 'layer1_india_schema.json');
const guardsPath = path.resolve(__dirname, '../src/machines/layer1IndiaMachine.guards.ts');
const sidebarPath = path.resolve(__dirname, '../src/machines/complianceSidebarMachine.ts');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const guardsContent = fs.readFileSync(guardsPath, 'utf8');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

// Extract step gates
const stepGates = {};
const stepDefsMatch = sidebarContent.match(/export const STEP_DEFINITIONS:\s*StepDefinition\[\]\s*=\s*\[([\s\S]*?)\];/);
if (stepDefsMatch) {
  const lines = stepDefsMatch[1].split('\n');
  lines.forEach(line => {
    const idMatch = line.match(/id:\s*"([^"]+)"/);
    const gateMatch = line.match(/gate:\s*"([^"]+)"/);
    if (idMatch) {
      stepGates[idMatch[1]] = gateMatch ? gateMatch[1] : "always enabled";
    }
  });
}

// Extract gate logic
const gatesLogic = {};
const gatesMatch = sidebarContent.match(/const GATES\s*=\s*{([\s\S]*?)};/);
if (gatesMatch) {
  const lines = gatesMatch[1].split('\n');
  lines.forEach(line => {
    const match = line.match(/^\s*([a-zA-Z0-9_]+):\s*\([^)]*\)\s*=>\s*(.*?),?$/);
    if (match) {
      gatesLogic[match[1]] = match[2].trim();
    }
  });
}

// Extract field guards
const fieldGuards = {};
const exportMatches = guardsContent.matchAll(/export const ([a-zA-Z0-9_]+)\s*=\s*\([^)]*\):\s*boolean\s*=>\s*([\s\S]*?);/g);
for (const match of exportMatches) {
    let logic = match[2].trim();
    if (logic.startsWith('{')) {
        logic = "Complex Logic";
    }
    fieldGuards[match[1]] = logic;
}
const complexMatches = guardsContent.matchAll(/export const ([a-zA-Z0-9_]+)\s*=\s*\([^)]*\):\s*boolean\s*=>\s*{([\s\S]*?)\n}/g);
for (const match of complexMatches) {
    let logic = match[2].trim().replace(/\s+/g, ' ');
    fieldGuards[match[1]] = logic;
}


const xstateBindings = {
    steps_enabled_when: {},
    keys_enabled_when: {
        "entity_type": "Always enabled",
        "mfg_setup_date": "showMfgDates: " + (fieldGuards['showMfgDates'] || ''),
        "mfg_commence_date": "showMfgDates: " + (fieldGuards['showMfgDates'] || ''),
        "mat_book_profit": "showMatProfit: " + (fieldGuards['showMatProfit'] || ''),
        "tax_regime": "showProfileRegime: " + (fieldGuards['showProfileRegime'] || ''),
        "live_tracking_active": "Always enabled",
        "days_in_india_preceding_4_years_gte_365": "showP4y: " + (fieldGuards['showP4y'] || ''),
        "employment_or_crew_status": "showEmployment: " + (fieldGuards['showEmployment'] || ''),
        "is_departure_year": "showDeparture: " + (fieldGuards['showDeparture'] || ''),
        "is_indian_citizen": "showVisitor: " + (fieldGuards['showVisitor'] || ''),
        "is_pio_or_oci": "showVisitor: " + (fieldGuards['showVisitor'] || ''),
        "nr_years_last_10_gte_9": "showD7 (or showHufNr9): " + (fieldGuards['showD7'] || '') + " / " + (fieldGuards['showHufNr9'] || ''),
        "days_in_india_last_7_years_lte_729": "showD7 (or showHufD7): " + (fieldGuards['showD7'] || '') + " / " + (fieldGuards['showHufD7'] || ''),
        "is_wholly_outside_india": "showWhollyOutside: " + (fieldGuards['showWhollyOutside'] || ''),
        "is_indian_company": "showIndianCompany: " + (fieldGuards['showIndianCompany'] || ''),
        "is_poem_in_india": "showPoem: " + (fieldGuards['showPoem'] || '')
    },
    step_gate_definitions: gatesLogic
};

for (const [stepId, gateName] of Object.entries(stepGates)) {
    xstateBindings.steps_enabled_when[stepId] = gateName === 'always enabled' ? gateName : `${gateName}: ${gatesLogic[gateName]}`;
}

const finalSchema = {
    xstate_bindings: xstateBindings,
    models: schema
};

fs.writeFileSync(schemaPath, JSON.stringify(finalSchema, null, 4));
console.log("Successfully enriched schema with XState bindings!");
