// ────────────────────────────────────────────────────────────────────────
// businessMachine.js
// XState v5 machine for "Screen 2G — Business, Profession & Trading Income"
// (panel-step-business in layer1_india.html), the fifth step in this
// project's wizard sequence (Snapshot -> Residency -> Salary -> House
// Property -> Business).
//
// ── CROSS-STEP DEPENDENCIES ─────────────────────────────────────────────
// This is the step with the most cross-step coupling in the whole wizard.
// Four fields are *injected* — owned by earlier steps, read-only here:
//
//   context.tax_regime                  <- Step 1 (Financial Life Snapshot)
//   context.entity_type                 <- Step 1 (Financial Life Snapshot)
//   context.is_indian_company           <- Step 2 (Residency Solver: residency_detail.is_indian_company)
//   context.final_india_residency_status <- Step 2 (Residency Solver: RS-001 output, 'ROR'|'RNOR'|'NR')
//
// `final_india_residency_status` in particular is a hard legal gate: per
// the original's validateS44ADEligibility()/renderBusinessEntries(),
// presumptive taxation (s44AD/s44ADA) is ONLY available to ROR taxpayers.
// Dispatch SET_RESIDENCY_STATUS whenever the Residency Solver step's
// derived status changes, and this machine will immediately re-run the
// full eligibility cascade (see deriveBusiness.js -> runEligibilityCascade)
// and force-revert any now-illegal presumptive_scheme selections — exactly
// like the original's validate*Eligibility() functions did on every
// relevant change.
// ────────────────────────────────────────────────────────────────────────

import { setup, assign } from 'xstate';
import {
  deriveAll,
  defaultBusinessEntry,
  defaultPartnerFirm,
  defaultGoodsVehicle,
  applyGoodsVehicleUpdate,
  applyBusinessEntryUpdate,
  applyPartnerFirmUpdate,
  parseINRCurrency,
} from './deriveBusiness.js';

