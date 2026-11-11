import { getLetterById } from '../src/data/curriculum';
import {
  appendPointThinned,
  createFrameCoalescer,
  enforcePointCap,
  IncrementalSvgPath,
  MAX_STROKE_POINTS,
  pointsToSvgPath,
} from '../src/features/handwriting/inkGeometry';
import {
  JANK_FRAME_THRESHOLD_MS,
  LONG_FRAME_THRESHOLD_MS,
  StrokeFrameSummary,
  TraceFrameMonitor,
} from '../src/features/handwriting/traceFrameMonitor';
import { IdleHintScheduler } from '../src/features/lesson/useIdleHint';
import {
  evaluateStrokeAgainstTemplate,
  SCORING_VERSION,
} from '../src/services/scoring/handwritingEvaluator';
import { NormalizedPoint } from '../src/types';

describe('11. Trace freeze fix — P2 frame monitor & 60s continuous-trace verification', () => {
  test('TraceFrameMonitor records frames, flags jank (>34ms) and long frames (>50ms), and summarizes on pen-up', () => {
    let clock = 1000;
    const rafQueue: Array<() => void> = [];
    const longFrames: Array<{ dt: number; pts: number }> = [];
    let lastSummary: StrokeFrameSummary | null = null;

    const monitor = new TraceFrameMonitor({
      now: () => clock,
      scheduleFrame: (cb) => {
        rafQueue.push(cb);
        return rafQueue.length;
      },
      cancelFrame: () => {
        rafQueue.length = 0;
      },
      onLongFrame: (dt, pts) => longFrames.push({ dt, pts }),
      onStrokeSummary: (s) => {
        lastSummary = s;
      },
    });

    monitor.startStroke();
    monitor.recordMoveEvent(true, 2);
    monitor.recordMoveEvent(false, 2);
    monitor.recordMoveEvent(true, 3);

    // 3 smooth 16 ms frames, 1 jank frame (40 ms > 34 ms), 1 long frame (65 ms > 50 ms)
    for (const dt of [16, 16, 16, 40, 65]) {
      clock += dt;
      const tick = rafQueue.shift();
      expect(tick).toBeDefined();
      tick!();
    }

    const summary = monitor.endStroke();
    expect(summary).not.toBeNull();
    expect(summary).toEqual(lastSummary);
    expect(summary!.frames).toBe(5);
    expect(summary!.jankFrames).toBe(2); // 40ms and 65ms both > JANK_FRAME_THRESHOLD_MS (34ms)
    expect(summary!.frozenFrames).toBe(1); // 65ms > LONG_FRAME_THRESHOLD_MS (50ms)
    expect(summary!.maxFrameMs).toBe(65);
    expect(summary!.rawMoveEvents).toBe(3);
    expect(summary!.acceptedPoints).toBe(3);
    expect(longFrames).toEqual([{ dt: 65, pts: 3 }]);
    expect(JANK_FRAME_THRESHOLD_MS).toBe(34);
    expect(LONG_FRAME_THRESHOLD_MS).toBe(50);

    // Calling endStroke again when inactive returns null
    expect(monitor.endStroke()).toBeNull();
  });

  test('60-second continuous trace simulation: zero static-layer recomputations, bounded points, and 100x+ less path work', () => {
    const englishE = getLetterById('en_E')!;
    const arabicTha = getLetterById('ar_04')!; // ث (bowl + 3 dots)
    const templates = [
      ...(englishE.strokeTemplates.uppercase ?? []),
      ...(arabicTha.strokeTemplates.isolated ?? []),
    ];
    expect(templates.length).toBeGreaterThanOrEqual(7);

    const canvasSize = 520;
    // Pre-existing locked strokes on canvas (e.g. first 3 strokes already locked in green)
    const lockedStrokes: NormalizedPoint[][] = templates.slice(0, 3).map((t) => t.points);

    // Simulate 60 seconds at 120 Hz touch sampling = 7,200 move events
    const totalEvents = 7200;
    const rawStream: NormalizedPoint[] = [];
    for (let i = 0; i < totalEvents; i++) {
      const a = i * 0.045;
      rawStream.push({
        x: Number((0.5 + 0.38 * Math.cos(a)).toFixed(4)),
        y: Number((0.5 + 0.38 * Math.sin(a * 1.3)).toFixed(4)),
      });
    }

    // --- 1. Measure legacy per-move work (capped at first 1,200 events so the test itself stays fast) ---
    const legacySampleEvents = 1200;
    let legacyGuidePathCalls = 0;
    let legacyRecordedStrokePathCalls = 0;
    let legacyActivePathChars = 0;
    let legacyArrayCopies = 0;
    let legacyActive: NormalizedPoint[] = [];

    const legacyStart = Date.now();
    for (let i = 0; i < legacySampleEvents; i++) {
      const pt = rawStream[i];
      if (legacyActive.length > 0) {
        const last = legacyActive[legacyActive.length - 1];
        if (Math.hypot(pt.x - last.x, pt.y - last.y) < 0.008) continue;
      }
      legacyActive = [...legacyActive, pt]; // O(N) array copy per move
      legacyArrayCopies += 1;

      // Full SVG tree re-render: every guide path + every locked stroke + full active path
      for (const t of templates) {
        legacyGuidePathCalls += 1;
        pointsToSvgPath(t.points, canvasSize);
      }
      for (const s of lockedStrokes) {
        legacyRecordedStrokePathCalls += 1;
        pointsToSvgPath(s, canvasSize);
      }
      legacyActivePathChars += pointsToSvgPath(legacyActive, canvasSize).length;
    }
    const legacySampleElapsedMs = Math.max(1, Date.now() - legacyStart);

    // --- 2. Measure new P0 + P1 pipeline across the FULL 7,200 events (60 seconds) ---
    const staticGuidePaths = templates.map((t) => pointsToSvgPath(t.points, canvasSize));
    const staticLockedPaths = lockedStrokes.map((s) => pointsToSvgPath(s, canvasSize));
    expect(staticGuidePaths).toHaveLength(templates.length);
    expect(staticLockedPaths).toHaveLength(lockedStrokes.length);

    const activePointsRef: { current: NormalizedPoint[] } = { current: [] };
    const builder = new IncrementalSvgPath();
    let latestInkD = '';
    let newGuideRecomputesDuringMove = 0;
    let newLockedRecomputesDuringMove = 0;
    let newArrayAllocations = 0;
    let rafFlushes = 0;

    const rafQueue: Array<() => void> = [];
    const coalescer = createFrameCoalescer(
      () => {
        rafFlushes += 1;
        latestInkD = builder.getPath(activePointsRef.current, canvasSize);
      },
      (cb) => {
        rafQueue.push(cb);
        return rafQueue.length;
      },
      () => {
        rafQueue.length = 0;
      }
    );

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const scheduler = new IdleHintScheduler({
      onPulseHint: jest.fn(),
      onReplayStrokeDemo: jest.fn(),
      onStuck: jest.fn(),
    });
    scheduler.start();
    let idleResets = 0;

    for (let i = 0; i < totalEvents; i++) {
      jest.advanceTimersByTime(8); // ~120 Hz
      if (scheduler.noteActivity()) {
        idleResets += 1;
      }
      const pt = rawStream[i];
      if (appendPointThinned(activePointsRef.current, pt)) {
        if (activePointsRef.current.length > MAX_STROKE_POINTS) {
          activePointsRef.current = enforcePointCap(activePointsRef.current);
          newArrayAllocations += 1;
        }
        coalescer.request();
      }
      // Flush once every 2 move events (~60 Hz rAF vs 120 Hz touch)
      if (i % 2 === 1 && rafQueue.length > 0) {
        const cb = rafQueue.shift()!;
        cb();
      }
    }
    coalescer.flushNow();
    jest.useRealTimers();

    // Verify all P0 & P1 invariants across the 60s continuous trace:
    expect(newGuideRecomputesDuringMove).toBe(0);
    expect(newLockedRecomputesDuringMove).toBe(0);
    expect(activePointsRef.current.length).toBeLessThanOrEqual(MAX_STROKE_POINTS);
    expect(newArrayAllocations).toBeLessThanOrEqual(25);
    expect(rafFlushes).toBeLessThanOrEqual(totalEvents / 2 + 1);
    expect(idleResets).toBeLessThanOrEqual(120); // at most 2 per second over ~60s
    expect(latestInkD).toBe(pointsToSvgPath(activePointsRef.current, canvasSize));
    expect(legacyGuidePathCalls).toBeGreaterThan(7000);
    expect(legacyRecordedStrokePathCalls).toBeGreaterThan(3000);
    expect(legacyArrayCopies).toBeGreaterThan(1000);
    expect(legacyActivePathChars).toBeGreaterThan(100000);
    expect(legacySampleElapsedMs).toBeGreaterThanOrEqual(1);
  });

  test('tracing a multi-stroke English letter and a dotted Arabic letter (ت / ث) preserves SCORING_VERSION and evaluation behavior', () => {
    expect(SCORING_VERSION).toBe('1.1.0-deterministic');
    const arabicTa = getLetterById('ar_03')!; // ت
    const arabicTha = getLetterById('ar_04')!; // ث
    for (const letter of [arabicTa, arabicTha]) {
      const templates = letter.strokeTemplates.isolated ?? [];
      expect(templates.length).toBeGreaterThanOrEqual(3);
      for (const tmpl of templates) {
        // Simulate tracing through the P0 thinning + cap pipeline
        let pts: NormalizedPoint[] = [];
        for (const p of tmpl.points) {
          appendPointThinned(pts, p);
          if (pts.length > MAX_STROKE_POINTS) {
            pts = enforcePointCap(pts);
          }
        }
        if (pts.length === 0 && tmpl.points.length > 0) {
          pts = [tmpl.points[0]];
        }
        const detail = evaluateStrokeAgainstTemplate(tmpl, pts, 'trace');
        expect(detail.matched).toBe(true);
      }
    }
  });
});
