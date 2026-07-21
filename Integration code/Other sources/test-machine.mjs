import { createActor } from 'xstate';
import { otherSourcesMachine } from './otherSourcesMachine.js';

const actor = createActor(otherSourcesMachine);
actor.subscribe(() => {});
actor.start();
function ctx() { return actor.getSnapshot().context; }

console.log('=== Master gate + auto-flip quirk ===');
console.log('has_other_sources_income (initial)?', ctx().other_sources.has_other_sources_income, '(expect false)');
actor.send({ type: 'UPDATE_OS_FIELD', field: 'interest_savings_inr', value: '5000' });
console.log('has_other_sources_income after a field edit WITHOUT toggling the gate?', ctx().other_sources.has_other_sources_income, '(expect true — the quirk)');
console.log('interest_savings_inr:', ctx().other_sources.interest_savings_inr, '(expect 5000)');

console.log('\n=== Family pension auto-deduction ===');
actor.send({ type: 'UPDATE_OS_FIELD', field: 'family_pension_gross_inr', value: '90000' });
console.log('family_pension_standard_deduction_inr:', ctx().other_sources.family_pension_standard_deduction_inr, '(expect min(15000, 90000/3)=15000)');
actor.send({ type: 'UPDATE_OS_FIELD', field: 'family_pension_gross_inr', value: '30000' });
console.log('family_pension_standard_deduction_inr (gross=30000):', ctx().other_sources.family_pension_standard_deduction_inr, '(expect 10000)');

console.log('\n=== Entity-driven visibility ===');
console.log('individual visibility:', ctx().ui.visibility);

actor.send({ type: 'SET_ENTITY_TYPE', value: 'company' });
console.log('\ncompany: divAngelTax?', ctx().ui.visibility.divAngelTax, '(expect true)');
console.log('company: cardFamilyPension?', ctx().ui.visibility.cardFamilyPension, '(expect false)');
console.log('company: cardRetirement?', ctx().ui.visibility.cardRetirement, '(expect false)');

console.log('\n=== Entity-change clearing side effects ===');
actor.send({ type: 'UPDATE_OS_FIELD', field: 'angel_tax_premium_inr', value: '200000' });
console.log('angel_tax_premium_inr set (company):', ctx().other_sources.angel_tax_premium_inr, '(expect 200000)');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'individual' });
console.log('angel_tax_premium_inr after switching away from company (should clear):', ctx().other_sources.angel_tax_premium_inr, '(expect null)');

actor.send({ type: 'UPDATE_OS_FIELD', field: 'lic_maturity_inr', value: '50000' });
console.log('lic_maturity_inr set (individual):', ctx().other_sources.lic_maturity_inr, '(expect 50000)');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'company' });
console.log('lic_maturity_inr after switching to company (should clear, not ind/huf):', ctx().other_sources.lic_maturity_inr, '(expect null)');

console.log('\n=== Trust: gifts auto-zeroed + banner ===');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'individual' });
actor.send({ type: 'UPDATE_OS_FIELD', field: 'gifts_above_50k_inr', value: '75000' });
console.log('gifts_above_50k_inr (individual):', ctx().other_sources.gifts_above_50k_inr, '(expect 75000)');
console.log('showGiftsInput?', ctx().ui.visibility.showGiftsInput, 'showTrustGiftsBanner?', ctx().ui.visibility.showTrustGiftsBanner, '(expect true, false)');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'trust' });
console.log('gifts_above_50k_inr after switching to trust (should auto-zero, not null):', ctx().other_sources.gifts_above_50k_inr, '(expect 0)');
console.log('showGiftsInput?', ctx().ui.visibility.showGiftsInput, 'showTrustGiftsBanner?', ctx().ui.visibility.showTrustGiftsBanner, '(expect false, true)');

console.log('\n=== Local authority ===');
console.log('divLocalAuthority (trust)?', ctx().ui.visibility.divLocalAuthority, '(expect false)');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'local' });
console.log('divLocalAuthority (local)?', ctx().ui.visibility.divLocalAuthority, '(expect true)');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'individual' });

console.log('\n=== Cross-step: deemed dividend from buyback (Capital Gains step) ===');
console.log('deemed_dividend_from_buyback_inr (initial):', ctx().deemed_dividend_from_buyback_inr, '(expect 0)');
actor.send({ type: 'SET_DEEMED_DIVIDEND_FROM_BUYBACK', value: 250000 });
console.log('deemed_dividend_from_buyback_inr after CG step update:', ctx().deemed_dividend_from_buyback_inr, '(expect 250000)');

console.log('\n=== Agricultural income sub-section ===');
actor.send({ type: 'TOGGLE_AGRI_SECTION', value: true });
console.log('has_agricultural_income:', ctx().agricultural.has_agricultural_income, '(expect true)');
actor.send({ type: 'UPDATE_AGRI_INCOME', value: '1,20,000' });
console.log('agricultural_income_inr:', ctx().agricultural.agricultural_income_inr, '(expect 120000)');
actor.send({ type: 'TOGGLE_AGRI_SECTION', value: false });
console.log('agricultural_income_inr after disabling (should clear):', ctx().agricultural.agricultural_income_inr, '(expect null)');

console.log('\n=== Master gate toggle persists directly (unlike CG step) ===');
actor.send({ type: 'TOGGLE_OS_SECTION', value: true });
console.log('has_other_sources_income:', ctx().other_sources.has_other_sources_income, '(expect true)');
actor.send({ type: 'TOGGLE_OS_SECTION', value: false });
console.log('has_other_sources_income after toggling off:', ctx().other_sources.has_other_sources_income, '(expect false)');
console.log('divOsSection visible?', ctx().ui.visibility.divOsSection, '(expect false)');
console.log('interest_savings_inr retained (original does not clear fields on close)?', ctx().other_sources.interest_savings_inr, '(expect 5000, unchanged)');

console.log('\nOther Sources machine test completed without throwing.');
actor.stop();
