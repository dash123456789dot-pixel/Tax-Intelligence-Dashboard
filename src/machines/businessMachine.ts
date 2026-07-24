// ────────────────────────────────────────────────────────────────────────
// businessMachine.ts
// XState v5 machine for "Screen 2G — Business, Profession & Trading Income"
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
  BusinessContext,
} from './deriveBusiness';

export const initialBusinessContext: Omit<BusinessContext, 'ui'> = {
  tax_regime: 'NEW',
  entity_type: 'individual',
  is_indian_company: null,
  final_india_residency_status: 'ROR',
  is_section_8: false,

  business_income: {
    has_business_or_fo_income: false,
    nature_of_business: [],
    business_entries: [],
    business_code: null,
    profession_type: null,
    gross_receipts_inr: null,
    s44AD_last_exit_ay: null,
    s44AD_opted_current_year: false,
    goods_vehicles: [],
    speculative_income_inr: null,
    speculative_turnover_inr: null,
    non_speculative_income_inr: null,
    fno_turnover_inr: null,
    s41_remission_income_inr: null,
    s41_bad_debt_recovery_inr: null,
    partner_firms: [],
    gst_registration_status: 'unregistered',
    gst_collected_inr: null,
    specified_business_s35AD_inr: null,
    amt_credit_bf_inr: null,
    amt_credit_bf_origin_ay: null,
    presumptive_scheme: [],
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
  },
};

function recompute({ context }: { context: BusinessContext }) {
  return deriveAll(context);
}

export type BusinessEvent =
  | { type: 'SET_TAX_REGIME'; value: string }
  | { type: 'SET_ENTITY_TYPE'; value: string }
  | { type: 'SET_IS_INDIAN_COMPANY'; value: boolean | null }
  | { type: 'SET_RESIDENCY_STATUS'; value: string }
  | { type: 'TOGGLE_SECTION_8'; value: boolean }
  | { type: 'TOGGLE_BUSINESS_MODULE'; value: boolean }
  | { type: 'TOGGLE_BIZ_NATURE'; value: string }
  | { type: 'UPDATE_BIZ_NUM'; field: string; value: any }
  | { type: 'UPDATE_BIZ_FIELD'; field: string; value: any }
  | { type: 'UPDATE_BIZ_CODE'; value: string | null }
  | { type: 'UPDATE_PROFESSION_TYPE'; value: string | null }
  | { type: 'SET_GST_STATUS'; value: string }
  | { type: 'ADD_BUSINESS_ENTRY' }
  | { type: 'REMOVE_BUSINESS_ENTRY'; index: number }
  | { type: 'UPDATE_BUSINESS_ENTRY'; index: number; field: string; value: any }
  | { type: 'ADD_PARTNER_FIRM' }
  | { type: 'REMOVE_PARTNER_FIRM'; index: number }
  | { type: 'UPDATE_PARTNER_FIRM'; index: number; field: string; value: any }
  | { type: 'ADD_GOODS_VEHICLE' }
  | { type: 'REMOVE_GOODS_VEHICLE'; index: number }
  | { type: 'UPDATE_GOODS_VEHICLE'; index: number; field: string; value: any }
  | { type: 'HYDRATE'; value: any };

export const businessMachine = setup({
  types: {
    context: {} as BusinessContext,
    events: {} as BusinessEvent,
  },
  actions: { recomputeDerived: assign(recompute) },
}).createMachine({
  id: 'businessStep',
  context: ({ input }: any) => {
    const inputCtx = (input as any) || {};
    return deriveAll({ ...initialBusinessContext, ...inputCtx });
  },
  initial: 'ready',
  states: {
    ready: {
      on: {
        SET_TAX_REGIME: {
          actions: [assign(({ context, event }) => ({ ...context, tax_regime: event.value })), 'recomputeDerived'],
        },
        SET_ENTITY_TYPE: {
          actions: [assign(({ context, event }) => ({ ...context, entity_type: event.value })), 'recomputeDerived'],
        },
        SET_IS_INDIAN_COMPANY: {
          actions: [assign(({ context, event }) => ({ ...context, is_indian_company: event.value })), 'recomputeDerived'],
        },
        SET_RESIDENCY_STATUS: {
          actions: [assign(({ context, event }) => ({ ...context, final_india_residency_status: event.value })), 'recomputeDerived'],
        },

        TOGGLE_SECTION_8: {
          actions: [assign(({ context, event }) => ({ ...context, is_section_8: !!event.value })), 'recomputeDerived'],
        },

        TOGGLE_BUSINESS_MODULE: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: { ...context.business_income, has_business_or_fo_income: !!event.value },
            })),
            'recomputeDerived',
          ],
        },

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

        UPDATE_BIZ_NUM: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: { ...context.business_income, [event.field]: parseINRCurrency(event.value) },
            })),
            'recomputeDerived',
          ],
        },

        UPDATE_BIZ_FIELD: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              business_income: { ...context.business_income, [event.field]: event.value },
            })),
            'recomputeDerived',
          ],
        },

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

        SET_GST_STATUS: {
          actions: [
            assign(({ context, event }) => {
              const gst_registration_status = event.value as any;
              const gst_collected_inr = gst_registration_status === 'regular' ? context.business_income.gst_collected_inr : null;
              return { ...context, business_income: { ...context.business_income, gst_registration_status, gst_collected_inr } };
            }),
            'recomputeDerived',
          ],
        },

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

        ADD_GOODS_VEHICLE: {
          actions: [
            assign(({ context }) => {
              const vehicles = context.business_income.goods_vehicles;
              if (vehicles.length >= 10) return context;
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
