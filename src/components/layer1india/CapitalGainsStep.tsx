import React, { useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { capitalGainsMachine } from '../../machines/capitalGainsMachine';
import { formatINRDisplay } from '../../machines/deriveCapitalGains';

// ---- shared pieces --------------------------------------------------

interface InrFieldProps {
  value: number | null;
  onCommit: (val: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

function InrField({ value, onCommit, className = '', placeholder, disabled = false }: InrFieldProps) {
  const [text, setText] = useState(formatINRDisplay(value));
  useEffect(() => setText(formatINRDisplay(value)), [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      disabled={disabled}
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
      className={`inr-input w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none font-mono ${className}`}
    />
  );
}

function ModuleHeader({ title, hasValue, onToggle, noOptionLabel, yesOptionLabel, onAdd, addLabel, addDisabled }: any) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-sans font-black uppercase tracking-[0.01em] text-brandGold">{title}</span>
        <select
          value={hasValue ? 'true' : 'false'}
          onChange={(e) => onToggle(e.target.value)}
          className="!bg-[#121212] !text-white border border-white/10 rounded-lg text-[10px] text-white px-3 py-1.5 focus:border-brandGold focus:outline-none [color-scheme:dark]"
        >
          <option className="bg-[#121212] text-white" value="false">{noOptionLabel}</option>
          <option className="bg-[#121212] text-white" value="true">{yesOptionLabel}</option>
        </select>
      </div>
      {hasValue && (
        <button
          onClick={onAdd}
          disabled={addDisabled}
          className="px-3 py-1 bg-white/10 hover:bg-brandGold/20 hover:text-brandGold rounded text-[9px] font-black uppercase tracking-[0.01em] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}

function DeleteRowButton({ onClick, label = 'Delete Entry' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="text-[10px] uppercase font-bold tracking-[0.01em] text-brandRed/80 hover:text-brandRed transition-colors">
      {label}
    </button>
  );
}

function CurrencyAmount({ currency, onCurrencyChange, amount, onAmountCommit, currencies = ['INR', 'USD', 'GBP'] }: any) {
  return (
    <div className="flex items-center">
      <select
        value={currency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        className="!bg-[#121212] !text-white border border-white/10 border-r-0 rounded-l-lg text-xs text-white px-2 py-2 focus:border-brandGold focus:outline-none h-full focus:ring-0 [color-scheme:dark]"
      >
        {currencies.map((c: string) => <option key={c} value={c} className="bg-[#121212] text-white">{c === 'INR' ? '₹ INR' : c === 'USD' ? '$ USD' : c === 'GBP' ? '£ GBP' : c === 'EUR' ? '€ EUR' : c}</option>)}
      </select>
      <InrField value={amount} onCommit={onAmountCommit} className="rounded-l-none" placeholder="0" />
    </div>
  );
}

// ---- Property Row ----------------------------------------------------

function PropertyRow({ property, idx, visibility, override, exemptionOptions, send }: any) {
  const update = (field: string) => (value: any) => send({ type: 'UPDATE_PROPERTY', index: idx, field, value });

  return (
    <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 flex flex-col gap-6 relative shadow-lg">
      <div className="flex justify-between items-center border-b border-white/10 pb-3">
        <h3 className="text-sm font-sans font-black uppercase tracking-[0.01em] text-brandGold">Property Details</h3>
        <DeleteRowButton onClick={() => send({ type: 'REMOVE_PROPERTY', index: idx })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Property Type</label>
          <select value={property.property_type} onChange={(e) => update('property_type')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none [color-scheme:dark]">
            <option className="bg-[#121212] text-white" value="residential">Residential</option>
            <option className="bg-[#121212] text-white" value="commercial">Commercial</option>
            <option className="bg-[#121212] text-white" value="land">Land</option>
            <option className="bg-[#121212] text-white" value="agricultural_rural">Agricultural (Rural)</option>
            <option className="bg-[#121212] text-white" value="under_construction">Under Construction</option>
          </select>
        </div>
        <div className="flex flex-col justify-center gap-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" checked={property.is_inherited} onChange={(e) => update('is_inherited')(e.target.checked)} className="rounded bg-white/10 border-white/20 text-brandGold focus:ring-0" />
            <span className="text-[10px] font-bold text-white/80">Property was Inherited/Gifted</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" checked={property.is_joint_property} onChange={(e) => update('is_joint_property')(e.target.checked)} className="rounded bg-white/10 border-white/20 text-brandGold focus:ring-0" />
            <span className="text-[10px] font-bold text-white/80">Joint Ownership</span>
          </label>
        </div>
        {visibility.showJointFields && (
          <div>
            <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold mb-1.5">Your Ownership %</label>
            <InrField value={property.ownership_percentage} onCommit={update('ownership_percentage')} className="border-brandGold/30" placeholder="e.g. 50" />
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/10">
        <label className="text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold">Asset Status:</label>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="radio" checked={property.status === 'sold'} onChange={() => update('status')('sold')} className="rounded bg-white/10 border-white/20 text-brandGold focus:ring-0" />
            <span className="text-[10px] font-bold text-white/80">Sold this Tax Year</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="radio" checked={property.status === 'holding'} onChange={() => update('status')('holding')} className="rounded bg-white/10 border-white/20 text-brandGold focus:ring-0" />
            <span className="text-[10px] font-bold text-white/80">Currently Holding (Recordkeeping)</span>
          </label>
        </div>
      </div>

      <div className="bg-white/5 p-3 rounded-lg border border-white/10">
        <h5 className="text-[11px] font-sans font-black text-white/60 uppercase tracking-[0.01em] mb-3">Purchase Info</h5>
        <div className="space-y-3">
          {visibility.showStandardPurchaseFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Acquisition Date</label>
                <input type="date" value={property.acquisition_date || ''} onChange={(e) => update('acquisition_date')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Actual Cost</label>
                <CurrencyAmount currency={property.actual_cost_currency} onCurrencyChange={update('actual_cost_currency')} amount={property.actual_cost} onAmountCommit={update('actual_cost')} />
              </div>
            </div>
          )}

          {visibility.showInheritFields && (
            <div className="border border-brandGold/30 p-2 rounded bg-[#121212]">
              <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold mb-2">Original Owner Details</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1">Original Acq. Date</label>
                  <input type="date" value={property.original_owner_acquisition_date || ''} onChange={(e) => update('original_owner_acquisition_date')(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white px-2 py-1.5 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1">Original Cost</label>
                  <CurrencyAmount currencies={['INR', 'USD']} currency={property.original_owner_cost_currency} onCurrencyChange={update('original_owner_cost_currency')} amount={property.original_owner_cost} onAmountCommit={update('original_owner_cost')} />
                </div>
              </div>
            </div>
          )}

          {visibility.showPre2001Fmv && (
            <div className="md:w-1/2">
              <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold mb-1.5">FMV as of 1 April 2001 (₹)</label>
              <InrField value={property.pre_2001_fmv_inr} onCommit={update('pre_2001_fmv_inr')} className="border-brandGold/30 text-brandGold" placeholder="Grandfathering FMV" />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/5 p-4 rounded-lg border border-white/10">
        <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-2">
          <h5 className="text-[11px] font-sans font-black text-white/60 uppercase tracking-[0.01em]">Cost of Improvement (Renovations/Additions)</h5>
          <button onClick={() => send({ type: 'ADD_IMPROVEMENT', index: idx })} className="px-3 py-1 bg-white/10 hover:bg-brandGold/20 hover:text-brandGold rounded text-[9px] font-black uppercase tracking-[0.01em] transition-all">
            + Add Improvement
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {property.improvements.map((imp: any, impIdx: number) => (
            <div key={imp.id || impIdx} className="flex items-end gap-3 p-3 bg-[#1a1a1a] rounded-lg border border-white/10 relative">
              <div className="flex-1">
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1">Date of Improvement</label>
                <input type="date" value={imp.improvement_date || ''} onChange={(e) => send({ type: 'UPDATE_IMPROVEMENT', index: idx, impIndex: impIdx, field: 'improvement_date', value: e.target.value })} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-2 py-1.5 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1">Cost (INR)</label>
                <InrField value={imp.improvement_cost_inr} onCommit={(v) => send({ type: 'UPDATE_IMPROVEMENT', index: idx, impIndex: impIdx, field: 'improvement_cost_inr', value: v })} placeholder="0" />
              </div>
              <button onClick={() => send({ type: 'REMOVE_IMPROVEMENT', index: idx, impIndex: impIdx })} className="px-2 py-1.5 bg-brandRed/10 hover:bg-brandRed/20 text-brandRed rounded text-[9px] font-black uppercase tracking-[0.01em] transition-all">
                Del
              </button>
            </div>
          ))}
        </div>
      </div>

      {visibility.showSaleOnlyFields && (
        <>
          <div className="bg-white/5 p-3 rounded-lg border border-white/10">
            <h5 className="text-[11px] font-sans font-black text-white/60 uppercase tracking-[0.01em] mb-3">Sale Info</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Sale Date</label>
                <input type="date" value={property.sale_date || ''} onChange={(e) => update('sale_date')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Sale Consideration</label>
                <CurrencyAmount currency={property.sale_consideration_currency} onCurrencyChange={update('sale_consideration_currency')} amount={property.sale_consideration} onAmountCommit={update('sale_consideration')} />
              </div>
              <div>
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Stamp Duty Value (INR)</label>
                <InrField value={property.stamp_duty_value} onCommit={update('stamp_duty_value')} placeholder="Circle Rate" />
              </div>
              <div>
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Transfer Expenses (Brokerage, Legal) INR</label>
                <InrField value={property.transfer_expenses_inr} onCommit={update('transfer_expenses_inr')} placeholder="0" />
              </div>

              <div className="md:col-span-2 p-4 mt-2 border border-brandGold/20 bg-brandGold/5 rounded-xl">
                <h5 className="text-[11px] font-sans font-black text-brandGold uppercase tracking-[0.01em] mb-3">Buyer Details (Mandatory for ITR)</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold/80 mb-1.5">Buyer Name</label>
                    <input type="text" value={property.buyer_name || ''} onChange={(e) => update('buyer_name')(e.target.value)} placeholder="Full Name" className="w-full !bg-[#121212] !text-white border border-brandGold/30 rounded-lg text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold/80 mb-1.5">Buyer PAN</label>
                    <input type="text" maxLength={10} value={property.buyer_pan || ''} onChange={(e) => update('buyer_pan')(e.target.value.toUpperCase())} placeholder="ABCDE1234F" className="uppercase w-full bg-[#121212] border border-brandGold/30 rounded-lg text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none font-mono" />
                  </div>
                </div>
              </div>

              {override.show50cWarning && (
                <div className="md:col-span-2 p-3 bg-[#121212] border-l-4 border-l-brandRed border-y border-r border-white/10 rounded-r-lg text-xs text-white/80 flex items-center gap-3 shadow-lg">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brandRed/20 shrink-0">
                    <span className="text-brandRed font-black text-sm">!</span>
                  </div>
                  <span>
                    <strong className="text-brandRed uppercase tracking-[0.01em] text-[10px]">Stamp Duty Value for Capital Gains Alert:</strong>
                    <br />
                    Since the Stamp Duty Value exceeds the Sale Consideration by more than 10%, the Stamp Duty Value is deemed as your final Sale Consideration for calculating Capital Gains.
                  </span>
                </div>
              )}

              <div className="md:col-span-2 mt-2 pt-4 border-t border-white/10">
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold mb-1.5">Claim Capital Gains Exemption</label>
                <select value={property.cg_exemption_section || ''} onChange={(e) => update('cg_exemption_section')(e.target.value || null)} className="w-full !bg-[#121212] !text-white border border-brandGold/30 rounded-lg text-xs text-brandGold px-3 py-2.5 focus:border-brandGold focus:outline-none [color-scheme:dark]">
                  {exemptionOptions.map((o: any) => <option className="bg-[#121212] text-white" key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <p className="text-[8px] text-brandGold/50 mt-1.5 leading-relaxed">Note: Exemptions under Reinvestment Provisions are strictly available only to Individuals and HUFs.</p>
              </div>
            </div>
          </div>

          {visibility.showBuyerTds && (
            <div className="bg-white/5 p-3 rounded-lg border border-white/10">
              <h5 className="text-[11px] font-sans font-black text-white/60 uppercase tracking-[0.01em] mb-3">Buyer TDS (For NRIs)</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Buyer TAN</label>
                  <input type="text" value={property.buyer_tan || ''} onChange={(e) => update('buyer_tan')(e.target.value)} placeholder="Req for 195" className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">TDS Deducted (INR)</label>
                  <InrField value={property.buyer_tds_deducted_inr} onCommit={update('buyer_tds_deducted_inr')} placeholder="0" />
                </div>
                <div>
                  <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Challan Number</label>
                  <input type="text" value={property.buyer_tds_challan_number || ''} onChange={(e) => update('buyer_tds_challan_number')(e.target.value)} placeholder="e.g. 12345" className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none font-mono" />
                </div>
              </div>
            </div>
          )}

          {visibility.showReinvestmentDiv && (
            <div className="bg-brandGold/5 p-4 rounded-xl border border-brandGold/20">
              <h5 className="text-[11px] font-sans font-black text-brandGold uppercase tracking-[0.01em] mb-3">Re-Investment Details (Exemption Claim)</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold/80 mb-1.5">Amount Invested / Deposited (INR)</label>
                  <InrField value={property.cg_exempt_invest_amount} onCommit={update('cg_exempt_invest_amount')} className="border-brandGold/30 text-brandGold" placeholder="e.g. 5000000" />
                </div>
                <div>
                  <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold/80 mb-1.5">Date of Investment / Purchase</label>
                  <input type="date" value={property.cg_exempt_invest_date || ''} onChange={(e) => update('cg_exempt_invest_date')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-brandGold/30 rounded-lg text-xs text-brandGold px-3 py-2 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
                </div>
                <div className="md:col-span-2 p-3 bg-black/30 border border-brandGold/10 rounded-lg">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input type="checkbox" checked={property.cg_deposited_in_cgas} onChange={(e) => update('cg_deposited_in_cgas')(e.target.checked)} className="mt-0.5 rounded bg-[#121212] border-brandGold/30 text-brandGold focus:ring-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-brandGold/90">Deposited into Capital Gains Account Scheme (CGAS)</span>
                      <span className="text-[8px] text-brandGold/50 mt-0.5">Check this if the amount was deposited into a CGAS before the ITR filing due date (typically July 31), and the new asset has not yet been purchased/constructed.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---- Buyback Row ----------------------------------------------------

function BuybackRow({ buyback, idx, derived, send }: any) {
  const update = (field: string) => (value: any) => send({ type: 'UPDATE_BUYBACK', index: idx, field, value });
  return (
    <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 flex flex-col gap-6 relative shadow-lg">
      <div className="flex justify-between items-center border-b border-white/10 pb-3">
        <h3 className="text-sm font-sans font-black uppercase tracking-[0.01em] text-brandGold">Buyback Details</h3>
        <DeleteRowButton onClick={() => send({ type: 'REMOVE_BUYBACK', index: idx })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Company Name</label>
          <input type="text" value={buyback.company_name || ''} onChange={(e) => update('company_name')(e.target.value)} placeholder="e.g. Infosys Ltd" className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">ISIN (Optional)</label>
          <input type="text" value={buyback.isin || ''} onChange={(e) => update('isin')(e.target.value.toUpperCase())} placeholder="INE..." className="font-mono uppercase w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Buyback Route</label>
          <select value={buyback.tender_or_open_market} onChange={(e) => update('tender_or_open_market')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none [color-scheme:dark]">
            <option className="bg-[#121212] text-white" value="tender">Tender Offer</option>
            <option className="bg-[#121212] text-white" value="open_market">Open Market</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Listed on Exchange?</label>
          <select value={buyback.is_listed ? 'yes' : 'no'} onChange={(e) => update('is_listed')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none [color-scheme:dark]">
            <option className="bg-[#121212] text-white" value="yes">Yes (Listed)</option>
            <option className="bg-[#121212] text-white" value="no">No (Unlisted)</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Are You a Promoter?</label>
          <select value={buyback.is_promoter ? 'yes' : 'no'} onChange={(e) => update('is_promoter')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none [color-scheme:dark]">
            <option className="bg-[#121212] text-white" value="no">No</option>
            <option className="bg-[#121212] text-white" value="yes">Yes (Promoter)</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Shares Tendered</label>
          <InrField value={buyback.shares_tendered} onCommit={update('shares_tendered')} placeholder="0" />
        </div>
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Buyback Date</label>
          <input type="date" value={buyback.buyback_date || ''} onChange={(e) => update('buyback_date')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-brandGold/5 p-3 rounded-xl border border-brandGold/10">
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold/80 mb-1">Consideration Received (₹)</label>
          <InrField value={buyback.consideration_received_inr} onCommit={update('consideration_received_inr')} placeholder="0" />
        </div>
        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Original Cost (₹)</label>
          <InrField value={buyback.original_cost_inr} onCommit={update('original_cost_inr')} placeholder="0" />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Original Acquisition Date</label>
        <input type="date" value={buyback.original_acquisition_date || ''} onChange={(e) => update('original_acquisition_date')(e.target.value)} className="w-full md:w-1/2 bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
      </div>
      {buyback.buyback_date && (
        <div className="p-3 bg-black/30 border border-white/10 rounded-lg text-[10px] text-white/60">
          Tax treatment: <span className="text-brandGold font-bold">{derived.buyback_pre_or_post_oct2024}</span>
          {derived.gain_classification && <> — <span className="text-brandGold font-bold">{derived.gain_classification}</span></>}
        </div>
      )}
    </div>
  );
}

// ---- Financial Holding Row ----------------------------------------------------

const ASSET_CLASS_OPTIONS = [
  ['listed_equity', 'Listed Equity'], ['foreign_equity_unlisted', 'Foreign Equity / US Stocks'], ['equity_mutual_fund', 'Equity MF'],
  ['debt_mutual_fund_pre_apr23', 'Debt MF (Pre Apr-23)'], ['debt_mutual_fund_post_apr23', 'Debt MF (Post Apr-23)'],
  ['hybrid_mf_equity', 'Hybrid MF (Equity)'], ['hybrid_mf_debt', 'Hybrid MF (Debt)'], ['international_mf', 'Intl MF'], ['fof', 'FoF'],
  ['etf', 'ETF'], ['bond_listed', 'Listed Bond'], ['reit_invit', 'REIT/InvIT'], ['vda_crypto', 'Crypto/VDA'],
  ['nri_specified_debenture', 'NRI Specified Debenture'], ['nri_specified_company_deposit', 'NRI Specified Company Deposit'],
  ['nri_specified_govt_security', 'NRI Specified Govt Security'],
];

function FinancialRow({ tx, idx, visibility, send }: any) {
  const update = (field: string) => (value: any) => send({ type: 'UPDATE_FINANCIAL_TX', index: idx, field, value });
  return (
    <div className="fin-card p-4 bg-[#1a1a1a] border border-white/10 rounded-xl relative">
      <button onClick={() => send({ type: 'REMOVE_FINANCIAL_TX', index: idx })} className="absolute top-4 right-4 text-brandRed/60 hover:text-brandRed font-bold hover:brightness-110 font-sans p-1">✕</button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pr-8">
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Asset Class</label>
          <select value={tx.asset_class} onChange={(e) => update('asset_class')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none [color-scheme:dark]">
            {ASSET_CLASS_OPTIONS.map(([v, l]) => <option className="bg-[#121212] text-white" key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Asset Name / Ticker</label>
          <input type="text" value={tx.asset_name_or_ticker || ''} onChange={(e) => update('asset_name_or_ticker')(e.target.value)} placeholder="e.g. RELIANCE, NIFTYBEES" className="w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Quantity (Units)</label>
          <InrField value={tx.quantity} onCommit={update('quantity')} className="bg-white/5" placeholder="0.00" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/10 mt-2 mb-2">
        <label className="text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold">Asset Status:</label>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="radio" checked={tx.status === 'sold'} onChange={() => update('status')('sold')} className="rounded bg-white/10 border-white/20 text-brandGold focus:ring-0" />
            <span className="text-[10px] font-bold text-white/80">Sold this Tax Year</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="radio" checked={tx.status === 'holding'} onChange={() => update('status')('holding')} className="rounded bg-white/10 border-white/20 text-brandGold focus:ring-0" />
            <span className="text-[10px] font-bold text-white/80">Currently Holding (Recordkeeping)</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
          <h5 className="text-[11px] font-sans font-black text-white/60 uppercase tracking-[0.01em] mb-3">Purchase Info</h5>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Acquisition Date</label>
              <input type="date" value={tx.acquisition_date || ''} onChange={(e) => update('acquisition_date')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Total Purchase Value</label>
              <CurrencyAmount currencies={['INR', 'USD', 'EUR', 'GBP']} currency={tx.purchase_currency} onCurrencyChange={update('purchase_currency')} amount={tx.purchase_value} onAmountCommit={update('purchase_value')} />
            </div>
            {visibility.showGrandfatheringFmv && (
              <div>
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold mb-1.5">FMV on 31 Jan 2018 (₹ per unit)</label>
                <InrField value={tx.fmv_31jan2018_per_unit_inr} onCommit={update('fmv_31jan2018_per_unit_inr')} className="border-brandGold/30 text-brandGold" placeholder="Grandfathering FMV" />
                <span className="text-[8px] text-brandGold/60 mt-1 block">Usually found in Broker's Tax P&L</span>
              </div>
            )}
          </div>
        </div>

        {visibility.showSaleInfo && (
          <div className="bg-white/5 p-3 rounded-lg border border-white/10">
            <h5 className="text-[11px] font-sans font-black text-brandGold/60 uppercase tracking-[0.01em] mb-3">Sale Info</h5>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Sale Date</label>
                <input type="date" value={tx.sale_date || ''} onChange={(e) => update('sale_date')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Total Sale Value</label>
                <CurrencyAmount currencies={['INR', 'USD', 'EUR', 'GBP']} currency={tx.sale_currency} onCurrencyChange={update('sale_currency')} amount={tx.sale_value} onAmountCommit={update('sale_value')} />
              </div>
              <div>
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Traded on Stock Exchange?</label>
                <select value={tx.stt_paid ? 'true' : 'false'} onChange={(e) => update('stt_paid')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none [color-scheme:dark]">
                  <option className="bg-[#121212] text-white" value="true">Yes (STT Paid)</option>
                  <option className="bg-[#121212] text-white" value="false">No (Off-Market / Unlisted)</option>
                </select>
              </div>
              {visibility.showNriExitType && (
                <div>
                  <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">How Was This Exited?</label>
                  <select value={tx.nri_exit_type} onChange={(e) => update('nri_exit_type')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none [color-scheme:dark]">
                    <option className="bg-[#121212] text-white" value="redeemed_at_maturity">Redeemed / Matured (not a capital gain — interest only)</option>
                    <option className="bg-[#121212] text-white" value="sold_to_third_party">Sold to a Third Party (market sale — capital gain applies)</option>
                  </select>
                  <span className="text-[8px] text-white/40 mt-1 block">Redemption at maturity is not a taxable "transfer" under Indian law — only an actual sale to a third party generates a capital gain.</span>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">Brokerage / Expenses (₹)</label>
                <InrField value={tx.transfer_expenses} onCommit={update('transfer_expenses')} placeholder="Optional" />
              </div>
            </div>

            {visibility.showSfea && (
              <div className="mt-4 flex flex-col gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/90">Specified Foreign Exchange Asset (NRI)?</span>
                    <span className="text-[8px] text-white/40">Chapter XII-A flat rate eligibility</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={tx.is_specified_foreign_exchange_asset} onChange={(e) => update('is_specified_foreign_exchange_asset')(e.target.checked)} className="sr-only peer" />
                    <div className="w-7 h-4 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brandGold" />
                  </label>
                </div>
                {visibility.showSfeaInvestmentIncome && (
                  <div>
                    <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-brandGold mb-1.5">Investment Income This Year (Interest/Dividend, ₹)</label>
                    <InrField value={tx.investment_income_this_year} onCommit={update('investment_income_this_year')} className="border-brandGold/30 text-brandGold" placeholder="0" />
                    <span className="text-[8px] text-brandGold/60 mt-1 block">
                      Because this is a Specified Foreign Exchange Asset, this income gets a special flat 20% tax rate under Chapter XII-A.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Commodity Row ----------------------------------------------------

function CommodityRow({ commodity, idx, visibility, send }: any) {
  const update = (field: string) => (value: any) => send({ type: 'UPDATE_COMMODITY', index: idx, field, value });
  return (
    <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 flex flex-col gap-6 relative shadow-lg">
      <div className="flex justify-between items-center border-b border-white/10 pb-3">
        <h3 className="text-sm font-sans font-black uppercase tracking-[0.01em] text-brandGold">Commodity Details</h3>
        <DeleteRowButton onClick={() => send({ type: 'REMOVE_COMMODITY', index: idx })} />
      </div>
      <div className="flex space-x-6 pb-2">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="radio" checked={commodity.status === 'sold'} onChange={() => update('status')('sold')} className="rounded-full bg-white/10 border-white/20 text-brandGold focus:ring-0" />
          <span className="text-[10px] font-bold text-white/80">I Sold This</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="radio" checked={commodity.status === 'holding'} onChange={() => update('status')('holding')} className="rounded-full bg-white/10 border-white/20 text-brandGold focus:ring-0" />
          <span className="text-[10px] font-bold text-white/80">Currently Holding (Recordkeeping)</span>
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Commodity Type</label>
          <select value={commodity.commodity_type} onChange={(e) => update('commodity_type')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none [color-scheme:dark]">
            <option className="bg-[#121212] text-white" value="physical_gold">Physical Gold</option>
            <option className="bg-[#121212] text-white" value="sovereign_gold_bond_original">Sovereign Gold Bond (Original)</option>
            <option className="bg-[#121212] text-white" value="sovereign_gold_bond_secondary">Sovereign Gold Bond (Secondary Market)</option>
            <option className="bg-[#121212] text-white" value="silver">Silver</option>
            <option className="bg-[#121212] text-white" value="gold_etf">Gold ETF</option>
            <option className="bg-[#121212] text-white" value="gold_fund_of_funds">Gold Fund of Funds</option>
            <option className="bg-[#121212] text-white" value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Quantity (Optional)</label>
          <InrField value={commodity.quantity} onCommit={update('quantity')} placeholder="e.g. 50" />
        </div>
      </div>

      {visibility.showSgbMaturityToggle && (
        <div className="mt-2 mb-2 p-3 bg-brandGold/5 border border-brandGold/30 rounded-xl">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" checked={commodity.is_maturity_redemption} onChange={(e) => update('is_maturity_redemption')(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-[#121212] text-brandGold focus:ring-brandGold focus:ring-offset-0" />
            <span className="text-xs text-brandGold font-bold">This was a Maturity Redemption (Tax Exempt)</span>
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Acquisition Date</label>
          <input type="date" value={commodity.acquisition_date || ''} onChange={(e) => update('acquisition_date')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
        </div>
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Purchase Value</label>
          <CurrencyAmount currencies={['INR', 'USD']} currency={commodity.purchase_currency} onCurrencyChange={update('purchase_currency')} amount={commodity.purchase_value} onAmountCommit={update('purchase_value')} />
        </div>
      </div>

      {visibility.showSaleFields && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Sale Date</label>
            <input type="date" value={commodity.sale_date || ''} onChange={(e) => update('sale_date')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
          </div>
          <div>
            <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Sale Value</label>
            <CurrencyAmount currencies={['INR', 'USD']} currency={commodity.sale_currency} onCurrencyChange={update('sale_currency')} amount={commodity.sale_value} onAmountCommit={update('sale_value')} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Unlisted Equity Row ----------------------------------------------------

function UnlistedRow({ unlisted, idx, visibility, send }: any) {
  const update = (field: string) => (value: any) => send({ type: 'UPDATE_UNLISTED', index: idx, field, value });
  return (
    <div className="bg-[#161616] border border-white/10 rounded-2xl p-5 flex flex-col gap-6 relative shadow-lg">
      <div className="flex justify-between items-center border-b border-white/10 pb-3">
        <h3 className="text-sm font-sans font-black uppercase tracking-[0.01em] text-brandGold">Private Shares Transferred</h3>
        <DeleteRowButton onClick={() => send({ type: 'REMOVE_UNLISTED', index: idx })} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Company Name</label>
          <input type="text" value={unlisted.company_name || ''} onChange={(e) => update('company_name')(e.target.value)} placeholder="e.g. ABC Pvt Ltd" className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Number of Shares</label>
          <InrField value={unlisted.number_of_shares} onCommit={update('number_of_shares')} placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Acquisition Date</label>
          <input type="date" value={unlisted.acquisition_date || ''} onChange={(e) => update('acquisition_date')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
        </div>
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Cost Per Share</label>
          <CurrencyAmount currencies={['INR', 'USD', 'EUR', 'GBP']} currency={unlisted.cost_per_share_currency} onCurrencyChange={update('cost_per_share_currency')} amount={unlisted.cost_per_share} onAmountCommit={update('cost_per_share')} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Sale Date</label>
          <input type="date" value={unlisted.sale_date || ''} onChange={(e) => update('sale_date')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
        </div>
        <div>
          <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Sale Price Per Share</label>
          <CurrencyAmount currencies={['INR', 'USD', 'EUR', 'GBP']} currency={unlisted.sale_price_per_share_currency} onCurrencyChange={update('sale_price_per_share_currency')} amount={unlisted.sale_price_per_share} onAmountCommit={update('sale_price_per_share')} />
        </div>
      </div>

      {visibility.showNrFields && (
        <div className="mt-2 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">FMV Valuation Report Date (FEMA)</label>
            <input type="date" value={unlisted.fmv_valuation_report_date || ''} onChange={(e) => update('fmv_valuation_report_date')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none font-mono [color-scheme:dark]" />
          </div>
          <div>
            <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Orig. Investment Currency (Mode of Computation for Capital Gains)</label>
            <select value={unlisted.original_investment_currency} onChange={(e) => update('original_investment_currency')(e.target.value)} className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none [color-scheme:dark]">
              <option className="bg-[#121212] text-white" value="INR">INR</option>
              <option className="bg-[#121212] text-white" value="USD">USD</option>
              <option className="bg-[#121212] text-white" value="EUR">EUR</option>
              <option className="bg-[#121212] text-white" value="GBP">GBP</option>
            </select>
          </div>
          {visibility.showOrigCostField && (
            <div>
              <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/60 mb-1">Orig. Cost (Foreign Currency)</label>
              <InrField value={unlisted.original_cost_in_foreign_currency} onCommit={update('original_cost_in_foreign_currency')} placeholder="0.00" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Broker/Wallet Connect placeholders (explicitly no-op — see header) ----

function BrokerCard({ letter, name, color }: { letter: string; name: string; color: string }) {
  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center text-center gap-3 hover:border-brandGold transition-all cursor-pointer">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: color }}>{letter}</div>
      <span className="text-xs font-bold text-white/80">{name}</span>
      <button onClick={() => {}} className="px-3 py-1 bg-white/10 rounded text-[9px] uppercase tracking-[0.01em] hover:bg-brandGold hover:text-black font-bold w-full transition-all">
        Connect
      </button>
    </div>
  );
}

function BrokerApiTab() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h5 className="text-[11px] font-sans font-black text-white/60 uppercase tracking-[0.01em] mb-3">Stock Brokers</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <BrokerCard letter="Z" name="Zerodha" color="#387ed1" />
          <BrokerCard letter="G" name="Groww" color="#00d09c" />
          <BrokerCard letter="A" name="Angel One" color="#ff6a00" />
        </div>
      </div>
      <div>
        <h5 className="text-[11px] font-sans font-black text-white/60 uppercase tracking-[0.01em] mb-3">Crypto Exchanges</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <BrokerCard letter="B" name="Binance" color="#f3ba2f" />
          <BrokerCard letter="C" name="Coinbase" color="#0052ff" />
          <BrokerCard letter="K" name="Kraken" color="#5741d9" />
          <BrokerCard letter="D" name="CoinDCX" color="#00b8d9" />
        </div>
      </div>
      <div>
        <h5 className="text-[11px] font-sans font-black text-white/60 uppercase tracking-[0.01em] mb-3">On-Chain Wallets</h5>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col md:flex-row items-center gap-4">
          <input type="text" placeholder="Enter Wallet Address (ETH, BTC, SOL)" className="w-full !bg-[#121212] !text-white border border-white/10 rounded-lg text-xs text-white px-4 py-3 focus:border-brandGold focus:outline-none font-mono" />
          <button onClick={() => {}} className="whitespace-nowrap px-6 py-3 bg-brandGold text-black rounded-lg text-[10px] uppercase tracking-[0.01em] font-black hover:brightness-110 transition-all">
            Sync Wallet
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- main component ---------------------------------------------------

interface CapitalGainsStepProps {
  taxRegime: string;
  entityType: string;
  residencyStatus: string;
  hasCapitalGains: boolean;
  onBack: () => void;
  onContinue: (context: any) => void;
}

export default function CapitalGainsStep({ taxRegime, entityType, residencyStatus, hasCapitalGains, onBack, onContinue }: CapitalGainsStepProps) {
  const [state, send] = useMachine(capitalGainsMachine, { 
    input: {
      entity_type: entityType,
      final_india_residency_status: residencyStatus,
      has_capital_gains: hasCapitalGains
    } 
  });
  
  useEffect(() => {
    send({ type: 'SET_ENTITY_TYPE', value: entityType });
    send({ type: 'SET_RESIDENCY_STATUS', value: residencyStatus });
    send({ type: 'SET_HAS_CAPITAL_GAINS', value: hasCapitalGains });
  }, [entityType, residencyStatus, hasCapitalGains, send]);

  const ctx = state.context;
  const { property, share_buyback, financial_holdings, commodities, unlisted_equity, ui } = ctx;
  const { visibility: v, buybackDerived, propertyOverrides } = ui as any;

  if (!v) return null; // Wait for derivation

  return (
    <div id="panel-step-cg" className="glass-card p-6 lg:p-8 flex flex-col gap-6" style={{ colorScheme: 'dark' }}>
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide font-display uppercase">Screen 2H — Capital Gains</h2>
        <p className="text-xs text-white/40 mt-1">
          Enter your property sales, and connect your broker or upload a CSV to automatically import your Capital Gains from shares and mutual funds.
        </p>
      </div>

      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white mb-1">Do you have any capital gains or property sales?</h3>
          <p className="text-[10px] text-white/40">Includes property, mutual funds, stocks, crypto, gold, buybacks, etc.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={ctx.cg_section_gate_open} onChange={(e) => send({ type: 'TOGGLE_CG_SECTION', value: e.target.checked })} className="sr-only peer" />
          <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brandGold peer-checked:after:bg-black" />
        </label>
      </div>

      {v.divCgSection && (
        <div id="div-cg-section" className="flex flex-col gap-6">
          {/* Property */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
            <ModuleHeader
              title="Immovable Property Sales"
              hasValue={property.has_indian_property_transaction}
              onToggle={(val: any) => send({ type: 'TOGGLE_PROPERTY_MODULE', value: val })}
              noOptionLabel="No Property"
              yesOptionLabel="Yes, Own or Sold Property"
              onAdd={() => send({ type: 'ADD_PROPERTY' })}
              addLabel="+ Add Property"
            />
            {property.has_indian_property_transaction && (
              <div className="grid grid-cols-1 gap-4">
                {property.properties.map((p, idx) => (
                  <PropertyRow key={p.id || idx} property={p} idx={idx} visibility={v.properties[idx]} override={propertyOverrides[idx]} exemptionOptions={v.propertyExemptionOptions} send={send} />
                ))}
              </div>
            )}
          </div>

          {/* Share Buybacks */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
            <ModuleHeader
              title="Share Buybacks"
              hasValue={share_buyback.has_buyback_transaction}
              onToggle={(val: any) => send({ type: 'TOGGLE_BUYBACK_MODULE', value: val })}
              noOptionLabel="No Buybacks"
              yesOptionLabel="Yes, Tendered Shares"
              onAdd={() => send({ type: 'ADD_BUYBACK' })}
              addLabel="+ Add Buyback"
            />
            {share_buyback.has_buyback_transaction && (
              <div className="grid grid-cols-1 gap-4">
                {share_buyback.transactions.map((b, idx) => (
                  <BuybackRow key={b.id || idx} buyback={b} idx={idx} derived={buybackDerived[idx]} send={send} />
                ))}
              </div>
            )}
          </div>

          {/* Financial Holdings (Stocks/Crypto) */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
            <ModuleHeader
              title="Stocks and Crypto Trading"
              hasValue={financial_holdings.has_financial_transactions}
              onToggle={(val: any) => send({ type: 'TOGGLE_FINANCIAL_MODULE', value: val })}
              noOptionLabel="No Transactions"
              yesOptionLabel="Yes, CG Events Exist"
              onAdd={() => send({ type: 'ADD_FINANCIAL_TX' })}
              addLabel="+ Add CG Entry"
              addDisabled={financial_holdings.active_tab !== 'manual'}
            />
            {financial_holdings.has_financial_transactions && (
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex space-x-2 border-b border-white/10 pb-2">
                  {['upload', 'api', 'manual'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => send({ type: 'SWITCH_FIN_TAB', value: tab })}
                      className={
                        'px-4 py-2 text-xs font-bold transition-all ' +
                        (financial_holdings.active_tab === tab ? 'text-brandGold border-b-2 border-brandGold' : 'text-white/40 hover:text-white')
                      }
                    >
                      {tab === 'upload' ? 'Upload CSV' : tab === 'api' ? 'Brokers and Crypto connect' : 'Manual Entry'}
                    </button>
                  ))}
                </div>

                {financial_holdings.active_tab === 'upload' && (
                  <div className="flex flex-col gap-4">
                    <div onClick={() => {}} className="border-2 border-dashed border-white/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-brandGold transition-all cursor-pointer bg-white/5">
                      <svg className="w-8 h-8 text-white/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      <span className="text-sm font-bold text-white/80 mb-1">Click to Upload Broker Tax P&L</span>
                      <span className="text-xs text-white/40">Supported formats: .csv, .xlsx from Zerodha, Groww, Upstox, etc.</span>
                    </div>
                  </div>
                )}

                {financial_holdings.active_tab === 'api' && <BrokerApiTab />}

                {financial_holdings.active_tab === 'manual' && (
                  <div className="overflow-x-auto">
                    <div className="text-[9px] text-brandGold/80 bg-brandGold/5 border border-brandGold/20 rounded-xl px-4 py-3 mb-3">
                      💡 Profits from selling shares held for a short time are taxed at 20%. Long-term profits are taxed at 12.5% (above ₹1.25 Lakh).
                    </div>
                    <div className="space-y-4">
                      {financial_holdings.transactions.map((tx, idx) => (
                        <FinancialRow key={tx.id || idx} tx={tx} idx={idx} visibility={v.financials[idx]} send={send} />
                      ))}
                    </div>
                    <button onClick={() => send({ type: 'ADD_FINANCIAL_TX' })} className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all">
                      + Add Asset Transaction
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Commodities */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
            <ModuleHeader
              title="Physical Gold & Sovereign Gold Bonds (SGBs)"
              hasValue={commodities.has_commodity_transactions}
              onToggle={(val: any) => send({ type: 'TOGGLE_COMMODITY_MODULE', value: val })}
              noOptionLabel="No Transactions"
              yesOptionLabel="Yes, I hold or sold Gold/SGBs"
              onAdd={() => send({ type: 'ADD_COMMODITY' })}
              addLabel="+ Add Transaction"
            />
            {commodities.has_commodity_transactions && (
              <div className="grid grid-cols-1 gap-4">
                {commodities.transactions.map((c, idx) => (
                  <CommodityRow key={c.id || idx} commodity={c} idx={idx} visibility={v.commodities[idx]} send={send} />
                ))}
              </div>
            )}
          </div>

          {/* Unlisted Equity */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
            <ModuleHeader
              title="Profits from Selling Private Company Shares"
              hasValue={unlisted_equity.has_unlisted_equity_transaction}
              onToggle={(val: any) => send({ type: 'TOGGLE_UNLISTED_MODULE', value: val })}
              noOptionLabel="No Private Shares Sold"
              yesOptionLabel="Yes, Private Shares Sold"
              onAdd={() => send({ type: 'ADD_UNLISTED' })}
              addLabel="+ Add Transfer"
            />
            {unlisted_equity.has_unlisted_equity_transaction && (
              <>
                <div className="text-[9px] text-brandGold/80 bg-brandGold/5 border border-brandGold/20 rounded-xl px-4 py-3 mb-3">
                  ⚖️ Shares held for more than 2 years are taxed at 20%. Shares held for a shorter period are taxed at your normal slab rate.
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {unlisted_equity.transactions.map((u, idx) => (
                    <UnlistedRow key={u.id || idx} unlisted={u} idx={idx} visibility={v.unlisted[idx]} send={send} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between mt-4">
        <button onClick={onBack} className="px-4 py-2.5 bg-white/5 text-white/60 font-bold uppercase text-[9px] tracking-[0.01em] rounded-xl hover:bg-white/10 transition-all border border-white/5">
          ← Back
        </button>
        <button onClick={() => onContinue?.(ctx)} className="px-6 py-2.5 bg-brandGold text-black font-black uppercase text-[10px] tracking-[0.01em] rounded-xl hover:brightness-110 transition-all">
          Next Step
        </button>
      </div>
    </div>
  );
}
