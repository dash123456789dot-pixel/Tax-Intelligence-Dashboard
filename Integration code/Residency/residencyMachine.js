// ────────────────────────────────────────────────────────────────────────
// residencyMachine.js
// XState v5 machine for the "Screen 2A — Residency Detection" step
// (panel-step-profile in layer1_india.html), a.k.a. the Residency Solver.
//
// Every field that was a DOM input (visible <select>/<input>/<checkbox>)
// or a hidden/derived piece of state (ship_nationality, is_poem_in_india,
// final_india_residency_status, liable_to_tax_in_another_country_being_
// indian_citizen, live-tracking trips, tie-breaker selections, etc.) lives
// in context. context.ui is fully derived (never set directly) and is
// recomputed via deriveAll() after every event — this replaces the
// original's practice of calling runResidencySolver() + syncResidencyUI()
// + checkDualResidencyConflict() after every single onchange handler.
// ────────────────────────────────────────────────────────────────────────

import { setup, assign } from 'xstate';
import { deriveAll } from './derive.js';

export const initialResidencyContext = {
  // Injected from the parent wizard (Step "Financial Life Snapshot"); the
  // residency step reacts to it but does not own it.
  entity_type: 'individual', // 'individual' | 'huf' | 'firm' | 'llp' | 'aop' | 'trust' | 'ajp' | 'local' | 'company'

  residency_detail: {
    // --- visible: "Total Days in India" card ---
    live_tracking_active: false,           // visible: toggle-live-track
    trips: [{ arrival_date: null, departure_date: null }], // visible: live-trips-container rows
    manual_days: 182,                       // visible: res-days-current (slider)
    days_in_india_current_year: 182,        // visible (readonly, derived): days-val

    // --- visible: entity-specific core questions ---
    is_wholly_outside_india: null,          // visible (huf/firm-like): res-wholly-outside
    is_indian_company: null,                // visible (company): res-indian-company
    days_in_india_preceding_4_years_gte_365: null, // visible (individual): res-p4y
    employment_or_crew_status: null,        // visible (individual): res-emp
    is_departure_year: null,                // visible (individual, conditional): res-is-departure
    came_on_visit_to_india_pio_citizen: null, // visible (individual, conditional): res-visitor
    nr_years_last_10_gte_9: null,           // visible (individual/huf, conditional): res-nr9 / res-huf-nr9
    days_in_india_last_7_years_lte_729: null, // visible (individual/huf, conditional): res-d7 / res-huf-d7
    india_source_income_above_15l: null,    // visible (individual, conditional): res-inc15

    // --- hidden: present in state but not bound to any visible input in
    //     this step (either legacy/reserved fields, or written elsewhere) ---
    is_poem_in_india: null,                 // hidden: derived internally from company_residency raw facts
    ship_nationality: null,                 // hidden: reserved field, not wired to a control in this screen
    liable_to_tax_in_another_country_being_indian_citizen: false, // hidden: used by solver, no control here
    final_india_residency_status: 'ROR',    // hidden (readonly, derived): drives badge-lock-status
  },

  company_residency: {
    is_active_business: false,              // visible: cr-is-active (checkbox)
    board_meetings_primarily_outside_india: false, // visible (conditional): cr-board-out
    key_management_location: '',            // visible (conditional): cr-kmp-loc
    management_delegated_outside_india: false, // visible (conditional): cr-mgmt-delegated
    directors_in_india_count: 0,            // visible (conditional): cr-dir-in
    directors_outside_india_count: 0,       // visible (conditional): cr-dir-out
  },

  dtaa: {
    // Tie-breaker wizard lives inside this step's dual-residency-alert panel.
    tb_home: 'none',                        // visible (conditional): tb-home
    tb_cvi: 'none',                         // visible (conditional): tb-cvi
    tb_abode: 'none',                       // visible (conditional): tb-abode
    tb_nationality: 'none',                 // visible (conditional): tb-nationality
    dtaa_treaty_residence: 'none',          // hidden (readonly, derived): 'none' | 'india' | 'us'
    dtaa_forced_nr: false,                  // hidden (readonly, derived)
  },

  external: {
    // Mirrors the original's cross-tab localStorage('wising_us_state') read
    // inside checkDualResidencyConflict(). In a real app this would be fed
    // by a sibling machine / actor rather than localStorage polling.
    is_us_domestic_resident: false,         // hidden: not a control in this step
  },

  ui: {}, // fully derived — see derive.js -> deriveAll()
};

