// ────────────────────────────────────────────────────────────────────────
// deriveSalary.js
// Pure, DOM-free port of the salary-step logic in layer1_india.html:
// toggleSalarySection(), updateSalaryNum()/updateSalaryBool()/
// updateSalaryNested()/updateSalaryNestedNum(), togglePwdAllowance(),
// evaluateSalaryRegimeLock(), addEsopRow()/removeEsopRow(), and
// parseINRCurrency(). No DOM reads/writes anywhere in this file.
// ────────────────────────────────────────────────────────────────────────

// parseINRCurrency(val): strips everything except digits/dot/minus, returns
// an integer or null. Ported verbatim.
function parseINRCurrency(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const stripped = val.toString().replace(/[^0-9.-]/g, '');
  if (stripped === '' || stripped === '-' || stripped === '.') return null;
  return parseInt(stripped, 10);
}

// Live-formatting helper for the `.inr-input` behavior (the global
// `document.addEventListener('input', ...)` block that reformats every
// `.inr-input` as it's typed using en-IN grouping). Pure version: given a
// raw numeric value, returns the formatted display string.
function formatINRDisplay(numericValue) {
  if (numericValue === null || numericValue === undefined || numericValue === '') return '';
  const isNegative = numericValue < 0;
  const digits = Math.abs(numericValue);
  const formatted = Number(digits).toLocaleString('en-IN');
  return isNegative ? '-' + formatted : formatted;
}

// evaluateSalaryRegimeLock(): fields under `.sal-old-regime-field` (basic_da,
// hra_received, rent_paid, lta_claimed, is_metro_city) are only meaningful
// under the OLD regime. Switching to NEW hides *and clears* them.
const OLD_REGIME_ONLY_FIELDS = ['basic_da_inr', 'hra_received_inr', 'rent_paid_inr', 'lta_claimed_inr'];

function clearOldRegimeFields(salary) {
  const next = { ...salary };
  OLD_REGIME_ONLY_FIELDS.forEach((f) => { next[f] = null; });
  next.is_metro_city = false;
  return next;
}

// togglePwdAllowance(false): also clears the received amount and disables
// the input (ported as visibility/enabled flags, not real DOM `disabled`).
function clearPwdReceivedIfIneligible(pwd) {
  if (pwd.is_eligible_pwd) return pwd;
  return { ...pwd, allowance_received_inr: null };
}

// ---- visibility (toggleSalarySection + evaluateSalaryRegimeLock + togglePwdAllowance) ----
function computeVisibility(context) {
  const { salary, tax_regime } = context;
  return {
    divSalarySection: !!salary.has_salary_income,
    // .sal-old-regime-field group: Basic+DA, LTA Claimed, and the whole HRA card
    showOldRegimeFields: tax_regime !== 'NEW',
    // div-pwd-recv: always rendered, but original toggles opacity-30 + disabled
    pwdReceivedEnabled: !!salary.pwd_transport_allowance.is_eligible_pwd,
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
  clearOldRegimeFields,
  clearPwdReceivedIfIneligible,
  computeVisibility,
  deriveAll,
  OLD_REGIME_ONLY_FIELDS,
};
