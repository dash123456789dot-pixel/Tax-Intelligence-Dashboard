'use client';
import { useRef } from 'react';
import { CSSTransition } from 'react-transition-group';

interface QuestionSlideProps {
  id: string;
  isActive: boolean;
  children: React.ReactNode;
}

export default function QuestionSlide({ id, isActive, children }: QuestionSlideProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <CSSTransition
      in={isActive}
      nodeRef={nodeRef}
      timeout={600}
      classNames="question-slide"
      unmountOnExit
    >
      <div ref={nodeRef} className="w-full flex flex-col justify-center">
        {children}
      </div>
    </CSSTransition>
  );
}
