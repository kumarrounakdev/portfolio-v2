
import { BatteryGauge } from '../icons.jsx';
import { useBattery } from '../../hooks/useBattery.js';
import { useClock } from '../../hooks/useClock.js';

/**
 * The status bar: the real local time and the real battery, exactly where an
 * iPhone puts them. No signal bars and no carrier name — a browser cannot read
 * either, so they are left out rather than drawn.
 */
export function PhoneStatusBar() {
  const clock = useClock();
  const battery = useBattery();

  return (
    <div className="phone-status">
      <span>{clock.time}</span>
      <span className="phone-status__right">
        <span className="phone-status__battery">
          {/* The number, and nothing else: the island sits between the two
              clusters and takes the room a word would need, and the gauge is
              already tinted green while the battery is charging. Screen readers
              get the word the layout cannot afford. */}
          {battery ? (
            <span>
              {battery.level}%
              {battery.charging ? <span className="sr-only">, charging</span> : null}
            </span>
          ) : null}
          {/* No reading, no mark: an empty battery is exactly what an unknown one
              would look like, and that is a claim about the machine. */}
          {battery ? <BatteryGauge level={battery.level} charging={battery.charging} /> : null}
          {battery ? null : <span className="sr-only">Battery level is not reported by this browser</span>}
        </span>
      </span>
    </div>
  );
}
