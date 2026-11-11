import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import {
  DEFAULT_BEGINNER_THRESHOLDS,
  evaluateStrokeAgainstTemplate,
  ScoringThresholds,
} from '../../services/scoring/handwritingEvaluator';
import { COLORS, RADIUS, SHADOWS } from '../../theme/tokens';
import {
  HandwritingMode,
  LanguageCode,
  NormalizedPoint,
  NormalizedStrokeTemplate,
  RecordedStroke,
  StrokeEvaluationDetail,
} from '../../types';

export interface TraceStrokeResultEvent {
  passed: boolean;
  strokeIndex: number;
  detail: StrokeEvaluationDetail;
  completedAllStrokes: boolean;
  allStrokes: RecordedStroke[];
}

export interface HandwritingCanvasProps {
  mode: HandwritingMode;
  language: LanguageCode;
  templates: NormalizedStrokeTemplate[];
  recordedStrokes: RecordedStroke[];
  onStrokesChange: (nextStrokes: RecordedStroke[]) => void;
  canvasSize: number;
  watchTriggerKey?: number;
  onWatchComplete?: () => void;
  /** Optional partial pre-drawn strokes (used in Complete the Monster game) */
  prefilledTemplateIndices?: number[];
  /** Enable WP4 per-stroke lock-in & auto-clear in TRACE mode */
  perStrokeTrace?: boolean;
  onTraceStrokeResult?: (event: TraceStrokeResultEvent) => void;
  /** Auto-evaluate in WRITE mode after pen-up when strokes >= template count */
  onAutoEvaluateWrite?: (strokes: RecordedStroke[]) => void;
  autoEvaluateWriteMs?: number;
  /** Called whenever the child touches, moves, or lifts on the canvas (resets idle ladder) */
  onTouchActivity?: () => void;
  /** Pulses the starting star badge (6s idle hint) */
  pulseStartBadge?: boolean;
  /** Replays the animated star demo for a single stroke in-place without switching mode */
  demoStrokeRequest?: { strokeIndex: number; key: number } | null;
  /** Slows down WATCH animation (used after 2 consecutive failed attempts) */
  slowWatch?: boolean;
  /** Custom scoring thresholds (e.g. WIDE_ASSISTED_THRESHOLDS) */
  thresholds?: ScoringThresholds;
  /** Hide top text ribbon in ultra-clean guided mode */
  hideTopRibbon?: boolean;
}

/**
 * Checks whether a touch event looks like a resting palm rather than a finger/stylus tip.
 */
