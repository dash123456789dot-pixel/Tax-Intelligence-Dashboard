// ────────────────────────────────────────────────────────────────────────
// dtaaMachine.ts
// XState v5 machine for "Screen 2B — Tax Treaties (DTAA)" (panel-step-dtaa
// in layer1_india.html), the eighth step in this project's wizard
// sequence (Snapshot -> Residency Solver -> Salary -> House Property ->
// Business -> Capital Gains -> Other Sources -> DTAA).
//
// ── CROSS-STEP DEPENDENCIES ─────────────────────────────────────────────
//   context.final_india_residency_status  <- Step 2 (Residency Solver)
//   context.days_in_india_current_year    <- Step 2 (Residency Solver)
//   context.dtaa.dtaa_treaty_residence /
//   context.dtaa.dtaa_forced_nr           <- Step 2 (Residency Solver's
//        Article-4 tie-breaker wizard). Read-only here — dispatch
//        SET_DTAA_TREATY_RESIDENCE whenever that wizard's outcome changes;
//        this step never writes those two fields itself.
//
// Per explicit instruction, this step is only considered reachable/visible
// when BOTH `final_india_residency_status === 'NR'` (the original's own
// rule) AND `days_in_india_current_year < 180` (the additional binding
// requested) hold — see deriveDtaa.ts -> computeStepEligibility().
// ────────────────────────────────────────────────────────────────────────

import { setup, assign } from 'xstate';
import { deriveAll, defaultElection, applyElectionUpdate, autoFillUSTreaty, computeIsUsResident } from './deriveDtaa';

export const initialDtaaContext = {
  // ── injected (owned by the Residency Solver step) ──
  final_india_residency_status: 'NR', // 'ROR' | 'RNOR' | 'NR'
  days_in_india_current_year: 200,     // raw day count — see the combined gate above

  dtaa: {
    tax_residency_country: null, // visible: dtaa-country <select>
    is_us_resident_for_dtaa: null, // hidden (readonly, derived): true only when tax_residency_country === 'US'
    dtaa_treaty_residence: 'none', // injected (Residency Solver's tie-breaker wizard): 'none' | 'india' | 'us'
    dtaa_forced_nr: false,         // injected (Residency Solver's tie-breaker wizard)
    trc_status: false,             // visible: dtaa-trc (Tax Residency Certificate toggle)
    has_permanent_establishment_in_india: false, // visible: dtaa-pe (Permanent Establishment toggle)
    treaty_elections: [],          // visible: dtaa-table dynamic rows (+ Add Stream / Auto-Fill US Rates)
    mfn_clause_invoked: false,     // hidden: present in schema, no rendered control anywhere in this step (reserved/dead field in the source)
  },

  // TRC upload sub-fields — NOTE: these write to state.compliance_docs.trc
  // in the original, NOT state.dtaa, even though they're rendered inside
  // this DTAA panel. Kept in that same (slightly surprising) location here
  // for fidelity to the source's actual data model.
  compliance_docs: {
    trc: {
      document_uploaded: false,   // visible (conditional: trc_status): file input
      validity_start_date: null, // visible (conditional): comp-trc-start
      validity_end_date: null,   // visible (conditional): comp-trc-end
    },
  },

  ui: {} as any, // fully derived — see deriveDtaa.ts -> deriveAll()
};

function recompute({ context }: any) {
  return deriveAll(context);
}

export const dtaaMachine = setup({
  types: { context: {} as any, events: {} as any },
  actions: { recomputeDerived: assign(recompute) },
}).createMachine({
  id: 'dtaaStep',
  context: ({ input }: any) => deriveAll({ 
    ...initialDtaaContext, 
    ...(input || {}),
    dtaa: { ...initialDtaaContext.dtaa, ...(input?.dtaa || {}) }
  }),
  initial: 'ready',
  states: {
    ready: {
      on: {
        SET_RESIDENCY_STATUS: {
          actions: [assign(({ context, event }: any) => ({ ...context, final_india_residency_status: event.value })), 'recomputeDerived'],
        },
        SET_DAYS_IN_INDIA: {
          actions: [assign(({ context, event }: any) => ({ ...context, days_in_india_current_year: event.value })), 'recomputeDerived'],
        },
        SET_DTAA_TREATY_RESIDENCE: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              dtaa: { ...context.dtaa, dtaa_treaty_residence: event.value, dtaa_forced_nr: event.value === 'us' },
            })),
            'recomputeDerived',
          ],
        },

        SET_TAX_RESIDENCY_COUNTRY: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              dtaa: {
                ...context.dtaa,
                tax_residency_country: event.value,
                is_us_resident_for_dtaa: computeIsUsResident(event.value),
              },
            })),
            'recomputeDerived',
          ],
        },

        TOGGLE_TRC_STATUS: {
          actions: [assign(({ context, event }: any) => ({ ...context, dtaa: { ...context.dtaa, trc_status: !!event.value } })), 'recomputeDerived'],
        },

        TOGGLE_PERMANENT_ESTABLISHMENT: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, dtaa: { ...context.dtaa, has_permanent_establishment_in_india: !!event.value } })),
            'recomputeDerived',
          ],
        },

        UPDATE_COMP_TRC: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              compliance_docs: { ...context.compliance_docs, trc: { ...context.compliance_docs.trc, [event.field]: event.value } },
            })),
            'recomputeDerived',
          ],
        },

        ADD_ELECTION: {
          actions: [
            assign(({ context }: any) => ({ ...context, dtaa: { ...context.dtaa, treaty_elections: [...context.dtaa.treaty_elections, defaultElection()] } })),
            'recomputeDerived',
          ],
        },
        REMOVE_ELECTION: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, dtaa: { ...context.dtaa, treaty_elections: context.dtaa.treaty_elections.filter((_: any, i: number) => i !== event.index) } })),
            'recomputeDerived',
          ],
        },
        UPDATE_ELECTION: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              dtaa: {
                ...context.dtaa,
                treaty_elections: context.dtaa.treaty_elections.map((el: any, i: number) => (i === event.index ? applyElectionUpdate(el, event.field, event.value) : el)),
              },
            })),
            'recomputeDerived',
          ],
        },

        AUTOFILL_US_TREATY: {
          actions: [assign(({ context }: any) => ({ ...context, dtaa: { ...context.dtaa, treaty_elections: autoFillUSTreaty() } })), 'recomputeDerived'],
        },

        HYDRATE: { 
          actions: [
            assign(({ context, event }: any) => ({ 
              ...context, 
              ...event.value,
              dtaa: { ...context.dtaa, ...(event.value?.dtaa || {}) }
            })), 
            'recomputeDerived'
          ] 
        },
      },
    },
  },
});
