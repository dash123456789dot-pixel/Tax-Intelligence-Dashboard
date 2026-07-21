import React, { useEffect } from 'react';
import { useMachine, useSelector } from '@xstate/react';
import { residencyMachine } from '@/machines/residencyMachine';
import { ActorRef } from 'xstate';

const RESIDENCY_CSS = `
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

input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
}
input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #D4AF37;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(212, 175, 55, 0.5);
}
`;

// ---- shared little pieces -------------------------------------------------

interface YesNoSelectProps {
  id?: string;
  value: boolean | null;
  onChange: (val: boolean | null) => void;
  className?: string;
}

function YesNoSelect({ id, value, onChange, className = '' }: YesNoSelectProps) {
  return (
    <select
      id={id}
      value={value === null ? 'null' : String(value)}
      onChange={(e) => onChange(e.target.value === 'null' ? null : e.target.value === 'true')}
      className={
        'w-32 bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 focus:outline-none transition-all ' +
        className
      }
    >
      <option value="null" disabled>Select...</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );
}

interface QuestionRowProps {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function QuestionRow({ id, title, subtitle, children }: QuestionRowProps) {
  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl [color-scheme:dark]" id={id}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-sans font-bold text-white/80 tracking-[0.01em]">{title}</span>
          {subtitle && <span className="text-[9px] text-white/30">{subtitle}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-7 h-4 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/30 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brandGold" />
    </label>
  );
}

// ---- main component ---------------------------------------------------

interface ResidencySolverStepProps {
  initialContext?: any;
  sidebarActorRef: ActorRef<any, any>;
  onBack: () => void;
  onContinue?: (context: any) => void;
}

export default function ResidencySolverStep({ initialContext, sidebarActorRef, onBack, onContinue }: ResidencySolverStepProps) {
  const sidebarEntityType = useSelector(sidebarActorRef, (s: any) => s.context.entityType);

  const [state, send] = useMachine(residencyMachine, {
    input: {
      sidebarActorRef,
      entity_type: sidebarEntityType,
      ...initialContext,
    },
  });

  useEffect(() => {
    send({ type: 'SET_ENTITY_TYPE', value: sidebarEntityType });
  }, [sidebarEntityType, send]);

  const ctx = state.context;
  const { residency_detail: rd, company_residency: cr, dtaa, ui } = ctx;
  const { visibility: v, tieBreaker: tb, showDualResidencyAlert, hasActiveLiveTrip } = ui;

  const updateField = (field: string, value: any) => send({ type: 'UPDATE_RESIDENCY_FIELD', field, value });
  const updateCompany = (field: string, value: any) => send({ type: 'UPDATE_COMPANY_RESIDENCY', field, value });

  return (
    <>
      <style>{RESIDENCY_CSS}</style>
      <div id="panel-step-profile" className="glass-card p-6 lg:p-8 flex flex-col gap-6">
        <div>
          <h2 className="text-[22px] font-sans font-bold text-white tracking-[0.01em] uppercase">
            Screen 2A - Residency Detection
          </h2>
          <p className="text-xs text-white/40 mt-1">
            Tell us about yourself and your time spent in India to automatically determine your tax residency status.
          </p>
          <div className="mt-4 p-4 bg-brandCyan/10 border border-brandCyan/20 rounded-xl flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div>
              <div className="text-[13px] font-sans font-black tracking-[0.01em] text-brandCyan uppercase mb-1">
                Global Annual Application
              </div>
              <div className="text-xs text-white/70 leading-relaxed">
                Unlike income which is strictly tracked per quarter, your tax residency status and age profile apply to
                the entire Tax Year. Any information entered here is treated as global for the year and cannot be
                different across quarters.
              </div>
            </div>
          </div>
        </div>

        {/* Dual Residency Alert Container (Conditionally Visible) */}
        {showDualResidencyAlert && (
          <div id="dual-residency-alert" className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-xl shrink-0">⚠️</span>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-sans font-black text-amber-400 uppercase tracking-[0.01em]">
                  Dual Residency Conflict Detected
                </span>
                <span className="text-xs text-white/70 leading-relaxed">
                  You are classified as a tax resident under both Indian domestic laws (Fiscal Year: Apr–Mar) and US
                  domestic laws (Calendar Year: Jan–Dec). This creates overlapping worldwide tax exposure.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-2">
                <span className="text-[12px] font-sans font-black uppercase tracking-[0.01em] text-brandGold">
                  DTAA Article 4 Tie-Breaker
                </span>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Under the India-US Treaty, you can resolve dual residency by breaking the tie to one country using
                  these sequential tests: Permanent Home ➔ Center of Vital Interests ➔ Habitual Abode ➔ Nationality.
                  Breaking the tie to the US allows you to file your Indian return as a Non-Resident and claim DTAA
                  benefits.
                </p>
              </div>
              <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col gap-2">
                <span className="text-[12px] font-sans font-black uppercase tracking-[0.01em] text-brandGold">
                  Tax Year Mismatch &amp; FTC Apportionment
                </span>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  If you do not break the tie, you must claim a Foreign Tax Credit (FTC Form 67 / Section 90) to avoid
                  double taxation in India. Because the Indian Fiscal Year (April-March) crosses two US Calendar Years,
                  you must apportion US calendar-year earnings and withholdings to the corresponding Indian fiscal
                  months.
                </p>
              </div>
            </div>

            {/* DTAA ARTICLE 4 TIE-BREAKER WIZARD */}
            <div className="pt-4 border-t border-white/5 mt-2">
              <span className="text-[12px] font-sans font-black uppercase tracking-[0.01em] text-brandGold mb-3 block">
                Run the Treaty Tie-Breaker Tests
              </span>
              <div className="flex flex-col gap-3 bg-black/40 p-4 rounded-xl border border-white/5">
                <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-lg border border-white/5">
                  <label className="text-[11px] font-sans font-bold text-brandGold uppercase">Step 1: Permanent Home</label>
                  <span className="text-[10px] text-white/70">Where do you have a permanent home available to you?</span>
                  <select
                    value={dtaa.tb_home}
                    onChange={(e) => send({ type: 'SET_TIE_BREAKER', field: 'home', value: e.target.value })}
                    className="bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2 mt-1 focus:border-brandGold focus:outline-none [color-scheme:dark]"
                  >
                    <option value="none">-- Select --</option>
                    <option value="india">India Only</option>
                    <option value="us">United States Only</option>
                    <option value="both">Both Countries</option>
                    <option value="neither">Neither Country</option>
                  </select>
                </div>

                {tb.showCvi && (
                  <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-lg border border-white/5">
                    <label className="text-[11px] font-sans font-bold text-brandGold uppercase">Step 2: Centre of Vital Interests</label>
                    <span className="text-[10px] text-white/70">Where are your closer personal and economic relations?</span>
                    <select
                      value={dtaa.tb_cvi}
                      onChange={(e) => send({ type: 'SET_TIE_BREAKER', field: 'cvi', value: e.target.value })}
                      className="bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2 mt-1 focus:border-brandGold focus:outline-none [color-scheme:dark]"
                    >
                      <option value="none">-- Select --</option>
                      <option value="india">Closer to India</option>
                      <option value="us">Closer to United States</option>
                      <option value="tie">Cannot be determined</option>
                    </select>
                  </div>
                )}

                {tb.showAbode && (
                  <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-lg border border-white/5">
                    <label className="text-[11px] font-sans font-bold text-brandGold uppercase">Step 3: Habitual Abode</label>
                    <span className="text-[10px] text-white/70">Where is your habitual abode (customary living pattern)?</span>
                    <select
                      value={dtaa.tb_abode}
                      onChange={(e) => send({ type: 'SET_TIE_BREAKER', field: 'abode', value: e.target.value })}
                      className="bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2 mt-1 focus:border-brandGold focus:outline-none [color-scheme:dark]"
                    >
                      <option value="none">-- Select --</option>
                      <option value="india">India</option>
                      <option value="us">United States</option>
                      <option value="tie">Both or Neither</option>
                    </select>
                  </div>
                )}

                {tb.showNationality && (
                  <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-lg border border-white/5">
                    <label className="text-[11px] font-sans font-bold text-brandGold uppercase">Step 4: Nationality</label>
                    <span className="text-[10px] text-white/70">What is your legal citizenship/nationality?</span>
                    <select
                      value={dtaa.tb_nationality}
                      onChange={(e) => send({ type: 'SET_TIE_BREAKER', field: 'nationality', value: e.target.value })}
                      className="bg-[#121212] border border-white/10 rounded-lg text-xs text-white px-3 py-2 mt-1 focus:border-brandGold focus:outline-none [color-scheme:dark]"
                    >
                      <option value="none">-- Select --</option>
                      <option value="india">Indian Citizen</option>
                      <option value="us">US Citizen</option>
                      <option value="tie">Dual Citizen or Neither</option>
                    </select>
                  </div>
                )}

                {tb.showOutcome && (
                  <div
                    className={
                      'p-3 rounded-xl border font-bold text-[10px] text-center mt-2 transition-all ' +
                      (tb.outcomeIsPositive
                        ? 'bg-brandGold/20 border-brandGold/50 text-brandGold'
                        : 'bg-amber-500/20 border-amber-500/50 text-amber-500')
                    }
                  >
                    <span>{tb.outcomeText}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <hr className="border-white/5 my-2" />

        {/* Residency Core Parameters */}
        <div className="flex flex-col gap-4">
          {/* NON-INDIVIDUAL: control & management wholly outside India */}
          {v.divResWhollyOutside && (
            <div id="div-res-wholly-outside" className="p-4 bg-white/5 border border-white/10 rounded-2xl transition-all">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white/80">
                    Is the control and management of its affairs situated wholly outside India?
                  </span>
                  <span className="text-[9px] text-white/30">If even partially in India, the entity is considered Resident.</span>
                </div>
                <YesNoSelect
                  id="res-wholly-outside"
                  value={rd.is_wholly_outside_india}
                  onChange={(val) => updateField('is_wholly_outside_india', val)}
                />
              </div>
            </div>
          )}

          {/* COMPANY: is it an Indian company */}
          {v.divResIndianCompany && (
            <div id="div-res-indian-company" className="p-4 bg-white/5 border border-white/10 rounded-2xl transition-all">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white/80">Is it an Indian Company?</span>
                  <span className="text-[9px] text-white/30">An Indian Company is always considered Resident in India.</span>
                </div>
                <YesNoSelect
                  id="res-indian-company"
                  value={rd.is_indian_company}
                  onChange={(val) => updateField('is_indian_company', val)}
                />
              </div>
            </div>
          )}

          {/* Company Residency (POEM) */}
          {v.divCompanyResidency && (
            <div id="div-company-residency" className="p-5 bg-brandGold/5 border border-brandGold/20 rounded-2xl flex flex-col gap-4 transition-all mb-4">
              <div>
                <h3 className="text-sm font-sans font-black uppercase tracking-[0.01em] text-brandGold mb-1">Company Residency (POEM)</h3>
                <p className="text-[9px] text-white/40">Raw facts for POEM determination.</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-[10px] font-bold text-white/90">Is Active Business?</span>
                <ToggleSwitch checked={cr.is_active_business} onChange={(val) => updateCompany('is_active_business', val)} />
              </div>

              {v.divCrBoardOut && (
                <div id="div-cr-board-out" className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                  <span className="text-[10px] font-bold text-white/90">Board Meetings Primarily Outside India?</span>
                  <ToggleSwitch
                    checked={cr.board_meetings_primarily_outside_india}
                    onChange={(val) => updateCompany('board_meetings_primarily_outside_india', val)}
                  />
                </div>
              )}

              {v.divCrKmpLoc && (
                <div id="div-cr-kmp-loc" className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <label className="block text-[12px] font-sans font-bold text-white/90 mb-2">Key Management Location</label>
                  <select
                    value={cr.key_management_location}
                    onChange={(e) => updateCompany('key_management_location', e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 [color-scheme:dark]"
                  >
                    <option value="" disabled>Select location</option>
                    <option value="india">India</option>
                    <option value="outside_india">Outside India</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              )}

              {v.divCrMgmtDel && (
                <div id="div-cr-mgmt-del" className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                  <span className="text-[10px] font-bold text-white/90">Management Delegated Outside India?</span>
                  <ToggleSwitch
                    checked={cr.management_delegated_outside_india}
                    onChange={(val) => updateCompany('management_delegated_outside_india', val)}
                  />
                </div>
              )}

              {v.divCrDirs && (
                <div id="div-cr-dirs" className="flex gap-4">
                  <div className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <label className="block text-[12px] font-sans font-bold text-white/90 mb-2">Directors in India (Count)</label>
                    <input
                      type="number"
                      value={cr.directors_in_india_count}
                      onChange={(e) => updateCompany('directors_in_india_count', parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0"
                    />
                  </div>
                  <div className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <label className="block text-[12px] font-sans font-bold text-white/90 mb-2">Directors Outside (Count)</label>
                    <input
                      type="number"
                      value={cr.directors_outside_india_count}
                      onChange={(e) => updateCompany('directors_outside_india_count', parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {v.divKartaAlert && (
            <div id="div-karta-alert" className="mt-2 p-3 bg-brandCyan/10 border border-brandCyan/30 rounded-xl flex flex-col gap-1">
              <span className="text-[12px] font-sans font-black text-brandCyan uppercase tracking-[0.01em]">
                Karta Physical Presence Test Required
              </span>
              <span className="text-[10px] text-brandCyan/70">
                Because the HUF is Resident, please answer the questions below regarding the <strong>Karta&apos;s</strong>{' '}
                physical presence in India to determine if the HUF is Ordinarily Resident (ROR) or Not Ordinarily
                Resident (RNOR).
              </span>
            </div>
          )}

          {v.divResidencyIndividualContainer && (
            <div id="div-residency-individual-container" className="flex flex-col gap-4 transition-all">
              {v.divResCoreDays && (
                <div id="div-res-core-days" className="p-4 bg-white/5 border border-white/10 rounded-2xl border-l-2 border-l-brandGold transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-sans font-bold text-white/90 uppercase tracking-[0.01em] flex items-center gap-2">
                        Total Days in India
                        {hasActiveLiveTrip && (
                          <span
                            id="badge-live-tracking"
                            className="text-[8px] px-1.5 py-0.5 rounded bg-brandGreen/20 border border-brandGreen/40 text-brandGreen font-black uppercase shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                          >
                            Live 🟢
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] text-white/40 mt-0.5">Sum of Manual + Live Tracked Days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        id="days-val"
                        readOnly
                        value={rd.days_in_india_current_year}
                        className="inr-input w-16 bg-[#121212] border border-brandGold/30 rounded text-xs font-black text-brandGold font-mono px-2 py-1 focus:outline-none text-center opacity-80 cursor-default"
                      />
                      <span className="text-xs font-black text-brandGold font-mono">days</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-sans font-bold text-white/70 uppercase">Manual Days Slider</span>
                      <span id="manual-days-val" className="text-[10px] text-brandGold font-mono font-bold">
                        {rd.manual_days} days
                      </span>
                    </div>
                    <input
                      type="range"
                      id="res-days-current"
                      min="0"
                      max="366"
                      value={rd.manual_days}
                      onChange={(e) => send({ type: 'SET_MANUAL_DAYS', value: e.target.value })}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brandGold"
                    />
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[12px] font-sans font-bold text-white/70 uppercase group-hover:text-white transition-colors">
                        Enable Live Date Tracking
                      </span>
                      <div
                        className={
                          'relative inline-flex h-4 w-8 items-center rounded-full transition-colors peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brandGold/50 ' +
                          (rd.live_tracking_active ? 'bg-brandGreen/80' : 'bg-white/10')
                        }
                      >
                        <input
                          type="checkbox"
                          id="toggle-live-track"
                          checked={rd.live_tracking_active}
                          onChange={(e) => send({ type: 'TOGGLE_LIVE_TRACKING', value: e.target.checked })}
                          className="peer sr-only"
                        />
                        <span
                          className={
                            'inline-block h-3 w-3 transform rounded-full bg-white transition-transform ' +
                            (rd.live_tracking_active ? 'translate-x-4' : 'translate-x-1')
                          }
                        />
                      </div>
                    </label>

                    {rd.live_tracking_active && (
                      <div id="live-tracking-panel" className="mt-4 flex flex-col gap-3 transition-all">
                        <div id="live-trips-container" className="flex flex-col gap-3">
                          {rd.trips.map((trip, idx) => (
                            <div key={idx} className="relative grid grid-cols-2 gap-3 p-3 bg-black/20 rounded-xl border border-white/5 group">
                              {rd.trips.length > 1 && (
                                <button
                                  onClick={() => send({ type: 'REMOVE_TRIP', index: idx })}
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                              <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-sans font-bold text-white/50 uppercase">Arrival Date {idx + 1}</label>
                                <input
                                  type="date"
                                  value={trip.arrival_date || ''}
                                  onChange={(e) => send({ type: 'UPDATE_TRIP_DATE', index: idx, field: 'arrival_date', value: e.target.value })}
                                  className="w-full bg-[#121212] border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-brandGold focus:outline-none placeholder-white/20 [color-scheme:dark]"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-sans font-bold text-white/50 uppercase">
                                  Departure Date {idx + 1} <span className="text-white/30 lowercase">(optional)</span>
                                </label>
                                <input
                                  type="date"
                                  value={trip.departure_date || ''}
                                  onChange={(e) => send({ type: 'UPDATE_TRIP_DATE', index: idx, field: 'departure_date', value: e.target.value })}
                                  className="w-full bg-[#121212] border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-brandGold focus:outline-none placeholder-white/20 [color-scheme:dark]"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => send({ type: 'ADD_TRIP' })}
                          className="w-full py-2 border border-dashed border-white/20 rounded-lg text-xs font-bold text-brandGold/70 hover:text-brandGold hover:border-brandGold/50 hover:bg-brandGold/5 transition-colors"
                        >
                          + Add Trip
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {v.divP4y && (
                <QuestionRow
                  id="div-p4y"
                  title="Have you spent 365 days or more in India during the last 4 years?"
                  subtitle="This is the sum of your days in India over the past 4 financial years."
                >
                  <YesNoSelect value={rd.days_in_india_preceding_4_years_gte_365} onChange={(val) => updateField('days_in_india_preceding_4_years_gte_365', val)} />
                </QuestionRow>
              )}

              {v.divEmp && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl" id="div-emp">
                  <label className="block text-[11px] font-sans font-black uppercase tracking-[0.01em] text-white/40 mb-1.5">
                    Did you leave India for Employment or as Ship Crew?
                  </label>
                  <select
                    value={rd.employment_or_crew_status === null ? 'null' : rd.employment_or_crew_status}
                    onChange={(e) => updateField('employment_or_crew_status', e.target.value === 'null' ? null : e.target.value)}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2.5 focus:border-brandGold focus:ring-0 focus:outline-none transition-all [color-scheme:dark]"
                  >
                    <option value="null" disabled>Select an option...</option>
                    <option value="none">No (Standard Rule)</option>
                    <option value="employed_abroad">Yes, left India for employment this year</option>
                    <option value="indian_ship_crew">Yes, left as an Indian Ship Crew member</option>
                    <option value="foreign_ship_crew">Yes, left as a Foreign Ship Crew member</option>
                  </select>
                </div>
              )}

              {v.divDeparture && (
                <QuestionRow
                  id="div-departure"
                  title="Is this the first year you left India for employment?"
                  subtitle="Special relaxed rules apply only in the year you leave."
                >
                  <YesNoSelect value={rd.is_departure_year} onChange={(val) => updateField('is_departure_year', val)} />
                </QuestionRow>
              )}

              {v.divVisitor && (
                <QuestionRow
                  id="div-visitor"
                  title="Are you an Indian Citizen or Person of Indian Origin (PIO) visiting India?"
                  subtitle="This activates the 120-day special visitor rule."
                >
                  <YesNoSelect value={rd.came_on_visit_to_india_pio_citizen} onChange={(val) => updateField('came_on_visit_to_india_pio_citizen', val)} />
                </QuestionRow>
              )}

              {v.divNr9 && (
                <QuestionRow
                  id="div-nr9"
                  title="Were you a Non-Resident (NR) in 9 out of the last 10 years?"
                  subtitle="This helps determine if you are a Resident but Not Ordinarily Resident (RNOR)."
                >
                  <YesNoSelect value={rd.nr_years_last_10_gte_9} onChange={(val) => updateField('nr_years_last_10_gte_9', val)} />
                </QuestionRow>
              )}

              {v.divD7 && (
                <QuestionRow
                  id="div-d7"
                  title="Did you spend 729 days or less in India over the last 7 years?"
                  subtitle="This is another condition to determine if you are an RNOR."
                >
                  <YesNoSelect value={rd.days_in_india_last_7_years_lte_729} onChange={(val) => updateField('days_in_india_last_7_years_lte_729', val)} />
                </QuestionRow>
              )}

              {v.divHufNr9 && (
                <div className="p-4 bg-brandCyan/5 border border-brandCyan/20 rounded-2xl" id="div-huf-nr9">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-sans font-bold text-brandCyan/90 tracking-[0.01em]">
                      Have you (the Karta) been a resident of India in at least 2 out of the 10 financial years
                      immediately preceding the relevant Tax Year?
                    </span>
                    <YesNoSelect
                      className="border-brandCyan/20 focus:border-brandCyan ml-4 flex-shrink-0"
                      value={rd.nr_years_last_10_gte_9 === null ? null : !rd.nr_years_last_10_gte_9}
                      onChange={(val) => send({ type: 'UPDATE_HUF_NR9', value: val })}
                    />
                  </div>
                </div>
              )}

              {v.divHufD7 && (
                <div className="p-4 bg-brandCyan/5 border border-brandCyan/20 rounded-2xl" id="div-huf-d7">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-sans font-bold text-brandCyan/90 tracking-[0.01em]">
                      Was your (the Karta&apos;s) total physical stay in India equal to or greater than 730 days during
                      the 7 financial years immediately preceding the relevant Tax Year?
                    </span>
                    <YesNoSelect
                      className="border-brandCyan/20 focus:border-brandCyan ml-4 flex-shrink-0"
                      value={rd.days_in_india_last_7_years_lte_729 === null ? null : !rd.days_in_india_last_7_years_lte_729}
                      onChange={(val) => send({ type: 'UPDATE_HUF_D7', value: val })}
                    />
                  </div>
                </div>
              )}

              {v.divInc15 && (
                <QuestionRow
                  id="div-inc15"
                  title="Is your Indian Income more than ₹15 Lakhs?"
                  subtitle="Only include income earned in India. This affects your deemed residency status."
                >
                  <YesNoSelect value={rd.india_source_income_above_15l} onChange={(val) => updateField('india_source_income_above_15l', val)} />
                </QuestionRow>
              )}

              <QuestionRow
                id="div-us-person-cert"
                title="US Person Self-Certification (W-9/FATCA) on File With Indian Banks?"
                subtitle="Only relevant if you are a US citizen, Green Card holder, or US tax resident. Under FATCA/IGA, Indian banks must report US-person accounts."
              >
                <select
                  id="res-us-person-cert"
                  value={rd.us_person_certified_to_bank === null ? 'null' : String(rd.us_person_certified_to_bank)}
                  onChange={(e) => updateField('us_person_certified_to_bank', e.target.value === 'null' ? null : e.target.value === 'true')}
                  className="w-48 bg-[#121212] border border-white/10 rounded-xl text-xs text-white px-3 py-2 focus:border-brandGold focus:ring-0 focus:outline-none transition-all [color-scheme:dark]"
                >
                  <option value="null">-- Not sure / not applicable --</option>
                  <option value="true">Yes — certified</option>
                  <option value="false">No — not certified</option>
                </select>
              </QuestionRow>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2">
          <button
            onClick={onBack}
            className="px-4 py-2.5 bg-white/5 text-white/60 font-bold uppercase text-[9px] tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/5"
          >
            ← Back
          </button>
          <button
            onClick={() => onContinue?.(ctx)}
            className="px-6 py-2.5 bg-brandGold text-black font-bold uppercase text-[9px] tracking-widest rounded-xl hover:brightness-110 transition-all"
          >
            Continue →
          </button>
        </div>
      </div>
    </>
  );
}
