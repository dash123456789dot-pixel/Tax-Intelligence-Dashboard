// ────────────────────────────────────────────────────────────────────────
// salaryMachine.ts
// XState v5 machine for the "Screen 2E — Salary" step (panel-step-salary
// in layer1_india.html), the third step in the wizard flow.
// ────────────────────────────────────────────────────────────────────────

import { setup, assign } from 'xstate';
import {
  deriveAll,
  parseINRCurrency,
  clearOldRegimeFields,
  clearPwdReceivedIfIneligible,
  SalaryContext,
} from './deriveSalary';

export const initialSalaryContext: Omit<SalaryContext, 'ui'> = {
  tax_regime: 'NEW', // 'NEW' | 'OLD' — default

  salary: {
    has_salary_income: false,

    gross_salary_inr: null,
    basic_da_inr: null,
    perquisites_inr: null,
    esop_perquisite_inr: null,
    esop_perquisite_events: [],

    professional_tax_inr: null,
    employer_nps_contribution_inr: null,
    prior_employer_salary_inr: null,
    lta_claimed_inr: null,

    hra_received_inr: null,
    rent_paid_inr: null,
    is_metro_city: false,

    pwd_transport_allowance: {
      is_eligible_pwd: false,
      allowance_received_inr: null,
    },
    conveyance_allowance: {
      allowance_received_inr: null,
      actual_expenditure_inr: null,
    },
    tour_travel_allowance: {
      allowance_received_inr: null,
      actual_expenditure_inr: null,
    },
    daily_allowance: {
      allowance_received_inr: null,
      actual_expenditure_inr: null,
    },
    taxable_salary_inr: null,
  },
};

function recompute({ context }: { context: SalaryContext }) {
  return deriveAll(context);
}

export type SalaryEvent =
  | { type: 'SET_TAX_REGIME'; value: string }
  | { type: 'TOGGLE_SALARY_SECTION'; value: boolean }
  | { type: 'UPDATE_SALARY_NUM'; field: string; value: any }
  | { type: 'UPDATE_SALARY_BOOL'; field: string; value: boolean }
  | { type: 'UPDATE_SALARY_NESTED_NUM'; objName: string; field: string; value: any }
  | { type: 'TOGGLE_PWD_ALLOWANCE'; value: boolean }
  | { type: 'ADD_ESOP_ROW' }
  | { type: 'REMOVE_ESOP_ROW'; index: number }
  | { type: 'UPDATE_ESOP_ROW'; index: number; field: string; value: any }
  | { type: 'HYDRATE'; value: any };

export const salaryMachine = setup({
  types: {
    context: {} as SalaryContext,
    events: {} as SalaryEvent,
  },
  actions: {
    recomputeDerived: assign(recompute),
  },
}).createMachine({
  id: 'salaryStep',
  context: ({ input }: any) => {
    const inputCtx = (input as any) || {};
    // Extract tax_regime to ensure it's available, but don't overwrite if input provides more
    return deriveAll({ ...initialSalaryContext, ...inputCtx });
  },
  initial: 'ready',
  states: {
    ready: {
      on: {
        SET_TAX_REGIME: {
          actions: [
            assign(({ context, event }) => {
              const tax_regime = event.value;
              const salary = tax_regime === 'NEW' ? clearOldRegimeFields(context.salary) : context.salary;
              return { ...context, tax_regime, salary };
            }),
            'recomputeDerived',
          ],
        },

        TOGGLE_SALARY_SECTION: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              salary: { ...context.salary, has_salary_income: !!event.value },
            })),
            'recomputeDerived',
          ],
        },

        UPDATE_SALARY_NUM: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              salary: { ...context.salary, [event.field]: parseINRCurrency(event.value) },
            })),
            'recomputeDerived',
          ],
        },

        UPDATE_SALARY_BOOL: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              salary: { ...context.salary, [event.field]: !!event.value },
            })),
            'recomputeDerived',
          ],
        },

        UPDATE_SALARY_NESTED_NUM: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              salary: {
                ...context.salary,
                [event.objName]: {
                  ...(context.salary as any)[event.objName],
                  [event.field]: parseINRCurrency(event.value),
                },
              },
            })),
            'recomputeDerived',
          ],
        },

        TOGGLE_PWD_ALLOWANCE: {
          actions: [
            assign(({ context, event }) => {
              const pwd = clearPwdReceivedIfIneligible({
                ...context.salary.pwd_transport_allowance,
                is_eligible_pwd: !!event.value,
              });
              return { ...context, salary: { ...context.salary, pwd_transport_allowance: pwd } };
            }),
            'recomputeDerived',
          ],
        },

        ADD_ESOP_ROW: {
          actions: [
            assign(({ context }) => ({
              ...context,
              salary: {
                ...context.salary,
                esop_perquisite_events: [
                  ...context.salary.esop_perquisite_events,
                  {
                    employer_name: null,
                    grant_date: null,
                    vesting_or_exercise_date: null,
                    shares: null,
                    fmv_per_share_inr: null,
                    exercise_price_per_share_inr: null,
                    perquisite_value_inr: null,
                  },
                ],
              },
            })),
            'recomputeDerived',
          ],
        },

        REMOVE_ESOP_ROW: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              salary: {
                ...context.salary,
                esop_perquisite_events: context.salary.esop_perquisite_events.filter((_, i) => i !== event.index),
              },
            })),
            'recomputeDerived',
          ],
        },

        UPDATE_ESOP_ROW: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              salary: {
                ...context.salary,
                esop_perquisite_events: context.salary.esop_perquisite_events.map((row, i) =>
                  i === event.index ? { ...row, [event.field]: event.value } : row
                ),
              },
            })),
            'recomputeDerived',
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
