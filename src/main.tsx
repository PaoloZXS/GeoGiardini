import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker, unregisterOldServiceWorkers } from './serviceWorkerRegistration';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (import.meta.env.PROD) {
  registerServiceWorker();
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    await unregisterOldServiceWorkers();
    if (navigator.serviceWorker.controller) {
      window.location.reload();
    }
  });
}
