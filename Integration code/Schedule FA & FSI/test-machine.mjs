import { createActor } from 'xstate';
import { foreignAssetsMachine } from './foreignAssetsMachine.js';

const actor = createActor(foreignAssetsMachine);
actor.subscribe(() => {});
actor.start();
function ctx() { return actor.getSnapshot().context; }

console.log('=== Combined eligibility gate (ROR/RNOR AND setup_international) ===');
console.log('initial (ROR, intl unchecked):', ctx().ui.visibility.stepEligible, '(expect false)');
actor.send({ type: 'SET_SETUP_INTERNATIONAL', value: true });
console.log('after intl checked (still ROR):', ctx().ui.visibility.stepEligible, '(expect true)');
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'NR' });
console.log('after residency->NR (intl still checked):', ctx().ui.visibility.stepEligible, '(expect false — NR not allowed)');
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'RNOR' });
console.log('after residency->RNOR:', ctx().ui.visibility.stepEligible, '(expect true)');

console.log('\n=== Foreign assets tri-state gate ===');
actor.send({ type: 'TOGGLE_FOREIGN_ASSETS', value: true });
console.log('showContainer/showIncomeGate/showBmaWarning (true):', ctx().ui.visibility.showContainer, ctx().ui.visibility.showIncomeGate, ctx().ui.visibility.showBmaWarning, '(expect true true false)');

actor.send({ type: 'ADD_FA_ROW' });
actor.send({ type: 'ADD_FA_ROW' });
console.log('assets.length:', ctx().foreign_assets.assets.length, '(expect 2)');

actor.send({ type: 'TOGGLE_FOREIGN_ASSETS', value: false });
console.log('showContainer/showIncomeGate/showBmaWarning (false):', ctx().ui.visibility.showContainer, ctx().ui.visibility.showIncomeGate, ctx().ui.visibility.showBmaWarning, '(expect false false true)');
console.log('assets.length after false (should clear):', ctx().foreign_assets.assets.length, '(expect 0)');
console.log('has_received_foreign_income (force-reset to false):', ctx().lrs_outbound.has_received_foreign_income, '(expect false)');

console.log('\n=== Row: category change + head_of_income side effect ===');
actor.send({ type: 'TOGGLE_FOREIGN_ASSETS', value: true });
actor.send({ type: 'ADD_FA_ROW' });
actor.send({ type: 'UPDATE_FA_CATEGORY', index: 0, value: 'salary' });
console.log('category=salary -> head_of_income:', ctx().foreign_assets.assets[0].head_of_income, '(expect salary)');
console.log('showAssetDetails (pure income category)?', ctx().ui.visibility.rows[0].showAssetDetails, '(expect false)');
actor.send({ type: 'UPDATE_FA_CATEGORY', index: 0, value: 'bank' });
console.log('category=bank -> head_of_income (should be untouched, still salary from before)?', ctx().foreign_assets.assets[0].head_of_income, '(expect salary, unchanged)');
console.log('showAssetDetails (asset category)?', ctx().ui.visibility.rows[0].showAssetDetails, '(expect true)');

console.log('\n=== Row: status + proceeds side effect ===');
actor.send({ type: 'UPDATE_FA_FIELD', index: 0, field: 'gross_proceeds', value: '500000' });
console.log('gross_proceeds set while holding:', ctx().foreign_assets.assets[0].gross_proceeds, '(expect 500000, no gate on direct field write)');
actor.send({ type: 'UPDATE_FA_STATUS', index: 0, value: 'sold' });
console.log('showProceeds (sold)?', ctx().ui.visibility.rows[0].showProceeds, '(expect true)');
actor.send({ type: 'UPDATE_FA_STATUS', index: 0, value: 'holding' });
console.log('gross_proceeds after switching back to holding (should clear):', ctx().foreign_assets.assets[0].gross_proceeds, '(expect null)');

console.log('\n=== Row: DTAA toggle side effect ===');
actor.send({ type: 'UPDATE_FA_FIELD', index: 0, field: 'tin', value: 'AB1234567' });
actor.send({ type: 'UPDATE_FA_FIELD', index: 0, field: 'dtaa_article', value: '12' });
console.log('tin/article set:', ctx().foreign_assets.assets[0].tin, ctx().foreign_assets.assets[0].dtaa_article);
actor.send({ type: 'TOGGLE_FA_DTAA', index: 0, value: true });
console.log('showDtaaFields (checked)?', ctx().ui.visibility.rows[0].showDtaaFields, '(expect true)');
actor.send({ type: 'TOGGLE_FA_DTAA', index: 0, value: false });
console.log('tin/article after unchecking (should clear):', ctx().foreign_assets.assets[0].tin, ctx().foreign_assets.assets[0].dtaa_article, '(expect null null)');

console.log('\n=== Row: FTC computation ===');
actor.send({ type: 'UPDATE_FA_FIELD', index: 0, field: 'income_foreign', value: '1000' });
actor.send({ type: 'UPDATE_FA_FIELD', index: 0, field: 'tax_foreign', value: '150' });
actor.send({ type: 'UPDATE_FA_FIELD', index: 0, field: 'conversion_rate', value: '83.5' });
console.log('income_inr/tax_inr:', ctx().foreign_assets.assets[0].income_inr, ctx().foreign_assets.assets[0].tax_inr, '(expect 83500, 12525)');

console.log('\n=== FSI section visibility (has_received_foreign_income tri-state) ===');
actor.send({ type: 'TOGGLE_RECEIVED_FOREIGN_INCOME', value: null });
console.log('showFsiSections (null, default true)?', ctx().ui.visibility.showFsiSections, '(expect true)');
actor.send({ type: 'TOGGLE_RECEIVED_FOREIGN_INCOME', value: false });
console.log('showFsiSections (false)?', ctx().ui.visibility.showFsiSections, '(expect false)');
actor.send({ type: 'TOGGLE_RECEIVED_FOREIGN_INCOME', value: true });
console.log('showFsiWarning/showFsiSections (true)?', ctx().ui.visibility.showFsiWarning, ctx().ui.visibility.showFsiSections, '(expect true true)');

console.log('\n=== LRS TCS computation ===');
actor.send({ type: 'UPDATE_LRS_TOTAL', value: '15,00,000' });
actor.send({ type: 'UPDATE_LRS_PURPOSE', value: 'investment' });
console.log('LRS TCS (15L investment, 20% on excess of 10L = 20% of 5L = 100000):', ctx().ui.lrsTcs);
actor.send({ type: 'UPDATE_LRS_PURPOSE', value: 'education_loan' });
console.log('LRS TCS (15L education_loan, should be 0%):', ctx().ui.lrsTcs);
actor.send({ type: 'UPDATE_LRS_PURPOSE', value: 'travel' });
console.log('LRS TCS (15L travel, flat 2% from first rupee = 30000):', ctx().ui.lrsTcs);
actor.send({ type: 'UPDATE_LRS_TOTAL', value: '500000' });
actor.send({ type: 'UPDATE_LRS_PURPOSE', value: 'medical' });
console.log('LRS TCS (5L medical, below threshold, NIL):', ctx().ui.lrsTcs);

console.log('\nForeign Assets machine test completed without throwing.');
actor.stop();
