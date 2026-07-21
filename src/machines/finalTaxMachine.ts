import { setup, assign } from 'xstate';
import { FinalTaxContext } from './deriveFinalTax';

type FinalTaxEvent =
  | { type: 'COPY_PAYLOAD' };

export const finalTaxMachine = setup({
  types: {
    context: {} as FinalTaxContext,
    events: {} as FinalTaxEvent,
    input: {} as FinalTaxContext,
  },
  actions: {
    copyPayloadToClipboard: (params) => {
      if (params.context.raw_json_payload) {
        const payloadStr = JSON.stringify(params.context.raw_json_payload, null, 2);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(payloadStr).then(() => {
            alert("📋 Compliance JSON payload copied to clipboard successfully!");
          }).catch((err) => {
            console.error("Failed to copy: ", err);
          });
        }
      }
    }
  }
}).createMachine({
  id: 'finalTaxMachine',
  initial: 'idle',
  context: ({ input }) => ({
    residency_status: input.residency_status || 'ROR',
    residency_path: input.residency_path || 'ROR-1 Standard',
    tax_regime: input.tax_regime || 'NEW',
    pan: input.pan || null,
    gross_salary_inr: input.gross_salary_inr || 0,
    business_income_inr: input.business_income_inr || 0,
    other_income_inr: input.other_income_inr || 0,
    taxes_paid_inr: input.taxes_paid_inr || 0,
    raw_json_payload: input.raw_json_payload || null
  }),
  states: {
    idle: {
      on: {
        COPY_PAYLOAD: {
          actions: ['copyPayloadToClipboard']
        }
      }
    }
  }
});
