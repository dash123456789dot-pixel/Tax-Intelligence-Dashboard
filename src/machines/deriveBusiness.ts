// ────────────────────────────────────────────────────────────────────────
// deriveBusiness.ts
// Pure, DOM-free port of the Business & Profession step logic
// ────────────────────────────────────────────────────────────────────────

export interface BusinessEntry {
  business_name: string;
  nature: 'small_business' | 'professional' | 'regular_business' | 'goods_transport';
  presumptive_scheme: 's44AD' | 's44ADA' | 's44AE' | 's44BB' | 's44BBB' | null;
  business_code: string | null;
  profession_type: string | null;
  turnover_inr: number | null;
  digital_receipts_inr: number | null;
  cash_receipts_inr: number | null;
  ada_digital_receipts_inr: number | null;
  ada_cash_receipts_inr: number | null;
  gross_receipts_inr: number | null;
  branches: any[];
}

export interface PartnerFirm {
  firm_name: string;
  entity_type: 'registered_firm' | 'llp';
  remuneration_from_entity_inr: number | null;
  interest_on_capital_from_entity_inr: number | null;
  profit_share_exempt_inr: number | null;
}

export interface GoodsVehicle {
  vehicle_type: 'light' | 'heavy' | null;
  gvw_tonnes: number | null;
  months_owned: number | null;
}

export interface BusinessIncomeDetails {
  has_business_or_fo_income: boolean;
  nature_of_business: string[];
  business_entries: BusinessEntry[];
  business_code: string | null;
  profession_type: string | null;
  gross_receipts_inr: number | null;
  s44AD_last_exit_ay: string | null;
  s44AD_opted_current_year: boolean;
  goods_vehicles: GoodsVehicle[];
  speculative_income_inr: number | null;
  speculative_turnover_inr: number | null;
  non_speculative_income_inr: number | null;
  fno_turnover_inr: number | null;
  s41_remission_income_inr: number | null;
  s41_bad_debt_recovery_inr: number | null;
  partner_firms: PartnerFirm[];
  gst_registration_status: 'unregistered' | 'regular' | 'composition';
  gst_collected_inr: number | null;
  specified_business_s35AD_inr: number | null;
  amt_credit_bf_inr: number | null;
  amt_credit_bf_origin_ay: string | null;
  presumptive_scheme: string[];
  expenses?: any;
  asset_blocks?: any[];
  msme_payables?: any[];
  partner_remuneration_s40b_inr?: number | null;
  s44bbb_receipts_inr?: number | null;
  tonnage_tax_115V_inr?: number | null;
  nr_ineligible_presumptive?: boolean;
}

