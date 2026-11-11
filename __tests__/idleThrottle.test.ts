import {
  ACTIVITY_RESET_THROTTLE_MS,
  IDLE_PULSE_MS,
  IDLE_STUCK_MS,
  IdleHintScheduler,
} from '../src/features/lesson/useIdleHint';

describe('10. Trace freeze fix — idle ladder is not rescheduled on every move', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T10:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const makeScheduler = () => {
    const callbacks = {
      onPulseHint: jest.fn(),
      onReplayStrokeDemo: jest.fn(),
      onStuck: jest.fn(),
    };
    return { scheduler: new IdleHintScheduler(callbacks), callbacks };
  };

  test('noteActivity re-arms at most once per throttle window during a burst of move events', () => {
    const { scheduler } = makeScheduler();
    scheduler.start();
    const setSpy = jest.spyOn(global, 'setTimeout');
    const clearSpy = jest.spyOn(global, 'clearTimeout');

    // 2 seconds of touch-move at ~120 Hz (one event every 8 ms) = 250 events
    let rearmed = 0;
    for (let i = 0; i < 250; i++) {
      jest.advanceTimersByTime(8);
      if (scheduler.noteActivity()) rearmed += 1;
    }

    // 2000 ms / 500 ms window => ~4 re-arms instead of 250
    expect(rearmed).toBeLessThanOrEqual(Math.ceil(2000 / ACTIVITY_RESET_THROTTLE_MS));
    expect(rearmed).toBeGreaterThanOrEqual(3);
    // 3 timers per re-arm, never 3 per move
    expect(setSpy.mock.calls.length).toBe(rearmed * 3);
    expect(clearSpy.mock.calls.length).toBe(rearmed * 3);
  });

  test('a long continuous stroke never reaches the stuck step while the finger keeps moving', () => {
    const { scheduler, callbacks } = makeScheduler();
    scheduler.start();
    // 60 s of continuous movement, one move event every 16 ms
    for (let t = 0; t < 60000; t += 16) {
      jest.advanceTimersByTime(16);
      scheduler.noteActivity();
    }
    expect(callbacks.onPulseHint).not.toHaveBeenCalled();
    expect(callbacks.onStuck).not.toHaveBeenCalled();

    // After the finger stops, the ladder still escalates normally
    jest.advanceTimersByTime(IDLE_PULSE_MS);
    expect(callbacks.onPulseHint).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(IDLE_STUCK_MS);
    expect(callbacks.onStuck).toHaveBeenCalledTimes(1);
  });

  test('resetActivity (grant/release/tap) is never throttled', () => {
    const { scheduler } = makeScheduler();
    scheduler.start();
    const setSpy = jest.spyOn(global, 'setTimeout');
    scheduler.resetActivity();
    scheduler.resetActivity();
    expect(setSpy.mock.calls.length).toBe(6);
  });

  test('noteActivity is a no-op while the scheduler is stopped', () => {
    const { scheduler } = makeScheduler();
    const setSpy = jest.spyOn(global, 'setTimeout');
    jest.advanceTimersByTime(ACTIVITY_RESET_THROTTLE_MS * 2);
    expect(scheduler.noteActivity()).toBe(false);
    expect(setSpy).not.toHaveBeenCalled();
  });
});
