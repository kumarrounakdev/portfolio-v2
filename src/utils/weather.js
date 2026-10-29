/**
 * Live weather for the home page widget.
 *
 * Open-Meteo is used because it needs no API key and answers with CORS headers,
 * so the browser can call it directly — this site has no backend to proxy
 * through. One request when the city's coordinates are configured, two when they
 * are not: without them the name has to be geocoded before the forecast can be
 * asked for, which costs a second origin, a second DNS lookup and a second round
 * trip before a single number appears. Every failure ends up as an Error the widget
 * prints instead of a made-up temperature; if the numbers cannot be fetched, nothing
 * is shown.
 */

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const CURRENT_FIELDS = 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day';
/* Today's range rides along in the same request: a second round trip would make
   the widget slower to fill, and a high/low from an older day would be a lie. */
const DAILY_FIELDS = 'temperature_2m_max,temperature_2m_min';

/** WMO weather interpretation codes → plain words and which glyph to draw. */
const WMO = {
  0: ['Clear sky', 'sun'],
  1: ['Mainly clear', 'sun'],
  2: ['Partly cloudy', 'partly'],
  3: ['Overcast', 'cloud'],
  45: ['Fog', 'fog'],
  48: ['Rime fog', 'fog'],
  51: ['Light drizzle', 'rain'],
  53: ['Drizzle', 'rain'],
  55: ['Dense drizzle', 'rain'],
  56: ['Freezing drizzle', 'rain'],
  57: ['Freezing drizzle', 'rain'],
  61: ['Light rain', 'rain'],
  63: ['Rain', 'rain'],
  65: ['Heavy rain', 'rain'],
  66: ['Freezing rain', 'rain'],
  67: ['Freezing rain', 'rain'],
  71: ['Light snow', 'snow'],
  73: ['Snow', 'snow'],
  75: ['Heavy snow', 'snow'],
  77: ['Snow grains', 'snow'],
  80: ['Light showers', 'rain'],
  81: ['Showers', 'rain'],
  82: ['Violent showers', 'rain'],
  85: ['Snow showers', 'snow'],
  86: ['Snow showers', 'snow'],
  95: ['Thunderstorm', 'storm'],
  96: ['Thunderstorm, hail', 'storm'],
  99: ['Thunderstorm, hail', 'storm'],
};

function describeWeather(code) {
  const entry = WMO[code];
  if (entry) return { label: entry[0], glyph: entry[1] };
  if (code == null) return { label: 'Conditions unavailable', glyph: 'cloud' };
  return { label: `Conditions code ${code}`, glyph: 'cloud' };
}

async function getJson(url, signal) {
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Weather service replied ${response.status}`);
  return response.json();
}

/* A ten-minute TTL, shared by every tile on the page.
 *
 * The phone remounts its whole screen on every swipe, so without this the weather
 * tile would make two round trips again each time the visitor leaves and returns
 * to the home screen — and the desktop rail is a second reader of the same city.
 * Two tiles that mount in the same tick still each make their own request; what
 * is avoided is the repeat. Only a *successful* read is kept, because caching a
 * failure would hold the tile hostage for ten minutes and hide the reason the
 * caller was given. A caller's abort signal still reaches fetch().
 */
const TTL = 10 * 60 * 1000;
const readings = new Map();

/** Coordinates outside that box are a typo, not a location, and a typo would quietly
 *  read another city's sky — so anything non-finite falls back to geocoding. */
function usableCoords(coords) {
  const lat = Number(coords?.lat);
  const lon = Number(coords?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

export async function fetchWeather(city, { signal, coords } = {}) {
  if (typeof fetch !== 'function') throw new Error('This browser cannot call the weather service');
  const trimmed = String(city ?? '').trim();
  if (!trimmed) throw new Error('No city configured');

  const cached = readings.get(trimmed.toLowerCase());
  if (cached && Date.now() - cached.at < TTL) return cached.value;

  const configured = usableCoords(coords);
  let place = null;
  if (configured) {
    /* The widget prints the name that was configured, not one an API chose, and it
       prints no region: the geocoding answer is the only place that ever had one. */
    place = { name: trimmed, latitude: configured.lat, longitude: configured.lon, admin1: '', country: '' };
  } else {
    const geo = await getJson(
      `${GEOCODE_URL}?name=${encodeURIComponent(trimmed)}&count=1&language=en&format=json`,
      signal,
    );
    place = geo?.results?.[0] ?? null;
    if (!place) throw new Error(`No location found for “${trimmed}”`);
  }

  const forecast = await getJson(
    `${FORECAST_URL}?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=${CURRENT_FIELDS}&daily=${DAILY_FIELDS}&forecast_days=1&timezone=auto`,
    signal,
  );
  const now = forecast?.current;
  const units = forecast?.current_units ?? {};
  if (!now || now.temperature_2m == null) throw new Error('The forecast came back without current conditions');

  const { label, glyph } = describeWeather(now.weather_code);
  const daily = forecast?.daily ?? {};
  const unit = units.temperature_2m ?? '°C';
  const value = {
    place: place.name,
    region: place.admin1 ? `${place.admin1}, ${place.country ?? ''}`.replace(/,\s*$/, '') : place.country ?? '',
    latitude: place.latitude,
    longitude: place.longitude,
    temperature: now.temperature_2m,
    unit,
    high: daily.temperature_2m_max?.[0] ?? null,
    low: daily.temperature_2m_min?.[0] ?? null,
    // The service answers 0 or 1; null means it said nothing, so the widget
    // stays day-toned instead of inventing a night sky.
    isDay: now.is_day == null ? null : Boolean(now.is_day),
    feelsLike: now.apparent_temperature,
    humidity: now.relative_humidity_2m,
    wind: now.wind_speed_10m,
    windUnit: units.wind_speed_10m ?? 'km/h',
    label,
    glyph,
    observedAt: now.time,
    timeZone: forecast?.timezone ?? '',
  };
  readings.set(trimmed.toLowerCase(), { at: Date.now(), value });
  return value;
}

export default fetchWeather;
