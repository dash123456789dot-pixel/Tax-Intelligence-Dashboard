// ────────────────────────────────────────────────────────────────────────
// foreignAssetsMachine.ts
// XState v5 machine for "Screen 2J — Foreign Assets (Schedule FA & FSI)"
// ────────────────────────────────────────────────────────────────────────

import { setup, assign } from 'xstate';
import {
  deriveAll,
  defaultFaRow,
  applyCategoryChange,
  applyStatusChange,
  applyDtaaToggle,
  parseINRCurrency,
} from './deriveForeignAssets';

export const initialForeignAssetsContext = {
  final_india_residency_status: 'ROR', // 'ROR' | 'RNOR' | 'NR'
  setup_international: false,

  foreign_assets: {
    has_foreign_assets: null,
    assets: [] as any[],
  },

  lrs_outbound: {
    total_lrs_remitted_this_fy_inr: null,
    lrs_purpose: null,
    has_received_foreign_income: null,
  },

  ui: {} as any,
};

function recompute({ context }: any) {
  return deriveAll(context);
}

export const foreignAssetsMachine = setup({
  types: { context: {} as any, events: {} as any },
  actions: { recomputeDerived: assign(recompute) },
}).createMachine({
  id: 'foreignAssetsStep',
  context: ({ input }: any) => {
    const inputCtx = (input as any) || {};
    return deriveAll({ ...initialForeignAssetsContext, ...inputCtx });
  },
  initial: 'ready',
  states: {
    ready: {
      on: {
        SET_RESIDENCY_STATUS: {
          actions: [assign(({ context, event }: any) => ({ ...context, final_india_residency_status: event.value })), 'recomputeDerived'],
        },
        SET_SETUP_INTERNATIONAL: {
          actions: [assign(({ context, event }: any) => ({ ...context, setup_international: !!event.value })), 'recomputeDerived'],
        },
        TOGGLE_FOREIGN_ASSETS: {
          actions: [
            assign(({ context, event }: any) => {
              const hasAssets = event.value;
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
        TOGGLE_RECEIVED_FOREIGN_INCOME: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, lrs_outbound: { ...context.lrs_outbound, has_received_foreign_income: event.value } })),
            'recomputeDerived',
          ],
        },
        UPDATE_LRS_TOTAL: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              lrs_outbound: { ...context.lrs_outbound, total_lrs_remitted_this_fy_inr: event.value === '' ? null : parseINRCurrency(event.value) },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_LRS_PURPOSE: {
          actions: [assign(({ context, event }: any) => ({ ...context, lrs_outbound: { ...context.lrs_outbound, lrs_purpose: event.value || null } })), 'recomputeDerived'],
        },
        ADD_FA_ROW: {
          actions: [assign(({ context }: any) => ({ ...context, foreign_assets: { ...context.foreign_assets, assets: [...context.foreign_assets.assets, defaultFaRow()] } })), 'recomputeDerived'],
        },
        REMOVE_FA_ROW: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, foreign_assets: { ...context.foreign_assets, assets: context.foreign_assets.assets.filter((_: any, i: number) => i !== event.index) } })),
            'recomputeDerived',
          ],
        },
        UPDATE_FA_FIELD: {
          actions: [
            assign(({ context, event }: any) => {
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
                  assets: context.foreign_assets.assets.map((row: any, i: number) => (i === event.index ? { ...row, [event.field]: value } : row)),
                },
              };
            }),
            'recomputeDerived',
          ],
        },
        UPDATE_FA_CATEGORY: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              foreign_assets: {
                ...context.foreign_assets,
                assets: context.foreign_assets.assets.map((row: any, i: number) => (i === event.index ? applyCategoryChange(row, event.value) : row)),
              },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_FA_STATUS: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              foreign_assets: {
                ...context.foreign_assets,
                assets: context.foreign_assets.assets.map((row: any, i: number) => (i === event.index ? applyStatusChange(row, event.value) : row)),
              },
            })),
            'recomputeDerived',
          ],
        },
        TOGGLE_FA_DTAA: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              foreign_assets: {
                ...context.foreign_assets,
                assets: context.foreign_assets.assets.map((row: any, i: number) => (i === event.index ? applyDtaaToggle(row, !!event.value) : row)),
              },
            })),
            'recomputeDerived',
          ],
        },
      },
    },
  },
});
