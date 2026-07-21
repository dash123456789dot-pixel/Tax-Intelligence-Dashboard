// ────────────────────────────────────────────────────────────────────────
// deriveBusiness.js
// Pure, DOM-free port of the Business & Profession step logic in
// layer1_india.html: toggleBusinessModule(), updateBizNature(),
// toggleReceiptsVisibility(), renderBusinessEntries()'s eligibility engine
// (validateS44ADEligibility / validateS44ADAEligibility /
// validateS44AEEligibility / validateS44BBEligibility /
// validateS44BBBEligibility), updateBizPresumptive()'s entries->array sync,
// syncGstSection(), evaluateAmtCreditExpiry(), and the cross-step
// visibility rules pulled out of evaluateEntityOverrides() / 
// updateBizEntityType() that live in this step's markup
// (div-prof-section-8, div-special-corporate-biz / div-s35ad-pipeline).
// No DOM reads/writes anywhere in this file.
//
// ── CROSS-STEP DEPENDENCIES (the reason several inputs below are marked
// "injected") ──────────────────────────────────────────────────────────
// This step reads four pieces of state it does not own:
//   - tax_regime               <- Step 1: Financial Life Snapshot
//   - entity_type               <- Step 1: Financial Life Snapshot
//   - is_indian_company         <- Step 2: Residency Solver (residency_detail.is_indian_company)
//   - final_india_residency_status ('ROR' | 'RNOR' | 'NR')
//                                <- Step 2: Residency Solver (RS-001 output)
// The residency status in particular gates whether presumptive taxation
// (s44AD / s44ADA) is even legally available at all — only ROR taxpayers
// may opt for it (see computePresumptiveOptions / warnPresNri below), and
// the residency-derived NR flag also unlocks s44BB, while is_indian_company
// (also from the Residency step) unlocks s44BBB and the S35AD / Section 8
// blocks. All four are read-only inputs from this step's point of view —
// see businessMachine.js's SET_TAX_REGIME / SET_ENTITY_TYPE /
// SET_IS_INDIAN_COMPANY / SET_RESIDENCY_STATUS events.
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

// ---- factories (addBusinessEntry / addPartnerFirm / addGoodsVehicle) ----

function defaultBusinessEntry(natureOfBusiness) {
  const natures = natureOfBusiness || [];
  let defaultNature = 'small_business';
  if (natures.includes('goods_transport') && !natures.includes('own_business') && !natures.includes('professional')) {
    defaultNature = 'goods_transport';
  }
  return {
    business_name: '',
    nature: defaultNature, // 'small_business' | 'professional' | 'regular_business' | 'goods_transport'
    presumptive_scheme: null, // null | 's44AD' | 's44ADA' | 's44AE' | 's44BB' | 's44BBB'
    business_code: null,
    profession_type: null,
    turnover_inr: null,
    digital_receipts_inr: null,
    cash_receipts_inr: null,
    ada_digital_receipts_inr: null,
    ada_cash_receipts_inr: null,
    gross_receipts_inr: null,
    // hidden / out of scope for this extraction — see README "Deferred sub-features".
    // Kept in the schema for shape-fidelity with state.domestic_income.business_income
    // .business_entries[i], but there is no rendered UI for per-entry branches in
    // this component (the original's branch/SEZ/export/revenue-line-item micro-UI
    // inside renderBusinessEntries() is a large, separate sub-system).
    branches: [],
  };
}

function defaultPartnerFirm() {
  return {
    firm_name: '',
    entity_type: 'registered_firm', // 'registered_firm' | 'llp'
    remuneration_from_entity_inr: null,
    interest_on_capital_from_entity_inr: null,
    profit_share_exempt_inr: null,
  };
}

function defaultGoodsVehicle() {
  return { vehicle_type: null, gvw_tonnes: null, months_owned: null };
}

// ---- updateGoodsVehicle(index, field, value) coercion ----
function applyGoodsVehicleUpdate(vehicle, field, value) {
  if (field === 'vehicle_type') {
    const next = { ...vehicle, vehicle_type: value };
    if (value !== 'heavy') next.gvw_tonnes = null;
    return next;
  }
  if (field === 'gvw_tonnes') {
    return { ...vehicle, gvw_tonnes: value ? parseInt(value, 10) : null };
  }
  if (field === 'months_owned') {
    let m = parseInt(value, 10);
    if (m > 12) m = 12;
    if (m < 1) m = 1;
    return { ...vehicle, months_owned: isNaN(m) ? null : m };
  }
  return vehicle;
}

