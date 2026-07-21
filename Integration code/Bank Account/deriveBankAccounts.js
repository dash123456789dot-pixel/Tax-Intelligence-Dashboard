// ────────────────────────────────────────────────────────────────────────
// deriveBankAccounts.js
// Pure, DOM-free port of the "Screen 2D — Bank Accounts" step logic in
// layer1_india.html: addBankAccountRow()'s per-row defaults,
// toggleBankTypeDependencies(), checkNROAccounts(), handleBankUpload()
// (mock OCR-extraction animation), and syncBankAccountsState() (incl. its
// NRO-repatriation aggregation). No DOM reads/writes anywhere in this file.
//
// ── CROSS-STEP CHECK (this step has NO eligibility gate) ────────────────
// Unlike the DTAA / Compliance Documents steps (NR-only) or the Foreign
// Assets step (ROR/RNOR + setup_international), `syncUnlockStatus()` in
// the original has NO special-case branch for `step-bank` at all — it
// falls through to the function's default `let isAllowed = true;` and is
// therefore unconditionally reachable regardless of residency status,
// entity type, or any dashboard checkbox. This was confirmed by grepping
// every reference to `step-bank` in the source; there is no hidden
// dependency to reproduce here, matching the "always visible" premise of
// this extraction exactly.
//
// The step's Back/Next button *targets* (not its own visibility) DO
// depend on other steps' state — `state.profile.residency_lock` and
// `state.profile.entity_type` — see resolveBackTarget() /
// resolveNextTarget() below, which are navigation-routing helpers, not
// visibility gates.
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

// addBankAccountRow()'s per-row defaults. Raw string fields are kept
// exactly as typed (bank_name, annual_interest_rate_raw, etc.) — the
// syncBankAccountsState()-equivalent computation (computeAccount below)
// applies the original's exact (and, for the rate field, buggy) coercion
// only at derive-time, matching how the original recomputes
// state.bank_accounts from the live DOM on every keystroke.
function defaultBankRow() {
  return {
    bank_name: null,
    account_type: 'SAVINGS', // 'SAVINGS' | 'CURRENT' | 'NRE' | 'NRO' | 'FCNR' | 'RFC' | 'GIFT_IFSC'
    current_balance_raw: null,       // visible: .bank-bal
    current_balance_currency: 'INR', // visible: .bank-bal-curr
    interest_credited_this_fy_raw: null, // visible: .bank-int
    annual_interest_rate_raw: null,  // visible: .bank-rate (Optional) — see the /100-truncation bug below
    us_person_certified_to_bank: null, // visible: .bank-us-person-cert (tri-state: true | false | null)
    account_conversion_date: null, // visible (conditional: account_type === 'NRE'): .bank-nre-date
    fcnr_maturity_date: null,      // visible (conditional: account_type === 'FCNR'): .bank-fcnr-date
    nro_balance_raw: null,          // visible (conditional: account_type === 'NRO'): .bank-nro-bal-input
    _upload: 'idle', // hidden: UI-only mock upload status ('idle' | 'scanning' | 'success'), not part of the real domain schema — mirrors handleBankUpload()'s fake "Scanning Document..." animation
  };
}

function computeRowVisibility(row) {
  return {
    showNreConversion: row.account_type === 'NRE',
    showFcnrMaturity: row.account_type === 'FCNR',
    showNroBalance: row.account_type === 'NRO',
  };
}

