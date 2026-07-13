/**
 * =============================================================================
 * ANTIGRAVITY BUILD PROMPT — paste this whole comment as the task prompt
 * =============================================================================
 * GOAL
 *   Implement `CompliancePanel.jsx`: the LEFT SIDE PANEL ONLY (the
 *   "Compliance Steps" <aside> from layer1_india.html) as one self-contained
 *   React component. It renders phases/steps and reflects lock, visibility,
 *   and active state — but it must never compute those flags itself.
 *
 * DEPENDENCY / CONTRACT
 *   This file consumes `complianceSidebarMachine.js` (sibling file) via
 *   `useMachine` from `@xstate/react`. ALL business rules (which steps are
 *   visible, which are locked, which is active) live in that machine —
 *   this component only:
 *     1. Renders whatever `selectSidebarView(context)` returns.
 *     2. Sends events on click ("STEP.SELECT", "PHASE.TOGGLE").
 *   If a step's visibility/lock rule ever needs to change, that change
 *   belongs in complianceSidebarMachine.js, never in this file.
 *
 * REQUIREMENTS
 *   1. Sidebar only — do not render the wizard's center-panel step content.
 *   2. No Tailwind arbitrary-value classes (no compiler available at
 *      runtime) — all styling is a scoped plain-CSS block (`.l1-*` classes)
 *      injected via a single <style> tag, extracted with real px/hex values
 *      from layer1_india.html so it renders identically anywhere.
 *   3. List rendering uses stable `step.id` / `phase.id` React keys — never
 *      array index — so re-renders after a step becomes visible/hidden
 *      never misapply active/locked styling to the wrong row.
 *   4. A phase with zero currently-visible steps must render nothing
 *      (already handled by `selectSidebarView` filtering empty phases).
 *   5. Locked steps are real `disabled` buttons (not just dimmed text) so
 *      keyboard and screen-reader users can't activate them.
 *   6. Ship a `debugControls` prop (default true here for demo purposes)
 *      that renders a small "Simulate Wizard Inputs" strip sending the
 *      exact events Step 1 (Financial Snapshot) and Step 2 (Residency
 *      Detection) would send in the full wizard — e.g. toggling residency
 *      to 'NR' should make "Compliance Docs" appear and become clickable
 *      live, with no other code changes. Set debugControls={false} when
 *      this panel is embedded in the real multi-step wizard, where the
 *      actual Step 1 / Step 2 forms will dispatch those events instead.
 *
 * ACCEPTANCE CRITERIA
 *   - Dropping <CompliancePanel /> into any React app renders a working,
 *     dark-themed sidebar with no other setup required.
 *   - With debugControls on: switching "Residency Status" to NR instantly
 *     reveals "Tax Treaties (DTAA)" and "Compliance Docs" in Phase 2, and
 *     they become clickable — no page reload, no manual resync call.
 *   - Checking an income-head box under "Simulate Wizard Inputs" instantly
 *     reveals the matching Phase 1 step.
 *   - Clicking a locked step does nothing (button is `disabled`).
 * =============================================================================
 */

import React from "react";
import { useMachine } from "@xstate/react";
import { Lock, Check } from "lucide-react";
import { complianceSidebarMachine, selectSidebarView } from "./complianceSidebarMachine";

const PANEL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700;800&display=swap');

.l1-panel {
  --gold: #D4AF37;
  --green: #10B981;
  --cyan: #06B6D4;
  font-family: 'Inter', sans-serif;
  width: 100%;
  flex-shrink: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background-color: rgba(18, 18, 18, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  backdrop-filter: blur(12px);
}
@media (min-width: 1024px) { .l1-panel { width: 288px; } }
.l1-panel * { box-sizing: border-box; }

.l1-panel-title {
  font-size: 10px; font-weight: 900; text-transform: uppercase;
  letter-spacing: 0.25em; color: rgba(255,255,255,0.4); margin: 0 0 4px 4px;
}

.l1-phase-group { display: flex; flex-direction: column; margin-bottom: 8px; }
.l1-phase-header {
  font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em;
  color: rgba(212,175,55,0.7); margin-bottom: 4px; padding: 0 12px; width: 100%;
  text-align: left; display: flex; justify-content: space-between; align-items: center;
  outline: none; cursor: pointer; background: none; border: none; font-family: inherit;
}
.l1-phase-header:hover { color: var(--gold); }
.l1-phase-header:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; border-radius: 4px; }

