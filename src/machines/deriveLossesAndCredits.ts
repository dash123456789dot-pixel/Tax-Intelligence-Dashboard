export interface LossRecord {
  id: string;
  fy: string | null;
  amount_inr: number | null;
  was_filed_before_due_date: boolean;
  attributable_to_additional_dep_inr: number | null;
  is_eligible: boolean;
  final_allowed_amount_inr: number;
}

export interface LossesAndCreditsContext {
  // Inputs/Outputs mapped from outside
  tax_regime: 'OLD' | 'NEW';
  entity_type: string;
  residency_status: string; // e.g. ROR, RNOR
  age: number | null;
  has_business_income: boolean;

  // Carry Forward Losses
  has_brought_forward_losses: boolean | null;
  s79_shareholding_change: boolean | null;
  business_loss_cf: LossRecord[];
  speculative_loss_cf: LossRecord[];
  stcg_loss_cf: LossRecord[];
  ltcg_loss_cf: LossRecord[];
  house_property_loss_cf: LossRecord[];

  // Unabsorbed Depreciation
  unabsorbed_depreciation_cf: number | null;
  unabsorbed_depreciation_attributable_to_additional_dep_inr: number | null;

  // Tax Credits
  tds_already_deducted_inr: number | null;
  form_26as_uploaded: boolean;

  // Simulator
  simulator_active: boolean;
  sim_salary: number | null;
  sim_business: number | null;
  sim_cg: number | null;
  sim_cg_quarter: string; // '1', '2', '3', '4'
  sim_other: number | null;

  // Advance Tax Payments
  advance_tax_q1_15jun_inr: number | null;
  advance_tax_q2_15sep_inr: number | null;
  advance_tax_q3_15dec_inr: number | null;
  advance_tax_q4_15mar_inr: number | null;
}

export function syncLossState(context: LossesAndCreditsContext): LossesAndCreditsContext {
  const regime = context.tax_regime;
  const newCtx = { ...context };

  const categories: (keyof LossesAndCreditsContext)[] = [
    'business_loss_cf',
    'speculative_loss_cf',
    'stcg_loss_cf',
    'ltcg_loss_cf',
    'house_property_loss_cf'
  ];

  for (const cat of categories) {
    const records = (newCtx[cat] as LossRecord[]) || [];
    (newCtx as any)[cat] = records.map(record => {
      let isEligible = true;
      const filedOnTime = cat === 'house_property_loss_cf' || record.was_filed_before_due_date;
      
      if (!filedOnTime) isEligible = false;

      let finalAllowedAmt = record.amount_inr || 0;

      if (regime === 'NEW') {
        if (cat === 'house_property_loss_cf') {
          finalAllowedAmt = 0; // Bypasses BFLA entirely
        } else if (cat === 'business_loss_cf') {
          const addDep = record.attributable_to_additional_dep_inr || 0;
          finalAllowedAmt = Math.max(0, finalAllowedAmt - addDep);
        }
      }

      return {
        ...record,
        is_eligible: isEligible,
        final_allowed_amount_inr: isEligible ? finalAllowedAmt : 0
      } as LossRecord;
    }) as any;
  }

  return syncUnabsorbedDepWarnings(newCtx);
}

export function syncUnabsorbedDepWarnings(context: LossesAndCreditsContext): LossesAndCreditsContext {
  const regime = context.tax_regime;
  const newCtx = { ...context };

  if (regime !== 'NEW') {
    newCtx.unabsorbed_depreciation_attributable_to_additional_dep_inr = null;
  }
  return newCtx;
}

export function isS207Exempt(context: LossesAndCreditsContext): boolean {
  if (!context.age || context.age < 60) return false;
  if (context.residency_status !== 'ROR' && context.residency_status !== 'RNOR') return false;
  if (context.has_business_income) return false;
  return true;
}
