import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/animations.css'
import App from './App'
import { ThemeProvider } from './components/ThemeProvider'
import { unregisterServiceWorkers } from '../utils/serviceWorker';
import ErrorBoundary from './components/ErrorBoundary';

// Désenregistrer les SW en dev
if (import.meta.env.DEV) {
  unregisterServiceWorkers();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)