import { DictaAppRuntime } from './app/DictaAppRuntime';
import { VercelSpeedInsights } from './observability/VercelSpeedInsights';
import './App.css';

function App() {
  return (
    <>
      <DictaAppRuntime />
      <VercelSpeedInsights />
    </>
  );
}

export default App;
