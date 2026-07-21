// ────────────────────────────────────────────────────────────────────────
// deriveForeignAssets.js
// Pure, DOM-free port of the "Screen 2J — Foreign Assets (Schedule FA &
// FSI)" step logic in layer1_india.html: toggleForeignAssets(),
// toggleReceivedForeignIncome(), addFaRow()'s per-row defaults,
// toggleFaCardType(), toggleFaStatus(), toggleFaDtaa(), calculateFaFtc()
// + syncFaState() (merged into one row-level FTC computation here), and
// updateLrsTcs()'s TCS-rate table. No DOM reads/writes anywhere in this
// file.
//
// ── CROSS-STEP DEPENDENCIES ─────────────────────────────────────────────
//   context.final_india_residency_status <- Step 2 (Residency Solver)
//   context.setup_international          <- Step 1 (Financial Life
//        Snapshot's `#setup-international` dashboard checkbox)
// Per explicit instruction (and confirmed in the source's own
// `syncUnlockStatus()`: `isAllowed = (lock === 'ROR' || lock === 'RNOR')
// && isIntlChecked`), this step is only reachable when the derived
// residency status is ROR or RNOR AND that dashboard checkbox is on. See
// computeStepEligibility() below.
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

const PURE_INCOME_CATEGORIES = ['salary', 'business', 'other_income'];

// addFaRow()'s per-row defaults.
function defaultFaRow() {
  return {
    country: null,
    institution_name: null,
    account_id: null,
    category: 'bank', // 'bank' | 'equity' | 'property' | 'other_asset' | 'salary' | 'business' | 'other_income'
    ownership: 'legal', // 'legal' | 'beneficial' | 'beneficiary' — null when category is a pure-income type
    date_acquired: null,
    initial_value: null,
    peak_balance: null,
    closing_balance: null,
    status: 'holding', // 'holding' | 'sold' — null when category is a pure-income type
    gross_proceeds: null,
    head_of_income: 'ifos', // 'ifos' | 'salary' | 'cg' | 'business' | 'house'
    currency: 'USD',
    income_foreign: null,
    tax_foreign: null,
    conversion_rate: null,
    income_inr: null, // hidden (readonly, derived): round(income_foreign * conversion_rate)
    tax_inr: null,     // hidden (readonly, derived): round(tax_foreign * conversion_rate)
    claim_dtaa_relief: false, // visible: fa-dtaa-check
    tin: null,          // visible (conditional: claim_dtaa_relief): fa-tin
    dtaa_article: null, // visible (conditional: claim_dtaa_relief): fa-article
  };
}

// toggleFaCardType(): switching to a pure-income category forces a
// specific head_of_income; switching to an asset category leaves it
// untouched (matches the original exactly — no reset back to 'ifos').
function applyCategoryChange(row, category) {
  let head_of_income = row.head_of_income;
  if (category === 'salary') head_of_income = 'salary';
  else if (category === 'business') head_of_income = 'business';
  else if (category === 'other_income') head_of_income = 'ifos';
  return { ...row, category, head_of_income };
}

// toggleFaStatus(): switching away from 'sold' clears gross_proceeds.
function applyStatusChange(row, status) {
  return { ...row, status, gross_proceeds: status === 'sold' ? row.gross_proceeds : null };
}

// toggleFaDtaa(): unchecking clears tin + dtaa_article.
function applyDtaaToggle(row, checked) {
  return { ...row, claim_dtaa_relief: checked, tin: checked ? row.tin : null, dtaa_article: checked ? row.dtaa_article : null };
}

// calculateFaFtc(): income/tax converted to INR via the entered TTBR rate.
function computeFtc(row) {
  const incFor = row.income_foreign || 0;
  const taxFor = row.tax_foreign || 0;
  const rate = row.conversion_rate || 0;
  return {
    income_inr: incFor && rate ? Math.round(incFor * rate) : null,
    tax_inr: taxFor && rate ? Math.round(taxFor * rate) : null,
  };
}

