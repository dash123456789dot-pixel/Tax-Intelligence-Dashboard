// ────────────────────────────────────────────────────────────────────────
// deriveForeignAssets.ts
// Pure, DOM-free port of the "Screen 2J — Foreign Assets (Schedule FA &
// FSI)" step logic in layer1_india.html.
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

const PURE_INCOME_CATEGORIES = ['salary', 'business', 'other_income'];

export function defaultFaRow(): any {
  return {
    country: null,
    institution_name: null,
    account_id: null,
    category: 'bank',
    ownership: 'legal',
    date_acquired: null,
    initial_value: null,
    peak_balance: null,
    closing_balance: null,
    status: 'holding',
    gross_proceeds: null,
    head_of_income: 'ifos',
    currency: 'USD',
    income_foreign: null,
    tax_foreign: null,
    conversion_rate: null,
    income_inr: null,
    tax_inr: null,
    claim_dtaa_relief: false,
    tin: null,
    dtaa_article: null,
  };
}

export function applyCategoryChange(row: any, category: string): any {
  let head_of_income = row.head_of_income;
  if (category === 'salary') head_of_income = 'salary';
  else if (category === 'business') head_of_income = 'business';
  else if (category === 'other_income') head_of_income = 'ifos';
  return { ...row, category, head_of_income };
}

export function applyStatusChange(row: any, status: string): any {
  return { ...row, status, gross_proceeds: status === 'sold' ? row.gross_proceeds : null };
}

export function applyDtaaToggle(row: any, checked: boolean): any {
  return { ...row, claim_dtaa_relief: checked, tin: checked ? row.tin : null, dtaa_article: checked ? row.dtaa_article : null };
}

export function computeFtc(row: any): any {
  const incFor = row.income_foreign || 0;
  const taxFor = row.tax_foreign || 0;
  const rate = row.conversion_rate || 0;
  return {
    income_inr: incFor && rate ? Math.round(incFor * rate) : null,
    tax_inr: taxFor && rate ? Math.round(taxFor * rate) : null,
  };
}

export function computeLrsTcs(lrsOutbound: any): any {
  const total = lrsOutbound.total_lrs_remitted_this_fy_inr || 0;
  const purpose = lrsOutbound.lrs_purpose || '';

  if (!(total > 0 && purpose)) return { show: false, tcs: 0, rateStr: 'NIL', desc: '' };

  if (purpose === 'travel') {
    return { show: true, tcs: Math.round(total * 0.02), rateStr: '2% Flat', desc: '2% flat TCS on overseas tour packages from the first rupee.' };
  }

  const threshold = 1000000;
  if (total <= threshold) {
    return { show: true, tcs: 0, rateStr: 'NIL', desc: 'Remittance is below the ₹10 Lakhs base threshold.' };
  }

  const excess = total - threshold;
  if (purpose === 'investment' || purpose === 'gift_donation') {
    return { show: true, tcs: Math.round(excess * 0.2), rateStr: '20% on excess', desc: '20% TCS on General/Investment LRS exceeding ₹10 Lakhs.' };
  }
  if (purpose === 'education_own_funds' || purpose === 'medical') {
    return { show: true, tcs: Math.round(excess * 0.02), rateStr: '2% on excess', desc: '2% TCS on self-funded education/medical exceeding ₹10 Lakhs.' };
  }
  if (purpose === 'education_loan') {
    return { show: true, tcs: 0, rateStr: '0%', desc: '0% (NIL) TCS on education remittance funded via loan.' };
  }
  return { show: false, tcs: 0, rateStr: 'NIL', desc: '' };
}

export function computeStepEligibility(context: any): any {
  const isRorOrRnor = context.final_india_residency_status === 'ROR' || context.final_india_residency_status === 'RNOR';
  const isIntlChecked = !!context.setup_international;
  return { isRorOrRnor, isIntlChecked, eligible: isRorOrRnor && isIntlChecked };
}

export function computeFaGateVisibility(hasAssets: boolean | null): any {
  if (hasAssets === true) {
    return { showContainer: true, showIncomeGate: true, showBmaWarning: false };
  }
  if (hasAssets === false) {
    return { showContainer: false, showIncomeGate: false, showBmaWarning: true };
  }
  return { showContainer: false, showIncomeGate: false, showBmaWarning: false };
}

export function computeIncomeGateVisibility(hasIncome: boolean | null): any {
  if (hasIncome === true) return { showFsiWarning: true, showFsiSections: true };
  if (hasIncome === false) return { showFsiWarning: false, showFsiSections: false };
  return { showFsiWarning: false, showFsiSections: true };
}

export function computeRowVisibility(row: any, hasReceivedForeignIncome: boolean | null): any {
  const isPureIncome = PURE_INCOME_CATEGORIES.includes(row.category);
  return {
    showAssetDetails: !isPureIncome,
    showProceeds: !isPureIncome && row.status === 'sold',
    showFsiSection: computeIncomeGateVisibility(hasReceivedForeignIncome).showFsiSections,
    showDtaaFields: row.claim_dtaa_relief,
  };
}

export function computeVisibility(context: any): any {
  const eligibility = computeStepEligibility(context);
  const gate = computeFaGateVisibility(context.foreign_assets.has_foreign_assets);
  const incomeGate = computeIncomeGateVisibility(context.lrs_outbound.has_received_foreign_income);
  return {
    stepEligible: eligibility.eligible,
    eligibility,
    ...gate,
    ...incomeGate,
    rows: context.foreign_assets.assets.map((row: any) => computeRowVisibility(row, context.lrs_outbound.has_received_foreign_income)),
  };
}

export function deriveAll(rawContext: any): any {
  const context = { ...rawContext };
  const assets = context.foreign_assets.assets.map((row: any) => ({ ...row, ...computeFtc(row) }));
  const nextContext = { ...context, foreign_assets: { ...context.foreign_assets, assets } };
  const visibility = computeVisibility(nextContext);
  const lrsTcs = computeLrsTcs(nextContext.lrs_outbound);
  return { ...nextContext, ui: { visibility, lrsTcs } };
}
