import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { useIsCompact } from './useMediaQuery.js';

const LAYOUT_STORAGE_KEY = 'portfolio.window-layout.v1';

/**
 * Statuses are the animation contract between React and GSAP:
 *   closed -> opening -> open
 *   open   -> minimizing -> minimized -> restoring -> open
 *   open   -> closing -> closed
 * React owns the state; WindowFrame plays the visual transition and then calls
 * `settle()`, so the logical state is always correct even if an animation is
 * interrupted, skipped for reduced motion, or never starts at all.
 */
const TRANSITIONAL = {
  opening: 'open',
  restoring: 'open',
  zooming: 'open',
  minimizing: 'minimized',
  closing: 'closed',
};

function makeEntry(definition) {
  return {
    status: 'closed',
    open: false,
    minimized: false,
    maximized: false,
    x: definition.placement?.x ?? 0,
    y: definition.placement?.y ?? 0,
    z: 0,
    origin: null,
    payload: null,
  };
}

function initialState(definitions) {
  const byId = {};
  definitions.forEach((definition) => {
    byId[definition.id] = makeEntry(definition);
  });
  return { byId, topZ: definitions.length, order: [], announce: null, definitions };
}

function withFocus(state, id) {
  const topZ = state.topZ + 1;
  return {
    ...state,
    topZ,
    order: [...state.order.filter((entry) => entry !== id), id],
    byId: { ...state.byId, [id]: { ...state.byId[id], z: topZ } },
  };
}

/**
 * One rule for every status: a window is mounted for the whole time it is on
 * screen, *including* while it animates. 'closing' therefore keeps `open` true
 * (otherwise the exit animation would have nothing to run on) and 'minimized'
 * is the only settled status that hides the content. `origin` survives the close so
 * the frame can hand focus back to whatever opened the window.
 */
function withStatus(state, id, status) {
  const entry = state.byId[id];
  if (!entry) return state;
  const next = {
    ...entry,
    status,
    open: status !== 'closed',
    minimized: status === 'minimized',
  };
  return { ...state, byId: { ...state.byId, [id]: next } };
}

function reducer(state, action) {
  switch (action.type) {
    case 'open': {
      const { id, origin, payload } = action.payload;
      const entry = state.byId[id];
      if (!entry) return state;
      const focused = withFocus(state, id);

      // Re-opening a window that is mid-transition must interrupt that
      // transition, not be swallowed by it: clicking a Dock icon while a window
      // is closing (or minimising) brings it back instead of losing it.
      if (entry.status === 'closing' || (entry.open && entry.minimized) || entry.status === 'minimizing') {
        const status = entry.status === 'closing' ? 'opening' : 'restoring';
        const base = action.payload.singleWindow ? closeOthers(focused, id) : focused;
        const revived = withStatus(base, id, status);
        return {
          ...revived,
          byId: {
            ...revived.byId,
            [id]: { ...revived.byId[id], origin: origin ?? null, payload: payload ?? null },
          },
          announce: `${titleOf(state, id)} window opened`,
        };
      }

      if (entry.open) {
        // Already visible: raise it, and refresh the payload so "Help ▸ Keyboard
        // shortcuts" still jumps an open Guide window to the right section. On a
        // phone, raising a window still has to dismiss the sheet above it.
        const base = action.payload.singleWindow ? closeOthers(focused, id) : focused;
        const merged = {
          ...base.byId[id],
          origin: origin ?? base.byId[id].origin,
          payload: payload ?? base.byId[id].payload,
          minimized: false,
          status: entry.minimized ? 'restoring' : entry.status,
        };
        return { ...base, byId: { ...base.byId, [id]: merged } };
      }
      // Status, origin and payload must all be written in one pass: deriving the
      // entry from the pre-status state here is what previously reset the window
      // straight back to "closed".
      const base = action.payload.singleWindow ? closeOthers(focused, id) : focused;
      const opened = withStatus(base, id, 'opening');
      return {
        ...opened,
        byId: {
          ...opened.byId,
          [id]: { ...opened.byId[id], origin: origin ?? null, payload: payload ?? null },
        },
        announce: `${titleOf(state, id)} window opened`,
      };
    }
    case 'close': {
      const entry = state.byId[action.payload.id];
      if (!entry || !entry.open) return state;
      return {
        ...withStatus(state, action.payload.id, 'closing'),
        announce: `${titleOf(state, action.payload.id)} window closed`,
      };
    }
    case 'minimize': {
      const entry = state.byId[action.payload.id];
      if (!entry || !entry.open || entry.minimized) return state;
      return {
        ...withStatus(state, action.payload.id, 'minimizing'),
        announce: `${titleOf(state, action.payload.id)} window minimised to the Dock`,
      };
    }
    case 'settle':
      return withStatus(state, action.payload.id, action.payload.status);
    case 'toggle-maximize': {
      const entry = state.byId[action.payload.id];
      if (!entry) return state;
      const focused = withFocus({ ...state }, action.payload.id);
      const next = { ...focused.byId[action.payload.id], maximized: !entry.maximized, status: 'zooming' };
      return { ...focused, byId: { ...focused.byId, [action.payload.id]: next } };
    }
    case 'unmaximize': {
      const entry = state.byId[action.payload.id];
      if (!entry || !entry.maximized) return state;
      const next = { ...entry, maximized: false, status: 'zooming' };
      return { ...state, byId: { ...state.byId, [action.payload.id]: next } };
    }
    case 'focus': {
      if (!state.byId[action.payload.id]) return state;
      return withFocus(state, action.payload.id);
    }
    case 'move': {
      const entry = state.byId[action.payload.id];
      if (!entry) return state;
      return {
        ...state,
        byId: { ...state.byId, [action.payload.id]: { ...entry, x: action.payload.x, y: action.payload.y } },
      };
    }
    case 'close-all': {
      let next = state;
      state.order.forEach((id) => {
        if (next.byId[id].open) next = withStatus(next, id, 'closing');
      });
      return { ...next, announce: 'All windows closed' };
    }
    case 'bring-all-to-front': {
      let next = state;
      next.order.forEach((id) => {
        if (next.byId[id].open && next.byId[id].minimized) next = withStatus(next, id, 'restoring');
        if (next.byId[id].open) next = withFocus(next, id);
      });
      return next;
    }
    case 'reset-layout': {
      const byId = {};
      Object.keys(state.byId).forEach((id) => {
        const definition = state.definitions.find((entry) => entry.id === id);
        byId[id] = { ...makeEntry(definition), status: state.byId[id].status, open: state.byId[id].open };
      });
      return { ...state, byId, announce: 'Window layout reset' };
    }
    case 'announce':
      return { ...state, announce: action.payload };
    case 'clear-announce':
      return { ...state, announce: null };
    case 'hydrate': {
      const byId = { ...state.byId };
      let changed = false;
      Object.entries(action.payload || {}).forEach(([id, saved]) => {
        if (!byId[id]) return;
        byId[id] = {
          ...byId[id],
          maximized: Boolean(saved.maximized),
          x: Number.isFinite(saved.x) ? saved.x : byId[id].x,
          y: Number.isFinite(saved.y) ? saved.y : byId[id].y,
        };
        changed = true;
      });
      return changed ? { ...state, byId } : state;
    }
    default:
      return state;
  }
}

