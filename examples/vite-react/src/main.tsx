import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';

// Opt-in default styles. Skip this import to keep the bundled
// components fully headless and ship your own CSS instead.
import '@privion-consent/dom/styles.css';
import './app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
