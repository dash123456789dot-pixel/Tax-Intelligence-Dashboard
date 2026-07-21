'use client';

// ────────────────────────────────────────────────────────────────────────
// ComplianceStep.tsx
// React port of panel-step-compliance ("Screen 2C — Additional Documents
// & Special Rates") from layer1_india.html.
// ────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useMachine } from '@xstate/react';
import { complianceMachine } from '@/machines/complianceMachine';

function ToggleSwitch({ checked, onChange }: any) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none peer-disabled:opacity-50 peer-disabled:cursor-not-allowed rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brandGold peer-checked:after:bg-black peer-checked:after:border-black" />
    </label>
  );
}

function UploadStatus({ status, idleLabel, colorClass = 'text-brandGold' }: any) {
  if (status === 'scanning') return <span className={`text-[10px] truncate animate-pulse ${colorClass}`}>Scanning document...</span>;
  if (status === 'success') return <span className="text-[10px] text-green-400 truncate">Extracted successfully</span>;
  return <span className={`text-[10px] truncate ${colorClass === 'text-brandGold' ? 'text-white/40' : 'text-brandGold/40'}`}>{idleLabel}</span>;
}

const INCOME_TYPE_OPTIONS = [
  ['PROPERTY_CG', 'Property Capital Gains'],
  ['NRO_INTEREST', 'NRO Interest'],
  ['DIVIDEND', 'Dividend'],
  ['ROYALTY_FTS', 'Royalty / FTS'],
];

