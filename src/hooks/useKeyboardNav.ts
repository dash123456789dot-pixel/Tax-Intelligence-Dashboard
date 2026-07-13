import { useEffect } from 'react';

interface KeyboardNavProps {
  currentQuestionType: 'bool' | 'text' | 'number' | 'date' | 'select' | null;
  onYes?: () => void;
  onNo?: () => void;
  onAdvance: () => void;
  onBack: () => void;
};

export function useKeyboardNav({
  currentQuestionType,
  onYes,
  onNo,
  onAdvance,
  onBack,
}: KeyboardNavProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with inputs (unless Enter is pressed)
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        if (e.key === 'Enter') {
          e.preventDefault();
          onAdvance();
        }
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        onBack();
      } else if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        onAdvance();
      } else if (currentQuestionType === 'bool') {
        if (e.key.toLowerCase() === 'y' || e.key === '1') {
          e.preventDefault();
          if (onYes) onYes();
        } else if (e.key.toLowerCase() === 'n' || e.key === '2') {
          e.preventDefault();
          if (onNo) onNo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionType, onYes, onNo, onAdvance, onBack]);
}
