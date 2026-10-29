import { useEffect, useState } from 'react';

/**
 * Real battery status via the Battery Manager API, where the browser supports it
 * (Chromium). Everything else — Safari, Firefox — gets `null`, and the menu bar
 * hides the indicator instead of showing a decorative fake reading.
 */
export function useBattery() {
  const [battery, setBattery] = useState(null);

  useEffect(() => {
    let manager = null;
    let active = true;

    const attach = (instance) => {
      if (!active) return;
      manager = instance;
      const read = () =>
        setBattery({
          level: Math.round(manager.level * 100),
          charging: manager.charging,
        });
      read();
      manager.addEventListener('levelchange', read);
      manager.addEventListener('chargingchange', read);
    };

    if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
      navigator
        .getBattery()
        .then(attach)
        .catch(() => setBattery(null));
    }

    return () => {
      active = false;
      if (manager) {
        manager.onlevelchange = null;
        manager.onchargingchange = null;
      }
    };
  }, []);

  return battery;
}

export default useBattery;
