import { setup, assign } from 'xstate';
import {
  deriveAll,
  defaultProperty,
  defaultBuyback,
  defaultFinancialTx,
  defaultCommodity,
  defaultUnlisted,
  defaultImprovement,
  parseINRCurrency,
  PropertyTx,
  BuybackTx,
  FinancialTx,
  CommodityTx,
  UnlistedTx,
  CapitalGainsUI,
} from './deriveCapitalGains';

export interface CapitalGainsContext {
  entity_type: string;
  final_india_residency_status: string;
  has_capital_gains: boolean;

  cg_section_gate_open: boolean;

  property: {
    has_indian_property_transaction: boolean;
    properties: PropertyTx[];
  };

  share_buyback: {
    has_buyback_transaction: boolean;
    transactions: BuybackTx[];
  };

  financial_holdings: {
    has_financial_transactions: boolean;
    active_tab: string;
    transactions: FinancialTx[];
  };

  commodities: {
    has_commodity_transactions: boolean;
    transactions: CommodityTx[];
  };

  unlisted_equity: {
    has_unlisted_equity_transaction: boolean;
    transactions: UnlistedTx[];
  };

  ui: CapitalGainsUI | Record<string, never>;
}

export const initialCapitalGainsContext: CapitalGainsContext = {
  entity_type: 'individual',
  final_india_residency_status: 'ROR',
  has_capital_gains: false,

  cg_section_gate_open: false,

  property: {
    has_indian_property_transaction: false,
    properties: [],
  },

  share_buyback: {
    has_buyback_transaction: false,
    transactions: [],
  },

  financial_holdings: {
    has_financial_transactions: false,
    active_tab: 'upload',
    transactions: [],
  },

  commodities: {
    has_commodity_transactions: false,
    transactions: [],
  },

  unlisted_equity: {
    has_unlisted_equity_transaction: false,
    transactions: [],
  },

  ui: {},
};

