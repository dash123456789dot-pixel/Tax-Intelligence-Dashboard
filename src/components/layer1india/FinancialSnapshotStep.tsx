import React, { useEffect } from "react";
import { useMachine, useSelector } from "@xstate/react";
import { ChevronDown, Check } from "lucide-react";
import {
  financialSnapshotMachine,
  forcesOldRegime,
  showsCorporateBlock,
  showsMatProfitField,
  showsManufacturingWarning,
  showsMfgDatesBlock,
  showsMfgCommenceDateField,
  visibleCorporateRegimeRows,
  showsPresumptiveWarning,
  presumptiveWarningText,
  FinancialSnapshotContext,
} from "@/machines/financialSnapshotMachine";
import { ActorRef } from "xstate";

const FS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700;800&display=swap');

.fs-panel {
  --gold: #D4AF37;
  font-family: 'Inter', sans-serif;
  color: #A1A1AA;
  background-color: rgba(18, 18, 18, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  box-sizing: border-box;
}
.fs-panel * { box-sizing: border-box; }
@media (min-width: 1024px) { .fs-panel { padding: 32px; } }

.fs-header h2 { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.02em; margin: 0; }
.fs-header p { font-size: 12px; color: rgba(255,255,255,0.4); margin: 6px 0 0; max-width: 640px; line-height: 1.6; }

.fs-section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em; color: rgba(255,255,255,0.5); border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; margin: 0 0 16px; }

