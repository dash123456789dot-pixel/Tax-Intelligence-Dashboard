// ────────────────────────────────────────────────────────────────────────
// BankAccountsStep.jsx
// React port of panel-step-bank ("Screen 2D — Bank Accounts") from
// layer1_india.html. This step has NO eligibility gate — confirmed
// against the source's `syncUnlockStatus()` (see bankAccountsMachine.js's
// header comment) — so it always renders its form.
//
// The interest-rate field intentionally reproduces a real bug from the
// original: typing "3.5" (meaning 3.5%) is stored as 0.03 (3%), because
// the underlying parseINRCurrency() truncates at the decimal point before
// dividing by 100. See the long comment in deriveBankAccounts.js. This is
// NOT fixed here, to stay faithful to the source's actual computation.
// ────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useMachine } from '@xstate/react';
import { bankAccountsMachine } from '../bankAccountsMachine.js';

function UploadBox({ status, onStart }) {
  const isScanning = status === 'scanning';
  const isSuccess = status === 'success';
  const borderClass = isSuccess ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10' : 'border-brandGold/30 bg-brandGold/5 hover:bg-brandGold/10';
  const titleClass = isSuccess ? 'text-green-400' : 'text-brandGold';
  const titleText = isScanning ? 'Scanning Document...' : isSuccess ? 'Extracted successfully' : '🏦 Upload Bank Statement / Passbook';

  return (
    <div className={`mt-2 border-2 border-dashed ${borderClass} rounded-xl p-4 text-center cursor-pointer transition-colors relative`} onClick={(e) => e.currentTarget.querySelector('input').click()}>
      <span className={`text-xs font-bold ${titleClass} block mb-1 ${isScanning ? 'animate-pulse' : ''}`}>{titleText}</span>
      {!isScanning && !isSuccess && <span className="text-[9px] text-brandGold/60">Upload your document to auto-fill these fields</span>}
      <input
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) onStart();
        }}
      />
    </div>
  );
}

