import { NormalizedPoint } from '../../types';

/**
 * Pure, React-Native-free helpers for the live handwriting ink.
 *
 * These exist so the in-progress stroke can be rendered without a full React
 * re-render of the canvas on every touch-move event (see docs/DECISIONS.md,
 * "Trace freeze fix"). Everything here is unit-tested in __tests__.
 */

/** Minimum normalized distance between two consecutive captured points (unchanged from v1). */
export const MIN_POINT_DISTANCE = 0.008;

/** Hard cap on points kept for a single in-progress stroke. */
export const MAX_STROKE_POINTS = 600;

/** RDP tolerance used ONLY for drawing committed strokes (never for scoring input). */
export const DISPLAY_SIMPLIFY_EPSILON = 0.0015;

/**
 * Converts normalized [0..1] points into a smooth SVG path string scaled to `size`.
 * Kept byte-for-byte identical to the original HandwritingCanvas implementation.
 */
export function pointsToSvgPath(points: NormalizedPoint[], size: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const x = (points[0].x * size).toFixed(1);
    const y = (points[0].y * size).toFixed(1);
    return `M ${x} ${y} L ${Number(x) + 0.5} ${Number(y) + 0.5}`;
  }
  const cmds: string[] = [];
  const p0x = (points[0].x * size).toFixed(1);
  const p0y = (points[0].y * size).toFixed(1);
  cmds.push(`M ${p0x} ${p0y}`);

  for (let i = 1; i < points.length - 1; i++) {
    cmds.push(quadSegment(points, i, size));
  }
  const last = points[points.length - 1];
  cmds.push(`L ${(last.x * size).toFixed(1)} ${(last.y * size).toFixed(1)}`);
  return cmds.join(' ');
}

function quadSegment(points: NormalizedPoint[], i: number, size: number): string {
  const cx = points[i].x * size;
  const cy = points[i].y * size;
  const nx = ((points[i].x + points[i + 1].x) / 2) * size;
  const ny = ((points[i].y + points[i + 1].y) / 2) * size;
  return `Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`;
}

/**
 * Builds the same string as `pointsToSvgPath` but incrementally: when the
 * source array only grows, previously emitted `Q` segments are reused, so each
 * frame costs O(new points) instead of O(all points).
 */
export class IncrementalSvgPath {
  private source: NormalizedPoint[] | null = null;
  private size = 0;
  private prefix = '';
  /** Number of `Q` segments already in `prefix` (covers indices 1..emitted). */
  private emitted = 0;
  private lastLength = 0;

  reset(): void {
    this.source = null;
    this.prefix = '';
    this.emitted = 0;
    this.lastLength = 0;
  }

  getPath(points: NormalizedPoint[], size: number): string {
    const n = points.length;
    if (n < 2) {
      this.reset();
      return pointsToSvgPath(points, size);
    }
    if (points !== this.source || size !== this.size || n < this.lastLength) {
      this.source = points;
      this.size = size;
      this.prefix = `M ${(points[0].x * size).toFixed(1)} ${(points[0].y * size).toFixed(1)}`;
      this.emitted = 0;
    }
    // Q segments are needed for i = 1 .. n-2
    for (let i = this.emitted + 1; i <= n - 2; i++) {
      this.prefix += ' ' + quadSegment(points, i, size);
      this.emitted = i;
    }
    this.lastLength = n;
    const last = points[n - 1];
    return `${this.prefix} L ${(last.x * size).toFixed(1)} ${(last.y * size).toFixed(1)}`;
  }
}

/**
 * Appends `pt` to `points` (mutating) unless it is closer than `minDistance`
 * to the last captured point. Returns true when the point was kept.
 */
export function appendPointThinned(
  points: NormalizedPoint[],
  pt: NormalizedPoint,
  minDistance: number = MIN_POINT_DISTANCE
): boolean {
  if (points.length > 0) {
    const last = points[points.length - 1];
    if (Math.hypot(pt.x - last.x, pt.y - last.y) < minDistance) return false;
  }
  points.push(pt);
  return true;
}

/**
 * Bounds a stroke to `maxPoints`. When exceeded, returns a NEW array keeping the
 * first point, every other point, and always the last point (so new input keeps
 * being recorded instead of being ignored). Returns the same array otherwise.
 */
export function enforcePointCap(
  points: NormalizedPoint[],
  maxPoints: number = MAX_STROKE_POINTS
): NormalizedPoint[] {
  if (points.length <= maxPoints) return points;
  const out: NormalizedPoint[] = [];
  for (let i = 0; i < points.length; i += 2) out.push(points[i]);
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function perpendicularDistance(p: NormalizedPoint, a: NormalizedPoint, b: NormalizedPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Ramer–Douglas–Peucker polyline simplification (iterative, no recursion).
 * Always keeps the first and last points. Used for DISPLAY ONLY.
 */
export function simplifyRdp(points: NormalizedPoint[], epsilon: number): NormalizedPoint[] {
  if (points.length <= 2 || epsilon <= 0) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(points[i], points[start], points[end]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (index !== -1 && maxDist > epsilon) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
  const out: NormalizedPoint[] = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

/**
 * Coalesces many `request()` calls into at most one `flush` per scheduled frame.
 * The scheduler is injected so it can be `requestAnimationFrame` in the app and
 * a manual queue in tests.
 */
export function createFrameCoalescer(
  flush: () => void,
  schedule: (cb: () => void) => unknown = (cb) => requestAnimationFrame(cb),
  cancelScheduled: (handle: any) => void = (h) => cancelAnimationFrame(h)
) {
  let handle: unknown = null;
  let pending = false;
  const cancel = (): void => {
    if (pending && handle !== null) cancelScheduled(handle);
    pending = false;
    handle = null;
  };
  return {
    request(): void {
      if (pending) return;
      pending = true;
      handle = schedule(() => {
        pending = false;
        handle = null;
        flush();
      });
    },
    /** Drops a pending flush without running it. */
    cancel,
    /** Runs a pending flush synchronously (e.g. on pen-up). */
    flushNow(): void {
      if (!pending) return;
      cancel();
      flush();
    },
    isPending(): boolean {
      return pending;
    },
  };
}