// ---- updateBusinessEntry(idx, field, val) coercion (scoped fields only) ----
const ENTRY_NUM_FIELDS = ['turnover_inr', 'digital_receipts_inr', 'cash_receipts_inr', 'ada_digital_receipts_inr', 'ada_cash_receipts_inr', 'gross_receipts_inr'];

function applyBusinessEntryUpdate(entry, field, val) {
  if (ENTRY_NUM_FIELDS.includes(field)) {
    return { ...entry, [field]: val === '' ? null : parseINRCurrency(val) };
  }
  return { ...entry, [field]: val || null };
}

// ---- updatePartnerFirm(idx, field, val) coercion ----
const FIRM_NUM_FIELDS = ['remuneration_from_entity_inr', 'interest_on_capital_from_entity_inr', 'profit_share_exempt_inr'];
function applyPartnerFirmUpdate(firm, field, val) {
  if (FIRM_NUM_FIELDS.includes(field)) {
    return { ...firm, [field]: val === '' ? null : parseINRCurrency(val) };
  }
  return { ...firm, [field]: val || null };
}

// ---- Eligibility engine (business-entry-level presumptive-scheme options) ----
// Ported from the eligibility computation inline at the top of
// renderBusinessEntries()'s .map(). `ror` and `entity` are the two
// cross-step-injected values that gate everything here.
function computeSchemeEligibility(context) {
  const ror = context.final_india_residency_status === 'ROR';
  const entity = context.entity_type;
  const eligible44AD = ror && !['llp', 'company', 'aop', 'trust', 'local', 'coop', 'ajp'].includes(entity);
  const eligible44ADA = eligible44AD && entity !== 'huf';
  const isForeignCo = entity === 'company' && context.is_indian_company === false;
  const isNR = context.final_india_residency_status === 'NR';
  return { ror, entity, eligible44AD, eligible44ADA, isForeignCo, isNR };
}

// Returns the list of presumptive-scheme option values legally available
// for one entry, plus a human-readable reason string when regular books is
// the only option due to eligibility (used for the disabled-option label).
function computeEntrySchemeOptions(entry, elig) {
  const { eligible44AD, eligible44ADA, isForeignCo, isNR, ror, entity } = elig;
  const isSmall = entry.nature === 'small_business';
  const isProf = entry.nature === 'professional';
  const isTransport = entry.nature === 'goods_transport';

  let options = [];
  let ineligibleReason = null;

  if (isTransport) {
    options = [{ value: '', label: 'Regular Books' }, { value: 's44AE', label: 'Presumptive Taxation Scheme (Transporters) — Presumptive (Vehicle basis)' }];
  } else if (isSmall) {
    if (eligible44AD) {
      options = [{ value: '', label: 'Regular Books' }, { value: 's44AD', label: 'Presumptive Taxation Scheme (Eligible Business) — Presumptive (6% digital / 8% cash)' }];
    } else {
      ineligibleReason = !ror ? 'NR/RNOR' : entity.toUpperCase();
      options = [{ value: '', label: `Regular Books (Presumptive NOT allowed for ${ineligibleReason})` }];
    }
  } else if (isProf) {
    if (eligible44ADA) {
      options = [{ value: '', label: 'Regular Books' }, { value: 's44ADA', label: 'Presumptive Taxation Scheme (Professionals) — Presumptive (50% of receipts)' }];
    } else {
      ineligibleReason = !ror ? 'NR/RNOR' : entity === 'huf' ? 'HUF' : entity.toUpperCase();
      options = [{ value: '', label: `Regular Books (Presumptive NOT allowed for ${ineligibleReason})` }];
    }
  } else {
    options = [{ value: '', label: 'Regular Books (Mandatory)' }];
  }

  if (isNR) options.push({ value: 's44BB', label: 'Presumptive Taxation Scheme (Non-Residents - Mineral Oils) - Presumptive (10% Mineral Oils)' });
  if (isForeignCo) options.push({ value: 's44BBB', label: 'Presumptive Taxation Scheme (Foreign Companies - Civil Construction) - Presumptive (10% Power Projects)' });

  return { options, ineligibleReason };
}

