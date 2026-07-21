import React, { useState } from 'react';
import { useMachine } from '@xstate/react';
import { lossesAndCreditsMachine } from '../../src/machines/lossesAndCreditsMachine';
import { LossesAndCreditsContext, isS207Exempt } from '../../src/machines/deriveLossesAndCredits';
import './lossesAndCreditsStep.css'; // Make sure this matches actual paths when integrating

interface LossesAndCreditsStepProps {
  initialContext: Partial<LossesAndCreditsContext>;
  onBack: () => void;
  onContinue: (context: any) => void;
}

export default function LossesAndCreditsStep({ initialContext, onBack, onContinue }: LossesAndCreditsStepProps) {
  const [state, send] = useMachine(lossesAndCreditsMachine, {
    input: {
      has_brought_forward_losses: null,
      s79_shareholding_change: null,
      business_loss_cf: [],
      speculative_loss_cf: [],
      stcg_loss_cf: [],
      ltcg_loss_cf: [],
      house_property_loss_cf: [],
      unabsorbed_depreciation_cf: null,
      unabsorbed_depreciation_attributable_to_additional_dep_inr: null,
      tds_already_deducted_inr: null,
      form_26as_uploaded: false,
      simulator_active: false,
      sim_salary: null,
      sim_business: null,
      sim_cg: null,
      sim_cg_quarter: 'Q1',
      sim_other: null,
      advance_tax_q1_15jun_inr: null,
      advance_tax_q2_15sep_inr: null,
      advance_tax_q3_15dec_inr: null,
      advance_tax_q4_15mar_inr: null,
      ...initialContext
    } as LossesAndCreditsContext
  });

  const { context } = state;
  const isCompany = context.entity_type === 'company';
  const showS207Banner = isS207Exempt(context);

  const categories = [
    'business_loss_cf',
    'speculative_loss_cf',
    'stcg_loss_cf',
    'ltcg_loss_cf',
    'house_property_loss_cf'
  ];

  const handleNext = () => {
    onContinue(context);
  };

  return (
    <div id="panel-step-credits" className="glass-card p-6 lg:p-8 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide font-display uppercase">Screen 2K — Past Losses, Foreign Assets & Tax Credits</h2>
        <p className="text-xs text-white/40 mt-1">Enter details about past losses you want to carry forward, your foreign assets, and taxes you have already paid.</p>
        <div className="mt-4 p-4 bg-brandCyan/10 border border-brandCyan/20 rounded-xl flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <div className="text-[11px] font-black tracking-widest text-brandCyan uppercase mb-1">Global Annual Projection</div>
            <div className="text-xs text-white/70 leading-relaxed">Unlike income which is strictly tracked per quarter, past losses and tax credits (TDS, Advance Tax) apply to the entire Tax Year. Any amount entered here is treated as your total for the year, automatically lowering your total tax liability across all quarters. You do not need to re-enter these amounts per quarter.</div>
          </div>
        </div>
      </div>

      {/* Brought forward losses */}
      <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Brought Forward Past Losses (Schedule BFLA/CFL)</span>
            <span className="text-[9px] text-white/40 font-sans mt-0.5">Do you have any unused past years' losses to claim or carry forward?</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => send({ type: 'TOGGLE_BF_LOSSES', value: true })}
              className={context.has_brought_forward_losses === true ? "px-4 py-2 bg-brandGold text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all" : "px-4 py-2 bg-white/5 text-white/60 font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:bg-white/10"}
            >
              Yes
            </button>
            <button
              onClick={() => send({ type: 'TOGGLE_BF_LOSSES', value: false })}
              className={context.has_brought_forward_losses === false ? "px-4 py-2 bg-brandRed text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all" : "px-4 py-2 bg-white/5 text-white/60 font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:bg-white/10"}
            >
              No
            </button>
          </div>
        </div>

        {isCompany && (
          <div id="div-s79-loss" className="flex flex-col md:flex-row md:items-center justify-between gap-3 border border-brandRed/20 bg-brandRed/5 p-3 rounded-xl mb-2">
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-brandRed font-display">Carry Forward of Loss (Change in Shareholding) — Corporate Shareholding Change &gt; 51%</span>
              <span className="text-[9px] text-white/60 font-sans mt-0.5">If voting power has shifted by &gt;51%, past losses (except unabsorbed depreciation) lapse.</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={!!context.s79_shareholding_change} onChange={(e) => send({ type: 'SET_S79_CHANGE', value: e.target.checked })} className="sr-only peer" />
                <div className="w-9 h-5 bg-brandRed/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brandRed"></div>
              </label>
            </div>
          </div>
        )}

        {context.has_brought_forward_losses === true && (
          <div id="div-loss-table-container" className="flex flex-col gap-4">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] text-white/50 font-sans">Add each loss entry separately by category and origin year.</span>
              <button onClick={() => send({ type: 'ADD_LOSS_ROW', category: 'business_loss_cf' })} className="px-3 py-1 bg-brandGold/20 hover:bg-brandGold/30 text-brandGold rounded text-[9px] font-black uppercase tracking-widest transition-all font-sans font-bold">+ Add Loss Card</button>
            </div>

            <div id="loss-cards-container" className="flex flex-col gap-3">
              {categories.map(cat => {
                const list = (context[cat as keyof LossesAndCreditsContext] as any[]) || [];
                return list.map(item => (
                  <div key={item.id} className="loss-card bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brandGold/80">Loss Record</span>
                      <button onClick={() => send({ type: 'REMOVE_LOSS_ROW', category: cat, id: item.id })} className="text-brandRed/70 hover:text-brandRed text-[9px] font-black uppercase tracking-widest transition-all">✕ Remove</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Loss Category</label>
                        <select
                          className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:outline-none"
                          value={cat}
                          onChange={(e) => {
                            send({ type: 'REMOVE_LOSS_ROW', category: cat, id: item.id });
                            send({ type: 'ADD_LOSS_ROW', category: e.target.value });
                          }}
                        >
                          <option value="business_loss_cf">Regular Business Loss</option>
                          <option value="speculative_loss_cf">Speculative Intraday Loss</option>
                          <option value="stcg_loss_cf">Short Term Capital Loss</option>
                          <option value="ltcg_loss_cf">Long Term Capital Loss</option>
                          <option value="house_property_loss_cf">House Property Loss</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Origin FY</label>
                        <input type="text" placeholder="e.g. Tax Year 2023-24" value={item.fy || ''} onChange={(e) => send({ type: 'UPDATE_LOSS_ROW', category: cat, id: item.id, field: 'fy', value: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono px-3 py-2 focus:border-brandGold focus:outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Loss Amount (₹)</label>
                        <input type="number" placeholder="0" value={item.amount_inr || ''} onChange={(e) => send({ type: 'UPDATE_LOSS_ROW', category: cat, id: item.id, field: 'amount_inr', value: parseFloat(e.target.value) || null })} className="inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono px-3 py-2 focus:border-brandGold focus:outline-none transition-all" />
                      </div>
                    </div>

                    {cat !== 'house_property_loss_cf' && (
                      <div className="loss-filing-gate flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white/80 font-display">ITR for Origin Year Filed on/before Due Date?</span>
                          <span className="text-[9px] text-white/30 font-sans">Required Loss Carry Forward Eligibility Condition to carry forward business and capital losses.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={item.was_filed_before_due_date} onChange={(e) => send({ type: 'UPDATE_LOSS_ROW', category: cat, id: item.id, field: 'was_filed_before_due_date', value: e.target.checked })} className="sr-only peer" />
                          <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 peer-checked:bg-brandGold peer-checked:after:bg-black"></div>
                        </label>
                      </div>
                    )}

                    {cat === 'business_loss_cf' && context.tax_regime === 'NEW' && (
                      <div className="loss-add-dep-container grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Portion Attributable to Additional Depreciation (₹)</label>
                          <input type="number" placeholder="0" value={item.attributable_to_additional_dep_inr || ''} onChange={(e) => send({ type: 'UPDATE_LOSS_ROW', category: cat, id: item.id, field: 'attributable_to_additional_dep_inr', value: parseFloat(e.target.value) || null })} className="inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono px-3 py-2 focus:border-brandGold focus:outline-none transition-all" />
                        </div>
                        <div className="flex items-center text-[8px] text-white/40 font-sans leading-relaxed">
                          Under Depreciation Allowance(1)(iia), any portion of brought-forward business loss attributable to additional depreciation lapses under the New Tax Regime.
                        </div>
                      </div>
                    )}

                    {context.tax_regime === 'NEW' && cat === 'house_property_loss_cf' && (item.amount_inr || 0) > 0 && (
                      <div className="p-3 bg-brandRed/10 border border-brandRed/20 rounded-xl text-[10px] text-brandRed font-sans font-bold leading-normal">
                        ⚠️ NEW REGIME RESTRICTION: Brought-forward house property losses cannot be set off against current year income under the New Tax Regime. They will bypass current adjustments (Schedule BFLA) but can continue to be carried forward.
                      </div>
                    )}

                    {context.tax_regime === 'NEW' && cat === 'business_loss_cf' && (item.attributable_to_additional_dep_inr || 0) > 0 && (
                      <div className="p-3 bg-brandRed/10 border border-brandRed/20 rounded-xl text-[10px] text-brandRed font-sans font-bold leading-normal">
                        ⚠️ NEW REGIME RESTRICTION: The portion of business loss attributable to additional (₹<span>{item.attributable_to_additional_dep_inr}</span>) lapses and cannot be adjusted under the New Tax Regime.
                      </div>
                    )}

                    {!item.was_filed_before_due_date && (item.amount_inr || 0) > 0 && cat !== 'house_property_loss_cf' && (
                      <div className="p-3 bg-brandRed/10 border border-brandRed/20 rounded-xl text-[10px] text-brandRed font-sans font-bold leading-normal">
                        ⚠️ INELIGIBLE LOSS Loss Carry Forward Eligibility Condition: Business and Capital losses cannot be carried forward or adjusted if the historical return for that year was filed after the due date u/s 139(1).
                      </div>
                    )}
                  </div>
                ));
              })}
            </div>
          </div>
        )}
      </div>

      {/* Unabsorbed Depreciation */}
      <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-brandGold font-display">Brought-Forward Unabsorbed Depreciation</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Total Unabsorbed Depreciation (₹)</label>
            <input type="number" placeholder="0" value={context.unabsorbed_depreciation_cf || ''} onChange={(e) => send({ type: 'UPDATE_UNABSORBED_DEP', field: 'unabsorbed_depreciation_cf', value: parseFloat(e.target.value) || null })} className="inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono" />
            <span className="text-[8px] text-white/30 mt-1 block">Can be adjusted against any income head except salary, with no expiry period.</span>
          </div>
          {context.tax_regime === 'NEW' && (
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Portion from Additional Depreciation (₹)</label>
              <input type="number" placeholder="0" value={context.unabsorbed_depreciation_attributable_to_additional_dep_inr || ''} onChange={(e) => send({ type: 'UPDATE_UNABSORBED_DEP', field: 'unabsorbed_depreciation_attributable_to_additional_dep_inr', value: parseFloat(e.target.value) || null })} className="inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono" />
              <span className="text-[8px] text-white/30 mt-1 block">Attributable to additional depreciation under Depreciation Allowance(1)(iia).</span>
            </div>
          )}
        </div>
        
        {context.tax_regime === 'NEW' && (context.unabsorbed_depreciation_attributable_to_additional_dep_inr || 0) > 0 && (
          <div className="p-3 bg-brandRed/10 border border-brandRed/20 rounded-xl text-[10px] text-brandRed font-sans font-bold leading-normal">
            ⚠️ NEW REGIME RESTRICTION: The portion of unabsorbed depreciation attributable to additional (₹<span>{context.unabsorbed_depreciation_attributable_to_additional_dep_inr}</span>) lapses and cannot be adjusted under the New Tax Regime.
          </div>
        )}
      </div>

      <div className="p-5 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
        <span className="text-xs font-black uppercase tracking-widest text-brandGold">Taxes Already Paid (TDS & Advance Tax)</span>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-white/5 pb-4">
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">TDS Already Deducted (See Form 168 / AIS)</label>
            <input type="number" placeholder="0" value={context.tds_already_deducted_inr || ''} onChange={(e) => send({ type: 'UPDATE_CREDIT', field: 'tds_already_deducted_inr', value: parseFloat(e.target.value) || null })} className="inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono" />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white/80 font-display">Form 168 / AIS Reconciled?</span>
              <span className="text-[9px] text-white/30 font-sans">Reconciled manually or via PDF upload.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={context.form_26as_uploaded} onChange={(e) => send({ type: 'TOGGLE_26AS', value: e.target.checked })} className="sr-only peer" />
              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 peer-checked:bg-brandGold peer-checked:after:bg-black"></div>
            </label>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-center gap-1.5">
            <label className="block text-[9px] font-black uppercase tracking-widest text-brandGold font-display">Upload Form 168 (PDF)</label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer bg-brandGold/10 hover:bg-brandGold/20 text-brandGold border border-brandGold/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap font-sans font-bold">
                Choose PDF
                <input type="file" className="hidden" accept=".pdf" />
              </label>
              <span className="text-[9px] text-white/40 truncate font-sans max-w-[120px]">No file chosen</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="block text-[9px] font-black uppercase tracking-widest text-white/50">Quarterly Advance Tax Payments (Advance Tax Deferment Interest)</span>
            <label className="flex items-center gap-2 cursor-pointer group">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">Projection Mode</span>
              <div className="relative inline-flex items-center">
                <input type="checkbox" checked={context.simulator_active} onChange={(e) => send({ type: 'TOGGLE_SIMULATOR', value: e.target.checked })} className="sr-only peer" />
                <div className="w-7 h-4 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brandGold"></div>
              </div>
            </label>
          </div>

          {context.simulator_active && (
            <div className="flex flex-col gap-3 p-3 bg-brandGold/5 border border-brandGold/20 rounded-xl mb-2">
              <p className="text-[9px] text-white/50 mb-1">Enter your <span className="font-bold text-brandGold/80">projected total annual</span> income. We will run a headless simulation to calculate exact targets. (Note: Expected TDS on Salary is auto-computed!)</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Projected Total Salary</label>
                  <input type="number" placeholder="₹0" value={context.sim_salary || ''} onChange={(e) => send({ type: 'UPDATE_SIM_FIELD', field: 'sim_salary', value: parseFloat(e.target.value) || null })} className="inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Projected Total Biz Profit</label>
                  <input type="number" placeholder="₹0" value={context.sim_business || ''} onChange={(e) => send({ type: 'UPDATE_SIM_FIELD', field: 'sim_business', value: parseFloat(e.target.value) || null })} className="inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Projected Total Cap Gains</label>
                  <div className="flex flex-col xl:flex-row gap-1">
                    <input type="number" placeholder="₹0" value={context.sim_cg || ''} onChange={(e) => send({ type: 'UPDATE_SIM_FIELD', field: 'sim_cg', value: parseFloat(e.target.value) || null })} className="inr-input w-full xl:w-2/3 bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono" />
                    <select value={context.sim_cg_quarter} onChange={(e) => send({ type: 'UPDATE_SIM_FIELD', field: 'sim_cg_quarter', value: e.target.value })} className="w-full xl:w-1/3 bg-white/5 border border-white/10 rounded-xl text-xs text-white px-2 py-2 focus:border-brandGold focus:ring-0">
                      <option value="1" className="bg-gray-900 text-white">Q1</option>
                      <option value="2" className="bg-gray-900 text-white">Q2</option>
                      <option value="3" className="bg-gray-900 text-white">Q3</option>
                      <option value="4" className="bg-gray-900 text-white">Q4</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Projected Total Other</label>
                  <input type="number" placeholder="₹0" value={context.sim_other || ''} onChange={(e) => send({ type: 'UPDATE_SIM_FIELD', field: 'sim_other', value: parseFloat(e.target.value) || null })} className="inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono" />
                </div>
              </div>
            </div>
          )}

          {showS207Banner && (
            <div className="p-3 bg-brandGold/10 border border-brandGold/20 rounded-xl flex items-center gap-3 mb-2">
              <span className="text-xl text-brandGold/80">✨</span>
              <span className="text-[10px] text-brandGold/80"><strong>Exempt from Advance Tax (Advance Tax Liability):</strong> As a Resident Senior Citizen without business income, you are legally exempt from advance tax. No Advance Tax Default Interest or Advance Tax Deferment Interest penalties are applicable.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40">Q1 (By 15 June) — 15%</label>
                <span className="text-[9px] font-bold text-brandGold font-mono">Target: ₹0</span>
              </div>
              <input type="number" placeholder="Amount Paid" value={context.advance_tax_q1_15jun_inr || ''} onChange={(e) => send({ type: 'UPDATE_CREDIT', field: 'advance_tax_q1_15jun_inr', value: parseFloat(e.target.value) || null })} className="inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono" />
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40">Q2 (By 15 Sept) — 45%</label>
                <span className="text-[9px] font-bold text-brandGold font-mono">Target: ₹0</span>
              </div>
              <input type="number" placeholder="Amount Paid" value={context.advance_tax_q2_15sep_inr || ''} onChange={(e) => send({ type: 'UPDATE_CREDIT', field: 'advance_tax_q2_15sep_inr', value: parseFloat(e.target.value) || null })} className="inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono" />
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40">Q3 (By 15 Dec) — 75%</label>
                <span className="text-[9px] font-bold text-brandGold font-mono">Target: ₹0</span>
              </div>
              <input type="number" placeholder="Amount Paid" value={context.advance_tax_q3_15dec_inr || ''} onChange={(e) => send({ type: 'UPDATE_CREDIT', field: 'advance_tax_q3_15dec_inr', value: parseFloat(e.target.value) || null })} className="inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono" />
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/40">Q4 (By 15 Mar) — 100%</label>
                <span className="text-[9px] font-bold text-brandGold font-mono">Target: ₹0</span>
              </div>
              <input type="number" placeholder="Amount Paid" value={context.advance_tax_q4_15mar_inr || ''} onChange={(e) => send({ type: 'UPDATE_CREDIT', field: 'advance_tax_q4_15mar_inr', value: parseFloat(e.target.value) || null })} className="inr-input w-full bg-white/5 border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 font-mono" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <button onClick={onBack} className="px-4 py-2.5 bg-white/5 text-white/60 font-bold uppercase text-[9px] tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/5">← Back</button>
        <button onClick={handleNext} className="px-6 py-2.5 bg-brandGold text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:brightness-110 transition-all font-display">Generate final tax profile</button>
      </div>
    </div>
  );
}
