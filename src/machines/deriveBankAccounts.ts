// ────────────────────────────────────────────────────────────────────────
// deriveBankAccounts.ts
// Pure, DOM-free port of the "Screen 2D — Bank Accounts" step logic.
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

export function defaultBankRow(): any {
  return {
    bank_name: null,
    account_type: 'SAVINGS', 
    current_balance_raw: null,       
    current_balance_currency: 'INR', 
    interest_credited_this_fy_raw: null, 
    annual_interest_rate_raw: null,  
    us_person_certified_to_bank: null, 
    account_conversion_date: null, 
    fcnr_maturity_date: null,      
    nro_balance_raw: null,          
    _upload: 'idle', 
  };
}

export function computeRowVisibility(row: any): any {
  return {
    showNreConversion: row.account_type === 'NRE',
    showFcnrMaturity: row.account_type === 'FCNR',
    showNroBalance: row.account_type === 'NRO',
  };
}

export function computeAccount(row: any): any {
  const rateInt = parseINRCurrency(row.annual_interest_rate_raw);
  const annual_interest_rate = (rateInt !== null ? rateInt / 100 : NaN) || null;

  const acc: any = {
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

export function computeHasNro(rows: any[]): boolean {
  return rows.some((r) => r.account_type === 'NRO');
}

export function computeNroRepatriation(hasNro: boolean, rawNroRepatriation: any): any {
  if (!hasNro) return null;
  return {
    cumulative_repatriated_usd_this_fy: parseINRCurrency(rawNroRepatriation.cumulative_repatriated_usd_this_fy_raw),
    pending_repatriation_inr: parseINRCurrency(rawNroRepatriation.pending_repatriation_inr_raw),
    tds_deducted_on_nro_balance: !!rawNroRepatriation.tds_deducted_on_nro_balance,
  };
}

export function bankMockExtraction(): any {
  return {
    bank_name: 'HDFC Bank',
    account_type: 'NRO',
    current_balance_raw: '1500000',
    current_balance_currency: 'INR',
    interest_credited_this_fy_raw: '60000',
    annual_interest_rate_raw: '4.0',
    nro_balance_raw: '1500000', 
  };
}

export function resolveBackTarget(residencyLock: string): string {
  if (residencyLock === 'NR') return 'step-compliance';
  if (residencyLock === 'ROR') return 'step-fa';
  return 'step-profile';
}

export function resolveNextTarget(entityType: string): string {
  return entityType === 'individual' ? 'step-salary' : 'step-hp';
}

export function computeVisibility(context: any): any {
  const hasNro = computeHasNro(context.bank_accounts);
  return {
    showNroPanel: hasNro,
    rows: context.bank_accounts.map(computeRowVisibility),
  };
}

export function deriveAll(rawContext: any): any {
  const context = { ...rawContext };
  const visibility = computeVisibility(context);
  const computedAccounts = context.bank_accounts.map(computeAccount);
  const computedNroRepatriation = computeNroRepatriation(visibility.showNroPanel, context.nro_repatriation_inputs);
  const backTarget = resolveBackTarget(context.residency_lock);
  const nextTarget = resolveNextTarget(context.entity_type);
  return { ...context, ui: { visibility, computedAccounts, computedNroRepatriation, backTarget, nextTarget } };
}
