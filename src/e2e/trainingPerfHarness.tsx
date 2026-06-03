import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { E2ETrainingPerfHarness, configureE2ETrainingPerf } from '../components/training/E2ETrainingPerfHarness';

configureE2ETrainingPerf();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <E2ETrainingPerfHarness />
  </StrictMode>,
);
