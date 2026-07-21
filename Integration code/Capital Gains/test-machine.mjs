import { createActor } from 'xstate';
import { capitalGainsMachine } from './capitalGainsMachine.js';

const actor = createActor(capitalGainsMachine);
actor.subscribe(() => {});
actor.start();
function ctx() { return actor.getSnapshot().context; }

console.log('=== Disconnected master gate ===');
actor.send({ type: 'TOGGLE_CG_SECTION', value: true });
console.log('cg_section_gate_open:', ctx().cg_section_gate_open, '| has_capital_gains (should be untouched):', ctx().has_capital_gains, '(expect true, false)');
console.log('divCgSection visible?', ctx().ui.visibility.divCgSection, '(expect true)');

console.log('\n=== Property module ===');
actor.send({ type: 'TOGGLE_PROPERTY_MODULE', value: 'true' });
console.log('properties.length after enabling (should auto-seed 1):', ctx().property.properties.length, '(expect 1)');

actor.send({ type: 'UPDATE_PROPERTY', index: 0, field: 'sale_consideration', value: '50,00,000' });
actor.send({ type: 'UPDATE_PROPERTY', index: 0, field: 'stamp_duty_value', value: '60,00,000' });
console.log('sale_consideration:', ctx().property.properties[0].sale_consideration, '| stamp_duty_value:', ctx().property.properties[0].stamp_duty_value);
console.log('50C override (SDV > sale*1.1):', ctx().ui.propertyOverrides[0], '(expect effectiveSaleValue=6000000, show50cWarning=true)');

console.log('\n--- cross-step: Buyer TDS only for NR ---');
console.log('showBuyerTds (ROR, default)?', ctx().ui.visibility.properties[0].showBuyerTds, '(expect false)');
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'NR' });
console.log('showBuyerTds (NR)?', ctx().ui.visibility.properties[0].showBuyerTds, '(expect true)');
actor.send({ type: 'UPDATE_PROPERTY', index: 0, field: 'buyer_tan', value: 'ABCD12345E' });
console.log('buyer_tan:', ctx().property.properties[0].buyer_tan);

console.log('\n--- cross-step: exemption options restricted to Ind/HUF ---');
console.log('exemption option count (NR/individual):', ctx().ui.visibility.propertyExemptionOptions.length, '(expect all 10, individual still allowed)');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'company' });
console.log('exemption option count (company):', ctx().ui.visibility.propertyExemptionOptions.length, '(expect 6, 4 ind/huf-only options removed)');
actor.send({ type: 'SET_ENTITY_TYPE', value: 'individual' });
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'ROR' });

console.log('\n--- pre-2001 FMV visibility ---');
actor.send({ type: 'UPDATE_PROPERTY', index: 0, field: 'acquisition_date', value: '1999-05-01' });
console.log('showPre2001Fmv:', ctx().ui.visibility.properties[0].showPre2001Fmv, '(expect true)');

console.log('\n--- improvements sub-list ---');
actor.send({ type: 'ADD_IMPROVEMENT', index: 0 });
actor.send({ type: 'UPDATE_IMPROVEMENT', index: 0, impIndex: 0, field: 'improvement_cost_inr', value: '2,00,000' });
console.log('improvements:', ctx().property.properties[0].improvements);

console.log('\n=== Share Buyback module (era-based tax treatment) ===');
actor.send({ type: 'TOGGLE_BUYBACK_MODULE', value: 'true' });
actor.send({ type: 'UPDATE_BUYBACK', index: 0, field: 'buyback_date', value: '2025-01-15' });
actor.send({ type: 'UPDATE_BUYBACK', index: 0, field: 'consideration_received_inr', value: '100000' });
actor.send({ type: 'UPDATE_BUYBACK', index: 0, field: 'original_cost_inr', value: '40000' });
console.log('buyback derived (post-Oct-2024 era, dividend treatment):', ctx().ui.buybackDerived[0]);

actor.send({ type: 'UPDATE_BUYBACK', index: 0, field: 'buyback_date', value: '2026-06-01' });
actor.send({ type: 'UPDATE_BUYBACK', index: 0, field: 'original_acquisition_date', value: '2024-01-01' });
console.log('buyback derived (capital-gains era, LTCG):', ctx().ui.buybackDerived[0]);

