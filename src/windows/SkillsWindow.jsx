import { Code, Cpu, Layers, Wrench } from 'lucide-react';
import { Chip } from '../components/Button.jsx';
import { WindowPane } from '../components/WindowPane.jsx';
import { primaryStack, skillGroups } from '../data/skills.js';

const GROUP_ICONS = {
  frontend: Code,
  backend: Cpu,
  automation: Layers,
  tools: Wrench,
};

function normalise(item) {
  return typeof item === 'string' ? { name: item, note: '' } : item;
}

/**
 * Skills are grouped lists, not percentages. Every entry comes from
 * src/data/skills.js so the window can never drift from the config file.
 */
export function SkillsWindow() {
  return (
    <WindowPane>
      <div className="stack stack--loose">
        <header className="win-head">
          <p className="eyebrow">Skills</p>
          <h3 className="window-title">What I work with</h3>
          <p className="window-lede">
            Grouped by what a technology is for, not by a self-assigned score. Anything listed here is
            something I have used to build or ship.
          </p>
          <div className="chip-row" style={{ marginTop: 'var(--space-2)' }}>
            {primaryStack.map((item) => (
              <Chip key={item} tone="tech">
                {item}
              </Chip>
            ))}
          </div>
        </header>

        <div className="skill-groups">
          {skillGroups.map((group) => {
            const Icon = GROUP_ICONS[group.id] ?? Layers;
            const items = (group.items || []).map(normalise);
            return (
              <section className="skill-group" key={group.id} aria-labelledby={`skill-group-${group.id}`}>
                <header className="skill-group__head">
                  <span className="icon-tile" aria-hidden="true">
                    <Icon size={15} strokeWidth={1.9} />
                  </span>
                  <div>
                    <h4 className="skill-group__title" id={`skill-group-${group.id}`}>
                      {group.title}
                    </h4>
                    <p className="skill-group__blurb">{group.blurb}</p>
                  </div>
                </header>
                <div>
                  {items.map((item) => (
                    <p className="skill-item" key={item.name}>
                      <span className="skill-item__name">{item.name}</span>
                      {item.note ? <span className="skill-item__note">{item.note}</span> : null}
                    </p>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </WindowPane>
  );
}

export default SkillsWindow;
