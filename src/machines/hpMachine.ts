// ────────────────────────────────────────────────────────────────────────
// hpMachine.ts
// XState v5 machine for the "Screen 2F — House Property (DOM-02)" step
// (panel-step-hp in layer1_india.html), the fourth step in the wizard flow.
// ────────────────────────────────────────────────────────────────────────

import { setup, assign, raise } from 'xstate';
import {
  deriveAll,
  defaultProperty,
  applyHPFieldUpdate,
  HousePropertyContext,
} from './deriveHouseProperty';

export const initialHPContext: Omit<HousePropertyContext, 'ui'> = {
  tax_regime: 'NEW',
  entity_type: 'individual',

  house_property: {
    has_house_property_income: false,
    properties: [],
  },
};

function recompute({ context }: { context: HousePropertyContext }) {
  return deriveAll(context);
}

export type HousePropertyEvent =
  | { type: 'SET_TAX_REGIME'; value: string }
  | { type: 'SET_ENTITY_TYPE'; value: string }
  | { type: 'TOGGLE_HP_SECTION'; value: boolean }
  | { type: 'ADD_HOUSE_PROPERTY' }
  | { type: 'REMOVE_HOUSE_PROPERTY'; index: number }
  | { type: 'UPDATE_HP_FIELD'; index: number; field: string; value: any }
  | { type: 'HP_UPLOAD_START'; index: number; slot: 'loan' | 'rent' | 'tax' }
  | { type: 'HP_UPLOAD_COMPLETE'; index: number; slot: 'loan' | 'rent' | 'tax' }
  | { type: 'HYDRATE'; value: any };

export const housePropertyMachine = setup({
  types: {
    context: {} as HousePropertyContext,
    events: {} as HousePropertyEvent,
  },
  actions: {
    recomputeDerived: assign(recompute),
  },
}).createMachine({
  id: 'housePropertyStep',
  context: ({ input }) => deriveAll({ ...initialHPContext, ...(input as any || {}) }),
  initial: 'ready',
  states: {
    ready: {
      on: {
        SET_TAX_REGIME: {
          actions: [
            assign(({ context, event }) => ({ ...context, tax_regime: event.value })),
            'recomputeDerived',
          ],
        },
        SET_ENTITY_TYPE: {
          actions: [
            assign(({ context, event }) => ({ ...context, entity_type: event.value })),
            'recomputeDerived',
          ],
        },

        TOGGLE_HP_SECTION: {
          actions: [
            assign(({ context, event }) => {
              const val = !!event.value;
              const hp = context.house_property;
              if (val) {
                return {
                  ...context,
                  house_property: {
                    ...hp,
                    has_house_property_income: true,
                    properties: hp.properties.length === 0 ? [defaultProperty()] : hp.properties,
                  },
                };
              }
              return {
                ...context,
                house_property: { ...hp, has_house_property_income: false, properties: [] },
              };
            }),
            'recomputeDerived',
          ],
        },

        ADD_HOUSE_PROPERTY: {
          actions: [
            assign(({ context }) => ({
              ...context,
              house_property: {
                ...context.house_property,
                properties: [...context.house_property.properties, defaultProperty()],
              },
            })),
            'recomputeDerived',
          ],
        },

        REMOVE_HOUSE_PROPERTY: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              house_property: {
                ...context.house_property,
                properties: context.house_property.properties.filter((_, i) => i !== event.index),
              },
            })),
            'recomputeDerived',
          ],
        },

        UPDATE_HP_FIELD: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              house_property: {
                ...context.house_property,
                properties: context.house_property.properties.map((prop, i) =>
                  i === event.index ? applyHPFieldUpdate(prop, event.field, event.value, context.tax_regime) : prop
                ),
              },
            })),
            'recomputeDerived',
          ],
        },

        HP_UPLOAD_START: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              house_property: {
                ...context.house_property,
                properties: context.house_property.properties.map((prop, i) =>
                  i === event.index
                    ? { ...prop, _uploads: { ...prop._uploads, [event.slot]: 'scanning' } }
                    : prop
                ),
              },
            })),
            raise(({ event }) => ({ type: 'HP_UPLOAD_COMPLETE', index: event.index, slot: event.slot }), { delay: 2000 }),
          ],
        },
        HP_UPLOAD_COMPLETE: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              house_property: {
                ...context.house_property,
                properties: context.house_property.properties.map((prop, i) =>
                  i === event.index
                    ? { ...prop, _uploads: { ...prop._uploads, [event.slot]: 'success' } }
                    : prop
                ),
              },
            })),
          ],
        },

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
