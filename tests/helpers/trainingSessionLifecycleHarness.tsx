import { useEffect } from 'react';
import {
  useTrainingSessionLifecycle,
  type TrainingSessionLifecycle,
} from '../../src/app/useTrainingSessionLifecycle';

type TrainingSessionLifecycleHookOptions = Parameters<typeof useTrainingSessionLifecycle>[0];

type TrainingSessionLifecycleHarnessProps = TrainingSessionLifecycleHookOptions & {
  onLifecycle: (lifecycle: TrainingSessionLifecycle) => void;
};

export function TrainingSessionLifecycleHarness({ onLifecycle, ...options }: TrainingSessionLifecycleHarnessProps) {
  const lifecycle = useTrainingSessionLifecycle(options);

  useEffect(() => {
    onLifecycle(lifecycle);
  }, [lifecycle, onLifecycle]);

  return null;
}
