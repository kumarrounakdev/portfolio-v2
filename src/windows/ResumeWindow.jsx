import { useState } from 'react';
import { Download, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/Button.jsx';
import { ConfigNote } from '../components/ConfigNote.jsx';
import { WindowPane } from '../components/WindowPane.jsx';
import { resume } from '../data/resume.js';
import { isSet, resumeUrl, safeHref } from '../utils/links.js';

/**
 * The résumé as the document it stands for, not as a panel of UI holding a link.
 *
 * A masthead with the two things anyone opens this for — the file, and the same
 * file's text at a size the window actually has — then one ruled sheet. The PDF is
 * mounted only when asked for, because a 60 kB document should not be paid for by
 * someone who came to read; and the words on the sheet are transcribed from that
 * file, so the two cannot drift apart without someone noticing.
 */
export function ResumeWindow() {
  const [showFile, setShowFile] = useState(false);
  const file = resumeUrl();
  const fileName = file.replace(/^\//, '');

  if (!isSet(file)) {
    return (
      <WindowPane>
        <ConfigNote title="No résumé file is configured." file="src/data/portfolio.js">
          Put the PDF in <code>public/</code>, set <code>RESUME_URL</code>, and this window becomes the
          document: a download, the page beneath it, and the file itself for anyone who wants the printed
          layout.
        </ConfigNote>
      </WindowPane>
    );
  }

  return (
    <WindowPane bare className="resume-pane">
      <article className="resume">
        <header className="resume-head">
          <div className="resume-head__id">
            <p className="eyebrow">{resume.role}</p>
            <h3 className="resume-name">{resume.name}</h3>
            <p className="resume-printed mono">
              {resume.printed.phone} · {resume.printed.email}
            </p>
          </div>

          <div className="resume-actions">
            <Button size="lg" variant="primary" icon={Download} href={file} download>
              Download the PDF
            </Button>
            <Button
              size="lg"
              variant="neutral"
              icon={showFile ? EyeOff : Eye}
              aria-pressed={showFile}
              onClick={() => setShowFile((shown) => !shown)}
            >
              {showFile ? 'Hide the PDF' : 'View the PDF'}
            </Button>
            {/* The file's own name, where it can be read without deciding the width
                of a control — 28 characters in a button squeezed the name it sits
                beside on a 720px window. */}
            <span className="resume-file mono">{fileName}</span>
          </div>
        </header>

        {showFile ? (
          /* The browser's own viewer, with a link for the ones that draw no PDF at
             all — which is what an <object> fallback is for, not a decoration. */
          <div className="resume-frame">
            <object type="application/pdf" data={file}>
              <p className="section-sub">
                This browser does not display PDFs inline.{' '}
                <a href={safeHref(file)}>Open the document</a> or download it above.
              </p>
            </object>
          </div>
        ) : null}

        <div className="resume-sheet">
          <section className="resume-section">
            <h4 className="resume-section__title">Profile</h4>
            <p className="resume-summary">{resume.summary}</p>
          </section>

          <section className="resume-section">
            <h4 className="resume-section__title">Technical skills</h4>
            <dl className="resume-skills">
              {resume.skills.map((group) => (
                <div className="resume-skill" key={group.group}>
                  <dt>{group.group}</dt>
                  <dd>{group.items.join('  ·  ')}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="resume-section">
            <h4 className="resume-section__title">Projects</h4>
            {resume.projects.map((project) => {
              /* The document names each project "Thing — What it is", which reads as
                 one long line here; split on the dash and it becomes a title with a
                 kind under it, in the widths this window has. */
              const [name, kind] = project.name.split(' — ');
              return (
                <div className="resume-project" key={project.name}>
                  <p className="resume-project__name">{name}</p>
                  {kind ? <p className="resume-project__kind">{kind}</p> : null}
                  <a className="resume-project__live mono" href={safeHref(project.live)}>
                    {project.live.replace(/^https?:\/\//, '')}
                  </a>
                  <ul className="resume-points">
                    {project.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>

          <section className="resume-section">
            <h4 className="resume-section__title">Training and education</h4>
            <dl className="resume-lines">
              <div className="resume-line">
                <dt className="mono">Course</dt>
                <dd>
                  {resume.training.course}
                  <span className="resume-line__note">{resume.training.place}</span>
                </dd>
              </div>
              {resume.education.map((line) => (
                <div className="resume-line" key={line.award}>
                  <dt className="mono">{line.when}</dt>
                  <dd>
                    {line.award}
                    <span className="resume-line__note">
                      {line.place} · {line.note}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <p className="window-note">
          The contact line above is the one printed in the document. The site’s own email link uses the address
          configured in <code>src/data/portfolio.js</code>, so if the two should match, change the file and this
          window with it.
        </p>
      </article>
    </WindowPane>
  );
}

export default ResumeWindow;
