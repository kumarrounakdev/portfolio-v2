import { useContributions } from '../hooks/useContributions.js';

const WEEKDAY_ROWS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const LEVELS = [1, 2, 3, 4];

function prettyDay(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * The public contribution graph, drawn in this site's own colours rather than
 * borrowed as an image.
 *
 * A widget from the profile page would arrive as a picture of someone else's
 * theme — a green grid in the middle of a monochrome desktop, and invisible to a
 * screen reader. Drawing it here means the five shades come from `--accent` and
 * survive the light and dark appearances, the cells can be read out as one
 * sentence, and the window keeps working if the service behind it does not.
 */
export function ContributionGraph({ username }) {
  const { status, data, message, reload } = useContributions(username);

  return (
    <section className="contrib" aria-labelledby="contrib-heading">
      <div className="contrib__head">
        <h4 className="section-title" id="contrib-heading">
          Contributions
        </h4>
        {status === 'ready' ? (
          <p className="contrib__summary">
            <strong>{data.total}</strong> in the last year
            {data.peak > 0 ? <span className="contrib__peak"> · busiest day {data.peak}</span> : null}
          </p>
        ) : null}
      </div>

      {status === 'ready' ? (
        <figure className="contrib__figure">
          <div className="contrib__body">
            <div className="contrib__weekdays" aria-hidden="true">
              {WEEKDAY_ROWS.map((label, index) => (
                <span className="contrib__weekday" key={index}>
                  {label}
                </span>
              ))}
            </div>
            <div className="contrib__scroll">
              <div className="contrib__months" aria-hidden="true">
                {data.months.map((marker) => (
                  <span
                    className="contrib__month"
                    key={`${marker.label}-${marker.index}`}
                    style={{ '--at': marker.index }}
                  >
                    {marker.label}
                  </span>
                ))}
              </div>
              <div
                className="contrib__grid"
                role="img"
                aria-label={`Contribution graph: ${data.total} contributions between ${data.range.replace('–', 'and')}.`}
              >
                {data.weeks.map((week, weekIndex) =>
                  week.map((day, dayIndex) =>
                    day ? (
                      <span
                        className="contrib__cell"
                        key={`${weekIndex}-${dayIndex}`}
                        data-level={day.level}
                        title={`${day.count} ${day.count === 1 ? 'contribution' : 'contributions'} on ${prettyDay(day.date)}`}
                      />
                    ) : (
                      <span className="contrib__cell contrib__cell--pad" key={`${weekIndex}-${dayIndex}`} />
                    ),
                  ),
                )}
              </div>
            </div>
          </div>

          <figcaption className="contrib__foot">
            <span className="contrib__range mono">{data.range}</span>
            <span className="contrib__legend">
              <span className="contrib__legend-label">Less</span>
              {LEVELS.map((level) => (
                <span className="contrib__cell" key={level} data-level={level} aria-hidden="true" />
              ))}
              <span className="contrib__legend-label">More</span>
            </span>
          </figcaption>
        </figure>
      ) : status === 'loading' ? (
        <p className="contrib__state" role="status">
          Reading the last year from GitHub…
        </p>
      ) : status === 'error' ? (
        <div className="contrib__state contrib__state--error" role="status">
          <p>
            {message}. The graph is drawn from a live reading, and a reading that failed is not replaced
            with an invented one.
          </p>
          <button type="button" className="contrib__retry" onClick={reload}>
            Try again
          </button>
        </div>
      ) : (
        <p className="contrib__state">
          Set <code>GITHUB_USERNAME</code> in <code>src/data/portfolio.js</code> and this graph fills in.
        </p>
      )}

      <p className="fineprint contrib__source">
        Counts come from github-contributions-api.jogruber.de, an unauthenticated mirror of the graph on
        github.com — this page holds no GitHub token and stores no copy of your history.
      </p>
    </section>
  );
}

export default ContributionGraph;
