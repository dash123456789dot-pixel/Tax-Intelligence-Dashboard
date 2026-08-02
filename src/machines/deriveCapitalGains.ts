export function parseINRCurrency(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const stripped = val.toString().replace(/[^0-9.-]/g, '');
  if (stripped === '' || stripped === '-' || stripped === '.') return null;
  return parseInt(stripped, 10);
}

export function formatINRDisplay(numericValue: number | null | undefined): string {
  if (numericValue === null || numericValue === undefined || Number.isNaN(numericValue)) return '';
  const isNegative = numericValue < 0;
  const digits = Math.abs(numericValue);
  const formatted = Number(digits).toLocaleString('en-IN');
  return isNegative ? '-' + formatted : formatted;
}

export interface PropertyExemptionOption {
  value: string;
  label: string;
  indHufOnly: boolean;
}

const PROPERTY_EXEMPTION_OPTIONS: PropertyExemptionOption[] = [
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

export function computePropertyExemptionOptions(entityType: string): PropertyExemptionOption[] {
  const isIndOrHuf = entityType === 'individual' || entityType === 'huf';
  return PROPERTY_EXEMPTION_OPTIONS.filter((o) => !o.indHufOnly || isIndOrHuf);
}

export interface Improvement {
  id: string;
  improvement_date: string | null;
  improvement_cost_inr: number | null;
}

export interface PropertyTx {
  id: string;
  property_type: string;
  status: 'sold' | 'holding';
  acquisition_date: string | null;
  actual_cost: number | null;
  actual_cost_currency: string;
  pre_2001_fmv_inr: number | null;
  transfer_expenses_inr: number | null;
  sale_date: string | null;
  sale_consideration: number | null;
  sale_consideration_currency: string;
  stamp_duty_value: number | null;
  stamp_duty_value_currency: string;
  buyer_tan: string | null;
  buyer_tds_deducted_inr: number | null;
  buyer_tds_challan_number: string | null;
  is_joint_property: boolean;
  ownership_percentage: number | null;
  is_inherited: boolean;
  original_owner_acquisition_date: string | null;
  original_owner_cost: number | null;
  original_owner_cost_currency: string;
  cg_exemption_section: string | null;
  cg_exempt_invest_amount: number | null;
  cg_exempt_invest_date: string | null;
  cg_deposited_in_cgas: boolean;
  improvements: Improvement[];
  address: string | null;
  pincode: string | null;
}

export function defaultProperty(id: string): PropertyTx {
  return {
    id,
    property_type: 'residential',
    status: 'sold',
    acquisition_date: null,
    actual_cost: null,
    actual_cost_currency: 'INR',
    pre_2001_fmv_inr: null,
    transfer_expenses_inr: null,
    sale_date: null,
    sale_consideration: null,
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
    address: null,
    pincode: null,
  };
}

export function defaultImprovement(id: string): Improvement {
  return { id, improvement_date: null, improvement_cost_inr: null };
}

export interface BuybackTx {
  id: string;
  company_name: string;
  isin: string | null;
  is_listed: boolean;
  is_promoter: boolean;
  buyback_date: string | null;
  tender_or_open_market: 'tender' | 'open_market';
  shares_tendered: number | null;
  consideration_received_inr: number | null;
  original_cost_inr: number | null;
  original_acquisition_date: string | null;
}

export function defaultBuyback(id: string): BuybackTx {
  return {
    id,
    company_name: '',
    isin: null,
    is_listed: true,
    is_promoter: false,
    buyback_date: null,
    tender_or_open_market: 'tender',
    shares_tendered: null,
    consideration_received_inr: null,
    original_cost_inr: null,
    original_acquisition_date: null,
  };
}

export interface FinancialTx {
  id: string;
  asset_class: string;
  asset_name_or_ticker: string | null;
  isin: string | null;
  quantity: number | null;
  status: 'sold' | 'holding';
  acquisition_date: string | null;
  purchase_value: number | null;
  purchase_currency: string;
  fmv_31jan2018_per_unit_inr: number | null;
  sale_date: string | null;
  sale_value: number | null;
  sale_currency: string;
  stt_paid: boolean;
  transfer_expenses: number | null;
  nri_exit_type: string;
  is_specified_foreign_exchange_asset: boolean;
  investment_income_this_year: number | null;
}

export function defaultFinancialTx(id: string): FinancialTx {
  return {
    id,
    asset_class: 'listed_equity',
    asset_name_or_ticker: null,
    isin: null,
    quantity: null,
    status: 'sold',
    acquisition_date: null,
    purchase_value: null,
    purchase_currency: 'INR',
    fmv_31jan2018_per_unit_inr: null,
    sale_date: null,
    sale_value: null,
    sale_currency: 'INR',
    stt_paid: true,
    transfer_expenses: null,
    nri_exit_type: 'redeemed_at_maturity',
    is_specified_foreign_exchange_asset: false,
    investment_income_this_year: null,
  };
}

export interface CommodityTx {
  id: string;
  commodity_type: string;
  status: 'sold' | 'holding';
  quantity: number | null;
  acquisition_date: string | null;
  purchase_value: number | null;
  purchase_currency: string;
  is_maturity_redemption: boolean;
  sale_date: string | null;
  sale_value: number | null;
  sale_currency: string;
}

export function defaultCommodity(id: string): CommodityTx {
  return {
    id,
    commodity_type: 'physical_gold',
    status: 'sold',
    quantity: null,
    acquisition_date: null,
    purchase_value: null,
    purchase_currency: 'INR',
    is_maturity_redemption: false,
    sale_date: null,
    sale_value: null,
    sale_currency: 'INR',
  };
}

export interface UnlistedTx {
  id: string;
  company_name: string;
  linked_client_id: string | null;
  acquisition_date: string | null;
  cost_per_share: number | null;
  cost_per_share_currency: string;
  number_of_shares: number | null;
  sale_price_per_share: number | null;
  sale_price_per_share_currency: string;
  sale_date: string | null;
  fmv_valuation_report_date: string | null;
  original_investment_currency: string;
  original_cost_in_foreign_currency: number | null;
}

export function defaultUnlisted(id: string): UnlistedTx {
  return {
    id,
    company_name: '',
    linked_client_id: null,
    acquisition_date: null,
    cost_per_share: null,
    cost_per_share_currency: 'INR',
    number_of_shares: null,
    sale_price_per_share: null,
    sale_price_per_share_currency: 'INR',
    sale_date: null,
    fmv_valuation_report_date: null,
    original_investment_currency: 'INR',
    original_cost_in_foreign_currency: null,
  };
}

export interface PropertySaleOverride {
  effectiveSaleValue: number | null;
  show50cWarning: boolean;
}

export function computePropertySaleOverride(property: PropertyTx): PropertySaleOverride {
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

export interface PropertyVisibility {
  showSaleOnlyFields: boolean;
  showPre2001Fmv: boolean;
  showInheritFields: boolean;
  showStandardPurchaseFields: boolean;
  showJointFields: boolean;
  showBuyerTds: boolean;
  show50cWarning: boolean;
  showReinvestmentDiv: boolean;
}

export function computePropertyVisibility(property: PropertyTx, context: any): PropertyVisibility {
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

export interface BuybackDerived {
  buyback_pre_or_post_oct2024: string;
  deemed_dividend_inr: number;
  capital_loss_inr: number;
  capital_gain_or_loss: number;
  gain_classification: string | null;
}

export function computeBuybackDerived(buyback: BuybackTx): BuybackDerived {
  const bDate = buyback.buyback_date;
  const recd = buyback.consideration_received_inr;
  const cost = buyback.original_cost_inr;
  const isListed = buyback.is_listed;

  let era = 'pre_oct2024';
  let deemed_dividend_inr = 0;
  let capital_loss_inr = 0;
  let capital_gain_or_loss = 0;
  let gain_classification: string | null = null;

  if (bDate) {
    const bDateObj = new Date(bDate);
    if (bDateObj >= new Date('2026-04-01')) {
      era = 'capital_gains_era';
      capital_gain_or_loss = (recd || 0) - (cost || 0);
      if (buyback.original_acquisition_date) {
        const acqDateObj = new Date(buyback.original_acquisition_date);
        const diffDays = Math.ceil(Math.abs(bDateObj.getTime() - acqDateObj.getTime()) / (1000 * 60 * 60 * 24));
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

const NRI_EXIT_ASSET_CLASSES = ['nri_specified_debenture', 'nri_specified_govt_security'];
const SFEA_ASSET_CLASSES = ['listed_equity', 'nri_specified_debenture', 'nri_specified_company_deposit', 'nri_specified_govt_security'];
const GRANDFATHERING_ASSET_CLASSES = ['listed_equity', 'equity_mutual_fund'];

export interface FinancialVisibility {
  showSaleInfo: boolean;
  showGrandfatheringFmv: boolean;
  showNriExitType: boolean;
  showSfea: boolean;
  showSfeaInvestmentIncome: boolean;
}

export function computeFinancialVisibility(tx: FinancialTx): FinancialVisibility {
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

export interface CommodityVisibility {
  showSaleFields: boolean;
  showSgbMaturityToggle: boolean;
}

export function computeCommodityVisibility(commodity: CommodityTx): CommodityVisibility {
  const isHolding = commodity.status === 'holding';
  return {
    showSaleFields: !isHolding,
    showSgbMaturityToggle: commodity.commodity_type === 'sovereign_gold_bond_original' && !isHolding,
  };
}

export interface UnlistedVisibility {
  showNrFields: boolean;
  showOrigCostField: boolean;
}

export function computeUnlistedVisibility(unlisted: UnlistedTx, context: any): UnlistedVisibility {
  const isNR = context.final_india_residency_status === 'NR';
  return {
    showNrFields: isNR,
    showOrigCostField: isNR && unlisted.original_investment_currency !== 'INR',
  };
}

export interface CapitalGainsUI {
  visibility: {
    divCgSection: boolean;
    propertyExemptionOptions: PropertyExemptionOption[];
    properties: PropertyVisibility[];
    financials: FinancialVisibility[];
    commodities: CommodityVisibility[];
    unlisted: UnlistedVisibility[];
  };
  buybackDerived: BuybackDerived[];
  propertyOverrides: PropertySaleOverride[];
}

export function computeVisibility(context: any) {
  return {
    divCgSection: !!context.cg_section_gate_open,
    propertyExemptionOptions: computePropertyExemptionOptions(context.entity_type),
    properties: context.property.properties.map((p: any) => computePropertyVisibility(p, context)),
    financials: context.financial_holdings.transactions.map((tx: any) => computeFinancialVisibility(tx)),
    commodities: context.commodities.transactions.map((c: any) => computeCommodityVisibility(c)),
    unlisted: context.unlisted_equity.transactions.map((u: any) => computeUnlistedVisibility(u, context)),
  };
}

export function deriveAll(rawContext: any): any {
  const context = { ...rawContext };
  const buybackDerived = context.share_buyback.transactions.map((b: any) => computeBuybackDerived(b));
  const propertyOverrides = context.property.properties.map((p: any) => computePropertySaleOverride(p));
  const visibility = computeVisibility(context);
  return { ...context, ui: { visibility, buybackDerived, propertyOverrides } };
}
