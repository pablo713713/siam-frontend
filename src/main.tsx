import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Registra el Service Worker con auto-actualización
registerSW({
  onNeedRefresh() {
    // Cuando hay una nueva versión disponible
    console.log('Nueva versión disponible, actualizando...');
  },
  onOfflineReady() {
    console.log('SIAM listo para uso offline');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);