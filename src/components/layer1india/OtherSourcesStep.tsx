import React, { useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { otherSourcesMachine } from '../../machines/otherSourcesMachine';
import { formatINRDisplay } from '../../machines/deriveOtherSources';
import './otherSourcesStep.css';

// ---- shared pieces --------------------------------------------------

function ToggleSwitch({ checked, onChange, size = 'md' }: { checked: boolean, onChange: (val: boolean) => void, size?: 'sm' | 'md' }) {
  const track = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6';
  const knob = size === 'sm' ? 'after:h-4 after:w-4' : 'after:h-5 after:w-5';
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div
        className={`${track} bg-white/10 peer-focus:outline-none peer-disabled:opacity-50 peer-disabled:cursor-not-allowed rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border ${knob} after:rounded-full after:transition-all peer-checked:bg-brandGold peer-checked:after:bg-black`}
      />
    </label>
  );
}

function InrField({ id, value, onCommit, className = '', placeholder = '₹ 0' }: any) {
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

// A field with a collapsible "+ Add TDS" sub-input. The collapse state is
// local UI-only (matches the original's bare classList.toggle with no
// state write); the TDS value itself is real domain state once entered.
function FieldWithTds({ label, subtitle, fieldId, value, onCommit, tdsLabel, tdsNote, tdsValue, onTdsCommit }: any) {
  const [tdsOpen, setTdsOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">{label}</label>
        {tdsLabel && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setTdsOpen((o) => !o)} className="text-[8px] text-brandGold/80 hover:text-brandGold uppercase font-bold tracking-wider">
              + Add TDS
            </button>
          </div>
        )}
      </div>
      <InrField id={fieldId} value={value} onCommit={onCommit} />
      {subtitle && <p className="text-[8px] text-white/30 mt-1">{subtitle}</p>}
      {tdsLabel && tdsOpen && (
        <div className="mt-3">
          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">
            {tdsLabel}
            <span className="block text-[7px] text-white/30 normal-case tracking-normal font-normal mt-0.5">{tdsNote}</span>
          </label>
          <InrField value={tdsValue} onCommit={onTdsCommit} />
        </div>
      )}
    </div>
  );
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="cursor-help text-brandGold/70 hover:text-brandGold transition-colors relative z-50">
      <span className="font-bold text-[9px] peer">(i)</span>
      <div className="hidden peer-hover:block hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[#1A1A1A] border border-brandGold/20 rounded-xl shadow-2xl text-[9px] text-white/80 normal-case tracking-normal leading-relaxed z-50 text-left cursor-default">
        {text}
      </div>
    </span>
  );
}

// ---- main component ---------------------------------------------------

