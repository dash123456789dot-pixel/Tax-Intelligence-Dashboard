// ────────────────────────────────────────────────────────────────────────
// deriveHouseProperty.ts
// Pure, DOM-free port of the House Property step logic in layer1_india.html
// ────────────────────────────────────────────────────────────────────────

export interface PropertyUploads {
  loan: 'idle' | 'scanning' | 'success';
  rent: 'idle' | 'scanning' | 'success';
  tax: 'idle' | 'scanning' | 'success';
}

export interface PropertyDetails {
  property_use: 'SOP' | 'LOP' | 'DLOP';
  gross_annual_value_inr: number | null;
  municipal_taxes_paid_inr: number | null;
  interest_on_borrowed_capital_inr: number | null;
  pre_construction_interest_inr: number | null;
  is_self_occupied_with_loan: boolean;
  co_owner_share_percent: number | null;
  financial_values_represent: 'TOTAL_PROPERTY' | 'MY_SHARE_ONLY';
  _uploads: PropertyUploads;
}

export interface PropertyUI {
  isSOP: boolean;
  hideInterest: boolean;
  showGavAndTax: boolean;
  showInterestFields: boolean;
  showFinancialValuesRepresent: boolean;
  showSelfOccupiedToggle: boolean;
}

export interface HousePropertyDetails {
  has_house_property_income: boolean;
  properties: PropertyDetails[];
}

export interface HousePropertyContext {
  tax_regime: string;
  entity_type: string;
  house_property: HousePropertyDetails;
  ui: {
    visibility: {
      divHpSection: boolean;
      properties: PropertyUI[];
    };
  };
}

export function parseINRCurrency(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const stripped = val.toString().replace(/[^0-9.-]/g, '');
  if (stripped === '' || stripped === '-' || stripped === '.') return null;
  return parseInt(stripped, 10);
}

export function formatINRDisplay(numericValue: number | null | undefined): string {
  if (numericValue === null || numericValue === undefined) return '';
  const isNegative = numericValue < 0;
  const digits = Math.abs(numericValue);
  const formatted = Number(digits).toLocaleString('en-IN');
  return isNegative ? '-' + formatted : formatted;
}

export function defaultProperty(): PropertyDetails {
  return {
    property_use: 'SOP',
    gross_annual_value_inr: null,
    municipal_taxes_paid_inr: null,
    interest_on_borrowed_capital_inr: null,
    pre_construction_interest_inr: null,
    is_self_occupied_with_loan: false,
    co_owner_share_percent: 100,
    financial_values_represent: 'TOTAL_PROPERTY',
    _uploads: { loan: 'idle', rent: 'idle', tax: 'idle' },
  };
}

// updateHPField(idx, field, val): value coercion + SOP/regime side effects.
export function applyHPFieldUpdate(prop: PropertyDetails, field: string, rawVal: any, taxRegime: string): PropertyDetails {
  let val = rawVal;
  if (field === 'co_owner_share_percent' && val !== null) {
    val = Math.min(100, Math.max(1, parseINRCurrency(val) || 1));
  } else if (val !== null && typeof val !== 'boolean' && field !== 'property_use' && field !== 'financial_values_represent') {
    val = val === '' ? null : parseINRCurrency(val);
  }

  const next = { ...prop, [field]: val } as PropertyDetails;

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

// Per-property visibility, ported from the inline template logic in renderHouseProperties().
export function computePropertyVisibility(prop: PropertyDetails, taxRegime: string, entityType: string): PropertyUI {
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

export function computeVisibility(context: Omit<HousePropertyContext, 'ui'>) {
  return {
    divHpSection: !!context.house_property.has_house_property_income,
    properties: context.house_property.properties.map((prop) =>
      computePropertyVisibility(prop, context.tax_regime, context.entity_type)
    ),
  };
}

export function deriveAll(rawContext: Omit<HousePropertyContext, 'ui'> & { ui?: any }): HousePropertyContext {
  const context = { ...rawContext };
  const visibility = computeVisibility(context);
  return { ...context, ui: { visibility } } as HousePropertyContext;
}
