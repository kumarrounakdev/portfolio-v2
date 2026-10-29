import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';

import './styles/themes.css';
import './styles/global.css';
import './styles/desktop.css';
import './styles/widgets.css';
import './styles/menu-bar.css';
import './styles/dock.css';
import './styles/windows.css';
import './styles/projects.css';
import './styles/contact.css';
import './styles/settings.css';
import './styles/responsive.css';
import './styles/ios.css';
import './components/phone/phone.css';

const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

