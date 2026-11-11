import { useCallback, useEffect, useRef, useState } from 'react';

export const IDLE_PULSE_MS = 6000;
export const IDLE_DEMO_MS = 12000;
export const IDLE_STUCK_MS = 25000;
/** While the finger keeps moving, the ladder is re-armed at most this often. */
export const ACTIVITY_RESET_THROTTLE_MS = 500;

/** What kind of touch activity happened on the canvas. Only `move` is throttled. */
export type TouchActivityKind = 'grant' | 'move' | 'release';

export interface IdleHintCallbacks {
  /** Fired at 6s idle: pulse the start badge and speak `lesson.idle` */
  onPulseHint: () => void;
  /** Fired at 12s idle: auto-play the demo for the current stroke */
  onReplayStrokeDemo: () => void;
  /** Fired at 25s idle: treat as stuck and advance the fail-soft ladder */
  onStuck: () => void;
}

/**
 * Pure timer-based controller for the WP4 idle help ladder (6s -> 12s -> 25s).
 * Directly unit-testable with Jest fake timers.
 */
export class IdleHintScheduler {
  private pulseTimer: ReturnType<typeof setTimeout> | null = null;
  private demoTimer: ReturnType<typeof setTimeout> | null = null;
  private stuckTimer: ReturnType<typeof setTimeout> | null = null;
  private active = false;
  private lastResetAt = 0;

  constructor(
    private readonly callbacks: IdleHintCallbacks,
    private readonly minResetIntervalMs: number = ACTIVITY_RESET_THROTTLE_MS
  ) {}

  start(): void {
    this.stop();
    this.active = true;
    this.scheduleTimers();
  }

  /** Unconditionally re-arms the ladder (touch grant/release, button taps). */
  resetActivity(): void {
    if (!this.active) return;
    this.clearTimers();
    this.scheduleTimers();
  }

  /**
   * Throttled re-arm for high-frequency activity (touch-move). Re-schedules the
   * timers at most once per `minResetIntervalMs`. Returns true if it re-armed.
   */
  noteActivity(): boolean {
    if (!this.active) return false;
    if (Date.now() - this.lastResetAt < this.minResetIntervalMs) return false;
    this.resetActivity();
    return true;
  }

  stop(): void {
    this.active = false;
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
      this.pulseTimer = null;
    }
    if (this.demoTimer) {
      clearTimeout(this.demoTimer);
      this.demoTimer = null;
    }
    if (this.stuckTimer) {
      clearTimeout(this.stuckTimer);
      this.stuckTimer = null;
    }
  }

  private scheduleTimers(): void {
    this.lastResetAt = Date.now();
    this.pulseTimer = setTimeout(() => {
      if (!this.active) return;
      this.callbacks.onPulseHint();
    }, IDLE_PULSE_MS);

    this.demoTimer = setTimeout(() => {
      if (!this.active) return;
      this.callbacks.onReplayStrokeDemo();
    }, IDLE_DEMO_MS);

    this.stuckTimer = setTimeout(() => {
      if (!this.active) return;
      this.callbacks.onStuck();
    }, IDLE_STUCK_MS);
  }
}

/**
 * React hook wrapping `IdleHintScheduler` for guided TRACE and WRITE phases.
 */
export function useIdleHint(options: {
  enabled: boolean;
  onPulseHint: () => void;
  onReplayStrokeDemo: () => void;
  onStuck: () => void;
}) {
  const [pulseStartBadge, setPulseStartBadge] = useState(false);
  /** Mirrors `pulseStartBadge` synchronously so activity can skip no-op state updates. */
  const pulseRef = useRef(false);
  const setPulse = (value: boolean) => {
    pulseRef.current = value;
    setPulseStartBadge(value);
  };
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const schedulerRef = useRef<IdleHintScheduler | null>(null);

  if (!schedulerRef.current) {
    schedulerRef.current = new IdleHintScheduler({
      onPulseHint: () => {
        setPulse(true);
        callbacksRef.current.onPulseHint();
      },
      onReplayStrokeDemo: () => {
        callbacksRef.current.onReplayStrokeDemo();
      },
      onStuck: () => {
        setPulse(false);
        callbacksRef.current.onStuck();
      },
    });
  }

  useEffect(() => {
    const scheduler = schedulerRef.current!;
    if (options.enabled) {
      setPulse(false);
      scheduler.start();
    } else {
      setPulse(false);
      scheduler.stop();
    }
    return () => {
      scheduler.stop();
    };
  }, [options.enabled]);

  /**
   * Call on any child activity. Touch-move (`kind === 'move'`) is throttled so a
   * long stroke does not clear/re-create the 3 ladder timers on every event;
   * everything else (grant, release, button taps) re-arms immediately.
   */
  const registerActivity = useCallback((kind?: TouchActivityKind) => {
    if (pulseRef.current) {
      setPulse(false);
    }
    if (kind === 'move') {
      schedulerRef.current?.noteActivity();
    } else {
      schedulerRef.current?.resetActivity();
    }
  }, []);

  return {
    pulseStartBadge,
    registerActivity,
  };
}
