import { BookOpen, GraduationCap, School } from 'lucide-react';
import { Button, Chip } from '../components/Button.jsx';
import { WindowPane } from '../components/WindowPane.jsx';
import { education } from '../data/education.js';
import { useWindowManager } from '../hooks/useWindowManager.jsx';

const TYPE_ICONS = {
  degree: GraduationCap,
  course: BookOpen,
  school: School,
};

/**
 * Education window. It prints exactly what src/data/education.js holds —
 * qualification, institution, years — and adds nothing around it: no grades,
 * no "top of the class", no invented module lists.
 */
export function EducationWindow() {
  const { openWindow } = useWindowManager();

  return (
    <WindowPane>
      <div className="stack stack--loose">
        <header className="win-head">
          <p className="eyebrow">Education</p>
          <h3 className="window-title">Where the fundamentals come from</h3>
          <p className="window-lede">
            Formal study and coursework, listed the way they appear on a certificate. Everything I have
            actually shipped sits in the Projects window.
          </p>
        </header>

        {education.length > 0 ? (
          <ul className="timeline">
            {education.map((entry) => {
              const Icon = TYPE_ICONS[entry.type] ?? GraduationCap;
              return (
                <li className="timeline__item" key={entry.id}>
                  <span className="timeline__node" aria-hidden="true">
                    <Icon size={11} strokeWidth={2} />
                  </span>
                  <div className="timeline__card">
                    {entry.period ? <p className="timeline__period">{entry.period}</p> : null}
                    <h4 className="timeline__title">{entry.title}</h4>
                    {entry.org ? <p className="timeline__org">{entry.org}</p> : null}
                    {entry.detail ? <p className="timeline__summary">{entry.detail}</p> : null}
                    {entry.status ? (
                      <div className="chip-row" style={{ marginTop: 'var(--space-3)' }}>
                        <Chip>{entry.status}</Chip>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="window-lede">
            Nothing has been added to <code className="mono">src/data/education.js</code> yet.
          </p>
        )}

        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <Button size="sm" variant="neutral" onClick={() => openWindow('skills', { origin: 'education' })}>
            Skills
          </Button>
          <Button size="sm" variant="neutral" onClick={() => openWindow('projects', { origin: 'education' })}>
            Projects
          </Button>
        </div>
      </div>
    </WindowPane>
  );
}

export default EducationWindow;
