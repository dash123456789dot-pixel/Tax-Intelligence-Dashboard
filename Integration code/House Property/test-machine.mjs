import { createActor } from 'xstate';
import { housePropertyMachine } from './hpMachine.js';

const actor = createActor(housePropertyMachine);
actor.subscribe((snapshot) => {
  const { house_property, tax_regime, entity_type } = snapshot.context;
  console.log(`[state=${snapshot.value}] regime=${tax_regime} entity=${entity_type} hasHP=${house_property.has_house_property_income} properties=${house_property.properties.length}`);
});
actor.start();

console.log('--- toggle HP section on: should seed 1 property ---');
actor.send({ type: 'TOGGLE_HP_SECTION', value: true });
let ctx = actor.getSnapshot().context;
console.log('properties.length =', ctx.house_property.properties.length, '(expect 1)');
console.log('divHpSection visible?', ctx.ui.visibility.divHpSection, '(expect true)');
console.log('property[0] visibility (default SOP/NEW):', ctx.ui.visibility.properties[0]);

console.log('--- add a second property ---');
actor.send({ type: 'ADD_HOUSE_PROPERTY' });
console.log('properties.length =', actor.getSnapshot().context.house_property.properties.length, '(expect 2)');

console.log('--- switch property[0] to LOP ---');
actor.send({ type: 'UPDATE_HP_FIELD', index: 0, field: 'property_use', value: 'LOP' });
ctx = actor.getSnapshot().context;
console.log('property[0].property_use =', ctx.house_property.properties[0].property_use, '(expect LOP)');
console.log('property[0] showGavAndTax?', ctx.ui.visibility.properties[0].showGavAndTax, '(expect true)');

console.log('--- enter GAV and municipal tax ---');
actor.send({ type: 'UPDATE_HP_FIELD', index: 0, field: 'gross_annual_value_inr', value: '3,00,000' });
actor.send({ type: 'UPDATE_HP_FIELD', index: 0, field: 'municipal_taxes_paid_inr', value: '15000' });
ctx = actor.getSnapshot().context;
console.log('GAV =', ctx.house_property.properties[0].gross_annual_value_inr, '(expect 300000)');
console.log('municipal_taxes =', ctx.house_property.properties[0].municipal_taxes_paid_inr, '(expect 15000)');

console.log('--- switch back to SOP: GAV and tax should zero out ---');
actor.send({ type: 'UPDATE_HP_FIELD', index: 0, field: 'property_use', value: 'SOP' });
ctx = actor.getSnapshot().context;
console.log('GAV after SOP switch =', ctx.house_property.properties[0].gross_annual_value_inr, '(expect null)');
console.log('municipal_taxes after SOP switch =', ctx.house_property.properties[0].municipal_taxes_paid_inr, '(expect null)');
console.log('hideInterest (SOP + NEW regime)?', ctx.ui.visibility.properties[0].hideInterest, '(expect true)');

console.log('--- also enter interest fields, then confirm they clear under NEW+SOP ---');
actor.send({ type: 'UPDATE_HP_FIELD', index: 0, field: 'interest_on_borrowed_capital_inr', value: '50000' });
console.log('interest set to:', actor.getSnapshot().context.house_property.properties[0].interest_on_borrowed_capital_inr, '(expect 50000, SOP+NEW does not block setting directly, only property_use switch clears it)');
actor.send({ type: 'UPDATE_HP_FIELD', index: 0, field: 'property_use', value: 'LOP' }); // back to LOP to re-enable
actor.send({ type: 'UPDATE_HP_FIELD', index: 0, field: 'property_use', value: 'SOP' }); // switch to SOP again -> should clear interest too since regime NEW
ctx = actor.getSnapshot().context;
console.log('interest after re-toggling to SOP under NEW regime =', ctx.house_property.properties[0].interest_on_borrowed_capital_inr, '(expect null)');

console.log('--- co-owner share clamp ---');
actor.send({ type: 'UPDATE_HP_FIELD', index: 0, field: 'co_owner_share_percent', value: '150' });
console.log('co_owner_share_percent (clamped) =', actor.getSnapshot().context.house_property.properties[0].co_owner_share_percent, '(expect 100)');
actor.send({ type: 'UPDATE_HP_FIELD', index: 0, field: 'co_owner_share_percent', value: '40' });
ctx = actor.getSnapshot().context;
console.log('co_owner_share_percent =', ctx.house_property.properties[0].co_owner_share_percent, '(expect 40)');
console.log('showFinancialValuesRepresent?', ctx.ui.visibility.properties[0].showFinancialValuesRepresent, '(expect true)');

console.log('--- self-occupied-with-loan toggle visibility: NEW regime hides it ---');
console.log('showSelfOccupiedToggle (NEW regime)?', ctx.ui.visibility.properties[0].showSelfOccupiedToggle, '(expect false)');
actor.send({ type: 'SET_TAX_REGIME', value: 'OLD' });
ctx = actor.getSnapshot().context;
console.log('showSelfOccupiedToggle (OLD regime, individual)?', ctx.ui.visibility.properties[0].showSelfOccupiedToggle, '(expect true)');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'company' });
ctx = actor.getSnapshot().context;
console.log('showSelfOccupiedToggle (OLD regime, company)?', ctx.ui.visibility.properties[0].showSelfOccupiedToggle, '(expect false)');

console.log('--- remove property ---');
actor.send({ type: 'REMOVE_HOUSE_PROPERTY', index: 1 });
console.log('properties.length after remove =', actor.getSnapshot().context.house_property.properties.length, '(expect 1)');

console.log('--- toggle HP section off: should clear all properties ---');
actor.send({ type: 'TOGGLE_HP_SECTION', value: false });
console.log('properties.length after toggle off =', actor.getSnapshot().context.house_property.properties.length, '(expect 0)');

console.log('--- upload mock flow ---');
actor.send({ type: 'TOGGLE_HP_SECTION', value: true }); // reseed 1 property
actor.send({ type: 'HP_UPLOAD_START', index: 0, slot: 'loan' });
console.log('upload status right after start:', actor.getSnapshot().context.house_property.properties[0]._uploads.loan, '(expect scanning)');

await new Promise((resolve) => setTimeout(resolve, 2200));
console.log('upload status after delay:', actor.getSnapshot().context.house_property.properties[0]._uploads.loan, '(expect success)');

console.log('\nHouse Property machine test completed without throwing.');
actor.stop();
