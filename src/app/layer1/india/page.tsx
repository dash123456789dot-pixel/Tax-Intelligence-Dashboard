'use client';

import React, { useState } from 'react';
import { Layer1IndiaProvider, useLayer1 } from '@/hooks/Layer1Context';
import { Layer1Shell } from '@/components/layer1india/Layer1Shell';
import FinancialSnapshotStep from '@/components/layer1india/FinancialSnapshotStep';
import ResidencySolverStep from '@/components/layer1india/ResidencySolverStep';
import SalaryStep from '@/components/layer1india/SalaryStep';
import HousePropertyStep from '@/components/layer1india/HousePropertyStep';
import BusinessStep from '@/components/layer1india/BusinessStep';
import CapitalGainsStep from '@/components/layer1india/CapitalGainsStep';
import OtherSourcesStep from '@/components/layer1india/OtherSourcesStep';
import DtaaStep from '@/components/layer1india/DtaaStep';
import ForeignAssetsStep from '@/components/layer1india/ForeignAssetsStep';
import ComplianceStep from '@/components/layer1india/ComplianceStep';
import BankAccountsStep from '@/components/layer1india/BankAccountsStep';
import DeductionsStep from '@/components/layer1india/DeductionsStep';
import LossesAndCreditsStep from '@/components/layer1india/LossesAndCreditsStep';
import FinalTaxStep from '@/components/layer1india/FinalTaxStep';
import { useSelector } from '@xstate/react';
import { STEP_DEFINITIONS, isStepVisible } from '@/machines/complianceSidebarMachine';

