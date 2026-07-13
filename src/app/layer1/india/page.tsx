'use client';

import React from 'react';
import { Layer1IndiaProvider, useLayer1 } from '@/hooks/Layer1Context';
import { Layer1Shell } from '@/components/layer1india/Layer1Shell';
import FinancialSnapshotStep from '@/components/layer1india/FinancialSnapshotStep';
import ResidencySolverStep from '@/components/layer1india/ResidencySolverStep';
import SalaryStep from '@/components/layer1india/SalaryStep';
import HousePropertyStep from '@/components/layer1india/HousePropertyStep';
import { useSelector } from '@xstate/react';
import { STEP_DEFINITIONS, isStepVisible } from '@/machines/complianceSidebarMachine';

function MainContent() {
  const { sidebarActor } = useLayer1();
  const activeStep = useSelector(sidebarActor, (s: any) => s.context.activeStepId);
  const taxRegime = useSelector(sidebarActor, (s: any) => s.context.taxRegime);
  const entityType = useSelector(sidebarActor, (s: any) => s.context.entityType);

  const handleNextFromSnapshot = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-snapshot');
    for (let i = currentIndex + 1; i < STEP_DEFINITIONS.length; i++) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleBackFromResidency = () => {
    sidebarActor.send({ type: 'STEP.SELECT', stepId: 'step-snapshot' });
  };

  const handleContinueFromResidency = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-profile');
    for (let i = currentIndex + 1; i < STEP_DEFINITIONS.length; i++) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleBackFromSalary = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-salary');
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleContinueFromSalary = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-salary');
    for (let i = currentIndex + 1; i < STEP_DEFINITIONS.length; i++) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleBackFromHP = (targetStepId: string) => {
    sidebarActor.send({ type: 'STEP.SELECT', stepId: targetStepId });
  };

  const handleContinueFromHP = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-hp');
    for (let i = currentIndex + 1; i < STEP_DEFINITIONS.length; i++) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  return (
    <Layer1Shell>
      <div id="step-forms-container" className="h-full w-full">
        <div style={{ display: activeStep === 'step-snapshot' ? 'block' : 'none' }}>
          <FinancialSnapshotStep sidebarActorRef={sidebarActor} onNext={handleNextFromSnapshot} />
        </div>
        <div style={{ display: activeStep === 'step-profile' ? 'block' : 'none' }}>
          <ResidencySolverStep
            sidebarActorRef={sidebarActor}
            onBack={handleBackFromResidency}
            onContinue={handleContinueFromResidency}
          />
        </div>
        <div style={{ display: activeStep === 'step-salary' ? 'block' : 'none' }}>
          <SalaryStep
            taxRegime={taxRegime}
            onBack={handleBackFromSalary}
            onContinue={handleContinueFromSalary}
          />
        </div>
        <div style={{ display: activeStep === 'step-hp' ? 'block' : 'none' }}>
          <HousePropertyStep
            taxRegime={taxRegime}
            entityType={entityType}
            onBack={handleBackFromHP}
            onContinue={handleContinueFromHP}
          />
        </div>
        {activeStep !== 'step-snapshot' && activeStep !== 'step-profile' && activeStep !== 'step-salary' && activeStep !== 'step-hp' && (
          <div className="flex items-center justify-center min-h-[300px] text-white/40 bg-white/5 border border-white/5 rounded-2xl font-mono text-xs uppercase tracking-widest">
            Step Form for {activeStep} will reside here
          </div>
        )}
      </div>
    </Layer1Shell>
  );
}

export default function Layer1IndiaPage() {
  return (
    <Layer1IndiaProvider>
      <MainContent />
    </Layer1IndiaProvider>
  );
}
