// ────────────────────────────────────────────────────────────────────────
// bankAccountsMachine.js
// XState v5 machine for "Screen 2D — Bank Accounts" (panel-step-bank in
// layer1_india.html), the eleventh step in this project's wizard
// sequence. Confirmed to have NO eligibility gate (always reachable) —
// see deriveBankAccounts.js's header comment for the full check against
// `syncUnlockStatus()`.
//
// ── CROSS-STEP INPUTS (navigation targets only, not visibility) ────────
//   context.residency_lock <- Step 2 (Residency Solver): resolves the
//        "← Back" button's target ('step-compliance' | 'step-fa' | 'step-profile')
//   context.entity_type    <- Step 1 (Financial Life Snapshot): resolves
//        the "Next Step →" button's target ('step-salary' | 'step-hp')
// Neither affects whether THIS step's own form is shown — only which
// step a parent wizard should navigate to next. See resolveBackTarget() /
// resolveNextTarget() in deriveBankAccounts.js.
// ────────────────────────────────────────────────────────────────────────

import { setup, assign, raise } from 'xstate';
import { deriveAll, defaultBankRow, bankMockExtraction } from './deriveBankAccounts.js';

export const initialBankAccountsContext = {
  // ── injected (navigation-routing only — see module header comment) ──
  residency_lock: 'ROR', // 'ROR' | 'RNOR' | 'NR'
  entity_type: 'individual',

  bank_accounts: [], // visible: dynamic list (+ Add Bank). Schema per row: see defaultBankRow() in deriveBankAccounts.js

  // NRO Repatriation Summary — visible (conditional: any row is NRO):
  // nro-repatriation-panel
  nro_repatriation_inputs: {
    cumulative_repatriated_usd_this_fy_raw: null, // visible: nro-repat-usd
    pending_repatriation_inr_raw: null,            // visible: nro-pending-inr
    tds_deducted_on_nro_balance: false,            // visible: nro-tds-deducted
  },

  ui: {}, // fully derived — see deriveBankAccounts.js -> deriveAll()
};

function recompute({ context }) {
  return deriveAll(context);
}

export const bankAccountsMachine = setup({
  types: { context: {}, events: {} },
  actions: { recomputeDerived: assign(recompute) },
}).createMachine({
  id: 'bankAccountsStep',
  context: ({ input }) => deriveAll({ ...initialBankAccountsContext, ...(input || {}) }),
  initial: 'ready',
  states: {
    ready: {
      on: {
        SET_RESIDENCY_LOCK: {
          actions: [assign(({ context, event }) => ({ ...context, residency_lock: event.value })), 'recomputeDerived'],
        },
        SET_ENTITY_TYPE: {
          actions: [assign(({ context, event }) => ({ ...context, entity_type: event.value })), 'recomputeDerived'],
        },

        ADD_BANK_ROW: {
          actions: [assign(({ context }) => ({ ...context, bank_accounts: [...context.bank_accounts, defaultBankRow()] })), 'recomputeDerived'],
        },
        REMOVE_BANK_ROW: {
          actions: [assign(({ context, event }) => ({ ...context, bank_accounts: context.bank_accounts.filter((_, i) => i !== event.index) })), 'recomputeDerived'],
        },

        UPDATE_BANK_FIELD: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              bank_accounts: context.bank_accounts.map((row, i) => (i === event.index ? { ...row, [event.field]: event.value } : row)),
            })),
            'recomputeDerived',
          ],
        },

        UPDATE_BANK_TYPE: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              bank_accounts: context.bank_accounts.map((row, i) => (i === event.index ? { ...row, account_type: event.value } : row)),
            })),
            'recomputeDerived',
          ],
        },

        START_BANK_UPLOAD: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              bank_accounts: context.bank_accounts.map((row, i) => (i === event.index ? { ...row, _upload: 'scanning' } : row)),
            })),
            raise(({ event }) => ({ type: 'COMPLETE_BANK_UPLOAD', index: event.index }), { delay: 1500 }),
          ],
        },
        COMPLETE_BANK_UPLOAD: {
          actions: [
            assign(({ context, event }) => {
              const extraction = bankMockExtraction();
              return {
                ...context,
                bank_accounts: context.bank_accounts.map((row, i) =>
                  i === event.index ? { ...row, ...extraction, _upload: 'success' } : row
                ),
              };
            }),
            'recomputeDerived',
          ],
        },

        UPDATE_NRO_REPATRIATION: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              nro_repatriation_inputs: { ...context.nro_repatriation_inputs, [event.field]: event.value },
            })),
            'recomputeDerived',
          ],
        },

        HYDRATE: { actions: [assign(({ context, event }) => ({ ...context, ...event.value })), 'recomputeDerived'] },
      },
    },
  },
});
