import {
  appendPointThinned,
  createFrameCoalescer,
  enforcePointCap,
  IncrementalSvgPath,
  MAX_STROKE_POINTS,
  MIN_POINT_DISTANCE,
  pointsToSvgPath,
  simplifyRdp,
} from '../src/features/handwriting/inkGeometry';
import { pointsToSvgPath as legacyPointsToSvgPath } from '../src/data/strokeGeometry';
import { NormalizedPoint } from '../src/types';

function wobblyStroke(n: number, seed = 1): NormalizedPoint[] {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const pts: NormalizedPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    pts.push({
      x: 0.1 + 0.8 * t + (rand() - 0.5) * 0.02,
      y: 0.5 + 0.3 * Math.sin(t * Math.PI * 3) + (rand() - 0.5) * 0.02,
    });
  }
  return pts;
}

describe('9. Trace freeze fix — live ink geometry (pure functions)', () => {
  test('pointsToSvgPath in inkGeometry matches the shared strokeGeometry implementation', () => {
    for (const n of [0, 1, 2, 3, 17, 120]) {
      const pts = wobblyStroke(n, n + 3);
      expect(pointsToSvgPath(pts, 512)).toBe(legacyPointsToSvgPath(pts, 512));
    }
  });

  test('IncrementalSvgPath produces byte-identical output to a full rebuild as a stroke grows', () => {
    const all = wobblyStroke(250, 7);
    const growing: NormalizedPoint[] = [];
    const builder = new IncrementalSvgPath();
    for (const p of all) {
      growing.push(p);
      // occasionally skip frames (rAF coalescing) to exercise multi-point catch-up
      if (growing.length % 3 === 0 || growing.length < 5) {
        expect(builder.getPath(growing, 600)).toBe(pointsToSvgPath(growing, 600));
      }
    }
    expect(builder.getPath(growing, 600)).toBe(pointsToSvgPath(growing, 600));
  });

  test('IncrementalSvgPath rebuilds when the array identity or canvas size changes', () => {
    const builder = new IncrementalSvgPath();
    const a = wobblyStroke(40, 2);
    builder.getPath(a, 400);
    const b = enforcePointCap(wobblyStroke(80, 5), 30);
    expect(builder.getPath(b, 400)).toBe(pointsToSvgPath(b, 400));
    expect(builder.getPath(b, 700)).toBe(pointsToSvgPath(b, 700));
  });

  test('appendPointThinned drops points closer than MIN_POINT_DISTANCE and mutates in place', () => {
    const pts: NormalizedPoint[] = [];
    expect(appendPointThinned(pts, { x: 0.5, y: 0.5 })).toBe(true);
    expect(appendPointThinned(pts, { x: 0.5 + MIN_POINT_DISTANCE / 2, y: 0.5 })).toBe(false);
    expect(appendPointThinned(pts, { x: 0.5 + MIN_POINT_DISTANCE * 1.5, y: 0.5 })).toBe(true);
    expect(pts).toHaveLength(2);
  });

  test('enforcePointCap halves an over-long stroke but keeps the first and last points', () => {
    const pts = wobblyStroke(MAX_STROKE_POINTS + 1, 9);
    const capped = enforcePointCap(pts);
    expect(capped).not.toBe(pts);
    expect(capped.length).toBeLessThanOrEqual(MAX_STROKE_POINTS / 2 + 2);
    expect(capped[0]).toBe(pts[0]);
    expect(capped[capped.length - 1]).toBe(pts[pts.length - 1]);
    const short = wobblyStroke(10);
    expect(enforcePointCap(short)).toBe(short);
  });

  test('a 60-second continuous trace stays bounded by the point cap', () => {
    // ~120 Hz touch events for 60 s, moving enough to pass thinning on every event
    let pts: NormalizedPoint[] = [];
    for (let i = 0; i < 120 * 60; i++) {
      const t = i * 0.05;
      appendPointThinned(pts, { x: 0.5 + 0.4 * Math.cos(t), y: 0.5 + 0.4 * Math.sin(t) });
      if (pts.length > MAX_STROKE_POINTS) pts = enforcePointCap(pts);
    }
    expect(pts.length).toBeLessThanOrEqual(MAX_STROKE_POINTS);
  });

  test('simplifyRdp keeps endpoints, removes collinear points, and preserves corners', () => {
    const line: NormalizedPoint[] = Array.from({ length: 21 }, (_, i) => ({ x: i / 20, y: 0.5 }));
    expect(simplifyRdp(line, 0.001)).toEqual([line[0], line[20]]);

    const corner: NormalizedPoint[] = [
      { x: 0.1, y: 0.1 },
      { x: 0.3, y: 0.1 },
      { x: 0.5, y: 0.1 },
      { x: 0.5, y: 0.3 },
      { x: 0.5, y: 0.5 },
    ];
    expect(simplifyRdp(corner, 0.001)).toEqual([corner[0], corner[2], corner[4]]);
    expect(simplifyRdp(corner.slice(0, 2), 0.01)).toHaveLength(2);
  });

  test('createFrameCoalescer flushes at most once per frame no matter how many requests arrive', () => {
    const queue: Array<() => void> = [];
    const flush = jest.fn();
    const coalescer = createFrameCoalescer(
      flush,
      (cb) => {
        queue.push(cb);
        return queue.length;
      },
      () => {
        queue.length = 0;
      }
    );
    for (let i = 0; i < 50; i++) coalescer.request();
    expect(queue).toHaveLength(1);
    expect(flush).not.toHaveBeenCalled();
    queue.shift()!();
    expect(flush).toHaveBeenCalledTimes(1);

    coalescer.request();
    coalescer.cancel();
    expect(coalescer.isPending()).toBe(false);
    expect(flush).toHaveBeenCalledTimes(1);

    coalescer.request();
    coalescer.flushNow();
    expect(flush).toHaveBeenCalledTimes(2);
  });
});
