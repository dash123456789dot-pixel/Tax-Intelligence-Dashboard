// ────────────────────────────────────────────────────────────────────────
// derive.js
// Pure, framework-free port of the DOM-imperative logic found in
// layer1_india.html for the "Screen 2A — Residency Detection" step
// (panel-step-profile). No DOM reads/writes — everything is a function of
// context in, context.ui out. This is what the XState machine calls after
// every event, mirroring the original's habit of chaining
// runResidencySolver() -> syncResidencyUI() -> checkDualResidencyConflict()
// after every single field mutation.
// ────────────────────────────────────────────────────────────────────────

const FIRM_LIKE = ['firm', 'llp', 'aop', 'trust', 'ajp', 'local'];

// ---- RS-001: live day tracking (calculateLiveDays / recalculateTotalDays) ----
function calculateLiveDays(residency_detail, now = new Date()) {
  if (!residency_detail.live_tracking_active || !residency_detail.trips) return 0;

  // Mirrors: derive FY from state.metadata.financial_year, default 2026
  let currentYear = residency_detail._fy_end_year || 2026;
  const fyStart = new Date(`${currentYear - 1}-04-01T00:00:00+05:30`);
  const fyEnd = new Date(`${currentYear}-03-31T23:59:59+05:30`);

  const istNowStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istToday = new Date(istNowStr);

  let totalLiveDays = 0;
  residency_detail.trips.forEach((trip) => {
    if (!trip.arrival_date) return;
    let arrival = new Date(trip.arrival_date + 'T00:00:00+05:30');
    let departure = trip.departure_date ? new Date(trip.departure_date + 'T23:59:59+05:30') : istToday;

    if (arrival > fyEnd || departure < fyStart) return;
    if (arrival < fyStart) arrival = fyStart;
    if (departure > fyEnd) departure = fyEnd;

    const diffDays = Math.ceil((departure - arrival) / (1000 * 60 * 60 * 24));
    totalLiveDays += Math.max(0, diffDays);
  });
  return totalLiveDays;
}

function hasActiveOpenTrip(residency_detail, now = new Date()) {
  if (!residency_detail.live_tracking_active || !residency_detail.trips) return false;
  const istNowStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istToday = new Date(istNowStr);
  return residency_detail.trips.some((trip) => {
    if (trip.arrival_date && !trip.departure_date) {
      const arr = new Date(trip.arrival_date + 'T00:00:00+05:30');
      if (arr <= istToday) return true;
    }
    return false;
  });
}

// recalculateTotalDays(): total = min(366, manual + live)
function recalcTotalDays(residency_detail, now = new Date()) {
  const manual = residency_detail.manual_days || 0;
  const live = calculateLiveDays(residency_detail, now);
  return Math.min(366, manual + live);
}

// ---- Company POEM mock derivation (inline block inside runResidencySolver) ----
function deriveCompanyPOEM(company_residency) {
  if (!company_residency) return false;
  const cr = company_residency;
  if (cr.is_active_business) {
    return cr.board_meetings_primarily_outside_india === false;
  } else if (cr.key_management_location) {
    if (cr.key_management_location === 'india') return true;
    if (cr.key_management_location === 'outside_india') return false;
    if (cr.key_management_location === 'mixed') {
      const inCount = cr.directors_in_india_count || 0;
      const outCount = cr.directors_outside_india_count || 0;
      if (inCount > outCount) return true;
      if (outCount > inCount) return false;
      return cr.management_delegated_outside_india === false;
    }
  }
  return false;
}

