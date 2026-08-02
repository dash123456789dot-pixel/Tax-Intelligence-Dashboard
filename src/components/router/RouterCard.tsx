'use client';
import { useRef } from 'react';
import { SwitchTransition, CSSTransition } from 'react-transition-group';
import { useRouterMachine } from '@/hooks/useRouterMachine';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { ROUTER_QUESTIONS } from '@/lib/routerSchema';

import RouterProgress from './RouterProgress';
import RouterFooter from './RouterFooter';
import QuestionSlide from './QuestionSlide';
import BoolQuestion from './questions/BoolQuestion';
import TextQuestion from './questions/TextQuestion';
import DateQuestion from './questions/DateQuestion';
import NumberQuestion from './questions/NumberQuestion';
import { SelectQuestion } from './questions/SelectQuestion';
import ResultScreen from './result/ResultScreen';

// Custom Slides
import JurisdictionSlide from './questions/JurisdictionSlide';
import UsEntitySlide from './questions/UsEntitySlide';
import IndiaEntitySlide from './questions/IndiaEntitySlide';
import PersonalTaxIdsSlide from './questions/PersonalTaxIdsSlide';
import UsBusinessDemographicsSlide from './questions/UsBusinessDemographicsSlide';
import UsBusinessTaxIdsSlide from './questions/UsBusinessTaxIdsSlide';
import IndiaBusinessDemographicsSlide from './questions/IndiaBusinessDemographicsSlide';
import IndiaBusinessTaxIdsSlide from './questions/IndiaBusinessTaxIdsSlide';

