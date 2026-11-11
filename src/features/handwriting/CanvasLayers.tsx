import React, { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Circle, G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../../theme/tokens';
import { HandwritingMode, NormalizedPoint, NormalizedStrokeTemplate, RecordedStroke } from '../../types';
import { DISPLAY_SIMPLIFY_EPSILON, pointsToSvgPath, simplifyRdp } from './inkGeometry';

/**
 * Memoized SVG layers for `HandwritingCanvas`.
 *
 * Each layer only re-renders when the props that actually change it change, so a
 * touch-move (which only updates `ActiveInkLayer`) never recomputes guide paths,
 * recorded strokes, start badges, or arrowheads.
 */

const START_BADGE_RADIUS = 28; // WP4: >= 28 dp radius

/**
 * Computes an arrowhead triangle polygon at the end of a segment.
 */
function buildArrowPolygon(from: NormalizedPoint, to: NormalizedPoint, size: number): string {
  const x1 = from.x * size;
  const y1 = from.y * size;
  const x2 = to.x * size;
  const y2 = to.y * size;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = Math.max(12, size * 0.036);
  const a1 = angle - Math.PI / 6;
  const a2 = angle + Math.PI / 6;
  const p1x = (x2 - headLen * Math.cos(a1)).toFixed(1);
  const p1y = (y2 - headLen * Math.sin(a1)).toFixed(1);
  const p2x = (x2 - headLen * Math.cos(a2)).toFixed(1);
  const p2y = (y2 - headLen * Math.sin(a2)).toFixed(1);
  return `${x2.toFixed(1)},${y2.toFixed(1)} ${p1x},${p1y} ${p2x},${p2y}`;
}

/** Subtle notebook writing lines (Cap line, Midline, Baseline) */
export const NotebookLines = memo(function NotebookLines({ size }: { size: number }) {
  return (
    <>
      <Line
        x1={size * 0.08}
        y1={size * 0.2}
        x2={size * 0.92}
        y2={size * 0.2}
        stroke={COLORS.canvasMidline}
        strokeWidth={2}
        strokeDasharray="6,6"
      />
      <Line
        x1={size * 0.08}
        y1={size * 0.47}
        x2={size * 0.92}
        y2={size * 0.47}
        stroke={COLORS.canvasMidline}
        strokeWidth={2}
        strokeDasharray="8,8"
      />
      <Line
        x1={size * 0.06}
        y1={size * 0.75}
        x2={size * 0.94}
        y2={size * 0.75}
        stroke={COLORS.canvasBaseline}
        strokeWidth={3.5}
      />
    </>
  );
});

/** Pre-filled strokes (e.g. Complete the Monster game) */
export const PrefilledLayer = memo(function PrefilledLayer({
  templates,
  prefilled,
  paths,
  strokeWidth,
}: {
  templates: NormalizedStrokeTemplate[];
  prefilled: number[];
  paths: string[];
  strokeWidth: number;
}) {
  return (
    <>
      {templates.map((t, idx) => {
        if (!prefilled.includes(idx)) return null;
        return (
          <Path
            key={`prefill_${t.strokeNumber}`}
            d={paths[idx]}
            stroke={COLORS.lavenderPurple}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
      })}
    </>
  );
});

/** Guide Paths in WATCH and TRACE modes (the parent hides this layer in WRITE mode) */
export const GuideLayer = memo(function GuideLayer({
  templates,
  prefilled,
  paths,
  size,
  strokeWidthGuide,
  mode,
  highlightedIdx,
  pulseStartBadge,
}: {
  templates: NormalizedStrokeTemplate[];
  prefilled: number[];
  paths: string[];
  size: number;
  strokeWidthGuide: number;
  mode: HandwritingMode;
  highlightedIdx: number;
  pulseStartBadge: boolean;
}) {
  return (
    <>
      {templates.map((t, idx) => {
        if (prefilled.includes(idx)) return null;
        const isDot = t.kind === 'dot';
        const fullPath = paths[idx];
        const isHighlighted = (mode === 'watch' || mode === 'trace') && idx === highlightedIdx;

        return (
          <G key={`guide_${t.strokeNumber}`}>
            {/* Soft background track */}
            <Path
              d={fullPath}
              stroke={isHighlighted ? '#BAE6FD' : '#F1F5F9'}
              strokeWidth={strokeWidthGuide * 1.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* High-contrast dotted path */}
            {isDot ? (
              <Circle
                cx={t.startPoint.x * size}
                cy={t.startPoint.y * size}
                r={strokeWidthGuide * 0.56}
                fill={isHighlighted ? COLORS.coralOrangeLight : '#E2E8F0'}
                stroke={isHighlighted ? COLORS.coralOrange : '#CBD5E1'}
                strokeWidth={3}
                strokeDasharray="5,4"
              />
            ) : (
              <Path
                d={fullPath}
                stroke={isHighlighted ? COLORS.skyBlue : '#CBD5E1'}
                strokeWidth={isHighlighted ? 5 : 3}
                strokeDasharray="10,10"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}

            {/* Directional Arrow near midpoint/end of stroke (only for current highlighted stroke in trace) */}
            {!isDot && t.points.length >= 3 && isHighlighted ? (
              <Polygon
                points={buildArrowPolygon(
                  t.points[Math.max(0, Math.floor(t.points.length * 0.65) - 1)],
                  t.points[Math.floor(t.points.length * 0.65)],
                  size
                )}
                fill={COLORS.skyBlueDark}
              />
            ) : null}

            {/* Start badge (>= 28 dp radius, only highlighted on current stroke) */}
            {isHighlighted ? (
              <G>
                {pulseStartBadge ? (
                  <Circle
                    cx={t.startPoint.x * size}
                    cy={t.startPoint.y * size}
                    r={START_BADGE_RADIUS + 10}
                    fill="rgba(255, 184, 0, 0.28)"
                    stroke={COLORS.sunshineYellow}
                    strokeWidth={3}
                  />
                ) : null}
                <Circle
                  cx={t.startPoint.x * size}
                  cy={t.startPoint.y * size}
                  r={START_BADGE_RADIUS}
                  fill={COLORS.sunshineYellow}
                  stroke="#FFFFFF"
                  strokeWidth={3}
                />
                <SvgText
                  x={t.startPoint.x * size}
                  y={t.startPoint.y * size + 7}
                  fontSize={20}
                  fontWeight="bold"
                  fill={COLORS.textPrimary}
                  textAnchor="middle"
                >
                  ★
                </SvgText>
              </G>
            ) : null}
          </G>
        );
      })}
    </>
  );
});

/** Moving yellow star that marks the tip of an animated demo stroke. */
const DemoTip = ({ tip, size }: { tip: NormalizedPoint; size: number }) => (
  <G>
    <Circle
      cx={tip.x * size}
      cy={tip.y * size}
      r={24}
      fill={COLORS.sunshineYellow}
      stroke="#FFFFFF"
      strokeWidth={3}
    />
    <SvgText
      x={tip.x * size}
      y={tip.y * size + 7}
      fontSize={18}
      fill={COLORS.textPrimary}
      textAnchor="middle"
    >
      ★
    </SvgText>
  </G>
);

/**
 * WATCH mode animated demonstration strokes + moving indicator.
 * Owns its own animation tick state so a tick re-renders only this layer.
 * Mounted only while `mode === 'watch'`.
 */
export const WatchLayer = memo(function WatchLayer({
  templates,
  paths,
  size,
  strokeWidth,
  triggerKey,
  slow,
  onStrokeIndexChange,
  onComplete,
}: {
  templates: NormalizedStrokeTemplate[];
  paths: string[];
  size: number;
  strokeWidth: number;
  triggerKey: number;
  slow: boolean;
  onStrokeIndexChange: (idx: number) => void;
  onComplete?: () => void;
}) {
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [pointCount, setPointCount] = useState(1);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onIndexRef = useRef(onStrokeIndexChange);
  onIndexRef.current = onStrokeIndexChange;

  useEffect(() => {
    if (templates.length === 0) return;

    setStrokeIndex(0);
    setPointCount(1);
    onIndexRef.current(0);

    let sIdx = 0;
    let pCount = 1;
    const intervalMs = slow ? 85 : 55;
    const timer = setInterval(() => {
      const currentStroke = templates[sIdx];
      if (!currentStroke) {
        clearInterval(timer);
        return;
      }
      const totalPts = Math.max(2, currentStroke.points.length);
      if (pCount < totalPts) {
        pCount += 1;
        setPointCount(pCount);
      } else if (sIdx + 1 < templates.length) {
        sIdx += 1;
        pCount = 1;
        setStrokeIndex(sIdx);
        setPointCount(1);
        onIndexRef.current(sIdx);
      } else {
        clearInterval(timer);
        onCompleteRef.current?.();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [templates, triggerKey, slow]);

  return (
    <>
      {templates.map((t, idx) => {
        if (idx > strokeIndex) return null;
        const isCurrent = idx === strokeIndex;
        const pts = isCurrent ? t.points.slice(0, Math.max(1, pointCount)) : t.points;
        const d = isCurrent ? pointsToSvgPath(pts, size) : paths[idx];
        const tip = pts[pts.length - 1] ?? t.startPoint;
        return (
          <G key={`watch_anim_${t.strokeNumber}`}>
            <Path
              d={d}
              stroke={t.isDotOrMark ? COLORS.coralOrange : COLORS.mintGreen}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {isCurrent ? <DemoTip tip={tip} size={size} /> : null}
          </G>
        );
      })}
    </>
  );
});

/**
 * In-place single-stroke demo replay (missed trace stroke, 12s idle, or "Show me" button).
 * Owns its own tick state; the parent remounts it (via `key`) for each new request.
 */
export const InlineDemoLayer = memo(function InlineDemoLayer({
  template,
  size,
  strokeWidth,
  onFinished,
}: {
  template: NormalizedStrokeTemplate;
  size: number;
  strokeWidth: number;
  onFinished: () => void;
}) {
  const [pointCount, setPointCount] = useState(1);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    setPointCount(1);
    let pCount = 1;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const totalPts = Math.max(2, template.points.length);
    const timer = setInterval(() => {
      if (pCount < totalPts) {
        pCount += 1;
        setPointCount(pCount);
      } else {
        clearInterval(timer);
        hideTimer = setTimeout(() => onFinishedRef.current(), 250);
      }
    }, 65);
    return () => {
      clearInterval(timer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [template]);

  const pts = template.points.slice(0, Math.max(1, pointCount));
  const d = pointsToSvgPath(pts, size);
  const tip = pts[pts.length - 1] ?? template.startPoint;
  return (
    <G>
      <Path
        d={d}
        stroke={COLORS.sunshineYellow}
        strokeWidth={strokeWidth * 0.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <DemoTip tip={tip} size={size} />
    </G>
  );
});

/** A single committed/rejected child stroke; its path string is computed once per points array. */
export const StrokePath = memo(function StrokePath({
  points,
  size,
  color,
  strokeWidth,
}: {
  points: NormalizedPoint[];
  size: number;
  color: string;
  strokeWidth: number;
}) {
  const d = useMemo(
    () => pointsToSvgPath(simplifyRdp(points, DISPLAY_SIMPLIFY_EPSILON), size),
    [points, size]
  );
  return (
    <Path
      d={d}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
});

/** Child's completed strokes (green locked-in when perStrokeTrace is active) */
export const RecordedStrokesLayer = memo(function RecordedStrokesLayer({
  strokes,
  size,
  color,
  strokeWidth,
}: {
  strokes: RecordedStroke[];
  size: number;
  color: string;
  strokeWidth: number;
}) {
  return (
    <>
      {strokes.map((stroke, sIdx) => (
        <StrokePath
          key={`child_stroke_${sIdx}`}
          points={stroke.points}
          size={size}
          color={color}
          strokeWidth={strokeWidth}
        />
      ))}
    </>
  );
});

export interface ActiveInkHandle {
  /** Replaces the live ink path. Only this layer re-renders. */
  setPath: (d: string) => void;
}

/**
 * Child's currently active stroke while finger/stylus is moving.
 * Permanently mounted (d = "" when idle) so the ref is never null at touch-grant.
 * The parent pushes at most one update per animation frame via `setPath`.
 */
export const ActiveInkLayer = memo(
  forwardRef<ActiveInkHandle, { strokeWidth: number }>(function ActiveInkLayer(
    { strokeWidth },
    ref
  ) {
    const [d, setD] = useState('');
    useImperativeHandle(ref, () => ({ setPath: setD }), []);
    return (
      <Path
        d={d}
        stroke={COLORS.coralOrange}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    );
  })
);
