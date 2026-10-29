import {
  BookOpen,
  Contact,
  Cog,
  FileText,
  FolderOpen,
  GraduationCap,
  House,
  SquareTerminal,
  User,
  Wrench,
} from 'lucide-react';
import { lazy } from 'react';
import { GithubGlyph } from '../components/icons.jsx';
import { HomeWindow } from './HomeWindow.jsx';

/* One chunk per application, and the Portfolio window is the only one in the entry
   bundle. The first screen needs the shell, the Dock's data and one window's prose;
   the legal panes, the terminal, the CV sheet and the project browser are fetched
   the moment they are asked for, which is also the only moment they are worth
   fetching. */
const CHUNKS = {
  projects: () => import('./ProjectsWindow.jsx'),
  about: () => import('./AboutWindow.jsx'),
  skills: () => import('./SkillsWindow.jsx'),
  education: () => import('./EducationWindow.jsx'),
  github: () => import('./GitHubWindow.jsx'),
  contact: () => import('./ContactWindow.jsx'),
  resume: () => import('./ResumeWindow.jsx'),
  settings: () => import('./SettingsWindow.jsx'),
  terminal: () => import('./TerminalWindow.jsx'),
  guide: () => import('./GuideWindow.jsx'),
};

/* Built once per id: a lazy() made during render would be a new component type on
   every pass, and React would tear down the window's body underneath the reader. */
const deferred = new Map();
function windowComponent(id) {
  if (!deferred.has(id)) deferred.set(id, lazy(() => CHUNKS[id]()));
  return deferred.get(id);
}

/**
 * The single source of truth for what "applications" exist on this desktop.
 * The window layer, the Dock, the menu bar and the Window menu all read from
 * here, so adding a window is a one-entry change.
 *
 *   size       design width/height in px; `fit: true` lets content set the height
 *   placement  offset from the centre of the desktop, before any dragging
 *   dock       label + ordering for the Dock; `mobile: true` keeps it in the
 *              compact bottom bar (max 5 items)
 */