export default function RouterCard({ machine }: { machine: ReturnType<typeof useRouterMachine> }) {
  const { ctx, currentQuestionId, isComplete, progressPct, setBool, setInt, setText, setDate, advance, back, reset } = machine;
  
  const currentDef = currentQuestionId ? ROUTER_QUESTIONS[currentQuestionId] : null;
  const nodeRef = useRef<HTMLDivElement>(null);
  
  useKeyboardNav({
    currentQuestionType: currentDef?.type ?? null,
    onYes: () => {
      if (currentQuestionId && currentDef?.type === 'bool') {
        setBool(currentQuestionId as any, true);
        setTimeout(() => advance(), 150);
      }
    },
    onNo: () => {
      if (currentQuestionId && currentDef?.type === 'bool') {
        setBool(currentQuestionId as any, false);
        setTimeout(() => advance(), 150);
      }
    },
    onAdvance: () => {
      if (!isComplete) advance();
    },
    onBack: () => {
      if (!isComplete) back();
    }
  });

  return (
    <div id="questionnaire-card" className="w-full max-w-3xl flex flex-col justify-between glass-card p-6 lg:p-12 relative overflow-hidden min-h-[460px] lg:min-h-[520px] transition-all duration-500 border border-white/5">
      {!isComplete && (
        <RouterProgress 
          progressPct={progressPct} 
          currentIdx={ctx.currentQuestionIndex} 
          total={ctx.activeQuestions.length} 
          onReset={reset}
        />
      )}

      <div id="questions-viewport" className="flex-grow relative min-h-[280px]">
        <SwitchTransition mode="out-in">
          <CSSTransition
            key={isComplete ? 'result' : currentQuestionId}
            nodeRef={nodeRef}
            classNames="question-slide"
            timeout={600}
            unmountOnExit
          >
            <div ref={nodeRef} className="w-full h-full flex flex-col justify-center">
              {isComplete ? (
                <ResultScreen machine={machine} />
              ) : currentDef ? (
                <div className="w-full">
                  <div className="flex flex-col justify-start text-left mb-10">
                    <span className={`font-bold text-xs uppercase tracking-widest mb-3 block ${
                      currentDef.labelColor === 'brandCyan' ? 'text-brandCyan' : 
                      currentDef.labelColor === 'brandGold' ? 'text-brandGold' : 
                      'text-white/40'
                    }`}>
                      {currentDef.questionLabel || `Question ${(ctx.currentQuestionIndex + 1).toString().padStart(2, '0')}`}
                    </span>
                    <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight font-display">
                      {currentDef.heading}
                    </h2>
                  </div>
                  
                  {currentDef.footnote && (
                    <p className="text-sm font-medium text-white/60 mb-4 leading-relaxed max-w-xl">
                      {currentDef.footnote}
                    </p>
                  )}
                  
                  {currentDef.type === 'bool' && (
                    <BoolQuestion 
                      def={currentDef} 
                      value={ctx[currentQuestionId as keyof typeof ctx] as boolean | null} 
                      onChange={(val) => {
                        setBool(currentQuestionId as any, val);
                        setTimeout(() => advance(), 150);
                      }} 
                    />
                  )}
                  {currentDef.type === 'text' && (
                    <TextQuestion 
                      def={currentDef} 
                      value={ctx[currentQuestionId as keyof typeof ctx] as string | null} 
                      onChange={(val) => setText(currentQuestionId as any, val)} 
                      onAdvance={advance}
                    />
                  )}
                  {currentDef.type === 'date' && (
                    <DateQuestion 
                      def={currentDef} 
                      value={ctx[currentQuestionId as keyof typeof ctx] as string | null} 
                      onChange={(val) => setDate(currentQuestionId as any, val)} 
                      onAdvance={advance}
                    />
                  )}
                  {currentDef.type === 'number' && (
                    <NumberQuestion 
                      def={currentDef} 
                      value={ctx[currentQuestionId as keyof typeof ctx] as number | null} 
                      onChange={(val) => setInt(currentQuestionId as any, val)} 
                      onAdvance={advance}
                    />
                  )}
                  {currentDef.type === 'select' && (
                    <SelectQuestion
                      question={currentDef}
                      value={ctx[currentQuestionId as keyof typeof ctx] as string | null}
                      onChange={(val) => setText(currentQuestionId as any, val)}
                      onContinue={advance}
                    />
                  )}
                  {currentDef.type === 'custom' && (
                    <>
                      {currentQuestionId === 'primary_jurisdiction' && (
                        <JurisdictionSlide 
                          def={currentDef}
                          value={ctx.primary_jurisdiction}
                          onChange={(val) => setText('primary_jurisdiction', val)}
                          onAdvance={advance}
                        />
                      )}
                      {currentQuestionId === 'us_entity_type' && (
                        <UsEntitySlide 
                          def={currentDef}
                          value={ctx.us_entity_type}
                          onChange={(val) => setText('us_entity_type', val)}
                          onAdvance={advance}
                        />
                      )}
                      {currentQuestionId === 'india_entity_type' && (
                        <IndiaEntitySlide 
                          def={currentDef}
                          value={ctx.india_entity_type}
                          onChange={(val) => setText('india_entity_type', val)}
                          onAdvance={advance}
                        />
                      )}
                      {currentQuestionId === 'personal_tax_ids' && (
                        <PersonalTaxIdsSlide machine={machine} onAdvance={advance} />
                      )}
                      {currentQuestionId === 'us_business_demographics' && (
                        <UsBusinessDemographicsSlide machine={machine} onAdvance={advance} />
                      )}
                      {currentQuestionId === 'us_business_tax_ids' && (
                        <UsBusinessTaxIdsSlide machine={machine} onAdvance={advance} />
                      )}
                      {currentQuestionId === 'india_business_demographics' && (
                        <IndiaBusinessDemographicsSlide machine={machine} onAdvance={advance} />
                      )}
                      {currentQuestionId === 'india_business_tax_ids' && (
                        <IndiaBusinessTaxIdsSlide machine={machine} onAdvance={advance} />
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </CSSTransition>
        </SwitchTransition>
      </div>

      {!isComplete && (
        <RouterFooter 
          isFirst={ctx.currentQuestionIndex === 0} 
          onBack={back} 
          onSkip={advance} 
        />
      )}
    </div>
  );
}
