// ────────────────────────────────────────────────────────────────────────
// deriveDeductions.js
// Pure, DOM-free port of the "Screen 2J — Tax Deductions (Chapter VI-A)"
// step logic in layer1_india.html: update80C/80CCC_80CCD1/updateNpsAdd/
// update80D/update80DBool/sync80DMedicalVisibility/update80DDBool/
// update80DDField/update80DDNum/sync80DDVisibility/update80GGBool/
// update80GGNum/update80TTA/derive80TTASection/isSeniorCitizen/
// add80GRow-and-sync80GState/update80E/update80EEA/updateSpecialDeduction/
// updateRoyaltyDeduction/update80M/updatePoliticalDonation, plus the
// entity/residency-driven visibility block from evaluateEntityOverrides()
// / updateBizEntityType() / syncUnlockStatus(). No DOM reads/writes
// anywhere in this file.
//
// ══════════════════════════════════════════════════════════════════════
// IMPORTANT CORRECTION TO THE TASK PREMISE (found via direct DOM-logic
// inspection, as instructed):
// This step is NOT always visible. `syncUnlockStatus()` in the source has
// an explicit branch:
//     } else if (step === 'step-deductions') {
//         isAllowed = (state.profile.tax_regime === 'OLD');
// i.e. the whole step is gated behind the Old Tax Regime — which also
// matches the panel's own subtitle: "Available under Old Regime only."
// This is reproduced as `context.tax_regime` (injected from Step 1) and
// `ui.visibility.stepEligible`. This is flagged prominently rather than
// silently building to the (incorrect) "always visible" premise.
// ══════════════════════════════════════════════════════════════════════
//
// ── FULL CROSS-STEP DEPENDENCY MAP ──────────────────────────────────────
//   context.tax_regime                    <- Step 1 (Financial Life Snapshot): step-level gate
//   context.entity_type                   <- Step 1: 80TTB senior-individual-only rule,
//        80IAC (company/llp only), 80LA (non-ind/huf only), political-title text
//   context.date_of_birth                 <- Step 1 (profile): isSeniorCitizen() for 80TTA/TTB
//   context.final_india_residency_status  <- Step 2 (Residency Solver): PPF/NSC/SSY/SCSS
//        warnings, hard NRI blocks on 80DD/80DDB/80U, 80TTA/TTB derivation
//   context.is_indian_company             <- Step 2 (residency_detail): 80M visibility
//   context.has_salary_income /
//   context.hra_received_inr              <- Step 3 (Salary): 80GG eligibility
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

// isSeniorCitizen(): age >= 60 as of the end of the tax year (hardcoded
// "2026-03-31" in the source — reproduced verbatim rather than
// generalized, to match the source's own hardcoding).
function isSeniorCitizen(dateOfBirth) {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  const endOfFY = new Date('2026-03-31');
  let age = endOfFY.getFullYear() - dob.getFullYear();
  const m = endOfFY.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && endOfFY.getDate() < dob.getDate())) age--;
  return age >= 60;
}

// sync80DMedicalVisibility(): the parents'-medical-expenditure field is
// only relevant (and only cleared when hidden) when parents are seniors
// AND do NOT already have an insurance policy.
function compute80DMedicalVisibility(s80D) {
  const hasIns = s80D.parents_has_health_insurance !== false;
  const isSenior = s80D.parents_are_senior === true;
  return !hasIns && isSenior;
}
function clear80DMedicalIfHidden(s80D) {
  return compute80DMedicalVisibility(s80D) ? s80D : { ...s80D, parents_medical_expenditure_inr: null };
}

// sync80DDVisibility(section): each of 80DD/80DDB/80U clears its own
// detail fields the moment its own "has_X" flag is turned off.
function clearDDDetailsIfHidden(section, key) {
  if (section[key]) return section;
  if (key === 'has_disabled_dependents' || key === 'has_self_disability') {
    return { ...section, disability_percentage: null };
  }
  if (key === 'has_specified_diseases_treatment') {
    return { ...section, patient_category: null, medical_expenses_inr: null };
  }
  return section;
}

// update80GGBool(): clears rent_paid_inr the moment the toggle turns off.
function clear80GGIfHidden(s80GG) {
  return s80GG.has_rent_paid_no_hra ? s80GG : { ...s80GG, rent_paid_inr: null };
}

