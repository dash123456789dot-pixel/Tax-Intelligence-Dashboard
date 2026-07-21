// ────────────────────────────────────────────────────────────────────────
// deriveCapitalGains.js
// Pure, DOM-free port of the Capital Gains step logic in layer1_india.html:
// toggleCGSection(), togglePropertyModule()/togglePropertyDependencies()/
// syncPropertyState() (incl. the Section 50C stamp-duty-value override),
// toggleBuybackModule()/syncBuybackState() (incl. the pre/post-Oct-2024
// buyback tax-treatment computation), toggleFinancialModule()/
// toggleFinancialFields()/syncFinancialState(), toggleCommodityModule()/
// toggleCommodityTypeDependencies()/syncCommodityState(), and
// toggleUnlistedModule()/evaluateUnlistedNRStatus()/toggleUnlistedCurrency()/
// syncUnlistedState(). No DOM reads/writes anywhere in this file.
//
// ── CROSS-STEP DEPENDENCY ────────────────────────────────────────────────
// This step reads ONE field it does not own:
//   final_india_residency_status ('ROR' | 'RNOR' | 'NR') <- Step 2: Residency Solver
// It gates three things, all sourced from the original's direct reads of
// `state.residency_detail.final_india_residency_status`:
//   1. Property rows: Buyer TDS fields (buyer_tan / buyer_tds_deducted_inr /
//      buyer_tds_challan_number) only apply to NRIs (Section 195 TDS).
//   2. Unlisted-equity rows: FEMA/foreign-currency fields (fmv_valuation_
//      report_date / original_investment_currency / original_cost_in_
//      foreign_currency) only apply to NR sellers.
//   3. Property exemption options: four of the eight reinvestment
//      exemptions are restricted to Individuals/HUFs (entity_type,
//      injected from Step 1: Financial Life Snapshot).
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

// ---- Property exemption option set (prop-cg-exemption), with the
// Individual/HUF-only restriction ported from the `cg-opt-ind-only` class
// gate in evaluateEntityOverrides(). ----
const PROPERTY_EXEMPTION_OPTIONS = [
  { value: '', label: 'None (Pay Full Tax)', indHufOnly: false },
  { value: 'Reinvestment in Residential House', label: 'Reinvestment in Residential House (Res. House to Res. House)', indHufOnly: true },
  { value: 'Reinvestment (Agri Land to Agri Land)', label: 'Reinvestment (Agri Land to Agri Land)', indHufOnly: true },
  { value: 'Reinvestment (Compulsory Acq. of Industrial Land)', label: 'Reinvestment (Compulsory Acq. of Industrial Land)', indHufOnly: false },
  { value: 'Reinvestment (Invest in NHAI or REC Bonds - Max ₹50L)', label: 'Reinvestment (Invest in NHAI/REC Bonds - Max ₹50L)', indHufOnly: false },
  { value: 'Reinvestment (Invest in Specified Startup Fund)', label: 'Reinvestment (Invest in Specified Startup Fund)', indHufOnly: false },
  { value: 'Reinvestment (Any Asset to Res. House)', label: 'Reinvestment (Any Asset to Res. House)', indHufOnly: true },
  { value: 'Reinvestment (Shifting Industrial Undertaking)', label: 'Reinvestment (Shifting Industrial Undertaking)', indHufOnly: false },
  { value: 'Reinvestment (Shifting to SEZ)', label: 'Reinvestment (Shifting to SEZ)', indHufOnly: false },
  { value: 'Reinvestment (Res. Property to Startup Equity)', label: 'Reinvestment (Res. Property to Startup Equity)', indHufOnly: true },
];

function computePropertyExemptionOptions(entityType) {
  const isIndOrHuf = entityType === 'individual' || entityType === 'huf';
  return PROPERTY_EXEMPTION_OPTIONS.filter((o) => !o.indHufOnly || isIndOrHuf);
}

// ---- factories ----
function defaultProperty() {
  return {
    property_type: 'residential',
    status: 'sold', // 'sold' | 'holding' — UI-only radio, folded into derived nulls below like the original
    acquisition_date: null,
    actual_cost: null,
    actual_cost_currency: 'INR',
    pre_2001_fmv_inr: null,
    transfer_expenses_inr: null,
    sale_date: null,
    sale_consideration: null, // the value the person typed — see computePropertySaleOverride for the 50C-adjusted figure
    sale_consideration_currency: 'INR',
    stamp_duty_value: null,
    stamp_duty_value_currency: 'INR',
    buyer_tan: null,
    buyer_tds_deducted_inr: null,
    buyer_tds_challan_number: null,
    is_joint_property: false,
    ownership_percentage: null,
    is_inherited: false,
    original_owner_acquisition_date: null,
    original_owner_cost: null,
    original_owner_cost_currency: 'INR',
    cg_exemption_section: null,
    cg_exempt_invest_amount: null,
    cg_exempt_invest_date: null,
    cg_deposited_in_cgas: false,
    improvements: [],
    // hidden: prop-address / prop-pincode are rendered controls in the original
    // markup but are never read by syncPropertyState() — they were dead/
    // unwired inputs in the source. Kept here for shape-completeness but not
    // persisted to any derived output, matching that behavior exactly.
    address: null,
    pincode: null,
  };
}

