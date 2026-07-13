import { createActor } from 'xstate';
import { salaryMachine } from './salaryMachine.js';

const actor = createActor(salaryMachine);
actor.subscribe((snapshot) => {
  const { salary, tax_regime, ui } = snapshot.context;
  console.log(`[state=${snapshot.value}] regime=${tax_regime} has_salary=${salary.has_salary_income} showOldRegime=${ui.visibility?.showOldRegimeFields}`);
});
actor.start();

console.log('--- toggle salary section on ---');
actor.send({ type: 'TOGGLE_SALARY_SECTION', value: true });
console.log('divSalarySection visible?', actor.getSnapshot().context.ui.visibility.divSalarySection);

console.log('--- enter gross salary (formatted string input) ---');
actor.send({ type: 'UPDATE_SALARY_NUM', field: 'gross_salary_inr', value: '12,50,000' });
console.log('gross_salary_inr =', actor.getSnapshot().context.salary.gross_salary_inr, '(expect 1250000)');

console.log('--- regime is NEW by default -> old regime fields hidden ---');
console.log('showOldRegimeFields?', actor.getSnapshot().context.ui.visibility.showOldRegimeFields, '(expect false)');

console.log('--- enter HRA fields anyway (should still just set state; UI would not render them) ---');
actor.send({ type: 'UPDATE_SALARY_NUM', field: 'hra_received_inr', value: '50000' });
console.log('hra_received_inr =', actor.getSnapshot().context.salary.hra_received_inr, '(expect 50000)');

console.log('--- switch to OLD regime -> fields become visible ---');
actor.send({ type: 'SET_TAX_REGIME', value: 'OLD' });
console.log('showOldRegimeFields?', actor.getSnapshot().context.ui.visibility.showOldRegimeFields, '(expect true)');
console.log('hra_received_inr still set?', actor.getSnapshot().context.salary.hra_received_inr, '(expect 50000, untouched since regime was already OLD... wait see next)');

console.log('--- switch back to NEW -> old regime fields cleared ---');
actor.send({ type: 'SET_TAX_REGIME', value: 'NEW' });
console.log('hra_received_inr after switch to NEW =', actor.getSnapshot().context.salary.hra_received_inr, '(expect null)');
console.log('basic_da_inr =', actor.getSnapshot().context.salary.basic_da_inr, '(expect null)');
console.log('is_metro_city =', actor.getSnapshot().context.salary.is_metro_city, '(expect false)');

console.log('--- PwD allowance toggle ---');
actor.send({ type: 'TOGGLE_PWD_ALLOWANCE', value: true });
console.log('pwdReceivedEnabled?', actor.getSnapshot().context.ui.visibility.pwdReceivedEnabled, '(expect true)');
actor.send({ type: 'UPDATE_SALARY_NESTED_NUM', objName: 'pwd_transport_allowance', field: 'allowance_received_inr', value: '3200' });
console.log('pwd allowance_received_inr =', actor.getSnapshot().context.salary.pwd_transport_allowance.allowance_received_inr, '(expect 3200)');
actor.send({ type: 'TOGGLE_PWD_ALLOWANCE', value: false });
console.log('pwd allowance_received_inr after disabling eligibility =', actor.getSnapshot().context.salary.pwd_transport_allowance.allowance_received_inr, '(expect null)');
console.log('pwdReceivedEnabled?', actor.getSnapshot().context.ui.visibility.pwdReceivedEnabled, '(expect false)');

console.log('--- ESOP rows ---');
actor.send({ type: 'ADD_ESOP_ROW' });
actor.send({ type: 'ADD_ESOP_ROW' });
console.log('esop rows after 2 adds:', actor.getSnapshot().context.salary.esop_perquisite_events.length, '(expect 2)');
actor.send({ type: 'UPDATE_ESOP_ROW', index: 0, field: 'employer_name', value: 'Acme Corp' });
console.log('row0 employer_name =', actor.getSnapshot().context.salary.esop_perquisite_events[0].employer_name, '(expect Acme Corp)');
actor.send({ type: 'REMOVE_ESOP_ROW', index: 0 });
console.log('esop rows after remove:', actor.getSnapshot().context.salary.esop_perquisite_events.length, '(expect 1)');
console.log('remaining row employer_name (should be null, was the 2nd row):', actor.getSnapshot().context.salary.esop_perquisite_events[0].employer_name);

console.log('\nSalary machine test completed without throwing.');
actor.stop();