// ---- validateS44ADEligibility(): turnover cap + digital-receipt ratio +
// 5-year lock-in. Force-reverts entry.presumptive_scheme to null + returns
// a warning message when violated. ----
function validateS44AD(entries, s44AD_last_exit_ay) {
  let ineligibleReason = null;
  let lockInActive = false;

  if (s44AD_last_exit_ay) {
    const match = s44AD_last_exit_ay.match(/(?:AY\s*)?(\d{4})(?:-\d{2,4})?/i);
    if (match) {
      const exitYear = parseInt(match[1], 10);
      const CURRENT_AY_START = 2024; // matches the original's hardcoded assumption
      if (CURRENT_AY_START - exitYear < 5 && CURRENT_AY_START - exitYear > 0) lockInActive = true;
    }
  }

  const nextEntries = entries.map((entry) => {
    if (entry.presumptive_scheme !== 's44AD') return entry;
    const dig = entry.digital_receipts_inr || 0;
    const csh = entry.cash_receipts_inr || 0;
    const branchTotal = (entry.branches || []).reduce((sum, b) => sum + (b.turnover_inr || 0) + (b.digital_receipts_inr || 0) + (b.cash_receipts_inr || 0), 0);
    const total = dig + csh + branchTotal;
    const ineligibleCodes = ['agency', 'brokerage', 'profession', 'goods_carriage'];

    let forceRevert = false;
    if (ineligibleCodes.includes(entry.business_code)) {
      ineligibleReason = `The selected business code (${entry.business_code}) is strictly prohibited from claiming Presumptive Taxation Scheme (Eligible Business). You must use Regular Books.`;
      forceRevert = true;
    } else if (lockInActive) {
      ineligibleReason = 'The mandatory 5-year cooling-off period has not expired. Presumptive Taxation Scheme (Eligible Business) cannot be opted for any business.';
      forceRevert = true;
    } else if (total > 30000000) {
      ineligibleReason = 'Total turnover exceeds ₹3 Crores. Presumptive Taxation Scheme (Eligible Business) cannot be opted.';
      forceRevert = true;
    } else if (total > 20000000 && total <= 30000000 && dig < 0.95 * total) {
      ineligibleReason = 'For turnover between ₹2Cr and ₹3Cr, digital receipts must be ≥ 95%. Your cash proportion is too high.';
      forceRevert = true;
    }

    return forceRevert ? { ...entry, presumptive_scheme: null } : entry;
  });

  return { entries: nextEntries, warning: ineligibleReason };
}

// ---- validateS44ADAEligibility(): profession-type Rule 6F + receipts cap ----
function validateS44ADA(entries) {
  let ineligibleReason = null;
  const nextEntries = entries.map((entry) => {
    if (entry.presumptive_scheme !== 's44ADA') return entry;
    if (entry.profession_type === 'other') {
      ineligibleReason = 'Presumptive Taxation Scheme (Professionals) is available ONLY for notified professions per Rule 6F. "Other" must use regular computation.';
      return { ...entry, presumptive_scheme: null };
    }
    const dig = entry.ada_digital_receipts_inr || 0;
    const csh = entry.ada_cash_receipts_inr || 0;
    const total = dig + csh;
    let limit = 5000000; // 50L
    if (total > 0 && dig / total >= 0.95) limit = 7500000; // 75L
    if (total > limit) {
      ineligibleReason = `Total receipts (₹${(total / 100000).toFixed(2)}L) exceed the applicable Presumptive Taxation Scheme (Professionals) limit of ₹${limit / 100000}L. You must use regular computation.`;
      return { ...entry, presumptive_scheme: null };
    }
    return entry;
  });
  return { entries: nextEntries, warning: ineligibleReason };
}

// ---- validateS44AEEligibility(): >10 goods vehicles force-reverts every
// s44AE entry. ----
function validateS44AE(entries, goodsVehicles) {
  const hasS44AE = entries.some((e) => e.presumptive_scheme === 's44AE');
  if (hasS44AE && goodsVehicles.length > 10) {
    return {
      entries: entries.map((e) => (e.presumptive_scheme === 's44AE' ? { ...e, presumptive_scheme: null } : e)),
      overLimit: true,
    };
  }
  return { entries, overLimit: false };
}