export const initialBusinessContext = {
  // ── injected (owned by earlier steps; update via the SET_* events below) ──
  tax_regime: 'NEW',
  entity_type: 'individual',
  is_indian_company: null,
  final_india_residency_status: 'ROR',

  // ── owned by this step, and also displayed here even though it's
  // technically a `state.profile` field in the original (only relevant
  // when entity_type==='company' && is_indian_company===true) ──
  is_section_8: false, // visible (conditional): prof-section-8

  business_income: {
    has_business_or_fo_income: false, // visible: biz-has (master gate)

    nature_of_business: [], // visible: 5x .biz-nature-chk checkboxes
    //   'own_business' | 'goods_transport' | 'fno_trader' | 'intraday_trader' | 'partner_in_firm'

    business_entries: [
      // visible: dynamic "Your Businesses" list (+ Add Business). Per entry:
      //   business_name            visible: text input
      //   nature                   hidden: set implicitly by defaultBusinessEntry() from nature_of_business at creation time (no per-entry selector in the current build)
      //   presumptive_scheme       visible: <select>, options computed live by computeEntrySchemeOptions()
      //   business_code            visible (non-professional entries): <select>
      //   profession_type          visible (professional entries): <select> (Rule 6F)
      //   turnover_inr / digital_receipts_inr / cash_receipts_inr        visible (s44AD path — see README, simplified vs. original's branch-aware granular revenue breakdown)
      //   ada_digital_receipts_inr / ada_cash_receipts_inr               visible (s44ADA path)
      //   gross_receipts_inr       hidden: present in schema (matches addBusinessEntry()) but not bound to a per-entry control in the current build — see the *top-level* business_income.gross_receipts_inr below, which IS the wired "General Gross Receipts" field
      //   branches: []             hidden/deferred: see README "Deferred sub-features"
    ],

    business_code: null, // visible (conditional: any entry on s44AD): biz-code — legacy top-level selector, "deprecated in multi-business view" per the source's own comment, but still live-wired
    profession_type: null, // hidden: top-level twin of updateProfessionType(), superseded by per-entry profession_type in practice
    gross_receipts_inr: null, // visible (conditional: professional & not s44ADA): biz-general-gross-receipts

    s44AD_last_exit_ay: null, // visible (conditional: any entry is small_business): biz-s44ad-exit
    s44AD_opted_current_year: false, // visible (same condition): biz-s44ad-opted

    goods_vehicles: [], // visible: dynamic S44AE fleet list (+ Add Vehicle), max 10
    //   NOTE: the source HTML has a second, duplicate `id="div-pres-s44ae"` block
    //   (a `<table id="vehicle-table">` fed by addVehicleRow()/updateBizPresumptive()).
    //   Because getElementById always resolves to the FIRST match in the DOM, that
    //   second block is permanently unreachable dead code — it's intentionally
    //   excluded from this extraction. Only the functional s44ae-vehicles-container
    //   implementation (addGoodsVehicle/renderGoodsVehicles) is ported.

    speculative_income_inr: null, // visible (conditional: intraday_trader): biz-intra-profit
    speculative_turnover_inr: null, // visible (conditional: intraday_trader): biz-intra-turnover
    non_speculative_income_inr: null, // visible (conditional: fno_trader): biz-fno-profit
    fno_turnover_inr: null, // visible (conditional: fno_trader): biz-fno-turnover

    s41_remission_income_inr: null, // visible: biz-s41-1
    s41_bad_debt_recovery_inr: null, // visible: biz-s41-4

    partner_firms: [], // visible (conditional: partner_in_firm): dynamic list (+ Add Firm)
    //   firm_name / entity_type / remuneration_from_entity_inr /
    //   interest_on_capital_from_entity_inr / profit_share_exempt_inr — all visible per-card

    gst_registration_status: 'unregistered', // visible: biz-gst-status ('unregistered'|'regular'|'composition')
    gst_collected_inr: null, // visible (conditional: status === 'regular'): biz-gst-collected

    specified_business_s35AD_inr: null, // visible (conditional: Indian company): biz-s35ad

    amt_credit_bf_inr: null, // visible (conditional: OLD regime): biz-amt-bf
    amt_credit_bf_origin_ay: null, // visible (conditional: OLD regime): biz-amt-ay

    // hidden: present in state.domestic_income.business_income in the original,
    // but not bound to any control inside THIS step (either legacy/reserved, or
    // populated by the deferred "Unit-Wise Business Expenses" / "Common Assets"
    // auto-mirrored accordions — see README "Deferred sub-features").
    s115BAC_optout_history: false,
    opening_stock_inr: null,
    closing_stock_inr: null,
    expenses: {
      rent_for_business_premises_inr: null,
      repairs_maintenance_inr: null,
      employee_salary_wages_inr: null,
      employee_bonus_commission_inr: null,
      interest_on_borrowed_capital_inr: null,
      insurance_premium_inr: null,
      bad_debts_written_off_inr: null,
      other_business_expenses_inr: null,
      total_cash_payments_exceeding_limit_inr: null,
      cash_limit_type: '10k',
      total_cash_payments_exceeding_35k_inr: null,
      has_related_party_payments: false,
      payments_to_non_residents_no_tds_inr: null,
      payments_to_residents_no_tds_inr: null,
      s35_own_revenue_research_inr: null,
      s35_own_capital_research_inr: null,
      s35_donation_to_approved_body_inr: null,
      s35D_total_preliminary_expenses_inr: null,
      s35D_year_of_commencement: null,
      s35DDA_vrs_payments_inr: null,
      s35DDA_first_year_of_payment: null,
      stt_paid_inr: null,
      ctt_paid_inr: null,
      brokerage_on_fno_inr: null,
      exchange_charges_inr: null,
      advisory_and_data_subscriptions_inr: null,
      internet_proportion_inr: null,
      home_office_proportion_inr: null,
      margin_interest_inr: null,
      ca_professional_fees_inr: null,
      employer_pf_esi_contribution_inr: null,
      employer_pf_esi_paid_before_due_date: null,
    },
    asset_blocks: [],
    msme_payables: [],
    partner_remuneration_s40b_inr: null,
    s44bbb_receipts_inr: null,
    tonnage_tax_115V_inr: null,
    nr_ineligible_presumptive: false,

    // hidden, fully derived — do not set directly (mirrors updateBizPresumptive()'s
    // syncChecked(), recomputed by deriveAll() after every event)
    presumptive_scheme: [],
  },

  ui: {}, // fully derived — see deriveBusiness.js -> deriveAll()
};

function recompute({ context }) {
  return deriveAll(context);
}

