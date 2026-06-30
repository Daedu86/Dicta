import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import '../App.css';
import { E2ETrainingPerfHarness } from '../components/training/E2ETrainingPerfHarness';
import { configureE2ETrainingPerf } from '../components/training/e2eTrainingPerfConfig';

configureE2ETrainingPerf();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <E2ETrainingPerfHarness />
  </StrictMode>,
);
