// ────────────────────────────────────────────────────────────────────────
// foreignAssetsMachine.js
// XState v5 machine for "Screen 2J — Foreign Assets (Schedule FA & FSI)"
// (panel-step-fa in layer1_india.html), the ninth step in this project's
// wizard sequence.
//
// ── CROSS-STEP DEPENDENCIES ─────────────────────────────────────────────
//   context.final_india_residency_status <- Step 2 (Residency Solver)
//   context.setup_international          <- Step 1 (Financial Life
//        Snapshot's `#setup-international` dashboard checkbox)
// Confirmed directly in the source's `syncUnlockStatus()`:
//   isAllowed = (lock === 'ROR' || lock === 'RNOR') && isIntlChecked
// Per explicit instruction, this machine enforces exactly that combined
// gate — see deriveForeignAssets.js -> computeStepEligibility() and
// `context.ui.visibility.stepEligible`. Dispatch SET_RESIDENCY_STATUS /
// SET_SETUP_INTERNATIONAL whenever those upstream values change.
// ────────────────────────────────────────────────────────────────────────

import { setup, assign } from 'xstate';
import {
  deriveAll,
  defaultFaRow,
  applyCategoryChange,
  applyStatusChange,
  applyDtaaToggle,
  parseINRCurrency,
} from './deriveForeignAssets.js';

export const initialForeignAssetsContext = {
  // ── injected (owned by earlier steps) ──
  final_india_residency_status: 'ROR', // 'ROR' | 'RNOR' | 'NR'
  setup_international: false,           // Step 1 dashboard checkbox

  foreign_assets: {
    has_foreign_assets: null, // visible: btn-fa-yes / btn-fa-no (tri-state: true | false | null)
    assets: [],               // visible: dynamic fa-card list (+ Add Foreign Asset / Income). Schema per row: see defaultFaRow()
  },

  lrs_outbound: {
    total_lrs_remitted_this_fy_inr: null, // visible: lrs-total
    lrs_purpose: null,                     // visible: lrs-purpose
    has_received_foreign_income: null,     // visible: btn-fa-inc-yes / btn-fa-inc-no (tri-state)
  },

  ui: {}, // fully derived — see deriveForeignAssets.js -> deriveAll()
};

function recompute({ context }) {
  return deriveAll(context);
}

export const foreignAssetsMachine = setup({
  types: { context: {}, events: {} },
  actions: { recomputeDerived: assign(recompute) },
}).createMachine({
  id: 'foreignAssetsStep',
  context: ({ input }) => deriveAll({ ...initialForeignAssetsContext, ...(input || {}) }),
  initial: 'ready',
  states: {
    ready: {
      on: {
        // ── injected cross-step setters ──
        SET_RESIDENCY_STATUS: {
          actions: [assign(({ context, event }) => ({ ...context, final_india_residency_status: event.value })), 'recomputeDerived'],
        },
        SET_SETUP_INTERNATIONAL: {
          actions: [assign(({ context, event }) => ({ ...context, setup_international: !!event.value })), 'recomputeDerived'],
        },

        // toggleForeignAssets(hasAssets): tri-state; false/null both clear
        // the assets list and force-reset the income gate, exactly like
        // the original.
        TOGGLE_FOREIGN_ASSETS: {
          actions: [
            assign(({ context, event }) => {
              const hasAssets = event.value; // true | false | null
              if (hasAssets === true) {
                return { ...context, foreign_assets: { ...context.foreign_assets, has_foreign_assets: true } };
              }
              return {
                ...context,
                foreign_assets: { has_foreign_assets: hasAssets, assets: [] },
                lrs_outbound: { ...context.lrs_outbound, has_received_foreign_income: hasAssets === false ? false : null },
              };
            }),
            'recomputeDerived',
          ],
        },

        // toggleReceivedForeignIncome(hasIncome): tri-state
        TOGGLE_RECEIVED_FOREIGN_INCOME: {
          actions: [
            assign(({ context, event }) => ({ ...context, lrs_outbound: { ...context.lrs_outbound, has_received_foreign_income: event.value } })),
            'recomputeDerived',
          ],
        },

        // LRS aggregate fields
        UPDATE_LRS_TOTAL: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              lrs_outbound: { ...context.lrs_outbound, total_lrs_remitted_this_fy_inr: event.value === '' ? null : parseINRCurrency(event.value) },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_LRS_PURPOSE: {
          actions: [assign(({ context, event }) => ({ ...context, lrs_outbound: { ...context.lrs_outbound, lrs_purpose: event.value || null } })), 'recomputeDerived'],
        },

        // addFaRow() / removeFaRow(id)
        ADD_FA_ROW: {
          actions: [assign(({ context }) => ({ ...context, foreign_assets: { ...context.foreign_assets, assets: [...context.foreign_assets.assets, defaultFaRow()] } })), 'recomputeDerived'],
        },
        REMOVE_FA_ROW: {
          actions: [
            assign(({ context, event }) => ({ ...context, foreign_assets: { ...context.foreign_assets, assets: context.foreign_assets.assets.filter((_, i) => i !== event.index) } })),
            'recomputeDerived',
          ],
        },

        // Generic per-row field setter (country, institution_name,
        // account_id, ownership, date_acquired, initial_value,
        // peak_balance, closing_balance, gross_proceeds, head_of_income,
        // currency, income_foreign, tax_foreign, conversion_rate, tin,
        // dtaa_article)
        UPDATE_FA_FIELD: {
          actions: [
            assign(({ context, event }) => {
              const numFields = ['initial_value', 'peak_balance', 'closing_balance', 'gross_proceeds'];
              const floatFields = ['income_foreign', 'tax_foreign', 'conversion_rate'];
              let value = event.value;
              if (numFields.includes(event.field)) value = value === '' ? null : parseINRCurrency(value);
              else if (floatFields.includes(event.field)) value = value === '' ? null : parseFloat(value) || null;
              else if (event.field === 'country') value = (value || '').toUpperCase() || null;
              else value = value || null;
              return {
                ...context,
                foreign_assets: {
                  ...context.foreign_assets,
                  assets: context.foreign_assets.assets.map((row, i) => (i === event.index ? { ...row, [event.field]: value } : row)),
                },
              };
            }),
            'recomputeDerived',
          ],
        },

        // toggleFaCardType(id): category change + head_of_income side effect
        UPDATE_FA_CATEGORY: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              foreign_assets: {
                ...context.foreign_assets,
                assets: context.foreign_assets.assets.map((row, i) => (i === event.index ? applyCategoryChange(row, event.value) : row)),
              },
            })),
            'recomputeDerived',
          ],
        },

        // toggleFaStatus(id): holding/sold + gross_proceeds clear side effect
        UPDATE_FA_STATUS: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              foreign_assets: {
                ...context.foreign_assets,
                assets: context.foreign_assets.assets.map((row, i) => (i === event.index ? applyStatusChange(row, event.value) : row)),
              },
            })),
            'recomputeDerived',
          ],
        },

        // toggleFaDtaa(id, checked): claim toggle + tin/article clear side effect
        TOGGLE_FA_DTAA: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              foreign_assets: {
                ...context.foreign_assets,
                assets: context.foreign_assets.assets.map((row, i) => (i === event.index ? applyDtaaToggle(row, !!event.value) : row)),
              },
            })),
            'recomputeDerived',
          ],
        },

        HYDRATE: { actions: [assign(({ context, event }) => ({ ...context, ...event.value })), 'recomputeDerived'] },
      },
    },
  },
});
