// ────────────────────────────────────────────────────────────────────────
// HousePropertyStep.tsx
// React port of panel-step-hp ("Screen 2F — House Property / DOM-02") from
// layer1_india.html.
// ────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { housePropertyMachine } from '@/machines/hpMachine';
import { formatINRDisplay, PropertyDetails, PropertyUI } from '@/machines/deriveHouseProperty';

const HP_CSS = `
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

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none peer-disabled:opacity-50 peer-disabled:cursor-not-allowed rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-brandGold after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brandGold/20 peer-checked:after:bg-brandGold" />
    </label>
  );
}

interface InrBlurFieldProps {
  id: string;
  value: number | null | undefined;
  onCommit: (raw: string) => void;
  disabled?: boolean;
  className?: string;
}

function InrBlurField({ id, value, onCommit, disabled = false, className = '' }: InrBlurFieldProps) {
  const [text, setText] = useState(formatINRDisplay(value));
  useEffect(() => setText(formatINRDisplay(value)), [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      id={id}
      disabled={disabled}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        const isNegative = raw.trim().startsWith('-');
        const digitsOnly = raw.replace(/[^\d]/g, '');
        const formatted = digitsOnly === '' ? (isNegative ? '-' : '') : (isNegative ? '-' : '') + Number(digitsOnly).toLocaleString('en-IN');
        setText(formatted);
      }}
      onBlur={(e) => onCommit(e.target.value)}
      className={
        'inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono ' +
        className
      }
    />
  );
}

interface UploadSlotProps {
  label: string;
  icon: string;
  status: 'idle' | 'scanning' | 'success';
  onStart: () => void;
}

function UploadSlot({ label, icon, status, onStart }: UploadSlotProps) {
  const isScanning = status === 'scanning';
  const isSuccess = status === 'success';
  const borderClass = isSuccess
    ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10'
    : 'border-brandGold/30 bg-brandGold/5 hover:bg-brandGold/10';
  const titleClass = isSuccess ? 'text-green-400' : 'text-brandGold';
  const titleText = isScanning ? 'Scanning Document...' : isSuccess ? 'Extraction Successful' : label;
  const descClass = isSuccess ? 'text-green-400/60' : 'text-brandGold/60';
  const descText = isScanning ? 'Extracting data...' : isSuccess ? 'Values filled!' : 'Upload';

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div
      className={`border border-dashed ${borderClass} rounded-xl p-3 text-center cursor-pointer transition-colors relative`}
      onClick={() => fileInputRef.current?.click()}
    >
      <span className={`text-xs font-bold ${titleClass} block mb-1 ${isScanning ? 'animate-pulse' : ''}`}>
        {icon} {titleText}
      </span>
      <span className={`text-[9px] ${descClass}`}>{descText}</span>
      <input
        ref={fileInputRef}
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

interface PropertyCardProps {
  prop: PropertyDetails;
  idx: number;
  visibility: PropertyUI;
  taxRegime: string;
  send: (event: any) => void;
}

function PropertyCard({ prop, idx, visibility, taxRegime, send }: PropertyCardProps) {
  const update = (field: string) => (value: any) => send({ type: 'UPDATE_HP_FIELD', index: idx, field, value });
  const [showTds, setShowTds] = useState(!!prop.tenant_tds_deducted_inr);

  useEffect(() => {
    if (prop.tenant_tds_deducted_inr === null) {
      setShowTds(false);
    }
  }, [prop.tenant_tds_deducted_inr]);

  return (
    <div className="p-5 bg-[#121212] border border-white/10 rounded-2xl flex flex-col gap-5 relative group">
      <button
        type="button"
        onClick={() => send({ type: 'REMOVE_HOUSE_PROPERTY', index: idx })}
        className="absolute top-4 right-4 text-white/20 hover:text-brandRed transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      <h3 className="text-base font-sans font-black text-white/80 tracking-[0.01em] uppercase">Property {idx + 1}</h3>

      <div className="flex items-start gap-2 bg-brandGold/5 border border-brandGold/20 p-3 rounded-xl mb-4 mt-4">
        <svg className="w-4 h-4 text-brandGold mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[10px] text-brandGold/80 leading-relaxed">
          <strong>Smart Extraction:</strong> Uploading documents allows our AI engine to instantly auto-fill the values below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <UploadSlot
          label="Home Loan Cert."
          icon="🏦"
          status={prop._uploads.loan}
          onStart={() => send({ type: 'HP_UPLOAD_START', index: idx, slot: 'loan' })}
        />
        <UploadSlot
          label="Rental Agreement"
          icon="📄"
          status={prop._uploads.rent}
          onStart={() => send({ type: 'HP_UPLOAD_START', index: idx, slot: 'rent' })}
        />
        <UploadSlot
          label="Municipal Tax"
          icon="🏛️"
          status={prop._uploads.tax}
          onStart={() => send({ type: 'HP_UPLOAD_START', index: idx, slot: 'tax' })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1">Property Use</label>
          <select
            value={prop.property_use}
            onChange={(e) => update('property_use')(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono [color-scheme:dark]"
          >
            <option className="bg-[#1c1c1c] text-white" value="SOP">Self-Occupied (SOP)</option>
            <option className="bg-[#1c1c1c] text-white" value="LOP">Let-Out (LOP)</option>
            <option className="bg-[#1c1c1c] text-white" value="DLOP">Deemed Let-Out (DLOP)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1">Co-owner Share (%)</label>
          <InrBlurField id={`hp-share-${idx}`} value={prop.co_owner_share_percent} onCommit={update('co_owner_share_percent')} />
        </div>
      </div>

      {visibility.showFinancialValuesRepresent && (
        <div className="bg-brandGold/10 border border-brandGold/30 p-3 rounded-xl">
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold mb-1">
            Financial Values Represent
          </label>
          <select
            value={prop.financial_values_represent}
            onChange={(e) => update('financial_values_represent')(e.target.value)}
            className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono [color-scheme:dark]"
          >
            <option className="bg-[#1c1c1c] text-white" value="TOTAL_PROPERTY">
              Total Property Value (Engine will compute your share)
            </option>
            <option className="bg-[#1c1c1c] text-white" value="MY_SHARE_ONLY">My Share Only</option>
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={'transition-all ' + (!visibility.showGavAndTax ? 'opacity-30 pointer-events-none hidden' : '')}>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40">Gross Annual Value (GAV)</label>
            <button
              type="button"
              onClick={() => setShowTds(!showTds)}
              className="text-[9px] font-sans font-bold text-brandGold/80 hover:text-brandGold uppercase tracking-wider"
            >
              + Add TDS
            </button>
          </div>
          <InrBlurField id={`hp-gav-${idx}`} value={prop.gross_annual_value_inr} onCommit={update('gross_annual_value_inr')} disabled={!visibility.showGavAndTax} />
          {showTds && (
            <div className="mt-3">
              <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1">
                Tenant TDS Deducted
                <span className="block text-[8px] text-white/30 normal-case tracking-normal font-sans font-normal mt-0.5">
                  s.194-I (10%, business tenant) or s.194-IB (2%, individual/HUF tenant)
                </span>
              </label>
              <InrBlurField
                id={`hp-tds-${idx}`}
                value={prop.tenant_tds_deducted_inr}
                onCommit={update('tenant_tds_deducted_inr')}
                disabled={!visibility.showGavAndTax}
              />
            </div>
          )}
        </div>
        <div className={'transition-all ' + (!visibility.showGavAndTax ? 'opacity-30 pointer-events-none hidden' : '')}>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1">Municipal Taxes Paid</label>
          <InrBlurField id={`hp-tax-${idx}`} value={prop.municipal_taxes_paid_inr} onCommit={update('municipal_taxes_paid_inr')} disabled={!visibility.showGavAndTax} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={'transition-all ' + (!visibility.showInterestFields ? 'opacity-30 pointer-events-none hidden' : '')}>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1">Interest on Borrowed Capital</label>
          <InrBlurField id={`hp-interest-${idx}`} value={prop.interest_on_borrowed_capital_inr} onCommit={update('interest_on_borrowed_capital_inr')} disabled={!visibility.showInterestFields} />
        </div>
        <div className={'transition-all ' + (!visibility.showInterestFields ? 'opacity-30 pointer-events-none hidden' : '')}>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1">Pre-Construction Interest</label>
          <InrBlurField id={`hp-preconstruction-${idx}`} value={prop.pre_construction_interest_inr} onCommit={update('pre_construction_interest_inr')} disabled={!visibility.showInterestFields} />
        </div>
      </div>

      <div className={'flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg transition-all ' + (!visibility.showSelfOccupiedToggle ? 'opacity-30 pointer-events-none hidden' : '')}>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-white/80">Self-Occupied with active loan?</span>
          <span className="text-[9px] text-brandGold/70">Required to claim max ₹2L deduction under Section 24(b).</span>
        </div>
        <ToggleSwitch
          checked={prop.is_self_occupied_with_loan}
          onChange={update('is_self_occupied_with_loan')}
          disabled={taxRegime === 'NEW'}
        />
      </div>
    </div>
  );
}

// ---- main component ---------------------------------------------------

interface HousePropertyStepProps {
  taxRegime: string;
  entityType: string;
  onBack?: (targetStepId: string) => void;
  onContinue?: (context: any) => void;
}

export default function HousePropertyStep({ taxRegime, entityType, onBack, onContinue }: HousePropertyStepProps) {
  const [state, send] = useMachine(housePropertyMachine, {
    input: { tax_regime: taxRegime, entity_type: entityType },
  });

  useEffect(() => {
    send({ type: 'SET_TAX_REGIME', value: taxRegime });
  }, [taxRegime, send]);

  useEffect(() => {
    send({ type: 'SET_ENTITY_TYPE', value: entityType });
  }, [entityType, send]);

  const ctx = state.context;
  const { house_property: hp, ui, entity_type } = ctx;
  const { visibility: v } = ui;

  const backTarget = entity_type === 'individual' ? 'step-salary' : 'step-bank';

  return (
    <>
      <style>{HP_CSS}</style>
      <div id="panel-step-hp" className="glass-card p-6 lg:p-8 flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h2 className="text-[22px] font-sans font-bold text-white tracking-[0.01em] uppercase">
              Screen 2F — House Property <span className="text-white/40 text-sm ml-2">(DOM-02)</span>
            </h2>
            <p className="text-sm font-sans text-white/50 mt-1 uppercase tracking-[0.01em] font-bold">
              Rental Income &amp; Home Loan Interest
            </p>
          </div>
        </div>

        <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white/80">Do you own any house property?</span>
              <span className="text-[10px] text-white/40 mt-1">
                Includes properties generating rent or properties with an active home loan.
              </span>
            </div>
            <ToggleSwitch checked={hp.has_house_property_income} onChange={(val) => send({ type: 'TOGGLE_HP_SECTION', value: val })} />
          </div>
        </div>

        {v.divHpSection && (
          <div id="div-hp-section" className="flex flex-col gap-6">
            <div id="hp-list" className="flex flex-col gap-6">
              {hp.properties.map((prop, idx) => (
                <PropertyCard key={idx} prop={prop} idx={idx} visibility={v.properties[idx]} taxRegime={taxRegime} send={send} />
              ))}
            </div>

            <button
              type="button"
              onClick={() => send({ type: 'ADD_HOUSE_PROPERTY' })}
              className="w-full py-4 border border-dashed border-white/20 hover:border-brandGold hover:bg-brandGold/5 rounded-2xl flex items-center justify-center gap-2 text-white/60 hover:text-brandGold transition-all font-bold text-xs uppercase tracking-widest"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Property
            </button>
          </div>
        )}

        <div className="flex justify-between mt-8 border-t border-white/10 pt-6">
          <button
            type="button"
            onClick={() => onBack?.(backTarget)}
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
