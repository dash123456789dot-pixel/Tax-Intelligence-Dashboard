'use client';

import React from 'react';
import CompliancePanel from './CompliancePanel';
import { useLayer1 } from '@/hooks/Layer1Context';

export function Sidebar() {
  const { sidebarActor } = useLayer1();

  const handleStepChange = (stepId: string) => {
    try {
      sidebarActor.send({ type: 'STEP.SELECT', stepId });
    } catch (e) {
      console.warn('Global switchStep failed or was guarded:', e);
    }
  };

  return (
    <CompliancePanel actorRef={sidebarActor} onStepChange={handleStepChange} />
  );
}
