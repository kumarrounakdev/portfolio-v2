import { useEffect, useState } from 'react';

/**
 * The one network fact a browser admits to knowing.
 *
 * `navigator.onLine` is a coarse flag — it says the browser has *a* connection,
 * not which radio is up and not whether the internet answers — so it is the
 * whole of what an interface may claim. No signal bars, no carrier name, no
 * guessed link speed: those are drawn in every mockup of a status bar and read
 * by exactly no browser.
 *
 * `null` means the property was not there at all, which is reported as such.
 */
export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator.onLine === 'boolean' ? navigator.onLine : null));

  useEffect(() => {
    const report = () => setOnline(typeof navigator.onLine === 'boolean' ? navigator.onLine : null);
    window.addEventListener('online', report);
    window.addEventListener('offline', report);
    report();
    return () => {
      window.removeEventListener('online', report);
      window.removeEventListener('offline', report);
    };
  }, []);

  return online;
}

export default useOnline;
