import { createActor } from 'xstate';
import { deductionsMachine } from './deductionsMachine.js';

const actor = createActor(deductionsMachine);
actor.subscribe(() => {});
actor.start();
function ctx() { return actor.getSnapshot().context; }

console.log('=== Step eligibility gate: OLD regime only (correcting the "always visible" premise) ===');
console.log('initial (OLD):', ctx().ui.visibility.stepEligible, '(expect true)');
actor.send({ type: 'SET_TAX_REGIME', value: 'NEW' });
console.log('after NEW:', ctx().ui.visibility.stepEligible, '(expect false)');
actor.send({ type: 'SET_TAX_REGIME', value: 'OLD' });

console.log('\n=== NRI cosmetic warnings (PPF/NSC/SSY) — values NOT cleared ===');
actor.send({ type: 'UPDATE_80C', field: 'ppf_inr', value: '50000' });
console.log('showPpfNriWarning (ROR)?', ctx().ui.visibility.showPpfNriWarning, '(expect false)');
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'NR' });
console.log('showPpfNriWarning (NR)?', ctx().ui.visibility.showPpfNriWarning, '(expect true)');
console.log('ppf_inr still retained (not cleared, just a warning)?', ctx().deductions.s80C.ppf_inr, '(expect 50000)');

console.log('\n=== Hard NRI blocks: 80DD/80DDB/80U forced off + cleared ===');
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'ROR' });
actor.send({ type: 'UPDATE_DD_BOOL', section: 's80DD', field: 'has_disabled_dependents', value: true });
actor.send({ type: 'UPDATE_DD_FIELD', section: 's80DD', field: 'disability_percentage', value: 'severe' });
console.log('80DD before NR:', ctx().deductions.s80DD);
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'NR' });
console.log('80DD after NR (should force-clear):', ctx().deductions.s80DD, '(expect has_disabled_dependents:false, disability_percentage:null, is_nri_blocked:true)');
console.log('is80DDBlocked?', ctx().ui.visibility.is80DDBlocked, '(expect true)');
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'ROR' });

console.log('\n=== 80D parents medical visibility ===');
actor.send({ type: 'UPDATE_80D_BOOL', field: 'parents_are_senior', value: true });
actor.send({ type: 'UPDATE_80D_BOOL', field: 'parents_has_health_insurance', value: false });
console.log('show80DParentsMed (senior + no insurance)?', ctx().ui.visibility.show80DParentsMed, '(expect true)');
actor.send({ type: 'UPDATE_80D_NUM', field: 'parents_medical_expenditure_inr', value: '30000' });
actor.send({ type: 'UPDATE_80D_BOOL', field: 'parents_has_health_insurance', value: true });
console.log('show80DParentsMed (has insurance now)?', ctx().ui.visibility.show80DParentsMed, '(expect false)');
console.log('parents_medical_expenditure_inr after hiding (should clear):', ctx().deductions.s80D.parents_medical_expenditure_inr, '(expect null)');

console.log('\n=== 80GG: requires salary AND no HRA (cross-step: Salary step) ===');
console.log('is80GGBlocked (no salary)?', ctx().ui.visibility.is80GGBlocked, ctx().ui.visibility.blockedReason80GG);
actor.send({ type: 'SET_HAS_SALARY_INCOME', value: true });
console.log('is80GGBlocked (salary, no HRA)?', ctx().ui.visibility.is80GGBlocked, '(expect false)');
actor.send({ type: 'UPDATE_80GG_BOOL', field: 'has_rent_paid_no_hra', value: true });
actor.send({ type: 'UPDATE_80GG_NUM', field: 'rent_paid_inr', value: '120000' });
console.log('80GG populated:', ctx().deductions.s80GG);
actor.send({ type: 'SET_HRA_RECEIVED', value: 60000 });
console.log('is80GGBlocked (HRA received now)?', ctx().ui.visibility.is80GGBlocked, ctx().ui.visibility.blockedReason80GG);
console.log('80GG force-cleared after HRA appears?', ctx().deductions.s80GG, '(expect has_rent_paid_no_hra:false, rent_paid_inr:null)');
actor.send({ type: 'SET_HRA_RECEIVED', value: null });

