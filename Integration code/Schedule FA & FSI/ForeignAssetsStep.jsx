// ────────────────────────────────────────────────────────────────────────
// ForeignAssetsStep.jsx
// React port of panel-step-fa ("Screen 2J — Foreign Assets / Schedule FA
// & FSI") from layer1_india.html. See foreignAssetsMachine.js's header
// comment for the combined ROR/RNOR + setup_international eligibility
// gate this step enforces (per explicit instruction).
// ────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { foreignAssetsMachine } from '../foreignAssetsMachine.js';
import { formatINRDisplay } from '../deriveForeignAssets.js';

function InrField({ value, onCommit, className = '', placeholder = '0' }) {
  const [text, setText] = useState(formatINRDisplay(value));
  useEffect(() => setText(formatINRDisplay(value)), [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        const isNegative = raw.trim().startsWith('-');
        const digitsOnly = raw.replace(/[^\d]/g, '');
        const formatted = digitsOnly === '' ? (isNegative ? '-' : '') : (isNegative ? '-' : '') + Number(digitsOnly).toLocaleString('en-IN');
        setText(formatted);
      }}
      onBlur={(e) => onCommit(e.target.value)}
      className={'inr-input w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none font-mono ' + className}
    />
  );
}

function YesNoTriState({ value, onYes, onNo, yesLabel = 'Yes', noLabel = 'No' }) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <button
        onClick={onYes}
        className={value === true ? 'px-4 py-2 bg-brandGold text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all' : 'px-4 py-2 bg-white/5 text-white/60 font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:bg-white/10'}
      >
        {yesLabel}
      </button>
      <button
        onClick={onNo}
        className={value === false ? 'px-4 py-2 bg-brandRed text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all' : 'px-4 py-2 bg-white/5 text-white/60 font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:bg-white/10'}
      >
        {noLabel}
      </button>
    </div>
  );
}

const CATEGORY_GROUPS = [
  { label: 'Schedule FA: Foreign Assets', options: [['bank', 'Foreign Bank / Custodial Account'], ['equity', 'Foreign Equity / Debt / Mutual Funds'], ['property', 'Immovable Property Abroad'], ['other_asset', 'Other Capital Assets / Trusts']] },
  { label: 'Pure Income (No Asset Held)', options: [['salary', 'Foreign Salary'], ['business', 'Foreign Business / Professional Income'], ['other_income', 'Other Foreign Income (e.g. Royalties)']] },
];

