// ────────────────────────────────────────────────────────────────────────
// deriveHouseProperty.js
// Pure, DOM-free port of the House Property step logic in layer1_india.html:
// toggleHPSection(), addHouseProperty(), removeHouseProperty(),
// updateHPField(), and the per-property visibility rules computed inline
// inside renderHouseProperties() (isSOP / hideInterest / co-owner-share /
// self-occupied-with-loan gating). parseINRCurrency() is ported verbatim.
// No DOM reads/writes anywhere in this file.
// ────────────────────────────────────────────────────────────────────────

function parseINRCurrency(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const stripped = val.toString().replace(/[^0-9.-]/g, '');
  if (stripped === '' || stripped === '-' || stripped === '.') return null;
  return parseInt(stripped, 10);
}

function formatINRDisplay(numericValue) {
  if (numericValue === null || numericValue === undefined || numericValue === '') return '';
  const isNegative = numericValue < 0;
  const digits = Math.abs(numericValue);
  const formatted = Number(digits).toLocaleString('en-IN');
  return isNegative ? '-' + formatted : formatted;
}

function defaultProperty() {
  return {
    property_use: 'SOP',
    gross_annual_value_inr: null,
    municipal_taxes_paid_inr: null,
    interest_on_borrowed_capital_inr: null,
    pre_construction_interest_inr: null,
    is_self_occupied_with_loan: false,
    co_owner_share_percent: 100,
    financial_values_represent: 'TOTAL_PROPERTY',
    // UI-only mock upload tracker (loan/rent/tax -> 'idle' | 'scanning' | 'success'),
    // ported from handleHPUpload()'s fake "Scanning Document..." -> "Extraction
    // Successful" animation. Not part of the real domain schema (no field like
    // this exists in state.domestic_income.house_property.properties[i] in the
    // original — it purely mutated DOM text/classes).
    _uploads: { loan: 'idle', rent: 'idle', tax: 'idle' },
  };
}

// updateHPField(idx, field, val): value coercion + SOP/regime side effects.
function applyHPFieldUpdate(prop, field, rawVal, taxRegime) {
  let val = rawVal;
  if (field === 'co_owner_share_percent' && val) {
    val = Math.min(100, Math.max(1, parseINRCurrency(val)));
  } else if (val !== null && typeof val !== 'boolean' && field !== 'property_use' && field !== 'financial_values_represent') {
    val = val === '' ? null : parseINRCurrency(val);
  }

  let next = { ...prop, [field]: val };

  // Zero out GAV and Taxes if SOP
  if (field === 'property_use' && val === 'SOP') {
    next.gross_annual_value_inr = null;
    next.municipal_taxes_paid_inr = null;
    // Also zero out interest if New Regime
    if (taxRegime === 'NEW') {
      next.interest_on_borrowed_capital_inr = null;
      next.pre_construction_interest_inr = null;
    }
  }

  return next;
}

// Per-property visibility, ported from the inline template logic in
// renderHouseProperties().
function computePropertyVisibility(prop, taxRegime, entityType) {
  const isSOP = prop.property_use === 'SOP';
  const hideInterest = isSOP && taxRegime === 'NEW';
  const isCorp = entityType !== 'individual' && entityType !== 'huf';
  return {
    isSOP,
    hideInterest,
    showGavAndTax: !isSOP,
    showInterestFields: !hideInterest,
    showFinancialValuesRepresent: (prop.co_owner_share_percent || 0) < 100,
    showSelfOccupiedToggle: !(taxRegime === 'NEW' || isCorp),
  };
}

function computeVisibility(context) {
  return {
    divHpSection: !!context.house_property.has_house_property_income,
    properties: context.house_property.properties.map((prop) =>
      computePropertyVisibility(prop, context.tax_regime, context.entity_type)
    ),
  };
}

function deriveAll(rawContext) {
  const context = { ...rawContext };
  const visibility = computeVisibility(context);
  return { ...context, ui: { visibility } };
}

export {
  parseINRCurrency,
  formatINRDisplay,
  defaultProperty,
  applyHPFieldUpdate,
  computePropertyVisibility,
  computeVisibility,
  deriveAll,
};
