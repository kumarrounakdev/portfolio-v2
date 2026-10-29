import { useCallback, useEffect, useRef, useState } from 'react';
import { skillGroups } from '../data/skills.js';
import { partCount, projects } from '../data/projects.js';
import { profile } from '../data/portfolio.js';
import { contactChannels, isSet } from '../utils/links.js';
import { useWindowManager } from '../hooks/useWindowManager.jsx';
import { useHasFinePointer } from '../hooks/useMediaQuery.js';

/**
 * A terminal you can actually type in. There are exactly five commands, and each
 * one prints something true: it reads the same data files the windows read, so the
 * two can never disagree. Unknown input is reported as unknown — nothing is
 * simulated, no fake process output, no invented numbers.
 */

const HELP = [
  { name: 'help', note: 'this list' },
  { name: 'projects', note: 'what is built, and which links exist' },
  { name: 'skills', note: 'the stack, grouped' },
  { name: 'contact', note: 'the channels the Contact window can render' },
  { name: 'clear', note: 'empty the screen' },
];

function projectsOutput() {
  const lines = [{ kind: 'head', text: 'PROJECTS' }];
  for (const project of projects) {
    lines.push({ kind: 'field', label: project.name, text: `${project.tagline}  ~/projects/${project.id}` });
    lines.push({
      kind: 'muted',
      text: `      ${project.categories.join(', ')}${project.featured ? ' · featured' : ''}${
        partCount(project) > 1 ? ` · ${partCount(project)} parts` : ''
      } · ${
        isSet(project.links?.repo) ? project.links.repo : 'no public repository'
      }${isSet(project.links?.demo) ? ` · ${project.links.demo}` : ' · no live demo'}`,
    });
  }
  lines.push({ kind: 'out', text: '' });
  lines.push({ kind: 'muted', text: 'open ~/projects to read a project inside the Finder window' });
  return lines;
}

function skillsOutput() {
  const lines = [{ kind: 'head', text: 'STACK' }];
  for (const group of skillGroups) {
    lines.push({
      kind: 'field',
      label: group.id,
      text: group.items.map((item) => (typeof item === 'string' ? item : item.name)).join(', '),
    });
  }
  return lines;
}

function contactOutput() {
  const channels = contactChannels();
  if (channels.length === 0) {
    return [
      { kind: 'muted', text: 'no channels configured — add email, WhatsApp or links in src/data/portfolio.js' },
    ];
  }
  return [
    { kind: 'head', text: 'CONTACT' },
    ...channels.map((channel) => ({ kind: 'field', label: channel.label, text: channel.value })),
    { kind: 'out', text: '' },
    { kind: 'muted', text: 'Email and WhatsApp are the only channels — this site has no form and no backend.' },
  ];
}

const COMMANDS = {
  help: () => [
    { kind: 'head', text: 'COMMANDS' },
    ...HELP.map((entry) => ({ kind: 'field', label: entry.name, text: entry.note })),
    { kind: 'out', text: '' },
    { kind: 'muted', text: 'Read-only: these commands print from src/data, they do not run anything.' },
  ],
  projects: projectsOutput,
  skills: skillsOutput,
  contact: contactOutput,
};

const INTRODUCTION = [
  { kind: 'muted', text: `${profile.name} — portfolio shell · read-only · type “help” for the five commands` },
];

export function TerminalWindow() {
  const [entries, setEntries] = useState(INTRODUCTION);
  const [value, setValue] = useState('');
  const [history, setHistory] = useState([]);
  const historyIndex = useRef(-1);
  const inputRef = useRef(null);
  const outRef = useRef(null);
  const { openWindow } = useWindowManager();

  /* Keep the newest line in view, the way a real terminal does. */
  useEffect(() => {
    const node = outRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [entries]);

  const run = useCallback(
    (raw) => {
      const [name, ...rest] = raw.trim().split(/\s+/);
      const argument = rest.join(' ');
      if (!name) return;

      setHistory((previous) => [raw.trim(), ...previous].slice(0, 24));
      historyIndex.current = -1;
      setEntries((previous) => [...previous, { kind: 'in', text: raw.trim() }]);

      if (name === 'clear') {
        setEntries(INTRODUCTION);
        return;
      }
      if (name === 'open' && (argument === 'projects' || argument === '~/projects')) {
        setEntries((previous) => [...previous, { kind: 'muted', text: 'opening the Projects window…' }]);
        openWindow('projects', { origin: 'terminal' });
        return;
      }

      const handler = COMMANDS[name];
      if (!handler) {
        setEntries((previous) => [
          ...previous,
          { kind: 'error', text: `command not found: ${name}` },
          { kind: 'muted', text: 'this shell knows: help · projects · skills · contact · clear' },
        ]);
        return;
      }
      setEntries((previous) => [...previous, ...handler()]);
    },
    [openWindow],
  );

  const onSubmit = (event) => {
    event.preventDefault();
    run(value);
    setValue('');
  };

  /* ↑/↓ walk the commands typed this session — no shortcuts, no key bindings. */
  const onKeyDown = (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (history.length === 0) return;
      event.preventDefault();
      const delta = event.key === 'ArrowUp' ? -1 : 1;
      const next = Math.min(Math.max(historyIndex.current + delta, -1), history.length - 1);
      historyIndex.current = next;
      setValue(next === -1 ? '' : history[next] ?? '');
      return;
    }
  };

  /* Tapping anywhere in a terminal focuses the prompt. On a touch screen the
     keyboard then eats the lower half of the sheet, so the prompt is also
     scrolled into what is left — a click that leaves no visible caret reads as
     a broken control. `preventScroll` stays for a mouse, where a click must not
     shove the window around. */
  const hasFinePointer = useHasFinePointer();
  const focusPrompt = () => {
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    if (!hasFinePointer) input.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  return (
    <div className="term" onClick={focusPrompt}>
      <div className="term__out scroll-area" ref={outRef} role="log" aria-live="polite" aria-label="Terminal output" tabIndex={0}>
        {entries.map((entry, index) => (
          <p className={`term__line term__line--${entry.kind}`} key={`${entry.kind}-${index}-${(entry.text ?? '').slice(0, 24)}`}>
            {entry.kind === 'in' ? (
              <>
                <span className="term__prompt">$ </span>
                <span className="term__cmd">{entry.text}</span>
              </>
            ) : null}
            {entry.kind === 'field' ? (
              <>
                <span className="term__key">{entry.label}</span>
                <span className="term__val">{entry.text}</span>
              </>
            ) : null}
            {entry.kind === 'head' || entry.kind === 'out' || entry.kind === 'muted' || entry.kind === 'error'
              ? entry.text
              : null}
          </p>
        ))}
      </div>

      <form className="term__form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="terminal-input">
          Terminal command — type “help” to list the commands
        </label>
        <span className="term__prompt" aria-hidden="true">
          $
        </span>
        <input
          id="terminal-input"
          ref={inputRef}
          className="term__input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="help"
          spellCheck="false"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          enterKeyHint="done"
        />
        <button type="submit" className="term__run">
          run
        </button>
      </form>
    </div>
  );
}

export default TerminalWindow;
