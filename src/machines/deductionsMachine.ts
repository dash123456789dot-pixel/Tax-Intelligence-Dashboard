// ────────────────────────────────────────────────────────────────────────
// deductionsMachine.ts
// XState v5 machine for "Screen 2J — Tax Deductions (Chapter VI-A)"
// ────────────────────────────────────────────────────────────────────────

import { setup, assign } from 'xstate';
import {
  deriveAll,
  defaultDonationRow,
  clear80DMedicalIfHidden,
  clearDDDetailsIfHidden,
  clear80GGIfHidden,
  derive80TTA,
  applyTTADerivedClear,
  applyNriBlocks,
  compute80GGBlocked,
  applyGGBlockIfNeeded,
  parseINRCurrency,
} from './deriveDeductions';

export const initialDeductionsContext = {
  tax_regime: 'OLD', 
  entity_type: 'individual', 
  date_of_birth: null, 
  final_india_residency_status: 'ROR', 
  is_indian_company: null, 
  has_salary_income: false, 
  hra_received_inr: null, 

  deductions: {
    s80C: {
      epf_employee_inr: null,
      ppf_inr: null,
      elss_inr: null,
      life_insurance_premium_inr: null,
      principal_home_loan_inr: null,
      nsc_inr: null,
      tuition_fees_inr: null,
      sukanya_samriddhi_inr: null,
      tax_saving_fd_inr: null,
      stamp_duty_registration_inr: null,
    },
    s80CCC_80CCD1: { lic_annuity_premium_inr: null, nps_employee_contribution_inr: null },
    s80CCD_1B: { nps_additional_inr: null },

    s80D: {
      self_family_premium_inr: null,
      self_family_preventive_checkup_inr: null,
      parents_premium_inr: null,
      parents_are_senior: false,
      parents_preventive_checkup_inr: null,
      parents_medical_expenditure_inr: null,
      parents_has_health_insurance: true,
    },

    s80DD: { has_disabled_dependents: false, disability_percentage: null, is_nri_blocked: false },
    s80DDB: { has_specified_diseases_treatment: false, patient_category: null, medical_expenses_inr: null, is_nri_blocked: false },
    s80U: { has_self_disability: false, disability_percentage: null, is_nri_blocked: false },

    s80GG: { has_rent_paid_no_hra: false, rent_paid_inr: null },

    s80G_rows: [] as any[],

    s80ggb_ggc_political_donation_inr: null,

    s80TTA_TTB: { applicable_section: null, savings_interest_inr: null, fd_rd_interest_inr: null },

    s80E: { education_loan_interest_inr: null },
    s80EEA_EE: { affordable_home_loan_interest_inr: null, loan_sanction_date: null },

    s80M: { dividend_income_inr: null, dividend_distributed_inr: null, dividend_inr: null },

    s80IAC_inr: null,
    s80LA_inr: null,
    s80P_inr: null,

    s80QQB_inr: null,
    s80RRB_inr: null,
  },

  ui: {} as any,
};

function recompute({ context }: any) {
  return deriveAll(context);
}

