import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchContributions } from '../utils/contributions.js';

/**
 * The contribution graph's state machine, shared by the desktop window and the
 * phone's GitHub screen so the two cannot disagree about what a failure looks
 * like. `reload` exists because a network call that failed is worth one more try
 * from the reader's own hand, and a window that can only say "error" is a dead end.
 */
export function useContributions(username) {
  const [state, setState] = useState(() => (username ? { status: 'loading' } : { status: 'off' }));
  const controller = useRef(null);

  const load = useCallback(() => {
    if (!username) {
      setState({ status: 'off' });
      return undefined;
    }
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setState({ status: 'loading' });
    fetchContributions(username, { signal: abort.signal })
      .then((data) => {
        if (!abort.signal.aborted) setState({ status: 'ready', data });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setState({ status: 'error', message: error?.message ?? 'The contributions service did not answer' });
      });
    return () => abort.abort();
  }, [username]);

  useEffect(() => load(), [load]);

  return { ...state, reload: load };
}

export default useContributions;
