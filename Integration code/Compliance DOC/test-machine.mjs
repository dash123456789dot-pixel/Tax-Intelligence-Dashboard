import { createActor } from 'xstate';
import { complianceMachine } from './complianceMachine.js';

const actor = createActor(complianceMachine);
actor.subscribe(() => {});
actor.start();
function ctx() { return actor.getSnapshot().context; }

console.log('=== Step eligibility gate (NR only) ===');
console.log('initial (NR):', ctx().ui.visibility.stepEligible, '(expect true)');
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'ROR' });
console.log('after ROR:', ctx().ui.visibility.stepEligible, '(expect false)');
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'RNOR' });
console.log('after RNOR:', ctx().ui.visibility.stepEligible, '(expect false — only NR allowed here, unlike FA step)');
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'NR' });
console.log('back to NR:', ctx().ui.visibility.stepEligible, '(expect true)');

console.log('\n=== Form 41 (10F) toggle + manual entry ===');
actor.send({ type: 'TOGGLE_10F_FILED', value: true });
console.log('div10fAck visible?', ctx().ui.visibility.div10fAck, '(expect true)');
actor.send({ type: 'UPDATE_10F_ACK', value: '123456789012345' });
console.log('ack_number:', ctx().compliance_docs.form_10f.ack_number);
actor.send({ type: 'TOGGLE_10F_FILED', value: false });
console.log('div10fAck after untoggle:', ctx().ui.visibility.div10fAck, '(expect false)');
console.log('ack_number retained (no clearing side effect in original)?', ctx().compliance_docs.form_10f.ack_number, '(expect still 123456789012345)');
actor.send({ type: 'TOGGLE_10F_FILED', value: true });

console.log('\n=== Form 41 mock OCR upload ===');
actor.send({ type: 'START_10F_UPLOAD' });
console.log('_upload right after start:', ctx().compliance_docs.form_10f._upload, '(expect scanning)');
await new Promise((r) => setTimeout(r, 1700));
console.log('_upload after delay:', ctx().compliance_docs.form_10f._upload, '(expect success)');
console.log('ack_number auto-extracted (15 digits):', ctx().compliance_docs.form_10f.ack_number, 'length=', ctx().compliance_docs.form_10f.ack_number.length, '(expect 15)');

console.log('\n=== Lower TDS Certificate (S197) toggle ===');
actor.send({ type: 'TOGGLE_S197_AVAILABLE', value: true });
console.log('divS197Detail visible?', ctx().ui.visibility.divS197Detail, '(expect true)');

console.log('\n=== S197 rate field bug (faithfully preserved) ===');
actor.send({ type: 'UPDATE_S197_FIELD', field: 'rate', value: '0.05' });
console.log('rate after typing "0.05":', ctx().compliance_docs.section_197_cert.rate, '(expect 0 — the bug: parseInt stops at the decimal point)');
actor.send({ type: 'UPDATE_S197_FIELD', field: 'rate', value: '5' });
console.log('rate after typing "5" (no decimal):', ctx().compliance_docs.section_197_cert.rate, '(expect 5, works fine without a decimal point)');

console.log('\n=== S197 dates + income types ===');
actor.send({ type: 'UPDATE_S197_FIELD', field: 'validity_start_date', value: '2025-04-01' });
actor.send({ type: 'UPDATE_S197_FIELD', field: 'validity_end_date', value: '2026-03-31' });
actor.send({ type: 'TOGGLE_S197_INCOME_TYPE', value: 'DIVIDEND', checked: true });
actor.send({ type: 'TOGGLE_S197_INCOME_TYPE', value: 'ROYALTY_FTS', checked: true });
console.log('covered_income_types:', ctx().compliance_docs.section_197_cert.covered_income_types, '(expect [DIVIDEND, ROYALTY_FTS])');
actor.send({ type: 'TOGGLE_S197_INCOME_TYPE', value: 'DIVIDEND', checked: false });
console.log('after unchecking DIVIDEND:', ctx().compliance_docs.section_197_cert.covered_income_types, '(expect [ROYALTY_FTS])');

console.log('\n=== S197 mock OCR upload (auto-fills + auto-checks PROPERTY_CG/NRO_INTEREST) ===');
actor.send({ type: 'START_S197_UPLOAD' });
console.log('_upload right after start:', ctx().compliance_docs.section_197_cert._upload, '(expect scanning)');
await new Promise((r) => setTimeout(r, 1700));
console.log('_upload after delay:', ctx().compliance_docs.section_197_cert._upload, '(expect success)');
console.log('rate after mock extraction (should be 0 due to the same bug, extracted "0.03"):', ctx().compliance_docs.section_197_cert.rate, '(expect 0)');
console.log('validity dates:', ctx().compliance_docs.section_197_cert.validity_start_date, ctx().compliance_docs.section_197_cert.validity_end_date);
console.log('covered_income_types (should merge PROPERTY_CG/NRO_INTEREST with existing ROYALTY_FTS):', ctx().compliance_docs.section_197_cert.covered_income_types);

console.log('\n=== Chapter XII-A opt-in ===');
actor.send({ type: 'TOGGLE_CHAPTER_XIIA', value: true });
console.log('chapter_xiia_elected:', ctx().compliance_docs.chapter_xiia_elected, '(expect true)');

console.log('\nCompliance machine test completed without throwing.');
actor.stop();
