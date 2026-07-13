// ────────────────────────────────────────────────────────────────────────
// hpMachine.js
// XState v5 machine for the "Screen 2F — House Property (DOM-02)" step
// (panel-step-hp in layer1_india.html), the fourth step in the wizard flow
// used in this project (Financial Life Snapshot -> Residency Detection ->
// Salary -> House Property).
//
// Field-by-field mapping lives in the comments on initialHPContext below.
// context.ui is fully derived (never set directly) by deriveHouseProperty's
// deriveAll(), mirroring toggleHPSection() / updateHPField() /
// renderHouseProperties()'s inline visibility logic from the original
// inline <script>.
// ────────────────────────────────────────────────────────────────────────

import { setup, assign, raise } from 'xstate';
import { deriveAll, defaultProperty, applyHPFieldUpdate } from './deriveHouseProperty.js';

export const initialHPContext = {
  // Injected from the parent wizard (owned by Step 1: Financial Life
  // Snapshot / Step 2: Residency Detection). This step only reacts to them
  // (they gate per-property field visibility).
  tax_regime: 'NEW',       // 'NEW' | 'OLD'
  entity_type: 'individual', // drives isCorp = entity !== 'individual' && entity !== 'huf'

  house_property: {
    has_house_property_income: false, // visible: hp-gatekeeper (master toggle)
    properties: [
      // visible: hp-list — each row is one house property card. Fields per row:
      //   property_use                       visible: <select> (SOP/LOP/DLOP)
      //   co_owner_share_percent             visible: input (1-100, clamped)
      //   financial_values_represent         visible (conditional: co_owner_share_percent < 100): <select>
      //   gross_annual_value_inr             visible (conditional: hidden+disabled when SOP)
      //   municipal_taxes_paid_inr           visible (conditional: hidden+disabled when SOP)
      //   interest_on_borrowed_capital_inr   visible (conditional: hidden+disabled when SOP & NEW regime)
      //   pre_construction_interest_inr      visible (conditional: same as above)
      //   is_self_occupied_with_loan         visible (conditional: hidden+disabled when NEW regime or non-individual/HUF entity)
      //   _uploads.{loan,rent,tax}           hidden: UI-only mock upload status, not part of the real domain schema (see deriveHouseProperty.js)
    ],
  },

  ui: {}, // fully derived — see deriveHouseProperty.js -> deriveAll()
};

function recompute({ context }) {
  return deriveAll(context);
}

export const housePropertyMachine = setup({
  types: { context: {}, events: {} },
  actions: {
    recomputeDerived: assign(recompute),
  },
}).createMachine({
  id: 'housePropertyStep',
  context: ({ input }) => deriveAll({ ...initialHPContext, ...(input || {}) }),
  initial: 'ready',
  states: {
    ready: {
      on: {
        // Injected from the parent wizard.
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

        // toggleHPSection(val): turning on seeds one property if empty;
        // turning off wipes all properties.
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

        // addHouseProperty()
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

        // removeHouseProperty(idx)
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

        // updateHPField(idx, field, val)
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

        // handleHPUpload(event, containerId): fake "Scanning Document..." ->
        // (2s later) "Extraction Successful" animation. Ported as a
        // two-phase status flag per upload slot, driven by a delayed
        // self-raised event instead of setTimeout + DOM text mutation.
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
