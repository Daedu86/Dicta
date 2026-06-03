import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { E2ETrainingPerfHarness, configureE2ETrainingPerf } from './components/training/E2ETrainingPerfHarness.tsx'

const params = new URLSearchParams(window.location.search)
const useE2ETrainingHarness = import.meta.env.DEV && params.get('e2eTraining') === '1'

if (useE2ETrainingHarness) {
  configureE2ETrainingPerf()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {useE2ETrainingHarness ? <E2ETrainingPerfHarness /> : <App />}
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
