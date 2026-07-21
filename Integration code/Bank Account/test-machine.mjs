import { createActor } from 'xstate';
import { bankAccountsMachine } from './bankAccountsMachine.js';

const actor = createActor(bankAccountsMachine);
actor.subscribe(() => {});
actor.start();
function ctx() { return actor.getSnapshot().context; }

console.log('=== Always visible (no eligibility gate to test — confirmed absent in source) ===');
console.log('ui.visibility exists without any stepEligible field:', 'stepEligible' in ctx().ui.visibility === false, '(expect true — this step has no gate)');

console.log('\n=== Add/remove rows ===');
actor.send({ type: 'ADD_BANK_ROW' });
actor.send({ type: 'ADD_BANK_ROW' });
console.log('bank_accounts.length:', ctx().bank_accounts.length, '(expect 2)');

console.log('\n=== Account type -> conditional field visibility ===');
console.log('row[0] default type:', ctx().bank_accounts[0].account_type, '(expect SAVINGS)');
console.log('row[0] visibility:', ctx().ui.visibility.rows[0]);
actor.send({ type: 'UPDATE_BANK_TYPE', index: 0, value: 'NRO' });
console.log('row[0] visibility after NRO:', ctx().ui.visibility.rows[0]);
console.log('showNroPanel (NRO row present)?', ctx().ui.visibility.showNroPanel, '(expect true)');

console.log('\n=== NRO repatriation panel: null when no NRO row, populated when present ===');
actor.send({ type: 'UPDATE_NRO_REPATRIATION', field: 'cumulative_repatriated_usd_this_fy_raw', value: '50000' });
actor.send({ type: 'UPDATE_NRO_REPATRIATION', field: 'pending_repatriation_inr_raw', value: '1000000' });
actor.send({ type: 'UPDATE_NRO_REPATRIATION', field: 'tds_deducted_on_nro_balance', value: true });
console.log('computedNroRepatriation:', ctx().ui.computedNroRepatriation);
actor.send({ type: 'UPDATE_BANK_TYPE', index: 0, value: 'SAVINGS' });
console.log('computedNroRepatriation after removing the only NRO row (should be null, even though raw inputs remain):', ctx().ui.computedNroRepatriation);
console.log('raw inputs still retained though?', ctx().nro_repatriation_inputs);
actor.send({ type: 'UPDATE_BANK_TYPE', index: 0, value: 'NRO' });

console.log('\n=== The interest-rate truncation bug (faithfully preserved) ===');
actor.send({ type: 'UPDATE_BANK_FIELD', index: 0, field: 'annual_interest_rate_raw', value: '3.5' });
console.log('computed annual_interest_rate for "3.5"%:', ctx().ui.computedAccounts[0].annual_interest_rate, '(expect 0.03 — the bug: parseInt("3.5")=3, then 3/100=0.03, the .5 is lost)');
actor.send({ type: 'UPDATE_BANK_FIELD', index: 0, field: 'annual_interest_rate_raw', value: '4' });
console.log('computed annual_interest_rate for "4" (no decimal)%:', ctx().ui.computedAccounts[0].annual_interest_rate, '(expect 0.04, works correctly without a decimal)');

console.log('\n=== Per-account-type computed field presence ===');
console.log('row[0] (NRO) computed account has nro_balance key?', 'nro_balance' in ctx().ui.computedAccounts[0], '(expect true)');
console.log('row[0] (NRO) computed account has account_conversion_date key?', 'account_conversion_date' in ctx().ui.computedAccounts[0], '(expect false)');
actor.send({ type: 'UPDATE_BANK_TYPE', index: 0, value: 'NRE' });
actor.send({ type: 'UPDATE_BANK_FIELD', index: 0, field: 'account_conversion_date', value: '2025-06-01' });
console.log('after switching to NRE: has account_conversion_date key?', 'account_conversion_date' in ctx().ui.computedAccounts[0], 'has nro_balance key?', 'nro_balance' in ctx().ui.computedAccounts[0], '(expect true, false)');

console.log('\n=== Mock bank statement upload ===');
actor.send({ type: 'START_BANK_UPLOAD', index: 1 });
console.log('_upload right after start:', ctx().bank_accounts[1]._upload, '(expect scanning)');
await new Promise((r) => setTimeout(r, 1700));
console.log('_upload after delay:', ctx().bank_accounts[1]._upload, '(expect success)');
console.log('row[1] after mock extraction:', ctx().bank_accounts[1]);
console.log('showNroBalance visibility for row[1] (mock sets type NRO)?', ctx().ui.visibility.rows[1].showNroBalance, '(expect true)');

console.log('\n=== US person tri-state field ===');
actor.send({ type: 'UPDATE_BANK_FIELD', index: 0, field: 'us_person_certified_to_bank', value: true });
console.log('us_person_certified_to_bank:', ctx().ui.computedAccounts[0].us_person_certified_to_bank, '(expect true)');

console.log('\n=== Remove a row ===');
actor.send({ type: 'REMOVE_BANK_ROW', index: 1 });
console.log('bank_accounts.length:', ctx().bank_accounts.length, '(expect 1)');

console.log('\n=== Navigation-target resolution (not visibility) ===');
actor.send({ type: 'SET_RESIDENCY_LOCK', value: 'NR' });
console.log('backTarget (NR):', ctx().ui.backTarget, '(expect step-compliance)');
actor.send({ type: 'SET_RESIDENCY_LOCK', value: 'ROR' });
console.log('backTarget (ROR):', ctx().ui.backTarget, '(expect step-fa)');
actor.send({ type: 'SET_RESIDENCY_LOCK', value: 'RNOR' });
console.log('backTarget (RNOR):', ctx().ui.backTarget, '(expect step-profile)');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'individual' });
console.log('nextTarget (individual):', ctx().ui.nextTarget, '(expect step-salary)');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'company' });
console.log('nextTarget (company):', ctx().ui.nextTarget, '(expect step-hp)');

console.log('\nBank Accounts machine test completed without throwing.');
actor.stop();