function defaultImprovement() {
  return { improvement_date: null, improvement_cost_inr: 0 };
}

function defaultBuyback() {
  return {
    company_name: '',
    isin: null,
    is_listed: true, // bb-listed default 'yes'
    is_promoter: false, // bb-promoter default 'no'
    buyback_date: null,
    tender_or_open_market: 'tender',
    shares_tendered: null,
    consideration_received_inr: null,
    original_cost_inr: null,
    original_acquisition_date: null,
  };
}

function defaultFinancialTx() {
  return {
    asset_class: 'listed_equity',
    asset_name_or_ticker: null,
    isin: null, // hidden: no control exists for this in the original either — always null
    quantity: null,
    status: 'sold', // 'sold' | 'holding'
    acquisition_date: null,
    purchase_value: null,
    purchase_currency: 'INR',
    fmv_31jan2018_per_unit_inr: null,
    sale_date: null,
    sale_value: null,
    sale_currency: 'INR',
    stt_paid: true,
    transfer_expenses: null,
    nri_exit_type: 'redeemed_at_maturity', // visible only for NRI-specified-debenture/govt-security classes
    is_specified_foreign_exchange_asset: false,
    investment_income_this_year: null, // visible only when is_specified_foreign_exchange_asset is true
  };
}

function defaultCommodity() {
  return {
    commodity_type: 'physical_gold',
    status: 'sold', // 'sold' | 'holding'
    quantity: null,
    acquisition_date: null,
    purchase_value: null,
    purchase_currency: 'INR',
    is_maturity_redemption: false, // only meaningful for sovereign_gold_bond_original + sold
    sale_date: null,
    sale_value: null,
    sale_currency: 'INR',
  };
}

function defaultUnlisted() {
  return {
    company_name: '',
    acquisition_date: null,
    cost_per_share: null,
    cost_per_share_currency: 'INR',
    number_of_shares: null,
    sale_price_per_share: null,
    sale_price_per_share_currency: 'INR',
    sale_date: null,
    fmv_valuation_report_date: null, // visible only for NR sellers
    original_investment_currency: 'INR', // visible only for NR sellers
    original_cost_in_foreign_currency: null, // visible only for NR sellers AND original_investment_currency !== 'INR'
  };
}

// ---- Section 50C: if Stamp Duty Value exceeds Sale Consideration by more
// than 10%, SDV is deemed the sale consideration. Ported from
// syncPropertyState()'s dataset.originalVal dance — here it's just a pure
// computed "effective" sale value plus a warning flag, leaving the
// person's typed value untouched in context. ----
function computePropertySaleOverride(property) {
  if (property.status === 'holding') return { effectiveSaleValue: null, show50cWarning: false };
  const saleVal = property.sale_consideration || 0;
  const sdv = property.stamp_duty_value || 0;
  const isInr = property.sale_consideration_currency === 'INR';
  const triggers50C = isInr && saleVal > 0 && sdv > saleVal * 1.1;
  return {
    effectiveSaleValue: triggers50C ? sdv : property.sale_consideration,
    show50cWarning: triggers50C,
  };
}

// ---- Property row visibility (togglePropertyDependencies) ----
function computePropertyVisibility(property, context) {
  const isHolding = property.status === 'holding';
  const isNR = context.final_india_residency_status === 'NR';
  const showPre2001 = !!(property.acquisition_date && new Date(property.acquisition_date) < new Date('2001-04-01'));
  const { show50cWarning } = computePropertySaleOverride(property);
  return {
    showSaleOnlyFields: !isHolding,
    showPre2001Fmv: showPre2001,
    showInheritFields: property.is_inherited,
    showStandardPurchaseFields: !property.is_inherited,
    showJointFields: property.is_joint_property,
    showBuyerTds: !isHolding && isNR,
    show50cWarning,
    showReinvestmentDiv: !isHolding && !!property.cg_exemption_section,
  };
}

// ---- Buyback tax-treatment computation (syncBuybackState) ----
function computeBuybackDerived(buyback) {
  const bDate = buyback.buyback_date;
  const recd = buyback.consideration_received_inr;
  const cost = buyback.original_cost_inr;
  const isListed = buyback.is_listed;

  let era = 'pre_oct2024';
  let deemed_dividend_inr = 0;
  let capital_loss_inr = 0;
  let capital_gain_or_loss = 0;
  let gain_classification = null;

  if (bDate) {
    const bDateObj = new Date(bDate);
    if (bDateObj >= new Date('2026-04-01')) {
      era = 'capital_gains_era';
      capital_gain_or_loss = (recd || 0) - (cost || 0);
      if (buyback.original_acquisition_date) {
        const acqDateObj = new Date(buyback.original_acquisition_date);
        const diffDays = Math.ceil(Math.abs(bDateObj - acqDateObj) / (1000 * 60 * 60 * 24));
        const monthsHeld = diffDays / 30.436875;
        const ltThreshold = isListed ? 12 : 24;
        const isLongTerm = monthsHeld > ltThreshold;
        gain_classification = isLongTerm ? 'ltcg' : isListed ? 'stcg' : 'stcg_slab';
      }
    } else if (bDateObj >= new Date('2024-10-01')) {
      era = 'post_oct2024';
      deemed_dividend_inr = recd || 0;
      capital_loss_inr = cost || 0;
    }
  }

  return { buyback_pre_or_post_oct2024: era, deemed_dividend_inr, capital_loss_inr, capital_gain_or_loss, gain_classification };
}

