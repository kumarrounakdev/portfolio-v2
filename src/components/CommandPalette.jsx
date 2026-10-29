import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { AppIcon } from './AppIcon.jsx';
import { useWindowManager } from '../hooks/useWindowManager.jsx';

/**
 * Jump to an application by name.
 *
 * A desktop with eleven apps and no keyboard path through them is a set of tiles
 * you have to hunt in. This is the one shortcut a Mac user tries without being
 * told — ⌘K (Ctrl-K elsewhere) or the row in the Window menu — and it is built on
 * the same `windowRegistry` the Dock and the menu are, so a new app appears here
 * without being added anywhere.
 *
 * It is a combobox, not a second search box: the input keeps focus, the list is
 * described by `aria-activedescendant`, and the arrow keys move a highlight rather
 * than moving focus out of the field the reader is typing in.
 */
export function CommandPalette({ open, onClose }) {
  const { definitions, openWindow, windows } = useWindowManager();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const returnFocus = useRef(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return definitions;
    return definitions.filter((definition) =>
      `${definition.title} ${definition.caption} ${definition.id}`.toLowerCase().includes(needle),
    );
  }, [definitions, query]);

  /* A new query is a new list, so the highlight starts at its top. */
  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    returnFocus.current = document.activeElement;
    /* Focused in the same commit that renders the field — a frame later is a frame
       in which a keystroke goes to whatever had focus before. */
    inputRef.current?.focus();
    return () => {
      /* The reader was somewhere before they pressed the shortcut; put them back
         there rather than at the top of the document. */
      if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus();
    };
  }, [open]);

  useEffect(() => {
    const row = listRef.current?.querySelector('[aria-selected="true"]');
    row?.scrollIntoView?.({ block: 'nearest' });
  }, [active, results]);

  if (!open) return null;

  const choose = (definition) => {
    if (!definition) return;
    openWindow(definition.id, { origin: 'palette' });
    onClose();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'Tab') {
      /* One field, one list: Tab has nowhere useful to go inside a palette, and a
         focus ring that wanders into the page behind it would be worse than none. */
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!results.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + step + results.length) % results.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[active]);
    }
  };

  return (
    <div
      className="palette"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="palette__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Jump to an application"
        onKeyDown={onKeyDown}
      >
        <div className="palette__field">
          <Search className="palette__glyph" size={15} strokeWidth={2} aria-hidden="true" />
          <input
            ref={inputRef}
            className="palette__input"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Where to?"
            aria-label="Search applications"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={results[active] ? `palette-option-${results[active].id}` : undefined}
            autoComplete="off"
            spellCheck="false"
          />
          <kbd className="palette__key">esc</kbd>
        </div>

        {results.length ? (
          <ul className="palette__results" id="palette-results" role="listbox" aria-label="Applications" ref={listRef}>
            {results.map((definition, index) => (
              <li key={definition.id} role="presentation">
                <div
                  id={`palette-option-${definition.id}`}
                  className={`palette__row${index === active ? ' palette__row--active' : ''}`}
                  role="option"
                  aria-selected={index === active}
                  onPointerMove={() => setActive(index)}
                  onClick={() => choose(definition)}
                >
                  <AppIcon icon={definition.icon} accent={definition.accent} art={definition.art} size={22} />
                  <span className="palette__name">{definition.title}</span>
                  {/* Says which windows are already up, because "open it again" and
                      "bring it forward" are the same click and different surprises. */}
                  <span className="palette__caption">{windows[definition.id]?.open ? 'Open' : definition.caption}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="palette__empty" role="status">
            Nothing in this desktop is called “{query.trim()}”. Try Projects, résumé, contact or settings.
          </p>
        )}
      </div>
    </div>
  );
}
