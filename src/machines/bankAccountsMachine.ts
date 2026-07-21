// ────────────────────────────────────────────────────────────────────────
// bankAccountsMachine.ts
// XState v5 machine for "Screen 2D — Bank Accounts"
// ────────────────────────────────────────────────────────────────────────

import { setup, assign, raise } from 'xstate';
import { deriveAll, defaultBankRow, bankMockExtraction } from './deriveBankAccounts';

export const initialBankAccountsContext = {
  residency_lock: 'ROR', 
  entity_type: 'individual',

  bank_accounts: [] as any[],

  nro_repatriation_inputs: {
    cumulative_repatriated_usd_this_fy_raw: null,
    pending_repatriation_inr_raw: null,
    tds_deducted_on_nro_balance: false,
  },

  ui: {} as any,
};

function recompute({ context }: any) {
  return deriveAll(context);
}

export const bankAccountsMachine = setup({
  types: { context: {} as any, events: {} as any },
  actions: { recomputeDerived: assign(recompute) },
}).createMachine({
  id: 'bankAccountsStep',
  context: ({ input }: any) => deriveAll({ ...initialBankAccountsContext, ...(input || {}) }),
  initial: 'ready',
  states: {
    ready: {
      on: {
        SET_RESIDENCY_LOCK: {
          actions: [assign(({ context, event }: any) => ({ ...context, residency_lock: event.value })), 'recomputeDerived'],
        },
        SET_ENTITY_TYPE: {
          actions: [assign(({ context, event }: any) => ({ ...context, entity_type: event.value })), 'recomputeDerived'],
        },

        ADD_BANK_ROW: {
          actions: [assign(({ context }: any) => ({ ...context, bank_accounts: [...context.bank_accounts, defaultBankRow()] })), 'recomputeDerived'],
        },
        REMOVE_BANK_ROW: {
          actions: [assign(({ context, event }: any) => ({ ...context, bank_accounts: context.bank_accounts.filter((_: any, i: number) => i !== event.index) })), 'recomputeDerived'],
        },

        UPDATE_BANK_FIELD: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              bank_accounts: context.bank_accounts.map((row: any, i: number) => (i === event.index ? { ...row, [event.field]: event.value } : row)),
            })),
            'recomputeDerived',
          ],
        },

        UPDATE_BANK_TYPE: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              bank_accounts: context.bank_accounts.map((row: any, i: number) => (i === event.index ? { ...row, account_type: event.value } : row)),
            })),
            'recomputeDerived',
          ],
        },

        START_BANK_UPLOAD: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              bank_accounts: context.bank_accounts.map((row: any, i: number) => (i === event.index ? { ...row, _upload: 'scanning' } : row)),
            })),
            raise(({ event }: any) => ({ type: 'COMPLETE_BANK_UPLOAD', index: event.index }), { delay: 1500 }),
          ],
        },
        COMPLETE_BANK_UPLOAD: {
          actions: [
            assign(({ context, event }: any) => {
              const extraction = bankMockExtraction();
              return {
                ...context,
                bank_accounts: context.bank_accounts.map((row: any, i: number) =>
                  i === event.index ? { ...row, ...extraction, _upload: 'success' } : row
                ),
              };
            }),
            'recomputeDerived',
          ],
        },

        UPDATE_NRO_REPATRIATION: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              nro_repatriation_inputs: { ...context.nro_repatriation_inputs, [event.field]: event.value },
            })),
            'recomputeDerived',
          ],
        },
      },
    },
  },
});
