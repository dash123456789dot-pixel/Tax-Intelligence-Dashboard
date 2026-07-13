import type { ResidencyInputs, DtaaInputs, ResidencyResult } from './residencySolver.types';

export function solveResidency(
  inputs: ResidencyInputs,
  dtaa: DtaaInputs
): ResidencyResult {
  let status: ResidencyResult['status'] = 'NR';
  let path = '';
  let scope = '';

  if (inputs.entity_type === 'huf') {
    // ── HUF BRANCH ──
    const wholly_outside = inputs.is_wholly_outside_india || false;
    const karta_nr9 = inputs.huf_karta_nr9;
    const karta_d7 = inputs.huf_karta_d7_729;

    if (wholly_outside === false) {
      if (karta_nr9 === false && karta_d7 === false) {
        status = 'ROR';
        path = 'Path ROR-HUF: Control partially/wholly in India + Karta is ordinary resident';
        scope = 'Global Income is Taxable in India.';
      } else {
        status = 'RNOR';
        path = 'Path RNOR-HUF: Control partially/wholly in India + Karta is NOT ordinary resident';
        scope = 'Only India-sourced income & foreign income from Indian-controlled business is taxable.';
      }
    } else {
      // If control is wholly outside India, HUF is NR.
      status = 'NR';
      path = 'Path NR-HUF: Control wholly outside India';
      scope = 'Only India-sourced income is taxable.';
    }
  } else {
    // ── INDIVIDUAL BRANCH ──
    const days = inputs.india_days ?? 0;
    const p4y = inputs.days_in_india_preceding_4_years_gte_365;
    const emp = inputs.employment_or_crew_status || 'none';
    const visit = inputs.is_indian_citizen || inputs.is_pio_or_oci;
    const nr9 = inputs.nr_years_last_10_gte_9;
    const d7_729 = inputs.days_in_india_last_7_years_lte_729;
    const inc15 = inputs.income_above_15l;
    const ltac = inputs.liable_to_tax_in_another_country || false;

    if (days >= 182) {
      if (nr9 === false && d7_729 === false) {
        status = 'ROR';
        path = 'Path ROR-1: Standard Resident (>182 days + not NR 9/10 + >729 preceding days)';
        scope = 'Worldwide income. Deductions and treaty foreign tax credits fully unlocked.';
      } else if (nr9 === true) {
        status = 'RNOR';
        path = 'Path RNOR-1';
        scope = 'India-source income + business controlled in India. Foreign salary/investments exempt.';
      } else {
        status = 'RNOR';
        path = 'Path RNOR-2';
        scope = 'India-source income + business controlled in India. Foreign salary/investments exempt.';
      }
    } else if (days >= 60 && days < 182) {
      if (p4y === true) {
        if (emp !== 'none') {
          if (inc15 === true && ltac === false) {
            status = 'RNOR';
            path = 'Path RNOR-3: Deemed Resident s.6(1A) (Employment Exception, income >15L)';
            scope = 'Deemed resident scope: India-source income + India-controlled businesses.';
          } else if (inc15 === false) {
            status = 'NR';
            path = 'Path NR-7';
            scope = 'India-source income only.';
          } else {
            status = 'NR';
            path = 'Path NR-8';
            scope = 'India-source income only.';
          }
        } else if (visit === true) {
          if (days >= 120 && inc15 === true) {
            status = 'RNOR';
            path = 'Path RNOR-4';
            scope = 'India-source income + India-controlled businesses. Foreign sources exempt.';
          } else if (days >= 120 && inc15 === false) {
            status = 'NR';
            path = 'Path NR-5: Non-Resident (Visitor >=120 days but India income <=15L)';
            scope = 'India-source income only.';
          } else if (days < 120 && inc15 === true && ltac === false) {
            status = 'RNOR';
            path = 'Path RNOR-9: Deemed Resident s.6(1A) (Visitor <120 days, income >15L)';
            scope = 'Deemed resident scope: India-source income + India-controlled businesses.';
          } else {
            status = 'NR';
            path = 'Path NR-6: Non-Resident (Visitor <120 days + Deemed Resident blocked by liability elsewhere)';
            scope = 'India-source income only.';
          }
        } else {
          // Standard 60-day path
          if (nr9 === false && d7_729 === false) {
            status = 'ROR';
            path = 'Path ROR-2: Standard Resident (>60 days & >=365 in 4 yrs + not NR 9/10 + >729 preceding days)';
            scope = 'Worldwide income. Deductions and treaty foreign tax credits fully unlocked.';
          } else if (nr9 === true) {
            status = 'RNOR';
            path = 'Path RNOR-5: 60-day resident + Condition A (NR in 9/10 years)';
            scope = 'India-source income + India-controlled businesses. Foreign sources exempt.';
          } else {
            status = 'RNOR';
            path = 'Path RNOR-6';
            scope = 'India-source income + India-controlled businesses. Foreign sources exempt.';
          }
        }
      } else {
        // 60-181 but preceding 4yr < 365
        if (inc15 === true && ltac === false) {
          status = 'RNOR';
          path = 'Path RNOR-8: Deemed Resident s.6(1A) (preceding 4yr < 365 days, income >15L)';
          scope = 'Deemed resident scope: India-source income + India-controlled businesses.';
        } else if (inc15 === false) {
          status = 'NR';
          path = 'Path NR-4';
          scope = 'India-source income only.';
        } else {
          status = 'NR';
          path = 'Path NR-3: Non-Resident (60-181 days + preceding 4yr <365 + Deemed Resident blocked)';
          scope = 'India-source income only.';
        }
      }
    } else { // Days < 60
      if (inc15 === true) {
        status = 'NR';
        path = 'Path NR-1';
        scope = 'India-source income only.';
      } else if (inc15 === false) {
        status = 'NR';
        path = 'Path NR-2';
        scope = 'India-source income only.';
      } else {
        // Fallback if not yet selected
        status = 'NR';
        path = 'Path NR-1';
        scope = 'India-source income only.';
      }
    }
  }

  // ── DTAA OVERRIDE (runs after the solver) ──
  let dtaa_overridden = false;
  if (dtaa.dtaa_treaty_residence === 'us' || dtaa.dtaa_forced_nr === true) {
    status = 'NR';
    path = 'DTAA Article 4 Treaty Tie-Breaker to United States';
    scope = 'India-source income only (DTAA Article 4 non-resident status).';
    dtaa_overridden = true;
  }

  return { status, path, scope, dtaa_overridden };
}
