import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ThemeProvider } from './components/ThemeProvider'
import { unregisterServiceWorkers } from '../utils/serviceWorker';

// Désenregistrer les SW en dev
if (import.meta.env.DEV) {
  unregisterServiceWorkers();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <App />
    </ThemeProvider>
  </StrictMode>,
)