export default function OtherSourcesStep({ initialContext, onBack, onContinue }: any) {
  const [state, send] = useMachine(otherSourcesMachine as any, { input: initialContext });
  const ctx = state.context;
  const { other_sources: os, agricultural: ag, ui } = ctx;
  const { visibility: v } = ui;

  const update = (field: string) => (raw: string) => send({ type: 'UPDATE_OS_FIELD', field, value: raw } as any);

  return (
    <div id="panel-step-os" className="glass-card p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <h2 id="title-step-os" className="text-xl font-bold text-white tracking-wide font-display uppercase">Screen 2I — Other Sources</h2>
        <p className="text-xs text-white/40 mt-1">Enter your dividend, interest, crypto gifts, and other residual income.</p>
      </div>

      {/* Gatekeeper Toggle */}
      <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white mb-1">Do you have any income from other sources?</h3>
          <p className="text-[10px] text-white/40">Includes savings interest, FDs, bonds, dividends, pension, and gaming.</p>
        </div>
        <ToggleSwitch checked={os.has_other_sources_income} onChange={(val) => send({ type: 'TOGGLE_OS_SECTION', value: val } as any)} />
      </div>

      {v.divOsSection && (
        <div id="div-os-section" className="flex flex-col gap-6">
          {/* 1. Slab-Rate Streams */}
          <div className="p-5 bg-[#161616] border border-white/10 rounded-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-brandGold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-xs font-black uppercase tracking-widest text-brandGold mb-4 relative">1. Slab-Rate Streams</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Savings Bank Interest</label>
                <InrField id="os-interest-savings" value={os.interest_savings_inr} onCommit={update('interest_savings_inr')} />
              </div>

              <FieldWithTds
                label="FD / RD Interest"
                fieldId="os-interest-fd"
                value={os.interest_fd_rd_inr}
                onCommit={update('interest_fd_rd_inr')}
                tdsLabel="TDS Deducted on FD/RD Interest"
                tdsNote="s.194A — usually 10%, only above the annual threshold"
                tdsValue={os.interest_fd_rd_tds_inr}
                onTdsCommit={update('interest_fd_rd_tds_inr')}
              />

              <FieldWithTds
                label="Bonds / Debentures Interest"
                fieldId="os-bonds"
                value={os.interest_bonds_inr}
                onCommit={update('interest_bonds_inr')}
                tdsLabel="TDS Deducted on Bonds/Debentures Interest"
                tdsNote="s.193 — usually 10%"
                tdsValue={os.interest_bonds_tds_inr}
                onTdsCommit={update('interest_bonds_tds_inr')}
              />

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">IT Refund Interest</label>
                <InrField id="os-it-refund" value={os.interest_on_it_refund_inr} onCommit={update('interest_on_it_refund_inr')} />
              </div>

              <FieldWithTds
                label="Dividend Income"
                fieldId="os-dividend"
                value={os.dividend_inr}
                onCommit={update('dividend_inr')}
                tdsLabel="TDS Deducted on Dividend"
                tdsNote="s.194 — usually 10%, only above ₹5,000/payer/FY"
                tdsValue={os.dividend_tds_inr}
                onTdsCommit={update('dividend_tds_inr')}
              />

              {v.showGiftsInput && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 flex items-center gap-1 w-fit relative z-10">
                      Gifts &gt; ₹50k (Income from Other Sources)
                      <Tooltip text={v.giftsRelativeTooltipText} />
                    </label>
                  </div>
                  <InrField id="os-gifts" value={os.gifts_above_50k_inr} onCommit={update('gifts_above_50k_inr')} className="mb-2" />
                  {v.divGiftsExemptions && (
                    <div className="flex flex-col gap-1 mt-1">
                      {/* Dead in the original (no onchange handler) — rendered inert to match */}
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" className="form-checkbox bg-transparent border-white/20 text-brandGold rounded focus:ring-brandGold/50 transition-colors w-3 h-3" />
                        <span className="text-[9px] uppercase tracking-wider text-white/40 group-hover:text-white/60 transition-colors">Exempt: Received on occasion of marriage</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" className="form-checkbox bg-transparent border-white/20 text-brandGold rounded focus:ring-brandGold/50 transition-colors w-3 h-3" />
                        <span className="text-[9px] uppercase tracking-wider text-white/40 group-hover:text-white/60 transition-colors">Exempt: Received from specified relative</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {v.showTrustGiftsBanner && (
                <div className="p-3 bg-brandGold/10 border border-brandGold/20 rounded-xl flex items-center gap-3">
                  <span className="text-xl text-brandGold/80">🤝</span>
                  <span className="text-[10px] text-brandGold/80">
                    <strong>Fully Exempt:</strong> Gifts/Contributions are fully exempt Trust &amp; NGO Tax Exemptions / 13A.
                  </span>
                </div>
              )}

              {v.divLocalAuthority && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Local Authority Income Exemption</label>
                  <InrField id="os-local-authority" value={os.local_authority_s10_20_inr} onCommit={update('local_authority_s10_20_inr')} />
                  <p className="text-[8px] text-white/30 mt-1">Blanket exemption on income of a Local Authority.</p>
                </div>
              )}

              {v.divSpousalClubbing && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Spousal Income Clubbing (Clubbing of Income)</label>
                  <InrField id="os-spousal-clubbing" value={os.spousal_clubbing_s64_inr} onCommit={update('spousal_clubbing_s64_inr')} />
                  <p className="text-[8px] text-white/30 mt-1">Income of spouse clubbed with your income under Clubbing of Income.</p>
                </div>
              )}

              {v.divMinorChild && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Minor Child Income Exemption</label>
                  <InrField id="os-minor-child" value={os.minor_child_exemption_inr} onCommit={update('minor_child_exemption_inr')} />
                  <p className="text-[8px] text-white/30 mt-1">Minor Child Income Exemption: ₹1,500 max per minor child whose income is clubbed.</p>
                </div>
              )}

              {v.divLicMaturity && (
                <div>
                  <FieldWithTds
                    label="Life Insurance Policy Maturity Exemption"
                    fieldId="os-lic-maturity"
                    value={os.lic_maturity_inr}
                    onCommit={update('lic_maturity_inr')}
                    subtitle="Amount received from life insurance policies not exempt u/s 10(10D)."
                    tdsLabel="TDS Deducted on Maturity Payout"
                    tdsNote="s.194DA — usually 5% on the taxable portion"
                    tdsValue={os.lic_maturity_tds_inr}
                    onTdsCommit={update('lic_maturity_tds_inr')}
                  />
                </div>
              )}

              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 flex items-center gap-1 w-fit relative z-10">
                  Miscellaneous / Other income
                  <Tooltip text="Any other residual taxable income not covered elsewhere (e.g. Director fees, commissions, agricultural land rent, etc.)." />
                </label>
                <InrField id="os-misc" value={os.miscellaneous_income_inr} onCommit={update('miscellaneous_income_inr')} />
                <p className="text-[8px] text-white/30 mt-1">Any other miscellaneous or residual income taxed at standard slab rates.</p>
              </div>

              {v.divAngelTax && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-brandRed mb-1">Angel Tax Premium (Income from Other Sources(2)(viib))</label>
                  <InrField id="os-angel-tax" value={os.angel_tax_premium_inr} onCommit={update('angel_tax_premium_inr')} className="bg-brandRed/5 border-brandRed/20 focus:border-brandRed" />
                  <p className="text-[8px] text-white/30 mt-1">For closely held companies issuing shares above FMV.</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Retirement & Exempt Receipts (individual only) */}
          {v.cardRetirement && (
            <div id="card-os-retirement" className="p-5 bg-[#161616] border border-white/10 rounded-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-2 mb-4 relative">
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">2. Retirement &amp; Exempt Receipts</h3>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">Section 10</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-emerald-400/80 mb-1">Exempt Interest (PPF/EPF)</label>
                  <InrField id="os-exempt-pf-interest" value={os.exempt_interest_ppf_epf_inr} onCommit={update('exempt_interest_ppf_epf_inr')} className="border-emerald-500/30 focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Taxable EPF Interest (&gt; ₹2.5L)</label>
                  <InrField id="os-taxable-epf-interest" value={os.taxable_epf_interest_inr} onCommit={update('taxable_epf_interest_inr')} />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-emerald-400/80 mb-1">Exempt PF Withdrawal</label>
                  <InrField id="os-exempt-pf-with" value={os.exempt_pf_withdrawal_inr} onCommit={update('exempt_pf_withdrawal_inr')} className="border-emerald-500/30 focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-emerald-400/80 mb-1">Exempt NPS Withdrawal (60%)</label>
                  <InrField id="os-exempt-nps" value={os.exempt_nps_withdrawal_inr} onCommit={update('exempt_nps_withdrawal_inr')} className="border-emerald-500/30 focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Taxable NPS Withdrawal</label>
                  <InrField id="os-taxable-nps" value={os.taxable_nps_withdrawal_inr} onCommit={update('taxable_nps_withdrawal_inr')} />
                </div>
              </div>
            </div>
          )}

          {/* 3. Family Pension (individual only) */}
          {v.cardFamilyPension && (
            <div id="card-os-family-pension" className="p-5 bg-[#161616] border border-white/10 rounded-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-2 mb-4 relative">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">3. Family Pension</h3>
                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">Auto 1/3 Deduction</span>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Gross Family Pension Received</label>
                <InrField id="os-pension" value={os.family_pension_gross_inr} onCommit={update('family_pension_gross_inr')} className="focus:border-blue-400" />
                {os.family_pension_standard_deduction_inr != null && (
                  <p className="text-[8px] text-blue-300/60 mt-1">
                    Auto standard deduction: ₹{os.family_pension_standard_deduction_inr.toLocaleString('en-IN')} (min of ₹15,000 or ⅓ of gross)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 4. Special Rate Streams */}
          <div className="p-5 bg-[#161616] border border-white/10 rounded-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-2 mb-4 relative">
              <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">4. Special Rate Streams</h3>
              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">Flat 30% Tax</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Lottery &amp; Horse Races</label>
                <InrField id="os-lottery" value={os.winnings_lottery_gaming_inr} onCommit={update('winnings_lottery_gaming_inr')} className="focus:border-purple-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Online Gaming Winnings</label>
                <InrField id="os-gaming" value={os.online_gaming_winnings_inr} onCommit={update('online_gaming_winnings_inr')} className="focus:border-purple-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Unexplained Income (Unexplained Income &amp; Investments)</label>
                <InrField id="os-unexplained" value={os.unexplained_income_115BBE_inr} onCommit={update('unexplained_income_115BBE_inr')} className="border-red-500/50 focus:border-red-500" />
                <p className="text-[8px] text-red-400/80 mt-1">Taxed at flat 78% (60% tax + 25% surcharge + 4% cess).</p>
              </div>
            </div>

            {/* Agricultural Income */}
            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white/80">Agricultural Income (Tax Exempt)</span>
                  <span className="text-[9px] text-white/30">This income is generally tax-free, but we need the amount for accurate tax calculation.</span>
                </div>
                <ToggleSwitch size="sm" checked={ag.has_agricultural_income} onChange={(val) => send({ type: 'TOGGLE_AGRI_SECTION', value: val } as any)} />
              </div>
              {ag.has_agricultural_income && (
                <div id="div-agri-section">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Agricultural Income Amount (₹)</label>
                  <InrField id="ag-income" value={ag.agricultural_income_inr} onCommit={(v2: string) => send({ type: 'UPDATE_AGRI_INCOME', value: v2 } as any)} className="max-w-sm" />
                </div>
              )}
            </div>
          </div>
        </div>
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
