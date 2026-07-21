// ────────────────────────────────────────────────────────────────────────
// deriveDeductions.ts
// Pure, DOM-free port of the "Screen 2J — Tax Deductions (Chapter VI-A)"
// step logic.
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

export function isSeniorCitizen(dateOfBirth: string | null): boolean {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  const endOfFY = new Date('2026-03-31');
  let age = endOfFY.getFullYear() - dob.getFullYear();
  const m = endOfFY.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && endOfFY.getDate() < dob.getDate())) age--;
  return age >= 60;
}

export function compute80DMedicalVisibility(s80D: any): boolean {
  const hasIns = s80D.parents_has_health_insurance !== false;
  const isSenior = s80D.parents_are_senior === true;
  return !hasIns && isSenior;
}

export function clear80DMedicalIfHidden(s80D: any): any {
  return compute80DMedicalVisibility(s80D) ? s80D : { ...s80D, parents_medical_expenditure_inr: null };
}

export function clearDDDetailsIfHidden(section: any, key: string): any {
  if (section[key]) return section;
  if (key === 'has_disabled_dependents' || key === 'has_self_disability') {
    return { ...section, disability_percentage: null };
  }
  if (key === 'has_specified_diseases_treatment') {
    return { ...section, patient_category: null, medical_expenses_inr: null };
  }
  return section;
}

export function clear80GGIfHidden(s80GG: any): any {
  return s80GG.has_rent_paid_no_hra ? s80GG : { ...s80GG, rent_paid_inr: null };
}

export function derive80TTA(context: any): any {
  const isNR = context.final_india_residency_status === 'NR';
  const isSenior = isSeniorCitizen(context.date_of_birth);
  const isIndividual = context.entity_type === 'individual';

  let section, displayText, showFdField, showNrWarning;

  if (isNR) {
    section = '80TTA';
    displayText = 'Interest Income Deduction (Savings Accounts) (NRI — NRO Savings Interest only, cap ₹10,000)';
    showNrWarning = true;
    showFdField = false;
  } else if (isSenior && isIndividual) {
    section = '80TTB';
    displayText = 'Interest Income Deduction (Senior Citizen Deposits) (Senior Citizen — Savings & FD/RD Interest, cap ₹50,000)';
    showNrWarning = false;
    showFdField = true;
  } else {
    section = '80TTA';
    displayText = 'Interest Income Deduction (Savings Accounts) (Non-Senior — Savings Interest only, cap ₹10,000)';
    showNrWarning = false;
    showFdField = false;
  }

  return { section, displayText, showFdField, showNrWarning };
}

export function applyTTADerivedClear(s80TTA_TTB: any, derived: any): any {
  const next = { ...s80TTA_TTB, applicable_section: derived.section };
  if (!derived.showFdField) next.fd_rd_interest_inr = null;
  return next;
}

export function applyNriBlocks(deductions: any, isNR: boolean): any {
  if (!isNR) {
    return {
      ...deductions,
      s80DD: { ...deductions.s80DD, is_nri_blocked: false },
      s80DDB: { ...deductions.s80DDB, is_nri_blocked: false },
      s80U: { ...deductions.s80U, is_nri_blocked: false },
    };
  }
  return {
    ...deductions,
    s80DD: { has_disabled_dependents: false, disability_percentage: null, is_nri_blocked: true },
    s80DDB: { has_specified_diseases_treatment: false, patient_category: null, medical_expenses_inr: null, is_nri_blocked: true },
    s80U: { has_self_disability: false, disability_percentage: null, is_nri_blocked: true },
  };
}

export function compute80GGBlocked(hasSalaryIncome: boolean, hraReceivedInr: number | null): any {
  const hasSalary = hasSalaryIncome === true;
  const hraReceived = (hraReceivedInr || 0) > 0;
  const blocked = !hasSalary || hraReceived;
  const reason = !hasSalary ? 'Blocked: Requires active Salary income.' : hraReceived ? 'Blocked: Cannot claim 80GG when receiving HRA.' : null;
  return { blocked, reason };
}

export function applyGGBlockIfNeeded(s80GG: any, isBlocked: boolean): any {
  if (!isBlocked) return s80GG;
  return { has_rent_paid_no_hra: false, rent_paid_inr: null };
}

export function defaultDonationRow(): any {
  return {
    donee_name: null,
    donee_pan: null,
    donation_amount_raw: null,
    deduction_rate: '100',
    donation_mode: 'cheque', 
    category: '100_percent_no_limit',
    subject_to_qualifying_limit: true,
  };
}

export function computeDonationEligibility(row: any): any {
  const amt = parseINRCurrency(row.donation_amount_raw) || 0;
  let isEligible = true;
  if (row.donation_mode === 'kind' || row.donation_mode === 'other') isEligible = false;
  if (row.donation_mode === 'cash' && amt > 2000) isEligible = false;
  return { isEligible, showWarning: !isEligible && amt > 0, amt };
}

export function computeS80G(rows: any[]): any[] {
  return rows
    .map((row) => ({ row, ...computeDonationEligibility(row) }))
    .filter((r) => r.isEligible)
    .map(({ row, amt }) => ({
      donee_name: row.donee_name || null,
      donee_pan: row.donee_pan || null,
      donation_amount_inr: amt || null,
      donation_mode: row.donation_mode,
      category: row.category,
    }));
}

export function computeVisibility(context: any): any {
  const entity = context.entity_type;
  const isInd = entity === 'individual';
  const isHuf = entity === 'huf';
  const isCompany = entity === 'company';
  const isIndianCompany = isCompany && context.is_indian_company === true;
  const isNR = context.final_india_residency_status === 'NR';

  const ggCheck = compute80GGBlocked(context.has_salary_income, context.hra_received_inr);
  const ttaDerived = derive80TTA(context);

  return {
    stepEligible: context.tax_regime === 'OLD',

    showPpfNriWarning: isNR,
    showNscNriWarning: isNR,
    showSsyNriWarning: isNR,

    is80DDBlocked: isNR,
    is80DDBBlocked: isNR,
    is80UBlocked: isNR,
    show80DDDetails: !isNR && context.deductions.s80DD.has_disabled_dependents,
    show80DDBDetails: !isNR && context.deductions.s80DDB.has_specified_diseases_treatment,
    show80UDetails: !isNR && context.deductions.s80U.has_self_disability,

    show80DParentsMed: compute80DMedicalVisibility(context.deductions.s80D),

    is80GGBlocked: ggCheck.blocked,
    blockedReason80GG: ggCheck.reason,
    show80GGRentInput: !ggCheck.blocked && context.deductions.s80GG.has_rent_paid_no_hra,

    ttaSection: ttaDerived.section,
    ttaDisplayText: ttaDerived.displayText,
    show80TTAFdField: ttaDerived.showFdField,
    show80TTBNrWarning: ttaDerived.showNrWarning,

    show80IAC: entity === 'company' || entity === 'llp',
    show80LA: !(isInd || isHuf),
    show80M: isIndianCompany,
    show80P: false,
    politicalTitle: isCompany
      ? 'Political Contributions Deduction (Companies) - Donations to Political Parties'
      : 'Political Contributions Deduction (Others) - Donations to Political Parties',

    donationRows: context.deductions.s80G_rows.map((row: any) => {
      const elig = computeDonationEligibility(row);
      return { showIneligibleWarning: elig.showWarning };
    }),
  };
}

export function deriveAll(rawContext: any): any {
  const context = { ...rawContext };
  const visibility = computeVisibility(context);
  const computedS80G = computeS80G(context.deductions.s80G_rows);
  return { ...context, ui: { visibility, computedS80G } };
}
