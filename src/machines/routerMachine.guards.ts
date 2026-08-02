import type { RouterContext, RouterDerived, JurisdictionResult } from './routerMachine.types';

// Show logic based on jurisdiction and entity choices
export const isIndividualPath = (ctx: RouterContext): boolean => {
  return ctx.us_entity_type === 'individual' || ctx.india_entity_type === 'individual';
};

export const hasUsBusiness = (ctx: RouterContext): boolean => {
  return ctx.us_entity_type !== null && ctx.us_entity_type !== 'individual';
};

export const hasIndiaBusiness = (ctx: RouterContext): boolean => {
  return ctx.india_entity_type !== null && ctx.india_entity_type !== 'individual';
};

// India flag
export const indiaFlag = (ctx: RouterContext): boolean => {
  if (ctx.india_entity_type && ctx.india_entity_type !== 'individual') {
    return true; // Business entity immediately flags
  }
  // Otherwise check individual conditions
  return ctx.is_indian_citizen === true ||
         ctx.is_pio_or_oci === true ||
         (ctx.india_days !== null && ctx.india_days > 0) ||
         ctx.has_india_source_income_or_assets === true;
};

// US flag
export const usFlag = (ctx: RouterContext): boolean => {
  if (ctx.us_entity_type && ctx.us_entity_type !== 'individual') {
    return true; // Business entity immediately flags
  }
  return ctx.is_us_citizen === true ||
         ctx.has_green_card === true ||
         (ctx.was_in_us_this_year === true && ctx.us_days !== null && ctx.us_days > 0) ||
         ctx.has_us_source_income_or_assets === true;
};

// Active question list builder
export const buildActiveQuestions = (ctx: RouterContext): string[] => {
  const list: string[] = [];
  
  // 1. Jurisdiction Selection
  list.push('primary_jurisdiction');
  
  if (!ctx.primary_jurisdiction) return list;

  if (ctx.primary_jurisdiction === 'us' || ctx.primary_jurisdiction === 'cross_border') {
    list.push('us_entity_type');
  }

  if (ctx.primary_jurisdiction === 'india' || ctx.primary_jurisdiction === 'cross_border') {
    list.push('india_entity_type');
  }

  // Evaluate if individual path
  const isIndividual = isIndividualPath(ctx);
  const isUsBusiness = hasUsBusiness(ctx);
  const isIndiaBusiness = hasIndiaBusiness(ctx);

  list.push('base_tax_year');

  if (isIndividual) {
    list.push('full_name');
    list.push('date_of_birth');

    if (ctx.india_entity_type === 'individual') {
      list.push('is_indian_citizen');
      if (ctx.is_indian_citizen === false) {
        list.push('is_pio_or_oci');
      }
      list.push('india_days');
      list.push('has_india_source_income_or_assets');
    }

    if (ctx.us_entity_type === 'individual') {
      list.push('is_us_citizen');
      if (ctx.is_us_citizen === false) {
        list.push('has_green_card');
      }
      list.push('was_in_us_this_year');
      if (ctx.was_in_us_this_year === true) {
        list.push('us_days');
      }
      list.push('has_us_source_income_or_assets');
    }

    if (ctx.india_entity_type === 'individual' && ctx.is_indian_citizen === true) {
      list.push('liable_to_tax_in_another_country');
      list.push('left_india_for_employment_this_year');
    }
    
    // Personal tax IDs
    list.push('personal_tax_ids');
  }

  // Business details
  if (isUsBusiness) {
    list.push('us_business_demographics');
    list.push('us_business_tax_ids');
  }

  if (isIndiaBusiness) {
    list.push('india_business_demographics');
    list.push('india_business_tax_ids');
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

  return { 
    india_flag: india, 
    us_flag: us, 
    jurisdiction
  };
};
