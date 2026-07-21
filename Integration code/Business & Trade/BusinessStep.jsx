// ────────────────────────────────────────────────────────────────────────
// BusinessStep.jsx
// React port of panel-step-business ("Screen 2G — Business, Profession &
// Trading Income" / DOM-03 "Specialist Cockpit") from layer1_india.html.
//
// See businessMachine.js's header comment for the full cross-step
// dependency map (tax_regime / entity_type / is_indian_company /
// final_india_residency_status, all injected from earlier steps — most
// importantly is_indian_company and final_india_residency_status, which
// come from the Residency Solver step).
//
// See README.md ("Deferred sub-features") for what was intentionally left
// out of this extraction: the per-entry branch/SEZ/export/revenue-line-item
// micro-UI, and the two "Unit-Wise Business Expenses" / "Common Assets"
// auto-mirrored accordions (both populated by functions outside this
// step's own DOM/JS — renderBusinessExpenses() / renderUnitAssetBlocks()
// — that operate over the whole domestic_income tree, not just this step).
// ────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { businessMachine } from '../businessMachine.js';
import { formatINRDisplay } from '../deriveBusiness.js';

// ---- shared pieces --------------------------------------------------

function ToggleSwitch({ checked, onChange, activeClass = 'peer-checked:bg-brandGold peer-checked:after:bg-black' }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div
        className={
          "w-9 h-5 bg-white/10 peer-focus:outline-none peer-disabled:opacity-50 peer-disabled:cursor-not-allowed rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all " +
          activeClass
        }
      />
    </label>
  );
}

function InrField({ id, value, onCommit, className = '', placeholder }) {
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
        onCommit(raw);
      }}
      className={'inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono ' + className}
    />
  );
}

function Accordion({ icon, title, defaultOpen = false, dimmed = false, children }) {
  return (
    <details
      className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4 hover:bg-white/10 transition-colors"
      open={defaultOpen}
      style={dimmed ? { opacity: 0.35, pointerEvents: 'none' } : undefined}
    >
      <summary className="p-4 cursor-pointer text-xs font-black uppercase tracking-widest text-brandGold flex items-center justify-between list-none focus:outline-none">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span>{title}</span>
        </div>
        <svg className="w-4 h-4 transform transition-transform group-open:rotate-180 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="p-4 md:p-5 border-t border-white/10 flex flex-col gap-4 bg-transparent">{children}</div>
    </details>
  );
}

const NATURE_OPTIONS = [
  { value: 'own_business', label: 'Proprietorship / Profession / Regular Business / Freelancing' },
  { value: 'goods_transport', label: 'Goods Transport / Truck Owner (Presumptive Taxation Scheme (Transporters))' },
  { value: 'fno_trader', label: 'Derivatives & Options Trading (F&O)' },
  { value: 'intraday_trader', label: 'Intraday Day Trading' },
  { value: 'partner_in_firm', label: 'Partner in a Firm (Remuneration/Interest)' },
];

const BUSINESS_CODE_OPTIONS = [
  { group: 'Eligible for Presumptive Taxation Scheme (Eligible Business)', options: [
    ['saas', 'SaaS / AI / Tech Startup'], ['01000', 'Manufacturing Industry'], ['02000', 'Retail & Wholesale Trade'],
    ['04000', 'Construction Business'], ['05000', 'Service Sector (Non-Professional)'],
  ]},
  { group: 'Ineligible for Presumptive Taxation Scheme (Eligible Business)', options: [
    ['agency', 'Agency / Clearing & Forwarding'], ['brokerage', 'Commission / Brokerage / Real Estate'],
    ['profession', 'Profession (Legal, Medical, IT, etc.)'], ['goods_carriage', 'Goods Carriage / Transport'],
    ['banking', 'Banks / NBFCs'], ['insurance', 'Insurance Businesses'], ['shipping', 'Shipping / Tonnage Tax'],
    ['agriculture', 'Plantations / Agriculture'],
  ]},
];

const PROFESSION_OPTIONS = [
  ['legal', 'Legal'], ['medical', 'Medical'], ['engineering', 'Engineering'], ['architecture', 'Architecture'],
  ['accountancy', 'Accountancy'], ['technical_consultancy', 'Technical Consultancy'], ['interior_decoration', 'Interior Decoration'],
  ['authorised_representative', 'Authorised Representative'], ['film_artist', 'Film Artist'], ['it_services', 'IT Services'],
  ['other', 'Other Profession'],
];

