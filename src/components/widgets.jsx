import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Globe,
  Moon,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useBattery } from '../hooks/useBattery.js';
import { useClock } from '../hooks/useClock.js';
import { useTheme } from '../hooks/useTheme.jsx';
import { profile } from '../data/portfolio.js';
import { fetchWeather } from '../utils/weather.js';
import { isSet } from '../utils/links.js';
import { BatteryGauge } from './icons.jsx';

/**
 * Home-screen widgets, built the way macOS builds them.
 *
 * Three rules the whole file obeys:
 *   · every number is read from the browser or from a live API — none of it is
 *     written into a data file, so none of it can go stale,
 *   · a reading that is unavailable is stated as unavailable instead of being
 *     replaced with a plausible placeholder,
 *   · the tile is the design: a square of translucent material with the
 *     reading inside it, no card chrome, no caption bar, nothing to switch a
 *     tile from being legible at arm's length on a wallpaper.
 */

const WEATHER_GLYPHS = {
  sun: Sun,
  partly: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
const shortDateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** macOS names the place in the corner instead of titling the widget. */
function placeName() {
  if (isSet(profile.city)) return profile.city;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return zone ? String(zone).split('/').pop().replace(/_/g, ' ') : 'This machine';
}

/** One timer, aligned to the second boundary, so the hands never drift. */
function useSecondHand() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    const schedule = () => {
      const delay = 1000 - (Date.now() % 1000);
      timer = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, delay || 1000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

/* `data-widget` is a hook for tests and for anyone inspecting the page: each
   tile can be addressed without inventing a styling class to query it by. */
function Widget({ id, label, caption, children, className = '', ...rest }) {
  return (
    <article className={`widget ${className}`.trim()} data-widget={id} aria-label={label} {...rest}>
      {caption ? <p className="widget__caption">{caption}</p> : null}
      {children}
    </article>
  );
}

/* ---------------------------------------------------------------- welcome --- */
/* The iPhone's Welcome widget: a greeting that follows the actual hour, the name
   from the config file, and the availability from the data file — nothing
   invented, nothing that could go stale. No clock: the status bar above this tile
   and the dial beside it already read the time, and a third copy of a number that
   changes every minute is noise, not information. */

/** The greeting the macOS welcome widget and the phone lock screen share, so
    the two can never disagree about when the afternoon ends. */
export function greetingFor(hours) {
  return hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';
}

export function WelcomeWidget() {
  const clock = useClock();
  const hours = clock.raw.getHours();
  /* `clock.time` is read nowhere in this tile on purpose — see the note above. */
  const greeting = greetingFor(hours);
  const availability = isSet(profile.availability?.label) ? profile.availability.label : null;

  return (
    <Widget id="welcome" label="Greeting" className="widget--welcome">
      <div className="welcome">
        {/* The greeting is addressed to the visitor, not signed by the owner: a
            tile on the wallpaper that prints whose site it is repeats the tab, the
            menu bar and the window title, and reads as a nameplate. */}
        <p className="welcome__hello">{greeting}</p>
        {availability ? <p className="welcome__meta">{availability}</p> : null}
      </div>
    </Widget>
  );
}

/* ------------------------------------------------------------------ clock --- */

function ClockWidget() {
  const now = useSecondHand();
  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Widget id="clock" label="Local time" caption={placeName()}>
      <div className="clock">
        <svg className="clock__face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <circle className="clock__rim" cx="50" cy="50" r="45" />
          {Array.from({ length: 12 }, (_, index) => (
            <line
              key={index}
              className={`clock__tick${index % 3 === 0 ? ' clock__tick--major' : ''}`}
              x1="50"
              y1="9"
              x2="50"
              y2={index % 3 === 0 ? 17 : 14}
              transform={`rotate(${index * 30} 50 50)`}
            />
          ))}
          <line className="clock__hand clock__hand--hour" x1="50" y1="54" x2="50" y2="30" transform={`rotate(${hours * 30} 50 50)`} />
          <line className="clock__hand clock__hand--minute" x1="50" y1="57" x2="50" y2="21" transform={`rotate(${minutes * 6} 50 50)`} />
          <line className="clock__hand clock__hand--second" x1="50" y1="59" x2="50" y2="17" transform={`rotate(${seconds * 6} 50 50)`} />
          <circle className="clock__pin" cx="50" cy="50" r="2.4" />
        </svg>
        <div className="clock__readout">
          <p className="clock__time">{timeFormat.format(now)}</p>
          <p className="clock__date">{dateFormat.format(now)}</p>
          <p className="clock__zone">{zone || 'zone unknown'}</p>
        </div>
      </div>
    </Widget>
  );
}

/* ---------------------------------------------------------------- weather --- */

function WeatherWidget() {
  const city = profile.city;
  const [state, setState] = useState(() => (isSet(city) ? { status: 'loading' } : { status: 'off' }));
  const controller = useRef(null);

  const load = useCallback(() => {
    if (!isSet(city)) return undefined;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setState({ status: 'loading' });
    fetchWeather(city, { signal: abort.signal, coords: profile.coords })
      .then((data) => setState({ status: 'ready', data }))
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setState({ status: 'error', message: error?.message ?? 'The weather service did not answer' });
      });
    return () => abort.abort();
  }, [city]);

  useEffect(() => load(), [load]);

  const data = state.data;
  const Glyph = WEATHER_GLYPHS[data?.glyph] ?? Cloud;
  const ready = state.status === 'ready' && data;
  // The sky behind the numbers is the condition, not a decoration: it is only
  // ever painted from an answer, and only a real `is_day` is allowed to darken it.
  const night = ready && data.isDay === false;

  return (
    <Widget
      id="weather"
      label={`Weather in ${isSet(city) ? city : 'the configured city'}`}
      caption={ready ? data.place : null}
      className={`widget--weather widget--${state.status}`}
      data-sky={ready ? data.glyph : undefined}
      data-night={night ? 'true' : undefined}
    >
      {!isSet(city) ? (
        <p className="widget__empty">
          Set <code>profile.city</code> in <code>src/data/portfolio.js</code> and the live reading appears here.
        </p>
      ) : state.status === 'loading' ? (
        <p className="widget__loading">
          <span className="widget__pulse" aria-hidden="true" />
          Reading {city}…
        </p>
      ) : state.status === 'error' ? (
        <p className="widget__empty">
          {state.message}. No figure is shown until the service answers — this widget never guesses.
        </p>
      ) : (
        <div className="weather">
          <div className="weather__head">
            <p className="weather__temp">
              {Math.round(data.temperature)}
              <span className="weather__unit">{data.unit}</span>
            </p>
            <Glyph className="weather__glyph" size={22} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <p className="weather__condition">
            {data.label}
            {night ? ' · night' : ''}
          </p>
          {data.high != null && data.low != null ? (
            <p className="weather__range">
              <span>H:{Math.round(data.high)}{data.unit}</span>
              <span>L:{Math.round(data.low)}{data.unit}</span>
            </p>
          ) : (
            <p className="weather__range">No range reported for today</p>
          )}
          <p className="weather__meta">
            <span>
              <Thermometer size={11} strokeWidth={2} aria-hidden="true" />
              {Math.round(data.feelsLike)}
              {data.unit} feels
            </span>
            <span>
              <Wind size={11} strokeWidth={2} aria-hidden="true" />
              {data.wind} {data.windUnit}
            </span>
            <span>
              {night ? <Moon size={11} strokeWidth={2} aria-hidden="true" /> : <Sun size={11} strokeWidth={2} aria-hidden="true" />}
              {String(data.observedAt ?? '').slice(11, 16) || '--:--'} local
            </span>
          </p>
        </div>
      )}
    </Widget>
  );
}