.l1-chevron { font-size: 8px; opacity: 0.5; transition: transform 0.3s; transform: rotate(0deg); }
.l1-chevron.is-collapsed { transform: rotate(-90deg); }

.l1-phase-content {
  display: flex; flex-direction: column; gap: 4px; overflow: hidden;
  transition: max-height 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease, padding-bottom 0.5s ease;
  max-height: 1000px; opacity: 1; padding: 0 16px 16px 16px;
}
.l1-phase-content.is-collapsed { max-height: 0; opacity: 0; padding-bottom: 0; }

.l1-step-btn {
  text-align: left; padding: 12px 16px; border-radius: 8px; font-size: 12px; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase; color: rgba(255,255,255,0.7);
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;
  background: transparent; border: none; border-left: 4px solid transparent; cursor: pointer;
  font-family: inherit; animation: l1-step-in 0.25s ease;
}
@keyframes l1-step-in { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }
.l1-step-btn:hover:not(.is-locked):not(.is-active) { background-color: rgba(255,255,255,0.04); }
.l1-step-btn:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; }
.l1-step-btn.is-active { background-color: rgba(212,175,55,0.1); border-left-color: var(--gold); color: #FFFFFF; }
.l1-step-btn.is-locked { opacity: 0.35; cursor: not-allowed; }
.l1-step-btn.is-highlight { color: var(--gold); border: 1px solid rgba(212,175,55,0.3); border-left: 1px solid rgba(212,175,55,0.3); }
.l1-step-btn.is-highlight:hover { background-color: rgba(212,175,55,0.1); }

.l1-badge {
  font-size: 8px; line-height: 1; padding: 3px 6px; border-radius: 4px;
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.l1-badge--default { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.3); font-family: 'JetBrains Mono', monospace; }
.l1-badge--success { background: rgba(16,185,129,0.2); border: 1px solid rgba(16,185,129,0.3); color: var(--green); font-weight: 900; text-transform: uppercase; font-family: 'Inter', sans-serif; padding: 3px 7px; }
.l1-badge--highlight { background: rgba(212,175,55,0.2); border: 1px solid rgba(212,175,55,0.3); color: var(--gold); font-weight: 900; text-transform: uppercase; font-family: 'Inter', sans-serif; padding: 3px 7px; }

.l1-footer-card { margin-top: 8px; padding: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; display: flex; flex-direction: column; gap: 8px; }
.l1-footer-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.25em; color: var(--gold); }
.l1-footer-value { font-size: 14px; font-weight: 700; color: #FFFFFF; font-family: 'Outfit', sans-serif; }

/* ---- Dev-only "simulate wizard inputs" strip (see debugControls prop) ---- */
.l1-debug { margin-top: 4px; padding: 14px; background: rgba(6,182,212,0.06); border: 1px dashed rgba(6,182,212,0.3); border-radius: 12px; display: flex; flex-direction: column; gap: 10px; }
.l1-debug-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: var(--cyan); }
.l1-debug-row { display: flex; flex-direction: column; gap: 4px; }
.l1-debug-row label { font-size: 9px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; }
.l1-debug-row select {
  background: #0a0a0a; color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;
  padding: 6px 8px; font-size: 11px; font-family: inherit;
}
.l1-debug-check { display: flex; align-items: center; gap: 6px; font-size: 10px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.03em; }
.l1-debug-check input { accent-color: var(--gold); }

