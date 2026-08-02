// ────────────────────────────────────────────────────────────────────────
// otherSourcesMachine.ts
// XState v5 machine for "Screen 2I — Other Sources" (panel-step-os in
// layer1_india.html), the seventh step in this project's wizard sequence
// (Snapshot -> Residency -> Salary -> House Property -> Business ->
// Capital Gains -> Other Sources).
//
// ── CROSS-STEP DEPENDENCIES ─────────────────────────────────────────────
//   context.entity_type                      <- Step 1 (Financial Life Snapshot)
//   context.deemed_dividend_from_buyback_inr <- Step 5 (Capital Gains), computed
// See deriveOtherSources.ts's header comment for exactly what each gates.
// ────────────────────────────────────────────────────────────────────────

import { setup, assign } from 'xstate';
import { deriveAll, applyOSFieldUpdate, clearFieldsForEntityChange, parseINRCurrency } from './deriveOtherSources';

export const initialOtherSourcesContext = {
  // ── injected ──
  entity_type: 'individual',
  deemed_dividend_from_buyback_inr: 0, // computed by the Capital Gains step; not a rendered input here

  other_sources: {
    has_other_sources_income: false, // visible: os-has (master toggle). NOTE: also force-set true by ANY field edit — see applyOSFieldUpdate().

    // 1. Slab-Rate Streams
    interest_savings_inr: null,           // visible: os-interest-savings
    interest_fd_rd_inr: null,             // visible: os-interest-fd
    interest_fd_rd_tds_inr: null,         // visible (collapsible, "+ Add TDS"): os-interest-fd-tds
    interest_bonds_inr: null,             // visible: os-bonds
    interest_bonds_tds_inr: null,         // visible (collapsible): os-bonds-tds
    interest_on_it_refund_inr: null,      // visible: os-it-refund
    dividend_inr: null,                   // visible: os-dividend
    dividend_tds_inr: null,               // visible (collapsible): os-dividend-tds
    gifts_above_50k_inr: null,            // visible (conditional: hidden+auto-zeroed for Trust entities): os-gifts
    gifts_exemption_marriage: false,
    gifts_exemption_relative: false,
    local_authority_s10_20_inr: null,     // visible (conditional: entity === 'local'): os-local-authority
    spousal_clubbing_s64_inr: null,       // visible (conditional: individual only): os-spousal-clubbing
    minor_child_exemption_inr: null,      // visible (conditional: individual only): os-minor-child
    lic_maturity_inr: null,               // visible (conditional: individual/HUF only): os-lic-maturity
    lic_maturity_tds_inr: null,           // visible (collapsible, same condition): os-lic-maturity-tds
    miscellaneous_income_inr: null,       // visible: os-misc
    angel_tax_premium_inr: null,          // visible (conditional: company only): os-angel-tax

    // 2. Retirement & Exempt Receipts (individual only — card-os-retirement)
    exempt_interest_ppf_epf_inr: null,    // visible: os-exempt-pf-interest
    taxable_epf_interest_inr: null,       // visible: os-taxable-epf-interest
    exempt_pf_withdrawal_inr: null,       // visible: os-exempt-pf-with
    exempt_nps_withdrawal_inr: null,      // visible: os-exempt-nps
    taxable_nps_withdrawal_inr: null,     // visible: os-taxable-nps

    // 3. Family Pension (individual only — card-os-family-pension)
    family_pension_gross_inr: null,             // visible: os-pension
    family_pension_standard_deduction_inr: null, // hidden (readonly, derived): min(15000, gross/3)

    // 4. Special Rate Streams (always visible, flat 30%/other special rates)
    winnings_lottery_gaming_inr: null,    // visible: os-lottery
    online_gaming_winnings_inr: null,     // visible: os-gaming
    unexplained_income_115BBE_inr: null,  // visible: os-unexplained
    //   NOTE: this field is read/written by updateOSField() in the original
    //   but was missing from the initial state object's own declaration
    //   (a minor inconsistency in the source — JS just adds it on first
    //   write). Declared explicitly here with a proper default instead.

    // hidden: hooked into the tax-simulation engine, no control in THIS step
    quarters: {},
  },

  // Agricultural Income — technically lives at state.domestic_income.
  // has_agricultural_income / agricultural_income_inr in the original (a
  // sibling of business_income, NOT part of other_sources), but its ONLY
  // rendered UI in the whole app is this block inside panel-step-os.
  agricultural: {
    has_agricultural_income: false, // visible: ag-has
    agricultural_income_inr: null,  // visible (conditional: has_agricultural_income): ag-income
  },

  ui: {}, // fully derived — see deriveOtherSources.js -> deriveAll()
};

function recompute({ context }: any) {
  return deriveAll(context);
}

export const otherSourcesMachine = setup({
  types: { context: {} as any, events: {} as any },
  actions: { recomputeDerived: assign(recompute) },
}).createMachine({
  id: 'otherSourcesStep',
  context: ({ input }: any) => {
    const inputCtx = (input as any) || {};
    return deriveAll({ ...initialOtherSourcesContext, ...inputCtx });
  },
  initial: 'ready',
  states: {
    ready: {
      on: {
        // ── injected cross-step setters ──
        SET_ENTITY_TYPE: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              entity_type: event.value,
              other_sources: clearFieldsForEntityChange(context.other_sources, event.value),
            })),
            'recomputeDerived',
          ],
        },
        SET_DEEMED_DIVIDEND_FROM_BUYBACK: {
          actions: [assign(({ context, event }: any) => ({ ...context, deemed_dividend_from_buyback_inr: event.value })), 'recomputeDerived'],
        },

        // toggleOSSection(val) — unlike the Capital Gains step's gate,
        // this one DOES persist directly to has_other_sources_income.
        TOGGLE_OS_SECTION: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              other_sources: { ...context.other_sources, has_other_sources_income: !!event.value },
            })),
            'recomputeDerived',
          ],
        },

        // updateOSField(field, val) — generic numeric setter; always force-
        // flips has_other_sources_income true (see deriveOtherSources.js).
        UPDATE_OS_FIELD: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              other_sources: applyOSFieldUpdate(context.other_sources, event.field, event.value),
            })),
            'recomputeDerived',
          ],
        },

        // toggleAgriSection(checked)
        TOGGLE_AGRI_SECTION: {
          actions: [
            assign(({ context, event }: any) => {
              const checked = !!event.value;
              return {
                ...context,
                agricultural: {
                  has_agricultural_income: checked,
                  agricultural_income_inr: checked ? context.agricultural.agricultural_income_inr : null,
                },
              };
            }),
            'recomputeDerived',
          ],
        },
        // updateAgriIncome(val)
        UPDATE_AGRI_INCOME: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              agricultural: { ...context.agricultural, agricultural_income_inr: event.value === '' ? null : parseINRCurrency(event.value) },
            })),
            'recomputeDerived',
          ],
        },

        HYDRATE: { actions: [assign(({ context, event }: any) => ({ ...context, ...event.value })), 'recomputeDerived'] },
      },
    },
  },
});