export interface BusinessContext {
  tax_regime: string;
  entity_type: string;
  is_indian_company: boolean | null;
  final_india_residency_status: string;
  is_section_8: boolean;
  business_income: BusinessIncomeDetails;
  ui?: {
    visibility: {
      divBusinessContainer: boolean;
      divProfSection8: boolean;
      divSpecialCorporateBiz: boolean;
      divS35adPipeline: boolean;
      divFnoIncome: boolean;
      divIntradayIncome: boolean;
      divPartnerIncome: boolean;
      divBusinessEntries: boolean;
      divBizCodeContainer: boolean;
      divPresS44ad: boolean;
      divPresS44ae: boolean;
      divGeneralGrossReceipts: boolean;
      divProfessionType: boolean;
      divTradingExpenses: boolean;
      divExpenseSection: boolean;
      accExpensesDimmed: boolean;
      notePartnerExpenses: boolean;
      warnPresNri: boolean;
      warnPresS44adIneligible: string | null;
      warnPresS44adaIneligible: string | null;
      warnS44aeLimit: boolean;
      entryOptions: Array<{ options: Array<{ value: string; label: string }>; ineligibleReason: string | null }>;
      amtRegimeLocked: boolean;
    };
    gstContextNote: string;
    amtExpiry: { show: boolean; text: string; lapsed?: boolean };
  };
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

export function defaultBusinessEntry(natureOfBusiness?: string[]): BusinessEntry {
  const natures = natureOfBusiness || [];
  let defaultNature: BusinessEntry['nature'] = 'small_business';
  if (natures.includes('goods_transport') && !natures.includes('own_business') && !natures.includes('professional')) {
    defaultNature = 'goods_transport';
  }
  return {
    business_name: '',
    nature: defaultNature,
    presumptive_scheme: null,
    business_code: null,
    profession_type: null,
    turnover_inr: null,
    digital_receipts_inr: null,
    cash_receipts_inr: null,
    ada_digital_receipts_inr: null,
    ada_cash_receipts_inr: null,
    gross_receipts_inr: null,
    branches: [],
  };
}

export function defaultPartnerFirm(): PartnerFirm {
  return {
    firm_name: '',
    entity_type: 'registered_firm',
    remuneration_from_entity_inr: null,
    interest_on_capital_from_entity_inr: null,
    profit_share_exempt_inr: null,
  };
}

export function defaultGoodsVehicle(): GoodsVehicle {
  return { vehicle_type: null, gvw_tonnes: null, months_owned: null };
}

export function applyGoodsVehicleUpdate(vehicle: GoodsVehicle, field: string, value: any): GoodsVehicle {
  if (field === 'vehicle_type') {
    const next = { ...vehicle, vehicle_type: value } as GoodsVehicle;
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

const ENTRY_NUM_FIELDS = ['turnover_inr', 'digital_receipts_inr', 'cash_receipts_inr', 'ada_digital_receipts_inr', 'ada_cash_receipts_inr', 'gross_receipts_inr'];
export function applyBusinessEntryUpdate(entry: BusinessEntry, field: string, val: any): BusinessEntry {
  if (ENTRY_NUM_FIELDS.includes(field)) {
    return { ...entry, [field]: val === '' ? null : parseINRCurrency(val) } as BusinessEntry;
  }
  return { ...entry, [field]: val || null } as BusinessEntry;
}

const FIRM_NUM_FIELDS = ['remuneration_from_entity_inr', 'interest_on_capital_from_entity_inr', 'profit_share_exempt_inr'];
export function applyPartnerFirmUpdate(firm: PartnerFirm, field: string, val: any): PartnerFirm {
  if (FIRM_NUM_FIELDS.includes(field)) {
    return { ...firm, [field]: val === '' ? null : parseINRCurrency(val) } as PartnerFirm;
  }
  return { ...firm, [field]: val || null } as PartnerFirm;
}

export function computeSchemeEligibility(context: Omit<BusinessContext, 'ui'>) {
  const ror = context.final_india_residency_status === 'ROR';
  const entity = context.entity_type;
  const eligible44AD = ror && !['llp', 'company', 'aop', 'trust', 'local', 'coop', 'ajp'].includes(entity);
  const eligible44ADA = eligible44AD && entity !== 'huf';
  const isForeignCo = entity === 'company' && context.is_indian_company === false;
  const isNR = context.final_india_residency_status === 'NR';
  return { ror, entity, eligible44AD, eligible44ADA, isForeignCo, isNR };
}

export function computeEntrySchemeOptions(entry: BusinessEntry, elig: ReturnType<typeof computeSchemeEligibility>) {
  const { eligible44AD, eligible44ADA, isForeignCo, isNR, ror, entity } = elig;
  const isSmall = entry.nature === 'small_business';
  const isProf = entry.nature === 'professional';
  const isTransport = entry.nature === 'goods_transport';

  let options: Array<{ value: string; label: string }> = [];
  let ineligibleReason: string | null = null;

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

export function validateS44AD(entries: BusinessEntry[], s44AD_last_exit_ay: string | null) {
  let ineligibleReason: string | null = null;
  let lockInActive = false;

  if (s44AD_last_exit_ay) {
    const match = s44AD_last_exit_ay.match(/(?:AY\s*)?(\d{4})(?:-\d{2,4})?/i);
    if (match) {
      const exitYear = parseInt(match[1], 10);
      const CURRENT_AY_START = 2024;
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
    if (entry.business_code && ineligibleCodes.includes(entry.business_code)) {
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

export function validateS44ADA(entries: BusinessEntry[]) {
  let ineligibleReason: string | null = null;
  const nextEntries = entries.map((entry) => {
    if (entry.presumptive_scheme !== 's44ADA') return entry;
    if (entry.profession_type === 'other') {
      ineligibleReason = 'Presumptive Taxation Scheme (Professionals) is available ONLY for notified professions per Rule 6F. "Other" must use regular computation.';
      return { ...entry, presumptive_scheme: null };
    }
    const dig = entry.ada_digital_receipts_inr || 0;
    const csh = entry.ada_cash_receipts_inr || 0;
    const total = dig + csh;
    let limit = 5000000;
    if (total > 0 && dig / total >= 0.95) limit = 7500000;
    if (total > limit) {
      ineligibleReason = `Total receipts (₹${(total / 100000).toFixed(2)}L) exceed the applicable Presumptive Taxation Scheme (Professionals) limit of ₹${limit / 100000}L. You must use regular computation.`;
      return { ...entry, presumptive_scheme: null };
    }
    return entry;
  });
  return { entries: nextEntries, warning: ineligibleReason };
}

export function validateS44AE(entries: BusinessEntry[], goodsVehicles: GoodsVehicle[]) {
  const hasS44AE = entries.some((e) => e.presumptive_scheme === 's44AE');
  if (hasS44AE && goodsVehicles.length > 10) {
    return {
      entries: entries.map((e) => (e.presumptive_scheme === 's44AE' ? { ...e, presumptive_scheme: null } : e)),
      overLimit: true,
    };
  }
  return { entries, overLimit: false };
}

export function validateS44BB(entries: BusinessEntry[], isNR: boolean) {
  if (isNR) return { entries, reverted: false };
  const reverted = entries.some((e) => e.presumptive_scheme === 's44BB');
  return { entries: entries.map((e) => (e.presumptive_scheme === 's44BB' ? { ...e, presumptive_scheme: null } : e)), reverted };
}

export function validateS44BBB(entries: BusinessEntry[], isForeignCo: boolean) {
  if (isForeignCo) return { reverted: false, entries };
  const reverted = entries.some((e) => e.presumptive_scheme === 's44BBB');
  return { entries: entries.map((e) => (e.presumptive_scheme === 's44BBB' ? { ...e, presumptive_scheme: null } : e)), reverted };
}

export function runEligibilityCascade(context: Omit<BusinessContext, 'ui'>) {
  const elig = computeSchemeEligibility(context);
  let entries = context.business_income.business_entries;
  const warnings = { s44ad: null as string | null, s44ada: null as string | null, s44aeOverLimit: false };

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

  const presumptiveSchemeSynced = [...new Set(entries.map((e) => e.presumptive_scheme).filter(Boolean))] as string[];

  return { entries, warnings, presumptiveSchemeSynced, elig };
}

export function computeVisibility(context: Omit<BusinessContext, 'ui'>) {
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

  const isCompany = context.entity_type === 'company';
  const isDomesticCompany = isCompany && context.is_indian_company === true;
  const isIndianCompanyForSpecialSchemes = isCompany && context.final_india_residency_status !== 'NR';

  return {
    divBusinessContainer: !!bi.has_business_or_fo_income,

    divProfSection8: isDomesticCompany,
    divSpecialCorporateBiz: isIndianCompanyForSpecialSchemes,
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

    entryOptions: entries.map((entry) => computeEntrySchemeOptions(entry, elig)),

    amtRegimeLocked: context.tax_regime === 'NEW',
  };
}

const GST_CONTEXT_MAP: Record<string, string> = {
  unregistered: 'Unregistered: Your business turnover equals gross receipts directly. No GST component to deduct. Note: if your aggregate turnover exceeds ₹20L (₹10L for special-category states), GST registration is mandatory.',
  regular: 'Regular Taxpayer: GST collected from customers is a pass-through liability, not your income. Your taxable business turnover = Gross Receipts minus GST Collected. Enter the total output GST collected below.',
  composition: 'Composition Scheme: GST is embedded in your turnover at a flat rate (0.5%–6% of turnover). Your business turnover = gross receipts as declared. No separate GST collected figure is needed — the composition levy is an allowable expense.',
};

export function computeGstContextNote(status: string): string {
  return GST_CONTEXT_MAP[status] || GST_CONTEXT_MAP.unregistered;
}

export function computeAmtExpiry(amtVal: number | null | undefined, originAyStr: string | null | undefined, today = new Date()) {
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

export function deriveAll(rawContext: Omit<BusinessContext, 'ui'> & { ui?: any }): BusinessContext {
  const context = { ...rawContext };
  const { entries, presumptiveSchemeSynced } = runEligibilityCascade(context);
  const nextBI = { ...context.business_income, business_entries: entries, presumptive_scheme: presumptiveSchemeSynced };
  const nextContext = { ...context, business_income: nextBI };

  const visibility = computeVisibility(nextContext);
  const gstContextNote = computeGstContextNote(nextBI.gst_registration_status);
  const amtExpiry = nextContext.tax_regime === 'NEW' ? { show: false, text: '' } : computeAmtExpiry(nextBI.amt_credit_bf_inr, nextBI.amt_credit_bf_origin_ay);

  return { ...nextContext, ui: { visibility, gstContextNote, amtExpiry } } as BusinessContext;
}
