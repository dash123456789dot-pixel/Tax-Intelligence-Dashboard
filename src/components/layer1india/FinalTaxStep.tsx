import React from 'react';
import { useMachine } from '@xstate/react';
import { finalTaxMachine } from '@/machines/finalTaxMachine';
import { FinalTaxContext, formatInr, getValidationStatus } from '@/machines/deriveFinalTax';
import './finalTaxStep.css';

interface FinalTaxStepProps {
  initialContext: FinalTaxContext;
  onBack: () => void;
  onContinue: () => void;
}

export default function FinalTaxStep({ initialContext, onBack, onContinue }: FinalTaxStepProps) {
  const [state, send] = useMachine(finalTaxMachine, {
    input: initialContext,
  });

  const {
    residency_status,
    residency_path,
    tax_regime,
    pan,
    gross_salary_inr,
    business_income_inr,
    other_income_inr,
    taxes_paid_inr,
    raw_json_payload
  } = state.context;

  const validation = getValidationStatus(state.context);

  const handleCopyPayload = () => {
    send({ type: 'COPY_PAYLOAD' });
  };

  return (
    <div id="panel-step-output" className="glass-card p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide font-display uppercase">Step 14 — Final Review & Certification</h2>
        <p className="text-xs text-white/40 mt-1">Review your calculated residency status, total income, and taxes paid before continuing.</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Dynamic Validation and Action Panel */}
        <div id="div-validation-panel" className="flex flex-col gap-3 p-5 bg-brandGreen/5 border border-brandGreen/20 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span id="validation-dot" className={`w-2.5 h-2.5 rounded-full ${validation.valid ? 'bg-brandGreen animate-pulse' : 'bg-brandRed'}`}></span>
              <span id="validation-title" className={`text-xs font-black uppercase tracking-widest ${validation.valid ? 'text-brandGreen' : 'text-brandRed'}`}>
                {validation.message}
              </span>
            </div>
            <button 
              id="btn-copy-payload" 
              onClick={handleCopyPayload} 
              className="px-4 py-2 bg-white/10 hover:bg-brandGreen/20 hover:text-brandGreen text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
            >
              📋 Copy Tax Profile Data
            </button>
          </div>
        </div>

        {/* Visual Compliance Certification Report Grid */}
        <div id="compliance-report-container" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column 1: Residency & Profile */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-brandGold">Your Residency & Profile</span>
            
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs text-white/60">Residency Status:</span>
              <span id="rep-residency" className="text-xs font-black px-2.5 py-0.5 rounded-full bg-brandGold/20 text-brandGold uppercase">{residency_status || 'UNKNOWN'}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs text-white/60">Rule Applied:</span>
              <span id="rep-path" className="text-[10px] font-semibold text-white/80 max-w-[200px] text-right truncate" title={residency_path}>{residency_path || 'None'}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs text-white/60">Income Tax Regime:</span>
              <span id="rep-regime" className="text-xs font-bold text-white">{tax_regime === 'NEW' ? 'NEW (Section 115BAC)' : 'OLD'}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs text-white/60">PAN & Aadhaar:</span>
              <span id="rep-pan" className="text-[10px] font-mono text-white/90">{pan || 'NOT PROVIDED'}</span>
            </div>
          </div>

          {/* Column 2: Financial Aggregates */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-brandGold">Income & Taxes Summary</span>
            
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs text-white/60">Salary (Gross):</span>
              <span id="rep-salary" className="text-xs font-bold text-white font-mono">{formatInr(gross_salary_inr)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs text-white/60">Business Income:</span>
              <span id="rep-business" className="text-xs font-bold text-white font-mono">{formatInr(business_income_inr)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs text-white/60">Other Income:</span>
              <span id="rep-other" className="text-xs font-bold text-white font-mono">{formatInr(other_income_inr)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs text-white/60">Taxes Already Paid:</span>
              <span id="rep-taxes-paid" className="text-xs font-bold text-brandGreen font-mono">{formatInr(taxes_paid_inr)}</span>
            </div>
          </div>
        </div>

        {/* Hidden raw JSON output container for script parity and clipboard copying */}
        <pre className="hidden" id="output-json">{raw_json_payload ? JSON.stringify(raw_json_payload, null, 2) : ''}</pre>
        
        <div className="flex items-center justify-center p-4 bg-brandGold/10 border border-brandGold/20 rounded-2xl mt-2 text-center flex-col gap-3">
          <span className="text-xs text-white font-bold">🎉 Profile Setup Successful!</span>
          <span className="text-[10px] text-white/60 max-w-lg">Your tax profile is complete and your residency status has been determined. You can now proceed to the main Wealth Dashboard.</span>
          <button 
            onClick={onContinue}
            className="px-6 py-3 bg-brandGold text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:brightness-110 transition-all mt-1"
          >
            Open Wealth Dashboard
          </button>
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <button onClick={onBack} className="px-4 py-2.5 bg-white/5 text-white/60 font-bold uppercase text-[9px] tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/5">← Back</button>
      </div>
    </div>
  );
}
