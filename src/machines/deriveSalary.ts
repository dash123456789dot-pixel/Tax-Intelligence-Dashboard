// ────────────────────────────────────────────────────────────────────────
// deriveSalary.ts
// Pure, DOM-free port of the salary-step logic in layer1_india.html
// ────────────────────────────────────────────────────────────────────────

export interface EsopPerquisiteEvent {
  employer_name: string | null;
  grant_date: string | null;
  vesting_or_exercise_date: string | null;
  shares: number | null;
  fmv_per_share_inr: number | null;
  exercise_price_per_share_inr: number | null;
  perquisite_value_inr: number | null;
}

export interface PwdTransportAllowance {
  is_eligible_pwd: boolean;
  allowance_received_inr: number | null;
}

export interface AllowanceDetails {
  allowance_received_inr: number | null;
  actual_expenditure_inr: number | null;
}

export interface SalaryDetails {
  has_salary_income: boolean;
  gross_salary_inr: number | null;
  basic_da_inr: number | null;
  perquisites_inr: number | null;
  esop_perquisite_inr: number | null;
  esop_perquisite_events: EsopPerquisiteEvent[];
  professional_tax_inr: number | null;
  employer_nps_contribution_inr: number | null;
  prior_employer_salary_inr: number | null;
  lta_claimed_inr: number | null;
  hra_received_inr: number | null;
  rent_paid_inr: number | null;
  is_metro_city: boolean;
  pwd_transport_allowance: PwdTransportAllowance;
  conveyance_allowance: AllowanceDetails;
  tour_travel_allowance: AllowanceDetails;
  daily_allowance: AllowanceDetails;
  taxable_salary_inr: number | null;
}

export interface SalaryUI {
  visibility: {
    divSalarySection: boolean;
    showOldRegimeFields: boolean;
    pwdReceivedEnabled: boolean;
  };
}

export interface SalaryContext {
  tax_regime: string;
  salary: SalaryDetails;
  ui: SalaryUI;
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

export const OLD_REGIME_ONLY_FIELDS = [
  'basic_da_inr',
  'hra_received_inr',
  'rent_paid_inr',
  'lta_claimed_inr'
] as const;

export function clearOldRegimeFields(salary: SalaryDetails): SalaryDetails {
  const next = { ...salary };
  OLD_REGIME_ONLY_FIELDS.forEach((f) => {
    (next as any)[f] = null;
  });
  next.is_metro_city = false;
  return next;
}

export function clearPwdReceivedIfIneligible(pwd: PwdTransportAllowance): PwdTransportAllowance {
  if (pwd.is_eligible_pwd) return pwd;
  return { ...pwd, allowance_received_inr: null };
}

export function computeVisibility(context: Omit<SalaryContext, 'ui'>) {
  const { salary, tax_regime } = context;
  return {
    divSalarySection: !!salary.has_salary_income,
    showOldRegimeFields: tax_regime !== 'NEW',
    pwdReceivedEnabled: !!salary.pwd_transport_allowance.is_eligible_pwd,
  };
}

export function deriveAll(rawContext: Omit<SalaryContext, 'ui'> & { ui?: any }): SalaryContext {
  const context = { ...rawContext };
  const visibility = computeVisibility(context);
  return { ...context, ui: { visibility } } as SalaryContext;
}