function closeOthers(state, id) {
  let next = state;
  Object.keys(next.byId).forEach((otherId) => {
    if (otherId !== id && next.byId[otherId].open) next = withStatus(next, otherId, 'closed');
  });
  return next;
}

function titleOf(state, id) {
  return state.definitions.find((definition) => definition.id === id)?.title ?? 'Application';
}

/** How much of a window has to stay on screen for it to be draggable back. */
const GRIP_X = 140;
const GRIP_Y = 60;

/**
 * Positions are saved in pixels, and pixels mean something different on the next
 * screen: a window dragged to x=1500 on a 1920px monitor is 900px past the edge of
 * a 1280px laptop, so closing it would mean reaching for a title bar that is not
 * there. Clamping happens once, at restore, and never fights a drag in progress.
 */
function clampToViewport(layout, definitions) {
  if (typeof window === 'undefined') return layout;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const clamped = {};
  Object.entries(layout || {}).forEach(([id, saved]) => {
    if (!saved || typeof saved !== 'object') return;
    const size = definitions.find((definition) => definition.id === id)?.size ?? {};
    const w = Math.min(size.w ?? width, width);
    const h = Math.min(size.h ?? height, height);
    clamped[id] = {
      ...saved,
      x: Number.isFinite(saved.x)
        ? Math.round(Math.min(Math.max(saved.x, GRIP_X - w), Math.max(width - GRIP_X, GRIP_X - w)))
        : saved.x,
      y: Number.isFinite(saved.y)
        ? Math.round(Math.min(Math.max(saved.y, 0), Math.max(height - GRIP_Y, 0)))
        : saved.y,
    };
  });
  return clamped;
}

function readSavedLayout() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function clearSavedLayout() {
  try {
    window.localStorage.removeItem(LAYOUT_STORAGE_KEY);
  } catch (error) {
    /* ignore */
  }
}

const WindowManagerContext = createContext(null);

