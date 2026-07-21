export interface FinalTaxContext {
  residency_status: string; // 'ROR', 'RNOR', 'NR'
  residency_path: string; // e.g. 'ROR-1 Standard'
  tax_regime: string; // 'NEW', 'OLD'
  pan: string | null;
  gross_salary_inr: number;
  business_income_inr: number;
  other_income_inr: number;
  taxes_paid_inr: number; // TDS + TCS + Advance Tax paid
  raw_json_payload?: any;
}

/**
 * Format currency to Indian Rupees.
 */
export function formatInr(val: number): string {
  if (isNaN(val)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}

/**
 * Generates the validation message depending on the context state.
 */
export function getValidationStatus(ctx: FinalTaxContext) {
  if (!ctx.residency_status) {
    return { valid: false, message: 'Residency Status is missing' };
  }
  return { valid: true, message: 'Information validated successfully' };
}
