import React from "react";
import { useSelector } from "@xstate/react";
import { Lock, Check } from "lucide-react";
import {
  selectSidebarView,
  SidebarStepView,
  SidebarPhaseView,
} from "@/machines/complianceSidebarMachine";
import { ActorRef } from "xstate";

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

@media (prefers-reduced-motion: reduce) {
  .l1-phase-content, .l1-chevron, .l1-step-btn, .l1-panel { transition: none !important; animation: none !important; }
}
`;

interface StatusBadgeProps {
  step: SidebarStepView;
}

function StatusBadge({ step }: StatusBadgeProps) {
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

interface StepButtonProps {
  step: SidebarStepView;
  onSelect: (stepId: string) => void;
}

function StepButton({ step, onSelect }: StepButtonProps) {
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

interface PhaseGroupProps {
  phase: SidebarPhaseView;
  onTogglePhase: (phaseId: string) => void;
  onSelectStep: (stepId: string) => void;
}

function PhaseGroup({ phase, onTogglePhase, onSelectStep }: PhaseGroupProps) {
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

interface CompliancePanelProps {
  title?: string;
  footer?: { label: string; value: string } | null;
  onStepChange?: (stepId: string) => void;
  actorRef: ActorRef<any, any>;
}

export default function CompliancePanel({
  title = "Compliance Steps",
  footer = { label: "Recommended ITR Form", value: "ITR-2" },
  onStepChange,
  actorRef,
}: CompliancePanelProps) {
  const context = useSelector(actorRef, (s) => s.context);
  const send = actorRef.send;
  const phases = selectSidebarView(context);

  React.useEffect(() => {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: 'CompliancePanel',
        entityType: context.entityType,
        incomeHeads: context.incomeHeads,
        phases: phases.map(p => ({
          title: p.title,
          steps: p.steps.map(s => ({ id: s.id, label: s.label, locked: s.locked, active: s.active }))
        }))
      })
    }).catch(() => {});
  }, [context, phases]);

  const handleSelectStep = (stepId: string) => {
    send({ type: "STEP.SELECT", stepId });
    onStepChange?.(stepId);
  };

  const handleTogglePhase = (phaseId: string) => {
    send({ type: "PHASE.TOGGLE", phaseId });
  };

  return (
    <>
      <style>{PANEL_CSS}</style>
      <aside className="l1-panel">
        <div className="l1-panel-title">{title}</div>
        <nav>
          {phases.map((phase) => (
            <PhaseGroup
              key={phase.id}
              phase={phase}
              onTogglePhase={handleTogglePhase}
              onSelectStep={handleSelectStep}
            />
          ))}
        </nav>
        {footer && (
          <div className="l1-footer-card">
            <div className="l1-footer-label">{footer.label}</div>
            <div className="l1-footer-value">{footer.value}</div>
          </div>
        )}
      </aside>
    </>
  );
}
