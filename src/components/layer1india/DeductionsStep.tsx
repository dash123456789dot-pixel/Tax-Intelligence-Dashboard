// ────────────────────────────────────────────────────────────────────────
// DeductionsStep.tsx
// React port of panel-step-deductions ("Screen 2J — Tax Deductions,
// Chapter VI-A").
// ────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { deductionsMachine } from '../../machines/deductionsMachine';
import { formatINRDisplay } from '../../machines/deriveDeductions';
import './deductionsStep.css';

// ---- shared pieces --------------------------------------------------

function ToggleSwitch({ checked, onChange, disabled = false }: { checked: boolean, onChange: (val: boolean) => void, disabled?: boolean }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none peer-disabled:opacity-50 peer-disabled:cursor-not-allowed rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brandGold peer-checked:after:bg-black" />
    </label>
  );
}

function InrField({ id, value, onCommit, className = '', placeholder = '0' }: { id?: string, value: any, onCommit: (val: string) => void, className?: string, placeholder?: string }) {
  const [text, setText] = useState(formatINRDisplay(value));
  useEffect(() => setText(formatINRDisplay(value)), [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      id={id}
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
      className={'inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono ' + className}
    />
  );
}

function NriWarning({ show, text }: { show: boolean, text: string }) {
  if (!show) return null;
  return <span className="text-[8px] text-brandRed font-bold tracking-wider uppercase mt-1 block">⚠️ {text}</span>;
}

function BlockedBadge({ show, label = '⚠️ NRI Blocked' }: { show: boolean, label?: string }) {
  if (!show) return null;
  return <span className="text-[8px] px-1.5 py-0.5 rounded bg-brandRed/20 border border-brandRed/30 text-brandRed font-black uppercase tracking-wider">{label}</span>;
}

// ---- 80DD / 80DDB / 80U shared card shape ----
function DisabilityCard({ title, blocked, checked, onCheckedChange, showDetails, children }: any) {
  return (
    <div className={'p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 transition-all' + (blocked ? ' opacity-40 pointer-events-none' : '')}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">{title}</span>
        <BlockedBadge show={blocked} />
      </div>
      <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-white/80 font-display">Claim this deduction?</span>
        </div>
        <ToggleSwitch checked={checked} disabled={blocked} onChange={onCheckedChange} />
      </div>
      {showDetails && <div className="flex flex-col gap-4">{children}</div>}
    </div>
  );
}

function DonationRow({ row, idx, visibility, send }: any) {
  const update = (field: string) => (value: string | boolean) => (send as any)({ type: 'UPDATE_80G_ROW', index: idx, field, value });
  return (
    <div className="g80-card bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex justify-end">
        <button onClick={() => (send as any)({ type: 'REMOVE_80G_ROW', index: idx })} className="text-brandRed/70 hover:text-brandRed text-[9px] font-black uppercase tracking-widest transition-all">
          ✕ Remove
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Donee / Organisation Name</label>
          <input type="text" value={row.donee_name || ''} onChange={(e) => update('donee_name')(e.target.value)} placeholder="e.g. PM National Relief Fund" className="w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none transition-all" />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">PAN of Donee</label>
          <input type="text" value={row.donee_pan || ''} onChange={(e) => update('donee_pan')(e.target.value.toUpperCase())} placeholder="AAACPXXXX" className="w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono px-3 py-2 focus:border-brandGold focus:outline-none transition-all uppercase" />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Donation Amount (₹)</label>
          <InrField value={row.donation_amount_raw} onCommit={(val) => update('donation_amount_raw')(val)} className="bg-white/5" />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Deduction Rate</label>
          <select value={row.deduction_rate || '100'} onChange={(e) => update('deduction_rate')(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none">
            <option value="100">100% Deduction</option>
            <option value="50">50% Deduction</option>
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Donation Payment Mode</label>
          <select value={row.donation_mode} onChange={(e) => update('donation_mode')(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none">
            <option value="cheque">Cheque / Digital / Banking Channels</option>
            <option value="cash">Cash Payment</option>
            <option value="kind">In Kind (Ineligible)</option>
            <option value="other">Other Modes (Ineligible)</option>
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Donation Category</label>
          <select value={row.category} onChange={(e) => update('category')(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none">
            <option value="100_percent_no_limit">100% - No Qualifying Limit (e.g. PM Relief Fund)</option>
            <option value="50_percent_no_limit">50% - No Qualifying Limit (e.g. National Children Fund)</option>
            <option value="100_percent_with_qualifying_limit">100% - Subject to Qualifying Limit</option>
            <option value="50_percent_with_qualifying_limit">50% - Subject to Qualifying Limit (e.g. Approved NGO)</option>
          </select>
        </div>
        <div className="md:col-span-2 flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white/80 font-display">Subject to Qualifying Limit?</span>
            <span className="text-[9px] text-white/30 font-sans">If yes, total deduction is capped at 10% of Adjusted Gross Total Income.</span>
          </div>
          <ToggleSwitch checked={row.subject_to_qualifying_limit} onChange={(val) => update('subject_to_qualifying_limit')(val)} />
        </div>
        {visibility.showIneligibleWarning && (
          <div className="md:col-span-2 p-3 bg-brandRed/10 border border-brandRed/20 rounded-xl text-[10px] text-brandRed font-sans font-bold leading-normal">
            ⚠️ THIS DONATION IS INELIGIBLE: Cash donations over ₹2,000, and donations in kind or other modes cannot be claimed as tax deductions.
          </div>
        )}
      </div>
    </div>
  );
}

// ---- main component ---------------------------------------------------

interface DeductionsStepProps {
  initialContext?: any;
  onBack?: () => void;
  onContinue?: (context: any) => void;
  onAutoSave?: (context: any) => void;
}

export default function DeductionsStep({ initialContext, onBack, onContinue, onAutoSave }: DeductionsStepProps) {
  const [state, send] = useMachine(deductionsMachine as any, { input: initialContext });

  useEffect(() => {
    onAutoSave?.(state.context);
  }, [state.context, onAutoSave]);

  const ctx = state.context;
  const d = ctx.deductions;
  const { visibility: v, computedS80G } = ctx.ui;

  return (
    <div id="panel-step-deductions" className="glass-card p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide font-display uppercase">Screen 2J — Tax Deductions (Chapter VI-A)</h2>
        <p className="text-xs text-white/40 mt-1">Available under Old Regime only. Enter eligible investments and expenses to reduce taxable income.</p>
        <div className="mt-4 p-4 bg-brandCyan/10 border border-brandCyan/20 rounded-xl flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <div className="text-[11px] font-black tracking-widest text-brandCyan uppercase mb-1">Global Annual Projection</div>
            <div className="text-xs text-white/70 leading-relaxed">
              Unlike income which is strictly tracked per quarter, tax-saving deductions apply to the entire Tax Year. Any amount entered here is treated as your total projected deduction for the year, automatically lowering Advance Tax across all quarters. You do not need to re-enter deductions per quarter.
            </div>
          </div>
        </div>
      </div>

      {!v.stepEligible && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] text-white/50 leading-relaxed">
          Chapter VI-A deductions are only available under the <strong className="text-white/70">Old Tax Regime</strong>. Your
          current regime is <span className="text-brandGold">{ctx.tax_regime}</span>. Switch to the Old Regime in the Financial
          Life Snapshot step to access this section.
        </div>
      )}

      {v.stepEligible && (
        <>
          <div id="section-80c-group" className="flex flex-col gap-4 w-full mb-4">
            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Section 123, Pension Fund Contributions &amp; Section 124(1) — Tax-Saving Basket</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-brandGold/15 border border-brandGold/25 text-brandGold/80 font-black uppercase tracking-wider">Combined cap ₹1,50,000</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">EPF (Employee Provident Fund)</label>
                  <InrField value={d.s80C.epf_employee_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80C', field: 'epf_employee_inr', value: val })} />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">PPF (Public Provident Fund)</label>
                  <InrField value={d.s80C.ppf_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80C', field: 'ppf_inr', value: val })} />
                  <NriWarning show={v.showPpfNriWarning} text="Fresh PPF contributions blocked for NRIs" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">ELSS (Mutual Funds)</label>
                  <InrField value={d.s80C.elss_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80C', field: 'elss_inr', value: val })} />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Life Insurance Premium</label>
                  <InrField value={d.s80C.life_insurance_premium_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80C', field: 'life_insurance_premium_inr', value: val })} />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Home Loan Principal Repayment</label>
                  <InrField value={d.s80C.principal_home_loan_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80C', field: 'principal_home_loan_inr', value: val })} />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">NSC (National Savings Cert.)</label>
                  <InrField value={d.s80C.nsc_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80C', field: 'nsc_inr', value: val })} />
                  <NriWarning show={v.showNscNriWarning} text="Fresh NSC investments blocked for NRIs" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Children's Tuition Fees</label>
                  <InrField value={d.s80C.tuition_fees_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80C', field: 'tuition_fees_inr', value: val })} />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Sukanya Samriddhi Yojana (SSY)</label>
                  <InrField value={d.s80C.sukanya_samriddhi_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80C', field: 'sukanya_samriddhi_inr', value: val })} />
                  <NriWarning show={v.showSsyNriWarning} text="Fresh SSY accounts blocked for NRIs" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Tax-Saving Fixed Deposit (5-year)</label>
                  <InrField value={d.s80C.tax_saving_fd_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80C', field: 'tax_saving_fd_inr', value: val })} />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Stamp Duty &amp; Registration</label>
                  <InrField value={d.s80C.stamp_duty_registration_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80C', field: 'stamp_duty_registration_inr', value: val })} />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">LIC Annuity Premium (Pension Fund Contributions Deduction)</label>
                  <InrField value={d.s80CCC_80CCD1.lic_annuity_premium_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80CCC_80CCD1', field: 'lic_annuity_premium_inr', value: val })} />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">NPS Employee Contribution (Section 124(1))</label>
                  <InrField value={d.s80CCC_80CCD1.nps_employee_contribution_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80CCC_80CCD1', field: 'nps_employee_contribution_inr', value: val })} />
                </div>
              </div>
            </div>

            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Section 124(1B) — Additional NPS Contribution</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-brandGold/15 border border-brandGold/25 text-brandGold/80 font-black uppercase tracking-wider">Additional limit ₹50,000</span>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">NPS Voluntary Contribution Section 124(1B)</label>
                <InrField value={d.s80CCD_1B.nps_additional_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_NPS_ADD', field: 'nps_additional_inr', value: val })} />
                <p className="text-[9px] text-white/30 mt-1">This is an additional deduction exclusively for NPS contributions, over and above the ₹1.5L cap of Section 123.</p>
              </div>
            </div>
          </div>

          {/* Section 126: Medical Insurance */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Section 126 — Medical Insurance &amp; Preventive Checkup</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-brandGold/15 border border-brandGold/25 text-brandGold/80 font-black uppercase tracking-wider">Self: ₹25K | Parents: ₹25K - ₹50K</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Premium — Self, Spouse &amp; Children</label>
                <InrField value={d.s80D.self_family_premium_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80D_NUM', field: 'self_family_premium_inr', value: val })} />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Preventive Health Checkup — Self &amp; Family (Max ₹5,000 sub-limit)</label>
                <InrField value={d.s80D.self_family_preventive_checkup_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80D_NUM', field: 'self_family_preventive_checkup_inr', value: val })} />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Premium — Parents</label>
                <InrField value={d.s80D.parents_premium_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80D_NUM', field: 'parents_premium_inr', value: val })} />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Preventive Health Checkup — Parents (Max ₹5,000 sub-limit)</label>
                <InrField value={d.s80D.parents_preventive_checkup_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80D_NUM', field: 'parents_preventive_checkup_inr', value: val })} />
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white/80 font-display">Are Parents Senior Citizens?</span>
                  <span className="text-[9px] text-white/30 font-sans">Increases parent deduction cap from ₹25,000 to ₹50,000.</span>
                </div>
                <ToggleSwitch checked={d.s80D.parents_are_senior} onChange={(val) => (send as any)({ type: 'UPDATE_80D_BOOL', field: 'parents_are_senior', value: val })} />
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white/80 font-display">Parents Have Health Insurance Policy?</span>
                  <span className="text-[9px] text-white/30 font-sans">If false, allows parents' medical expenditures to be claimed.</span>
                </div>
                <ToggleSwitch checked={d.s80D.parents_has_health_insurance} onChange={(val) => (send as any)({ type: 'UPDATE_80D_BOOL', field: 'parents_has_health_insurance', value: val })} />
              </div>
              {v.show80DParentsMed && (
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Medical Expenditure — Parents (Only if Seniors &amp; No Policy in force)</label>
                  <InrField value={d.s80D.parents_medical_expenditure_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80D_NUM', field: 'parents_medical_expenditure_inr', value: val })} />
                  <p className="text-[9px] text-white/30 mt-1">Deductible up to ₹50,000 for senior citizen parents who do not have any active health insurance coverage.</p>
                </div>
              )}
            </div>
          </div>

          {/* 80DD */}
          <DisabilityCard
            title="Dependent Disability Maintenance Deduction — Maintenance & Medical Treatment of Disabled Dependent"
            blocked={v.is80DDBlocked}
            checked={d.s80DD.has_disabled_dependents}
            onCheckedChange={(val: boolean) => (send as any)({ type: 'UPDATE_DD_BOOL', section: 's80DD', field: 'has_disabled_dependents', value: val })}
            showDetails={v.show80DDDetails}
          >
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Disability Percentage</label>
              <select
                value={d.s80DD.disability_percentage || ''}
                onChange={(e) => (send as any)({ type: 'UPDATE_DD_FIELD', section: 's80DD', field: 'disability_percentage', value: e.target.value })}
                className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none"
              >
                <option value="">-- Select Disability Level --</option>
                <option value="standard">Standard Disability (&gt;= 40% but &lt; 80%) — Flat ₹75,000 deduction</option>
                <option value="severe">Severe Disability (&gt;= 80%) — Flat ₹1,25,000 deduction</option>
              </select>
            </div>
          </DisabilityCard>

          {/* 80DDB */}
          <DisabilityCard
            title="Medical Treatment for Specified Diseases — Medical Treatment Expenses for Specified Diseases"
            blocked={v.is80DDBBlocked}
            checked={d.s80DDB.has_specified_diseases_treatment}
            onCheckedChange={(val: boolean) => (send as any)({ type: 'UPDATE_DD_BOOL', section: 's80DDB', field: 'has_specified_diseases_treatment', value: val })}
            showDetails={v.show80DDBDetails}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Patient Category</label>
                <select
                  value={d.s80DDB.patient_category || ''}
                  onChange={(e) => (send as any)({ type: 'UPDATE_DD_FIELD', section: 's80DDB', field: 'patient_category', value: e.target.value })}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none"
                >
                  <option value="">-- Select Category --</option>
                  <option value="normal">Normal Individual (Cap: ₹40,000)</option>
                  <option value="senior">Senior Citizen (Cap: ₹1,00,000)</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Actual Medical Expenses Incurred (₹)</label>
                <InrField value={d.s80DDB.medical_expenses_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_DD_NUM', section: 's80DDB', field: 'medical_expenses_inr', value: val })} />
              </div>
            </div>
          </DisabilityCard>

          {/* 80U */}
          <DisabilityCard
            title="Self-Disability Deduction — Deduction in Case of Person with Disability (Self)"
            blocked={v.is80UBlocked}
            checked={d.s80U.has_self_disability}
            onCheckedChange={(val: boolean) => (send as any)({ type: 'UPDATE_DD_BOOL', section: 's80U', field: 'has_self_disability', value: val })}
            showDetails={v.show80UDetails}
          >
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Disability Percentage</label>
              <select
                value={d.s80U.disability_percentage || ''}
                onChange={(e) => (send as any)({ type: 'UPDATE_DD_FIELD', section: 's80U', field: 'disability_percentage', value: e.target.value })}
                className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none"
              >
                <option value="">-- Select Disability Level --</option>
                <option value="standard">Standard Disability (&gt;= 40% but &lt; 80%) — Flat ₹75,000 deduction</option>
                <option value="severe">Severe Disability (&gt;= 80%) — Flat ₹1,25,000 deduction</option>
              </select>
            </div>
          </DisabilityCard>

          {/* 80GG */}
          <div className={'p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 transition-all' + (v.is80GGBlocked ? ' opacity-40 pointer-events-none' : '')}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Rent Paid Deduction (For Non-HRA Salaried)</span>
              <BlockedBadge show={v.is80GGBlocked} label={v.blockedReason80GG ? `⚠️ ${v.blockedReason80GG}` : '⚠️ Blocked'} />
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white/80 font-display">Claim Rent Paid Deduction (For Non-HRA Salaried)?</span>
                <span className="text-[9px] text-white/30 font-sans">Available only if you do not receive House Rent Allowance (HRA) from an employer.</span>
              </div>
              <ToggleSwitch checked={d.s80GG.has_rent_paid_no_hra} disabled={v.is80GGBlocked} onChange={(val) => (send as any)({ type: 'UPDATE_80GG_BOOL', field: 'has_rent_paid_no_hra', value: val })} />
            </div>
            {v.show80GGRentInput && (
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Total Rent Paid During the FY (₹)</label>
                <InrField value={d.s80GG.rent_paid_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80GG_NUM', field: 'rent_paid_inr', value: val })} />
              </div>
            )}
          </div>

          {/* 80G Donations */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Charitable Donations &amp; Contributions — Donations to Charities / Approved Funds</span>
              <button onClick={() => (send as any)({ type: 'ADD_80G_ROW' })} className="px-3 py-1 bg-white/10 hover:bg-brandGold/20 hover:text-brandGold rounded text-[9px] font-black uppercase tracking-widest transition-all">
                + Add Donation
              </button>
            </div>
            <p className="text-[10px] text-white/40 -mt-2">Cash donations exceeding ₹2,000, and donations in kind or other modes are legally ineligible for tax deductions.</p>
            <div className="flex flex-col gap-3">
              {d.s80G_rows.map((row: any, idx: number) => (
                <DonationRow key={idx} row={row} idx={idx} visibility={v.donationRows[idx]} send={send} />
              ))}
            </div>
          </div>

          {/* Special Entity Deductions */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3 mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Special Entity Deductions (Eligible Start-up / Offshore Banking / Cooperative Society)</span>
            {v.show80IAC && (
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Eligible Start-up Business Deduction</label>
                <InrField value={d.s80IAC_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_SPECIAL_DEDUCTION', field: 's80IAC_inr', value: val })} />
                <p className="text-[9px] text-white/30 mt-1">100% deduction of profits for 3 consecutive years for eligible startups (Companies/LLPs).</p>
              </div>
            )}
            {v.show80LA && (
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Offshore Banking Unit Deduction</label>
                <InrField value={d.s80LA_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_SPECIAL_DEDUCTION', field: 's80LA_inr', value: val })} />
                <p className="text-[9px] text-white/30 mt-1">100% deduction for 10 consecutive years for units in IFSC/SEZ.</p>
              </div>
            )}
            {v.show80P && (
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Cooperative Society Deduction</label>
                <InrField value={d.s80P_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_SPECIAL_DEDUCTION', field: 's80P_inr', value: val })} />
                <p className="text-[9px] text-white/30 mt-1">Deduction for income of Cooperative Societies from specified activities.</p>
              </div>
            )}
          </div>

          {/* Political Contributions */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">{v.politicalTitle}</span>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Donations via Non-Cash Modes (₹)</label>
              <InrField value={d.s80ggb_ggc_political_donation_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_POLITICAL_DONATION', value: val })} />
              <p className="text-[9px] text-white/30 mt-1">100% deduction for contributions to registered political parties or electoral trusts. Cash donations are strictly not allowed.</p>
            </div>
          </div>

          {/* 80TTA / 80TTB */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Interest Income Deduction (Savings Accounts) / Interest Income Deduction (Senior Citizen Deposits) — Interest on Savings &amp; Fixed Deposits</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-brandGold/20 border border-brandGold/30 text-brandGold font-black uppercase font-sans">{v.ttaSection}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Savings Account Interest (₹)</label>
                <InrField value={d.s80TTA_TTB.savings_interest_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80TTA', field: 'savings_interest_inr', value: val })} />
              </div>
              {v.show80TTAFdField && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">FD / RD Interest (₹, Interest Income Deduction (Senior Citizen Deposits) Senior only)</label>
                  <InrField value={d.s80TTA_TTB.fd_rd_interest_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80TTA', field: 'fd_rd_interest_inr', value: val })} />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Derived Gating Category</label>
                <div className="w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 px-3 py-2.5 font-mono">{v.ttaDisplayText}</div>
              </div>
            </div>
            {v.show80TTBNrWarning && (
              <div className="p-3 bg-brandRed/10 border border-brandRed/20 rounded-xl text-[10px] text-brandRed font-sans leading-relaxed">
                ⚠️ <strong>NRI Restriction:</strong> Non-residents are statutorily ineligible for Interest Income Deduction (Senior Citizen Deposits) benefits. Only Interest Income Deduction (Savings Accounts) applies to NRO savings interest (capped at ₹10,000).
              </div>
            )}
          </div>

          {/* 80M */}
          {v.show80M && (
            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3">
              <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Inter-Corporate Dividend Deduction — Inter-Corporate Dividends</span>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Dividends Distributed (₹)</label>
                <InrField value={d.s80M.dividend_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80M', field: 'dividend_inr', value: val })} />
                <p className="text-[9px] text-white/30 mt-1">Deduction available for domestic companies receiving dividends from another domestic company, foreign company, or business trust, and distributing dividends to their shareholders.</p>
              </div>
            </div>
          )}

          {/* 80QQB / 80RRB Royalty */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3 mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Author Royalty Income Deduction / 80RRB — Royalty from Books &amp; Patents</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Author Royalty Income Deduction</label>
                <InrField value={d.s80QQB_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_ROYALTY_DEDUCTION', field: 's80QQB_inr', value: val })} />
                <p className="text-[9px] text-white/30 mt-1">Max deduction ₹3,00,000 for authors of certain books.</p>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Patent Royalty Income Deduction</label>
                <InrField value={d.s80RRB_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_ROYALTY_DEDUCTION', field: 's80RRB_inr', value: val })} />
                <p className="text-[9px] text-white/30 mt-1">Max deduction ₹3,00,000 for royalty on patents.</p>
              </div>
            </div>
          </div>

          {/* 80E Education Loan */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Education Loan Interest Deduction — Interest on Education Loan</span>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Education Loan Interest Repaid (₹)</label>
              <InrField value={d.s80E.education_loan_interest_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80E', field: 'education_loan_interest_inr', value: val })} />
              <p className="text-[9px] text-white/30 mt-1">Deductible for interest paid on loans taken for higher education of self, spouse, children, or students for whom you are the legal guardian. No upper limit on deduction; valid for up to 8 years.</p>
            </div>
          </div>

          {/* 80EEA Affordable Housing */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
            <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Affordable Housing Loan Interest Deduction / First-Time Homebuyer Loan Interest Deduction — Additional Home Loan Interest</span>
            <p className="text-[10px] text-white/40 -mt-2">Additional interest deduction over and above Section 24(b). Derived automatically based on loan sanction date window.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Additional Home Loan Interest (₹)</label>
                <InrField value={d.s80EEA_EE.affordable_home_loan_interest_inr} onCommit={(val) => (send as any)({ type: 'UPDATE_80EEA', field: 'affordable_home_loan_interest_inr', value: val })} />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Loan Sanction Date</label>
                <input
                  type="date"
                  value={d.s80EEA_EE.loan_sanction_date || ''}
                  onChange={(e) => (send as any)({ type: 'UPDATE_80EEA', field: 'loan_sanction_date', value: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono px-3 py-2 focus:border-brandGold focus:ring-0"
                />
              </div>
            </div>
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