// ---- RS-001 EXHAUSTIVE RESIDENCY SOLVER (runResidencySolver) ----
function runResidencySolver(context) {
  const entity = context.entity_type;
  const rd = context.residency_detail;

  let status = 'NR';
  let path = 'NR-Default: Standard Non-Resident';
  let scope = 'India-source income only.';

  if (entity === 'company') {
    const isIndian = rd.is_indian_company;
    const poem = deriveCompanyPOEM(context.company_residency);

    if (isIndian === true) {
      status = 'ROR'; path = 'Path RES-1: Indian Company'; scope = 'Worldwide income.';
    } else if (isIndian === false) {
      if (poem === true) {
        status = 'ROR'; path = 'Path RES-2: Foreign Company with POEM in India'; scope = 'Worldwide income.';
      } else {
        status = 'NR'; path = 'Path NR-1: Foreign Company (POEM outside India)';
      }
    } else {
      status = 'ROR'; path = 'Path RES-1: Indian Company'; scope = 'Worldwide income.';
    }
  } else if (FIRM_LIKE.includes(entity)) {
    const whollyOutside = rd.is_wholly_outside_india;
    if (whollyOutside === true) {
      status = 'NR'; path = 'Path NR-2: Control and Management wholly outside India';
    } else {
      status = 'ROR'; path = 'Path RES-3: Control and Management partially or wholly in India'; scope = 'Worldwide income.';
    }
  } else if (entity === 'huf') {
    const whollyOutside = rd.is_wholly_outside_india;
    if (whollyOutside === true) {
      status = 'NR'; path = 'Path NR-3: HUF Control and Management wholly outside India';
    } else {
      const nr9 = rd.nr_years_last_10_gte_9;
      const d7_729 = rd.days_in_india_last_7_years_lte_729;
      if (nr9 === true || d7_729 === true) {
        status = 'RNOR'; path = 'Path RNOR-HUF: HUF Resident but Not Ordinarily Resident (Karta meets RNOR conditions)';
        scope = 'India-source income + business controlled in India.';
      } else {
        status = 'ROR'; path = 'Path ROR-HUF: HUF Resident and Ordinarily Resident'; scope = 'Worldwide income.';
      }
    }
  } else {
    // INDIVIDUAL LOGIC
    const days = rd.days_in_india_current_year;
    const p4y = rd.days_in_india_preceding_4_years_gte_365;
    const emp = rd.employment_or_crew_status || 'none';
    const visit = rd.came_on_visit_to_india_pio_citizen;
    const nr9 = rd.nr_years_last_10_gte_9;
    const d7_729 = rd.days_in_india_last_7_years_lte_729;
    const inc15 = rd.india_source_income_above_15l;
    const ltac = rd.liable_to_tax_in_another_country_being_indian_citizen || false;

    if (days >= 182) {
      if (nr9 === false && d7_729 === false) {
        status = 'ROR'; path = 'Path ROR-1: Standard Resident (>182 days + not NR 9/10 + >729 preceding days)';
        scope = 'Worldwide income. Deductions and treaty foreign tax credits fully unlocked.';
      } else if (nr9 === true) {
        status = 'RNOR'; path = 'Path RNOR-1: Resident but Not Ordinarily Resident (Condition A: NR in 9/10 years)';
        scope = 'India-source income + business controlled in India. Foreign salary/investments exempt.';
      } else {
        status = 'RNOR'; path = 'Path RNOR-2: Resident but Not Ordinarily Resident (Condition B: <=729 days in 7 years)';
        scope = 'India-source income + business controlled in India. Foreign salary/investments exempt.';
      }
    } else if (days >= 60 && days < 182) {
      if (p4y === true) {
        if (emp !== 'none') {
          if (inc15 === true && ltac === false) {
            status = 'RNOR'; path = 'Path RNOR-3: Deemed Resident Residential Status Rules(1A) (Employment Exception, income >15L)';
            scope = 'Deemed resident scope: India-source income + India-controlled businesses.';
          } else if (inc15 === false) {
            status = 'NR'; path = 'Path NR-7: Non-Resident (Employment departure exception + India income <=15L)';
            scope = 'India-source income only.';
          } else {
            status = 'NR'; path = 'Path NR-8: Non-Resident (Employment exception, Deemed Resident blocked by tax liability elsewhere)';
            scope = 'India-source income only.';
          }
        } else if (visit === true) {
          if (days >= 120 && inc15 === true) {
            status = 'RNOR'; path = 'Path RNOR-4: Condition C Visitor path (>=120 days + Residential Status Rules(6)(c) RNOR)';
            scope = 'India-source income + India-controlled businesses. Foreign sources exempt.';
          } else if (days >= 120 && inc15 === false) {
            status = 'NR'; path = 'Path NR-5: Non-Resident (Visitor >=120 days but India income <=15L)';
            scope = 'India-source income only.';
          } else if (days < 120 && inc15 === true && ltac === false) {
            status = 'RNOR'; path = 'Path RNOR-6: Deemed Resident Residential Status Rules(1A) (Visitor <120 days, income >15L, not liable elsewhere)';
            scope = 'Deemed resident scope: India-source income + India-controlled businesses.';
          } else {
            status = 'NR'; path = 'Path NR-10: Non-Resident (Visitor <120 days)';
          }
        } else {
          if (nr9 === false && d7_729 === false) {
            status = 'ROR'; path = 'Path ROR-2: Standard Resident (>60 days & >=365 in 4 yrs + not NR 9/10 + >729 preceding days)';
            scope = 'Worldwide income. Deductions and treaty foreign tax credits fully unlocked.';
          } else if (nr9 === true) {
            status = 'RNOR'; path = 'Path RNOR-5: RNOR (>60 days & >=365 in 4 yrs + NR in 9/10 years)';
            scope = 'India-source income + business controlled in India. Foreign salary/investments exempt.';
          } else {
            status = 'RNOR'; path = 'Path RNOR-6: RNOR (>60 days & >=365 in 4 yrs + <=729 days in 7 years)';
            scope = 'India-source income + business controlled in India. Foreign salary/investments exempt.';
          }
        }
      } else {
        if (inc15 === true && ltac === false) {
          status = 'RNOR'; path = 'Path RNOR-7: Deemed Resident Residential Status Rules(1A) (<182 days, <365 in 4 yrs, but income >15L & not liable elsewhere)';
          scope = 'Deemed resident scope: India-source income + India-controlled businesses.';
        } else {
          status = 'NR'; path = 'Path NR-6: Non-Resident (<182 days and <365 in 4 yrs)';
          scope = 'India-source income only.';
        }
      }
    } else if (days < 60) {
      if (inc15 === true && ltac === false) {
        status = 'RNOR'; path = 'Path RNOR-8: Deemed Resident Residential Status Rules(1A) (<60 days, income >15L, not liable elsewhere)';
        scope = 'Deemed resident scope: India-source income + India-controlled businesses.';
      } else {
        status = 'NR'; path = 'Path NR-9: Non-Resident (<60 days)';
        scope = 'India-source income only.';
      }
    }
  }

  if (context.dtaa.dtaa_treaty_residence === 'us' || context.dtaa.dtaa_forced_nr === true) {
    status = 'NR';
    path = 'DTAA Article 4 Treaty Tie-Breaker to United States';
    scope = 'India-source income only (DTAA Article 4 non-resident status).';
  }

  return { status, path, scope };
}

