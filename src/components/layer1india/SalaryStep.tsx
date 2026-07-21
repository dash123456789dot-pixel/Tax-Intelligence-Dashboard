// ────────────────────────────────────────────────────────────────────────
// SalaryStep.tsx
// React port of panel-step-salary ("Screen 2E — Salary") from
// layer1_india.html.
// ────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { salaryMachine } from '@/machines/salaryMachine';
import { formatINRDisplay } from '@/machines/deriveSalary';

const SALARY_CSS = `
.glass-card {
    background-color: rgba(18, 18, 18, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    backdrop-filter: blur(12px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
    border-color: rgba(212, 175, 55, 0.2);
    box-shadow: 0 0 30px rgba(212, 175, 55, 0.05);
}
`;

// ---- shared pieces --------------------------------------------------

interface TooltipProps {
  text: string;
}

function Tooltip({ text }: TooltipProps) {
  return (
    <span className="cursor-help text-brandGold/70 hover:text-brandGold transition-colors group relative w-fit">
      <span className="font-bold text-[9px]">(i)</span>
      <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#1A1A1A] border border-brandGold/20 rounded-xl shadow-2xl text-[9px] text-white/80 normal-case tracking-normal leading-relaxed z-20 text-left">
        {text}
      </div>
    </span>
  );
}

interface InrFieldProps {
  id: string;
  label: string;
  tooltip?: string;
  value: number | null | undefined;
  onCommit: (raw: string) => void;
  className?: string;
  inputClassName?: string;
}

function InrField({ id, label, tooltip, value, onCommit, className = '', inputClassName = '' }: InrFieldProps) {
  const [text, setText] = useState(formatINRDisplay(value));

  useEffect(() => {
    setText(formatINRDisplay(value));
  }, [value]);

  return (
    <div className={className}>
      <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1 flex items-center gap-1 w-fit">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      <input
        type="text"
        inputMode="numeric"
        id={id}
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          const isNegative = raw.trim().startsWith('-');
          const digitsOnly = raw.replace(/[^\d]/g, '');
          const formatted = digitsOnly === '' ? (isNegative ? '-' : '') : (isNegative ? '-' : '') + Number(digitsOnly).toLocaleString('en-IN');
          setText(formatted);
          onCommit(raw);
        }}
        className={
          'inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono ' +
          inputClassName
        }
      />
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  activeClass?: string;
}

function ToggleSwitch({ checked, onChange, activeClass = 'peer-checked:bg-brandGold peer-checked:after:bg-black' }: ToggleSwitchProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div
        className={
          'w-9 h-5 bg-white/10 peer-focus:outline-none peer-disabled:opacity-50 peer-disabled:cursor-not-allowed rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ' +
          activeClass
        }
      />
    </label>
  );
}

// ---- main component ---------------------------------------------------

interface SalaryStepProps {
  taxRegime: string;
  onBack?: () => void;
  onContinue?: (context: any) => void;
}

