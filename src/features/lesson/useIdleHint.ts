import { useCallback, useEffect, useRef, useState } from 'react';

export const IDLE_PULSE_MS = 6000;
export const IDLE_DEMO_MS = 12000;
export const IDLE_STUCK_MS = 25000;

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

  constructor(private readonly callbacks: IdleHintCallbacks) {}

  start(): void {
    this.stop();
    this.active = true;
    this.scheduleTimers();
  }

  resetActivity(): void {
    if (!this.active) return;
    this.clearTimers();
    this.scheduleTimers();
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
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const schedulerRef = useRef<IdleHintScheduler | null>(null);

  if (!schedulerRef.current) {
    schedulerRef.current = new IdleHintScheduler({
      onPulseHint: () => {
        setPulseStartBadge(true);
        callbacksRef.current.onPulseHint();
      },
      onReplayStrokeDemo: () => {
        callbacksRef.current.onReplayStrokeDemo();
      },
      onStuck: () => {
        setPulseStartBadge(false);
        callbacksRef.current.onStuck();
      },
    });
  }

  useEffect(() => {
    const scheduler = schedulerRef.current!;
    if (options.enabled) {
      setPulseStartBadge(false);
      scheduler.start();
    } else {
      setPulseStartBadge(false);
      scheduler.stop();
    }
    return () => {
      scheduler.stop();
    };
  }, [options.enabled]);

  const registerActivity = useCallback(() => {
    setPulseStartBadge(false);
    schedulerRef.current?.resetActivity();
  }, []);

  return {
    pulseStartBadge,
    registerActivity,
  };
}