console.log('\n=== Financial Holdings (Stocks/Crypto) ===');
actor.send({ type: 'TOGGLE_FINANCIAL_MODULE', value: 'true' });
actor.send({ type: 'UPDATE_FINANCIAL_TX', index: 0, field: 'acquisition_date', value: '2017-06-01' });
console.log('showGrandfatheringFmv (listed_equity, pre-2018)?', ctx().ui.visibility.financials[0].showGrandfatheringFmv, '(expect true)');
actor.send({ type: 'UPDATE_FINANCIAL_TX', index: 0, field: 'asset_class', value: 'nri_specified_debenture' });
console.log('showNriExitType?', ctx().ui.visibility.financials[0].showNriExitType, '(expect true)');
console.log('showGrandfatheringFmv after asset class change (should auto-clear & hide)?', ctx().ui.visibility.financials[0].showGrandfatheringFmv, ctx().financial_holdings.transactions[0].fmv_31jan2018_per_unit_inr);
actor.send({ type: 'UPDATE_FINANCIAL_TX', index: 0, field: 'is_specified_foreign_exchange_asset', value: true });
actor.send({ type: 'UPDATE_FINANCIAL_TX', index: 0, field: 'investment_income_this_year', value: '5000' });
console.log('SFEA + investment income:', ctx().financial_holdings.transactions[0].is_specified_foreign_exchange_asset, ctx().financial_holdings.transactions[0].investment_income_this_year);
actor.send({ type: 'UPDATE_FINANCIAL_TX', index: 0, field: 'status', value: 'holding' });
console.log('after switching to holding, sale fields cleared:', ctx().financial_holdings.transactions[0].sale_value, ctx().financial_holdings.transactions[0].sale_date);

console.log('\n=== Commodities ===');
actor.send({ type: 'TOGGLE_COMMODITY_MODULE', value: 'true' });
actor.send({ type: 'UPDATE_COMMODITY', index: 0, field: 'commodity_type', value: 'sovereign_gold_bond_original' });
console.log('showSgbMaturityToggle (sold, SGB original)?', ctx().ui.visibility.commodities[0].showSgbMaturityToggle, '(expect true)');
actor.send({ type: 'UPDATE_COMMODITY', index: 0, field: 'is_maturity_redemption', value: true });
actor.send({ type: 'UPDATE_COMMODITY', index: 0, field: 'status', value: 'holding' });
console.log('is_maturity_redemption after switching to holding (should reset false):', ctx().commodities.transactions[0].is_maturity_redemption);

console.log('\n=== Unlisted Equity (cross-step: NR gates FEMA fields) ===');
actor.send({ type: 'TOGGLE_UNLISTED_MODULE', value: 'true' });
console.log('showNrFields (ROR)?', ctx().ui.visibility.unlisted[0].showNrFields, '(expect false)');
actor.send({ type: 'SET_RESIDENCY_STATUS', value: 'NR' });
console.log('showNrFields (NR)?', ctx().ui.visibility.unlisted[0].showNrFields, '(expect true)');
actor.send({ type: 'UPDATE_UNLISTED', index: 0, field: 'original_investment_currency', value: 'USD' });
console.log('showOrigCostField (NR + USD)?', ctx().ui.visibility.unlisted[0].showOrigCostField, '(expect true)');
actor.send({ type: 'UPDATE_UNLISTED', index: 0, field: 'original_cost_in_foreign_currency', value: '1000' });
actor.send({ type: 'UPDATE_UNLISTED', index: 0, field: 'original_investment_currency', value: 'INR' });
console.log('original_cost_in_foreign_currency after reverting to INR (should clear):', ctx().unlisted_equity.transactions[0].original_cost_in_foreign_currency, '(expect null)');

console.log('\n=== Toggle CG section off: only Property resets (matches original dead-code quirk) ===');
actor.send({ type: 'TOGGLE_CG_SECTION', value: false });
console.log('property.properties.length:', ctx().property.properties.length, '(expect 0, reset)');
console.log('share_buyback.transactions.length (should be UNCHANGED, quirk preserved):', ctx().share_buyback.transactions.length, '(expect 1)');
console.log('financial_holdings.transactions.length (should be UNCHANGED):', ctx().financial_holdings.transactions.length, '(expect 1)');

console.log('\nCapital Gains machine test completed without throwing.');
actor.stop();