// syncBankAccountsState()'s per-account computation, including its two
// faithfully-preserved quirks:
//   1. `annual_interest_rate` is computed as
//      `parseINRCurrency(rateRaw) / 100 || null` — and parseINRCurrency()
//      does `parseInt(stripped, 10)`, which truncates decimals. So typing
//      "3.5" (meaning 3.5%) is parsed as the integer 3 first, THEN
//      divided by 100 — yielding 0.03 (i.e. 3%), silently dropping the
//      ".5". This is reproduced exactly, not fixed.
//   2. Type-specific fields (`account_conversion_date` / `fcnr_maturity_date`
//      / `nro_balance` + `nro_balance_currency`) are only present on the
//      computed object AT ALL when account_type matches — switching away
//      from NRO, for example, means the computed row simply won't have an
//      `nro_balance` key that FY, exactly like the original's
//      conditional `if/else if` block.
function computeAccount(row) {
  const rateInt = parseINRCurrency(row.annual_interest_rate_raw);
  const annual_interest_rate = (rateInt !== null ? rateInt / 100 : NaN) || null;

  const acc = {
    bank_name: row.bank_name || null,
    account_type: row.account_type,
    current_balance: parseINRCurrency(row.current_balance_raw),
    current_balance_currency: row.current_balance_currency,
    annual_interest_rate,
    interest_credited_this_fy_inr: parseINRCurrency(row.interest_credited_this_fy_raw) || null,
    us_person_certified_to_bank: row.us_person_certified_to_bank,
  };

  if (row.account_type === 'NRE') {
    acc.account_conversion_date = row.account_conversion_date || null;
  } else if (row.account_type === 'FCNR') {
    acc.fcnr_maturity_date = row.fcnr_maturity_date || null;
  } else if (row.account_type === 'NRO') {
    acc.nro_balance = parseINRCurrency(row.nro_balance_raw);
    acc.nro_balance_currency = 'INR';
  }

  return acc;
}

// checkNROAccounts()
function computeHasNro(rows) {
  return rows.some((r) => r.account_type === 'NRO');
}

// syncBankAccountsState()'s NRO-repatriation aggregation: the computed
// nro_repatriation object is `null` whenever no row is currently NRO —
// even if the person had already typed values into the panel — exactly
// like the original (`state.nro_repatriation = hasNRO ? {...} : null;`).
function computeNroRepatriation(hasNro, rawNroRepatriation) {
  if (!hasNro) return null;
  return {
    cumulative_repatriated_usd_this_fy: parseINRCurrency(rawNroRepatriation.cumulative_repatriated_usd_this_fy_raw),
    pending_repatriation_inr: parseINRCurrency(rawNroRepatriation.pending_repatriation_inr_raw),
    tds_deducted_on_nro_balance: !!rawNroRepatriation.tds_deducted_on_nro_balance,
  };
}

// handleBankUpload()'s mock OCR extraction — fixed values, exactly as
// hardcoded in the original.
function bankMockExtraction() {
  return {
    bank_name: 'HDFC Bank',
    account_type: 'NRO',
    current_balance_raw: '1500000',
    current_balance_currency: 'INR',
    interest_credited_this_fy_raw: '60000',
    annual_interest_rate_raw: '4.0',
    nro_balance_raw: '1500000', // only applied because the mocked account_type is 'NRO'
  };
}

// Back/Next navigation-target resolution (not visibility — see module
// header comment). Ported from the inline onclick ternaries:
//   Back:  residency_lock === 'NR' ? 'step-compliance' : (residency_lock === 'ROR' ? 'step-fa' : 'step-profile')
//   Next:  entity_type === 'individual' ? 'step-salary' : 'step-hp'
function resolveBackTarget(residencyLock) {
  if (residencyLock === 'NR') return 'step-compliance';
  if (residencyLock === 'ROR') return 'step-fa';
  return 'step-profile';
}
function resolveNextTarget(entityType) {
  return entityType === 'individual' ? 'step-salary' : 'step-hp';
}

function computeVisibility(context) {
  const hasNro = computeHasNro(context.bank_accounts);
  return {
    showNroPanel: hasNro,
    rows: context.bank_accounts.map(computeRowVisibility),
  };
}

function deriveAll(rawContext) {
  const context = { ...rawContext };
  const visibility = computeVisibility(context);
  const computedAccounts = context.bank_accounts.map(computeAccount);
  const computedNroRepatriation = computeNroRepatriation(visibility.showNroPanel, context.nro_repatriation_inputs);
  const backTarget = resolveBackTarget(context.residency_lock);
  const nextTarget = resolveNextTarget(context.entity_type);
  return { ...context, ui: { visibility, computedAccounts, computedNroRepatriation, backTarget, nextTarget } };
}

export {
  parseINRCurrency,
  formatINRDisplay,
  defaultBankRow,
  computeRowVisibility,
  computeAccount,
  computeHasNro,
  computeNroRepatriation,
  bankMockExtraction,
  resolveBackTarget,
  resolveNextTarget,
  computeVisibility,
  deriveAll,
};
