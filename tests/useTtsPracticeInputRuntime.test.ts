import type {
  Dispatch,
  KeyboardEvent,
  MutableRefObject,
  SetStateAction,
} from 'react';
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  createTtsPracticeInputRuntime,
  type TtsPracticeInputRuntimeOptions,
} from '../src/app/useTtsPracticeInputRuntime';
import type {
  SessionTelemetry,
} from '../src/types/dictation';

function ref<T>(current: T): MutableRefObject<T> {
  return { current };
}

function createHarness(overrides: Partial<TtsPracticeInputRuntimeOptions> = {}) {
  const setTtsPracticeText = vi.fn() as unknown as Dispatch<SetStateAction<string>>;
  const handleEsKeyboardRemapKeyDown = vi.fn();
  const options: TtsPracticeInputRuntimeOptions = {
    activeSessionFinished: false,
    telemetryRef: ref<SessionTelemetry | null>(null),
    ttsStartedAtMsRef: ref<number | null>(null),
    ttsPracticeLiveTextRef: ref(''),
    setTtsPracticeText,
    handleEsKeyboardRemapKeyDown,
    ...overrides,
  };

  return {
    options,
    runtime: createTtsPracticeInputRuntime(options),
    setTtsPracticeText,
    handleEsKeyboardRemapKeyDown,
  };
}

describe('TTS practice input runtime', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts telemetry and publishes the latest typed attempt', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-14T12:00:00.000Z'));
    vi.spyOn(performance, 'now').mockReturnValue(1234);

    const {
      options,
      runtime,
      setTtsPracticeText,
    } = createHarness();

    runtime.onTtsPracticeChange('hola mundo');

    expect(options.telemetryRef.current?.startedAt).toBe('2026-06-14T12:00:00.000Z');
    expect(options.ttsStartedAtMsRef.current).toBe(1234);
    expect(options.ttsPracticeLiveTextRef.current).toBe('hola mundo');
    expect(setTtsPracticeText).toHaveBeenCalledWith('hola mundo');
  });

  it('does not mutate state after the active session is finished', () => {
    const {
      options,
      runtime,
      setTtsPracticeText,
    } = createHarness({
      activeSessionFinished: true,
      telemetryRef: ref<SessionTelemetry | null>({
        startedAt: 'already-started',
        chunks: [],
        actions: [],
      } as SessionTelemetry),
      ttsStartedAtMsRef: ref<number | null>(10),
      ttsPracticeLiveTextRef: ref('existing'),
    });

    runtime.onTtsPracticeChange('ignored');

    expect(options.telemetryRef.current?.startedAt).toBe('already-started');
    expect(options.ttsStartedAtMsRef.current).toBe(10);
    expect(options.ttsPracticeLiveTextRef.current).toBe('existing');
    expect(setTtsPracticeText).not.toHaveBeenCalled();
  });

  it('delegates keydown remapping and applies the remapped value through the same change path', () => {
    vi.spyOn(performance, 'now').mockReturnValue(987);

    const handleEsKeyboardRemapKeyDown: TtsPracticeInputRuntimeOptions['handleEsKeyboardRemapKeyDown'] = vi.fn((_event, applyValue) => {
      applyValue('ñ');
    });
    const {
      options,
      runtime,
      setTtsPracticeText,
    } = createHarness({
      handleEsKeyboardRemapKeyDown,
    });
    const event = {
      currentTarget: {
        value: '',
      },
    } as unknown as KeyboardEvent<HTMLTextAreaElement>;

    runtime.onTtsPracticeKeyDown(event);

    expect(handleEsKeyboardRemapKeyDown).toHaveBeenCalledWith(event, expect.any(Function));
    expect(options.ttsPracticeLiveTextRef.current).toBe('ñ');
    expect(options.ttsStartedAtMsRef.current).toBe(987);
    expect(setTtsPracticeText).toHaveBeenCalledWith('ñ');
  });
});