console.log('\n=== 80TTA/TTB derivation (residency + senior + entity) ===');
console.log('ttaSection (ROR, individual, no DOB):', ctx().ui.visibility.ttaSection, '(expect 80TTA, non-senior)');
actor.send({ type: 'SET_DATE_OF_BIRTH', value: '1950-01-01' });
console.log('ttaSection (senior individual):', ctx().ui.visibility.ttaSection, ctx().ui.visibility.show80TTAFdField, '(expect 80TTB, true)');
actor.send({ type: 'UPDATE_80TTA', field: 'fd_rd_interest_inr', value: '20000' });
actor.send({ type: 'SET_ENTITY_TYPE', value: 'huf' });
console.log('ttaSection (senior HUF, not individual):', ctx().ui.visibility.ttaSection, ctx().ui.visibility.show80TTAFdField, '(expect 80TTA, false)');
console.log('fd_rd_interest_inr force-cleared?', ctx().deductions.s80TTA_TTB.fd_rd_interest_inr, '(expect null)');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'individual' });
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'NR' });
console.log('ttaSection (NR overrides senior):', ctx().ui.visibility.ttaSection, ctx().ui.visibility.show80TTBNrWarning, '(expect 80TTA, true)');
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'ROR' });

console.log('\n=== Entity-gated special deductions ===');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'company' });
actor.send({ type: 'SET_IS_INDIAN_COMPANY', value: true });
console.log('show80IAC (company)?', ctx().ui.visibility.show80IAC, '(expect true)');
console.log('show80LA (company, not ind/huf)?', ctx().ui.visibility.show80LA, '(expect true)');
console.log('show80M (Indian company)?', ctx().ui.visibility.show80M, '(expect true)');
console.log('politicalTitle (company):', ctx().ui.visibility.politicalTitle);
console.log('show80P (dead control, always hidden)?', ctx().ui.visibility.show80P, '(expect false)');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'individual' });
actor.send({ type: 'SET_IS_INDIAN_COMPANY', value: null });
console.log('show80IAC (individual)?', ctx().ui.visibility.show80IAC, '(expect false)');
console.log('politicalTitle (individual):', ctx().ui.visibility.politicalTitle);

console.log('\n=== 80G donations: ineligible rows excluded from computed output, still rendered with warning ===');
actor.send({ type: 'ADD_80G_ROW' });
actor.send({ type: 'ADD_80G_ROW' });
actor.send({ type: 'UPDATE_80G_ROW', index: 0, field: 'donee_name', value: 'PM Relief Fund' });
actor.send({ type: 'UPDATE_80G_ROW', index: 0, field: 'donation_amount_raw', value: '50000' });
actor.send({ type: 'UPDATE_80G_ROW', index: 0, field: 'donation_mode', value: 'cheque' });
actor.send({ type: 'UPDATE_80G_ROW', index: 1, field: 'donee_name', value: 'Cash Donation Over Limit' });
actor.send({ type: 'UPDATE_80G_ROW', index: 1, field: 'donation_amount_raw', value: '5000' });
actor.send({ type: 'UPDATE_80G_ROW', index: 1, field: 'donation_mode', value: 'cash' });
console.log('raw rows count:', ctx().deductions.s80G_rows.length, '(expect 2)');
console.log('computedS80G (should only have the eligible cheque donation):', ctx().ui.computedS80G);
console.log('donationRows[1].showIneligibleWarning (cash > 2000)?', ctx().ui.visibility.donationRows[1].showIneligibleWarning, '(expect true)');

console.log('\nDeductions machine test completed without throwing.');
actor.stop();
