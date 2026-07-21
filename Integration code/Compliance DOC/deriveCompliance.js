// ────────────────────────────────────────────────────────────────────────
// deriveCompliance.js
// Pure, DOM-free port of the "Screen 2C — Additional Documents & Special
// Rates" step logic in layer1_india.html: updateComp10F(),
// handleForm10fUpload() (mock OCR-extraction animation),
// updateCompS197Bool(), updateS197IncomeTypes(), handleS197Upload() (mock
// OCR-extraction, including its auto-checked income types),
// updateCompS197Field(), and updateCompField(). No DOM reads/writes
// anywhere in this file.
//
// ── CROSS-STEP DEPENDENCY ─────────────────────────────────────────────
//   context.final_india_residency_status <- Step 2 (Residency Solver)
// Confirmed directly in the source's `syncUnlockStatus()`:
//   if (step === 'step-dtaa' || step === 'step-compliance') {
//       isAllowed = (lock === 'NR');
//   }
// i.e. this step shares the EXACT SAME single-condition gate as the DTAA
// step in the original (NR only — no second checkbox, unlike the Foreign
// Assets step's ROR/RNOR+setup_international gate, or the enhanced
// NR+days<180 gate added to the DTAA step extraction). This port enforces
// that one condition faithfully, without inventing an additional one. See
// computeStepEligibility() below.
//
// ── A GENUINE BUG, FAITHFULLY PRESERVED, NOT SILENTLY FIXED ─────────────
// `updateCompS197Field('rate', val)` runs the Lower TDS Certificate's
// approved rate (a fraction like 0.05 for 5%) through `parseINRCurrency()`,
// which does `parseInt(stripped, 10)` — and `parseInt` stops at the first
// non-digit character, so parseInt("0.05", 10) === 0. On top of that, the
// original's global `.inr-input` live-formatter (a `document`-level
// `input` listener that strips everything but digits as you type) is also
// attached to `#comp-s197-rate` because it carries the `inr-input` class —
// so a person literally cannot type a decimal point into that field in
// the browser at all; it gets stripped keystroke-by-keystroke. Even the
// mock OCR auto-fill (`handleS197Upload()`, which writes the string
// `'0.03'`) goes through the exact same broken coercion. The net effect:
// the Approved Lower Rate field can never actually store a fractional
// value through the UI, despite its own placeholder ("e.g. 0.05")
// suggesting it should. This is reproduced exactly here — see
// `parseS197Rate()` — rather than quietly fixed, since silently changing
// numeric behavior would misrepresent what the source actually does.
// ────────────────────────────────────────────────────────────────────────

function parseINRCurrency(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const stripped = val.toString().replace(/[^0-9.-]/g, '');
  if (stripped === '' || stripped === '-' || stripped === '.') return null;
  return parseInt(stripped, 10);
}

// Faithful reproduction of the rate-field bug described above.
function parseS197Rate(val) {
  return parseINRCurrency(val);
}

function formatINRDisplay(numericValue) {
  if (numericValue === null || numericValue === undefined || numericValue === '') return '';
  const isNegative = numericValue < 0;
  const digits = Math.abs(numericValue);
  const formatted = Number(digits).toLocaleString('en-IN');
  return isNegative ? '-' + formatted : formatted;
}

// updateS197IncomeTypes(): toggles one value in/out of the array.
function toggleIncomeType(currentTypes, value, checked) {
  const arr = currentTypes || [];
  if (checked) {
    return arr.includes(value) ? arr : [...arr, value];
  }
  return arr.filter((v) => v !== value);
}

// handleS197Upload()'s mock OCR extraction result — fixed values, exactly
// as hardcoded in the original (including the rate string that then goes
// through the same broken parseS197Rate() coercion above).
function s197MockExtraction() {
  return {
    rate: parseS197Rate('0.03'), // faithfully becomes 0 due to the bug described above
    validity_start_date: '2025-04-01',
    validity_end_date: '2026-03-31',
    autoCheckedTypes: ['PROPERTY_CG', 'NRO_INTEREST'],
  };
}

// handleForm10fUpload()'s mock OCR extraction — a random 15-digit number,
// exactly as the original's Math.floor(100000000000000 + Math.random() * 900000000000000).
function form10fMockExtraction(randomFn = Math.random) {
  return Math.floor(100000000000000 + randomFn() * 900000000000000).toString();
}

function computeStepEligibility(context) {
  const eligible = context.final_india_residency_status === 'NR';
  return { eligible };
}

function computeVisibility(context) {
  const eligibility = computeStepEligibility(context);
  const cd = context.compliance_docs;
  return {
    stepEligible: eligibility.eligible,
    eligibility,
    div10fAck: !!cd.form_10f.is_filed,
    divS197Detail: !!cd.section_197_cert.is_available,
  };
}

function deriveAll(rawContext) {
  const context = { ...rawContext };
  const visibility = computeVisibility(context);
  return { ...context, ui: { visibility } };
}

export {
  parseINRCurrency,
  parseS197Rate,
  formatINRDisplay,
  toggleIncomeType,
  s197MockExtraction,
  form10fMockExtraction,
  computeStepEligibility,
  computeVisibility,
  deriveAll,
};
