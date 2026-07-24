import React from 'react';
import { useMachine } from '@xstate/react';
import { dtaaMachine } from '../../machines/dtaaMachine';
import { formatINRDisplay } from '../../machines/deriveDtaa';
import { useState, useEffect } from 'react';
import './dtaaStep.css';

function ToggleSwitch({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none peer-disabled:opacity-50 peer-disabled:cursor-not-allowed rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brandGold peer-checked:after:bg-black peer-checked:after:border-black" />
    </label>
  );
}

function InrField({ value, onCommit, className = '', placeholder = '₹ 0' }: any) {
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
      className={'inr-input w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-2 py-2 focus:border-brandGold focus:ring-0 font-mono transition-all ' + className}
    />
  );
}

const INCOME_TYPE_OPTIONS = [
  ['interest', 'Interest'],
  ['dividend', 'Dividend'],
  ['royalty', 'Royalty'],
  ['fts', 'FTS'],
  ['capital_gains', 'Capital Gains'],
];

function ElectionRow({ election, idx, send }: { election: any, idx: number, send: any }) {
  const update = (field: string) => (value: any) => (send as any)({ type: 'UPDATE_ELECTION', index: idx, field, value } as any);
  return (
    <>
      <tr className="border-b border-white/5">
        <td className="p-2">
          <select
            value={election.income_type || ''}
            onChange={(e) => update('income_type')(e.target.value)}
            className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs px-2 py-2 focus:border-brandGold focus:ring-0 focus:outline-none transition-all [color-scheme:dark]"
          >
            <option value="" disabled>Select...</option>
            {INCOME_TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </td>
        <td className="p-2">
          <InrField value={election.amount_inr} onCommit={update('amount_inr')} />
        </td>
        <td className="p-2">
          <input
            type="text"
            readOnly
            disabled
            placeholder="Auto-filled"
            value={election.elected_rate ?? ''}
            className="w-full bg-black/50 border border-white/5 rounded-lg text-xs text-brandGold/70 px-2 py-2 font-mono transition-all cursor-not-allowed"
          />
        </td>
        <td className="p-2">
          <input
            type="text"
            readOnly
            disabled
            placeholder="Auto-filled"
            value={election.treaty_article || ''}
            className="w-full bg-black/50 border border-white/5 rounded-lg text-xs text-brandGold/70 px-2 py-2 transition-all cursor-not-allowed"
          />
        </td>
        <td className="p-2 text-right">
          <button
            onClick={() => (send as any)({ type: 'REMOVE_ELECTION', index: idx } as any)}
            className="text-red-400 hover:text-red-300 font-bold px-3 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-[9px] uppercase tracking-widest transition-all"
          >
            Remove
          </button>
        </td>
      </tr>
      {election.banner && (
        <tr>
          <td colSpan={5} className="p-2 pt-0 pb-4">
            <div
              className={
                'flex items-center gap-2 p-2 rounded-lg text-[10px] border ' +
                (election.banner.type === 'warning' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400')
              }
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {election.banner.type === 'warning' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <span>
                <strong>{election.banner.type === 'warning' ? 'Warning:' : 'Info:'}</strong> {election.banner.text}
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface DtaaStepProps {
  initialContext?: any;
  onBack?: () => void;
  onContinue?: (context: any) => void;
  onAutoSave?: (context: any) => void;
}

export default function DtaaStep({ initialContext, onBack, onContinue, onAutoSave }: DtaaStepProps) {
  const [state, send] = useMachine(dtaaMachine as any, { input: initialContext });

  useEffect(() => {
    onAutoSave?.(state.context);
  }, [state.context, onAutoSave]);

  const ctx = state.context;
  const { dtaa, compliance_docs, ui } = ctx;
  const { visibility: v } = ui;

  return (
    <div id="panel-step-dtaa" className="glass-card p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide font-display uppercase">Screen 2B — Tax Treaties (Avoid Paying Tax Twice)</h2>
        <p className="text-xs text-white/40 mt-1">If you are a Non-Resident, configure your home country details to claim lower tax rates under international treaties.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 flex flex-col gap-2">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Your Current Home Country (Tax Residency)</label>
                <select
                  value={dtaa.tax_residency_country || ''}
                  onChange={(e) => (send as any)({ type: 'SET_TAX_RESIDENCY_COUNTRY', value: e.target.value } as any)}
                  className="w-full !bg-[#121212] !text-white border border-white/10 rounded-xl text-xs px-4 py-3 focus:border-brandGold focus:ring-0 focus:outline-none transition-all [color-scheme:dark]"
                >
                  <option value="">-- Select Country --</option>
                  <option value="IN">India (IN)</option>
                  <option value="US">United States (US)</option>
                  <option value="AE">United Arab Emirates (UAE)</option>
                  <option value="GB">United Kingdom (UK)</option>
                  <option value="SG">Singapore (SG)</option>
                  <option value="CA">Canada (CA)</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white/80">Do you have a Tax Residency Certificate (TRC)?</span>
                  <span className="text-[9px] text-white/30">This is an official document from your home country proving your tax residency.</span>
                </div>
                <ToggleSwitch checked={dtaa.trc_status} onChange={(val) => (send as any)({ type: 'TOGGLE_TRC_STATUS', value: val } as any)} />
              </div>

              {v.divTrcUpload && (
                <div id="div-trc-upload" className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Upload TRC PDF</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => (send as any)({ type: 'UPDATE_COMP_TRC', field: 'document_uploaded', value: (e.target.files?.length || 0) > 0 } as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:ring-0 focus:outline-none transition-all file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-brandGold file:text-black hover:file:brightness-110"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Validity Start Date</label>
                    <input
                      type="date"
                      value={compliance_docs.trc.validity_start_date || ''}
                      onChange={(e) => (send as any)({ type: 'UPDATE_COMP_TRC', field: 'validity_start_date', value: e.target.value } as any)}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:ring-0 focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Validity End Date</label>
                    <input
                      type="date"
                      value={compliance_docs.trc.validity_end_date || ''}
                      onChange={(e) => (send as any)({ type: 'UPDATE_COMP_TRC', field: 'validity_end_date', value: e.target.value } as any)}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:ring-0 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white/80">Do you have a Permanent Establishment (PE) in India?</span>
                  <span className="text-[9px] text-white/30">A PE usually means a fixed place of business in India. Having one affects your ability to claim standard treaty benefits.</span>
                </div>
                <ToggleSwitch checked={dtaa.has_permanent_establishment_in_india} onChange={(val) => (send as any)({ type: 'TOGGLE_PERMANENT_ESTABLISHMENT', value: val } as any)} />
              </div>
              {v.divPeAlert && (
                <div id="div-pe-alert" className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                  <span className="text-red-400 mt-0.5">⚠️</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Dual Residency Review Triggered</span>
                    <span className="text-[10px] text-red-200/70 mt-1">
                      By declaring a Permanent Establishment, any business profits attributable to this PE will be taxable in India at domestic rates, overriding standard DTAA treaty benefits.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Treaty Elections table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-brandGold">Treaty Tax Rates (Claim Lower Rates)</h3>
              <div className="flex gap-2">
                {v.showUsAutofillBtn && (
                  <button onClick={() => (send as any)({ type: 'AUTOFILL_US_TREATY' } as any)} className="px-3 py-1 bg-brandGold/10 hover:bg-brandGold/30 text-brandGold rounded text-[9px] font-black uppercase tracking-widest transition-all">
                    ⚡ Auto-Fill US Rates
                  </button>
                )}
                <button onClick={() => (send as any)({ type: 'ADD_ELECTION' } as any)} className="px-3 py-1 bg-white/10 hover:bg-brandGold/20 hover:text-brandGold rounded text-[9px] font-black uppercase tracking-widest transition-all">
                  + Add Stream
                </button>
              </div>
            </div>
            <div className="overflow-x-auto border border-white/5 rounded-2xl bg-white/5">
              <table className="w-full text-left text-xs text-white/80" id="dtaa-table">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">
                    <th className="p-3">Income Type</th>
                    <th className="p-3">Amount (₹)</th>
                    <th className="p-3">Elected Rate</th>
                    <th className="p-3">Treaty Article</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dtaa.treaty_elections.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-white/30 text-[10px] uppercase tracking-widest font-black">
                        No streams added. Domestic rates apply.
                      </td>
                    </tr>
                  ) : (
                    v.elections.map((election: any, idx: number) => <ElectionRow key={idx} election={election} idx={idx} send={send} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