function recompute({ context }: { context: CapitalGainsContext }): CapitalGainsContext {
  return deriveAll(context);
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const capitalGainsMachine = setup({
  types: {
    context: {} as CapitalGainsContext,
    events: {} as
      | { type: 'SET_ENTITY_TYPE'; value: string }
      | { type: 'SET_RESIDENCY_STATUS'; value: string }
      | { type: 'SET_HAS_CAPITAL_GAINS'; value: boolean }
      | { type: 'TOGGLE_CG_SECTION'; value: boolean | string }
      | { type: 'TOGGLE_PROPERTY_MODULE'; value: boolean | string }
      | { type: 'ADD_PROPERTY' }
      | { type: 'REMOVE_PROPERTY'; index: number }
      | { type: 'UPDATE_PROPERTY'; index: number; field: keyof PropertyTx; value: any }
      | { type: 'ADD_IMPROVEMENT'; index: number }
      | { type: 'REMOVE_IMPROVEMENT'; index: number; impIndex: number }
      | { type: 'UPDATE_IMPROVEMENT'; index: number; impIndex: number; field: string; value: any }
      | { type: 'TOGGLE_BUYBACK_MODULE'; value: boolean | string }
      | { type: 'ADD_BUYBACK' }
      | { type: 'REMOVE_BUYBACK'; index: number }
      | { type: 'UPDATE_BUYBACK'; index: number; field: keyof BuybackTx; value: any }
      | { type: 'TOGGLE_FINANCIAL_MODULE'; value: boolean | string }
      | { type: 'SWITCH_FIN_TAB'; value: string }
      | { type: 'ADD_FINANCIAL_TX' }
      | { type: 'REMOVE_FINANCIAL_TX'; index: number }
      | { type: 'UPDATE_FINANCIAL_TX'; index: number; field: keyof FinancialTx; value: any }
      | { type: 'TOGGLE_COMMODITY_MODULE'; value: boolean | string }
      | { type: 'ADD_COMMODITY' }
      | { type: 'REMOVE_COMMODITY'; index: number }
      | { type: 'UPDATE_COMMODITY'; index: number; field: keyof CommodityTx; value: any }
      | { type: 'TOGGLE_UNLISTED_MODULE'; value: boolean | string }
      | { type: 'ADD_UNLISTED' }
      | { type: 'REMOVE_UNLISTED'; index: number }
      | { type: 'UPDATE_UNLISTED'; index: number; field: keyof UnlistedTx; value: any }
      | { type: 'HYDRATE'; value: Partial<CapitalGainsContext> },
  },
  actions: { recomputeDerived: assign(recompute) },
}).createMachine({
  id: 'capitalGainsStep',
  context: ({ input }) => deriveAll({ ...initialCapitalGainsContext, ...(input || {}) }),
  initial: 'ready',
  states: {
    ready: {
      on: {
        SET_ENTITY_TYPE: { actions: [assign(({ context, event }) => ({ ...context, entity_type: event.value })), 'recomputeDerived'] },
        SET_RESIDENCY_STATUS: { actions: [assign(({ context, event }) => ({ ...context, final_india_residency_status: event.value })), 'recomputeDerived'] },
        SET_HAS_CAPITAL_GAINS: { actions: [assign(({ context, event }) => ({ ...context, has_capital_gains: !!event.value })), 'recomputeDerived'] },

        TOGGLE_CG_SECTION: {
          actions: [
            assign(({ context, event }) => {
              const open = event.value === true || event.value === 'true';
              if (open) return { ...context, cg_section_gate_open: true };
              return {
                ...context,
                cg_section_gate_open: false,
                property: { has_indian_property_transaction: false, properties: [] },
              };
            }),
            'recomputeDerived',
          ],
        },

        // ═══ PROPERTY ═══
        TOGGLE_PROPERTY_MODULE: {
          actions: [
            assign(({ context, event }) => {
              const val = event.value === true || event.value === 'true';
              const props = context.property.properties;
              return {
                ...context,
                property: {
                  has_indian_property_transaction: val,
                  properties: val && props.length === 0 ? [defaultProperty(generateId())] : val ? props : [],
                },
              };
            }),
            'recomputeDerived',
          ],
        },
        ADD_PROPERTY: {
          actions: [assign(({ context }) => ({ ...context, property: { ...context.property, properties: [...context.property.properties, defaultProperty(generateId())] } })), 'recomputeDerived'],
        },
        REMOVE_PROPERTY: {
          actions: [assign(({ context, event }) => ({ ...context, property: { ...context.property, properties: context.property.properties.filter((_, i) => i !== event.index) } })), 'recomputeDerived'],
        },
        UPDATE_PROPERTY: {
          actions: [
            assign(({ context, event }) => {
              const numFields = ['actual_cost', 'pre_2001_fmv_inr', 'transfer_expenses_inr', 'sale_consideration', 'stamp_duty_value', 'buyer_tds_deducted_inr', 'ownership_percentage', 'original_owner_cost', 'cg_exempt_invest_amount'];
              const value = numFields.includes(event.field as string) ? parseINRCurrency(event.value) : event.value;
              return {
                ...context,
                property: {
                  ...context.property,
                  properties: context.property.properties.map((p, i) => (i === event.index ? { ...p, [event.field]: value } : p)),
                },
              };
            }),
            'recomputeDerived',
          ],
        },
        ADD_IMPROVEMENT: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              property: {
                ...context.property,
                properties: context.property.properties.map((p, i) => (i === event.index ? { ...p, improvements: [...p.improvements, defaultImprovement(generateId())] } : p)),
              },
            })),
            'recomputeDerived',
          ],
        },
        REMOVE_IMPROVEMENT: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              property: {
                ...context.property,
                properties: context.property.properties.map((p, i) => (i === event.index ? { ...p, improvements: p.improvements.filter((_, j) => j !== event.impIndex) } : p)),
              },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_IMPROVEMENT: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              property: {
                ...context.property,
                properties: context.property.properties.map((p, i) => {
                  if (i !== event.index) return p;
                  const improvements = p.improvements.map((imp, j) =>
                    j === event.impIndex ? { ...imp, [event.field]: event.field === 'improvement_cost_inr' ? parseINRCurrency(event.value) : event.value } : imp
                  );
                  return { ...p, improvements };
                }),
              },
            })),
            'recomputeDerived',
          ],
        },

        // ═══ SHARE BUYBACKS ═══
        TOGGLE_BUYBACK_MODULE: {
          actions: [
            assign(({ context, event }) => {
              const val = event.value === true || event.value === 'true';
              const txs = context.share_buyback.transactions;
              return { ...context, share_buyback: { has_buyback_transaction: val, transactions: val && txs.length === 0 ? [defaultBuyback(generateId())] : val ? txs : [] } };
            }),
            'recomputeDerived',
          ],
        },
        ADD_BUYBACK: {
          actions: [assign(({ context }) => ({ ...context, share_buyback: { ...context.share_buyback, transactions: [...context.share_buyback.transactions, defaultBuyback(generateId())] } })), 'recomputeDerived'],
        },
        REMOVE_BUYBACK: {
          actions: [assign(({ context, event }) => ({ ...context, share_buyback: { ...context.share_buyback, transactions: context.share_buyback.transactions.filter((_, i) => i !== event.index) } })), 'recomputeDerived'],
        },
        UPDATE_BUYBACK: {
          actions: [
            assign(({ context, event }) => {
              const numFields = ['shares_tendered', 'consideration_received_inr', 'original_cost_inr'];
              const boolFields = ['is_listed', 'is_promoter'];
              let value = event.value;
              if (numFields.includes(event.field as string)) value = event.field === 'shares_tendered' ? parseInt(value, 10) || null : parseINRCurrency(value);
              else if (boolFields.includes(event.field as string)) value = value === 'yes' || value === true;
              return {
                ...context,
                share_buyback: {
                  ...context.share_buyback,
                  transactions: context.share_buyback.transactions.map((b, i) => (i === event.index ? { ...b, [event.field]: value } : b)),
                },
              };
            }),
            'recomputeDerived',
          ],
        },

        // ═══ FINANCIAL HOLDINGS (Stocks/Crypto) ═══
        TOGGLE_FINANCIAL_MODULE: {
          actions: [
            assign(({ context, event }) => {
              const val = event.value === true || event.value === 'true';
              const txs = context.financial_holdings.transactions;
              return { ...context, financial_holdings: { ...context.financial_holdings, has_financial_transactions: val, transactions: val && txs.length === 0 ? [defaultFinancialTx(generateId())] : val ? txs : [] } };
            }),
            'recomputeDerived',
          ],
        },
        SWITCH_FIN_TAB: {
          actions: [assign(({ context, event }) => ({ ...context, financial_holdings: { ...context.financial_holdings, active_tab: event.value } })), 'recomputeDerived'],
        },
        ADD_FINANCIAL_TX: {
          actions: [assign(({ context }) => ({ ...context, financial_holdings: { ...context.financial_holdings, transactions: [...context.financial_holdings.transactions, defaultFinancialTx(generateId())] } })), 'recomputeDerived'],
        },
        REMOVE_FINANCIAL_TX: {
          actions: [assign(({ context, event }) => ({ ...context, financial_holdings: { ...context.financial_holdings, transactions: context.financial_holdings.transactions.filter((_, i) => i !== event.index) } })), 'recomputeDerived'],
        },
        UPDATE_FINANCIAL_TX: {
          actions: [
            assign(({ context, event }) => {
              const numFields = ['quantity', 'purchase_value', 'fmv_31jan2018_per_unit_inr', 'sale_value', 'transfer_expenses', 'investment_income_this_year'];
              let value = event.value;
              if (numFields.includes(event.field as string)) value = parseINRCurrency(value);
              else if (event.field === 'stt_paid') value = value === 'true' || value === true;
              else if (event.field === 'is_specified_foreign_exchange_asset') value = !!value;
              return {
                ...context,
                financial_holdings: {
                  ...context.financial_holdings,
                  transactions: context.financial_holdings.transactions.map((tx, i) => {
                    if (i !== event.index) return tx;
                    let next = { ...tx, [event.field]: value };
                    
                    if (event.field === 'status' && value === 'holding') {
                      next = { ...next, sale_date: null, sale_value: null, stt_paid: true, transfer_expenses: null };
                    }
                    
                    if (event.field === 'acquisition_date' || event.field === 'asset_class') {
                      const isGrandfatherable = ['listed_equity', 'equity_mutual_fund'].includes(next.asset_class);
                      const isPre2018 = !!(next.acquisition_date && new Date(next.acquisition_date) < new Date('2018-02-01'));
                      if (!(isGrandfatherable && isPre2018)) next.fmv_31jan2018_per_unit_inr = null;
                    }
                    if (event.field === 'asset_class' && !['listed_equity', 'nri_specified_debenture', 'nri_specified_company_deposit', 'nri_specified_govt_security'].includes(value as string)) {
                      next.is_specified_foreign_exchange_asset = false;
                      next.investment_income_this_year = null;
                    }
                    if (event.field === 'is_specified_foreign_exchange_asset' && !value) {
                      next.investment_income_this_year = null;
                    }
                    return next;
                  }),
                },
              };
            }),
            'recomputeDerived',
          ],
        },

        // ═══ COMMODITIES (Gold/SGB) ═══
        TOGGLE_COMMODITY_MODULE: {
          actions: [
            assign(({ context, event }) => {
              const val = event.value === true || event.value === 'true';
              const txs = context.commodities.transactions;
              return { ...context, commodities: { has_commodity_transactions: val, transactions: val && txs.length === 0 ? [defaultCommodity(generateId())] : val ? txs : [] } };
            }),
            'recomputeDerived',
          ],
        },
        ADD_COMMODITY: {
          actions: [assign(({ context }) => ({ ...context, commodities: { ...context.commodities, transactions: [...context.commodities.transactions, defaultCommodity(generateId())] } })), 'recomputeDerived'],
        },
        REMOVE_COMMODITY: {
          actions: [assign(({ context, event }) => ({ ...context, commodities: { ...context.commodities, transactions: context.commodities.transactions.filter((_, i) => i !== event.index) } })), 'recomputeDerived'],
        },
        UPDATE_COMMODITY: {
          actions: [
            assign(({ context, event }) => {
              const numFields = ['quantity', 'purchase_value', 'sale_value'];
              let value = event.value;
              if (numFields.includes(event.field as string)) value = parseINRCurrency(value);
              else if (event.field === 'is_maturity_redemption') value = !!value;
              return {
                ...context,
                commodities: {
                  ...context.commodities,
                  transactions: context.commodities.transactions.map((c, i) => {
                    if (i !== event.index) return c;
                    let next = { ...c, [event.field]: value };
                    
                    if (event.field === 'commodity_type' || event.field === 'status') {
                      const eligible = next.commodity_type === 'sovereign_gold_bond_original' && next.status === 'sold';
                      if (!eligible) next.is_maturity_redemption = false;
                    }
                    if (event.field === 'status' && value === 'holding') {
                      next = { ...next, sale_date: null, sale_value: null };
                    }
                    return next;
                  }),
                },
              };
            }),
            'recomputeDerived',
          ],
        },

        // ═══ UNLISTED EQUITY ═══
        TOGGLE_UNLISTED_MODULE: {
          actions: [
            assign(({ context, event }) => {
              const val = event.value === true || event.value === 'true';
              const txs = context.unlisted_equity.transactions;
              return { ...context, unlisted_equity: { has_unlisted_equity_transaction: val, transactions: val && txs.length === 0 ? [defaultUnlisted(generateId())] : val ? txs : [] } };
            }),
            'recomputeDerived',
          ],
        },
        ADD_UNLISTED: {
          actions: [assign(({ context }) => ({ ...context, unlisted_equity: { ...context.unlisted_equity, transactions: [...context.unlisted_equity.transactions, defaultUnlisted(generateId())] } })), 'recomputeDerived'],
        },
        REMOVE_UNLISTED: {
          actions: [assign(({ context, event }) => ({ ...context, unlisted_equity: { ...context.unlisted_equity, transactions: context.unlisted_equity.transactions.filter((_, i) => i !== event.index) } })), 'recomputeDerived'],
        },
        UPDATE_UNLISTED: {
          actions: [
            assign(({ context, event }) => {
              const numFields = ['cost_per_share', 'number_of_shares', 'sale_price_per_share', 'original_cost_in_foreign_currency'];
              const value = numFields.includes(event.field as string) ? parseINRCurrency(event.value) : event.value;
              return {
                ...context,
                unlisted_equity: {
                  ...context.unlisted_equity,
                  transactions: context.unlisted_equity.transactions.map((u, i) => {
                    if (i !== event.index) return u;
                    const next = { ...u, [event.field]: value };
                    
                    if (event.field === 'original_investment_currency' && value === 'INR') next.original_cost_in_foreign_currency = null;
                    return next;
                  }),
                },
              };
            }),
            'recomputeDerived',
          ],
        },

        HYDRATE: { actions: [assign(({ context, event }) => ({ ...context, ...event.value })), 'recomputeDerived'] },
      },
    },
  },
});