function recompute({ context }) {
  return deriveAll(context);
}

export const residencyMachine = setup({
  types: {
    context: {},
    events: {},
  },
  actions: {
    recomputeDerived: assign(recompute),
  },
}).createMachine({
  id: 'residencySolver',
  context: ({ input }) => deriveAll({ ...initialResidencyContext, ...(input || {}) }),
  // Single flat "ready" state: this step has no distinct modes of its own —
  // it's a continuously-live derivation over context, same as the original
  // DOM script (every handler mutates state then immediately re-derives).
  initial: 'ready',
  states: {
    ready: {
      on: {
        SET_ENTITY_TYPE: {
          actions: [
            assign(({ context, event }) => ({ ...context, entity_type: event.value })),
            'recomputeDerived',
          ],
        },

        // Generic setter mirroring updateResidencyField(field, val)
        UPDATE_RESIDENCY_FIELD: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              residency_detail: { ...context.residency_detail, [event.field]: event.value },
            })),
            'recomputeDerived',
          ],
        },

        // HUF variants reuse the same underlying fields but invert the
        // displayed question (res-huf-nr9 / res-huf-d7), matching the
        // original's `this.value === 'false'` inversion in the onchange.
        UPDATE_HUF_NR9: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              residency_detail: { ...context.residency_detail, nr_years_last_10_gte_9: event.value === null ? null : !event.value },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_HUF_D7: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              residency_detail: { ...context.residency_detail, days_in_india_last_7_years_lte_729: event.value === null ? null : !event.value },
            })),
            'recomputeDerived',
          ],
        },

        UPDATE_COMPANY_RESIDENCY: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              company_residency: { ...context.company_residency, [event.field]: event.value },
            })),
            'recomputeDerived',
          ],
        },

        SET_MANUAL_DAYS: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              residency_detail: { ...context.residency_detail, manual_days: parseInt(event.value, 10) || 0 },
            })),
            'recomputeDerived',
          ],
        },

        TOGGLE_LIVE_TRACKING: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              residency_detail: { ...context.residency_detail, live_tracking_active: !!event.value },
            })),
            'recomputeDerived',
          ],
        },

        ADD_TRIP: {
          actions: [
            assign(({ context }) => ({
              ...context,
              residency_detail: {
                ...context.residency_detail,
                trips: [...context.residency_detail.trips, { arrival_date: null, departure_date: null }],
              },
            })),
            'recomputeDerived',
          ],
        },

        REMOVE_TRIP: {
          actions: [
            assign(({ context, event }) => {
              const trips = context.residency_detail.trips.filter((_, i) => i !== event.index);
              return {
                ...context,
                residency_detail: {
                  ...context.residency_detail,
                  trips: trips.length ? trips : [{ arrival_date: null, departure_date: null }],
                },
              };
            }),
            'recomputeDerived',
          ],
        },

        UPDATE_TRIP_DATE: {
          actions: [
            assign(({ context, event }) => {
              const trips = context.residency_detail.trips.map((trip, i) =>
                i === event.index ? { ...trip, [event.field]: event.value || null } : trip
              );
              return { ...context, residency_detail: { ...context.residency_detail, trips } };
            }),
            'recomputeDerived',
          ],
        },

        // Tie-breaker wizard (evaluateTieBreaker)
        SET_TIE_BREAKER: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              dtaa: { ...context.dtaa, [`tb_${event.field}`]: event.value },
            })),
            'recomputeDerived',
          ],
        },

        SET_US_DOMESTIC_RESIDENT: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              external: { ...context.external, is_us_domestic_resident: !!event.value },
            })),
            'recomputeDerived',
          ],
        },

        // Bulk hydrate (e.g. loading a saved session / autosave restore)
        HYDRATE: {
          actions: [
            assign(({ context, event }) => ({ ...context, ...event.value })),
            'recomputeDerived',
          ],
        },
      },
    },
  },
});