// ---- syncResidencyUI(): field-level visibility for the individual branch,
// plus the entity-morph rules pulled in from updateBizEntityType() ----
function computeVisibility(context) {
  const entity = context.entity_type;
  const rd = context.residency_detail;
  const days = rd.days_in_india_current_year;
  const p4y = rd.days_in_india_preceding_4_years_gte_365;
  const emp = rd.employment_or_crew_status;
  const visit = rd.came_on_visit_to_india_pio_citizen;
  const nr9 = rd.nr_years_last_10_gte_9;
  const wo = rd.is_wholly_outside_india;

  const v = {
    // entity-level containers (updateBizEntityType)
    divResWhollyOutside: entity === 'huf' || FIRM_LIKE.includes(entity),
    divResIndianCompany: entity === 'company',
    divCompanyResidency: entity === 'company' && rd.is_indian_company === false,
    divKartaAlert: entity === 'huf' && wo === false,
    divResidencyIndividualContainer: entity === 'individual' || (entity === 'huf' && wo === false),

    // company POEM sub-fields (syncResidencyUI's progressive company logic)
    divCrBoardOut: !!context.company_residency.is_active_business,
    divCrKmpLoc: !context.company_residency.is_active_business,
    divCrMgmtDel: !context.company_residency.is_active_business,
    divCrDirs: !context.company_residency.is_active_business,

    // huf sub-fields
    divHufNr9: entity === 'huf' && wo === false,
    divHufD7: entity === 'huf' && wo === false && nr9 !== null,

    // individual sub-fields, default all hidden then re-derived below
    divResCoreDays: false,
    divP4y: false,
    divEmp: false,
    divDeparture: false,
    divVisitor: false,
    divNr9: false,
    divD7: false,
    divInc15: false,
  };

  if (entity === 'individual') {
    v.divResCoreDays = true;
    if (days >= 182) {
      v.divNr9 = true;
      if (nr9 !== null) v.divD7 = true;
    } else if (days >= 60) {
      v.divP4y = true;
      if (p4y === true) {
        v.divEmp = true;
        if (emp === 'none' || emp === null) {
          if (emp === 'none') {
            v.divVisitor = true;
            if (visit === true) {
              v.divInc15 = true;
            } else if (visit === false) {
              v.divNr9 = true;
              if (nr9 !== null) v.divD7 = true;
            }
          }
        } else {
          v.divDeparture = true;
          v.divInc15 = true;
        }
      } else if (p4y === false) {
        v.divInc15 = true;
      }
    } else {
      v.divInc15 = true;
    }
  }
  // huf: core-days explicitly hidden (already false); huf-nr9/d7 computed above.

  return v;
}

// ---- checkDualResidencyConflict() ----
function computeDualResidencyAlert(context, finalStatus) {
  const lock = finalStatus;
  const isTreatyUS = context.dtaa?.dtaa_treaty_residence === 'us';
  const isIndiaDomesticResident = lock === 'ROR' || lock === 'RNOR' || isTreatyUS;
  const isUSDomesticResident = !!context.external?.is_us_domestic_resident;
  const isIndividual = context.entity_type === 'individual';
  return isIndiaDomesticResident && isUSDomesticResident && isIndividual;
}