function FaRow({ row, idx, visibility, send }) {
  const update = (field) => (value) => send({ type: 'UPDATE_FA_FIELD', index: idx, field, value });

  return (
    <div className="fa-card p-4 bg-[#1a1a1a] border border-white/10 rounded-xl relative transition-all">
      <button onClick={() => send({ type: 'REMOVE_FA_ROW', index: idx })} className="absolute top-4 right-4 text-brandRed/60 hover:text-brandRed font-bold font-sans p-1">
        ✕
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pr-8">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Country Code</label>
          <input type="text" placeholder="US, UK, AE" maxLength={2} value={row.country || ''} onChange={(e) => update('country')(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none uppercase font-mono" />
        </div>
        <div className="lg:col-span-2">
          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Institution / Asset Name</label>
          <input type="text" placeholder="e.g. JPMorgan Chase, Apple Inc, 123 London St" value={row.institution_name || ''} onChange={(e) => update('institution_name')(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none" />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Account / Identifier</label>
          <input type="text" placeholder="A/c No or ID" value={row.account_id || ''} onChange={(e) => update('account_id')(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none" />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[9px] font-black uppercase tracking-widest text-brandGold mb-1.5">Asset / Income Category</label>
        <select
          value={row.category}
          onChange={(e) => send({ type: 'UPDATE_FA_CATEGORY', index: idx, value: e.target.value })}
          className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none font-sans"
        >
          {CATEGORY_GROUPS.map((grp) => (
            <optgroup key={grp.label} label={grp.label}>
              {grp.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {visibility.showAssetDetails && (
        <div className="fa-asset-details flex flex-col gap-4 p-4 bg-white/5 rounded-xl border border-white/5 mb-4">
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest border-b border-white/5 pb-2">Asset Details</span>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Ownership Type</label>
              <select value={row.ownership || 'legal'} onChange={(e) => update('ownership')(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none">
                <option value="legal">Legal Owner</option>
                <option value="beneficial">Beneficial Owner</option>
                <option value="beneficiary">Beneficiary</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Date Acquired / Opened</label>
              <input type="date" value={row.date_acquired || ''} onChange={(e) => update('date_acquired')(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Initial Investment (₹)</label>
              <InrField value={row.initial_value} onCommit={update('initial_value')} />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Peak Balance in Year (₹)</label>
              <InrField value={row.peak_balance} onCommit={update('peak_balance')} />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Closing Balance (₹)</label>
              <InrField value={row.closing_balance} onCommit={update('closing_balance')} />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 mt-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-brandGold">Asset Status:</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" checked={row.status !== 'sold'} onChange={() => send({ type: 'UPDATE_FA_STATUS', index: idx, value: 'holding' })} className="rounded bg-white/10 border-white/20 text-brandGold focus:ring-0" />
                <span className="text-[10px] font-bold text-white/80">Currently Holding</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" checked={row.status === 'sold'} onChange={() => send({ type: 'UPDATE_FA_STATUS', index: idx, value: 'sold' })} className="rounded bg-white/10 border-white/20 text-brandGold focus:ring-0" />
                <span className="text-[10px] font-bold text-white/80">Sold this Year</span>
              </label>
            </div>
          </div>

          {visibility.showProceeds && (
            <div className="mt-2">
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Gross Proceeds from Sale (₹)</label>
              <InrField value={row.gross_proceeds} onCommit={update('gross_proceeds')} className="bg-brandGold/10 border-brandGold/30" />
            </div>
          )}
        </div>
      )}

      {visibility.showFsiSection && (
        <div className="fa-fsi-section flex flex-col gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest border-b border-white/5 pb-2">Schedule FSI: Income &amp; Foreign Tax Credit</span>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Indian Head of Income</label>
              <select value={row.head_of_income} onChange={(e) => update('head_of_income')(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none">
                <option value="ifos">Income from Other Sources</option>
                <option value="salary">Salary</option>
                <option value="cg">Capital Gains</option>
                <option value="business">Business/Profession</option>
                <option value="house">House Property</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Foreign Currency</label>
              <select value={row.currency} onChange={(e) => update('currency')(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Gross Income (Foreign)</label>
              <input type="text" inputMode="numeric" placeholder="0.00" defaultValue={row.income_foreign ?? ''} onBlur={(e) => update('income_foreign')(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none font-mono" />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Foreign Tax Paid</label>
              <input type="text" inputMode="numeric" placeholder="0.00" defaultValue={row.tax_foreign ?? ''} onBlur={(e) => update('tax_foreign')(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none font-mono" />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Conversion TTBR (₹)</label>
              <input type="text" inputMode="numeric" placeholder="83.50" defaultValue={row.conversion_rate ?? ''} onBlur={(e) => update('conversion_rate')(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none font-mono" />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center space-x-2 cursor-pointer mb-2">
                <input type="checkbox" checked={row.claim_dtaa_relief} onChange={(e) => send({ type: 'TOGGLE_FA_DTAA', index: idx, value: e.target.checked })} className="rounded bg-white/10 border-white/20 text-brandGold focus:ring-0" />
                <span className="text-[10px] font-bold text-white/80">Claim DTAA Relief?</span>
              </label>
            </div>
            {visibility.showDtaaFields && (
              <div className="lg:col-span-2">
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">TIN &amp; DTAA Article</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Foreign TIN or Passport No" value={row.tin || ''} onChange={(e) => update('tin')(e.target.value)} className="w-1/2 bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none" />
                  <input type="text" placeholder="DTAA Article (e.g. 12, 13)" value={row.dtaa_article || ''} onChange={(e) => update('dtaa_article')(e.target.value)} className="w-1/2 bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none" />
                </div>
              </div>
            )}
          </div>
          <div className="mt-2 p-3 bg-black/20 rounded-lg flex gap-8">
            <div>
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1">Income in INR (₹)</span>
              <span className="text-xs font-mono font-bold text-white">₹ {(row.income_inr || 0).toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1">FTC Claim (₹)</span>
              <span className="text-xs font-mono font-bold text-brandGold">₹ {(row.tax_inr || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ForeignAssetsStep({ initialContext, onBack, onContinue }) {
  const [state, send] = useMachine(foreignAssetsMachine, { input: initialContext });
  const ctx = state.context;
  const { foreign_assets: fa, lrs_outbound: lrs, ui } = ctx;
  const { visibility: v, lrsTcs } = ui;

  return (
    <div id="panel-step-fa" className="glass-card p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide font-display uppercase">Screen 2J - Foreign Assets (Schedule FA &amp; FSI)</h2>
        <p className="text-xs text-white/40 mt-1">Declare all foreign bank accounts, shares, property, and income to comply with the Black Money Act.</p>
      </div>

      {!v.stepEligible && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] text-white/50 leading-relaxed">
          This step is only relevant if your derived residency status is <strong className="text-white/70">ROR or RNOR</strong>{' '}
          and the <strong className="text-white/70">"I have international income/assets"</strong> setup option was checked.
          {' '}Currently: status = <span className="text-brandGold">{ctx.final_india_residency_status}</span>, international setup ={' '}
          <span className="text-brandGold">{String(ctx.setup_international)}</span>.
        </div>
      )}

      {v.stepEligible && (
        <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
          {/* Gating Question 1: Foreign Assets */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Foreign Assets Disclosure (Schedule FA)</span>
              <span className="text-[9px] text-white/40 font-sans mt-0.5">Do you hold any foreign bank accounts, equity, property, or other assets abroad?</span>
            </div>
            <YesNoTriState
              value={fa.has_foreign_assets}
              onYes={() => send({ type: 'TOGGLE_FOREIGN_ASSETS', value: true })}
              onNo={() => send({ type: 'TOGGLE_FOREIGN_ASSETS', value: false })}
            />
          </div>

          {v.showBmaWarning && (
            <div id="warn-fa-bma-penalty" className="p-3 bg-brandRed/10 border border-brandRed/20 rounded-xl text-[10px] text-brandRed font-sans font-bold leading-relaxed">
              ⚠️ MANDATORY DISCLOSURE: Under Definitions of Certain Terms (Business) of the Black Money Act (BMA), a flat penalty of ₹10,00,000 (₹10 Lakhs) per year applies for failure to disclose, or inaccurate disclosure of, foreign assets in Schedule FA.
            </div>
          )}

          {v.showIncomeGate && (
            <div id="div-fa-income-gate" className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Foreign Income Disclosure (Schedule FSI)</span>
                <span className="text-[9px] text-white/40 font-sans mt-0.5">Have you received any income from these or other foreign sources during the FY?</span>
              </div>
              <YesNoTriState
                value={lrs.has_received_foreign_income}
                onYes={() => send({ type: 'TOGGLE_RECEIVED_FOREIGN_INCOME', value: true })}
                onNo={() => send({ type: 'TOGGLE_RECEIVED_FOREIGN_INCOME', value: false })}
              />
            </div>
          )}

          {v.showFsiWarning && (
            <div id="warn-fa-income-fsi" className="p-3 bg-brandGold/10 border border-brandGold/20 rounded-xl text-[10px] text-brandGold font-sans font-bold leading-relaxed">
              ℹ️ FTC FORM 67 REQUIRED: Declaring foreign income requires filing Schedule FSI. You must also file Form 67 on the ITR portal before the filing due date to claim Foreign Tax Credit (FTC) Double Taxation Relief (DTAA)/91.
            </div>
          )}

          {v.showContainer && (
            <div id="div-fa-table-container" className="flex flex-col gap-4">
              {/* LRS aggregate fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Total money sent abroad this year (₹) — for TCS tracking</label>
                  <InrField value={lrs.total_lrs_remitted_this_fy_inr} onCommit={(val) => send({ type: 'UPDATE_LRS_TOTAL', value: val })} />
                  <span className="text-[8px] text-white/30 mt-1 block">Base LRS threshold is ₹10 Lakhs (except for tour packages). TCS rates vary from 0%, 2%, to 20% depending on purpose.</span>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Primary Purpose of LRS Remittance</label>
                  <select value={lrs.lrs_purpose || ''} onChange={(e) => send({ type: 'UPDATE_LRS_PURPOSE', value: e.target.value })} className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none">
                    <option value="">-- Select Purpose --</option>
                    <option value="investment">Investment (Equity/Property)</option>
                    <option value="education_own_funds">Overseas Education (Own Funds)</option>
                    <option value="education_loan">Overseas Education (Loan Education Loan Interest Deduction)</option>
                    <option value="medical">Medical Treatment Abroad</option>
                    <option value="travel">International Travel (Overseas Tour Packages)</option>
                    <option value="gift_donation">Gift or Donation to Non-Resident</option>
                  </select>
                </div>
              </div>

              {lrsTcs.show && (
                <div id="lrs-tcs-display">
                  <div className="flex justify-between items-center bg-brandGold/5 border border-brandGold/20 rounded-xl p-3 text-[10px] text-brandGold font-sans font-semibold mt-2">
                    <div className="flex-1">
                      <span className="block text-white/50 text-[8px] uppercase tracking-wider font-bold">Estimated TCS (Tax Collected at Source)</span>
                      <span className="text-white/80">{lrsTcs.desc}</span>
                    </div>
                    <div className="text-right ml-4">
                      <span className="block text-white/50 text-[8px] uppercase tracking-wider font-bold">TCS Rate: {lrsTcs.rateStr}</span>
                      <span className="text-sm font-black text-brandGold font-mono">₹{lrsTcs.tcs.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brandGold">Schedule FA &amp; FSI Declarations</span>
                  <span className="text-[10px] text-white/50 font-sans">Declare all foreign bank accounts, shares, property, and income to compute Foreign Tax Credits.</span>
                </div>
                <div id="div-fa-list" className="space-y-4">
                  {fa.assets.map((row, idx) => (
                    <FaRow key={idx} row={row} idx={idx} visibility={v.rows[idx]} send={send} />
                  ))}
                </div>
                <button onClick={() => send({ type: 'ADD_FA_ROW' })} className="mt-2 w-full py-3 bg-white/5 hover:bg-white/10 border border-brandGold/20 border-dashed rounded-xl text-xs font-bold text-brandGold/60 hover:text-brandGold transition-all uppercase tracking-widest">
                  + Add Foreign Asset / Income
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between mt-4">
        <button onClick={onBack} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold tracking-widest uppercase text-xs rounded-xl transition-all">
          ← Back
        </button>
        <button onClick={() => onContinue?.(ctx)} className="px-6 py-3 bg-brandGold hover:bg-brandGold/80 text-black font-black tracking-widest uppercase text-xs rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all">
          Next Step →
        </button>
      </div>
    </div>
  );
}
