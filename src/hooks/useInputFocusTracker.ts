// src/hooks/useInputFocusTracker.ts
import { useRef, useState } from "react";

export function useInputFocusTracker() {
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const inputSelectionRef = useRef<Record<string, { start: number; end: number }>>({});

  function trackInput(name: string, selectionStart: number | null, selectionEnd: number | null) {
    if (name) {
      inputSelectionRef.current[name] = {
        start: selectionStart ?? 0,
        end: selectionEnd ?? 0,
      };
    }
  }

  function attachToInput<T extends HTMLInputElement>(name: string, ref?: React.RefObject<T>) {
    const el = ref?.current ?? document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (!el || el.disabled || document.activeElement === el) return;
  
    const sel = inputSelectionRef.current[name];
    if (sel) {
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(sel.start, sel.end);
      });
    }
  }
  

  return {
    focusedInput,
    setFocusedInput,
    trackInput,
    restoreFocus: attachToInput,
  };
}
