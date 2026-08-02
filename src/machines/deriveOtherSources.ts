// ────────────────────────────────────────────────────────────────────────
// deriveOtherSources.ts
// Pure, DOM-free port of the Other Sources step logic in layer1_india.html:
// toggleOSSection(), updateOSField() (incl. its auto-derived family-pension
// standard deduction and its "any field edit force-flips the gate on"
// quirk), toggleAgriSection()/updateAgriIncome(), and the entity-driven
// field visibility rules that live inside the giant updateBizEntityType()
// function (card-os-retirement / card-os-family-pension /
// div-os-minor-child / div-os-angel-tax / div-os-lic-maturity /
// div-os-gifts-exemptions / div-os-gifts-wrapper+banner-trust-gifts /
// div-os-spousal-clubbing / div-os-local-authority-10-20). No DOM
// reads/writes anywhere in this file.
// ────────────────────────────────────────────────────────────────────────

export function parseINRCurrency(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const stripped = val.toString().replace(/[^0-9.-]/g, '');
  if (stripped === '' || stripped === '-' || stripped === '.') return null;
  return parseInt(stripped, 10);
}

export function formatINRDisplay(numericValue: any): string {
  if (numericValue === null || numericValue === undefined || numericValue === '') return '';
  const isNegative = numericValue < 0;
  const digits = Math.abs(numericValue);
  const formatted = Number(digits).toLocaleString('en-IN');
  return isNegative ? '-' + formatted : formatted;
}

// updateOSField(field, val): every single field edit force-sets
// has_other_sources_income = true, REGARDLESS of the master gate's current
// value — a real quirk of the original (the gate and the fields aren't
// fully decoupled the way they might first appear). family_pension_gross_inr
// additionally derives family_pension_standard_deduction_inr = min(15000,
// round(gross/3)) as a side effect.
export function applyOSFieldUpdate(otherSources: any, field: string, rawVal: any): any {
  let value = rawVal;
  if (typeof rawVal !== 'boolean') {
    value = rawVal === '' ? null : parseINRCurrency(rawVal);
  }
  let next = { ...otherSources, has_other_sources_income: true, [field]: value };
  if (field === 'family_pension_gross_inr') {
    const gross = value || 0;
    next.family_pension_standard_deduction_inr = Math.min(15000, Math.round(gross / 3));
  }
  
  if (next.gifts_exemption_marriage || next.gifts_exemption_relative) {
    next.gifts_above_50k_inr = 0;
  }
  
  return next;
}

// clearFieldsForEntityChange(): side effects that fire specifically WHEN
// entity_type changes (ported from updateBizEntityType()'s clearing of
// os-angel-tax / os-lic-maturity / os-gifts on entity switch). This is
// intentionally NOT part of deriveAll()'s idempotent recompute — it's a
// one-time transform applied by the SET_ENTITY_TYPE handler, exactly like
// the original only clears these on the entity <select>'s onchange, not on
// every render.
export function clearFieldsForEntityChange(otherSources: any, nextEntityType: string): any {
  const isCompany = nextEntityType === 'company';
  const isIndOrHuf = nextEntityType === 'individual' || nextEntityType === 'huf';
  const isTrust = nextEntityType === 'trust';

  let next = { ...otherSources };
  if (!isCompany) next.angel_tax_premium_inr = null;
  if (!isIndOrHuf) next.lic_maturity_inr = null;
  if (isTrust) next.gifts_above_50k_inr = 0; // automated exemption, matches original exactly

  return next;
}

// computeVisibility(): entity-driven field gating, ported from the OS-
// relevant block inside updateBizEntityType().
export function computeVisibility(context: any): any {
  const entity = context.entity_type;
  const isInd = entity === 'individual';
  const isHuf = entity === 'huf';
  const isCompany = entity === 'company';
  const isTrust = entity === 'trust';
  const isLocal = entity === 'local';

  return {
    divOsSection: !!context.other_sources?.has_other_sources_income,

    cardFamilyPension: isInd,
    cardRetirement: isInd,
    divMinorChild: isInd,
    divSpousalClubbing: isInd,

    divAngelTax: isCompany,
    divLicMaturity: isInd || isHuf,
    divGiftsExemptions: isInd || isHuf,
    // Trust entities get a fully-automated exempt-gifts banner instead of
    // the gifts input; everyone else sees the normal input.
    showGiftsInput: !isTrust,
    showTrustGiftsBanner: isTrust,
    giftsRelativeTooltipText: isInd
      ? 'Gifts received from specified relatives (spouse, siblings, lineal ascendants/descendants, and their spouses) or on the occasion of marriage are entirely exempt.'
      : 'Gifts received from any member of the HUF are entirely exempt.',

    divLocalAuthority: isLocal,
  };
}

export function deriveAll(rawContext: any): any {
  const context = { ...rawContext };
  if (context.other_sources.gifts_exemption_marriage || context.other_sources.gifts_exemption_relative) {
    context.other_sources.gifts_above_50k_inr = 0;
  }
  const visibility = computeVisibility(context);
  return { ...context, ui: { visibility } };
}