function MainContent() {
  const { ctx, sidebarActor, quarterActor } = useLayer1();
  const activeStep = useSelector(sidebarActor, (s: any) => s.context.activeStepId);
  const activeQuarter = useSelector(quarterActor, (s: any) => s.context.activeQuarter);
  const currentQuarterData = useSelector(quarterActor, (s: any) => s.context.quarters[activeQuarter]) || {};

  const taxRegime = useSelector(sidebarActor, (s: any) => s.context.taxRegime);
  const entityType = useSelector(sidebarActor, (s: any) => s.context.entityType);
  const residencyStatus = useSelector(sidebarActor, (s: any) => s.context.residencyStatus);
  const hasCapitalGains = useSelector(sidebarActor, (s: any) => s.context.incomeHeads.capitalGains);

  // Derived contexts from quarter store
  const residencyContext = currentQuarterData.residency || null;
  const salaryContext = currentQuarterData.salary || null;

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

  const handleContinueFromResidency = (resCtx: any) => {
    quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'residency', data: resCtx });
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

  const handleContinueFromSalary = (salCtx: any) => {
    quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'salary', data: salCtx });
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

  const handleBackFromBusiness = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-business');
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleContinueFromBusiness = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-business');
    for (let i = currentIndex + 1; i < STEP_DEFINITIONS.length; i++) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleBackFromCG = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-cg');
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleContinueFromCG = (cgCtx: any) => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-cg');
    for (let i = currentIndex + 1; i < STEP_DEFINITIONS.length; i++) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };


  const handleBackFromOS = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-os');
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleContinueFromOS = (osCtx: any) => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-os');
    for (let i = currentIndex + 1; i < STEP_DEFINITIONS.length; i++) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };


  const handleBackFromDtaa = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-dtaa');
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleContinueFromDtaa = (dtaaCtx: any) => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-dtaa');
    for (let i = currentIndex + 1; i < STEP_DEFINITIONS.length; i++) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleBackFromForeignAssets = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-fa');
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleContinueFromForeignAssets = (faCtx: any) => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-fa');
    for (let i = currentIndex + 1; i < STEP_DEFINITIONS.length; i++) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleBackFromCompliance = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-compliance');
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleContinueFromCompliance = (compCtx: any) => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-compliance');
    for (let i = currentIndex + 1; i < STEP_DEFINITIONS.length; i++) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleBackFromBank = (targetStepId: string) => {
    sidebarActor.send({ type: 'STEP.SELECT', stepId: targetStepId });
  };

  const handleContinueFromBank = (bankCtx: any, targetStepId: string) => {
    sidebarActor.send({ type: 'STEP.SELECT', stepId: targetStepId });
  };

  const handleBackFromDeductions = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-deductions');
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleContinueFromDeductions = (dedCtx: any) => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-deductions');
    for (let i = currentIndex + 1; i < STEP_DEFINITIONS.length; i++) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleBackFromCredits = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-credits');
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleContinueFromCredits = (creditsCtx: any) => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-credits');
    for (let i = currentIndex + 1; i < STEP_DEFINITIONS.length; i++) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleBackFromOutput = () => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === 'step-output');
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const handleContinueFromOutput = () => {
    // Navigate back to dashboard root (Wealth Dashboard)
    window.location.href = '/';
  };

  let age = null;
  if (ctx.profile?.date_of_birth) {
    const dob = new Date(ctx.profile.date_of_birth);
    const diff = Date.now() - dob.getTime();
    const age_dt = new Date(diff); 
    age = Math.abs(age_dt.getUTCFullYear() - 1970);
  }

  return (
    <Layer1Shell>
      <div id="step-forms-container" className="h-full w-full">
        {activeStep === 'step-snapshot' && (
          <FinancialSnapshotStep
            key={`${activeQuarter}-snapshot`}
            sidebarActorRef={sidebarActor}
            onNext={handleNextFromSnapshot}
          />
        )}
        {activeStep === 'step-profile' && (
          <ResidencySolverStep
            key={`${activeQuarter}-profile`}
            sidebarActorRef={sidebarActor}
            initialContext={{
              entity_type: ctx.profile.entity_type,
              ...residencyContext?.residency_detail
            }}
            onBack={handleBackFromResidency}
            onContinue={handleContinueFromResidency}
          />
        )}
        {activeStep === 'step-salary' && (
          <SalaryStep
            key={`${activeQuarter}-salary`}
            taxRegime={taxRegime}
            onBack={handleBackFromSalary}
            onContinue={handleContinueFromSalary}
          />
        )}
        {activeStep === 'step-hp' && (
          <HousePropertyStep
            key={`${activeQuarter}-hp`}
            taxRegime={taxRegime}
            entityType={entityType}
            onBack={() => handleBackFromHP('step-salary')}
            onContinue={handleContinueFromHP}
          />
        )}
        {activeStep === 'step-business' && (
          <BusinessStep
            key={`${activeQuarter}-business`}
            taxRegime={taxRegime}
            entityType={entityType}
            isIndianCompany={residencyContext?.residency_detail?.is_indian_company ?? null}
            residencyStatus={residencyStatus}
            onBack={handleBackFromBusiness}
            onContinue={handleContinueFromBusiness}
          />
        )}
        {activeStep === 'step-cg' && (
          <CapitalGainsStep
            key={`${activeQuarter}-cg`}
            taxRegime={taxRegime}
            entityType={entityType}
            residencyStatus={residencyStatus}
            hasCapitalGains={hasCapitalGains}
            onBack={handleBackFromCG}
            onContinue={handleContinueFromCG}
          />
        )}
        {activeStep === 'step-os' && (
          <OtherSourcesStep
            key={`${activeQuarter}-os`}
            onBack={handleBackFromOS}
            onContinue={handleContinueFromOS}
          />
        )}
        {activeStep === 'step-dtaa' && (
          <DtaaStep
            key={`${activeQuarter}-dtaa`}
            initialContext={{
              residency_status: residencyStatus,
              entity_type: entityType,
            }}
            onBack={handleBackFromDtaa}
            onContinue={handleContinueFromDtaa}
          />
        )}
        {activeStep === 'step-fa' && (
          <ForeignAssetsStep
            key={`${activeQuarter}-fa`}
            initialContext={{
              residency_status: residencyStatus,
              entity_type: entityType,
              setup_international: sidebarActor.getSnapshot().context.hasInternationalAssets,
            }}
            onBack={handleBackFromForeignAssets}
            onContinue={handleContinueFromForeignAssets}
          />
        )}
        {activeStep === 'step-compliance' && (
          <ComplianceStep
            key={`${activeQuarter}-compliance`}
            initialContext={{
              residency_status: residencyStatus,
              entity_type: entityType,
            }}
            onBack={handleBackFromCompliance}
            onContinue={handleContinueFromCompliance}
          />
        )}
        {activeStep === 'step-bank' && (
          <BankAccountsStep
            key={`${activeQuarter}-bank`}
            onBack={handleBackFromBank}
            onContinue={handleContinueFromBank}
          />
        )}
        {activeStep === 'step-deductions' && (
          <DeductionsStep
            key={`${activeQuarter}-deductions`}
            initialContext={{
              tax_regime: taxRegime,
              entity_type: entityType,
              date_of_birth: ctx.profile?.date_of_birth ?? null,
              final_india_residency_status: residencyStatus,
              is_indian_company: residencyContext?.residency_detail?.is_indian_company ?? null,
              has_salary_income: salaryContext?.salary?.has_salary_income ?? false,
              hra_received_inr: salaryContext?.salary?.hra_received_inr ?? null,
            }}
            onBack={handleBackFromDeductions}
            onContinue={handleContinueFromDeductions}
          />
        )}
        {activeStep === 'step-credits' && (
          <LossesAndCreditsStep
            key={`${activeQuarter}-credits`}
            initialContext={{
              tax_regime: taxRegime,
              entity_type: entityType,
              residency_status: residencyStatus,
              age: age,
              has_business_income: sidebarActor.getSnapshot().context.incomeHeads.business,
            }}
            onBack={handleBackFromCredits}
            onContinue={handleContinueFromCredits}
          />
        )}
        {activeStep === 'step-output' && (
          <FinalTaxStep
            key={`${activeQuarter}-output`}
            initialContext={{
              tax_regime: taxRegime,
              residency_status: residencyStatus,
              residency_path: residencyContext?.residency_detail?.path || 'Standard',
              pan: ctx.profile?.pan || null,
              gross_salary_inr: salaryContext?.salary?.gross_salary_inr || 0,
              business_income_inr: 0,
              other_income_inr: 0,
              taxes_paid_inr: 0,
              raw_json_payload: { ...ctx, ...sidebarActor.getSnapshot().context }
            }}
            onBack={handleBackFromOutput}
            onContinue={handleContinueFromOutput}
          />
        )}
        {activeStep !== 'step-snapshot' && activeStep !== 'step-profile' && activeStep !== 'step-salary' && activeStep !== 'step-hp' && activeStep !== 'step-business' && activeStep !== 'step-cg' && activeStep !== 'step-os' && activeStep !== 'step-dtaa' && activeStep !== 'step-fa' && activeStep !== 'step-compliance' && activeStep !== 'step-bank' && activeStep !== 'step-deductions' && activeStep !== 'step-credits' && activeStep !== 'step-output' && (
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
