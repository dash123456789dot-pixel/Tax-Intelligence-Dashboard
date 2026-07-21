// ────────────────────────────────────────────────────────────────────────
// deriveCompliance.ts
// Pure, DOM-free port of the "Screen 2C — Additional Documents & Special
// Rates" step logic in layer1_india.html.
// ────────────────────────────────────────────────────────────────────────

export function parseINRCurrency(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const stripped = val.toString().replace(/[^0-9.-]/g, '');
  if (stripped === '' || stripped === '-' || stripped === '.') return null;
  return parseInt(stripped, 10);
}

// Faithful reproduction of the rate-field bug described in the original README.
export function parseS197Rate(val: any): number | null {
  return parseINRCurrency(val);
}

export function formatINRDisplay(numericValue: any): string {
  if (numericValue === null || numericValue === undefined || numericValue === '') return '';
  const isNegative = numericValue < 0;
  const digits = Math.abs(numericValue);
  const formatted = Number(digits).toLocaleString('en-IN');
  return isNegative ? '-' + formatted : formatted;
}

export function toggleIncomeType(currentTypes: string[], value: string, checked: boolean): string[] {
  const arr = currentTypes || [];
  if (checked) {
    return arr.includes(value) ? arr : [...arr, value];
  }
  return arr.filter((v) => v !== value);
}

export function s197MockExtraction(): any {
  return {
    rate: parseS197Rate('0.03'), // faithfully becomes 0 due to the bug
    validity_start_date: '2025-04-01',
    validity_end_date: '2026-03-31',
    autoCheckedTypes: ['PROPERTY_CG', 'NRO_INTEREST'],
  };
}

export function form10fMockExtraction(randomFn = Math.random): string {
  return Math.floor(100000000000000 + randomFn() * 900000000000000).toString();
}

export function computeStepEligibility(context: any): any {
  const eligible = context.final_india_residency_status === 'NR';
  return { eligible };
}

export function computeVisibility(context: any): any {
  const eligibility = computeStepEligibility(context);
  const cd = context.compliance_docs;
  return {
    stepEligible: eligibility.eligible,
    eligibility,
    div10fAck: !!cd.form_10f.is_filed,
    divS197Detail: !!cd.section_197_cert.is_available,
  };
}

export function deriveAll(rawContext: any): any {
  const context = { ...rawContext };
  const visibility = computeVisibility(context);
  return { ...context, ui: { visibility } };
}
