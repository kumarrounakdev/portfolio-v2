import { useEffect, useRef } from 'react';
import { Check, Circle, Command, Info, MousePointerClick, PanelRightClose } from 'lucide-react';
import { WindowPane } from '../components/WindowPane.jsx';
import { Kbd } from '../components/Button.jsx';
import { useWindowManager } from '../hooks/useWindowManager.jsx';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import { email, githubProfileUrl, isSet, linkedinUrl, resumeUrl, whatsappNumber } from '../utils/links.js';
import { profile } from '../data/portfolio.js';


/**
 * Help content. Also the configuration checklist: every row reports the real
 * state of the data files, so it doubles as "what am I still missing".
 */
export function GuideWindow() {
  const { windows } = useWindowManager();

  const payload = windows.guide?.payload;
  const reducedMotion = usePrefersReducedMotion();
  const scrollRef = useRef(null);
  const anchors = {
    start: useRef(null),
    menus: useRef(null),
    config: useRef(null),
  };

  useEffect(() => {
    if (!payload) return;
    const target = anchors[payload]?.current;
    const container = scrollRef.current;
    if (!target || !container) return;
    const top = Math.max(0, target.offsetTop - 16);
    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
    } else {
      container.scrollTop = top;
    }
    target.focus?.({ preventScroll: true });
  }, [payload, reducedMotion]);

  const checklist = [
    { label: 'Email address', ok: isSet(email()), file: 'profile.email' },
    { label: 'WhatsApp number', ok: isSet(whatsappNumber()), file: 'WHATSAPP_PHONE' },
    { label: 'GitHub profile', ok: isSet(githubProfileUrl()), file: 'GITHUB_USERNAME' },
    { label: 'LinkedIn profile', ok: isSet(linkedinUrl()), file: 'LINKEDIN_URL' },
    { label: 'Résumé file', ok: isSet(resumeUrl()), file: 'RESUME_URL (put the PDF in public/)' },
    { label: 'Weather city', ok: isSet(profile.city), file: 'profile.city' },
  ];

  return (
    <WindowPane className="guide-scroll" ref={scrollRef}>
      <div className="stack stack--loose">
        <section ref={anchors.start} id="guide-start" tabIndex={-1}>
          <div className="win-head">
            <p className="eyebrow">Help</p>
            <h3 className="window-title">Using this desktop</h3>
            <p className="window-lede">
              The portfolio behaves like a small desktop: each section is a window. Nothing is hidden
              behind dragging, hovering or gestures — the Dock and the menu bar reach every window.
            </p>
          </div>

          <div className="grid-2">
            <div className="guide-step">
              <span className="guide-step__icon" aria-hidden="true">
                <MousePointerClick size={14} />
              </span>
              <div>
                <p className="principle__title">Dock</p>
                <p className="principle__text">
                  Click an icon to open its window. The dot under a tile says that window is open, the short
                  bar says it is the one in front, and a bright dot means you minimised it — there is no second
                  row of tiles for minimised apps, because the tile already answers the click that brings the
                  window back.
                </p>
              </div>
            </div>

            <div className="guide-step">
              <span className="guide-step__icon" aria-hidden="true">
                <PanelRightClose size={14} />
              </span>
              <div>
                <p className="principle__title">Window buttons</p>
                <p className="principle__text">
                  The left light closes the window, the middle one minimises it, and the right one zooms
                  between the windowed and full-desktop size; double-clicking the title bar does the same as the
                  right one. They are three dots of one grey here rather than red, amber and green, and each
                  carries its glyph — faint until the pointer arrives, because this appearance keeps its colour
                  for things that mean something. A minimised app leaves no tile in the Dock: a dot under its
                  own icon says it is still running, and clicking that icon brings it back.
                </p>
              </div>
            </div>

            <div className="guide-step">
              <span className="guide-step__icon" aria-hidden="true">
                <Circle size={14} />
              </span>
              <div>
                <p className="principle__title">Moving windows</p>
                <p className="principle__text">
                  Drag a title bar to rearrange the desktop; positions are remembered until you use View ▸
                  Reset Window Layout. On phones and small tablets windows fill the screen instead, so there
                  is nothing to drag.
                </p>
              </div>
            </div>

            <div className="guide-step">
              <span className="guide-step__icon" aria-hidden="true">
                <Command size={14} />
              </span>
              <div>
                <p className="principle__title">Menus</p>
                <p className="principle__text">
                  File opens windows, View holds appearance, text size and layout, Window lists what is open,
                  Help is this page. Every item does something; nothing is decorative.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section ref={anchors.menus} id="guide-menus" tabIndex={-1}>
          <div className="win-head">
            <p className="eyebrow">Keyboard</p>
            <h3 className="section-title">Menus and the Tab key</h3>
          </div>
          <p className="window-lede">
            There are no application shortcuts to memorise — every action is reachable from the menu
            bar, the Dock and the buttons inside each window. The menu bar itself is fully
            keyboard-operable: focus it, then use <Kbd>←</Kbd> <Kbd>→</Kbd> to move between menus,{' '}
            <Kbd>↓</Kbd> to enter, <Kbd>Esc</Kbd> to leave. <Kbd>Tab</Kbd> walks the Dock, the window
            controls and the content of the focused window, and <Kbd>Esc</Kbd> also closes the project
            detail view.
          </p>
        </section>

        <section ref={anchors.config} id="guide-config" tabIndex={-1}>
          <div className="win-head">
            <p className="eyebrow">Owner notes</p>
            <h3 className="section-title">Before you send this link</h3>
            <p className="window-lede">
              All content lives in <code className="mono">src/data</code>. These are the values still
              waiting to be filled in — the interface hides a button whenever its value is empty, so
              nothing here can become a dead link.
            </p>
          </div>

          <div className="stack stack--tight">
            {checklist.map((item) => (
              <p className="skill-item" key={item.label} style={{ alignItems: 'center' }}>
                <span className={item.ok ? 'check-yes' : 'check-no'} aria-hidden="true">
                  {item.ok ? <Check size={13} strokeWidth={2.4} /> : <Circle size={11} />}
                </span>
                <span className="skill-item__name">{item.label}</span>
                <span className="skill-item__note mono">{item.ok ? 'configured' : item.file}</span>
              </p>
            ))}
          </div>

          <p className="note" style={{ marginTop: 'var(--space-4)' }}>
            <Info size={15} className="note__icon" aria-hidden="true" />
            <span>
              Projects, skills and education are separate files (<code className="mono">projects.js</code>,{' '}
              <code className="mono">skills.js</code>, <code className="mono">education.js</code>). Nothing in
              this portfolio invents employers, dates, metrics or screenshots — it shows only what those files
              contain.
            </span>
          </p>

          <div className="row" style={{ marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className="btn btn--sm btn--neutral"
              onClick={() => announce('Help window: configuration checklist. Edit the files in src/data.')}
            >
              Summarise this for a screen reader
            </button>
          </div>
        </section>
      </div>
    </WindowPane>
  );
}

export default GuideWindow;