export const windowRegistry = [
  {
    id: 'home',
    title: 'Portfolio',
    caption: 'Introduction',
    icon: House,
    accent: '#4f8dff',
    art: { from: '#6ea8ff', to: '#2f5fd0', plate: true },
    /* As wide as its own measure: the window is one statement plus the actions on
       it, and a 1000px box around a 60ch paragraph was mostly empty glass since
       the summary panel and the widget band left. The height covers that statement
       and the details card under it; `fit` clamps it on a short viewport and the
       body scrolls, so this number is about what is readable unscrolled, not about
       whether the window can be opened. */
    size: { w: 720, h: 600, fit: true },
    placement: { x: 0, y: -14 },
    component: HomeWindow,
    preload: null,
    dock: { label: 'Portfolio', order: 10, mobile: true, mobileLabel: 'Portfolio' },
  },
  {
    id: 'projects',
    title: 'Projects',
    caption: 'Finder',
    icon: FolderOpen,
    accent: '#2f9de0',
art: { from: '#63c8f5', to: '#1276b4', plate: true },
    size: { w: 1080, h: 640 },
    placement: { x: 12, y: 4 },
    component: windowComponent('projects'),
    preload: CHUNKS.projects,
    dock: { label: 'Projects', order: 20, mobile: false, mobileLabel: 'Projects' },
  },
  {
    id: 'about',
    title: 'About Me',
    caption: 'TextEdit',
    icon: User,
    accent: '#8b5cf6',
art: { from: '#a98bff', to: '#5b34c9', plate: true },
    size: { w: 780, h: 560, fit: true },
    placement: { x: -120, y: 40 },
    component: windowComponent('about'),
    preload: CHUNKS.about,
    dock: { label: 'About', order: 30, mobile: true, mobileLabel: 'About' },
  },
  {
    id: 'skills',
    title: 'Skills',
    caption: 'Shortcuts',
    icon: Wrench,
    accent: '#f2994a',
art: { from: '#ffb765', to: '#c96a15', plate: true },
    size: { w: 860, h: 580, fit: true },
    placement: { x: 110, y: -40 },
    component: windowComponent('skills'),
    preload: CHUNKS.skills,
    dock: { label: 'Skills', order: 40, mobile: false, mobileLabel: 'Skills' },
  },
  {
    id: 'education',
    title: 'Education',
    caption: 'Qualifications',
    icon: GraduationCap,
    accent: '#12b886',
art: { from: '#4fd6a8', to: '#0a8f65', plate: true },
    size: { w: 760, h: 520, fit: true },
    placement: { x: -60, y: -60 },
    component: windowComponent('education'),
    preload: CHUNKS.education,
    dock: { label: 'Education', order: 50, mobile: false, mobileLabel: 'Education' },
  },
  {
    id: 'github',
    title: 'GitHub',
    caption: 'Profile',
    icon: GithubGlyph,
    accent: '#6e7681',
art: { from: '#3d444e', to: '#0d1117' },
    /* Taller than the profile card alone: the graph under it is 53 columns of
       squares plus its legend, and the thing this window now exists to show should
       not need a scroll to be seen. */
    size: { w: 780, h: 640, fit: true },
    placement: { x: 150, y: 60 },
    component: windowComponent('github'),
    preload: CHUNKS.github,
    dock: { label: 'GitHub', order: 60, mobile: false, mobileLabel: 'GitHub' },
  },
  {
    id: 'resume',
    title: 'Résumé',
    caption: 'Curriculum vitae',
    icon: FileText,
    accent: '#0f9d8f',
    art: { from: '#4fd6c2', to: '#0a6b60' },
    size: { w: 720, h: 620, fit: true },
    placement: { x: 30, y: 30 },
    component: windowComponent('resume'),
    preload: CHUNKS.resume,
    dock: { label: 'Résumé', order: 65, mobile: false, mobileLabel: 'Résumé' },
  },
  {
    id: 'contact',
    title: 'Contact',
    caption: 'Mail',
    icon: Contact,
    accent: '#e2577a',
art: { from: '#5db2ff', to: '#1264d6', plate: true },
    size: { w: 780, h: 600, fit: true },
    placement: { x: -140, y: -20 },
    component: windowComponent('contact'),
    preload: CHUNKS.contact,
    dock: { label: 'Contact', order: 70, mobile: true, mobileLabel: 'Contact' },
  },
  {
    id: 'settings',
    title: 'Settings',
    caption: 'System Settings',
    icon: Cog,
    accent: '#8b93a7',
    art: { from: '#a8b0c2', to: '#4d5568', plate: true },
    size: { w: 900, h: 600 },
    placement: { x: -20, y: 20 },
    component: windowComponent('settings'),
    preload: CHUNKS.settings,
    dock: { label: 'Settings', order: 80, mobile: false, mobileLabel: 'Settings' },
  },
  {
    id: 'terminal',
    title: 'Terminal',
    caption: 'zsh',
    icon: SquareTerminal,
    accent: '#30363d',
art: { from: '#3a404a', to: '#0b0d10' },
    size: { w: 720, h: 440 },
    placement: { x: 60, y: 120 },
    component: windowComponent('terminal'),
    preload: CHUNKS.terminal,
    dock: { label: 'Terminal', order: 90, mobile: false, mobileLabel: 'Terminal' },
  },
  {
    id: 'guide',
    title: 'Manual',
    caption: 'Help',
    icon: BookOpen,
    accent: '#00a3a3',
    art: { from: '#3fd0d0', to: '#046c77', plate: true },
    size: { w: 640, h: 520, fit: true },
    placement: { x: 0, y: 0 },
    component: windowComponent('guide'),
    preload: CHUNKS.guide,
    dock: null,
  },
];


export default windowRegistry;