function BankRow({ row, idx, visibility, send }) {
  const update = (field) => (value) => send({ type: 'UPDATE_BANK_FIELD', index: idx, field, value });

  return (
    <div className="bank-card bg-[#161616] border border-white/10 rounded-2xl p-5 flex flex-col gap-6 relative shadow-lg">
      <div className="flex justify-between items-center border-b border-white/10 pb-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-brandGold">Bank Account Details</h3>
        <button onClick={() => send({ type: 'REMOVE_BANK_ROW', index: idx })} className="text-[10px] uppercase font-bold tracking-wider text-brandRed/80 hover:text-brandRed transition-colors">
          Delete Entry
        </button>
      </div>

      <UploadBox status={row._upload} onStart={() => send({ type: 'START_BANK_UPLOAD', index: idx })} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div>
          <label className="block text-[10px] text-white/60 mb-1">Bank Name</label>
          <input
            type="text"
            value={row.bank_name || ''}
            onChange={(e) => update('bank_name')(e.target.value)}
            placeholder="e.g. HDFC Bank"
            className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-[10px] text-white/60 mb-1">Account Type</label>
          <select
            value={row.account_type}
            onChange={(e) => send({ type: 'UPDATE_BANK_TYPE', index: idx, value: e.target.value })}
            className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none transition-all"
          >
            <option value="SAVINGS">Savings</option>
            <option value="CURRENT">Current</option>
            <option value="NRE">NRE</option>
            <option value="NRO">NRO</option>
            <option value="FCNR">FCNR</option>
            <option value="RFC">RFC</option>
            <option value="GIFT_IFSC">GIFT City IFSC</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] text-white/60 mb-1">Current Balance</label>
          <div className="flex">
            <input
              type="text"
              inputMode="numeric"
              value={row.current_balance_raw || ''}
              onChange={(e) => update('current_balance_raw')(e.target.value)}
              placeholder="0.00"
              className="inr-input w-2/3 bg-[#121212] border border-white/10 rounded-l-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none border-r-0 transition-all font-mono"
            />
            <select
              value={row.current_balance_currency}
              onChange={(e) => update('current_balance_currency')(e.target.value)}
              className="w-1/3 bg-[#2A2A2A] border border-white/10 rounded-r-lg text-[10px] text-white px-2 focus:border-brandGold focus:outline-none transition-all"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-white/60 mb-1">Interest Credited (This FY)</label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-white/40 text-xs">₹</span>
            <input
              type="text"
              inputMode="numeric"
              value={row.interest_credited_this_fy_raw || ''}
              onChange={(e) => update('interest_credited_this_fy_raw')(e.target.value)}
              placeholder="0"
              className="inr-input w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white pl-7 pr-3 py-2.5 focus:border-brandGold focus:outline-none transition-all font-mono"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] text-white/60 mb-1">
            Annual Interest Rate (%) <span className="text-white/30">(Optional)</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={row.annual_interest_rate_raw || ''}
            onChange={(e) => update('annual_interest_rate_raw')(e.target.value)}
            placeholder="e.g. 3.5"
            className="inr-input w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none transition-all font-mono"
          />
          <p className="text-[9px] text-white/30 mt-1">Leave blank if you only know the interest amount credited.</p>
        </div>
        {visibility.showNroBalance && (
          <div>
            <label className="block text-[10px] text-brandGold mb-1">NRO Specific Balance</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-white/40 text-xs">₹</span>
              <input
                type="text"
                inputMode="numeric"
                value={row.nro_balance_raw || ''}
                onChange={(e) => update('nro_balance_raw')(e.target.value)}
                placeholder="0"
                className="inr-input w-full bg-[#1A1A1A] border border-brandGold/30 rounded-lg text-xs text-white pl-7 pr-3 py-2.5 focus:border-brandGold focus:outline-none transition-all font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {visibility.showNreConversion && (
        <div className="mt-2">
          <label className="block text-[10px] text-brandGold mb-1">Conversion Date (If residency changed)</label>
          <input
            type="date"
            value={row.account_conversion_date || ''}
            onChange={(e) => update('account_conversion_date')(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-brandGold/30 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none transition-all font-mono"
          />
          <p className="text-[9px] text-brandGold/60 mt-1">If residency lock changed to RNOR or ROR this FY</p>
        </div>
      )}

      {visibility.showFcnrMaturity && (
        <div className="mt-2">
          <label className="block text-[10px] text-white/60 mb-1">FCNR Maturity Date</label>
          <input
            type="date"
            value={row.fcnr_maturity_date || ''}
            onChange={(e) => update('fcnr_maturity_date')(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none transition-all font-mono"
          />
        </div>
      )}

      <div className="mt-2 pt-3 border-t border-white/5">
        <label className="block text-[10px] text-white/60 mb-1">US Person Self-Certification (W-9/FATCA) on File With This Bank?</label>
        <select
          value={row.us_person_certified_to_bank === null ? 'null' : String(row.us_person_certified_to_bank)}
          onChange={(e) => update('us_person_certified_to_bank')(e.target.value === 'null' ? null : e.target.value === 'true')}
          className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none transition-all"
        >
          <option value="null">-- Not sure / not applicable --</option>
          <option value="true">Yes — certified</option>
          <option value="false">No — not certified</option>
        </select>
      </div>
    </div>
  );
}

export default function BankAccountsStep({ initialContext, onBack, onContinue }) {
  const [state, send] = useMachine(bankAccountsMachine, { input: initialContext });
  const ctx = state.context;
  const { bank_accounts, nro_repatriation_inputs, ui } = ctx;
  const { visibility: v, backTarget, nextTarget } = ui;

  return (
    <div id="panel-step-bank" className="glass-card p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide font-display uppercase">Screen 2D — Bank Accounts</h2>
        <p className="text-xs text-white/40 mt-1">
          Enter your bank accounts, property sales, and connect your broker or upload a CSV to automatically import your Capital Gains from shares and mutual funds.
        </p>
      </div>

      <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="text-xs font-black uppercase tracking-widest text-brandGold">Your Indian Bank Accounts (Savings, NRO, NRE)</span>
          <button onClick={() => send({ type: 'ADD_BANK_ROW' })} className="px-3 py-1 bg-white/10 hover:bg-brandGold/20 hover:text-brandGold rounded text-[9px] font-black uppercase tracking-widest transition-all">
            + Add Bank
          </button>
        </div>

        {v.showNroPanel && (
          <div id="nro-repatriation-panel" className="mb-4 p-4 bg-brandGold/10 border border-brandGold/20 rounded-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-brandGold mb-3">NRO Repatriation Summary (USD 1M Limit)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-white/60 mb-1">Cumulative Repatriated USD (This FY)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={nro_repatriation_inputs.cumulative_repatriated_usd_this_fy_raw || ''}
                  onChange={(e) => send({ type: 'UPDATE_NRO_REPATRIATION', field: 'cumulative_repatriated_usd_this_fy_raw', value: e.target.value })}
                  placeholder="e.g. 50000"
                  className="inr-input w-full bg-[#1A1A1A] border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/60 mb-1">Pending Repatriation (INR)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={nro_repatriation_inputs.pending_repatriation_inr_raw || ''}
                  onChange={(e) => send({ type: 'UPDATE_NRO_REPATRIATION', field: 'pending_repatriation_inr_raw', value: e.target.value })}
                  placeholder="e.g. 1000000"
                  className="inr-input w-full bg-[#1A1A1A] border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  checked={nro_repatriation_inputs.tds_deducted_on_nro_balance}
                  onChange={(e) => send({ type: 'UPDATE_NRO_REPATRIATION', field: 'tds_deducted_on_nro_balance', value: e.target.checked })}
                  className="w-3 h-3 rounded border-white/20 bg-[#1A1A1A] text-brandGold focus:ring-brandGold"
                />
                <label className="text-[10px] text-white/80">TDS Deducted on NRO Balance</label>
              </div>
            </div>
          </div>
        )}

        <div id="div-bank-list" className="grid grid-cols-1 gap-4">
          {bank_accounts.map((row, idx) => (
            <BankRow key={idx} row={row} idx={idx} visibility={v.rows[idx]} send={send} />
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <button onClick={() => onBack?.(backTarget)} className="px-4 py-2.5 bg-white/5 text-white/60 font-bold uppercase text-[9px] tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/5">
          ← Back
        </button>
        <button onClick={() => onContinue?.(ctx, nextTarget)} className="px-6 py-2.5 bg-brandGold text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:brightness-110 transition-all">
          Next Step
        </button>
      </div>
    </div>
  );
}
