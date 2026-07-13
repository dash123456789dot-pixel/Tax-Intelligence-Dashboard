import { deriveAll } from './derive.js';

const base = {
  entity_type: 'individual',
  residency_detail: {
    live_tracking_active: false,
    trips: [{ arrival_date: null, departure_date: null }],
    manual_days: 182,
    is_wholly_outside_india: null,
    is_indian_company: null,
    is_poem_in_india: null,
    days_in_india_current_year: 182,
    days_in_india_preceding_4_years_gte_365: null,
    employment_or_crew_status: null,
    is_departure_year: null,
    ship_nationality: null,
    came_on_visit_to_india_pio_citizen: null,
    nr_years_last_10_gte_9: null,
    days_in_india_last_7_years_lte_729: null,
    india_source_income_above_15l: null,
    liable_to_tax_in_another_country_being_indian_citizen: false,
    final_india_residency_status: 'ROR',
  },
  company_residency: {
    is_active_business: false,
    board_meetings_primarily_outside_india: false,
    key_management_location: '',
    management_delegated_outside_india: false,
    directors_in_india_count: 0,
    directors_outside_india_count: 0,
  },
  dtaa: { dtaa_treaty_residence: 'none', dtaa_forced_nr: false, tb_home: 'none', tb_cvi: 'none', tb_abode: 'none', tb_nationality: 'none' },
  external: { is_us_domestic_resident: false },
};

function run(label, ctx) {
  const out = deriveAll(ctx, new Date('2026-01-15T00:00:00+05:30'));
  console.log(label, '=>', out.ui.cert.status, '|', out.ui.cert.path);
}

// 1. 182 days default, nr9/d7 unset -> falls through to default status per initial branch (nr9 not false/false, not true) -> RNOR-2
run('Default 182 days, nr9/d7 null', base);

// 2. Standard resident ROR
run('ROR standard', {
  ...base,
  residency_detail: { ...base.residency_detail, nr_years_last_10_gte_9: false, days_in_india_last_7_years_lte_729: false },
});

// 3. Pure NR, <60 days
run('NR <60 days', {
  ...base,
  residency_detail: { ...base.residency_detail, manual_days: 30, days_in_india_current_year: 30, india_source_income_above_15l: false },
});

// 4. Company - Indian company always ROR
run('Company Indian', { ...base, entity_type: 'company', residency_detail: { ...base.residency_detail, is_indian_company: true } });

// 5. Company - foreign, POEM outside -> NR
run('Company Foreign POEM-outside', {
  ...base,
  entity_type: 'company',
  residency_detail: { ...base.residency_detail, is_indian_company: false },
  company_residency: { ...base.company_residency, key_management_location: 'outside_india' },
});

// 6. HUF wholly outside -> NR
run('HUF wholly outside', { ...base, entity_type: 'huf', residency_detail: { ...base.residency_detail, is_wholly_outside_india: true } });

// 7. Tie-breaker -> US wins -> forces NR
const tieOut = deriveAll({
  ...base,
  residency_detail: { ...base.residency_detail, nr_years_last_10_gte_9: false, days_in_india_last_7_years_lte_729: false },
  dtaa: { ...base.dtaa, tb_home: 'us' },
}, new Date('2026-01-15T00:00:00+05:30'));
console.log('Tie-breaker US wins =>', tieOut.ui.cert.status, '|', tieOut.ui.cert.path, '| tieBreaker.winner=', tieOut.ui.tieBreaker.winner);

// 8. Live tracking days calc
const liveCtx = {
  ...base,
  residency_detail: {
    ...base.residency_detail,
    manual_days: 0,
    live_tracking_active: true,
    trips: [{ arrival_date: '2025-06-01', departure_date: '2025-08-30' }],
  },
};
const liveOut = deriveAll(liveCtx, new Date('2026-01-15T00:00:00+05:30'));
console.log('Live days total =>', liveOut.residency_detail.days_in_india_current_year, '(expect 91)');

// 9. Visibility check individual, days>=182
const visOut = deriveAll(base, new Date('2026-01-15T00:00:00+05:30'));
console.log('Visibility (182 days individual) => divNr9:', visOut.ui.visibility.divNr9, 'divP4y:', visOut.ui.visibility.divP4y);

console.log('\nAll smoke tests ran without throwing.');
