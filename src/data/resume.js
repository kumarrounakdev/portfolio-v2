/**
 * The curriculum vitae, transcribed from `public/resume-rounak-frontend.pdf`.
 *
 * The window this feeds is the document, readable: selectable text, a dark
 * appearance that is actually dark, and lines that fit a 390px screen. The PDF
 * stays the authoritative copy — it is embedded and downloadable from the same
 * window — so nothing here rewrites a fact, it repeats the document's own words
 * in a form the browser can lay out. If the PDF changes, change this file too:
 * the window says where its text came from rather than pretending to be a second
 * source of truth.
 */
export const resume = {
  name: 'Rounak Kumar',
  role: 'Frontend Developer',
  /** The contact block as printed at the top of the document. */
  printed: {
    email: 'kumarrounak172@gmail.com',
    phone: '+91 817 878 2184',
  },
  summary:
    'Frontend Developer with hands-on project experience in HTML, CSS, JavaScript, and React.js. ' +
    'Skilled in building responsive interfaces, reusable components, routing, state management, and REST ' +
    'API integration. Currently pursuing BCA and seeking a Frontend Developer Fresher role.',
  skills: [
    { group: 'Languages', items: ['HTML5', 'CSS3', 'JavaScript (ES6+)'] },
    { group: 'Frontend', items: ['React.js', 'React Router', 'Redux', 'Redux Toolkit (RTK)'] },
    { group: 'Styling', items: ['CSS', 'Responsive Web Design'] },
    {
      group: 'Concepts',
      items: ['REST APIs', 'State Management', 'Component-Based Architecture', 'Responsive UI Development'],
    },
  ],
  projects: [
    {
      name: 'Component Vault — Frontend Code Snippet Manager',
      live: 'https://componentvault.netlify.app/',
      points: [
        'Built a client-side code snippet manager using React 19, Vite 8, and Monaco Editor for creating and editing JSX and CSS components.',
        'Implemented search, tag-based filtering, favourites, collections, and CRUD functionality with reusable React components and Context API state management.',
        'Added React Router v7 nested routing, localStorage persistence, URL search parameters, one-click code copying, and custom CSS design tokens.',
      ],
    },
    {
      name: 'Roster — HR Management Web Application',
      live: 'https://roster-hrdesk.netlify.app/',
      points: [
        'Built an HR management application using React and reusable components for employee, attendance, leave, holiday, and calendar workflows.',
        'Implemented client-side routing with React Router, protected routes, dynamic employee routes, and shared application state using Context API.',
        'Added localStorage persistence, reusable forms and modals, search/filter interfaces, and CSS-based dark theme support for the application.',
      ],
    },
  ],
  training: {
    course: 'Full Stack Web Development',
    place: 'DICE Academy, Tilak Nagar, New Delhi',
  },
  education: [
    {
      award: 'Bachelor of Computer Application (BCA)',
      place: 'Manipal University Jaipur — Online BCA',
      when: '2026 – 2029 (Expected)',
      note: 'Currently in 1st year',
    },
    {
      award: 'Class XII — 78%',
      place: 'Rajkiya Pratibha Vikas Vidyalaya, New Delhi',
      when: '2026',
      note: 'Central Board of Secondary Education',
    },
  ],
};

export default resume;
