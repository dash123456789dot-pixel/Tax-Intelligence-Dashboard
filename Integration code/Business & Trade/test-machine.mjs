import { createActor } from 'xstate';
import { businessMachine } from './businessMachine.js';

const actor = createActor(businessMachine);
actor.subscribe(() => {});
actor.start();

function ctx() { return actor.getSnapshot().context; }

console.log('--- master gate ---');
actor.send({ type: 'TOGGLE_BUSINESS_MODULE', value: true });
console.log('divBusinessContainer visible?', ctx().ui.visibility.divBusinessContainer, '(expect true)');

console.log('--- nature checkboxes ---');
actor.send({ type: 'TOGGLE_BIZ_NATURE', value: 'own_business' });
console.log('nature_of_business =', ctx().business_income.nature_of_business, '(expect [own_business])');
console.log('divBusinessEntries visible?', ctx().ui.visibility.divBusinessEntries, '(expect true)');

console.log('\n=== CROSS-STEP DEPENDENCY: presumptive scheme requires ROR from Residency Solver ===');
actor.send({ type: 'ADD_BUSINESS_ENTRY' });
console.log('entry[0].nature =', ctx().business_income.business_entries[0].nature, '(expect small_business)');
let opts = ctx().ui.visibility.entryOptions[0].options;
console.log('scheme options with default context (ROR, individual):', opts.map(o => o.value));
console.log('  -> s44AD available?', opts.some(o => o.value === 's44AD'), '(expect true, since default final_india_residency_status=ROR)');

actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'presumptive_scheme', value: 's44AD' });
console.log('presumptive_scheme set to:', ctx().business_income.business_entries[0].presumptive_scheme, '(expect s44AD)');

console.log('--- now simulate Residency Solver step changing status to NR ---');
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'NR' });
console.log('presumptive_scheme after residency -> NR:', ctx().business_income.business_entries[0].presumptive_scheme, '(expect null, force-reverted)');
opts = ctx().ui.visibility.entryOptions[0].options;
console.log('scheme options now:', opts.map(o => o.label));
console.log('warnPresNri?', ctx().ui.visibility.warnPresNri, '(expect false since scheme was already reverted to null)');
console.log('s44BB now available (NR-only scheme)?', opts.some(o => o.value === 's44BB'), '(expect true)');

console.log('--- selecting s44BB now that NR ---');
actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'presumptive_scheme', value: 's44BB' });
console.log('presumptive_scheme =', ctx().business_income.business_entries[0].presumptive_scheme, '(expect s44BB)');

console.log('--- now Residency Solver flips back to ROR: s44BB should be force-reverted ---');
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'ROR' });
console.log('presumptive_scheme after ROR restore:', ctx().business_income.business_entries[0].presumptive_scheme, '(expect null, s44BB no longer valid)');

console.log('\n=== CROSS-STEP DEPENDENCY: entity_type affects eligibility ===');
actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'presumptive_scheme', value: 's44AD' });
console.log('presumptive_scheme (individual, ROR) =', ctx().business_income.business_entries[0].presumptive_scheme, '(expect s44AD)');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'company' });
console.log('presumptive_scheme after entity -> company:', ctx().business_income.business_entries[0].presumptive_scheme, '(expect null — companies cannot use s44AD)');

console.log('\n=== CROSS-STEP DEPENDENCY: Section 8 / S35AD gated by is_indian_company (Residency step) ===');
console.log('divProfSection8 (company, is_indian_company=null)?', ctx().ui.visibility.divProfSection8, '(expect false)');
actor.send({ type: 'SET_IS_INDIAN_COMPANY', value: true });
console.log('divProfSection8 (company, is_indian_company=true)?', ctx().ui.visibility.divProfSection8, '(expect true)');
console.log('divSpecialCorporateBiz?', ctx().ui.visibility.divSpecialCorporateBiz, '(expect true, ROR/non-NR company)');
actor.send({ type: 'SET_IS_INDIAN_COMPANY', value: false });
console.log('divProfSection8 (company, is_indian_company=false)?', ctx().ui.visibility.divProfSection8, '(expect false, foreign company)');

console.log('\n=== s44BBB (foreign company only) ===');
console.log('entryOptions include s44BBB?', ctx().ui.visibility.entryOptions[0].options.some(o => o.value === 's44BBB'), '(expect true, company + is_indian_company=false = foreign co)');

console.log('\n=== back to individual for remaining tests ===');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'individual' });
actor.send({ type: 'SET_IS_INDIAN_COMPANY', value: null });

console.log('--- s44AD turnover cap (>3Cr forces revert) ---');
actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'presumptive_scheme', value: 's44AD' });
actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'digital_receipts_inr', value: '35000000' });
console.log('presumptive_scheme after >3Cr turnover:', ctx().business_income.business_entries[0].presumptive_scheme, '(expect null)');
console.log('warnPresS44adIneligible:', ctx().ui.visibility.warnPresS44adIneligible);

