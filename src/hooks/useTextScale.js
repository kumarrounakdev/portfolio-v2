import { useCallback, useEffect } from 'react';
import { usePersistentState } from './usePersistentState.js';

const STORAGE_KEY = 'portfolio.text-scale';
const TEXT_SCALES = [0.92, 0.96, 1, 1.06, 1.12, 1.2];

/**
 * View ▸ Zoom. Every font size in this app is defined in rem, so scaling the
 * root font size scales text only — paddings, window geometry and icon sizes
 * keep their px values, which avoids the "everything is huge" failure mode.
 */
export function useTextScale() {
  const [index, setIndex] = usePersistentState(STORAGE_KEY, 2);
  const safeIndex = Math.min(Math.max(index ?? 2, 0), TEXT_SCALES.length - 1);

  useEffect(() => {
    const factor = TEXT_SCALES[safeIndex];
    document.documentElement.style.fontSize = factor === 1 ? '' : `${(16 * factor).toFixed(2)}px`;
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [safeIndex]);

  const increase = useCallback(
    () => setIndex((current) => Math.min((current ?? 2) + 1, TEXT_SCALES.length - 1)),
    [setIndex],
  );
  const decrease = useCallback(() => setIndex((current) => Math.max((current ?? 2) - 1, 0)), [setIndex]);
  const reset = useCallback(() => setIndex(2), [setIndex]);

  return {
    index: safeIndex,
    percent: Math.round(TEXT_SCALES[safeIndex] * 100),
    canIncrease: safeIndex < TEXT_SCALES.length - 1,
    canDecrease: safeIndex > 0,
    increase,
    decrease,
    reset,
  };
}

export default useTextScale;
