// ────────────────────────────────────────────────────────────────────────
// complianceMachine.ts
// XState v5 machine for "Screen 2C — Additional Documents & Special Rates"
// ────────────────────────────────────────────────────────────────────────

import { setup, assign, raise } from 'xstate';
import { deriveAll, parseS197Rate, toggleIncomeType, s197MockExtraction, form10fMockExtraction } from './deriveCompliance';

export const initialComplianceContext = {
  final_india_residency_status: 'NR', // 'ROR' | 'RNOR' | 'NR'

  compliance_docs: {
    form_10f: {
      is_filed: false,
      ack_number: null,
      _upload: 'idle', // 'idle' | 'scanning' | 'success'
    },

    section_197_cert: {
      is_available: false,
      rate: null,
      validity_start_date: null,
      validity_end_date: null,
      covered_income_types: [] as string[],
      _upload: 'idle', // 'idle' | 'scanning' | 'success'
    },

    chapter_xiia_elected: false,
  },

  ui: {} as any,
};

function recompute({ context }: any) {
  return deriveAll(context);
}

export const complianceMachine = setup({
  types: { context: {} as any, events: {} as any },
  actions: { recomputeDerived: assign(recompute) },
}).createMachine({
  id: 'complianceStep',
  context: ({ input }: any) => deriveAll({ ...initialComplianceContext, ...(input || {}) }),
  initial: 'ready',
  states: {
    ready: {
      on: {
        SET_RESIDENCY_STATUS: {
          actions: [assign(({ context, event }: any) => ({ ...context, final_india_residency_status: event.value })), 'recomputeDerived'],
        },
        TOGGLE_10F_FILED: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              compliance_docs: { ...context.compliance_docs, form_10f: { ...context.compliance_docs.form_10f, is_filed: !!event.value } },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_10F_ACK: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              compliance_docs: { ...context.compliance_docs, form_10f: { ...context.compliance_docs.form_10f, ack_number: event.value || null } },
            })),
            'recomputeDerived',
          ],
        },
        START_10F_UPLOAD: {
          actions: [
            assign(({ context }: any) => ({
              ...context,
              compliance_docs: { ...context.compliance_docs, form_10f: { ...context.compliance_docs.form_10f, _upload: 'scanning' } },
            })),
            raise({ type: 'COMPLETE_10F_UPLOAD' }, { delay: 1500 }),
          ],
        },
        COMPLETE_10F_UPLOAD: {
          actions: [
            assign(({ context }: any) => ({
              ...context,
              compliance_docs: {
                ...context.compliance_docs,
                form_10f: { ...context.compliance_docs.form_10f, _upload: 'success', ack_number: form10fMockExtraction() },
              },
            })),
            'recomputeDerived',
          ],
        },
        TOGGLE_S197_AVAILABLE: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              compliance_docs: { ...context.compliance_docs, section_197_cert: { ...context.compliance_docs.section_197_cert, is_available: !!event.value } },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_S197_FIELD: {
          actions: [
            assign(({ context, event }: any) => {
              const value = event.field === 'rate' ? parseS197Rate(event.value) : event.value;
              return {
                ...context,
                compliance_docs: { ...context.compliance_docs, section_197_cert: { ...context.compliance_docs.section_197_cert, [event.field]: value } },
              };
            }),
            'recomputeDerived',
          ],
        },
        TOGGLE_S197_INCOME_TYPE: {
          actions: [
            assign(({ context, event }: any) => ({
              ...context,
              compliance_docs: {
                ...context.compliance_docs,
                section_197_cert: {
                  ...context.compliance_docs.section_197_cert,
                  covered_income_types: toggleIncomeType(context.compliance_docs.section_197_cert.covered_income_types, event.value, event.checked),
                },
              },
            })),
            'recomputeDerived',
          ],
        },
        START_S197_UPLOAD: {
          actions: [
            assign(({ context }: any) => ({
              ...context,
              compliance_docs: { ...context.compliance_docs, section_197_cert: { ...context.compliance_docs.section_197_cert, _upload: 'scanning' } },
            })),
            raise({ type: 'COMPLETE_S197_UPLOAD' }, { delay: 1500 }),
          ],
        },
        COMPLETE_S197_UPLOAD: {
          actions: [
            assign(({ context }: any) => {
              const extraction = s197MockExtraction();
              const existingTypes = context.compliance_docs.section_197_cert.covered_income_types || [];
              const mergedTypes = [...new Set([...existingTypes, ...extraction.autoCheckedTypes])];
              return {
                ...context,
                compliance_docs: {
                  ...context.compliance_docs,
                  section_197_cert: {
                    ...context.compliance_docs.section_197_cert,
                    _upload: 'success',
                    rate: extraction.rate,
                    validity_start_date: extraction.validity_start_date,
                    validity_end_date: extraction.validity_end_date,
                    covered_income_types: mergedTypes,
                  },
                },
              };
            }),
            'recomputeDerived',
          ],
        },
        TOGGLE_CHAPTER_XIIA: {
          actions: [
            assign(({ context, event }: any) => ({ ...context, compliance_docs: { ...context.compliance_docs, chapter_xiia_elected: !!event.value } })),
            'recomputeDerived',
          ],
        },
      },
    },
  },
});
