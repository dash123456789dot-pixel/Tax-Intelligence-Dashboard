// ────────────────────────────────────────────────────────────────────────
// capitalGainsMachine.js
// XState v5 machine for "Screen 2H — Capital Gains" (panel-step-cg in
// layer1_india.html), covering five independent sub-modules: Property,
// Share Buybacks, Financial Holdings (Stocks/Crypto), Commodities
// (Gold/SGB), and Unlisted Equity.
//
// ── CROSS-STEP DEPENDENCIES ─────────────────────────────────────────────
//   context.entity_type                   <- Step 1 (Financial Life Snapshot)
//   context.final_india_residency_status  <- Step 2 (Residency Solver)
//   context.has_capital_gains             <- Step 1 dashboard (`#setup-cg`) — see below
//
// `final_india_residency_status === 'NR'` unlocks: Property "Buyer TDS"
// fields (Section 195), and Unlisted Equity's FEMA/foreign-currency fields.
// `entity_type` (individual/HUF vs everything else) restricts 4 of the 8
// property capital-gains reinvestment exemptions to Individuals/HUFs.
//
// ── THE DISCONNECTED MASTER GATE (a real quirk in the source) ───────────
// The original has TWO independent "is capital gains relevant" switches
// that never talk to each other:
//   1. `#setup-cg` — a dashboard checkbox on the Financial Life Snapshot
//      step. It sets `state.capital_gains.has_capital_gains` and decides
//      whether the CG step even appears in the sidebar/wizard flow.
//   2. `#cg-has` (`toggleCGSection()`) — the toggle INSIDE this step. It
//      only ever flips the local `div-cg-section` DOM visibility and never
//      writes to `state.capital_gains.has_capital_gains` at all.
// This machine keeps them exactly as disconnected as the original:
// `has_capital_gains` is injected, read-only, informational context (it
// would gate whether a parent wizard routes to this step); the step's own
// visible toggle is `cg_section_gate_open`, a purely local switch with no
// side effect on `has_capital_gains`. Don't "fix" this wiring — it's
// faithfully reproducing a real (if odd) characteristic of the source.
// ────────────────────────────────────────────────────────────────────────

import { setup, assign } from 'xstate';
import {
  deriveAll,
  defaultProperty,
  defaultImprovement,
  defaultBuyback,
  defaultFinancialTx,
  defaultCommodity,
  defaultUnlisted,
  parseINRCurrency,
} from './deriveCapitalGains.js';

export const initialCapitalGainsContext = {
  // ── injected (read-only from this step's point of view) ──
  entity_type: 'individual',
  final_india_residency_status: 'ROR',
  has_capital_gains: false, // Step 1 dashboard flag — see module doc comment; NOT the same as cg_section_gate_open

  // ── local, UI-only master switch (id="cg-has" / toggleCGSection) ──
  cg_section_gate_open: false,

  // ── Immovable Property Sales (state.property) ──
  property: {
    has_indian_property_transaction: false, // visible: prop-has <select>
    properties: [], // visible: dynamic list (+ Add Property). Schema per row: see defaultProperty() in deriveCapitalGains.js
  },

  // ── Share Buybacks (state.share_buyback) ──
  share_buyback: {
    has_buyback_transaction: false, // visible: bb-has <select>
    transactions: [], // visible: dynamic list (+ Add Buyback). Schema per row: see defaultBuyback()
  },

  // ── Stocks and Crypto Trading (state.financial_holdings) ──
  financial_holdings: {
    has_financial_transactions: false, // visible: fin-has <select>
    active_tab: 'upload', // visible (UI-only): 'upload' | 'api' | 'manual' — switchFinTab()
    transactions: [], // visible (in the 'manual' tab): dynamic list (+ Add CG Entry / + Add Asset Transaction). Schema per row: see defaultFinancialTx()
  },

  // ── Physical Gold & Sovereign Gold Bonds (state.commodities) ──
  commodities: {
    has_commodity_transactions: false, // visible: com-has <select>
    transactions: [], // visible: dynamic list (+ Add Transaction). Schema per row: see defaultCommodity()
  },

  // ── Private Company Share Transfers (state.unlisted_equity) ──
  unlisted_equity: {
    has_unlisted_equity_transaction: false, // visible: ul-has <select>
    transactions: [], // visible: dynamic list (+ Add Transfer). Schema per row: see defaultUnlisted()
  },

  ui: {}, // fully derived — see deriveCapitalGains.js -> deriveAll()
};