export const businessMachine = setup({
  types: { context: {}, events: {} },
  actions: { recomputeDerived: assign(recompute) },
}).createMachine({
  id: 'businessStep',
  context: ({ input }) => deriveAll({ ...initialBusinessContext, ...(input || {}) }),
  initial: 'ready',
  states: {
    ready: {
      on: {
        // ── injected cross-step setters ──────────────────────────────
        SET_TAX_REGIME: {
          actions: [assign(({ context, event }) => ({ ...context, tax_regime: event.value })), 'recomputeDerived'],
        },
        SET_ENTITY_TYPE: {
          actions: [assign(({ context, event }) => ({ ...context, entity_type: event.value })), 'recomputeDerived'],
        },
        SET_IS_INDIAN_COMPANY: {
          actions: [assign(({ context, event }) => ({ ...context, is_indian_company: event.value })), 'recomputeDerived'],
        },
        // Dispatch this whenever the Residency Solver step's derived
        // final_india_residency_status changes — see module doc comment.
        SET_RESIDENCY_STATUS: {
          actions: [assign(({ context, event }) => ({ ...context, final_india_residency_status: event.value })), 'recomputeDerived'],
        },

        // ── Section 8 toggle (technically state.profile.is_section_8) ───
        TOGGLE_SECTION_8: {
          actions: [assign(({ context, event }) => ({ ...context, is_section_8: !!event.value })), 'recomputeDerived'],
        },

        // toggleBusinessModule(val)
        TOGGLE_BUSINESS_MODULE: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: { ...context.business_income, has_business_or_fo_income: !!event.value },
            })),
            'recomputeDerived',
          ],
        },

        // updateBizNature(): toggles one value in/out of the nature array
        TOGGLE_BIZ_NATURE: {
          actions: [
            assign(({ context, event }) => {
              const current = context.business_income.nature_of_business;
              const next = current.includes(event.value) ? current.filter((n) => n !== event.value) : [...current, event.value];
              return { ...context, business_income: { ...context.business_income, nature_of_business: next } };
            }),
            'recomputeDerived',
          ],
        },

        // updateBizNum(field, val) — top-level currency field setter
        UPDATE_BIZ_NUM: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: { ...context.business_income, [event.field]: parseINRCurrency(event.value) },
            })),
            'recomputeDerived',
          ],
        },

        // updateBizField(field, val) — top-level non-currency field setter
        UPDATE_BIZ_FIELD: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: { ...context.business_income, [event.field]: event.value },
            })),
            'recomputeDerived',
          ],
        },

        // updateBizCode(val) / updateProfessionType(val) — same as UPDATE_BIZ_FIELD,
        // kept as distinct events for readability/parity with the original names.
        UPDATE_BIZ_CODE: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: { ...context.business_income, business_code: event.value || null },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_PROFESSION_TYPE: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: { ...context.business_income, profession_type: event.value || null },
            })),
            'recomputeDerived',
          ],
        },

        // syncGstSection(status)
        SET_GST_STATUS: {
          actions: [
            assign(({ context, event }) => {
              const gst_registration_status = event.value;
              const gst_collected_inr = gst_registration_status === 'regular' ? context.business_income.gst_collected_inr : null;
              return { ...context, business_income: { ...context.business_income, gst_registration_status, gst_collected_inr } };
            }),
            'recomputeDerived',
          ],
        },

        // ── Business Entries: addBusinessEntry / removeBusinessEntry / updateBusinessEntry ──
        ADD_BUSINESS_ENTRY: {
          actions: [
            assign(({ context }) => ({
              ...context,
              business_income: {
                ...context.business_income,
                business_entries: [...context.business_income.business_entries, defaultBusinessEntry(context.business_income.nature_of_business)],
              },
            })),
            'recomputeDerived',
          ],
        },
        REMOVE_BUSINESS_ENTRY: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: {
                ...context.business_income,
                business_entries: context.business_income.business_entries.filter((_, i) => i !== event.index),
              },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_BUSINESS_ENTRY: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: {
                ...context.business_income,
                business_entries: context.business_income.business_entries.map((entry, i) =>
                  i === event.index ? applyBusinessEntryUpdate(entry, event.field, event.value) : entry
                ),
              },
            })),
            'recomputeDerived',
          ],
        },

        // ── Partner Firms: addPartnerFirm / removePartnerFirm / updatePartnerFirm ──
        ADD_PARTNER_FIRM: {
          actions: [
            assign(({ context }) => ({
              ...context,
              business_income: { ...context.business_income, partner_firms: [...context.business_income.partner_firms, defaultPartnerFirm()] },
            })),
            'recomputeDerived',
          ],
        },
        REMOVE_PARTNER_FIRM: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: { ...context.business_income, partner_firms: context.business_income.partner_firms.filter((_, i) => i !== event.index) },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_PARTNER_FIRM: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: {
                ...context.business_income,
                partner_firms: context.business_income.partner_firms.map((firm, i) => (i === event.index ? applyPartnerFirmUpdate(firm, event.field, event.value) : firm)),
              },
            })),
            'recomputeDerived',
          ],
        },

        // ── Goods Vehicles (S44AE): addGoodsVehicle / removeGoodsVehicle / updateGoodsVehicle ──
        ADD_GOODS_VEHICLE: {
          actions: [
            assign(({ context }) => {
              const vehicles = context.business_income.goods_vehicles;
              if (vehicles.length >= 10) return context; // matches addGoodsVehicle()'s hard cap
              return { ...context, business_income: { ...context.business_income, goods_vehicles: [...vehicles, defaultGoodsVehicle()] } };
            }),
            'recomputeDerived',
          ],
        },
        REMOVE_GOODS_VEHICLE: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: { ...context.business_income, goods_vehicles: context.business_income.goods_vehicles.filter((_, i) => i !== event.index) },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_GOODS_VEHICLE: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: {
                ...context.business_income,
                goods_vehicles: context.business_income.goods_vehicles.map((v, i) => (i === event.index ? applyGoodsVehicleUpdate(v, event.field, event.value) : v)),
              },
            })),
            'recomputeDerived',
          ],
        },

        HYDRATE: {
          actions: [assign(({ context, event }) => ({ ...context, ...event.value })), 'recomputeDerived'],
        },
      },
    },
  },
});