@media (prefers-reduced-motion: reduce) {
  .l1-phase-content, .l1-chevron, .l1-step-btn, .l1-panel { transition: none !important; animation: none !important; }
}
`;

function StatusBadge({ step }) {
  if (step.active) return <span className="l1-badge l1-badge--success">Active</span>;
  if (step.highlight) return <span className="l1-badge l1-badge--highlight">View</span>;
  if (step.locked) {
    return (
      <span className="l1-badge l1-badge--default">
        <Lock size={9} strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span className="l1-badge l1-badge--default">
      <Check size={9} strokeWidth={2.5} />
    </span>
  );
}

function StepButton({ step, onSelect }) {
  const classes = ["l1-step-btn"];
  if (step.active) classes.push("is-active");
  if (step.locked) classes.push("is-locked");
  if (step.highlight) classes.push("is-highlight");

  return (
    <button
      type="button"
      className={classes.join(" ")}
      disabled={step.locked}
      aria-current={step.active ? "step" : undefined}
      onClick={() => onSelect(step.id)}
    >
      <span>{step.label}</span>
      <StatusBadge step={step} />
    </button>
  );
}

function PhaseGroup({ phase, onTogglePhase, onSelectStep }) {
  return (
    <div className="l1-phase-group">
      <button type="button" className="l1-phase-header" onClick={() => onTogglePhase(phase.id)}>
        <span>{phase.title}</span>
        <span className={`l1-chevron${phase.collapsed ? " is-collapsed" : ""}`}>▼</span>
      </button>
      <div className={`l1-phase-content${phase.collapsed ? " is-collapsed" : ""}`}>
        {phase.steps.map((step) => (
          <StepButton key={step.id} step={step} onSelect={onSelectStep} />
        ))}
      </div>
    </div>
  );
}

/** Dev-only harness: sends the same events the real wizard's Step 1 & Step 2
 * forms would send. Not part of the production sidebar — see debugControls. */
function DebugControls({ context, send }) {
  const { residencyStatus, taxRegime, hasInternationalAssets, incomeHeads } = context;

  return (
    <div className="l1-debug">
      <div className="l1-debug-title">Simulate wizard inputs (dev only)</div>

      <div className="l1-debug-row">
        <label htmlFor="l1-residency">Residency status (Step 2)</label>
        <select
          id="l1-residency"
          value={residencyStatus}
          onChange={(e) => send({ type: "RESIDENCY.SET", status: e.target.value })}
        >
          <option value="ROR">ROR — Resident</option>
          <option value="RNOR">RNOR — Resident, not ordinarily</option>
          <option value="NR">NR — Non-Resident</option>
        </select>
      </div>

      <div className="l1-debug-row">
        <label htmlFor="l1-regime">Tax regime (Step 1)</label>
        <select
          id="l1-regime"
          value={taxRegime}
          onChange={(e) => send({ type: "TAX_REGIME.SET", regime: e.target.value })}
        >
          <option value="NEW">New Regime</option>
          <option value="OLD">Old Regime</option>
        </select>
      </div>

      <label className="l1-debug-check">
        <input
          type="checkbox"
          checked={hasInternationalAssets}
          onChange={(e) => send({ type: "INTERNATIONAL.TOGGLE", checked: e.target.checked })}
        />
        Has foreign income / assets
      </label>

      {[
        ["salary", "Salary"],
        ["houseProperty", "House Property"],
        ["business", "Business & Trading"],
        ["capitalGains", "Capital Gains"],
        ["otherSources", "Other Sources"],
      ].map(([key, label]) => (
        <label className="l1-debug-check" key={key}>
          <input
            type="checkbox"
            checked={incomeHeads[key]}
            onChange={(e) => send({ type: "INCOME_HEAD.TOGGLE", head: key, checked: e.target.checked })}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

/* =============================================================================
 * PUBLIC COMPONENT — the left side panel, and nothing else.
 * ========================================================================== */
export default function CompliancePanel({
  title = "Compliance Steps",
  footer = { label: "Recommended ITR Form", value: "ITR-2" },
  debugControls = true, // set to false when embedding in the real wizard
  onStepChange,
}) {
  const [state, send] = useMachine(complianceSidebarMachine);
  const phases = selectSidebarView(state.context);

  const handleSelectStep = (stepId) => {
    send({ type: "STEP.SELECT", stepId });
    onStepChange?.(stepId);
  };

  const handleTogglePhase = (phaseId) => {
    send({ type: "PHASE.TOGGLE", phaseId });
  };

  return (
    <>
      <style>{PANEL_CSS}</style>
      <aside className="l1-panel">
        <div className="l1-panel-title">{title}</div>
        <nav>
          {phases.map((phase) => (
            <PhaseGroup key={phase.id} phase={phase} onTogglePhase={handleTogglePhase} onSelectStep={handleSelectStep} />
          ))}
        </nav>
        {footer && (
          <div className="l1-footer-card">
            <div className="l1-footer-label">{footer.label}</div>
            <div className="l1-footer-value">{footer.value}</div>
          </div>
        )}
        {debugControls && <DebugControls context={state.context} send={send} />}
      </aside>
    </>
  );
}