// updateLrsTcs(): TCS rate table on outbound LRS remittances.
function computeLrsTcs(lrsOutbound) {
  const total = lrsOutbound.total_lrs_remitted_this_fy_inr || 0;
  const purpose = lrsOutbound.lrs_purpose || '';

  if (!(total > 0 && purpose)) return { show: false, tcs: 0, rateStr: 'NIL', desc: '' };

  if (purpose === 'travel') {
    return { show: true, tcs: Math.round(total * 0.02), rateStr: '2% Flat', desc: '2% flat TCS on overseas tour packages from the first rupee.' };
  }

  const threshold = 1000000; // ₹10 Lakhs
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

// The step-level eligibility gate (see module header comment).
function computeStepEligibility(context) {
  const isRorOrRnor = context.final_india_residency_status === 'ROR' || context.final_india_residency_status === 'RNOR';
  const isIntlChecked = !!context.setup_international;
  return { isRorOrRnor, isIntlChecked, eligible: isRorOrRnor && isIntlChecked };
}

// toggleForeignAssets(hasAssets) — tri-state (true/false/null) visibility.
function computeFaGateVisibility(hasAssets) {
  if (hasAssets === true) {
    return { showContainer: true, showIncomeGate: true, showBmaWarning: false };
  }
  if (hasAssets === false) {
    return { showContainer: false, showIncomeGate: false, showBmaWarning: true };
  }
  return { showContainer: false, showIncomeGate: false, showBmaWarning: false };
}

// toggleReceivedForeignIncome(hasIncome) — tri-state. Note null defaults
// to SHOWING the FSI sections (matches the original's per-row template
// condition `has_received_foreign_income === false ? 'hidden' : ''`).
function computeIncomeGateVisibility(hasIncome) {
  if (hasIncome === true) return { showFsiWarning: true, showFsiSections: true };
  if (hasIncome === false) return { showFsiWarning: false, showFsiSections: false };
  return { showFsiWarning: false, showFsiSections: true };
}

function computeRowVisibility(row, hasReceivedForeignIncome) {
  const isPureIncome = PURE_INCOME_CATEGORIES.includes(row.category);
  return {
    showAssetDetails: !isPureIncome,
    showProceeds: !isPureIncome && row.status === 'sold',
    showFsiSection: computeIncomeGateVisibility(hasReceivedForeignIncome).showFsiSections,
    showDtaaFields: row.claim_dtaa_relief,
  };
}

function computeVisibility(context) {
  const eligibility = computeStepEligibility(context);
  const gate = computeFaGateVisibility(context.foreign_assets.has_foreign_assets);
  const incomeGate = computeIncomeGateVisibility(context.lrs_outbound.has_received_foreign_income);
  return {
    stepEligible: eligibility.eligible,
    eligibility,
    ...gate,
    ...incomeGate,
    rows: context.foreign_assets.assets.map((row) => computeRowVisibility(row, context.lrs_outbound.has_received_foreign_income)),
  };
}

function deriveAll(rawContext) {
  const context = { ...rawContext };
  // Recompute FTC for every row (calculateFaFtc / syncFaState merged)
  const assets = context.foreign_assets.assets.map((row) => ({ ...row, ...computeFtc(row) }));
  const nextContext = { ...context, foreign_assets: { ...context.foreign_assets, assets } };
  const visibility = computeVisibility(nextContext);
  const lrsTcs = computeLrsTcs(nextContext.lrs_outbound);
  return { ...nextContext, ui: { visibility, lrsTcs } };
}

export {
  parseINRCurrency,
  formatINRDisplay,
  defaultFaRow,
  applyCategoryChange,
  applyStatusChange,
  applyDtaaToggle,
  computeFtc,
  computeLrsTcs,
  computeStepEligibility,
  computeFaGateVisibility,
  computeIncomeGateVisibility,
  computeRowVisibility,
  computeVisibility,
  deriveAll,
};
