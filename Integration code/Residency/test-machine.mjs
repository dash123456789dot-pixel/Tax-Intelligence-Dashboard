import { createActor } from 'xstate';
import { residencyMachine } from './residencyMachine.js';

const actor = createActor(residencyMachine);
actor.subscribe((snapshot) => {
  const { entity_type, residency_detail, ui } = snapshot.context;
  console.log(
    `[state=${snapshot.value}] entity=${entity_type} days=${residency_detail.days_in_india_current_year} status=${ui.cert?.status} path="${ui.cert?.path}"`
  );
});
actor.start();

// Individual, default context -> should already have a derived status
console.log('--- initial ---');

// Move to >=182 days, ROR
actor.send({ type: 'UPDATE_RESIDENCY_FIELD', field: 'nr_years_last_10_gte_9', value: false });
actor.send({ type: 'UPDATE_RESIDENCY_FIELD', field: 'days_in_india_last_7_years_lte_729', value: false });
console.log('divNr9 visible?', actor.getSnapshot().context.ui.visibility.divNr9);
console.log('divD7 visible?', actor.getSnapshot().context.ui.visibility.divD7);

// Switch to company entity + foreign + POEM outside -> NR
console.log('--- switch to company ---');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'company' });
actor.send({ type: 'UPDATE_RESIDENCY_FIELD', field: 'is_indian_company', value: false });
actor.send({ type: 'UPDATE_COMPANY_RESIDENCY', field: 'key_management_location', value: 'outside_india' });
console.log('divCompanyResidency visible?', actor.getSnapshot().context.ui.visibility.divCompanyResidency);
console.log('divCrKmpLoc visible?', actor.getSnapshot().context.ui.visibility.divCrKmpLoc);

// Switch to HUF
console.log('--- switch to HUF ---');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'huf' });
actor.send({ type: 'UPDATE_RESIDENCY_FIELD', field: 'is_wholly_outside_india', value: false });
console.log('divKartaAlert visible?', actor.getSnapshot().context.ui.visibility.divKartaAlert);
console.log('divHufNr9 visible?', actor.getSnapshot().context.ui.visibility.divHufNr9);

// HUF-specific inverted setter
actor.send({ type: 'UPDATE_HUF_NR9', value: true }); // "resident in >=2 of 10" = true -> nr_years_last_10_gte_9 should become false
console.log('nr_years_last_10_gte_9 after UPDATE_HUF_NR9(true):', actor.getSnapshot().context.residency_detail.nr_years_last_10_gte_9);

// Trips / live tracking
console.log('--- trips ---');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'individual' });
actor.send({ type: 'SET_MANUAL_DAYS', value: '0' });
actor.send({ type: 'TOGGLE_LIVE_TRACKING', value: true });
actor.send({ type: 'UPDATE_TRIP_DATE', index: 0, field: 'arrival_date', value: '2025-06-01' });
actor.send({ type: 'UPDATE_TRIP_DATE', index: 0, field: 'departure_date', value: '2025-08-30' });
console.log('days_in_india_current_year (live only):', actor.getSnapshot().context.residency_detail.days_in_india_current_year);
actor.send({ type: 'ADD_TRIP' });
console.log('trip count after ADD_TRIP:', actor.getSnapshot().context.residency_detail.trips.length);
actor.send({ type: 'REMOVE_TRIP', index: 1 });
console.log('trip count after REMOVE_TRIP:', actor.getSnapshot().context.residency_detail.trips.length);

// Tie-breaker wizard
console.log('--- tie breaker ---');
actor.send({ type: 'SET_TIE_BREAKER', field: 'home', value: 'both' });
console.log('showCvi?', actor.getSnapshot().context.ui.tieBreaker.showCvi);
actor.send({ type: 'SET_TIE_BREAKER', field: 'cvi', value: 'us' });
console.log('winner?', actor.getSnapshot().context.ui.tieBreaker.winner, 'final status:', actor.getSnapshot().context.ui.cert.status);

console.log('\nMachine test completed without throwing.');
actor.stop();