// ---- validateS44BBEligibility() / validateS44BBBEligibility(): revert if
// the injected residency/entity context no longer supports them. ----
function validateS44BB(entries, isNR) {
  if (isNR) return { entries, reverted: false };
  const reverted = entries.some((e) => e.presumptive_scheme === 's44BB');
  return { entries: entries.map((e) => (e.presumptive_scheme === 's44BB' ? { ...e, presumptive_scheme: null } : e)), reverted };
}
function validateS44BBB(entries, isForeignCo) {
  if (isForeignCo) return { entries, reverted: false };
  const reverted = entries.some((e) => e.presumptive_scheme === 's44BBB');
  return { entries: entries.map((e) => (e.presumptive_scheme === 's44BBB' ? { ...e, presumptive_scheme: null } : e)), reverted };
}

// Runs the full eligibility cascade in the same order updateBusinessEntry()
// does, and re-syncs the derived top-level presumptive_scheme[] array
// (ported from updateBizPresumptive()'s syncChecked()).
function runEligibilityCascade(context) {
  const elig = computeSchemeEligibility(context);
  let entries = context.business_income.business_entries;
  let warnings = { s44ad: null, s44ada: null, s44aeOverLimit: false };

  const r1 = validateS44AD(entries, context.business_income.s44AD_last_exit_ay);
  entries = r1.entries;
  warnings.s44ad = r1.warning;

  const r2 = validateS44ADA(entries);
  entries = r2.entries;
  warnings.s44ada = r2.warning;

  const r3 = validateS44AE(entries, context.business_income.goods_vehicles);
  entries = r3.entries;
  warnings.s44aeOverLimit = r3.overLimit;

  entries = validateS44BB(entries, elig.isNR).entries;
  entries = validateS44BBB(entries, elig.isForeignCo).entries;

  const presumptiveSchemeSynced = [...new Set(entries.map((e) => e.presumptive_scheme).filter(Boolean))];

  return { entries, warnings, presumptiveSchemeSynced, elig };
}

// ---- toggleReceiptsVisibility() / updateBizNature() visibility ----
function computeVisibility(context) {
  const bi = context.business_income;
  const natures = bi.nature_of_business;
  const { entries, warnings, presumptiveSchemeSynced, elig } = runEligibilityCascade(context);

  const isProfessional = natures.includes('professional');
  const hasS44AD = presumptiveSchemeSynced.includes('s44AD');
  const hasS44ADA = presumptiveSchemeSynced.includes('s44ADA');
  const hasS44AE = presumptiveSchemeSynced.includes('s44AE');
  const hasOwnBusiness = natures.includes('own_business') || natures.includes('goods_transport');
  const hasSmallBiz = entries.some((e) => e.nature === 'small_business');
  const noPresumptive = presumptiveSchemeSynced.length === 0;
  const isOnlyPartner = natures.length > 0 && natures.every((n) => n === 'partner_in_firm');
  const hasOtherBusinessWithPartner = natures.includes('partner_in_firm') && natures.some((n) => n !== 'partner_in_firm');
  const hasTrading = natures.includes('intraday_trader') || natures.includes('fno_trader');

  // Cross-step: Section 8 / corp-regime block and S35AD / special-corporate-biz
  // block, ported from evaluateEntityOverrides()/updateBizEntityType() —
  // both depend on entity_type AND is_indian_company (Residency Solver output).
  const isCompany = context.entity_type === 'company';
  const isDomesticCompany = isCompany && context.is_indian_company === true;
  const isIndianCompanyForSpecialSchemes = isCompany && context.final_india_residency_status !== 'NR';

  return {
    divBusinessContainer: !!bi.has_business_or_fo_income,

    divProfSection8: isDomesticCompany, // Section 8 (NGO) toggle
    divSpecialCorporateBiz: isIndianCompanyForSpecialSchemes, // wraps s35AD
    divS35adPipeline: isIndianCompanyForSpecialSchemes,

    divFnoIncome: natures.includes('fno_trader'),
    divIntradayIncome: natures.includes('intraday_trader'),
    divPartnerIncome: natures.includes('partner_in_firm'),
    divBusinessEntries: hasOwnBusiness,
    divBizCodeContainer: hasS44AD,
    divPresS44ad: hasSmallBiz,
    divPresS44ae: hasS44AE,
    divGeneralGrossReceipts: isProfessional && !hasS44ADA,
    divProfessionType: isProfessional || hasS44ADA,
    divTradingExpenses: hasTrading && noPresumptive,
    divExpenseSection: noPresumptive && !isOnlyPartner,

    accExpensesDimmed: natures.length === 0 || isOnlyPartner,
    notePartnerExpenses: hasOtherBusinessWithPartner,

    warnPresNri: entries.some((e) => e.presumptive_scheme === 's44AD' || e.presumptive_scheme === 's44ADA') && !elig.ror,
    warnPresS44adIneligible: warnings.s44ad,
    warnPresS44adaIneligible: warnings.s44ada,
    warnS44aeLimit: warnings.s44aeOverLimit,

    // Per-entry scheme option lists (recomputed fresh from current eligibility)
    entryOptions: entries.map((entry) => computeEntrySchemeOptions(entry, elig)),

    amtRegimeLocked: context.tax_regime === 'NEW',
  };
}