// ---- evaluateTieBreaker(): DTAA Article 4 tie-breaker wizard ----
function computeTieBreaker(dtaa) {
  const home = dtaa.tb_home || 'none';
  const cvi = dtaa.tb_cvi || 'none';
  const abode = dtaa.tb_abode || 'none';
  const nationality = dtaa.tb_nationality || 'none';

  let winner = 'none';
  let explanation = '';
  let showCvi = false, showAbode = false, showNationality = false;

  if (home === 'india') {
    winner = 'india';
    explanation = 'Step 1: Permanent Home is only in India. Tie broken to India.';
  } else if (home === 'us') {
    winner = 'us';
    explanation = 'Step 1: Permanent Home is only in the US. Tie broken to United States.';
  } else if (home === 'both' || home === 'neither') {
    showCvi = true;
    if (cvi === 'india') {
      winner = 'india';
      explanation = 'Step 2: Centre of Vital Interests is closer to India. Tie broken to India.';
    } else if (cvi === 'us') {
      winner = 'us';
      explanation = 'Step 2: Centre of Vital Interests is closer to the US. Tie broken to United States.';
    } else if (cvi === 'tie') {
      showAbode = true;
      if (abode === 'india') {
        winner = 'india';
        explanation = 'Step 3: Habitual Abode is in India. Tie broken to India.';
      } else if (abode === 'us') {
        winner = 'us';
        explanation = 'Step 3: Habitual Abode is in the US. Tie broken to United States.';
      } else if (abode === 'tie') {
        showNationality = true;
        if (nationality === 'india') {
          winner = 'india';
          explanation = 'Step 4: National of India. Tie broken to India.';
        } else if (nationality === 'us') {
          winner = 'us';
          explanation = 'Step 4: National of the US. Tie broken to United States.';
        }
      }
    }
  }

  let showOutcome = false;
  let outcomeIsPositive = false;
  let outcomeText = '';

  if (winner !== 'none') {
    showOutcome = true;
    outcomeIsPositive = true;
    outcomeText = explanation;
  } else if (home !== 'none') {
    showOutcome = true;
    outcomeIsPositive = false;
    outcomeText = explanation || 'Please complete the remaining tie-breaker tests.';
  }

  return { home, cvi, abode, nationality, winner, showCvi, showAbode, showNationality, showOutcome, outcomeIsPositive, outcomeText };
}

// ---- deriveAll(): the single entry point the machine calls after every event.
// Mirrors the original's chain: recalcTotalDays -> runResidencySolver ->
// syncResidencyUI -> checkDualResidencyConflict, plus tie-breaker + the
// onDtaaResidenceChange feedback loop (tie-breaker winner -> dtaa_treaty_residence
// -> re-run solver). ----
function deriveAll(rawContext, now = new Date()) {
  // 1. Recompute total days from manual + live trips (recalculateTotalDays)
  const days_in_india_current_year = recalcTotalDays(rawContext.residency_detail, now);
  const hasActiveLiveTrip = hasActiveOpenTrip(rawContext.residency_detail, now);

  let context = {
    ...rawContext,
    residency_detail: { ...rawContext.residency_detail, days_in_india_current_year },
  };

  // 2. Tie-breaker wizard -> feeds dtaa.dtaa_treaty_residence / dtaa_forced_nr
  //    (evaluateTieBreaker -> onDtaaResidenceChange)
  const tieBreaker = computeTieBreaker(context.dtaa);
  const dtaa_treaty_residence = tieBreaker.winner; // 'none' | 'india' | 'us'
  const dtaa_forced_nr = tieBreaker.winner === 'us';
  context = {
    ...context,
    dtaa: { ...context.dtaa, dtaa_treaty_residence, dtaa_forced_nr },
  };

  // 3. RS-001 solver
  const cert = runResidencySolver(context);
  context = {
    ...context,
    residency_detail: { ...context.residency_detail, final_india_residency_status: cert.status },
  };

  // 4. Field-level visibility
  const visibility = computeVisibility(context);

  // 5. Dual residency conflict banner
  const showDualResidencyAlert = computeDualResidencyAlert(context, cert.status);

  return {
    ...context,
    ui: {
      cert,
      visibility,
      tieBreaker,
      showDualResidencyAlert,
      hasActiveLiveTrip,
    },
  };
}

export {
  calculateLiveDays,
  hasActiveOpenTrip,
  recalcTotalDays,
  deriveCompanyPOEM,
  runResidencySolver,
  computeVisibility,
  computeDualResidencyAlert,
  computeTieBreaker,
  deriveAll,
};
