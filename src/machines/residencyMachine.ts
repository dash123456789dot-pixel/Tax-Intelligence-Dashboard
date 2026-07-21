import { setup, assign, ActorRef } from 'xstate';
import { deriveAll, ResidencyContext } from './derive';

export const initialResidencyContext: Omit<ResidencyContext, 'ui'> = {
  entity_type: 'individual',

  residency_detail: {
    live_tracking_active: false,
    trips: [{ arrival_date: null, departure_date: null }],
    manual_days: 182,
    days_in_india_current_year: 182,

    is_wholly_outside_india: null,
    is_indian_company: null,
    days_in_india_preceding_4_years_gte_365: null,
    employment_or_crew_status: null,
    is_departure_year: null,
    came_on_visit_to_india_pio_citizen: null,
    nr_years_last_10_gte_9: null,
    days_in_india_last_7_years_lte_729: null,
    india_source_income_above_15l: null,

    is_poem_in_india: null,
    ship_nationality: null,
    liable_to_tax_in_another_country_being_indian_citizen: false,
    us_person_certified_to_bank: null,
    final_india_residency_status: 'ROR',
  },

  company_residency: {
    is_active_business: false,
    board_meetings_primarily_outside_india: false,
    key_management_location: '',
    management_delegated_outside_india: false,
    directors_in_india_count: 0,
    directors_outside_india_count: 0,
  },

  dtaa: {
    tb_home: 'none',
    tb_cvi: 'none',
    tb_abode: 'none',
    tb_nationality: 'none',
    dtaa_treaty_residence: 'none',
    dtaa_forced_nr: false,
  },

  external: {
    is_us_domestic_resident: false,
  },

  sidebarActorRef: null,
};

function recompute({ context }: { context: ResidencyContext }) {
  return deriveAll(context);
}

export type ResidencyEvent =
  | { type: 'SET_ENTITY_TYPE'; value: string }
  | { type: 'UPDATE_RESIDENCY_FIELD'; field: string; value: any }
  | { type: 'UPDATE_HUF_NR9'; value: boolean | null }
  | { type: 'UPDATE_HUF_D7'; value: boolean | null }
  | { type: 'UPDATE_COMPANY_RESIDENCY'; field: string; value: any }
  | { type: 'SET_MANUAL_DAYS'; value: string }
  | { type: 'TOGGLE_LIVE_TRACKING'; value: boolean }
  | { type: 'ADD_TRIP' }
  | { type: 'REMOVE_TRIP'; index: number }
  | { type: 'UPDATE_TRIP_DATE'; index: number; field: string; value: string }
  | { type: 'SET_TIE_BREAKER'; field: string; value: string }
  | { type: 'SET_US_DOMESTIC_RESIDENT'; value: boolean }
  | { type: 'HYDRATE'; value: any };

export const residencyMachine = setup({
  types: {
    context: {} as ResidencyContext,
    events: {} as ResidencyEvent,
  },
  actions: {
    recomputeDerived: assign(recompute),
    forwardResidencyStatus: ({ context }) => {
      const cert = context.ui?.cert || { status: 'ROR', path: '', scope: '' };
      context.sidebarActorRef?.send({
        type: 'RESIDENCY.SET',
        status: cert.status,
        path: cert.path,
        scope: cert.scope,
      });
    },
  },
}).createMachine({
  id: 'residencySolver',
  context: ({ input }) => {
    const initial = {
      ...initialResidencyContext,
      sidebarActorRef: (input as any)?.sidebarActorRef ?? null,
    };
    return deriveAll(initial as ResidencyContext);
  },
  initial: 'ready',
  states: {
    ready: {
      on: {
        SET_ENTITY_TYPE: {
          actions: [
            assign(({ context, event }) => ({ ...context, entity_type: event.value })),
            'recomputeDerived',
            'forwardResidencyStatus',
          ],
        },

        UPDATE_RESIDENCY_FIELD: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              residency_detail: { ...context.residency_detail, [event.field]: event.value },
            })),
            'recomputeDerived',
            'forwardResidencyStatus',
          ],
        },

        UPDATE_HUF_NR9: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              residency_detail: {
                ...context.residency_detail,
                nr_years_last_10_gte_9: event.value === null ? null : !event.value,
              },
            })),
            'recomputeDerived',
            'forwardResidencyStatus',
          ],
        },

        UPDATE_HUF_D7: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              residency_detail: {
                ...context.residency_detail,
                days_in_india_last_7_years_lte_729: event.value === null ? null : !event.value,
              },
            })),
            'recomputeDerived',
            'forwardResidencyStatus',
          ],
        },

        UPDATE_COMPANY_RESIDENCY: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              company_residency: { ...context.company_residency, [event.field]: event.value },
            })),
            'recomputeDerived',
            'forwardResidencyStatus',
          ],
        },

        SET_MANUAL_DAYS: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              residency_detail: { ...context.residency_detail, manual_days: parseInt(event.value, 10) || 0 },
            })),
            'recomputeDerived',
            'forwardResidencyStatus',
          ],
        },

        TOGGLE_LIVE_TRACKING: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              residency_detail: { ...context.residency_detail, live_tracking_active: !!event.value },
            })),
            'recomputeDerived',
            'forwardResidencyStatus',
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
            'forwardResidencyStatus',
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
            'forwardResidencyStatus',
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
            'forwardResidencyStatus',
          ],
        },

        SET_TIE_BREAKER: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              dtaa: { ...context.dtaa, [`tb_${event.field}`]: event.value },
            })),
            'recomputeDerived',
            'forwardResidencyStatus',
          ],
        },

        SET_US_DOMESTIC_RESIDENT: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              external: { ...context.external, is_us_domestic_resident: !!event.value },
            })),
            'recomputeDerived',
            'forwardResidencyStatus',
          ],
        },

        HYDRATE: {
          actions: [
            assign(({ context, event }) => ({ ...context, ...event.value })),
            'recomputeDerived',
            'forwardResidencyStatus',
          ],
        },
      },
    },
  },
});