function recompute({ context }) {
  return deriveAll(context);
}

export const capitalGainsMachine = setup({
  types: { context: {}, events: {} },
  actions: { recomputeDerived: assign(recompute) },
}).createMachine({
  id: 'capitalGainsStep',
  context: ({ input }) => deriveAll({ ...initialCapitalGainsContext, ...(input || {}) }),
  initial: 'ready',
  states: {
    ready: {
      on: {
        // ── injected cross-step setters ──
        SET_ENTITY_TYPE: { actions: [assign(({ context, event }) => ({ ...context, entity_type: event.value })), 'recomputeDerived'] },
        SET_RESIDENCY_STATUS: { actions: [assign(({ context, event }) => ({ ...context, final_india_residency_status: event.value })), 'recomputeDerived'] },
        SET_HAS_CAPITAL_GAINS: { actions: [assign(({ context, event }) => ({ ...context, has_capital_gains: !!event.value })), 'recomputeDerived'] },

        // toggleCGSection(show) — local-only; deliberately does NOT touch has_capital_gains.
        // On close, mirrors the original's (partially dead-code) reset: only the
        // Property module actually gets reset in the source (the other four
        // reset calls reference ids that don't exist in the current markup and
        // are no-ops there) — reproduced faithfully here.
        TOGGLE_CG_SECTION: {
          actions: [
            assign(({ context, event }) => {
              const open = !!event.value;
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
                  properties: val && props.length === 0 ? [defaultProperty()] : val ? props : [],
                },
              };
            }),
            'recomputeDerived',
          ],
        },
        ADD_PROPERTY: {
          actions: [assign(({ context }) => ({ ...context, property: { ...context.property, properties: [...context.property.properties, defaultProperty()] } })), 'recomputeDerived'],
        },
        REMOVE_PROPERTY: {
          actions: [assign(({ context, event }) => ({ ...context, property: { ...context.property, properties: context.property.properties.filter((_, i) => i !== event.index) } })), 'recomputeDerived'],
        },
        UPDATE_PROPERTY: {
          actions: [
            assign(({ context, event }) => {
              const numFields = ['actual_cost', 'pre_2001_fmv_inr', 'transfer_expenses_inr', 'sale_consideration', 'stamp_duty_value', 'buyer_tds_deducted_inr', 'ownership_percentage', 'original_owner_cost', 'cg_exempt_invest_amount'];
              const value = numFields.includes(event.field) ? parseINRCurrency(event.value) : event.value;
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
                properties: context.property.properties.map((p, i) => (i === event.index ? { ...p, improvements: [...p.improvements, defaultImprovement()] } : p)),
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
              return { ...context, share_buyback: { has_buyback_transaction: val, transactions: val && txs.length === 0 ? [defaultBuyback()] : val ? txs : [] } };
            }),
            'recomputeDerived',
          ],
        },
        ADD_BUYBACK: {
          actions: [assign(({ context }) => ({ ...context, share_buyback: { ...context.share_buyback, transactions: [...context.share_buyback.transactions, defaultBuyback()] } })), 'recomputeDerived'],
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
              if (numFields.includes(event.field)) value = event.field === 'shares_tendered' ? parseInt(value, 10) || null : parseINRCurrency(value);
              else if (boolFields.includes(event.field)) value = value === 'yes' || value === true;
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
              return { ...context, financial_holdings: { ...context.financial_holdings, has_financial_transactions: val, transactions: val && txs.length === 0 ? [defaultFinancialTx()] : val ? txs : [] } };
            }),
            'recomputeDerived',
          ],
        },
        SWITCH_FIN_TAB: {
          actions: [assign(({ context, event }) => ({ ...context, financial_holdings: { ...context.financial_holdings, active_tab: event.value } })), 'recomputeDerived'],
        },
        ADD_FINANCIAL_TX: {
          actions: [assign(({ context }) => ({ ...context, financial_holdings: { ...context.financial_holdings, transactions: [...context.financial_holdings.transactions, defaultFinancialTx()] } })), 'recomputeDerived'],
        },
        REMOVE_FINANCIAL_TX: {
          actions: [assign(({ context, event }) => ({ ...context, financial_holdings: { ...context.financial_holdings, transactions: context.financial_holdings.transactions.filter((_, i) => i !== event.index) } })), 'recomputeDerived'],
        },
        UPDATE_FINANCIAL_TX: {
          actions: [
            assign(({ context, event }) => {
              const numFields = ['quantity', 'purchase_value', 'fmv_31jan2018_per_unit_inr', 'sale_value', 'transfer_expenses', 'investment_income_this_year'];
              let value = event.value;
              if (numFields.includes(event.field)) value = parseINRCurrency(value);
              else if (event.field === 'stt_paid') value = value === 'true' || value === true;
              else if (event.field === 'is_specified_foreign_exchange_asset') value = !!value;
              return {
                ...context,
                financial_holdings: {
                  ...context.financial_holdings,
                  transactions: context.financial_holdings.transactions.map((tx, i) => {
                    if (i !== event.index) return tx;
                    let next = { ...tx, [event.field]: value };
                    // toggleFinancialFields(): switching to "holding" clears sale-side fields
                    if (event.field === 'status' && value === 'holding') {
                      next = { ...next, sale_date: null, sale_value: null, stt_paid: true, transfer_expenses: null };
                    }
                    // fin-fmv-div auto-clear when it becomes hidden (acq date / asset class change)
                    if (event.field === 'acquisition_date' || event.field === 'asset_class') {
                      const isGrandfatherable = ['listed_equity', 'equity_mutual_fund'].includes(next.asset_class);
                      const isPre2018 = !!(next.acquisition_date && new Date(next.acquisition_date) < new Date('2018-02-01'));
                      if (!(isGrandfatherable && isPre2018)) next.fmv_31jan2018_per_unit_inr = null;
                    }
                    if (event.field === 'asset_class' && !['listed_equity', 'nri_specified_debenture', 'nri_specified_company_deposit', 'nri_specified_govt_security'].includes(value)) {
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
              return { ...context, commodities: { has_commodity_transactions: val, transactions: val && txs.length === 0 ? [defaultCommodity()] : val ? txs : [] } };
            }),
            'recomputeDerived',
          ],
        },
        ADD_COMMODITY: {
          actions: [assign(({ context }) => ({ ...context, commodities: { ...context.commodities, transactions: [...context.commodities.transactions, defaultCommodity()] } })), 'recomputeDerived'],
        },
        REMOVE_COMMODITY: {
          actions: [assign(({ context, event }) => ({ ...context, commodities: { ...context.commodities, transactions: context.commodities.transactions.filter((_, i) => i !== event.index) } })), 'recomputeDerived'],
        },
        UPDATE_COMMODITY: {
          actions: [
            assign(({ context, event }) => {
              const numFields = ['quantity', 'purchase_value', 'sale_value'];
              let value = event.value;
              if (numFields.includes(event.field)) value = parseINRCurrency(value);
              else if (event.field === 'is_maturity_redemption') value = !!value;
              return {
                ...context,
                commodities: {
                  ...context.commodities,
                  transactions: context.commodities.transactions.map((c, i) => {
                    if (i !== event.index) return c;
                    let next = { ...c, [event.field]: value };
                    // SGB maturity toggle only meaningful for sovereign_gold_bond_original + sold
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
              return { ...context, unlisted_equity: { has_unlisted_equity_transaction: val, transactions: val && txs.length === 0 ? [defaultUnlisted()] : val ? txs : [] } };
            }),
            'recomputeDerived',
          ],
        },
        ADD_UNLISTED: {
          actions: [assign(({ context }) => ({ ...context, unlisted_equity: { ...context.unlisted_equity, transactions: [...context.unlisted_equity.transactions, defaultUnlisted()] } })), 'recomputeDerived'],
        },
        REMOVE_UNLISTED: {
          actions: [assign(({ context, event }) => ({ ...context, unlisted_equity: { ...context.unlisted_equity, transactions: context.unlisted_equity.transactions.filter((_, i) => i !== event.index) } })), 'recomputeDerived'],
        },
        UPDATE_UNLISTED: {
          actions: [
            assign(({ context, event }) => {
              const numFields = ['cost_per_share', 'number_of_shares', 'sale_price_per_share', 'original_cost_in_foreign_currency'];
              const value = numFields.includes(event.field) ? parseINRCurrency(event.value) : event.value;
              return {
                ...context,
                unlisted_equity: {
                  ...context.unlisted_equity,
                  transactions: context.unlisted_equity.transactions.map((u, i) => {
                    if (i !== event.index) return u;
                    let next = { ...u, [event.field]: value };
                    // toggleUnlistedCurrency(): switching orig currency back to INR clears the FX cost field
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
