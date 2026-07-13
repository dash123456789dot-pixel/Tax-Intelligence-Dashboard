// ────────────────────────────────────────────────────────────────────────
// salaryMachine.js
// XState v5 machine for the "Screen 2E — Salary" step (panel-step-salary
// in layer1_india.html), the third step in the wizard flow used in this
// project (Financial Life Snapshot -> Residency Detection -> Salary).
//
// Field-by-field mapping lives in the comments on initialSalaryContext
// below. context.ui is fully derived (never set directly) by deriveSalary's
// deriveAll(), mirroring toggleSalarySection() / evaluateSalaryRegimeLock()
// / togglePwdAllowance() from the original inline <script>.
// ────────────────────────────────────────────────────────────────────────

import { setup, assign } from 'xstate';
import { deriveAll, parseINRCurrency, clearOldRegimeFields, clearPwdReceivedIfIneligible } from './deriveSalary.js';

export const initialSalaryContext = {
  // Injected from the parent wizard (Step 1: Financial Life Snapshot owns
  // this). The salary step only reacts to it (old-regime field visibility).
  tax_regime: 'NEW', // 'NEW' | 'OLD' — default mirrors state.profile.tax_regime

  salary: {
    has_salary_income: false,       // visible: sal-has (master toggle)

    gross_salary_inr: null,         // visible: sal-gross
    basic_da_inr: null,             // visible (OLD regime only): sal-basic
    perquisites_inr: null,          // visible: sal-perq
    esop_perquisite_inr: null,      // visible: sal-esop
    esop_perquisite_events: [],     // visible: itemized ESOP grant rows (add/remove)

    professional_tax_inr: null,          // visible: sal-prof-tax
    employer_nps_contribution_inr: null, // visible: sal-nps-emp
    prior_employer_salary_inr: null,     // visible: sal-prior
    lta_claimed_inr: null,               // visible (OLD regime only): sal-lta

    hra_received_inr: null,   // visible (OLD regime only): sal-hra
    rent_paid_inr: null,      // visible (OLD regime only): sal-rent
    is_metro_city: false,     // visible (OLD regime only): sal-metro

    pwd_transport_allowance: {
      is_eligible_pwd: false,        // visible: sal-pwd-elig (checkbox)
      allowance_received_inr: null,  // visible (enabled only if eligible): sal-pwd-recv
    },
    conveyance_allowance: {
      allowance_received_inr: null,  // visible: sal-conv-recv
      actual_expenditure_inr: null,  // visible: sal-conv-exp
    },
    tour_travel_allowance: {
      allowance_received_inr: null,  // visible: sal-tour-recv
      actual_expenditure_inr: null,  // visible: sal-tour-exp
    },
    daily_allowance: {
      allowance_received_inr: null,  // visible: sal-daily-recv
      actual_expenditure_inr: null,  // visible: sal-daily-exp
    },

    // hidden: present in state.domestic_income.salary but not bound to any
    // control in this step — it's a computed/simulation output written
    // elsewhere (see the `salary: { taxable_salary_inr: sim.salary }` read
    // near the tax-simulation code in the original file).
    taxable_salary_inr: null,
  },

  ui: {}, // fully derived — see deriveSalary.js -> deriveAll()
};

function recompute({ context }) {
  return deriveAll(context);
}

export const salaryMachine = setup({
  types: { context: {}, events: {} },
  actions: {
    recomputeDerived: assign(recompute),
  },
}).createMachine({
  id: 'salaryStep',
  context: ({ input }) => deriveAll({ ...initialSalaryContext, ...(input || {}) }),
  initial: 'ready',
  states: {
    ready: {
      on: {
        // Injected from the parent wizard when the person changes their
        // regime elsewhere. Mirrors evaluateSalaryRegimeLock(): switching
        // to NEW clears+hides the old-regime-only fields.
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

        // toggleSalarySection(val)
        TOGGLE_SALARY_SECTION: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              salary: { ...context.salary, has_salary_income: !!event.value },
            })),
            'recomputeDerived',
          ],
        },

        // updateSalaryNum(field, val) — generic top-level currency field setter
        UPDATE_SALARY_NUM: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              salary: { ...context.salary, [event.field]: parseINRCurrency(event.value) },
            })),
            'recomputeDerived',
          ],
        },

        // updateSalaryBool(field, val)
        UPDATE_SALARY_BOOL: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              salary: { ...context.salary, [event.field]: !!event.value },
            })),
            'recomputeDerived',
          ],
        },

        // updateSalaryNestedNum(objName, field, val)
        UPDATE_SALARY_NESTED_NUM: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              salary: {
                ...context.salary,
                [event.objName]: {
                  ...context.salary[event.objName],
                  [event.field]: parseINRCurrency(event.value),
                },
              },
            })),
            'recomputeDerived',
          ],
        },

        // togglePwdAllowance(val): flips eligibility, and (mirroring the
        // original) clears allowance_received_inr the moment it's turned off.
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

        // addEsopRow()
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

        // removeEsopRow(idx)
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

        // syncEsopState(): per-row field edit (employer_name, grant_date,
        // vesting_or_exercise_date, shares, fmv_per_share_inr,
        // exercise_price_per_share_inr, perquisite_value_inr)
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
