import type { Layer1IndiaContext } from './layer1IndiaMachine.types';

// Corporate regimes block shows only for companies
export const showCorpRegimes = (ctx: Layer1IndiaContext): boolean =>
  ctx.profile.entity_type === 'company';

// Standard regime toggle (NEW/OLD) shows for individual/huf/aop/boi only
export const showProfileRegime = (ctx: Layer1IndiaContext): boolean =>
  ['individual', 'huf', 'aop', 'boi', 'artificial_juridical'].includes(ctx.profile.entity_type);

// Mfg date block shows when 115BAB or 115BA opted
export const showMfgDates = (ctx: Layer1IndiaContext): boolean =>
  ctx.profile.opt_115bab === true; // Note: based on layer1_step1_source_of_truth.json visible_when

// MAT book profit shows for companies
export const showMatProfit = (ctx: Layer1IndiaContext): boolean =>
  ctx.profile.entity_type === 'company';

// Presumptive warning shows for entities ineligible for s.44AD
export const showPresumptiveWarning = (ctx: Layer1IndiaContext): boolean =>
  ['company', 'llp', 'aop', 'trust'].includes(ctx.profile.entity_type);

// Live tracking panel shows when toggle is on
export const showLiveTrackingPanel = (ctx: Layer1IndiaContext): boolean =>
  ctx.residency_detail.live_tracking_active;

// Residency follow-up questions visibility — port exact gating from the source of truth JSON
export const showP4y = (ctx: Layer1IndiaContext): boolean => {
  if (ctx.profile.entity_type !== 'individual') return false;
  const days = ctx.residency_detail.days_in_india_current_year;
  return days >= 60 && days < 182;
};

export const showEmployment = (ctx: Layer1IndiaContext): boolean => {
  if (!showP4y(ctx)) return false;
  return ctx.residency_detail.days_in_india_preceding_4_years_gte_365 === true;
};

export const showVisitor = (ctx: Layer1IndiaContext): boolean => {
  if (!showEmployment(ctx)) return false;
  return ctx.residency_detail.employment_or_crew_status === 'none';
};

export const showDeparture = (ctx: Layer1IndiaContext): boolean => {
  if (!showEmployment(ctx)) return false;
  const emp = ctx.residency_detail.employment_or_crew_status;
  return emp !== 'none' && emp !== null;
};

export const showInc15 = (ctx: Layer1IndiaContext): boolean => {
  if (ctx.profile.entity_type !== 'individual') return false;
  const days = ctx.residency_detail.days_in_india_current_year;
  const p4y = ctx.residency_detail.days_in_india_preceding_4_years_gte_365;
  const emp = ctx.residency_detail.employment_or_crew_status;
  const visit = ctx.residency_detail.is_pio_or_oci; // mapped to visitor question

  if (days < 60) return true;
  if (days >= 60 && days < 182 && p4y === true) {
    if (emp === 'none' && visit === true) return true;
    if (emp !== 'none' && emp !== null) return true;
  }
  return false;
};

export const showNr9 = (ctx: Layer1IndiaContext): boolean => {
  if (ctx.profile.entity_type !== 'individual') return false;
  const days = ctx.residency_detail.days_in_india_current_year;
  return days >= 182;
};

export const showD7 = (ctx: Layer1IndiaContext): boolean => {
  if (!showNr9(ctx)) return false;
  return ctx.residency_detail.nr_years_last_10_gte_9 !== null;
};

export const showWhollyOutside = (ctx: Layer1IndiaContext): boolean =>
  ['huf', 'firm', 'aop', 'boi', 'artificial_juridical', 'local_authority'].includes(ctx.profile.entity_type);

export const showIndianCompany = (ctx: Layer1IndiaContext): boolean =>
  ctx.profile.entity_type === 'company';

export const showPoem = (ctx: Layer1IndiaContext): boolean =>
  ctx.profile.entity_type === 'company';

export const showHufD7 = (ctx: Layer1IndiaContext): boolean =>
  ctx.profile.entity_type === 'huf';

export const showHufNr9 = (ctx: Layer1IndiaContext): boolean =>
  ctx.profile.entity_type === 'huf';