console.log('\n--- s44ADA receipts cap ---');
actor.send({ type: 'REMOVE_BUSINESS_ENTRY', index: 0 });
actor.send({ type: 'TOGGLE_BIZ_NATURE', value: 'own_business' }); // uncheck
actor.send({ type: 'ADD_BUSINESS_ENTRY' });
actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'nature', value: 'professional' });
actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'profession_type', value: 'legal' });
actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'presumptive_scheme', value: 's44ADA' });
actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'ada_cash_receipts_inr', value: '6000000' });
console.log('presumptive_scheme after 60L all-cash receipts (>50L cash-heavy limit):', ctx().business_income.business_entries[0].presumptive_scheme, '(expect null)');

console.log('\n--- profession_type=other forces s44ADA revert ---');
actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'ada_cash_receipts_inr', value: '1000000' });
actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'presumptive_scheme', value: 's44ADA' });
console.log('presumptive_scheme before other:', ctx().business_income.business_entries[0].presumptive_scheme, '(expect s44ADA)');
actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'profession_type', value: 'other' });
console.log('presumptive_scheme after profession_type=other:', ctx().business_income.business_entries[0].presumptive_scheme, '(expect null)');

console.log('\n=== Goods Vehicles (S44AE) ===');
actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'nature', value: 'goods_transport' });
actor.send({ type: 'UPDATE_BUSINESS_ENTRY', index: 0, field: 'presumptive_scheme', value: 's44AE' });
console.log('presumptive_scheme:', ctx().business_income.business_entries[0].presumptive_scheme, '(expect s44AE)');
console.log('divPresS44ae visible?', ctx().ui.visibility.divPresS44ae, '(expect true)');
for (let i = 0; i < 11; i++) actor.send({ type: 'ADD_GOODS_VEHICLE' });
console.log('goods_vehicles.length (capped at 10):', ctx().business_income.goods_vehicles.length, '(expect 10)');
actor.send({ type: 'UPDATE_GOODS_VEHICLE', index: 0, field: 'vehicle_type', value: 'heavy' });
actor.send({ type: 'UPDATE_GOODS_VEHICLE', index: 0, field: 'gvw_tonnes', value: '15' });
console.log('vehicle[0]:', ctx().business_income.goods_vehicles[0]);

console.log('\n=== GST section ===');
console.log('gstContextNote (unregistered):', ctx().ui.gstContextNote.slice(0, 40) + '...');
actor.send({ type: 'SET_GST_STATUS', value: 'regular' });
console.log('divGstCollected implied by status=regular; gst_collected_inr initially:', ctx().business_income.gst_collected_inr);
actor.send({ type: 'UPDATE_BIZ_NUM', field: 'gst_collected_inr', value: '50,000' });
console.log('gst_collected_inr:', ctx().business_income.gst_collected_inr, '(expect 50000)');
actor.send({ type: 'SET_GST_STATUS', value: 'composition' });
console.log('gst_collected_inr after switching away from regular:', ctx().business_income.gst_collected_inr, '(expect null)');

console.log('\n=== Partner Firms ===');
actor.send({ type: 'ADD_PARTNER_FIRM' });
actor.send({ type: 'UPDATE_PARTNER_FIRM', index: 0, field: 'firm_name', value: 'ABC & Co' });
actor.send({ type: 'UPDATE_PARTNER_FIRM', index: 0, field: 'remuneration_from_entity_inr', value: '2,00,000' });
console.log('firm:', ctx().business_income.partner_firms[0]);

console.log('\n=== AMT credit expiry (regex bug fix check) ===');
actor.send({ type: 'SET_TAX_REGIME', value: 'OLD' });
actor.send({ type: 'UPDATE_BIZ_NUM', field: 'amt_credit_bf_inr', value: '500000' });
actor.send({ type: 'UPDATE_BIZ_FIELD', field: 'amt_credit_bf_origin_ay', value: 'AY 2011-12' });
console.log('amtExpiry:', ctx().ui.amtExpiry, '(expect lapsed=true since AY2011 + 15 = AY2026, and current AY per system clock)');
console.log('amtRegimeLocked?', ctx().ui.visibility.amtRegimeLocked, '(expect false, OLD regime)');
actor.send({ type: 'SET_TAX_REGIME', value: 'NEW' });
console.log('amtExpiry when regime=NEW:', ctx().ui.amtExpiry, '(expect show:false, locked)');
console.log('amtRegimeLocked?', ctx().ui.visibility.amtRegimeLocked, '(expect true)');

console.log('\nBusiness machine test completed without throwing.');
actor.stop();