export function isLikelyPalmTouch(nativeEvent: any): boolean {
  if (!nativeEvent) return false;
  const radiusX = Number(nativeEvent.radiusX ?? nativeEvent.touchMajor ?? 0);
  const radiusY = Number(nativeEvent.radiusY ?? nativeEvent.touchMinor ?? 0);
  const majorRadius = Number(nativeEvent.majorAxisRadius ?? 0);
  if (radiusX > 42 || radiusY > 42 || majorRadius > 42) {
    return true;
  }
  return false;
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

export const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({
  mode,
  language,
  templates,
  recordedStrokes,
  onStrokesChange,
  canvasSize,
  watchTriggerKey = 0,
  onWatchComplete,
  prefilledTemplateIndices = [],
  perStrokeTrace = false,
  onTraceStrokeResult,
  onAutoEvaluateWrite,
  autoEvaluateWriteMs = 1200,
  onTouchActivity,
  pulseStartBadge = false,
  demoStrokeRequest = null,
  slowWatch = false,
  thresholds = DEFAULT_BEGINNER_THRESHOLDS,
  hideTopRibbon = false,
}) => {
  const [activePoints, setActivePoints] = useState<NormalizedPoint[]>([]);
  const [rejectedPoints, setRejectedPoints] = useState<NormalizedPoint[]>([]);
  const [shakeShift, setShakeShift] = useState<number>(0);

  // In-place single-stroke demo state (used on missed stroke, 12s idle, or "Show me" button)
  const [inlineDemoStrokeIdx, setInlineDemoStrokeIdx] = useState<number | null>(null);
  const [inlineDemoPointCount, setInlineDemoPointCount] = useState<number>(1);
  const [internalDemoTrigger, setInternalDemoTrigger] = useState<{
    strokeIndex: number;
    key: number;
  } | null>(null);

  const activeStartRef = useRef<number>(0);
  const isDrawingRef = useRef<boolean>(false);
  const strokesRef = useRef<RecordedStroke[]>(recordedStrokes);
  strokesRef.current = recordedStrokes;

  const activePointsRef = useRef<NormalizedPoint[]>([]);
  activePointsRef.current = activePoints;

  const templatesRef = useRef<NormalizedStrokeTemplate[]>(templates);
  templatesRef.current = templates;

  const prefilledRef = useRef<number[]>(prefilledTemplateIndices);
  prefilledRef.current = prefilledTemplateIndices;

  const perStrokeTraceRef = useRef<boolean>(perStrokeTrace);
  perStrokeTraceRef.current = perStrokeTrace;

  const thresholdsRef = useRef<ScoringThresholds>(thresholds);
  thresholdsRef.current = thresholds;

  const onTraceStrokeResultRef = useRef(onTraceStrokeResult);
  onTraceStrokeResultRef.current = onTraceStrokeResult;

  const onTouchActivityRef = useRef(onTouchActivity);
  onTouchActivityRef.current = onTouchActivity;

  // WATCH mode animation state
  const [watchStrokeIndex, setWatchStrokeIndex] = useState(0);
  const [watchPointCount, setWatchPointCount] = useState(1);

  useEffect(() => {
    if (mode !== 'watch' || templates.length === 0) return;

    setWatchStrokeIndex(0);
    setWatchPointCount(1);

    let sIdx = 0;
    let pCount = 1;
    const intervalMs = slowWatch ? 85 : 55;
    const timer = setInterval(() => {
      const currentStroke = templates[sIdx];
      if (!currentStroke) {
        clearInterval(timer);
        return;
      }
      const totalPts = Math.max(2, currentStroke.points.length);
      if (pCount < totalPts) {
        pCount += 1;
        setWatchPointCount(pCount);
      } else if (sIdx + 1 < templates.length) {
        sIdx += 1;
        pCount = 1;
        setWatchStrokeIndex(sIdx);
        setWatchPointCount(1);
      } else {
        clearInterval(timer);
        onWatchComplete?.();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [mode, templates, watchTriggerKey, slowWatch, onWatchComplete]);

  // Single-stroke in-place demo animation (triggered externally via demoStrokeRequest or internally on missed trace stroke)
  const effectiveDemoRequest = demoStrokeRequest ?? internalDemoTrigger;
  useEffect(() => {
    if (!effectiveDemoRequest || mode === 'watch') {
      setInlineDemoStrokeIdx(null);
      return;
    }
    const targetStroke = templates[effectiveDemoRequest.strokeIndex];
    if (!targetStroke) return;

    setInlineDemoStrokeIdx(effectiveDemoRequest.strokeIndex);
    setInlineDemoPointCount(1);

    let pCount = 1;
    const totalPts = Math.max(2, targetStroke.points.length);
    const timer = setInterval(() => {
      if (pCount < totalPts) {
        pCount += 1;
        setInlineDemoPointCount(pCount);
      } else {
        clearInterval(timer);
        setTimeout(() => {
          setInlineDemoStrokeIdx(null);
        }, 250);
      }
    }, 65);

    return () => clearInterval(timer);
  }, [effectiveDemoRequest, mode, templates]);

  // Auto-evaluate in WRITE mode ~1.2s after pen-up when recordedStrokes.length >= expected template count
  useEffect(() => {
    if (
      mode !== 'write' ||
      !onAutoEvaluateWrite ||
      templates.length === 0 ||
      recordedStrokes.length < templates.length ||
      activePoints.length > 0
    ) {
      return;
    }

    const timer = setTimeout(() => {
      if (!isDrawingRef.current && strokesRef.current.length >= templatesRef.current.length) {
        onAutoEvaluateWrite(strokesRef.current);
      }
    }, autoEvaluateWriteMs);

    return () => clearTimeout(timer);
  }, [
    mode,
    onAutoEvaluateWrite,
    autoEvaluateWriteMs,
    recordedStrokes,
    templates.length,
    activePoints.length,
  ]);

  const clampNormalized = (val: number): number => {
    const normalized = val / Math.max(1, canvasSize);
    return Math.max(0.02, Math.min(0.98, Number(normalized.toFixed(4))));
  };

  const triggerSoftShakeAndFade = (pts: NormalizedPoint[], strokeIdxToReplay: number) => {
    setRejectedPoints(pts);
    setShakeShift(-8);
    setTimeout(() => setShakeShift(8), 70);
    setTimeout(() => setShakeShift(-5), 140);
    setTimeout(() => setShakeShift(0), 210);
    setTimeout(() => {
      setRejectedPoints([]);
      setInternalDemoTrigger({ strokeIndex: strokeIdxToReplay, key: Date.now() });
    }, 360);
  };

  const finalizeStroke = (finishedPoints: NormalizedPoint[]) => {
    isDrawingRef.current = false;
    activePointsRef.current = [];
    setActivePoints([]);

    if (finishedPoints.length === 0) return;

    const newStroke: RecordedStroke = {
      points: finishedPoints,
      startedAt: activeStartRef.current,
      endedAt: Date.now(),
    };

    // Per-stroke evaluation in TRACE mode (WP4)
    if (mode === 'trace' && perStrokeTraceRef.current && templatesRef.current.length > 0) {
      const currentLockedCount = strokesRef.current.length;
      // Account for prefilled templates (e.g. Complete the Monster)
      const remainingTemplateIndices = templatesRef.current
        .map((_, idx) => idx)
        .filter((idx) => !prefilledRef.current.includes(idx));
      const targetTemplateIdx =
        remainingTemplateIndices[
          Math.min(currentLockedCount, Math.max(0, remainingTemplateIndices.length - 1))
        ] ?? 0;
      const expectedTemplate = templatesRef.current[targetTemplateIdx];

      if (expectedTemplate) {
        const detail = evaluateStrokeAgainstTemplate(
          expectedTemplate,
          finishedPoints,
          'trace',
          thresholdsRef.current
        );

        if (detail.matched) {
          const nextStrokes = [...strokesRef.current, newStroke];
          onStrokesChange(nextStrokes);
          const completedAllStrokes = nextStrokes.length >= remainingTemplateIndices.length;
          onTraceStrokeResultRef.current?.({
            passed: true,
            strokeIndex: targetTemplateIdx,
            detail,
            completedAllStrokes,
            allStrokes: nextStrokes,
          });
        } else {
          // Soft shake, fade out rejected stroke automatically, and replay demo for just this stroke
          triggerSoftShakeAndFade(finishedPoints, targetTemplateIdx);
          onTraceStrokeResultRef.current?.({
            passed: false,
            strokeIndex: targetTemplateIdx,
            detail,
            completedAllStrokes: false,
            allStrokes: strokesRef.current,
          });
        }
        return;
      }
    }

    onStrokesChange([...strokesRef.current, newStroke]);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          if (mode === 'watch') return false;
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length > 1) return false;
          if (isLikelyPalmTouch(evt.nativeEvent)) return false;
          return true;
        },
        onMoveShouldSetPanResponder: (evt) => {
          if (mode === 'watch') return false;
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length > 1) return false;
          if (isLikelyPalmTouch(evt.nativeEvent)) return false;
          return true;
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (mode === 'watch') return;
          if (isLikelyPalmTouch(evt.nativeEvent)) return;
          onTouchActivityRef.current?.();
          setInlineDemoStrokeIdx(null);
          const { locationX, locationY } = evt.nativeEvent;
          const pt: NormalizedPoint = {
            x: clampNormalized(locationX),
            y: clampNormalized(locationY),
            timestamp: Date.now(),
          };
          isDrawingRef.current = true;
          activeStartRef.current = Date.now();
          activePointsRef.current = [pt];
          setActivePoints([pt]);
        },
        onPanResponderMove: (evt) => {
          if (mode === 'watch' || !isDrawingRef.current) return;
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length > 1) return;
          if (isLikelyPalmTouch(evt.nativeEvent)) return;
          onTouchActivityRef.current?.();
          const { locationX, locationY } = evt.nativeEvent;
          const pt: NormalizedPoint = {
            x: clampNormalized(locationX),
            y: clampNormalized(locationY),
            timestamp: Date.now(),
          };
          const prev = activePointsRef.current;
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
            if (dist < 0.008) return;
          }
          const next = [...prev, pt];
          activePointsRef.current = next;
          setActivePoints(next);
        },
        onPanResponderRelease: () => {
          if (mode === 'watch') return;
          onTouchActivityRef.current?.();
          finalizeStroke(activePointsRef.current);
        },
        onPanResponderTerminate: () => {
          if (mode === 'watch') return;
          finalizeStroke(activePointsRef.current);
        },
      }),
    [mode, canvasSize, onStrokesChange]
  );

  const strokeWidthGuide = Math.max(18, canvasSize * 0.062);
  const strokeWidthChild = Math.max(16, canvasSize * 0.055);

  const remainingTemplateIndices = useMemo(
    () => templates.map((_, idx) => idx).filter((idx) => !prefilledTemplateIndices.includes(idx)),
    [templates, prefilledTemplateIndices]
  );

  const nextExpectedStrokeIdx =
    remainingTemplateIndices[
      Math.min(recordedStrokes.length, Math.max(0, remainingTemplateIndices.length - 1))
    ] ?? 0;

  const activeHintStroke = templates[mode === 'watch' ? watchStrokeIndex : nextExpectedStrokeIdx];
  const startBadgeRadius = 28; // WP4: >= 28 dp radius

  return (
    <View
      style={[
        styles.canvasOuter,
        SHADOWS.card,
        {
          width: canvasSize,
          height: canvasSize,
          transform: [{ translateX: shakeShift }],
        },
      ]}
    >
      {/* Top-corner direction & mode ribbon (hidden in ultra-clean guided mode if requested) */}
      {!hideTopRibbon ? (
        <View style={styles.cornerBadgeRow} pointerEvents="none">
          <View
            style={[
              styles.modeBadge,
              {
                backgroundColor:
                  mode === 'watch'
                    ? COLORS.lavenderPurpleLight
                    : mode === 'trace'
                      ? COLORS.skyBlueLight
                      : COLORS.mintGreenLight,
              },
            ]}
          >
            <Text style={styles.modeBadgeText}>
              {mode === 'watch'
                ? '👀'
                : mode === 'trace'
                  ? '☝️'
                  : '✏️'}
            </Text>
          </View>

          {activeHintStroke ? (
            <View style={styles.strokeStepPill}>
              <Text style={styles.strokeStepText}>
                {language === 'ar'
                  ? activeHintStroke.instructionAr
                  : activeHintStroke.instructionEn}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.svgTouchSurface} {...panResponder.panHandlers}>
        <Svg width={canvasSize} height={canvasSize}>
          {/* Subtle notebook writing lines (Cap line, Midline, Baseline) */}
          <Line
            x1={canvasSize * 0.08}
            y1={canvasSize * 0.2}
            x2={canvasSize * 0.92}
            y2={canvasSize * 0.2}
            stroke={COLORS.canvasMidline}
            strokeWidth={2}
            strokeDasharray="6,6"
          />
          <Line
            x1={canvasSize * 0.08}
            y1={canvasSize * 0.47}
            x2={canvasSize * 0.92}
            y2={canvasSize * 0.47}
            stroke={COLORS.canvasMidline}
            strokeWidth={2}
            strokeDasharray="8,8"
          />
          <Line
            x1={canvasSize * 0.06}
            y1={canvasSize * 0.75}
            x2={canvasSize * 0.94}
            y2={canvasSize * 0.75}
            stroke={COLORS.canvasBaseline}
            strokeWidth={3.5}
          />

          {/* Pre-filled strokes (e.g. Complete the Monster game) */}
          {templates.map((t, idx) => {
            if (!prefilledTemplateIndices.includes(idx)) return null;
            return (
              <Path
                key={`prefill_${t.strokeNumber}`}
                d={pointsToSvgPath(t.points, canvasSize)}
                stroke={COLORS.lavenderPurple}
                strokeWidth={strokeWidthChild}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            );
          })}

          {/* Guide Paths in WATCH and TRACE modes (strictly hidden in WRITE mode) */}
          {mode !== 'write' &&
            templates.map((t, idx) => {
              if (prefilledTemplateIndices.includes(idx)) return null;
              const isDot = t.kind === 'dot';
              const fullPath = pointsToSvgPath(t.points, canvasSize);
              const isCurrentTraceTarget = mode === 'trace' && idx === nextExpectedStrokeIdx;
              const isHighlighted = mode === 'watch' ? idx === watchStrokeIndex : isCurrentTraceTarget;

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
                      cx={t.startPoint.x * canvasSize}
                      cy={t.startPoint.y * canvasSize}
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
                        canvasSize
                      )}
                      fill={COLORS.skyBlueDark}
                    />
                  ) : null}

                  {/* Start badge (>= 28 dp radius, only highlighted on current stroke) */}
                  {isHighlighted ? (
                    <G>
                      {pulseStartBadge ? (
                        <Circle
                          cx={t.startPoint.x * canvasSize}
                          cy={t.startPoint.y * canvasSize}
                          r={startBadgeRadius + 10}
                          fill="rgba(255, 184, 0, 0.28)"
                          stroke={COLORS.sunshineYellow}
                          strokeWidth={3}
                        />
                      ) : null}
                      <Circle
                        cx={t.startPoint.x * canvasSize}
                        cy={t.startPoint.y * canvasSize}
                        r={startBadgeRadius}
                        fill={COLORS.sunshineYellow}
                        stroke="#FFFFFF"
                        strokeWidth={3}
                      />
                      <SvgText
                        x={t.startPoint.x * canvasSize}
                        y={t.startPoint.y * canvasSize + 7}
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

          {/* WATCH mode animated demonstration strokes + moving indicator */}
          {mode === 'watch' &&
            templates.map((t, idx) => {
              if (idx > watchStrokeIndex) return null;
              const pts =
                idx < watchStrokeIndex
                  ? t.points
                  : t.points.slice(0, Math.max(1, watchPointCount));
              const d = pointsToSvgPath(pts, canvasSize);
              const tip = pts[pts.length - 1] ?? t.startPoint;
              return (
                <G key={`watch_anim_${t.strokeNumber}`}>
                  <Path
                    d={d}
                    stroke={t.isDotOrMark ? COLORS.coralOrange : COLORS.mintGreen}
                    strokeWidth={strokeWidthChild}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {idx === watchStrokeIndex ? (
                    <G>
                      <Circle
                        cx={tip.x * canvasSize}
                        cy={tip.y * canvasSize}
                        r={24}
                        fill={COLORS.sunshineYellow}
                        stroke="#FFFFFF"
                        strokeWidth={3}
                      />
                      <SvgText
                        x={tip.x * canvasSize}
                        y={tip.y * canvasSize + 7}
                        fontSize={18}
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

          {/* In-place single-stroke demo replay (missed trace stroke, 12s idle, or "Show me" button) */}
          {mode !== 'watch' &&
            inlineDemoStrokeIdx !== null &&
            templates[inlineDemoStrokeIdx] ? (
              <G>
                {(() => {
                  const t = templates[inlineDemoStrokeIdx]!;
                  const pts = t.points.slice(0, Math.max(1, inlineDemoPointCount));
                  const d = pointsToSvgPath(pts, canvasSize);
                  const tip = pts[pts.length - 1] ?? t.startPoint;
                  return (
                    <>
                      <Path
                        d={d}
                        stroke={COLORS.sunshineYellow}
                        strokeWidth={strokeWidthChild * 0.9}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      <Circle
                        cx={tip.x * canvasSize}
                        cy={tip.y * canvasSize}
                        r={24}
                        fill={COLORS.sunshineYellow}
                        stroke="#FFFFFF"
                        strokeWidth={3}
                      />
                      <SvgText
                        x={tip.x * canvasSize}
                        y={tip.y * canvasSize + 7}
                        fontSize={18}
                        fill={COLORS.textPrimary}
                        textAnchor="middle"
                      >
                        ★
                      </SvgText>
                    </>
                  );
                })()}
              </G>
            ) : null}

          {/* Child's completed strokes (green locked-in when perStrokeTrace is active) */}
          {mode !== 'watch' &&
            recordedStrokes.map((stroke, sIdx) => (
              <Path
                key={`child_stroke_${sIdx}`}
                d={pointsToSvgPath(stroke.points, canvasSize)}
                stroke={
                  mode === 'trace' && perStrokeTrace
                    ? COLORS.canvasSuccessStroke
                    : COLORS.canvasActiveStroke
                }
                strokeWidth={strokeWidthChild}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}

          {/* Rejected stroke briefly fading out after a miss in TRACE mode */}
          {mode !== 'watch' && rejectedPoints.length > 0 ? (
            <Path
              d={pointsToSvgPath(rejectedPoints, canvasSize)}
              stroke={COLORS.coralOrangeLight}
              strokeWidth={strokeWidthChild}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}

          {/* Child's currently active stroke while finger/stylus is moving */}
          {mode !== 'watch' && activePoints.length > 0 ? (
            <Path
              d={pointsToSvgPath(activePoints, canvasSize)}
              stroke={COLORS.coralOrange}
              strokeWidth={strokeWidthChild}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  canvasOuter: {
    backgroundColor: COLORS.canvasBackground,
    borderRadius: RADIUS.xl,
    borderWidth: 4,
    borderColor: COLORS.skyBlueLight,
    overflow: 'hidden',
    position: 'relative',
  },
  svgTouchSurface: {
    flex: 1,
  },
  cornerBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  modeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  modeBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  strokeStepPill: {
    backgroundColor: 'rgba(255, 246, 232, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#FDE68A',
    maxWidth: '72%',
  },
  strokeStepText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
