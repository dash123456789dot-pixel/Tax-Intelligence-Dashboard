// ────────────────────────────────────────────────────────────────────────
// complianceMachine.js
// XState v5 machine for "Screen 2C — Additional Documents & Special
// Rates" (panel-step-compliance in layer1_india.html), the tenth step in
// this project's wizard sequence.
//
// ── CROSS-STEP DEPENDENCY ─────────────────────────────────────────────
//   context.final_india_residency_status <- Step 2 (Residency Solver)
// This step is reachable ONLY when that status is 'NR' — see
// deriveCompliance.js's header comment (confirmed against the source's
// own `syncUnlockStatus()`, which gates step-compliance identically to
// step-dtaa on this single condition).
//
// Both document-upload fields (Form 41 and the Lower TDS Certificate) use
// the same delayed-mock-OCR pattern established in the House Property
// step's extraction: a start event flips a UI-only status to 'scanning',
// then a `raise(..., { delay: 1500 })` (matching the original's 1500ms
// `setTimeout`) fires a completion event that writes the mocked
// extraction result into real domain state.
// ────────────────────────────────────────────────────────────────────────

import { setup, assign, raise } from 'xstate';
import { deriveAll, parseS197Rate, toggleIncomeType, s197MockExtraction, form10fMockExtraction } from './deriveCompliance.js';

export const initialComplianceContext = {
  // ── injected (owned by the Residency Solver step) ──
  final_india_residency_status: 'NR', // 'ROR' | 'RNOR' | 'NR'

  compliance_docs: {
    // NOTE: `compliance_docs.trc` also exists in the original's data model
    // but is rendered entirely within the DTAA step (Screen 2B), not here
    // — see that step's extraction. This step only owns form_10f,
    // section_197_cert, and chapter_xiia_elected.

    form_10f: {
      is_filed: false,   // visible: comp-10f-filed (Form 41 / 10F filed toggle)
      ack_number: null,  // visible (conditional: is_filed): comp-10f-ack — text/manual entry OR auto-filled by upload
      _upload: 'idle',   // hidden: UI-only mock upload status ('idle' | 'scanning' | 'success'), not part of the real domain schema — mirrors handleForm10fUpload()'s fake "Scanning document..." animation
    },

    section_197_cert: {
      is_available: false,       // visible: comp-s197-has (Lower TDS Certificate toggle)
      rate: null,                 // visible (conditional): comp-s197-rate — see the rate-field bug documented in deriveCompliance.js
      validity_start_date: null, // visible (conditional): comp-s197-start
      validity_end_date: null,   // visible (conditional): comp-s197-end
      covered_income_types: [],  // visible (conditional): 4x checkboxes (PROPERTY_CG / NRO_INTEREST / DIVIDEND / ROYALTY_FTS)
      _upload: 'idle',            // hidden: UI-only mock upload status, same pattern as form_10f._upload
    },

    chapter_xiia_elected: false, // visible: comp-xiia (Chapter XII-A flat-rate opt-in)
  },

  ui: {}, // fully derived — see deriveCompliance.js -> deriveAll()
};

function recompute({ context }) {
  return deriveAll(context);
}

export const complianceMachine = setup({
  types: { context: {}, events: {} },
  actions: { recomputeDerived: assign(recompute) },
}).createMachine({
  id: 'complianceStep',
  context: ({ input }) => deriveAll({ ...initialComplianceContext, ...(input || {}) }),
  initial: 'ready',
  states: {
    ready: {
      on: {
        SET_RESIDENCY_STATUS: {
          actions: [assign(({ context, event }) => ({ ...context, final_india_residency_status: event.value })), 'recomputeDerived'],
        },

        TOGGLE_10F_FILED: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              compliance_docs: { ...context.compliance_docs, form_10f: { ...context.compliance_docs.form_10f, is_filed: !!event.value } },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_10F_ACK: {
          actions: [
            assign(({ context, event }) => ({
              ...context,
              compliance_docs: { ...context.compliance_docs, form_10f: { ...context.compliance_docs.form_10f, ack_number: event.value || null } },
            })),
            'recomputeDerived',
          ],
        },
        START_10F_UPLOAD: {
          actions: [
            assign(({ context }) => ({
              ...context,
              compliance_docs: { ...context.compliance_docs, form_10f: { ...context.compliance_docs.form_10f, _upload: 'scanning' } },
            })),
            raise({ type: 'COMPLETE_10F_UPLOAD' }, { delay: 1500 }),
          ],
        },
        COMPLETE_10F_UPLOAD: {
          actions: [
            assign(({ context }) => ({
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
            assign(({ context, event }) => ({
              ...context,
              compliance_docs: { ...context.compliance_docs, section_197_cert: { ...context.compliance_docs.section_197_cert, is_available: !!event.value } },
            })),
            'recomputeDerived',
          ],
        },
        UPDATE_S197_FIELD: {
          actions: [
            assign(({ context, event }) => {
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
            assign(({ context, event }) => ({
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
            assign(({ context }) => ({
              ...context,
              compliance_docs: { ...context.compliance_docs, section_197_cert: { ...context.compliance_docs.section_197_cert, _upload: 'scanning' } },
            })),
            raise({ type: 'COMPLETE_S197_UPLOAD' }, { delay: 1500 }),
          ],
        },
        COMPLETE_S197_UPLOAD: {
          actions: [
            assign(({ context }) => {
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
            assign(({ context, event }) => ({ ...context, compliance_docs: { ...context.compliance_docs, chapter_xiia_elected: !!event.value } })),
            'recomputeDerived',
          ],
        },

        HYDRATE: { actions: [assign(({ context, event }) => ({ ...context, ...event.value })), 'recomputeDerived'] },
      },
    },
  },
});
