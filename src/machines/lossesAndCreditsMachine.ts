import { setup, assign } from 'xstate';
import { LossesAndCreditsContext, LossRecord, syncLossState } from './deriveLossesAndCredits';

export type LossesAndCreditsEvent = 
  | { type: 'TOGGLE_BF_LOSSES'; value: boolean | null }
  | { type: 'SET_S79_CHANGE'; value: boolean }
  | { type: 'ADD_LOSS_ROW'; category: string }
  | { type: 'REMOVE_LOSS_ROW'; category: string; id: string }
  | { type: 'UPDATE_LOSS_ROW'; category: string; id: string; field: keyof LossRecord; value: any }
  | { type: 'UPDATE_UNABSORBED_DEP'; field: string; value: number | null }
  | { type: 'UPDATE_CREDIT'; field: string; value: number | null }
  | { type: 'TOGGLE_26AS'; value: boolean }
  | { type: 'TOGGLE_SIMULATOR'; value: boolean }
  | { type: 'UPDATE_SIM_FIELD'; field: string; value: string | number | null }
  | { type: 'HYDRATE'; value: any };

export const lossesAndCreditsMachine = setup({
  types: {
    context: {} as LossesAndCreditsContext,
    events: {} as LossesAndCreditsEvent,
    input: {} as Partial<LossesAndCreditsContext>,
  },
  actions: {
    toggleBfLosses: assign({
      has_brought_forward_losses: ({ event }) => {
        if (event.type === 'TOGGLE_BF_LOSSES') return event.value;
        return null;
      },
      // Clear all loss arrays if false
      business_loss_cf: ({ context, event }) => event.type === 'TOGGLE_BF_LOSSES' && event.value === false ? [] : context.business_loss_cf,
      speculative_loss_cf: ({ context, event }) => event.type === 'TOGGLE_BF_LOSSES' && event.value === false ? [] : context.speculative_loss_cf,
      stcg_loss_cf: ({ context, event }) => event.type === 'TOGGLE_BF_LOSSES' && event.value === false ? [] : context.stcg_loss_cf,
      ltcg_loss_cf: ({ context, event }) => event.type === 'TOGGLE_BF_LOSSES' && event.value === false ? [] : context.ltcg_loss_cf,
      house_property_loss_cf: ({ context, event }) => event.type === 'TOGGLE_BF_LOSSES' && event.value === false ? [] : context.house_property_loss_cf,
    }),
    setS79Change: assign({
      s79_shareholding_change: ({ event }) => {
        if (event.type === 'SET_S79_CHANGE') return event.value;
        return null;
      }
    }),
    addLossRow: assign(({ context, event }) => {
      if (event.type !== 'ADD_LOSS_ROW') return {};
      const cat = event.category as keyof LossesAndCreditsContext;
      const list = (context[cat] as LossRecord[]) || [];
      const newRow: LossRecord = {
        id: 'loss-' + Date.now() + Math.random().toString(36).substring(2, 7),
        fy: null,
        amount_inr: null,
        was_filed_before_due_date: true,
        attributable_to_additional_dep_inr: null,
        is_eligible: true,
        final_allowed_amount_inr: 0
      };
      
      const newCtx = { ...context, [cat]: [...list, newRow] };
      return syncLossState(newCtx);
    }),
    removeLossRow: assign(({ context, event }) => {
      if (event.type !== 'REMOVE_LOSS_ROW') return {};
      const cat = event.category as keyof LossesAndCreditsContext;
      const list = (context[cat] as LossRecord[]) || [];
      const newCtx = { ...context, [cat]: list.filter(r => r.id !== event.id) };
      return syncLossState(newCtx);
    }),
    updateLossRow: assign(({ context, event }) => {
      if (event.type !== 'UPDATE_LOSS_ROW') return {};
      const cat = event.category as keyof LossesAndCreditsContext;
      const list = (context[cat] as LossRecord[]) || [];
      const newCtx = {
        ...context,
        [cat]: list.map(r => r.id === event.id ? { ...r, [event.field]: event.value } : r)
      };
      return syncLossState(newCtx);
    }),
    updateUnabsorbedDep: assign(({ context, event }) => {
      if (event.type !== 'UPDATE_UNABSORBED_DEP') return {};
      const newCtx = { ...context, [event.field]: event.value };
      return syncLossState(newCtx);
    }),
    updateCredit: assign({
      tds_already_deducted_inr: ({ context, event }) => event.type === 'UPDATE_CREDIT' && event.field === 'tds_already_deducted_inr' ? event.value : context.tds_already_deducted_inr,
      advance_tax_q1_15jun_inr: ({ context, event }) => event.type === 'UPDATE_CREDIT' && event.field === 'advance_tax_q1_15jun_inr' ? event.value : context.advance_tax_q1_15jun_inr,
      advance_tax_q2_15sep_inr: ({ context, event }) => event.type === 'UPDATE_CREDIT' && event.field === 'advance_tax_q2_15sep_inr' ? event.value : context.advance_tax_q2_15sep_inr,
      advance_tax_q3_15dec_inr: ({ context, event }) => event.type === 'UPDATE_CREDIT' && event.field === 'advance_tax_q3_15dec_inr' ? event.value : context.advance_tax_q3_15dec_inr,
      advance_tax_q4_15mar_inr: ({ context, event }) => event.type === 'UPDATE_CREDIT' && event.field === 'advance_tax_q4_15mar_inr' ? event.value : context.advance_tax_q4_15mar_inr,
    }),
    toggle26AS: assign({
      form_26as_uploaded: ({ event }) => event.type === 'TOGGLE_26AS' ? event.value : false
    }),
    toggleSimulator: assign({
      simulator_active: ({ event }) => event.type === 'TOGGLE_SIMULATOR' ? event.value : false
    }),
    updateSimField: assign({
      sim_salary: ({ context, event }) => event.type === 'UPDATE_SIM_FIELD' && event.field === 'sim_salary' ? (event.value as number | null) : context.sim_salary,
      sim_business: ({ context, event }) => event.type === 'UPDATE_SIM_FIELD' && event.field === 'sim_business' ? (event.value as number | null) : context.sim_business,
      sim_cg: ({ context, event }) => event.type === 'UPDATE_SIM_FIELD' && event.field === 'sim_cg' ? (event.value as number | null) : context.sim_cg,
      sim_other: ({ context, event }) => event.type === 'UPDATE_SIM_FIELD' && event.field === 'sim_other' ? (event.value as number | null) : context.sim_other,
      sim_cg_quarter: ({ context, event }) => event.type === 'UPDATE_SIM_FIELD' && event.field === 'sim_cg_quarter' ? (event.value as string) : context.sim_cg_quarter,
    }),
    hydrateContext: assign(({ context, event }) => {
      if (event.type === 'HYDRATE') {
        return { ...context, ...event.value };
      }
      return context;
    }),
  }
}).createMachine({
  id: 'lossesAndCredits',
  initial: 'idle',
  context: ({ input }) => ({
    tax_regime: input?.tax_regime || 'NEW',
    entity_type: input?.entity_type || 'individual',
    residency_status: input?.residency_status || 'ROR',
    age: input?.age || null,
    has_business_income: input?.has_business_income || false,
    has_brought_forward_losses: input?.has_brought_forward_losses ?? null,
    s79_shareholding_change: input?.s79_shareholding_change ?? null,
    business_loss_cf: input?.business_loss_cf || [],
    speculative_loss_cf: input?.speculative_loss_cf || [],
    stcg_loss_cf: input?.stcg_loss_cf || [],
    ltcg_loss_cf: input?.ltcg_loss_cf || [],
    house_property_loss_cf: input?.house_property_loss_cf || [],
    unabsorbed_depreciation_cf: input?.unabsorbed_depreciation_cf ?? null,
    unabsorbed_depreciation_attributable_to_additional_dep_inr: input?.unabsorbed_depreciation_attributable_to_additional_dep_inr ?? null,
    tds_already_deducted_inr: input?.tds_already_deducted_inr ?? null,
    advance_tax_q1_15jun_inr: input?.advance_tax_q1_15jun_inr ?? null,
    advance_tax_q2_15sep_inr: input?.advance_tax_q2_15sep_inr ?? null,
    advance_tax_q3_15dec_inr: input?.advance_tax_q3_15dec_inr ?? null,
    advance_tax_q4_15mar_inr: input?.advance_tax_q4_15mar_inr ?? null,
    form_26as_uploaded: input?.form_26as_uploaded || false,
    simulator_active: input?.simulator_active || false,
    sim_salary: input?.sim_salary ?? null,
    sim_business: input?.sim_business ?? null,
    sim_cg: input?.sim_cg ?? null,
    sim_other: input?.sim_other ?? null,
    sim_cg_quarter: input?.sim_cg_quarter || 'Q1'
  }),
  states: {
    idle: {
      on: {
        'TOGGLE_BF_LOSSES': { actions: 'toggleBfLosses' },
        'SET_S79_CHANGE': { actions: 'setS79Change' },
        'ADD_LOSS_ROW': { actions: 'addLossRow' },
        'REMOVE_LOSS_ROW': { actions: 'removeLossRow' },
        'UPDATE_LOSS_ROW': { actions: 'updateLossRow' },
        'UPDATE_UNABSORBED_DEP': { actions: 'updateUnabsorbedDep' },
        'UPDATE_CREDIT': { actions: 'updateCredit' },
        'TOGGLE_26AS': { actions: 'toggle26AS' },
        'TOGGLE_SIMULATOR': { actions: 'toggleSimulator' },
        'UPDATE_SIM_FIELD': { actions: 'updateSimField' },
        'HYDRATE': { actions: 'hydrateContext' },
      }
    }
  }
});
