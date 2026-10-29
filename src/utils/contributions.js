/**
 * The public contribution graph, read live.
 *
 * GitHub's own numbers are the ones worth showing, but the only official way to
 * ask for them is the GraphQL API, and that needs a token — which cannot live in
 * a static site. Scraping github.com/users/<name>/contributions is blocked by
 * CORS. So this reads an unauthenticated mirror of exactly that page, which
 * answers ordinary JSON with `access-control-allow-origin: *`:
 *
 *   https://github-contributions-api.jogruber.de/v4/<username>?y=last
 *
 * The trade is worth stating plainly in the interface, so the window says where
 * the numbers come from and links to the profile for anyone who wants to check
 * them at the source. Nothing here is invented: a failure returns an Error the
 * component prints, and a count of nothing is drawn as an empty square rather
 * than a colour that suggests activity.
 */

const ENDPOINT = 'https://github-contributions-api.jogruber.de/v4';

/** Ten minutes: long enough that reopening the window costs nothing, short enough
 *  that a commit made this morning shows up in the same session. */
const CACHE_TTL = 10 * 60 * 1000;
const CACHE_PREFIX = 'portfolio.contributions.';

function readCache(username) {
  try {
    const raw = window.sessionStorage.getItem(`${CACHE_PREFIX}${username}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.at !== 'number' || Date.now() - parsed.at > CACHE_TTL) return null;
    return parsed.data ?? null;
  } catch (error) {
    return null;
  }
}

function writeCache(username, data) {
  try {
    window.sessionStorage.setItem(`${CACHE_PREFIX}${username}`, JSON.stringify({ at: Date.now(), data }));
  } catch (error) {
    /* private mode, or a full quota: the graph simply refetches next time */
  }
}

/** `2026-03-12` as a UTC date. Local midnight would move a cell across the seam. */
function parseDay(iso) {
  const [year, month, day] = String(iso).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * A flat list of days becomes columns of seven, Sunday first, the way the graph is
 * drawn on github.com. The first column is padded backwards when the list does not
 * begin on a Sunday, so every row is the same weekday all the way across.
 */
function toWeeks(contributions) {
  const days = contributions
    .map((entry) => {
      const date = parseDay(entry?.date);
      if (!date) return null;
      return {
        date: entry.date,
        at: date,
        count: Number.isFinite(entry.count) ? entry.count : 0,
        level: Math.min(4, Math.max(0, Number.isFinite(entry.level) ? entry.level : 0)),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.at - b.at);

  if (!days.length) return [];

  const weeks = [];
  let current = new Array(days[0].at.getUTCDay()).fill(null);
  days.forEach((day) => {
    current.push(day);
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
  });
  if (current.length) {
    while (current.length < 7) current.push(null);
    weeks.push(current);
  }
  return weeks;
}

/**
 * One label per month, placed on the column where that month first has a day a
 * third of the way down the row — the same trick the graph on github.com uses, so
 * a label never sits over a week that belongs to the month before it.
 */
function monthMarkers(weeks) {
  const markers = [];
  let last = '';
  weeks.forEach((week, index) => {
    const anchor = week[3] ?? week[0];
    if (!anchor) return;
    const label = anchor.at.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
    if (label === last) return;
    last = label;
    /* The first column keeps its label only if the month has room to be read;
       otherwise a stub like "No" lands in the left gutter. */
    if (index === 0 && weeks.length > 4) {
      const next = weeks[1]?.[0]?.at.getUTCMonth();
      if (next === anchor.at.getUTCMonth()) return;
    }
    markers.push({ index, label });
  });
  return markers;
}

function formatRange(from, to) {
  const shape = { day: 'numeric', month: 'short', year: 'numeric' };
  const start = from.toLocaleDateString(undefined, { ...shape, timeZone: 'UTC' });
  const end = to.toLocaleDateString(undefined, { ...shape, timeZone: 'UTC' });
  return `${start} – ${end}`;
}

export async function fetchContributions(username, { signal } = {}) {
  const name = String(username ?? '').trim();
  if (!name) throw new Error('No GitHub username is configured');
  if (typeof fetch !== 'function') throw new Error('This browser cannot call the contributions service');

  const cached = readCache(name);
  if (cached) return cached;

  const response = await fetch(`${ENDPOINT}/${encodeURIComponent(name)}?y=last`, {
    signal,
    headers: { accept: 'application/json' },
  });

  if (response.status === 404) throw new Error(`No GitHub account called ${name}`);
  if (!response.ok) throw new Error(`The contributions service answered ${response.status}`);

  const payload = await response.json();
  const weeks = toWeeks(Array.isArray(payload?.contributions) ? payload.contributions : []);
  if (!weeks.length) throw new Error('The contributions service returned no days');

  const filled = weeks.flat().filter(Boolean);
  const counted = filled.reduce((sum, day) => sum + day.count, 0);
  /* The shape that leaves this file is plain JSON, because it is also what gets
     cached: a Date that turns into a string on the way through sessionStorage and
     back is a bug waiting for the second visit. The calendar work is done above,
     where the real dates are. */
  const data = {
    username: name,
    total: Number.isFinite(payload?.total?.lastYear) ? payload.total.lastYear : counted,
    days: filled.length,
    range: formatRange(filled[0].at, filled[filled.length - 1].at),
    peak: filled.reduce((best, day) => Math.max(best, day.count), 0),
    months: monthMarkers(weeks),
    weeks: weeks.map((week) => week.map((day) => (day ? { date: day.date, count: day.count, level: day.level } : null))),
  };

  writeCache(name, data);
  return data;
}

export default fetchContributions;