// ---- Financial-holding row visibility (toggleFinancialFields + the
// fin-class/fin-acq dependency listener) ----
const NRI_EXIT_ASSET_CLASSES = ['nri_specified_debenture', 'nri_specified_govt_security'];
const SFEA_ASSET_CLASSES = ['listed_equity', 'nri_specified_debenture', 'nri_specified_company_deposit', 'nri_specified_govt_security'];
const GRANDFATHERING_ASSET_CLASSES = ['listed_equity', 'equity_mutual_fund'];

function computeFinancialVisibility(tx) {
  const isSold = tx.status === 'sold';
  const showGrandfatheringFmv = !!(tx.acquisition_date && new Date(tx.acquisition_date) < new Date('2018-02-01') && GRANDFATHERING_ASSET_CLASSES.includes(tx.asset_class));
  const showNriExitType = NRI_EXIT_ASSET_CLASSES.includes(tx.asset_class);
  const showSfea = SFEA_ASSET_CLASSES.includes(tx.asset_class);
  return {
    showSaleInfo: isSold,
    showGrandfatheringFmv,
    showNriExitType,
    showSfea,
    showSfeaInvestmentIncome: showSfea && tx.is_specified_foreign_exchange_asset,
  };
}

// ---- Commodity row visibility (toggleCommodityTypeDependencies) ----
function computeCommodityVisibility(commodity) {
  const isHolding = commodity.status === 'holding';
  return {
    showSaleFields: !isHolding,
    showSgbMaturityToggle: commodity.commodity_type === 'sovereign_gold_bond_original' && !isHolding,
  };
}

// ---- Unlisted-equity row visibility (evaluateUnlistedNRStatus + toggleUnlistedCurrency) ----
function computeUnlistedVisibility(unlisted, context) {
  const isNR = context.final_india_residency_status === 'NR';
  return {
    showNrFields: isNR,
    showOrigCostField: isNR && unlisted.original_investment_currency !== 'INR',
  };
}

// ---- top-level visibility ----
// NOTE on the master gate: in the original, the `cg-has` checkbox inside
// THIS step (toggleCGSection()) only ever toggles the local `div-cg-section`
// DOM visibility — it never writes to any state field. The *actual*
// `state.capital_gains.has_capital_gains` flag is set elsewhere entirely,
// by a checkbox on the Financial Life Snapshot step's dashboard
// (`updateSidebarVisibility()`'s `#setup-cg` -> controls whether this whole
// step even appears in the wizard sidebar). The two are genuinely
// disconnected in the source. This port keeps them disconnected too:
// `cg_section_gate_open` is the local, UI-only switch this component owns;
// `has_capital_gains` is injected read-only context representing the
// Step-1 dashboard flag that decided whether to route to this step at all.
function computeVisibility(context) {
  return {
    divCgSection: !!context.cg_section_gate_open,
    propertyExemptionOptions: computePropertyExemptionOptions(context.entity_type),
    properties: context.property.properties.map((p) => computePropertyVisibility(p, context)),
    financials: context.financial_holdings.transactions.map((tx) => computeFinancialVisibility(tx)),
    commodities: context.commodities.transactions.map((c) => computeCommodityVisibility(c)),
    unlisted: context.unlisted_equity.transactions.map((u) => computeUnlistedVisibility(u, context)),
  };
}

function deriveAll(rawContext) {
  const context = { ...rawContext };
  const buybackDerived = context.share_buyback.transactions.map((b) => computeBuybackDerived(b));
  const propertyOverrides = context.property.properties.map((p) => computePropertySaleOverride(p));
  const visibility = computeVisibility(context);
  return { ...context, ui: { visibility, buybackDerived, propertyOverrides } };
}

export {
  parseINRCurrency,
  formatINRDisplay,
  defaultProperty,
  defaultImprovement,
  defaultBuyback,
  defaultFinancialTx,
  defaultCommodity,
  defaultUnlisted,
  computePropertyExemptionOptions,
  computePropertySaleOverride,
  computePropertyVisibility,
  computeBuybackDerived,
  computeFinancialVisibility,
  computeCommodityVisibility,
  computeUnlistedVisibility,
  computeVisibility,
  deriveAll,
};