.fs-config-card { background: #0A0A0A; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }

.fs-config-row { display: grid; grid-template-columns: 1fr; border-top: 1px solid rgba(255,255,255,0.1); }
.fs-config-row:first-child { border-top: none; }
@media (min-width: 768px) { .fs-config-row { grid-template-columns: 1fr 1fr; } }

.fs-config-cell { padding: 20px; display: flex; flex-direction: column; gap: 6px; border-top: 1px solid rgba(255,255,255,0.1); transition: background-color 0.15s; }
.fs-config-cell:first-child { border-top: none; }
.fs-config-cell:hover { background: rgba(255,255,255,0.02); }
.fs-config-cell:focus-within { background: rgba(255,255,255,0.04); }
@media (min-width: 768px) {
  .fs-config-cell { border-top: none; border-left: 1px solid rgba(255,255,255,0.1); }
  .fs-config-cell:first-child { border-left: none; }
}

.fs-field-label { display: block; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(212,175,55,0.8); margin-bottom: 2px; }
.fs-field-label.muted { color: rgba(255,255,255,0.5); }

.fs-select-wrap { position: relative; }
.fs-select { width: 100%; background: transparent; border: none; padding: 0; padding-right: 24px; font-size: 14px; color: #fff; font-weight: 500; outline: none; appearance: none; cursor: pointer; font-family: inherit; }
.fs-select option { background: #050505; }
.fs-select-chevron { position: absolute; right: 0; top: 50%; transform: translateY(-50%); opacity: 0.5; pointer-events: none; color: #fff; }
.fs-input { width: 100%; background: transparent; border: none; padding: 0; font-size: 14px; color: #fff; font-weight: 500; outline: none; font-family: inherit; }
.fs-input::placeholder { color: rgba(255,255,255,0.2); }
.fs-input.mono { font-family: 'JetBrains Mono', monospace; }

.fs-toggle-row { padding: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.fs-toggle-row .fs-toggle-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.9); }
.fs-toggle-row .fs-toggle-hint { font-size: 9px; color: rgba(255,255,255,0.4); margin-top: 2px; }

.fs-switch { position: relative; display: inline-flex; align-items: center; width: 32px; height: 16px; border-radius: 9999px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: background-color 0.2s; flex-shrink: 0; padding: 0; }
.fs-switch.is-on { background: var(--gold); }
.fs-switch .fs-switch-thumb { position: absolute; top: 1px; left: 1px; width: 12px; height: 12px; border-radius: 9999px; background: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.3); transition: transform 0.2s; }
.fs-switch.is-on .fs-switch-thumb { transform: translateX(16px); background: #000; }
.fs-switch.sm { width: 28px; }
.fs-switch.sm.is-on .fs-switch-thumb { transform: translateX(12px); }

.fs-warning { display: flex; align-items: flex-start; gap: 10px; padding: 16px; border-top: 1px solid; font-size: 10px; font-weight: 700; line-height: 1.6; }
.fs-warning.danger { background: rgba(153,27,27,0.1); border-color: rgba(153,27,27,0.2); color: #f87171; }
.fs-warning.gold { background: rgba(212,175,55,0.2); border-color: rgba(212,175,55,0.4); color: var(--gold); }

.fs-corp-block { border-top: 1px solid rgba(212,175,55,0.2); background: rgba(212,175,55,0.05); display: flex; flex-direction: column; }
.fs-corp-header { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.fs-corp-header h4 { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: var(--gold); margin: 0 0 4px; }
.fs-corp-header p { font-size: 9px; color: rgba(255,255,255,0.4); margin: 0; }
.fs-corp-row { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); gap: 12px; }
.fs-corp-row .fs-corp-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.9); }
.fs-corp-row .fs-corp-hint { font-size: 8px; color: rgba(255,255,255,0.4); margin-top: 2px; }

.fs-mfg-dates { display: flex; flex-direction: column; gap: 12px; padding: 16px; background: rgba(0,0,0,0.4); border-top: 1px solid rgba(255,255,255,0.1); }
.fs-date-label { display: block; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
.fs-date-input { width: 100%; background: #121212; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 10px; font-size: 13px; color: #fff; color-scheme: dark; font-family: inherit; }

.fs-mat-box { display: flex; flex-direction: column; padding: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(212,175,55,0.2); border-radius: 16px; margin: 16px; }
.fs-mat-box label { font-size: 12px; font-weight: 700; color: var(--gold); margin-bottom: 4px; }
.fs-mat-box .fs-mat-hint { font-size: 9px; color: rgba(255,255,255,0.4); margin-bottom: 12px; }
.fs-mat-input { width: 100%; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; font-size: 12px; color: #fff; padding: 8px 12px; font-family: 'JetBrains Mono', monospace; }

.fs-setup-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 768px) { .fs-setup-grid { grid-template-columns: repeat(3, 1fr); } }
.fs-setup-card { display: flex; flex-direction: column; gap: 12px; padding: 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; cursor: pointer; transition: background-color 0.3s; text-align: left; font-family: inherit; }
.fs-setup-card:hover { background: rgba(255,255,255,0.1); }
.fs-setup-card:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.fs-setup-top { display: flex; align-items: center; justify-content: space-between; }
.fs-setup-icon { font-size: 20px; }
.fs-setup-radio { width: 16px; height: 16px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; transition: background-color 0.15s, border-color 0.15s; flex-shrink: 0; }
.fs-setup-radio.is-checked { background: var(--gold); border-color: var(--gold); }
.fs-setup-check { opacity: 0; transition: opacity 0.15s; color: #000; }
.fs-setup-check.is-checked { opacity: 1; }
.fs-setup-title { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 0.15em; }
.fs-setup-desc { font-size: 9px; color: rgba(255,255,255,0.4); line-height: 1.5; }

.fs-footer { display: flex; justify-content: flex-end; }
.fs-next-btn { padding: 12px 24px; background: var(--gold); color: #000; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase; font-size: 12px; border-radius: 12px; border: none; cursor: pointer; box-shadow: 0 0 15px rgba(212,175,55,0.3); transition: background-color 0.15s; font-family: inherit; }
.fs-next-btn:hover { background: rgba(212,175,55,0.8); }
`;

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "md" | "sm";
  id?: string;
}

function ToggleSwitch({ checked, onChange, size = "md", id }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      className={`fs-switch ${size === "sm" ? "sm" : ""} ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="fs-switch-thumb" />
    </button>
  );
}

interface SetupCardProps {
  icon: string;
  title: string;
  desc: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}

function SetupCard({ icon, title, desc, checked, onToggle }: SetupCardProps) {
  return (
    <button type="button" className="fs-setup-card" onClick={() => onToggle(!checked)}>
      <div className="fs-setup-top">
        <span className="fs-setup-icon">{icon}</span>
        <span className={`fs-setup-radio ${checked ? "is-checked" : ""}`}>
          <Check size={10} strokeWidth={3} className={`fs-setup-check ${checked ? "is-checked" : ""}`} />
        </span>
      </div>
      <div>
        <div className="fs-setup-title">{title}</div>
        <div className="fs-setup-desc">{desc}</div>
      </div>
    </button>
  );
}

const ENTITY_OPTIONS = [
  ["individual", "Individual"],
  ["huf", "Hindu Undivided Family (HUF)"],
  ["firm", "Partnership Firm (Ordinary)"],
  ["llp", "Limited Liability Partnership (LLP)"],
  ["company", "Company"],
  ["aop", "Association of Persons (AOP/BOI)"],
  ["trust", "Trust / NGO / Political Party"],
  ["ajp", "Artificial Juridical Person (AJP)"],
  ["local", "Local Authority"],
];

const CORP_ROWS = {
  turnoverLte400Cr: {
    label: "Standard Regime (Previous Year Turnover <= ₹400 Cr?)",
    hint: "Determines if base tax rate is 25% instead of 30%.",
    event: "CORP.TURNOVER_400.TOGGLE",
  },
  opt115BAA: {
    label: "Opting for 22% rate Concessional Corporate Tax Rate (Domestic Companies)?",
    hint: "Irrevocable choice; surrenders most exemptions.",
    event: "CORP.OPT_115BAA.TOGGLE",
  },
  opt115BAB: {
    label: "Opting for 15% rate Concessional Corporate Tax Rate (New Manufacturing Companies)?",
    hint: "For NEW Manufacturing Companies only.",
    event: "CORP.OPT_115BAB.TOGGLE",
  },
  opt115BA: {
    label: "Opting for 25% rate Concessional Corporate Tax Rate (Certain Domestic Companies)?",
    hint: "For Manufacturing Companies setup after Mar 2016.",
    event: "CORP.OPT_115BA.TOGGLE",
  },
} as const;

interface FinancialSnapshotFieldsProps {
  context: FinancialSnapshotContext;
  send: (event: any) => void;
  onNext: () => void;
}

export function FinancialSnapshotFields({ context, send, onNext }: FinancialSnapshotFieldsProps) {
  const { entityType, pan, taxRegime, panAadhaarLinked, corporate, incomeHeads, hasInternationalAssets } = context;

  return (
    <div className="fs-panel">
      <div className="fs-header">
        <h2>Financial Life Snapshot</h2>
        <p>
          Select all scenarios that apply to generate your personalized intake matrix for India. This dynamic matrix
          will prune irrelevant schedules and calculate your estimated tax complexity.
        </p>
      </div>

      {/* ---- Tax Profile Configuration ---- */}
      <div>
        <div className="fs-section-title">Tax Profile Configuration</div>
        <div className="fs-config-card">
          <div className="fs-config-row">
            <div className="fs-config-cell">
              <label className="fs-field-label">Your Tax Entity Type</label>
              <div className="fs-select-wrap">
                <select
                  className="fs-select"
                  value={entityType}
                  onChange={(e) => send({ type: "ENTITY_TYPE.SET", value: e.target.value })}
                >
                  {ENTITY_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="fs-select-chevron" />
              </div>
            </div>
            <div className="fs-config-cell">
              <label className="fs-field-label muted">Permanent Account Number (PAN)</label>
              <input
                type="text"
                className="fs-input mono"
                placeholder="ABCPS1234K (Optional)"
                value={pan}
                onChange={(e) => send({ type: "PAN.SET", value: e.target.value })}
              />
            </div>
          </div>

          <div className="fs-config-row">
            {!forcesOldRegime(context) && (
              <div className="fs-config-cell">
                <label className="fs-field-label">Tax Regime</label>
                <div className="fs-select-wrap">
                  <select
                    className="fs-select"
                    value={taxRegime}
                    onChange={(e) => send({ type: "TAX_REGIME.SET", value: e.target.value })}
                  >
                    <option value="NEW">New Tax Regime (Default Sec 115BAC)</option>
                    <option value="OLD">Old Tax Regime (With Deductions)</option>
                  </select>
                  <ChevronDown size={16} className="fs-select-chevron" />
                </div>
              </div>
            )}
            <div className="fs-toggle-row">
              <div>
                <div className="fs-toggle-label">PAN Linked to Aadhaar</div>
                <div className="fs-toggle-hint">Determines higher tax deduction rates</div>
              </div>
              <ToggleSwitch
                checked={panAadhaarLinked}
                onChange={(checked) => send({ type: "AADHAAR_LINKED.TOGGLE", checked })}
              />
            </div>
          </div>

          {showsPresumptiveWarning(context) && <div className="fs-warning danger">{presumptiveWarningText(context)}</div>}

          {showsCorporateBlock(context) && (
            <div className="fs-corp-block">
              <div className="fs-corp-header">
                <h4>Corporate Tax Regime</h4>
                <p>Select the applicable corporate tax base. These regimes are mutually exclusive.</p>
              </div>

              {visibleCorporateRegimeRows(context).map((key) => {
                const row = CORP_ROWS[key];
                return (
                  <div className="fs-corp-row" key={key}>
                    <div>
                      <div className="fs-corp-label">{row.label}</div>
                      <div className="fs-corp-hint">{row.hint}</div>
                    </div>
                    <ToggleSwitch
                      size="sm"
                      checked={corporate[key]}
                      onChange={(checked) => send({ type: row.event, checked })}
                    />
                  </div>
                );
              })}

              {showsManufacturingWarning(context) && (
                <div className="fs-warning gold">
                  <strong>Note:</strong>&nbsp;This regime is strictly for manufacturing/power businesses.
                  Non-compliant business codes added below will be flagged.
                </div>
              )}

              {showsMfgDatesBlock(context) && (
                <div className="fs-mfg-dates">
                  <div>
                    <label className="fs-date-label">Date of Setup / Registration</label>
                    <input
                      type="date"
                      className="fs-date-input"
                      value={corporate.mfgSetupDate}
                      onChange={(e) => send({ type: "CORP.MFG_SETUP_DATE.SET", value: e.target.value })}
                    />
                  </div>
                  {showsMfgCommenceDateField(context) && (
                    <div>
                      <label className="fs-date-label">Date of Commencement of Manufacturing</label>
                      <input
                        type="date"
                        className="fs-date-input"
                        value={corporate.mfgCommenceDate}
                        onChange={(e) => send({ type: "CORP.MFG_COMMENCE_DATE.SET", value: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {showsMatProfitField(context) && (
            <div className="fs-mat-box">
              <label>Book Profit computed Minimum Alternate Tax (MAT) (₹)</label>
              <span className="fs-mat-hint">Required to calculate Minimum Alternate Tax (MAT) liability at 15%.</span>
              <input
                type="text"
                inputMode="numeric"
                className="fs-mat-input"
                value={corporate.matBookProfit ?? ""}
                onChange={(e) =>
                  send({ type: "CORP.MAT_PROFIT.SET", value: e.target.value === "" ? null : e.target.value })
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* ---- Primary Income Heads ---- */}
      <div>
        <div className="fs-section-title">Primary Income Heads</div>
        <div className="fs-setup-grid">
          <SetupCard
            icon="💼"
            title="Employment"
            desc="Form 16, Salary, RSUs, Allowances."
            checked={incomeHeads.salary}
            onToggle={(checked) => send({ type: "INCOME_HEAD.TOGGLE", head: "salary", checked })}
          />
          <SetupCard
            icon="🏠"
            title="Real Estate"
            desc="Rental Income, Home Loan Interest (Section 24b)."
            checked={incomeHeads.houseProperty}
            onToggle={(checked) => send({ type: "INCOME_HEAD.TOGGLE", head: "houseProperty", checked })}
          />
          <SetupCard
            icon="🏢"
            title="Business & Trading"
            desc="F&O Trading, Freelance, Presumptive (44AD/ADA)."
            checked={incomeHeads.business}
            onToggle={(checked) => send({ type: "INCOME_HEAD.TOGGLE", head: "business", checked })}
          />
        </div>
      </div>

      {/* ---- Wealth & International ---- */}
      <div>
        <div className="fs-section-title">Wealth &amp; International</div>
        <div className="fs-setup-grid">
          <SetupCard
            icon="📈"
            title="Capital Gains"
            desc="Sold property, stocks, mutual funds, crypto."
            checked={incomeHeads.capitalGains}
            onToggle={(checked) => send({ type: "INCOME_HEAD.TOGGLE", head: "capitalGains", checked })}
          />
          <SetupCard
            icon="💰"
            title="Other Sources"
            desc="Interest, dividends, PF withdrawals, gifts."
            checked={incomeHeads.otherSources}
            onToggle={(checked) => send({ type: "INCOME_HEAD.TOGGLE", head: "otherSources", checked })}
          />
          <SetupCard
            icon="✈️"
            title="International"
            desc="Foreign assets, foreign income, or claiming DTAA relief."
            checked={hasInternationalAssets}
            onToggle={(checked) => send({ type: "INTERNATIONAL.TOGGLE", checked })}
          />
        </div>
      </div>

      <div className="fs-footer">
        <button type="button" className="fs-next-btn" onClick={onNext}>
          Next Step →
        </button>
      </div>
    </div>
  );
}

interface FinancialSnapshotStepProps {
  sidebarActorRef: ActorRef<any, any>;
  onNext: () => void;
}

export default function FinancialSnapshotStep({
  sidebarActorRef,
  onNext,
}: FinancialSnapshotStepProps) {
  const [snapState, snapSend] = useMachine(financialSnapshotMachine, {
    input: { sidebarActorRef },
  });

  console.log("FinancialSnapshotStep renders. sidebarActorRef:", !!sidebarActorRef, "snapState.context.sidebarActorRef:", !!snapState.context.sidebarActorRef);

  const residencyStatus = useSelector(sidebarActorRef, (s) => s.context.residencyStatus);
  useEffect(() => {
    snapSend({ type: "RESIDENCY_STATUS.SYNC", status: residencyStatus });
  }, [residencyStatus, snapSend]);

  return (
    <>
      <style>{FS_CSS}</style>
      <FinancialSnapshotFields context={snapState.context} send={snapSend} onNext={onNext} />
    </>
  );
}