export default function ComplianceStep({ initialContext, onBack, onContinue }: any) {
  const [state, send] = useMachine(complianceMachine as any, { input: initialContext });
  const ctx = state.context;
  const { form_10f, section_197_cert, chapter_xiia_elected } = ctx.compliance_docs;
  const { visibility: v } = ctx.ui;

  return (
    <div id="panel-step-compliance" className="glass-card p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide font-display uppercase">Screen 2C — Additional Documents &amp; Special Rates</h2>
        <p className="text-xs text-white/40 mt-1">Let us know if you have any special certificates that allow you to pay lower taxes.</p>
      </div>

      {!v.stepEligible && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] text-white/50 leading-relaxed">
          This step is only relevant if your derived residency status is <strong className="text-white/70">Non-Resident (NR)</strong>.
          Currently: status = <span className="text-brandGold">{ctx.final_india_residency_status}</span>.
        </div>
      )}

      {v.stepEligible && (
        <>
          {/* Form 41 */}
          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white/80">Have you filed Form 41 online?</span>
                <span className="text-[9px] text-white/30">This form is required for Non-Residents to claim tax treaty benefits in India.</span>
              </div>
              <ToggleSwitch checked={form_10f.is_filed} onChange={(val: any) => send({ type: 'TOGGLE_10F_FILED', value: val } as any)} />
            </div>

            {v.div10fAck && (
              <div id="div-10f-ack" className="flex flex-col gap-4 mt-2 pt-4 border-t border-white/10">
                <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Provide Form Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-black/20 border border-white/5 rounded-xl flex flex-col gap-2 justify-center">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-brandGold mb-1">Option 1: Upload Form 41</label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer bg-brandGold/10 hover:bg-brandGold/20 text-brandGold border border-brandGold/20 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap">
                        Choose File
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) send({ type: 'START_10F_UPLOAD' } as any);
                          }}
                        />
                      </label>
                      <UploadStatus status={form_10f._upload} idleLabel="No file chosen" />
                    </div>
                  </div>

                  <div className="p-4 bg-black/20 border border-white/5 rounded-xl flex flex-col gap-2 justify-center">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-brandGold mb-1">Option 2: Enter Acknowledgement</label>
                    <input
                      type="text"
                      value={form_10f.ack_number || ''}
                      onChange={(e) => send({ type: 'UPDATE_10F_ACK', value: e.target.value } as any)}
                      placeholder="15 Digit Number"
                      className={
                        'w-full bg-[#121212] border rounded-lg text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 focus:outline-none font-mono transition-all ' +
                        (form_10f._upload === 'success' ? 'ring-2 ring-green-500 bg-green-500/10 border-white/10' : 'border-white/10')
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lower TDS Certificate */}
          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white/80">Do you hold a Lower Tax Deduction Certificate?</span>
                <span className="text-[9px] text-white/30">This certificate from the tax department allows your income to be taxed at a lower rate.</span>
              </div>
              <ToggleSwitch checked={section_197_cert.is_available} onChange={(val: any) => send({ type: 'TOGGLE_S197_AVAILABLE', value: val } as any)} />
            </div>

            {v.divS197Detail && (
              <div id="div-s197-detail" className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 pt-4 border-t border-white/5">
                <div className="col-span-1 md:col-span-3 mb-2 pb-4 border-b border-white/5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-brandGold/5 border border-brandGold/20 rounded-xl p-4 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brandGold mb-1">⚡ Auto-Fill Details</span>
                      <span className="text-[9px] text-brandGold/60">Upload your Lower TDS Certificate PDF to automatically extract the rate, dates, and covered income streams.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer bg-brandGold/10 hover:bg-brandGold/20 text-brandGold border border-brandGold/20 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap">
                        Upload Certificate
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) send({ type: 'START_S197_UPLOAD' } as any);
                          }}
                        />
                      </label>
                      <span className="w-32"><UploadStatus status={section_197_cert._upload} idleLabel="No file chosen" colorClass="text-brandGold/60" /></span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Approved Lower Rate</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 0.05"
                    value={section_197_cert.rate ?? ''}
                    onChange={(e) => send({ type: 'UPDATE_S197_FIELD', field: 'rate', value: e.target.value } as any)}
                    className={
                      'inr-input w-full bg-black/20 border rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:ring-0 focus:outline-none transition-all font-mono ' +
                      (section_197_cert._upload === 'success' ? 'ring-2 ring-green-500 bg-green-500/10 border-white/10' : 'border-white/10')
                    }
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={section_197_cert.validity_start_date || ''}
                    onChange={(e) => send({ type: 'UPDATE_S197_FIELD', field: 'validity_start_date', value: e.target.value } as any)}
                    className={
                      'w-full bg-black/20 border rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:ring-0 focus:outline-none transition-all font-mono ' +
                      (section_197_cert._upload === 'success' ? 'ring-2 ring-green-500 bg-green-500/10 border-white/10' : 'border-white/10')
                    }
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={section_197_cert.validity_end_date || ''}
                    onChange={(e) => send({ type: 'UPDATE_S197_FIELD', field: 'validity_end_date', value: e.target.value } as any)}
                    className={
                      'w-full bg-black/20 border rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:ring-0 focus:outline-none transition-all font-mono ' +
                      (section_197_cert._upload === 'success' ? 'ring-2 ring-green-500 bg-green-500/10 border-white/10' : 'border-white/10')
                    }
                  />
                </div>

                <div className="col-span-1 md:col-span-3 mt-1">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">Covered Income Types</label>
                  <div className="flex flex-wrap gap-2">
                    {INCOME_TYPE_OPTIONS.map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2 bg-black/20 border border-white/10 px-3 py-1.5 rounded-lg cursor-pointer hover:border-brandGold/50 transition-all">
                        <input
                          type="checkbox"
                          checked={section_197_cert.covered_income_types.includes(value)}
                          onChange={(e) => send({ type: 'TOGGLE_S197_INCOME_TYPE', value, checked: e.target.checked } as any)}
                          className="rounded bg-black border-white/20 text-brandGold focus:ring-brandGold focus:ring-offset-0 focus:ring-1"
                        />
                        <span className="text-[10px] text-white/80 font-bold tracking-wide uppercase">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chapter XII-A */}
          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white/80">Opt-in for the Special NRI Flat Rate Scheme (Chapter XII-A)</span>
              <span className="text-[9px] text-white/40 mt-1">
                This allows you to pay a flat 20% tax on Indian investments (like shares and bonds) bought with foreign currency.{' '}
                <strong className="text-blue-400">📝 Note:</strong> This selection is completely flexible and can be declared or changed at the end of the year when you file your Income Tax Return (ITR).
              </span>
            </div>
            <ToggleSwitch checked={chapter_xiia_elected} onChange={(val: any) => send({ type: 'TOGGLE_CHAPTER_XIIA', value: val } as any)} />
          </div>
        </>
      )}

      <div className="flex justify-between mt-4">
        <button onClick={onBack} className="px-4 py-2.5 bg-white/5 text-white/60 font-bold uppercase text-[9px] tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/5">
          ← Back
        </button>
        <button onClick={() => onContinue?.(ctx)} className="px-6 py-2.5 bg-brandGold text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:brightness-110 transition-all">
          Next Step
        </button>
      </div>
    </div>
  );
}