// ---- syncGstSection(): context note text per registration status ----
const GST_CONTEXT_MAP = {
  unregistered: 'Unregistered: Your business turnover equals gross receipts directly. No GST component to deduct. Note: if your aggregate turnover exceeds ₹20L (₹10L for special-category states), GST registration is mandatory.',
  regular: 'Regular Taxpayer: GST collected from customers is a pass-through liability, not your income. Your taxable business turnover = Gross Receipts minus GST Collected. Enter the total output GST collected below.',
  composition: 'Composition Scheme: GST is embedded in your turnover at a flat rate (0.5%–6% of turnover). Your business turnover = gross receipts as declared. No separate GST collected figure is needed — the composition levy is an allowable expense.',
};
function computeGstContextNote(status) {
  return GST_CONTEXT_MAP[status] || GST_CONTEXT_MAP.unregistered;
}

// ---- evaluateAmtCreditExpiry() ----
// NOTE: the original's origin-year regex was `/(d{4})/` (missing the `\`
// before `d`), which meant it could never match a real year and the
// expiry warning was permanently dead code. This port fixes that to
// `/(\d{4})/` so the feature actually works, and flags the fix here rather
// than silently reproducing a no-op.
function computeAmtExpiry(amtVal, originAyStr, today = new Date()) {
  const ayStr = (originAyStr || '').trim();
  if (!amtVal || amtVal <= 0 || !ayStr) return { show: false, text: '' };

  const match = ayStr.match(/(\d{4})/);
  if (!match) return { show: false, text: '' };

  const originYear = parseInt(match[1], 10);
  const currentAY = today.getFullYear() + (today.getMonth() >= 3 ? 1 : 0);
  const expiryYear = originYear + 15;
  const yearsToExpiry = expiryYear - currentAY;

  if (yearsToExpiry <= 0) {
    return {
      show: true,
      lapsed: true,
      text: `⚠ The AMT credit originating in AY${originYear}-${String(originYear + 1).slice(-2)} has LAPSED — the 15-year carry-forward window ended in AY${expiryYear}-${String(expiryYear + 1).slice(-2)}. This amount cannot be utilised.`,
    };
  }
  if (yearsToExpiry <= 2) {
    return {
      show: true,
      lapsed: false,
      text: `The oldest AMT credit (from AY${originYear}-${String(originYear + 1).slice(-2)}) expires in AY${expiryYear}-${String(expiryYear + 1).slice(-2)} — only ${yearsToExpiry} Tax Year${yearsToExpiry === 1 ? '' : 's'} remaining. Ensure this credit is fully utilised before it lapses.`,
    };
  }
  return { show: false, text: '' };
}

function deriveAll(rawContext) {
  const context = { ...rawContext };
  const { entries, presumptiveSchemeSynced } = runEligibilityCascade(context);
  const nextBI = { ...context.business_income, business_entries: entries, presumptive_scheme: presumptiveSchemeSynced };
  const nextContext = { ...context, business_income: nextBI };

  const visibility = computeVisibility(nextContext);
  const gstContextNote = computeGstContextNote(nextBI.gst_registration_status);
  const amtExpiry = nextContext.tax_regime === 'NEW' ? { show: false, text: '' } : computeAmtExpiry(nextBI.amt_credit_bf_inr, nextBI.amt_credit_bf_origin_ay);

  return { ...nextContext, ui: { visibility, gstContextNote, amtExpiry } };
}

export {
  parseINRCurrency,
  formatINRDisplay,
  defaultBusinessEntry,
  defaultPartnerFirm,
  defaultGoodsVehicle,
  applyGoodsVehicleUpdate,
  applyBusinessEntryUpdate,
  applyPartnerFirmUpdate,
  computeSchemeEligibility,
  computeEntrySchemeOptions,
  runEligibilityCascade,
  computeVisibility,
  computeGstContextNote,
  computeAmtExpiry,
  deriveAll,
};
