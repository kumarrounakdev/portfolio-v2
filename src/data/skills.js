/**
 * ---------------------------------------------------------------------------
 * SKILLS
 * ---------------------------------------------------------------------------
 * Grouped by what you can actually do with them. There are deliberately no
 * percentage bars: a number such as "React 95%" cannot be defended in an
 * interview. An optional `note` is shown as muted text next to a skill.
 *
 * Items accept a plain string or { name, note }.
 * ---------------------------------------------------------------------------
 */

export const skillGroups = [
  {
    id: 'frontend',
    title: 'Frontend Development',
    blurb: 'Interfaces built to be readable in the DOM and usable on a phone.',
    items: [
      'HTML',
      'CSS',
      'JavaScript',
      'React.js',
      'Vite',
      'React Router',
      'Redux Toolkit',
    ],
  },
  {
    id: 'backend',
    title: 'Backend Development',
    blurb: 'APIs and data models for MERN applications.',
    items: ['Node.js', 'Express.js', 'MongoDB', 'Mongoose', 'REST APIs'],
  },
  {
    id: 'automation',
    title: 'Automation',
    blurb: 'Practical workflow automation around forms, email and third-party APIs.',
    items: [
      { name: 'n8n', note: 'self-hosted, webhook-driven' },
      { name: 'Workflow design', note: 'triggers, branches, error paths' },
      'Webhook-based integrations',
      'Email automation',
      'API integrations',
    ],
  },
  {
    id: 'tools',
    title: 'Tools & Workflow',
    blurb: 'What is open on the second monitor every day.',
    items: ['Git', 'GitHub', 'VS Code', 'npm'],
    // Add 'Docker' here only once you have actually used it in a project.
  },
];

/** Highlighted in the Skills window header as "primary stack". */
export const primaryStack = ['React', 'JavaScript', 'Node.js', 'Express', 'MongoDB', 'n8n'];

export default skillGroups;
