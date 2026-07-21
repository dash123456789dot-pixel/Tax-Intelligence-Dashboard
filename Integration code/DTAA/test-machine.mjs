import { createActor } from 'xstate';
import { dtaaMachine } from './dtaaMachine.js';

const actor = createActor(dtaaMachine);
actor.subscribe(() => {});
actor.start();
function ctx() { return actor.getSnapshot().context; }

console.log('=== Combined eligibility gate (NR AND days<180) ===');
console.log('initial (NR, days=200):', ctx().ui.visibility.stepEligible, '(expect false — days not <180 despite NR)');

actor.send({ type: 'SET_DAYS_IN_INDIA', value: 150 });
console.log('after days->150 (still NR):', ctx().ui.visibility.stepEligible, '(expect true — both conditions now hold)');

actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'ROR' });
console.log('after residency->ROR (days still 150):', ctx().ui.visibility.stepEligible, '(expect false — NR condition lost)');

actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'NR' });
actor.send({ type: 'SET_DAYS_IN_INDIA', value: 179 });
console.log('days=179, NR:', ctx().ui.visibility.stepEligible, '(expect true, boundary just under 180)');
actor.send({ type: 'SET_DAYS_IN_INDIA', value: 180 });
console.log('days=180, NR:', ctx().ui.visibility.stepEligible, '(expect false, boundary exactly at 180 is NOT eligible)');
actor.send({ type: 'SET_DAYS_IN_INDIA', value: 150 });

console.log('\n=== Country selection + US resident derivation ===');
actor.send({ type: 'SET_TAX_RESIDENCY_COUNTRY', value: 'US' });
console.log('is_us_resident_for_dtaa (US selected):', ctx().dtaa.is_us_resident_for_dtaa, '(expect true)');
actor.send({ type: 'SET_TAX_RESIDENCY_COUNTRY', value: 'SG' });
console.log('is_us_resident_for_dtaa (Singapore selected):', ctx().dtaa.is_us_resident_for_dtaa, '(expect null)');

console.log('\n=== TRC toggle + upload sub-fields (write to compliance_docs.trc) ===');
actor.send({ type: 'TOGGLE_TRC_STATUS', value: true });
console.log('divTrcUpload visible?', ctx().ui.visibility.divTrcUpload, '(expect true)');
actor.send({ type: 'UPDATE_COMP_TRC', field: 'validity_start_date', value: '2025-04-01' });
actor.send({ type: 'UPDATE_COMP_TRC', field: 'validity_end_date', value: '2026-03-31' });
actor.send({ type: 'UPDATE_COMP_TRC', field: 'document_uploaded', value: true });
console.log('compliance_docs.trc:', ctx().compliance_docs.trc);
console.log('dtaa object untouched by TRC upload (still just trc_status)?', 'document_uploaded' in ctx().dtaa, '(expect false)');

console.log('\n=== PE toggle + alert ===');
actor.send({ type: 'TOGGLE_PERMANENT_ESTABLISHMENT', value: true });
console.log('divPeAlert visible?', ctx().ui.visibility.divPeAlert, '(expect true)');

console.log('\n=== Treaty elections + India-US autofill ===');
actor.send({ type: 'ADD_ELECTION' });
actor.send({ type: 'UPDATE_ELECTION', index: 0, field: 'income_type', value: 'interest' });
console.log('election[0] after selecting interest (auto-filled rate/article):', ctx().dtaa.treaty_elections[0]);
actor.send({ type: 'UPDATE_ELECTION', index: 0, field: 'amount_inr', value: '50,000' });
console.log('election[0].amount_inr:', ctx().dtaa.treaty_elections[0].amount_inr, '(expect 50000)');

actor.send({ type: 'UPDATE_ELECTION', index: 0, field: 'income_type', value: 'dividend' });
console.log('banner for dividend row:', ctx().ui.visibility.elections[0].banner);
actor.send({ type: 'UPDATE_ELECTION', index: 0, field: 'income_type', value: 'capital_gains' });
console.log('banner for capital_gains row:', ctx().ui.visibility.elections[0].banner);
console.log('elected_rate for capital_gains (should be null, no lower rate applies):', ctx().dtaa.treaty_elections[0].elected_rate);

console.log('\n--- Auto-Fill US Rates (replaces whole list) ---');
actor.send({ type: 'AUTOFILL_US_TREATY' });
console.log('treaty_elections after auto-fill:', ctx().dtaa.treaty_elections);
console.log('showUsAutofillBtn (dead control, always hidden in original)?', ctx().ui.visibility.showUsAutofillBtn, '(expect false)');

console.log('\n--- Remove election ---');
actor.send({ type: 'REMOVE_ELECTION', index: 0 });
console.log('treaty_elections.length after remove:', ctx().dtaa.treaty_elections.length, '(expect 2)');

console.log('\n=== Cross-step: DTAA treaty residence set by Residency Solver tie-breaker ===');
actor.send({ type: 'SET_DTAA_TREATY_RESIDENCE', value: 'us' });
console.log('dtaa_treaty_residence:', ctx().dtaa.dtaa_treaty_residence, '| dtaa_forced_nr:', ctx().dtaa.dtaa_forced_nr, '(expect us, true)');

console.log('\nDTAA machine test completed without throwing.');
actor.stop();
