/**
 * ---------------------------------------------------------------------------
 * EDUCATION
 * ---------------------------------------------------------------------------
 * One object per entry, oldest-last. Dates and institutions are the only facts
 * this file is allowed to assert; there is no percentage, grade or certificate
 * count here because none of that was given.
 *
 *   type      'degree' | 'course' | 'school' — chooses the timeline icon
 *   period    any string; '' hides the row
 *   status    a short live state, e.g. 'In progress'
 *   detail    optional one or two lines
 * ---------------------------------------------------------------------------
 */

export const education = [
  {
    id: 'bca-manipal',
    type: 'degree',
    title: 'Bachelor of Computer Applications',
    org: 'Manipal University Online',
    period: '2026 — 2029 (expected)',
    status: 'In progress',
    detail: '',
  },
  {
    id: 'fullstack-dice',
    type: 'course',
    title: 'Full Stack Web Development',
    org: 'Dice Academy, Delhi',
    period: '',
    status: '',
    detail: '',
  },
];

export default education;