// ---- Business Entry card ------------------------------------------------

function BusinessEntryCard({ entry, idx, options, send }) {
  const update = (field) => (value) => send({ type: 'UPDATE_BUSINESS_ENTRY', index: idx, field, value });
  const isProf = entry.nature === 'professional';
  const scheme = entry.presumptive_scheme;

  return (
    <div className="bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Business #{idx + 1}</span>
        <button onClick={() => send({ type: 'REMOVE_BUSINESS_ENTRY', index: idx })} className="text-brandRed/60 hover:text-brandRed text-[9px] font-black uppercase tracking-widest transition-all">
          ✕ Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Business Name</label>
          <input
            type="text"
            value={entry.business_name || ''}
            onChange={(e) => update('business_name')(e.target.value)}
            placeholder="e.g. Acme Consulting"
            className="w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0"
          />
        </div>

        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Tax Treatment</label>
          <select
            value={scheme || ''}
            onChange={(e) => update('presumptive_scheme')(e.target.value || null)}
            className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none"
          >
            {options.options.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#1c1c1c] text-white">{o.label}</option>
            ))}
          </select>
        </div>

        {isProf ? (
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Profession Type (Rule 6F)</label>
            <select
              value={entry.profession_type || ''}
              onChange={(e) => update('profession_type')(e.target.value || null)}
              className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none"
            >
              <option value="">-- Select Profession --</option>
              {PROFESSION_OPTIONS.map(([v, l]) => <option key={v} value={v} className="bg-[#1c1c1c] text-white">{l}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Primary Business Code</label>
            <select
              value={entry.business_code || ''}
              onChange={(e) => update('business_code')(e.target.value || null)}
              className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:outline-none"
            >
              <option value="">-- Select Business Code --</option>
              {BUSINESS_CODE_OPTIONS.map((grp) => (
                <optgroup key={grp.group} label={grp.group}>
                  {grp.options.map(([v, l]) => <option key={v} value={v} className="bg-[#1c1c1c] text-white">{l}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        )}
      </div>

      {scheme === 's44AD' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-white/5 border border-white/10 rounded-xl">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Digital Receipts (₹)</label>
            <InrField id={`biz-entry-${idx}-digital`} value={entry.digital_receipts_inr} onCommit={update('digital_receipts_inr')} />
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Cash Receipts (₹)</label>
            <InrField id={`biz-entry-${idx}-cash`} value={entry.cash_receipts_inr} onCommit={update('cash_receipts_inr')} />
          </div>
        </div>
      )}

      {scheme === 's44ADA' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-white/5 border border-white/10 rounded-xl">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Digital Receipts (₹)</label>
            <InrField id={`biz-entry-${idx}-ada-digital`} value={entry.ada_digital_receipts_inr} onCommit={update('ada_digital_receipts_inr')} />
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Cash Receipts (₹)</label>
            <InrField id={`biz-entry-${idx}-ada-cash`} value={entry.ada_cash_receipts_inr} onCommit={update('ada_cash_receipts_inr')} />
          </div>
        </div>
      )}

      {!scheme && (
        <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Turnover / Gross Receipts (₹)</label>
          <InrField id={`biz-entry-${idx}-turnover`} value={entry.turnover_inr} onCommit={update('turnover_inr')} />
          <p className="text-[9px] text-white/30 mt-1">
            Regular-books granular revenue breakdown (per business code) is out of scope for this extraction — see README. This field captures aggregate turnover only.
          </p>
        </div>
      )}
    </div>
  );
}

// ---- main component ---------------------------------------------------

export default function BusinessStep({ initialContext, onBack, onContinue }) {
  const [state, send] = useMachine(businessMachine, { input: initialContext });
  const ctx = state.context;
  const { business_income: bi, ui, tax_regime, entity_type } = ctx;
  const { visibility: v, gstContextNote, amtExpiry } = ui;

  const updateBizNum = (field) => (raw) => send({ type: 'UPDATE_BIZ_NUM', field, value: raw });
  const updateBizField = (field) => (raw) => send({ type: 'UPDATE_BIZ_FIELD', field, value: raw });

  return (
    <div id="panel-step-business" className="glass-card p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide font-display uppercase">
          Screen 2G — Business, Profession &amp; Trading Income
        </h2>
        <p className="text-xs text-white/40 mt-1">
          Enter your business details, simplified tax choices, and any major expenses you incurred.
        </p>
      </div>

      {/* Cockpit Activate Gate */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-white/80">Do you have income from a business, profession, or trading?</span>
          <span className="text-[9px] text-white/30">This will open the business income section.</span>
        </div>
        <ToggleSwitch checked={bi.has_business_or_fo_income} onChange={(val) => send({ type: 'TOGGLE_BUSINESS_MODULE', value: val })} />
      </div>

      {v.divBusinessContainer && (
        <div id="div-business-container" className="flex flex-col gap-6">
          {/* ACCORDION: Business Profile & Setup */}
          <Accordion icon="🏢" title="Business Profile & Setup" defaultOpen>
            {v.divProfSection8 && (
              <div className="flex items-center justify-between p-4 bg-white/5 border border-brandGold/20 rounded-2xl mb-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-brandGold">Section 8 Company (NGO)?</span>
                  <span className="text-[9px] text-white/40">
                    Turn this on if this is a registered non-profit company claiming tax exemptions under Section 11/12 or 10(23C).
                  </span>
                </div>
                <ToggleSwitch checked={ctx.is_section_8} onChange={(val) => send({ type: 'TOGGLE_SECTION_8', value: val })} />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-2 md:col-span-2">
                <label className="block text-[9px] font-black uppercase tracking-widest text-brandGold mb-1.5">
                  What type of business do you run? (Select all that apply)
                </label>
                <div className="space-y-2 text-xs">
                  {NATURE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={bi.nature_of_business.includes(opt.value)}
                        onChange={() => send({ type: 'TOGGLE_BIZ_NATURE', value: opt.value })}
                        className="rounded border-white/10 bg-white/5 text-brandGold focus:ring-0"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>

                {v.divBizCodeContainer && (
                  <div className="mt-4 border-t border-white/5 pt-4 transition-all">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-brandGold mb-1.5">Primary Business Code</label>
                    <select
                      value={bi.business_code || ''}
                      onChange={(e) => send({ type: 'UPDATE_BIZ_CODE', value: e.target.value })}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none"
                    >
                      <option value="">-- Select --</option>
                      <optgroup label="Eligible for Presumptive Taxation Scheme (Eligible Business)">
                        <option value="saas">SaaS / AI / Tech Startup</option>
                        <option value="01000">Manufacturing Industry</option>
                        <option value="02000">Retail & Wholesale Trade</option>
                        <option value="04000">Construction Business</option>
                        <option value="05000">Service Sector (Non-Professional)</option>
                      </optgroup>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </Accordion>

          {/* ACCORDION: Revenue & Receipts */}
          <Accordion icon="💰" title="Revenue & Receipts">
            {v.divFnoIncome && (
              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 transition-all">
                <span className="text-xs font-black uppercase tracking-widest text-brandGold">Profits from Options & Derivatives (F&O)</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">F&O Net Profit/Loss</label>
                    <InrField id="biz-fno-profit" value={bi.non_speculative_income_inr} onCommit={updateBizNum('non_speculative_income_inr')} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">F&O Absolute Turnover</label>
                    <InrField id="biz-fno-turnover" value={bi.fno_turnover_inr} onCommit={updateBizNum('fno_turnover_inr')} />
                  </div>
                </div>
              </div>
            )}

            {v.divIntradayIncome && (
              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 transition-all">
                <span className="text-xs font-black uppercase tracking-widest text-brandGold">Profits from Day Trading (Speculative)</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Intraday Net Profit/Loss</label>
                    <InrField id="biz-intra-profit" value={bi.speculative_income_inr} onCommit={updateBizNum('speculative_income_inr')} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Intraday Absolute Turnover</label>
                    <InrField id="biz-intra-turnover" value={bi.speculative_turnover_inr} onCommit={updateBizNum('speculative_turnover_inr')} />
                  </div>
                </div>
              </div>
            )}

            {v.divPartnerIncome && (
              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-brandGold">Partner / LLP Income (Partnership Firm Exemption)</span>
                  <button onClick={() => send({ type: 'ADD_PARTNER_FIRM' })} className="px-3 py-1 bg-white/10 hover:bg-brandGold/20 hover:text-brandGold rounded text-[9px] font-black uppercase tracking-widest transition-all">
                    + Add Firm
                  </button>
                </div>
                <div className="bg-brandGold/10 border border-brandGold/20 rounded-xl p-3 text-[10px] text-white/70 leading-relaxed">
                  <strong className="text-brandGold">💡 How partner income is taxed:</strong> Your <strong>share of profit is fully exempt</strong> under s.10(2A). However, <strong>remuneration</strong> and <strong>interest on capital</strong> from the firm/LLP are taxable as PGBP. Add one entry per firm you are a partner in.
                </div>
                <div className="flex flex-col gap-4">
                  {bi.partner_firms.length === 0 ? (
                    <p className="text-[10px] text-white/30 text-center py-2">No firms added yet. Click "+ Add Firm" above.</p>
                  ) : (
                    bi.partner_firms.map((firm, idx) => (
                      <div key={idx} className="bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Firm / LLP #{idx + 1}</span>
                          <button onClick={() => send({ type: 'REMOVE_PARTNER_FIRM', index: idx })} className="text-brandRed/60 hover:text-brandRed text-[9px] font-black uppercase tracking-widest transition-all">✕ Remove</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Firm / LLP Name</label>
                              <input
                                type="text"
                                value={firm.firm_name || ''}
                                onChange={(e) => send({ type: 'UPDATE_PARTNER_FIRM', index: idx, field: 'firm_name', value: e.target.value })}
                                placeholder="e.g. ABC & Co."
                                className="w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Entity Type</label>
                              <select
                                value={firm.entity_type}
                                onChange={(e) => send({ type: 'UPDATE_PARTNER_FIRM', index: idx, field: 'entity_type', value: e.target.value })}
                                className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none"
                              >
                                <option value="registered_firm">Registered Partnership Firm</option>
                                <option value="llp">Limited Liability Partnership (LLP)</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">
                              Remuneration / Salary / Bonus (₹) <span className="text-brandGold">— Taxable PGBP</span>
                            </label>
                            <InrField id={`partner-${idx}-remun`} value={firm.remuneration_from_entity_inr} onCommit={(v) => send({ type: 'UPDATE_PARTNER_FIRM', index: idx, field: 'remuneration_from_entity_inr', value: v })} />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">
                              Interest on Capital (₹) <span className="text-brandGold">— Taxable PGBP</span>
                            </label>
                            <InrField id={`partner-${idx}-interest`} value={firm.interest_on_capital_from_entity_inr} onCommit={(v) => send({ type: 'UPDATE_PARTNER_FIRM', index: idx, field: 'interest_on_capital_from_entity_inr', value: v })} />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">
                              Share of Profit (₹) <span className="text-green-400">— EXEMPT under Partnership Firm Profit Share Exemption, enter for disclosure only</span>
                            </label>
                            <InrField id={`partner-${idx}-profit`} value={firm.profit_share_exempt_inr} onCommit={(v) => send({ type: 'UPDATE_PARTNER_FIRM', index: idx, field: 'profit_share_exempt_inr', value: v })} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {v.divBusinessEntries && (
              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-brandGold">Your Businesses</span>
                  <button onClick={() => send({ type: 'ADD_BUSINESS_ENTRY' })} className="px-3 py-1 bg-white/10 hover:bg-brandGold/20 hover:text-brandGold rounded text-[9px] font-black uppercase tracking-widest transition-all">
                    + Add Business
                  </button>
                </div>
                <div className="bg-brandGold/10 border border-brandGold/20 rounded-xl p-3 text-[10px] text-white/70 leading-relaxed">
                  <strong className="text-brandGold">💡 Multiple businesses?</strong> Add one entry per business. Each business can independently use a simplified tax scheme (Presumptive Taxation Scheme (Eligible Business) or Presumptive Taxation Scheme (Professionals)) or regular books of accounts. All entries are aggregated into your PGBP head.
                </div>
                <div className="flex flex-col gap-4">
                  {bi.business_entries.length === 0 ? (
                    <p className="text-[10px] text-white/30 text-center py-2">No businesses added yet. Click "+ Add Business" above.</p>
                  ) : (
                    bi.business_entries.map((entry, idx) => (
                      <BusinessEntryCard key={idx} entry={entry} idx={idx} options={v.entryOptions[idx]} send={send} />
                    ))
                  )}
                </div>
              </div>
            )}

            {v.divPresS44ae && (
              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 transition-all">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-widest text-brandGold">Goods Transport Vehicles (Presumptive Taxation Scheme (Transporters) Scheme)</span>
                  <span className="text-[10px] text-white/50 font-mono bg-white/5 px-2 py-1 rounded">{bi.goods_vehicles.length} / 10 Vehicles</span>
                </div>

                {v.warnS44aeLimit && (
                  <div className="p-3 bg-brandRed/20 border border-brandRed text-brandRed text-xs rounded-xl flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>You cannot opt for Presumptive Taxation Scheme (Transporters) if you owned more than 10 goods vehicles at any time during the year.</span>
                  </div>
                )}

                <div className="space-y-3">
                  {bi.goods_vehicles.map((v2, i) => {
                    const isHeavy = v2.vehicle_type === 'heavy';
                    return (
                      <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl relative">
                        <button onClick={() => send({ type: 'REMOVE_GOODS_VEHICLE', index: i })} className="absolute top-3 right-3 text-white/30 hover:text-brandRed transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-6">
                          <div>
                            <label className="block text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">Vehicle Type</label>
                            <select
                              value={v2.vehicle_type || ''}
                              onChange={(e) => send({ type: 'UPDATE_GOODS_VEHICLE', index: i, field: 'vehicle_type', value: e.target.value })}
                              className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-2 py-2 focus:border-brandGold focus:outline-none"
                            >
                              <option value="">-- Select --</option>
                              <option value="light">Light (≤ 12 MT)</option>
                              <option value="heavy">Heavy (&gt; 12 MT)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">GVW (Tonnes)</label>
                            <input
                              type="number"
                              disabled={!isHeavy}
                              value={v2.gvw_tonnes ?? ''}
                              onChange={(e) => send({ type: 'UPDATE_GOODS_VEHICLE', index: i, field: 'gvw_tonnes', value: e.target.value })}
                              placeholder="e.g. 15"
                              className={`w-full bg-[#121212] ${isHeavy ? 'border-white/10 text-white' : 'border-transparent text-white/20'} border rounded-lg text-xs px-2 py-2 focus:border-brandGold focus:outline-none placeholder-white/20`}
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">Months Owned</label>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={v2.months_owned ?? ''}
                              onChange={(e) => send({ type: 'UPDATE_GOODS_VEHICLE', index: i, field: 'months_owned', value: e.target.value })}
                              placeholder="1-12"
                              className="w-full bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-2 py-2 focus:border-brandGold focus:outline-none placeholder-white/20"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => send({ type: 'ADD_GOODS_VEHICLE' })}
                  disabled={bi.goods_vehicles.length >= 10}
                  className="mt-2 w-full py-2.5 rounded-xl border border-white/10 hover:border-brandGold/50 hover:bg-white/5 text-xs text-white/70 hover:text-brandGold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  Add Vehicle
                </button>
              </div>
            )}

            {v.divS35adPipeline && (
              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 transition-all">
                <span className="text-xs font-black uppercase tracking-widest text-brandGold">Special Corporate Business Schemes</span>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">
                    Specified Business Deduction (Specified Business Capital Expenditure Deduction)
                  </label>
                  <InrField id="biz-s35ad" value={bi.specified_business_s35AD_inr} onCommit={updateBizNum('specified_business_s35AD_inr')} placeholder="₹ 0" />
                  <p className="text-[9px] text-white/30 mt-1">100% deduction for capital expenditure on cross-country pipelines/hotels/etc. For Indian Companies only.</p>
                </div>
              </div>
            )}

            {v.divGeneralGrossReceipts && (
              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 transition-all">
                <span className="text-xs font-black uppercase tracking-widest text-brandGold">Professional Gross Receipts (Regular)</span>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Total Gross Receipts (₹)</label>
                <InrField id="biz-general-gross-receipts" value={bi.gross_receipts_inr} onCommit={updateBizNum('gross_receipts_inr')} />
              </div>
            )}

            {v.warnPresNri && (
              <div className="p-4 bg-brandRed/10 border border-brandRed/30 rounded-2xl flex flex-col gap-2 transition-all">
                <span className="text-xs font-black uppercase tracking-widest text-brandRed flex items-center space-x-2">
                  <span>⚠️ NOT ELIGIBLE (MUST BE ROR)</span>
                </span>
                <p className="text-[10px] text-white/70 leading-relaxed">
                  Only Resident & Ordinarily Resident (ROR) taxpayers can legally choose the simplified tax schemes for small businesses or professionals (Presumptive Taxation Scheme (Eligible Business) / Presumptive Taxation Scheme (Professionals)). Please untick these options or update your residency status in Step 1.
                </p>
              </div>
            )}

            {v.warnPresS44adIneligible && (
              <div className="p-4 bg-brandRed/10 border border-brandRed/30 rounded-2xl flex flex-col gap-2 transition-all mt-4">
                <span className="text-xs font-black uppercase tracking-widest text-brandRed flex items-center space-x-2">
                  <span>❌ NOT ELIGIBLE FOR Presumptive Taxation Scheme (Eligible Business)</span>
                </span>
                <p className="text-[10px] text-white/70 leading-relaxed">{v.warnPresS44adIneligible}</p>
              </div>
            )}

            {v.divPresS44ad && (
              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
                <span className="text-xs font-black uppercase tracking-widest text-brandGold">Presumptive Taxation Scheme (Eligible Business) 5-Year Lock-in Details</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Presumptive Taxation Scheme (Eligible Business) Last Exit AY (if opted out)</label>
                    <input
                      type="text"
                      value={bi.s44AD_last_exit_ay || ''}
                      onChange={(e) => updateBizField('s44AD_last_exit_ay')(e.target.value)}
                      placeholder="Tax Year 2023-24"
                      className="w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white/80">Presumptive Taxation Scheme (Eligible Business) Opted Current Year?</span>
                      <span className="text-[9px] text-white/30">Determines 5-year lock-in consequence.</span>
                    </div>
                    <ToggleSwitch checked={bi.s44AD_opted_current_year} onChange={(val) => updateBizField('s44AD_opted_current_year')(val)} />
                  </div>
                </div>
              </div>
            )}
          </Accordion>

          {/* ACCORDION: Unit-Wise Business Expenses (deferred — see README) */}
          <Accordion icon="💳" title="Unit-Wise Business Expenses" dimmed={v.accExpensesDimmed}>
            <div className="bg-brandGold/10 border border-brandGold/20 rounded-xl p-3 text-[10px] text-white/70 leading-relaxed mb-2">
              <strong className="text-brandGold">💡 Auto-Mirrored Architecture:</strong> The units below perfectly mirror the businesses and branches you defined in the Revenue section. All expenses must be entered at the unit level.
            </div>
            <div id="dynamic-mirrored-expenses-container" className="flex flex-col gap-4">
              <p className="text-[10px] text-white/30 text-center py-2">
                Per-unit expense mirroring is out of scope for this extraction — see README "Deferred sub-features".
              </p>
            </div>
          </Accordion>

          {/* ACCORDION: Common Assets (deferred — see README) */}
          <Accordion icon="🏗️" title="Common Assets">
            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
              <div className="p-4 bg-brandGold/10 border border-brandGold/20 rounded-xl text-[10px] text-white/70 leading-relaxed">
                <strong className="text-brandGold">💡 Auto-Mirrored Architecture:</strong> Asset blocks are automatically mirrored across your businesses and branches. The Income Tax Act mandates depreciation on a <strong>"Block of Assets"</strong> basis. You do not need to list individual items. Simply add additions/sales to the relevant block for each unit.
              </div>
              <div id="dynamic-mirrored-assets-container" className="flex flex-col gap-4">
                <p className="text-[10px] text-white/30 text-center py-2">
                  Depreciation block mirroring is out of scope for this extraction — see README "Deferred sub-features".
                </p>
              </div>
            </div>
          </Accordion>

          {/* ACCORDION: Special Business Incomes (Trading & Firm) */}
          <Accordion icon="📈" title="Special Business Incomes (Trading & Firm)">
            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
              <span className="text-xs font-black uppercase tracking-widest text-brandGold">Deemed Business Income (Cessation of Trading Liability (Deemed Profit))</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Business liabilities you no longer have to pay</label>
                  <InrField id="biz-s41-1" value={bi.s41_remission_income_inr} onCommit={updateBizNum('s41_remission_income_inr')} />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Old bad debts that you have now recovered</label>
                  <InrField id="biz-s41-4" value={bi.s41_bad_debt_recovery_inr} onCommit={updateBizNum('s41_bad_debt_recovery_inr')} />
                </div>
              </div>
            </div>

            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
              <span className="text-xs font-black uppercase tracking-widest text-brandGold">GST Registration Status</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">GST Registration Status</label>
                  <select
                    value={bi.gst_registration_status}
                    onChange={(e) => send({ type: 'SET_GST_STATUS', value: e.target.value })}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none"
                  >
                    <option value="unregistered">Unregistered</option>
                    <option value="regular">Regular Taxpayer (GSTIN issued)</option>
                    <option value="composition">Composition Scheme (s.10 CGST)</option>
                  </select>
                </div>

                <div className="md:col-span-2 p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] text-white/60 leading-relaxed">
                  {gstContextNote}
                </div>

                {bi.gst_registration_status === 'regular' && (
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">GST Collected from Customers — Output Tax (₹)</label>
                    <InrField id="biz-gst-collected" value={bi.gst_collected_inr} onCommit={updateBizNum('gst_collected_inr')} placeholder="0" />
                    <p className="text-[9px] text-white/30 mt-1">This is a liability, not income. It will be subtracted from gross receipts to arrive at taxable turnover.</p>
                  </div>
                )}
              </div>
            </div>
          </Accordion>

          {/* AMT Credit Section (regime-locked) */}
          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-brandGold">AMT Credit Brought Forward — Alternate Minimum Tax (AMT)</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white/50 font-black uppercase tracking-wider">Old Regime Only</span>
            </div>

            {v.amtRegimeLocked ? (
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                <svg className="w-4 h-4 text-white/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span className="text-[10px] text-white/40">
                  AMT credit is <strong className="text-white/60">not applicable</strong> under the New Regime (Section 202). Switch to Old Regime to enter AMT credit carried forward.
                </span>
              </div>
            ) : (
              <>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] text-white/60 leading-relaxed">
                  <strong className="text-white/80">What is AMT Credit?</strong> If in a prior year your Alternate Minimum Tax (18.5% of Adjusted Total Income) exceeded your normal income tax, you paid the higher AMT. The excess paid over normal tax is accumulated as <em>AMT credit</em> under Alternate Minimum Tax (AMT) Credit Carry Forward. This credit can be carried forward for <strong className="text-white/80">up to 15 assessment years</strong> and set off in any future year where your normal tax exceeds AMT. Unused credit that exceeds the 15-year window <strong className="text-brandRed">lapses permanently</strong>.
                </div>

                {amtExpiry.show && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                    <span className="text-lg mt-0.5">⏳</span>
                    <div>
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">AMT Credit Expiring Soon</p>
                      <p className="text-[10px] text-white/60 mt-0.5">{amtExpiry.text}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">AMT Credit Carried Forward (₹)</label>
                    <InrField id="biz-amt-bf" value={bi.amt_credit_bf_inr} onCommit={updateBizNum('amt_credit_bf_inr')} placeholder="0" />
                    <p className="text-[9px] text-white/30 mt-1">Aggregate credit across all eligible prior AYs still within the 15-year window.</p>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Oldest AMT Credit Origin AY</label>
                    <input
                      type="text"
                      value={bi.amt_credit_bf_origin_ay || ''}
                      onChange={(e) => updateBizField('amt_credit_bf_origin_ay')(e.target.value)}
                      placeholder="e.g. Tax Year 2015-16"
                      className="w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono"
                    />
                    <p className="text-[9px] text-white/30 mt-1">Enter the AY in which the <em>oldest</em> portion of your unabsorbed AMT credit was generated. Format: Tax Year 2015-16</p>
                  </div>
                </div>
              </>
            )}
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