// derive80TTASection(): the residency/senior/entity-driven 80TTA vs 80TTB
// derivation, including the side effect of clearing fd_rd_interest_inr
// whenever the FD/RD field becomes irrelevant (NR, or non-senior/non-individual).
function derive80TTA(context) {
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

// Applied whenever context (not just the field itself) changes in a way
// that affects the 80TTA/TTB derivation — clears fd_rd_interest_inr if the
// FD field is no longer shown, exactly like the original.
function applyTTADerivedClear(s80TTA_TTB, derived) {
  const next = { ...s80TTA_TTB, applicable_section: derived.section };
  if (!derived.showFdField) next.fd_rd_interest_inr = null;
  return next;
}

// The three hard NRI blocks (80DD/80DDB/80U): force has_X false + clear
// detail fields whenever residency flips to NR. Mirrors the original's
// direct DOM checkbox-uncheck + sync80DDVisibility() call chain.
function applyNriBlocks(deductions, isNR) {
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

// 80GG eligibility: requires active salary income AND no HRA received.
function compute80GGBlocked(hasSalaryIncome, hraReceivedInr) {
  const hasSalary = hasSalaryIncome === true;
  const hraReceived = (hraReceivedInr || 0) > 0;
  const blocked = !hasSalary || hraReceived;
  const reason = !hasSalary ? 'Blocked: Requires active Salary income.' : hraReceived ? 'Blocked: Cannot claim 80GG when receiving HRA.' : null;
  return { blocked, reason };
}
function applyGGBlockIfNeeded(s80GG, isBlocked) {
  if (!isBlocked) return s80GG;
  return { has_rent_paid_no_hra: false, rent_paid_inr: null };
}

// ---- 80G donation rows (add80GRow / sync80GState) ----
function defaultDonationRow() {
  return {
    donee_name: null,
    donee_pan: null,
    donation_amount_raw: null,
    // NOTE: this select (`.g80-percent`, 100%/50%) exists in the original
    // markup but, like `.g80-limit` below, sync80GState() never reads it —
    // it has no effect on computed state. Kept for visual parity only.
    deduction_rate: '100',
    donation_mode: 'cheque', // 'cheque' | 'cash' | 'kind' | 'other'
    category: '100_percent_no_limit',
    // NOTE: this checkbox exists in the original markup (`.g80-limit`,
    // defaults checked) but sync80GState() never reads it — it has no
    // effect on computed state at all. Kept here for visual parity only.
    subject_to_qualifying_limit: true,
  };
}
// sync80GState()'s eligibility rule: kind/other modes are always
// ineligible; cash is ineligible above ₹2,000.
function computeDonationEligibility(row) {
  const amt = parseINRCurrency(row.donation_amount_raw) || 0;
  let isEligible = true;
  if (row.donation_mode === 'kind' || row.donation_mode === 'other') isEligible = false;
  if (row.donation_mode === 'cash' && amt > 2000) isEligible = false;
  return { isEligible, showWarning: !isEligible && amt > 0, amt };
}
// Ineligible rows are computed for their warning but SILENTLY EXCLUDED
// from the persisted `s80G` array — exactly like the original.
function computeS80G(rows) {
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

// ---- entity/residency-driven visibility (evaluateEntityOverrides / updateBizEntityType) ----
function computeVisibility(context) {
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

    // NRI cosmetic warnings (values NOT cleared, unlike the hard blocks below)
    showPpfNriWarning: isNR,
    showNscNriWarning: isNR,
    showSsyNriWarning: isNR,

    // Hard NRI blocks (card disabled + values force-cleared)
    is80DDBlocked: isNR,
    is80DDBBlocked: isNR,
    is80UBlocked: isNR,
    show80DDDetails: !isNR && context.deductions.s80DD.has_disabled_dependents,
    show80DDBDetails: !isNR && context.deductions.s80DDB.has_specified_diseases_treatment,
    show80UDetails: !isNR && context.deductions.s80U.has_self_disability,

    // 80D parents' medical expenditure
    show80DParentsMed: compute80DMedicalVisibility(context.deductions.s80D),

    // 80GG (Rent paid, no HRA)
    is80GGBlocked: ggCheck.blocked,
    blockedReason80GG: ggCheck.reason,
    show80GGRentInput: !ggCheck.blocked && context.deductions.s80GG.has_rent_paid_no_hra,

    // 80TTA / 80TTB derivation
    ttaSection: ttaDerived.section,
    ttaDisplayText: ttaDerived.displayText,
    show80TTAFdField: ttaDerived.showFdField,
    show80TTBNrWarning: ttaDerived.showNrWarning,

    // Entity-gated special deductions
    show80IAC: entity === 'company' || entity === 'llp',
    show80LA: !(isInd || isHuf),
    show80M: isIndianCompany,
    // NOTE: div-ded-80p (Cooperative Society Deduction) is dead UI in the
    // original — no code path anywhere ever removes its `hidden` class
    // (confirmed: it's referenced only in a regime-change RESET list, never
    // in a "show" list). Faithfully reproduced as permanently hidden.
    show80P: false,
    politicalTitle: isCompany
      ? 'Political Contributions Deduction (Companies) - Donations to Political Parties'
      : 'Political Contributions Deduction (Others) - Donations to Political Parties',

    // 80G donation rows
    donationRows: context.deductions.s80G_rows.map((row) => {
      const elig = computeDonationEligibility(row);
      return { showIneligibleWarning: elig.showWarning };
    }),
  };
}

function deriveAll(rawContext) {
  const context = { ...rawContext };
  const visibility = computeVisibility(context);
  const computedS80G = computeS80G(context.deductions.s80G_rows);
  return { ...context, ui: { visibility, computedS80G } };
}

export {
  parseINRCurrency,
  formatINRDisplay,
  isSeniorCitizen,
  compute80DMedicalVisibility,
  clear80DMedicalIfHidden,
  clearDDDetailsIfHidden,
  clear80GGIfHidden,
  derive80TTA,
  applyTTADerivedClear,
  applyNriBlocks,
  compute80GGBlocked,
  applyGGBlockIfNeeded,
  defaultDonationRow,
  computeDonationEligibility,
  computeS80G,
  computeVisibility,
  deriveAll,
};
