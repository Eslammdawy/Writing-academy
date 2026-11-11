import { NormalizedPoint, NormalizedStrokeTemplate, StrokeKind } from '../types';

/**
 * Generates evenly-spaced points along a straight line segment in normalized [0..1] space.
 */
export function makeLinePoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  steps = 20
): NormalizedPoint[] {
  const pts: NormalizedPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({
      x: Number((x1 + (x2 - x1) * t).toFixed(4)),
      y: Number((y1 + (y2 - y1) * t).toFixed(4)),
    });
  }
  return pts;
}

/**
 * Generates evenly-sampled points along a quadratic Bezier curve in normalized [0..1] space.
 */
export function makeQuadCurvePoints(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  steps = 24
): NormalizedPoint[] {
  const pts: NormalizedPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const x = inv * inv * x0 + 2 * inv * t * cx + t * t * x1;
    const y = inv * inv * y0 + 2 * inv * t * cy + t * t * y1;
    pts.push({
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
    });
  }
  return pts;
}

/**
 * Generates evenly-sampled points along a polyline of waypoints with smooth corner interpolation.
 */
export function makePolylinePoints(
  waypoints: Array<[number, number]>,
  stepsPerSegment = 14
): NormalizedPoint[] {
  if (waypoints.length < 2) {
    return waypoints.map(([x, y]) => ({ x, y }));
  }
  const result: NormalizedPoint[] = [];
  for (let s = 0; s < waypoints.length - 1; s++) {
    const [x1, y1] = waypoints[s];
    const [x2, y2] = waypoints[s + 1];
    const seg = makeLinePoints(x1, y1, x2, y2, stepsPerSegment);
    if (s > 0) seg.shift();
    result.push(...seg);
  }
  return result;
}

/**
 * Generates a small circular/diamond dot stroke centered at (cx, cy) for Arabic nuqat or i/j dots.
 */
export function makeDotPoints(cx: number, cy: number, radius = 0.025): NormalizedPoint[] {
  return [
    { x: Number((cx - radius * 0.5).toFixed(4)), y: Number((cy - radius * 0.5).toFixed(4)) },
    { x: Number(cx.toFixed(4)), y: Number(cy.toFixed(4)) },
    { x: Number((cx + radius * 0.5).toFixed(4)), y: Number((cy + radius * 0.5).toFixed(4)) },
  ];
}

/**
 * Generates a compact Arabic Hamza (ء) mark centered around (cx, cy).
 */
export function makeHamzaPoints(cx: number, cy: number, scale = 0.055): NormalizedPoint[] {
  return makePolylinePoints(
    [
      [cx + scale * 0.4, cy - scale * 0.6],
      [cx - scale * 0.5, cy - scale * 0.2],
      [cx + scale * 0.4, cy + scale * 0.1],
      [cx - scale * 0.4, cy + scale * 0.6],
    ],
    6
  );
}

export function buildStroke(
  strokeNumber: number,
  kind: StrokeKind,
  points: NormalizedPoint[],
  directionLabel: string,
  instructionEn: string,
  instructionAr: string,
  isDotOrMark = false
): NormalizedStrokeTemplate {
  const startPoint = points[0] ?? { x: 0.5, y: 0.5 };
  const endPoint = points[points.length - 1] ?? startPoint;
  return {
    strokeNumber,
    kind,
    points,
    startPoint,
    endPoint,
    directionLabel,
    instructionEn,
    instructionAr,
    isDotOrMark,
  };
}

/**
 * Helper to append 1, 2, or 3 Arabic dots above or below an anchor coordinate.
 */
export function buildArabicDotStrokes(
  startStrokeNumber: number,
  dotCount: 0 | 1 | 2 | 3,
  placement: 'none' | 'above' | 'below' | 'inside',
  anchorX = 0.5,
  anchorY?: number
): NormalizedStrokeTemplate[] {
  if (dotCount === 0 || placement === 'none') return [];
  const defaultY =
    placement === 'above' ? 0.23 : placement === 'below' ? 0.78 : 0.53;
  const baseY = anchorY ?? defaultY;

  const coords: Array<[number, number]> = [];
  if (dotCount === 1) {
    coords.push([anchorX, baseY]);
  } else if (dotCount === 2) {
    // Right-to-left dot order for Arabic
    coords.push([anchorX + 0.055, baseY], [anchorX - 0.055, baseY]);
  } else if (dotCount === 3) {
    const tipOffset = placement === 'below' ? 0.055 : -0.055;
    coords.push(
      [anchorX + 0.06, baseY],
      [anchorX - 0.06, baseY],
      [anchorX, baseY + tipOffset]
    );
  }

  return coords.map(([cx, cy], idx) =>
    buildStroke(
      startStrokeNumber + idx,
      'dot',
      makeDotPoints(cx, cy),
      'tap',
      `Place dot ${idx + 1} (${placement})`,
      placement === 'above'
        ? `ضع النقطة ${idx + 1} فوق الحرف`
        : placement === 'below'
          ? `ضع النقطة ${idx + 1} تحت الحرف`
          : `ضع النقطة ${idx + 1} داخل الحرف`,
      true
    )
  );
}

/**
 * Converts normalized [0..1] points into a smooth SVG path string scaled to `size`.
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
    const cx = points[i].x * size;
    const cy = points[i].y * size;
    const nx = ((points[i].x + points[i + 1].x) / 2) * size;
    const ny = ((points[i].y + points[i + 1].y) / 2) * size;
    cmds.push(`Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`);
  }
  const last = points[points.length - 1];
  cmds.push(`L ${(last.x * size).toFixed(1)} ${(last.y * size).toFixed(1)}`);
  return cmds.join(' ');
}