export default function SalaryStep({ taxRegime, onBack, onContinue }: SalaryStepProps) {
  const [state, send] = useMachine(salaryMachine, { input: { tax_regime: taxRegime } });

  useEffect(() => {
    send({ type: 'SET_TAX_REGIME', value: taxRegime });
  }, [taxRegime, send]);

  const ctx = state.context;
  const { salary: sal, ui } = ctx;
  const { visibility: v } = ui;

  const updateNum = (field: string) => (raw: string) => send({ type: 'UPDATE_SALARY_NUM', field, value: raw });
  const updateNestedNum = (objName: string, field: string) => (raw: string) => send({ type: 'UPDATE_SALARY_NESTED_NUM', objName, field, value: raw });

  return (
    <>
      <style>{SALARY_CSS}</style>
      <div id="panel-step-salary" className="glass-card p-6 lg:p-8 flex flex-col gap-6">
        <div>
          <h2 id="title-step-income" className="text-[22px] font-sans font-bold text-white tracking-[0.01em] uppercase">
            Screen 2E — Salary
          </h2>
          <p className="text-xs text-white/40 mt-1">Enter details about your salary, allowances, and exemptions.</p>
        </div>

        {/* Salary Details */}
        <div id="div-salary-master" className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 transition-all">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-sm font-sans font-black uppercase tracking-[0.01em] text-brandGold">
              Salary Income &amp; Exemptions
            </span>
            <ToggleSwitch checked={sal.has_salary_income} onChange={(val) => send({ type: 'TOGGLE_SALARY_SECTION', value: val })} />
          </div>

          {v.divSalarySection && (
            <div id="div-salary-section" className="flex flex-col gap-6">
              {/* Form 130 Autofill Upload — no wiring in the original DOM script (dead input), kept for visual parity only */}
              <div className="p-5 bg-brandGold/10 border border-brandGold/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-base font-sans font-black text-brandGold uppercase tracking-[0.01em] flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Autofill from Form 130
                  </span>
                  <span className="text-[10px] text-white/60 mt-1">
                    Upload your Form 130 (Part B) PDF to instantly extract gross salary, perquisites, allowances, and NPS contributions.
                  </span>
                </div>
                <div className="flex-shrink-0">
                  <input type="file" id="form16-upload" className="hidden" accept=".pdf" />
                  <label
                    htmlFor="form16-upload"
                    className="cursor-pointer px-6 py-2 bg-brandGold text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]"
                  >
                    Upload PDF
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InrField
                  id="sal-gross"
                  label="Gross Salary"
                  tooltip="Find this in Form 130 Part B under 'Gross Salary as per provisions contained in section 17(1)'."
                  value={sal.gross_salary_inr}
                  onCommit={updateNum('gross_salary_inr')}
                />

                {v.showOldRegimeFields && (
                  <InrField
                    id="sal-basic"
                    label="Basic Salary + DA"
                    tooltip="Usually found in your monthly salary slips. DA (Dearness Allowance) is mostly applicable for government employees."
                    value={sal.basic_da_inr}
                    onCommit={updateNum('basic_da_inr')}
                    className="sal-old-regime-field transition-all"
                  />
                )}

                <InrField
                  id="sal-perq"
                  label="Perquisites"
                  tooltip="Find this in Form 130 Part B under 'Value of perquisites u/s 17(2)'."
                  value={sal.perquisites_inr}
                  onCommit={updateNum('perquisites_inr')}
                />

                <InrField
                  id="sal-esop"
                  label="ESOP Perquisite"
                  tooltip="This is the FMV at exercise minus the exercise price. Often included in perquisites in Form 130."
                  value={sal.esop_perquisite_inr}
                  onCommit={updateNum('esop_perquisite_inr')}
                />

                {/* ESOP Perquisite Events */}
                <div className="col-span-full mt-2">
                  <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-2">
                    ESOP Perquisite Grants (Itemized)
                  </label>
                  <div id="div-esop-list" className="space-y-2">
                    {sal.esop_perquisite_events.map((ev, idx) => (
                      <div key={idx} className="esop-card p-3 bg-[#121212] border border-white/10 rounded-xl grid grid-cols-4 gap-3 relative">
                        <button
                          type="button"
                          onClick={() => send({ type: 'REMOVE_ESOP_ROW', index: idx })}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-brandRed rounded-full text-white text-xs flex items-center justify-center shadow-lg hover:scale-110 transition-all z-10"
                        >
                          ×
                        </button>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-sans uppercase tracking-[0.01em] text-white/40 mb-1">Employer Name</label>
                          <input
                            type="text"
                            value={ev.employer_name || ''}
                            onChange={(e) => send({ type: 'UPDATE_ESOP_ROW', index: idx, field: 'employer_name', value: e.target.value || null })}
                            className="esop-emp w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white px-2 py-1.5 focus:border-brandGold focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-sans uppercase tracking-[0.01em] text-white/40 mb-1">Grant Date</label>
                          <input
                            type="date"
                            value={ev.grant_date || ''}
                            onChange={(e) => send({ type: 'UPDATE_ESOP_ROW', index: idx, field: 'grant_date', value: e.target.value || null })}
                            className="esop-grant-date w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white px-2 py-1.5 focus:border-brandGold focus:ring-0 [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-sans uppercase tracking-[0.01em] text-white/40 mb-1">Vest/Exercise Date</label>
                          <input
                            type="date"
                            value={ev.vesting_or_exercise_date || ''}
                            onChange={(e) => send({ type: 'UPDATE_ESOP_ROW', index: idx, field: 'vesting_or_exercise_date', value: e.target.value || null })}
                            className="esop-vest-date w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white px-2 py-1.5 focus:border-brandGold focus:ring-0 [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-sans uppercase tracking-[0.01em] text-white/40 mb-1">Shares</label>
                          <input
                            type="number"
                            step="any"
                            value={ev.shares ?? ''}
                            onChange={(e) => send({ type: 'UPDATE_ESOP_ROW', index: idx, field: 'shares', value: parseFloat(e.target.value) || null })}
                            className="esop-shares w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white px-2 py-1.5 focus:border-brandGold focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-sans uppercase tracking-[0.01em] text-white/40 mb-1">FMV/Share</label>
                          <input
                            type="number"
                            step="any"
                            value={ev.fmv_per_share_inr ?? ''}
                            onChange={(e) => send({ type: 'UPDATE_ESOP_ROW', index: idx, field: 'fmv_per_share_inr', value: parseFloat(e.target.value) || null })}
                            className="esop-fmv w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white px-2 py-1.5 focus:border-brandGold focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-sans uppercase tracking-[0.01em] text-white/40 mb-1">Exercise Price</label>
                          <input
                            type="number"
                            step="any"
                            value={ev.exercise_price_per_share_inr ?? ''}
                            onChange={(e) => send({ type: 'UPDATE_ESOP_ROW', index: idx, field: 'exercise_price_per_share_inr', value: parseFloat(e.target.value) || null })}
                            className="esop-exercise w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white px-2 py-1.5 focus:border-brandGold focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-sans uppercase tracking-[0.01em] text-brandGold mb-1">Perq Value</label>
                          <input
                            type="number"
                            step="any"
                            value={ev.perquisite_value_inr ?? ''}
                            onChange={(e) => send({ type: 'UPDATE_ESOP_ROW', index: idx, field: 'perquisite_value_inr', value: parseFloat(e.target.value) || null })}
                            className="esop-perq w-full bg-brandGold/10 border border-brandGold/30 rounded-lg text-xs text-white px-2 py-1.5 focus:border-brandGold focus:ring-0 font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => send({ type: 'ADD_ESOP_ROW' })}
                    className="mt-2 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-xl text-[10px] font-bold text-white/60 hover:text-white transition-all"
                  >
                    + Add ESOP Grant
                  </button>
                </div>

                <InrField
                  id="sal-prof-tax"
                  label="Professional Tax"
                  tooltip="Found in Form 130 Part B under deductions 'Tax on employment Standard Deduction for Salaried Employees(iii)'."
                  value={sal.professional_tax_inr}
                  onCommit={updateNum('professional_tax_inr')}
                />
                <InrField
                  id="sal-nps-emp"
                  label="Employer NPS Contribution"
                  tooltip="Found in Form 130 Part B deductions under Section 124(2)."
                  value={sal.employer_nps_contribution_inr}
                  onCommit={updateNum('employer_nps_contribution_inr')}
                />
                <InrField
                  id="sal-prior"
                  label="Prior Employer Salary"
                  tooltip="If you switched jobs and didn't submit Form 12B to your new employer, enter the gross salary from your previous employer's Form 130."
                  value={sal.prior_employer_salary_inr}
                  onCommit={updateNum('prior_employer_salary_inr')}
                />

                {v.showOldRegimeFields && (
                  <InrField
                    id="sal-lta"
                    label="LTA Claimed"
                    tooltip="Leave Travel Allowance exemption. Found in Form 130 Part B under 'Allowances exempt u/s 10'."
                    value={sal.lta_claimed_inr}
                    onCommit={updateNum('lta_claimed_inr')}
                    className="sal-old-regime-field"
                  />
                )}
              </div>

              {/* HRA Exemption Section */}
              {v.showOldRegimeFields && (
                <div className="p-4 bg-[#161616] border border-white/10 rounded-xl flex flex-col gap-3 sal-old-regime-field">
                  <span className="text-[12px] font-sans font-bold text-white/80 uppercase tracking-[0.01em]">
                    House Rent Allowance (HRA) Exemption
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InrField
                      id="sal-hra"
                      label="HRA Received"
                      tooltip="Your total House Rent Allowance received. Usually listed in your salary slips."
                      value={sal.hra_received_inr}
                      onCommit={updateNum('hra_received_inr')}
                      inputClassName="bg-[#121212]"
                    />
                    <InrField
                      id="sal-rent"
                      label="Rent Paid on Accommodation"
                      tooltip="The total actual rent you paid in the Tax Year. Required to calculate your HRA exemption."
                      value={sal.rent_paid_inr}
                      onCommit={updateNum('rent_paid_inr')}
                      inputClassName="bg-[#121212]"
                    />
                    <div className="flex items-center justify-between p-3 bg-[#121212] border border-white/10 rounded-lg">
                      <span className="text-xs font-bold text-white/80">Metro Accommodation?</span>
                      <ToggleSwitch
                        checked={sal.is_metro_city}
                        onChange={(val) => send({ type: 'UPDATE_SALARY_BOOL', field: 'is_metro_city', value: val })}
                        activeClass="peer-checked:bg-brandGold/20 peer-checked:after:bg-brandGold peer-checked:after:border-brandGold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Special Allowances Section */}
              <div className="p-4 bg-[#161616] border border-white/10 rounded-xl flex flex-col gap-4">
                <span className="text-[12px] font-sans font-bold text-white/80 uppercase tracking-[0.01em]">Special Allowances</span>

                {/* PwD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end border-b border-white/5 pb-4">
                  <div className="flex items-center justify-between p-3 bg-[#121212] border border-white/10 rounded-lg">
                    <span className="text-xs font-bold text-white/80">Eligible PwD? (Blind/Deaf/Orthopedic)</span>
                    <ToggleSwitch
                      checked={sal.pwd_transport_allowance.is_eligible_pwd}
                      onChange={(val) => send({ type: 'TOGGLE_PWD_ALLOWANCE', value: val })}
                      activeClass="peer-checked:bg-brandGold/20 peer-checked:after:bg-brandGold peer-checked:after:border-brandGold"
                    />
                  </div>
                  <div id="div-pwd-recv" className={v.pwdReceivedEnabled ? 'transition-all' : 'opacity-30 transition-all'}>
                    <InrField
                      id="sal-pwd-recv"
                      label="PwD Transport Allowance Received"
                      tooltip="The transport allowance provided by your employer. Exemption is capped at ₹3,200 per month."
                      value={sal.pwd_transport_allowance.allowance_received_inr}
                      onCommit={updateNestedNum('pwd_transport_allowance', 'allowance_received_inr')}
                      inputClassName={'bg-[#121212] disabled:cursor-not-allowed'}
                    />
                  </div>
                </div>

                {/* Conveyance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-white/5 pb-4">
                  <InrField
                    id="sal-conv-recv"
                    label="Conveyance Allowance Received"
                    tooltip="Found in your salary slips. Also known as transport allowance for commuting from home to office."
                    value={sal.conveyance_allowance.allowance_received_inr}
                    onCommit={updateNestedNum('conveyance_allowance', 'allowance_received_inr')}
                    inputClassName="bg-[#121212]"
                  />
                  <InrField
                    id="sal-conv-exp"
                    label="Conveyance Actual Expenditure"
                    tooltip="The actual amount you spent on commuting. Exemption is limited to the actual expenditure."
                    value={sal.conveyance_allowance.actual_expenditure_inr}
                    onCommit={updateNestedNum('conveyance_allowance', 'actual_expenditure_inr')}
                    inputClassName="bg-[#121212]"
                  />
                </div>

                {/* Tour */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-white/5 pb-4">
                  <InrField
                    id="sal-tour-recv"
                    label="Tour/Travel Allowance Received"
                    tooltip="Allowance given for official tours or transfers."
                    value={sal.tour_travel_allowance.allowance_received_inr}
                    onCommit={updateNestedNum('tour_travel_allowance', 'allowance_received_inr')}
                    inputClassName="bg-[#121212]"
                  />
                  <InrField
                    id="sal-tour-exp"
                    label="Tour/Travel Actual Expenditure"
                    tooltip="The actual amount spent on travel, lodging, or boarding during the official tour."
                    value={sal.tour_travel_allowance.actual_expenditure_inr}
                    onCommit={updateNestedNum('tour_travel_allowance', 'actual_expenditure_inr')}
                    inputClassName="bg-[#121212]"
                  />
                </div>

                {/* Daily */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InrField
                    id="sal-daily-recv"
                    label="Daily Allowance Received"
                    tooltip="Per-diem allowance granted while on tour."
                    value={sal.daily_allowance.allowance_received_inr}
                    onCommit={updateNestedNum('daily_allowance', 'allowance_received_inr')}
                    inputClassName="bg-[#121212]"
                  />
                  <InrField
                    id="sal-daily-exp"
                    label="Daily Actual Expenditure"
                    tooltip="Actual daily expenses incurred while on tour."
                    value={sal.daily_allowance.actual_expenditure_inr}
                    onCommit={updateNestedNum('daily_allowance', 'actual_expenditure_inr')}
                    inputClassName="bg-[#121212]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 bg-white/5 text-white/60 font-bold uppercase text-[9px] tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/5"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => onContinue?.(ctx)}
            className="px-6 py-2.5 bg-brandGold text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:brightness-110 transition-all"
          >
            Next Step
          </button>
        </div>
      </div>
    </>
  );
}
