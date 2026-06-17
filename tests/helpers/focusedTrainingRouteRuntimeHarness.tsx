import { useEffect } from 'react';
import {
  useFocusedTrainingRouteRuntime,
  type UseFocusedTrainingRouteRuntimeArgs,
  type UseFocusedTrainingRouteRuntimeResult,
} from '../../src/app/useFocusedTrainingRouteRuntime';

export function FocusedTrainingRouteRuntimeHarness({
  args,
  onRuntime,
}: {
  args: UseFocusedTrainingRouteRuntimeArgs;
  onRuntime: (runtime: UseFocusedTrainingRouteRuntimeResult) => void;
}) {
  const runtime = useFocusedTrainingRouteRuntime(args);

  useEffect(() => {
    onRuntime(runtime);
  }, [runtime, onRuntime]);

  return null;
}
