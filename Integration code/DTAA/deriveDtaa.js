// ────────────────────────────────────────────────────────────────────────
// deriveDtaa.js
// Pure, DOM-free port of the "Screen 2B — Tax Treaties (DTAA)" step logic
// in layer1_india.html: toggleUSResidentDtaa(), togglePeAlert(),
// toggleTrcUpload(), updateDtaaField(), updateCompTRC(),
// renderDtaaElections()'s per-row warning banners, autoFillUSTreaty(),
// addDtaaElectionRow()/removeDtaaElectionRow()/updateDtaaElection() (incl.
// its India-US treaty-rate auto-fill table). No DOM reads/writes anywhere
// in this file.
//
// ── CROSS-STEP DEPENDENCIES ─────────────────────────────────────────────
//   context.final_india_residency_status <- Step 2 (Residency Solver)
//   context.days_in_india_current_year   <- Step 2 (Residency Solver)
//   context.dtaa.dtaa_treaty_residence /
//   context.dtaa.dtaa_forced_nr          <- Step 2 (Residency Solver's DTAA
//        Article-4 tie-breaker wizard, embedded in that step's dual-
//        residency-alert panel — see residencyMachine.js). Both are
//        READ-ONLY from this step's point of view: they're written by the
//        tie-breaker wizard, not by anything in this DTAA step's own UI.
//
// ── THE VISIBILITY GATE THIS STEP ASKED FOR ──────────────────────────────
// The original only gates step-dtaa's sidebar visibility on
// `final_india_residency_status === 'NR'` (see `syncUnlockStatus()`).
// Per explicit instruction, this port ALSO requires
// `days_in_india_current_year < 180` before the step is considered
// reachable/visible — both conditions must hold. In practice these two
// almost always agree for individuals (NR generally implies <182 days
// in the RS-001 solver), but the raw day-count is enforced explicitly and
// directly here rather than only implicitly through the derived status.
// See `computeStepEligibility()` below.
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

// India-US treaty rate/article auto-fill table, ported verbatim from
// updateDtaaElection()'s inline if/else chain.
const US_TREATY_AUTOFILL = {
  interest: { elected_rate: 0.15, treaty_article: 'Art 11(2)(b)' },
  royalty: { elected_rate: 0.15, treaty_article: 'Art 12(2)(a)(ii)' },
  fts: { elected_rate: 0.15, treaty_article: 'Art 12(2)(a)(ii)' },
  dividend: { elected_rate: 0.25, treaty_article: 'Art 10(2)(b)' },
  capital_gains: { elected_rate: null, treaty_article: 'Art 13 (Domestic)' },
};

function defaultElection() {
  return { income_type: null, amount_inr: null, elected_rate: null, treaty_article: null };
}

// updateDtaaElection(index, field, val): value coercion + income-type
// auto-fill side effect.
function applyElectionUpdate(election, field, val) {
  let next = { ...election };
  if (field === 'elected_rate' || field === 'amount_inr') {
    next[field] = val === '' ? null : parseINRCurrency(val);
  } else {
    next[field] = val;
  }
  if (field === 'income_type') {
    const autofill = US_TREATY_AUTOFILL[val];
    if (autofill) {
      next.elected_rate = autofill.elected_rate;
      next.treaty_article = autofill.treaty_article;
    } else {
      next.elected_rate = null;
      next.treaty_article = null;
    }
  }
  return next;
}

// autoFillUSTreaty(): replaces the whole list with the 3 beneficial US
// streams, exactly as the original does (not additive).
function autoFillUSTreaty() {
  return [
    { income_type: 'interest', amount_inr: null, elected_rate: 0.15, treaty_article: 'Art 11(2)(b)' },
    { income_type: 'royalty', amount_inr: null, elected_rate: 0.15, treaty_article: 'Art 12(2)(a)(ii)' },
    { income_type: 'fts', amount_inr: null, elected_rate: 0.15, treaty_article: 'Art 12(2)(a)(ii)' },
  ];
}

// toggleUSResidentDtaa(val): country==='US' sets is_us_resident_for_dtaa
// true; anything else (including empty) resets it to null.
function computeIsUsResident(countryCode) {
  return countryCode === 'US' ? true : null;
}

// Per-row warning/info banner, ported from renderDtaaElections()'s inline
// income_type checks.
function computeElectionBanner(election) {
  if (election.income_type === 'dividend') {
    return {
      type: 'warning',
      text: "India's domestic tax rate on dividends (20%) is lower than the US treaty rate (25%). It is generally NOT recommended to invoke the treaty for dividends.",
    };
  }
  if (election.income_type === 'capital_gains') {
    return {
      type: 'info',
      text: 'Under Article 13 of the India-US DTAA, capital gains are taxed according to domestic laws. No special lower treaty rates apply.',
    };
  }
  return null;
}

// The combined step-eligibility gate (see module header comment).
function computeStepEligibility(context) {
  const isNR = context.final_india_residency_status === 'NR';
  const isUnder180Days = context.days_in_india_current_year != null && context.days_in_india_current_year < 180;
  return { isNR, isUnder180Days, eligible: isNR && isUnder180Days };
}

function computeVisibility(context) {
  const eligibility = computeStepEligibility(context);
  return {
    stepEligible: eligibility.eligible,
    eligibility,
    divTrcUpload: !!context.dtaa.trc_status,
    divPeAlert: !!context.dtaa.has_permanent_establishment_in_india,
    // The original's "⚡ Auto-Fill US Rates" button carries a permanent
    // `hidden` class in the markup that NO code path in the source ever
    // removes — it's dead UI (the function it calls, autoFillUSTreaty(),
    // is fully wired and functional; only the button's own visibility
    // was never hooked up). Faithfully reproduced as always-hidden here
    // rather than "fixing" it by guessing the intended condition
    // (which would plausibly have been `is_us_resident_for_dtaa === true`).
    showUsAutofillBtn: false,
    elections: context.dtaa.treaty_elections.map((e) => ({ ...e, banner: computeElectionBanner(e) })),
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
  defaultElection,
  applyElectionUpdate,
  autoFillUSTreaty,
  computeIsUsResident,
  computeElectionBanner,
  computeStepEligibility,
  computeVisibility,
  deriveAll,
};
