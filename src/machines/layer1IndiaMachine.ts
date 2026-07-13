import { createMachine, assign } from 'xstate';
import { solveResidency } from '../lib/residencySolver';
import type { Layer1IndiaContext, Layer1IndiaEvent } from './layer1IndiaMachine.types';

export const INITIAL_CONTEXT: Layer1IndiaContext = {
  activeStep: 'step-profile',
  unlockedSteps: ['step-profile'],
  profile: {
    full_name: null, entity_type: 'individual', date_of_birth: null, pan: null,
    pan_aadhaar_linked: true, tax_regime: 'NEW', turnover_lte_400cr: false,
    opt_115ba: false, opt_115baa: false, opt_115bab: false, mat_book_profit: null,
    mfg_setup_date: null, mfg_commence_date: null,
  },
  residency_detail: {
    live_tracking_active: false,
    trips: [{ arrival_date: null, departure_date: null }],
    manual_days: 182, days_in_india_current_year: 182,
    days_in_india_preceding_4_years_gte_365: null, employment_or_crew_status: null,
    is_departure_year: null,
    is_indian_citizen: null, is_pio_or_oci: null, nr_years_last_10_gte_9: null,
    days_in_india_last_7_years_lte_729: null, income_above_15l: null,
    liable_to_tax_in_another_country: false,
    is_wholly_outside_india: null, is_indian_company: null, is_poem_in_india: null,
    final_india_residency_status: 'ROR',
  },
  dtaa: { dtaa_treaty_residence: 'none', dtaa_forced_nr: false },
  residency_result: { status: 'ROR', path: '', scope: '', dtaa_overridden: false },
};

function calculateTripDays(trips: Array<{ arrival_date: string | null; departure_date: string | null }>): number {
  let total = 0;
  for (const t of trips) {
    if (t.arrival_date && t.departure_date) {
      const a = new Date(t.arrival_date);
      const d = new Date(t.departure_date);
      if (!isNaN(a.getTime()) && !isNaN(d.getTime()) && d >= a) {
        total += Math.floor((d.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }
    }
  }
  return total;
}

// Re-run the solver and return the patched residency fields
function recomputeResidency(ctx: Layer1IndiaContext): Partial<Layer1IndiaContext> {
  const result = solveResidency(
    { 
      entity_type: ctx.profile.entity_type, 
      ...ctx.residency_detail,
      india_days: ctx.residency_detail.days_in_india_current_year,
      huf_karta_nr9: ctx.residency_detail.nr_years_last_10_gte_9, 
      huf_karta_d7_729: ctx.residency_detail.days_in_india_last_7_years_lte_729 
    },
    ctx.dtaa
  );

  let unlockedSteps = [...ctx.unlockedSteps];
  if (ctx.residency_detail.days_in_india_current_year < 60) {
    if (!unlockedSteps.includes('step-dtaa' as never)) unlockedSteps.push('step-dtaa' as never);
    if (!unlockedSteps.includes('step-compliance' as never)) unlockedSteps.push('step-compliance' as never);
  }

  return {
    residency_result: result,
    residency_detail: { ...ctx.residency_detail, final_india_residency_status: result.status },
    unlockedSteps,
  };
}

export const layer1IndiaMachine = createMachine({
  id: 'layer1India',
  types: {} as { context: Layer1IndiaContext; events: Layer1IndiaEvent },
  context: INITIAL_CONTEXT,
  initial: 'editing',
  states: {
    editing: {
      on: {
        SWITCH_STEP: {
          guard: ({ context, event }) => context.unlockedSteps.includes(event.step),
          actions: assign(({ event }) => ({ activeStep: event.step })),
        },
        SET_PROFILE: {
          actions: assign(({ context, event }) => {
            const profile = { ...context.profile, [event.field]: event.value };
            const next = { ...context, profile };
            return { profile, ...recomputeResidency(next) };
          }),
        },
        SET_RESIDENCY: {
          actions: assign(({ context, event }) => {
            const residency_detail = { ...context.residency_detail, [event.field]: event.value };
            const next = { ...context, residency_detail };
            return recomputeResidency(next);
          }),
        },
        SET_DTAA: {
          actions: assign(({ context, event }) => {
            const dtaa = { ...context.dtaa, [event.field]: event.value };
            const next = { ...context, dtaa };
            return { dtaa, ...recomputeResidency(next) };
          }),
        },
        SET_MANUAL_DAYS: {
          actions: assign(({ context, event }) => {
            const residency_detail = {
              ...context.residency_detail,
              manual_days: event.value,
              days_in_india_current_year: context.residency_detail.live_tracking_active
                ? context.residency_detail.days_in_india_current_year
                : event.value,
              // Reset nested fields when the slider changes
              days_in_india_preceding_4_years_gte_365: null,
              employment_or_crew_status: null,
              is_departure_year: null,
              is_indian_citizen: null,
              is_pio_or_oci: null,
              nr_years_last_10_gte_9: null,
              days_in_india_last_7_years_lte_729: null,
              income_above_15l: null,
            };
            return recomputeResidency({ ...context, residency_detail });
          }),
        },
        TOGGLE_LIVE_TRACKING: {
          actions: assign(({ context, event }) => {
            const live_tracking_active = event.value;
            let days = context.residency_detail.manual_days;
            if (live_tracking_active) {
                days = calculateTripDays(context.residency_detail.trips);
            }
            const residency_detail = {
                ...context.residency_detail,
                live_tracking_active,
                days_in_india_current_year: days
            };
            return recomputeResidency({ ...context, residency_detail });
          }),
        },
        ADD_TRIP: {
            actions: assign(({ context }) => {
                const trips = [...context.residency_detail.trips, { arrival_date: null, departure_date: null }];
                const days = context.residency_detail.live_tracking_active ? calculateTripDays(trips) : context.residency_detail.days_in_india_current_year;
                const residency_detail = { ...context.residency_detail, trips, days_in_india_current_year: days };
                return recomputeResidency({ ...context, residency_detail });
            })
        },
        UPDATE_TRIP: {
            actions: assign(({ context, event }) => {
                const trips = [...context.residency_detail.trips];
                trips[event.index] = { ...trips[event.index], [event.field]: event.value };
                const days = context.residency_detail.live_tracking_active ? calculateTripDays(trips) : context.residency_detail.days_in_india_current_year;
                const residency_detail = { ...context.residency_detail, trips, days_in_india_current_year: days };
                return recomputeResidency({ ...context, residency_detail });
            })
        },
        REMOVE_TRIP: {
            actions: assign(({ context, event }) => {
                const trips = [...context.residency_detail.trips];
                trips.splice(event.index, 1);
                const days = context.residency_detail.live_tracking_active ? calculateTripDays(trips) : context.residency_detail.days_in_india_current_year;
                const residency_detail = { ...context.residency_detail, trips, days_in_india_current_year: days };
                return recomputeResidency({ ...context, residency_detail });
            })
        },
        HYDRATE: {
          actions: assign(({ context, event }) => {
            const merged = { ...context, ...event.context,
              profile: { ...context.profile, ...event.context.profile },
              residency_detail: { ...context.residency_detail, ...event.context.residency_detail },
              dtaa: { ...context.dtaa, ...event.context.dtaa } };
            return { ...merged, ...recomputeResidency(merged) };
          }),
        },
      },
    },
  },
});

export default layer1IndiaMachine;
