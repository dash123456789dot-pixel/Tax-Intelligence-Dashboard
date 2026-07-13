import type { RouterContext, RouterDerived, JurisdictionResult } from './routerMachine.types';

// India flag
export const indiaFlag = (ctx: RouterContext): boolean =>
  ctx.is_indian_citizen === true ||
  ctx.is_pio_or_oci === true ||
  (ctx.india_days !== null && ctx.india_days > 0) ||
  ctx.has_india_source_income_or_assets === true;

// US flag
export const usFlag = (ctx: RouterContext): boolean =>
  ctx.is_us_citizen === true ||
  ctx.has_green_card === true ||
  (ctx.was_in_us_this_year === true && ctx.us_days !== null && ctx.us_days > 0) ||
  ctx.has_us_source_income_or_assets === true;

// Jurisdiction derivations
export const isDual = (ctx: RouterContext): boolean =>
  indiaFlag(ctx) && usFlag(ctx);

export const isIndiaOnly = (ctx: RouterContext): boolean =>
  indiaFlag(ctx) && !usFlag(ctx);

export const isUsOnly = (ctx: RouterContext): boolean =>
  !indiaFlag(ctx) && usFlag(ctx);

// Question show conditions (from getQuestionsToShow logic)
export const showPioOci = (ctx: RouterContext): boolean =>
  ctx.is_indian_citizen === false;

export const showGreenCard = (ctx: RouterContext): boolean =>
  ctx.is_us_citizen === false;

export const showUsDays = (ctx: RouterContext): boolean =>
  ctx.was_in_us_this_year === true;

export const showLiableElsewhere = (ctx: RouterContext): boolean =>
  ctx.is_indian_citizen === true;

export const showEmploymentDeparture = (ctx: RouterContext): boolean =>
  ctx.is_indian_citizen === true;

export const isStatutoryDualResident = (ctx: RouterContext): boolean => {
  let isIndiaResident = false;
  if (ctx.india_days !== null && ctx.india_days >= 182) {
    isIndiaResident = true;
  } else if (ctx.india_days !== null && ctx.india_days >= 120 && ctx.is_indian_citizen && ctx.has_india_source_income_or_assets) {
    isIndiaResident = true;
  }

  let isUsResident = false;
  if (ctx.is_us_citizen || ctx.has_green_card) {
    isUsResident = true;
  } else if (ctx.us_days !== null && ctx.us_days >= 183) {
    isUsResident = true;
  }

  return isIndiaResident && isUsResident;
};

export const getTieBreakerWinner = (ctx: RouterContext): 'india' | 'us' | null => {
  if (!isStatutoryDualResident(ctx)) return null;
  if (ctx.tb_permanent_home === 'india') return 'india';
  if (ctx.tb_permanent_home === 'us') return 'us';
  if (ctx.tb_vital_interests === 'india') return 'india';
  if (ctx.tb_vital_interests === 'us') return 'us';
  if (ctx.tb_habitual_abode === 'india') return 'india';
  if (ctx.tb_habitual_abode === 'us') return 'us';
  if (ctx.tb_nationality === 'india') return 'india';
  if (ctx.tb_nationality === 'us') return 'us';
  return null;
};

// Active question list builder — replaces getQuestionsToShow()
export const buildActiveQuestions = (ctx: RouterContext): string[] => {
  const list: string[] = [];
  list.push('base_tax_year');
  list.push('full_name');
  list.push('date_of_birth');
  list.push('is_indian_citizen');
  if (showPioOci(ctx)) list.push('is_pio_or_oci');
  list.push('india_days');
  list.push('has_india_source_income_or_assets');
  list.push('is_us_citizen');
  if (showGreenCard(ctx)) list.push('has_green_card');
  list.push('was_in_us_this_year');
  if (showUsDays(ctx)) list.push('us_days');
  list.push('has_us_source_income_or_assets');
  if (showLiableElsewhere(ctx)) list.push('liable_to_tax_in_another_country');
  if (showEmploymentDeparture(ctx)) list.push('left_india_for_employment_this_year');

  if (isStatutoryDualResident(ctx)) {
    list.push('tb_permanent_home');
    if (ctx.tb_permanent_home === 'both' || ctx.tb_permanent_home === 'neither') {
      list.push('tb_vital_interests');
      if (ctx.tb_vital_interests === 'undetermined') {
        list.push('tb_habitual_abode');
        if (ctx.tb_habitual_abode === 'both' || ctx.tb_habitual_abode === 'neither') {
          list.push('tb_nationality');
        }
      }
    }
  }

  return list;
};

// Derive the full RouterDerived values from current inputs
export const deriveOutputs = (ctx: RouterContext): RouterDerived => {
  const india = indiaFlag(ctx);
  const us = usFlag(ctx);
  const jurisdiction: JurisdictionResult =
    india && us ? 'dual' :
    india && !us ? 'india_only' :
    !india && us ? 'us_only' :
    'none';
  
  const dual_resident = isStatutoryDualResident(ctx);
  const tb_winner = getTieBreakerWinner(ctx);

  return { 
    india_flag: india, 
    us_flag: us, 
    jurisdiction,
    is_statutory_dual_resident: dual_resident,
    tie_breaker_winner: tb_winner
  };
};
