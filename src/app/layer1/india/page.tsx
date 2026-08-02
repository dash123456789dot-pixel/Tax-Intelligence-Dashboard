'use client';

import React, { useState, useMemo } from 'react';
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
import { SaveAndNextPopup } from '@/components/layer1india/SaveAndNextPopup';
import { useSelector } from '@xstate/react';
import { STEP_DEFINITIONS, isStepVisible } from '@/machines/complianceSidebarMachine';

function MainContent() {
  const { ctx, sidebarActor, quarterActor, submitStep, submitFinal } = useLayer1();
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

  // Popup state
  const [pendingSubmission, setPendingSubmission] = useState<{ stepId: string, data: any, executeNext: () => void } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoize all autoSave handlers to prevent infinite render loops in steps
  const autoSaveHandlers = useMemo(() => ({
    residency: (data: any) => quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'residency', data }),
    salary: (data: any) => quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'salary', data }),
    hp: (data: any) => quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'hp', data }),
    business: (data: any) => quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'business', data }),
    cg: (data: any) => quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'cg', data }),
    os: (data: any) => quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'os', data }),
    dtaa: (data: any) => quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'dtaa', data }),
    fa: (data: any) => quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'fa', data }),
    compliance: (data: any) => quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'compliance', data }),
    bank: (data: any) => quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'bank', data }),
    deductions: (data: any) => quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'deductions', data }),
    credits: (data: any) => quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'credits', data }),
  }), [quarterActor, activeQuarter]);

  const executeNextStep = (currentStepId: string) => {
    const sidebarContext = sidebarActor.getSnapshot().context;
    const currentIndex = STEP_DEFINITIONS.findIndex((s) => s.id === currentStepId);
    for (let i = currentIndex + 1; i < STEP_DEFINITIONS.length; i++) {
      if (isStepVisible(sidebarContext, STEP_DEFINITIONS[i].id)) {
        sidebarActor.send({ type: 'STEP.SELECT', stepId: STEP_DEFINITIONS[i].id });
        return;
      }
    }
  };

  const triggerSaveAndNext = (dbStepId: string, data: any, currentStepId: string, customNext?: () => void) => {
    // Fallback to quarter store if no data passed
    const finalData = data || quarterActor.getSnapshot().context.quarters[activeQuarter]?.[dbStepId] || {};
    setPendingSubmission({
      stepId: dbStepId,
      data: finalData,
      executeNext: customNext || (() => executeNextStep(currentStepId))
    });
  };

  const handlePopupConfirm = async () => {
    if (!pendingSubmission) return;
    setIsSubmitting(true);
    try {
      // Data is only saved to sessionStorage on step transition per requirements
      pendingSubmission.executeNext();
      setPendingSubmission(null);
    } catch (e) {
      alert("Failed to proceed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextFromSnapshot = () => {
    executeNextStep('step-snapshot');
  };

  const handleBackFromResidency = () => {
    sidebarActor.send({ type: 'STEP.SELECT', stepId: 'step-snapshot' });
  };

  const handleContinueFromResidency = (resCtx: any) => {
    quarterActor.send({ type: 'QUARTER.UPDATE_DATA', quarter: activeQuarter, stepId: 'residency', data: resCtx });
    triggerSaveAndNext('residency', resCtx, 'step-profile');
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
    triggerSaveAndNext('salary', salCtx, 'step-salary');
  };

  const handleBackFromHP = (targetStepId: string) => {
    sidebarActor.send({ type: 'STEP.SELECT', stepId: targetStepId });
  };

  const handleContinueFromHP = () => {
    triggerSaveAndNext('hp', null, 'step-hp');
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
    triggerSaveAndNext('business', null, 'step-business');
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
    triggerSaveAndNext('cg', cgCtx, 'step-cg');
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
    triggerSaveAndNext('os', osCtx, 'step-os');
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
    triggerSaveAndNext('dtaa', dtaaCtx, 'step-dtaa');
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
    triggerSaveAndNext('fa', faCtx, 'step-fa');
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
    triggerSaveAndNext('compliance', compCtx, 'step-compliance');
  };

  const handleBackFromBank = (targetStepId: string) => {
    sidebarActor.send({ type: 'STEP.SELECT', stepId: targetStepId });
  };

  const handleContinueFromBank = (bankCtx: any, targetStepId: string) => {
    triggerSaveAndNext('bank', bankCtx, 'step-bank', () => {
      sidebarActor.send({ type: 'STEP.SELECT', stepId: targetStepId });
    });
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
    triggerSaveAndNext('deductions', dedCtx, 'step-deductions');
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
    triggerSaveAndNext('credits', creditsCtx, 'step-credits');
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

  const handleContinueFromOutput = async () => {
    try {
      setIsSubmitting(true);
      const allData = { 
        sidebar: sidebarActor.getSnapshot().context, 
        quarters: quarterActor.getSnapshot().context.quarters 
      };
      if (submitFinal) {
        await submitFinal(allData);
      }
      
      // Determine next route based on router jurisdiction
      let nextRoute = '/';
      try {
        const uId = sessionStorage.getItem("userId") || "admin-01";
        const sessionKey = `wising_router_state_${uId}`;
        const routerPayload = sessionStorage.getItem(sessionKey);
        if (routerPayload) {
          const parsed = JSON.parse(routerPayload);
          if (parsed.jurisdiction === 'dual' || parsed.jurisdiction === 'us_only') {
            nextRoute = '/layer1/us';
          }
        }
      } catch (err) {
        console.error("Failed to parse router jurisdiction", err);
      }
      
      window.location.href = nextRoute;
    } catch (e) {
      alert("Failed to submit final data. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
            onAutoSave={autoSaveHandlers.residency}
          />
        )}
        {activeStep === 'step-salary' && (
          <SalaryStep
            key={`${activeQuarter}-salary`}
            taxRegime={taxRegime}
            onBack={handleBackFromSalary}
            onContinue={handleContinueFromSalary}
            initialContext={salaryContext}
            onAutoSave={autoSaveHandlers.salary}
          />
        )}
        {activeStep === 'step-hp' && (
          <HousePropertyStep
            key={`${activeQuarter}-hp`}
            taxRegime={taxRegime}
            entityType={entityType}
            onBack={() => handleBackFromHP('step-salary')}
            onContinue={handleContinueFromHP}
            initialContext={currentQuarterData.hp || null}
            onAutoSave={autoSaveHandlers.hp}
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
            initialContext={currentQuarterData.business || null}
            onAutoSave={autoSaveHandlers.business}
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
            initialContext={currentQuarterData.cg || null}
            onAutoSave={autoSaveHandlers.cg}
          />
        )}
        {activeStep === 'step-os' && (
          <OtherSourcesStep
            key={`${activeQuarter}-os`}
            onBack={handleBackFromOS}
            onContinue={handleContinueFromOS}
            initialContext={currentQuarterData.os || null}
            onAutoSave={autoSaveHandlers.os}
          />
        )}
        {activeStep === 'step-dtaa' && (
          <DtaaStep
            key={`${activeQuarter}-dtaa`}
            initialContext={{
              residency_status: residencyStatus,
              entity_type: entityType,
              ...currentQuarterData.dtaa
            }}
            onBack={handleBackFromDtaa}
            onContinue={handleContinueFromDtaa}
            onAutoSave={autoSaveHandlers.dtaa}
          />
        )}
        {activeStep === 'step-fa' && (
          <ForeignAssetsStep
            key={`${activeQuarter}-fa`}
            initialContext={{
              residency_status: residencyStatus,
              entity_type: entityType,
              setup_international: sidebarActor.getSnapshot().context.hasInternationalAssets,
              ...currentQuarterData.fa
            }}
            onBack={handleBackFromForeignAssets}
            onContinue={handleContinueFromForeignAssets}
            onAutoSave={autoSaveHandlers.fa}
          />
        )}
        {activeStep === 'step-compliance' && (
          <ComplianceStep
            key={`${activeQuarter}-compliance`}
            initialContext={{
              residency_status: residencyStatus,
              entity_type: entityType,
              ...currentQuarterData.compliance
            }}
            onBack={handleBackFromCompliance}
            onContinue={handleContinueFromCompliance}
            onAutoSave={autoSaveHandlers.compliance}
          />
        )}
        {activeStep === 'step-bank' && (
          <BankAccountsStep
            key={`${activeQuarter}-bank`}
            onBack={handleBackFromBank}
            onContinue={handleContinueFromBank}
            initialContext={currentQuarterData.bank || null}
            onAutoSave={autoSaveHandlers.bank}
          />
        )}
        {activeStep === 'step-deductions' && (
          <DeductionsStep
            key={`${activeQuarter}-deductions`}
            initialContext={{
              tax_regime: taxRegime,
              entityType: entityType,
              date_of_birth: ctx.profile?.date_of_birth ?? null,
              final_india_residency_status: residencyStatus,
              is_indian_company: residencyContext?.residency_detail?.is_indian_company ?? null,
              has_salary_income: salaryContext?.salary?.has_salary_income ?? false,
              hra_received_inr: salaryContext?.salary?.hra_received_inr ?? null,
              ...currentQuarterData.deductions
            }}
            onBack={handleBackFromDeductions}
            onContinue={handleContinueFromDeductions}
            onAutoSave={autoSaveHandlers.deductions}
          />
        )}
        {activeStep === 'step-credits' && (
          <LossesAndCreditsStep
            key={`${activeQuarter}-credits`}
            initialContext={{
              tax_regime: taxRegime,
              entityType: entityType,
              residency_status: residencyStatus,
              age: age,
              has_business_income: sidebarActor.getSnapshot().context.incomeHeads.business,
              ...currentQuarterData.credits
            }}
            onBack={handleBackFromCredits}
            onContinue={handleContinueFromCredits}
            onAutoSave={autoSaveHandlers.credits}
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

      {pendingSubmission && (
        <SaveAndNextPopup
          onConfirm={handlePopupConfirm}
          onCancel={() => setPendingSubmission(null)}
          isSubmitting={isSubmitting}
        />
      )}
    </Layer1Shell>
  );
}

import ProtectedRoute from '@/components/ProtectedRoute';

export default function Layer1IndiaPage() {
  return (
    <ProtectedRoute>
      <Layer1IndiaProvider>
        <MainContent />
      </Layer1IndiaProvider>
    </ProtectedRoute>
  );
}
