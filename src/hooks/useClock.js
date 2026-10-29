import { useEffect, useState } from 'react';

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * Real clock for the menu bar. It re-renders on the minute boundary rather than
 * on an arbitrary interval, so the displayed time is never up to 59s stale.
 */
export function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer;
    const schedule = () => {
      const current = new Date();
      const delay = 60000 - ((current.getSeconds() * 1000 + current.getMilliseconds()) % 60000);
      timer = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, delay || 60000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  return {
    time: timeFormat.format(now),
    date: dateFormat.format(now),
    raw: now,
  };
}

export default useClock;
