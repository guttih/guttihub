import { useEffect, useState, useRef } from "react";

/**
 * A debounced state hook that delays updating the returned value
 * until after the specified delay has passed since the last change.
 * Safely handles unmounted components to avoid React warnings.
 */
export function useDebouncedState<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const timer = setTimeout(() => {
      if (isMounted.current) {
        setDebouncedValue(value);
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      isMounted.current = false;
    };
  }, [value, delay]);

  return debouncedValue;
}
