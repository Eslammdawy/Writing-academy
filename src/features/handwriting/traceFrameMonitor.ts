/**
 * Lightweight dev-only frame & input monitor for handwriting tracing (P2.1).
 *
 * Active ONLY when `__DEV__` is true. Measures rAF frame-to-frame deltas while a
 * child is actively drawing a stroke, logs any long frame (> 50 ms) and a one-line
 * summary on pen-up, and is a no-op in release builds. Never ships analytics or
 * network code.
 */

export const JANK_FRAME_THRESHOLD_MS = 34; // > 2 frames at 60 Hz
export const LONG_FRAME_THRESHOLD_MS = 50; // perceptible stutter threshold

export interface StrokeFrameSummary {
  durationMs: number;
  frames: number;
  avgFps: number;
  maxFrameMs: number;
  jankFrames: number;
  frozenFrames: number;
  rawMoveEvents: number;
  acceptedPoints: number;
}

export interface TraceFrameMonitorOptions {
  now?: () => number;
  scheduleFrame?: (cb: () => void) => unknown;
  cancelFrame?: (handle: any) => void;
  onLongFrame?: (deltaMs: number, pointCount: number) => void;
  onStrokeSummary?: (summary: StrokeFrameSummary) => void;
}

export class TraceFrameMonitor {
  private readonly now: () => number;
  private readonly scheduleFrame: (cb: () => void) => unknown;
  private readonly cancelFrame: (handle: any) => void;
  private readonly onLongFrame?: (deltaMs: number, pointCount: number) => void;
  private readonly onStrokeSummary?: (summary: StrokeFrameSummary) => void;

  private active = false;
  private rafHandle: unknown = null;
  private startedAt = 0;
  private lastFrameAt = 0;
  private frames = 0;
  private maxFrameMs = 0;
  private jankFrames = 0;
  private frozenFrames = 0;
  private rawMoveEvents = 0;
  private acceptedPoints = 0;

  constructor(options: TraceFrameMonitorOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.scheduleFrame = options.scheduleFrame ?? ((cb) => requestAnimationFrame(cb));
    this.cancelFrame = options.cancelFrame ?? ((h) => cancelAnimationFrame(h));
    this.onLongFrame = options.onLongFrame;
    this.onStrokeSummary = options.onStrokeSummary;
  }

  startStroke(): void {
    this.stopLoop();
    const t = this.now();
    this.active = true;
    this.startedAt = t;
    this.lastFrameAt = t;
    this.frames = 0;
    this.maxFrameMs = 0;
    this.jankFrames = 0;
    this.frozenFrames = 0;
    this.rawMoveEvents = 0;
    this.acceptedPoints = 1;
    this.scheduleNextTick();
  }

  recordMoveEvent(accepted: boolean, currentPointCount: number): void {
    if (!this.active) return;
    this.rawMoveEvents += 1;
    if (accepted) {
      this.acceptedPoints = currentPointCount;
    }
  }

  endStroke(): StrokeFrameSummary | null {
    if (!this.active) return null;
    this.active = false;
    this.stopLoop();

    const durationMs = Math.max(1, this.now() - this.startedAt);
    const avgFps =
      this.frames > 0 ? Number(((this.frames * 1000) / durationMs).toFixed(1)) : 60;

    const summary: StrokeFrameSummary = {
      durationMs: Math.round(durationMs),
      frames: this.frames,
      avgFps,
      maxFrameMs: Number(this.maxFrameMs.toFixed(1)),
      jankFrames: this.jankFrames,
      frozenFrames: this.frozenFrames,
      rawMoveEvents: this.rawMoveEvents,
      acceptedPoints: this.acceptedPoints,
    };

    this.onStrokeSummary?.(summary);
    return summary;
  }

  stop(): void {
    this.active = false;
    this.stopLoop();
  }

  private scheduleNextTick(): void {
    if (!this.active) return;
    this.rafHandle = this.scheduleFrame(() => {
      this.rafHandle = null;
      if (!this.active) return;
      const t = this.now();
      const dt = Math.max(0, t - this.lastFrameAt);
      this.lastFrameAt = t;
      this.frames += 1;
      if (dt > this.maxFrameMs) {
        this.maxFrameMs = dt;
      }
      if (dt > JANK_FRAME_THRESHOLD_MS) {
        this.jankFrames += 1;
      }
      if (dt > LONG_FRAME_THRESHOLD_MS) {
        this.frozenFrames += 1;
        this.onLongFrame?.(dt, this.acceptedPoints);
      }
      this.scheduleNextTick();
    });
  }

  private stopLoop(): void {
    if (this.rafHandle !== null) {
      this.cancelFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }
}

declare const __DEV__: boolean | undefined;

/**
 * Creates a dev-only `TraceFrameMonitor` that prints long frames (> 50 ms) and
 * per-stroke summaries to the Metro console. Returns `null` outside `__DEV__`.
 */
export function createDevTraceFrameMonitor(): TraceFrameMonitor | null {
  const isDev = typeof __DEV__ !== 'undefined' && Boolean(__DEV__);
  if (!isDev) return null;

  return new TraceFrameMonitor({
    onLongFrame: (dt, pts) => {
      // eslint-disable-next-line no-console
      console.debug(
        `[TracePerf] Long frame ${dt.toFixed(1)} ms during active stroke (${pts} pts)`
      );
    },
    onStrokeSummary: (s) => {
      // eslint-disable-next-line no-console
      console.debug(
        `[TracePerf] Stroke ${s.durationMs} ms | ${s.frames} frames (${s.avgFps} fps, max ${s.maxFrameMs} ms, jank ${s.jankFrames}, >50ms ${s.frozenFrames}) | moves ${s.rawMoveEvents} -> ${s.acceptedPoints} pts`
      );
    },
  });
}