/* --------------------------------------------------------------- system --- */

export function SystemWidget() {
  const battery = useBattery();
  const { theme, preference } = useTheme();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offsetMinutes = -new Date().getTimezoneOffset();
  const absolute = Math.abs(offsetMinutes);
  const offset = `UTC${offsetMinutes < 0 ? '−' : '+'}${Math.floor(absolute / 60)}${
    absolute % 60 ? `:${String(absolute % 60).padStart(2, '0')}` : ''
  }`;
  const platform = navigator.userAgentData?.platform ?? navigator.platform ?? '';

  return (
    // macOS puts the machine's own name on a system tile. The browser will not
    // always tell us one, so the day is the fallback rather than an invention.
    <Widget id="system" label="This machine" caption={platform || shortDateFormat.format(new Date())}>
      <dl className="widget__rows">
        <div className="widget__row">
          <dt className="widget__row-label">
            {/* The same four bars the status bar draws: one glyph per tile would
                drift from the other as soon as either was refined. */}
            {battery ? <BatteryGauge level={battery.level} charging={battery.charging} /> : null}
            Battery
          </dt>
          <dd className="widget__row-value">
            {battery ? `${battery.level}%${battery.charging ? ' · charging' : ''}` : 'Not reported'}
          </dd>
        </div>
        <div className="widget__row">
          <dt className="widget__row-label">
            <Globe size={13} strokeWidth={1.9} aria-hidden="true" />
            Region
          </dt>
          <dd className="widget__row-value">
            {zone || 'Unknown'} · {offset}
          </dd>
        </div>
        <div className="widget__row">
          <dt className="widget__row-label">
            <Sun size={13} strokeWidth={1.9} aria-hidden="true" />
            Appearance
          </dt>
          <dd className="widget__row-value">
            {theme === 'dark' ? 'Dark' : 'Light'}
            {preference === 'system' ? ' · auto' : ''}
          </dd>
        </div>
      </dl>
    </Widget>
  );
}

/* ------------------------------------------------------------------ links --- */
/* The iPhone's own "people" idea, made of the only four ways this portfolio
   offers to reach it. Every chip is a live anchor from `utils/links.js`, so a
   channel that is not configured in the data file is absent from the tile
   rather than greyed out on the wallpaper. */

/* ------------------------------------------------------------------ rail --- */
/* These three are the desktop's wallpaper rail and the phone *preview*'s band.
   A real phone shows none of them: an iPhone's home screen is a grid of icons, so
   `IphoneHome` renders no widget band at all and the readings live where a small
   screen can hold them honestly — this rail on a desktop, and Settings ▸ This
   Device on a phone, which asks the browser the same questions the tiles ask. */
export function HomeWidgets() {
  return (
    <section className="widget-stack" aria-label="Widgets">
      <ClockWidget />
      <WeatherWidget />
      <SystemWidget />
    </section>
  );
}

export default HomeWidgets;