export function WindowManagerProvider({ definitions, children }) {
  const [state, dispatch] = useReducer(reducer, definitions, initialState);
  const hydrated = useRef(false);
  // Phones show one window at a time (sheet layout), so opening a window closes
  // the others instead of stacking sheets on top of each other.
  const isCompact = useIsCompact();

  // Restore dragged positions / maximised states from the previous visit.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const saved = readSavedLayout();
    if (saved) dispatch({ type: 'hydrate', payload: clampToViewport(saved, definitions) });
  }, []);

  // Persist the layout (not window open/close state — a portfolio should always
  // boot into its default composition).
  const positionsRef = useRef('');
  useEffect(() => {
    const snapshot = {};
    Object.entries(state.byId).forEach(([id, entry]) => {
      snapshot[id] = { maximized: entry.maximized, x: Math.round(entry.x), y: Math.round(entry.y) };
    });
    const serialised = JSON.stringify(snapshot);
    if (serialised === positionsRef.current) return undefined;
    positionsRef.current = serialised;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, serialised);
      } catch (error) {
        /* storage disabled */
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state.byId]);

  // A transitional status must never strand a window, so force-settle after a
  // watchdog delay in case the animation callback is lost (interrupted, tab
  // backgrounded, Strict Mode double effects).
  const transitionalIds = useMemo(
    () => Object.keys(state.byId).filter((id) => TRANSITIONAL[state.byId[id].status]),
    [state.byId],
  );
  useEffect(() => {
    if (transitionalIds.length === 0) return undefined;
    const timers = transitionalIds.map((id) =>
      window.setTimeout(() => dispatch({ type: 'settle', payload: { id, status: TRANSITIONAL[state.byId[id].status] } }), 900),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [transitionalIds, state.byId]);

  useEffect(() => {
    if (!state.announce) return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'clear-announce' }), 2200);
    return () => window.clearTimeout(timer);
  }, [state.announce]);

  const definitionsRef = useRef(definitions);
  definitionsRef.current = definitions;

  const openWindow = useCallback(
    (id, options) => {
      dispatch({
        type: 'open',
        payload: { id, origin: options?.origin, payload: options?.payload, singleWindow: isCompact },
      });
    },
    [isCompact],
  );

  const closeWindow = useCallback((id) => dispatch({ type: 'close', payload: { id } }), []);
  const minimizeWindow = useCallback((id) => dispatch({ type: 'minimize', payload: { id } }), []);
  const settleWindow = useCallback(
    (id, status) => dispatch({ type: 'settle', payload: { id, status } }),
    [],
  );
  const toggleMaximize = useCallback((id) => dispatch({ type: 'toggle-maximize', payload: { id } }), []);
  const focusWindow = useCallback((id) => dispatch({ type: 'focus', payload: { id } }), []);
  const moveWindow = useCallback(
    (id, x, y) => dispatch({ type: 'move', payload: { id, x, y } }),
    [],
  );
  const closeAllWindows = useCallback(() => dispatch({ type: 'close-all' }), []);
  const bringAllToFront = useCallback(() => dispatch({ type: 'bring-all-to-front' }), []);
  const resetLayout = useCallback(() => {
    clearSavedLayout();
    dispatch({ type: 'reset-layout' });
  }, []);
  const announce = useCallback((message) => dispatch({ type: 'announce', payload: message }), []);

  const derived = useMemo(() => {
    const zIndexById = {};
    // Stacking comes from focus order, so z-index stays in a small range and can
    // never grow past the menu bar / Dock layers no matter how long the session runs.
    state.order.forEach((id, index) => {
      if (state.byId[id]?.open) zIndexById[id] = index + 1;
    });
    const openIds = [];
    const visibleIds = [];
    let frontmostId = null;
    let topZ = -1;
    Object.entries(state.byId).forEach(([id, entry]) => {
      if (entry.open) {
        openIds.push(id);
        if (!entry.minimized) visibleIds.push(id);
        if (!entry.minimized && entry.z > topZ) {
          topZ = entry.z;
          frontmostId = id;
        }
      }
    });
    /* No list of minimised ids any more: the Dock marks the state on the tile it
       belongs to, so such a list would be a second place for one fact to live. */
    return { openIds, visibleIds, frontmostId, zIndexById };
  }, [state.byId, state.order]);

  const value = useMemo(
    () => ({
      definitions,
      windows: state.byId,
      ...derived,
      announcement: state.announce,
      announce,
      openWindow,
      closeWindow,
      minimizeWindow,
      settleWindow,
      toggleMaximize,
      focusWindow,
      moveWindow,
      closeAllWindows,
      bringAllToFront,
      resetLayout,

      }),
    [definitions, state.byId, state.announce, derived, openWindow, closeWindow, minimizeWindow,
      settleWindow, toggleMaximize, focusWindow, moveWindow, closeAllWindows, bringAllToFront,
      resetLayout, announce],
  );

  return <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>;
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) throw new Error('useWindowManager must be used inside <WindowManagerProvider>');
  return context;
}


export default useWindowManager;