export const deductionsMachine = setup({
  types: { context: {} as any, events: {} as { type: string; value?: any; field?: string } },
  actions: { recomputeDerived: assign(recompute) },
}).createMachine({
  id: 'deductionsStep',
  context: ({ input }: any) => {
    const inputCtx = (input as any) || {};
    return deriveAll({ ...initialDeductionsContext, ...inputCtx });
  },
  initial: 'ready',
  states: {
    ready: {
      on: {
        SET_TAX_REGIME: { actions: [assign(({ context, event }: any) => ({ ...context, tax_regime: event.value })), 'recomputeDerived'] },
        SET_ENTITY_TYPE: {
          actions: [
            assign(({ context, event }: any) => {
              const next = { ...context, entity_type: event.value };
              const derived = derive80TTA(next);
              return { ...next, deductions: { ...next.deductions, s80TTA_TTB: applyTTADerivedClear(next.deductions.s80TTA_TTB, derived) } };
            }),
            'recomputeDerived',
          ],
        },
        SET_DATE_OF_BIRTH: {
          actions: [
            assign(({ context, event }: any) => {
              const next = { ...context, date_of_birth: event.value };
              const derived = derive80TTA(next);
              return { ...next, deductions: { ...next.deductions, s80TTA_TTB: applyTTADerivedClear(next.deductions.s80TTA_TTB, derived) } };
            }),
            'recomputeDerived',
          ],
        },
        SET_RESIDENCY_STATUS: {
          actions: [
            assign(({ context, event }: any) => {
              const next = { ...context, final_india_residency_status: event.value };
              const isNR = event.value === 'NR';
              let deductions = applyNriBlocks(next.deductions, isNR);
              const derived = derive80TTA(next);
              deductions = { ...deductions, s80TTA_TTB: applyTTADerivedClear(deductions.s80TTA_TTB, derived) };
              return { ...next, deductions };
            }),
            'recomputeDerived',
          ],
        },
        SET_IS_INDIAN_COMPANY: { actions: [assign(({ context, event }: any) => ({ ...context, is_indian_company: event.value })), 'recomputeDerived'] },
        SET_HAS_SALARY_INCOME: {
          actions: [
            assign(({ context, event }: any) => {
              const next = { ...context, has_salary_income: event.value };
              const { blocked } = compute80GGBlocked(next.has_salary_income, next.hra_received_inr);
              return { ...next, deductions: { ...next.deductions, s80GG: applyGGBlockIfNeeded(next.deductions.s80GG, blocked) } };
            }),
            'recomputeDerived',
          ],
        },
        SET_HRA_RECEIVED: {
          actions: [
            assign(({ context, event }: any) => {
              const next = { ...context, hra_received_inr: event.value };
              const { blocked } = compute80GGBlocked(next.has_salary_income, next.hra_received_inr);
              return { ...next, deductions: { ...next.deductions, s80GG: applyGGBlockIfNeeded(next.deductions.s80GG, blocked) } };
            }),
            'recomputeDerived',
          ],
        },

        UPDATE_80C: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, deductions: { ...context.deductions, s80C: { ...context.deductions.s80C, [event.field]: parseINRCurrency(event.value) } } })),
            'recomputeDerived',
          ],
        },
        UPDATE_80CCC_80CCD1: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              deductions: { ...context.deductions, s80CCC_80CCD1: { ...context.deductions.s80CCC_80CCD1, [event.field]: parseINRCurrency(event.value) } },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_NPS_ADD: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, deductions: { ...context.deductions, s80CCD_1B: { ...context.deductions.s80CCD_1B, [event.field]: parseINRCurrency(event.value) } } })),
            'recomputeDerived',
          ],
        },

        UPDATE_80D_NUM: {
          actions: [
            assign(({ context, event }: any) => {
              const s80D = clear80DMedicalIfHidden({ ...context.deductions.s80D, [event.field]: parseINRCurrency(event.value) });
              return { ...context, deductions: { ...context.deductions, s80D } };
            }),
            'recomputeDerived',
          ],
        },
        UPDATE_80D_BOOL: {
          actions: [
            assign(({ context, event }: any) => {
              const s80D = clear80DMedicalIfHidden({ ...context.deductions.s80D, [event.field]: event.value });
              return { ...context, deductions: { ...context.deductions, s80D } };
            }),
            'recomputeDerived',
          ],
        },

        UPDATE_DD_BOOL: {
          actions: [
            assign(({ context, event }: any) => {
              const section = clearDDDetailsIfHidden({ ...context.deductions[event.section], [event.field]: event.value }, event.field);
              return { ...context, deductions: { ...context.deductions, [event.section]: section } };
            }),
            'recomputeDerived',
          ],
        },
        UPDATE_DD_FIELD: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, deductions: { ...context.deductions, [event.section]: { ...context.deductions[event.section], [event.field]: event.value || null } } })),
            'recomputeDerived',
          ],
        },
        UPDATE_DD_NUM: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              deductions: { ...context.deductions, [event.section]: { ...context.deductions[event.section], [event.field]: parseINRCurrency(event.value) } },
            })),
            'recomputeDerived',
          ],
        },

        UPDATE_80GG_BOOL: {
          actions: [
            assign(({ context, event }: any) => {
              const s80GG = clear80GGIfHidden({ ...context.deductions.s80GG, [event.field]: event.value });
              return { ...context, deductions: { ...context.deductions, s80GG } };
            }),
            'recomputeDerived',
          ],
        },
        UPDATE_80GG_NUM: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, deductions: { ...context.deductions, s80GG: { ...context.deductions.s80GG, [event.field]: parseINRCurrency(event.value) } } })),
            'recomputeDerived',
          ],
        },

        ADD_80G_ROW: {
          actions: [assign(({ context }: any) => ({ ...context, deductions: { ...context.deductions, s80G_rows: [...context.deductions.s80G_rows, defaultDonationRow()] } })), 'recomputeDerived'],
        },
        REMOVE_80G_ROW: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, deductions: { ...context.deductions, s80G_rows: context.deductions.s80G_rows.filter((_: any, i: number) => i !== event.index) } })),
            'recomputeDerived',
          ],
        },
        UPDATE_80G_ROW: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              deductions: {
                ...context.deductions,
                s80G_rows: context.deductions.s80G_rows.map((row: any, i: number) => (i === event.index ? { ...row, [event.field]: event.value } : row)),
              },
            })),
            'recomputeDerived',
          ],
        },

        UPDATE_80TTA: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, deductions: { ...context.deductions, s80TTA_TTB: { ...context.deductions.s80TTA_TTB, [event.field]: parseINRCurrency(event.value) } } })),
            'recomputeDerived',
          ],
        },

        UPDATE_80E: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, deductions: { ...context.deductions, s80E: { ...context.deductions.s80E, [event.field]: parseINRCurrency(event.value) } } })),
            'recomputeDerived',
          ],
        },
        UPDATE_80EEA: {
          actions: [
            assign(({ context, event }: any) => {
              const value = event.field === 'affordable_home_loan_interest_inr' ? parseINRCurrency(event.value) : event.value;
              return { ...context, deductions: { ...context.deductions, s80EEA_EE: { ...context.deductions.s80EEA_EE, [event.field]: value } } };
            }),
            'recomputeDerived',
          ],
        },

        UPDATE_SPECIAL_DEDUCTION: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, deductions: { ...context.deductions, [event.field]: parseINRCurrency(event.value) } })),
            'recomputeDerived',
          ],
        },
        UPDATE_ROYALTY_DEDUCTION: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, deductions: { ...context.deductions, [event.field]: parseINRCurrency(event.value) } })),
            'recomputeDerived',
          ],
        },
        UPDATE_80M: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, deductions: { ...context.deductions, s80M: { ...context.deductions.s80M, [event.field]: parseINRCurrency(event.value) } } })),
            'recomputeDerived',
          ],
        },
        UPDATE_POLITICAL_DONATION: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, deductions: { ...context.deductions, s80ggb_ggc_political_donation_inr: parseINRCurrency(event.value) } })),
            'recomputeDerived',
          ],
        },

        HYDRATE: { actions: [assign(({ context, event }: any) => ({ ...context, ...event.value })), 'recomputeDerived'] },
      },
    },
  },
});
