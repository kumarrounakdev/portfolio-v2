import { Info } from 'lucide-react';

/**
 * Honest empty state. Used wherever a section depends on data that has not been
 * filled in yet: it names the file to edit instead of inventing content.
 */
export function ConfigNote({ title, children, file, icon: Icon = Info, tone = 'config' }) {
  return (
    <p className={`note note--${tone}`}>
      <Icon className="note__icon" size={15} strokeWidth={1.9} aria-hidden="true" />
      <span>
        {title ? <strong>{title} </strong> : null}
        {children}
        {file ? <code className="mono"> {file}</code> : null}
      </span>
    </p>
  );
}

export default ConfigNote;
