import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg from 'react-native-svg';
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
import {
  ActiveInkHandle,
  ActiveInkLayer,
  GuideLayer,
  InlineDemoLayer,
  NotebookLines,
  PrefilledLayer,
  RecordedStrokesLayer,
  StrokePath,
  WatchLayer,
} from './CanvasLayers';
import {
  appendPointThinned,
  createFrameCoalescer,
  enforcePointCap,
  IncrementalSvgPath,
  MAX_STROKE_POINTS,
  pointsToSvgPath,
} from './inkGeometry';
import { createDevTraceFrameMonitor } from './traceFrameMonitor';
import type { TouchActivityKind } from '../lesson/useIdleHint';

// Re-exported for backwards compatibility with existing imports.
export { pointsToSvgPath };

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
  /**
   * Called whenever the child touches, moves, or lifts on the canvas (resets idle ladder).
   * `kind` lets the receiver throttle high-frequency `move` events.
   */
  onTouchActivity?: (kind?: TouchActivityKind) => void;
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

/** Stable default so memoized layers are not invalidated by a fresh `[]` every render. */
const NO_PREFILLED: number[] = [];

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
 * Handwriting canvas.
 *
 * Performance model (trace-freeze fix): the in-progress stroke lives in a ref,
 * never in this component's state. Touch-move events only append to that ref and
 * request one animation-frame flush, which pushes an incrementally-built path
 * string into `ActiveInkLayer` — the only component that re-renders while the
 * finger moves. All static layers are memoized.
 */
export const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({
  mode,
  language,
  templates,
  recordedStrokes,
  onStrokesChange,
  canvasSize,
  watchTriggerKey = 0,
  onWatchComplete,
  prefilledTemplateIndices = NO_PREFILLED,
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
  /** True between touch-grant and pen-up. Changes twice per stroke, never per move. */
  const [isDrawing, setIsDrawing] = useState(false);
  const [rejectedPoints, setRejectedPoints] = useState<NormalizedPoint[]>([]);
  const [shakeShift, setShakeShift] = useState<number>(0);

  // In-place single-stroke demo request (used on missed stroke, 12s idle, or "Show me" button)
  const [inlineDemo, setInlineDemo] = useState<{ strokeIndex: number; key: number } | null>(null);
  const [internalDemoTrigger, setInternalDemoTrigger] = useState<{
    strokeIndex: number;
    key: number;
  } | null>(null);

  const activeStartRef = useRef<number>(0);
  const isDrawingRef = useRef<boolean>(false);
  const strokesRef = useRef<RecordedStroke[]>(recordedStrokes);
  strokesRef.current = recordedStrokes;

  /** The growing in-progress stroke. Mutated in place; never copied per move. */
  const activePointsRef = useRef<NormalizedPoint[]>([]);
  const inkRef = useRef<ActiveInkHandle>(null);
  const inkPathBuilderRef = useRef(new IncrementalSvgPath());

  const templatesRef = useRef<NormalizedStrokeTemplate[]>(templates);
  templatesRef.current = templates;

  const prefilledRef = useRef<number[]>(prefilledTemplateIndices);
  prefilledRef.current = prefilledTemplateIndices;

  const perStrokeTraceRef = useRef<boolean>(perStrokeTrace);
  perStrokeTraceRef.current = perStrokeTrace;

  const thresholdsRef = useRef<ScoringThresholds>(thresholds);
  thresholdsRef.current = thresholds;

  // Routed through a ref so an inline parent callback never recreates the PanResponder.
  const onStrokesChangeRef = useRef(onStrokesChange);
  onStrokesChangeRef.current = onStrokesChange;

  const onTraceStrokeResultRef = useRef(onTraceStrokeResult);
  onTraceStrokeResultRef.current = onTraceStrokeResult;

  const onTouchActivityRef = useRef(onTouchActivity);
  onTouchActivityRef.current = onTouchActivity;

  const canvasSizeRef = useRef(canvasSize);
  canvasSizeRef.current = canvasSize;

  // WATCH mode: only the highlighted stroke index lives here (changes once per stroke).
  // The per-tick point count lives inside WatchLayer.
  const [watchStrokeIndex, setWatchStrokeIndex] = useState(0);

  // Dev-only rAF frame monitor (null in release builds; logs long frames > 50 ms).
  const frameMonitor = useMemo(() => createDevTraceFrameMonitor(), []);

  // At most one ink update per animation frame, regardless of touch event rate.
  const inkCoalescer = useMemo(
    () =>
      createFrameCoalescer(() => {
        const d = inkPathBuilderRef.current.getPath(
          activePointsRef.current,
          canvasSizeRef.current
        );
        inkRef.current?.setPath(d);
      }),
    []
  );

  useEffect(
    () => () => {
      inkCoalescer.cancel();
      frameMonitor?.stop();
    },
    [inkCoalescer, frameMonitor]
  );

  // Single-stroke in-place demo (triggered externally via demoStrokeRequest or internally on missed trace stroke)
  const effectiveDemoRequest = demoStrokeRequest ?? internalDemoTrigger;
  useEffect(() => {
    if (!effectiveDemoRequest || mode === 'watch') {
      setInlineDemo(null);
      return;
    }
    const targetStroke = templates[effectiveDemoRequest.strokeIndex];
    if (!targetStroke) return;
    setInlineDemo({ strokeIndex: effectiveDemoRequest.strokeIndex, key: effectiveDemoRequest.key });
  }, [effectiveDemoRequest, mode, templates]);

  const handleInlineDemoFinished = useCallback(() => setInlineDemo(null), []);

  // Auto-evaluate in WRITE mode ~1.2s after pen-up when recordedStrokes.length >= expected template count
  useEffect(() => {
    if (
      mode !== 'write' ||
      !onAutoEvaluateWrite ||
      templates.length === 0 ||
      recordedStrokes.length < templates.length ||
      isDrawing
    ) {
      return;
    }

    const timer = setTimeout(() => {
      if (!isDrawingRef.current && strokesRef.current.length >= templatesRef.current.length) {
        onAutoEvaluateWrite(strokesRef.current);
      }
    }, autoEvaluateWriteMs);

    return () => clearTimeout(timer);
  }, [mode, onAutoEvaluateWrite, autoEvaluateWriteMs, recordedStrokes, templates.length, isDrawing]);

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
    frameMonitor?.endStroke();
    activePointsRef.current = [];
    inkCoalescer.cancel();
    inkPathBuilderRef.current.reset();
    // Batched with the parent's onStrokesChange below, so the committed stroke
    // replaces the live ink in the same frame (no flicker).
    inkRef.current?.setPath('');
    setIsDrawing(false);

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
          onStrokesChangeRef.current(nextStrokes);
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

    onStrokesChangeRef.current([...strokesRef.current, newStroke]);
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
          onTouchActivityRef.current?.('grant');
          setInlineDemo(null);
          const { locationX, locationY } = evt.nativeEvent;
          const pt: NormalizedPoint = {
            x: clampNormalized(locationX),
            y: clampNormalized(locationY),
            timestamp: Date.now(),
          };
          isDrawingRef.current = true;
          activeStartRef.current = Date.now();
          activePointsRef.current = [pt];
          inkPathBuilderRef.current.reset();
          frameMonitor?.startStroke();
          setIsDrawing(true);
          inkCoalescer.request();
        },
        onPanResponderMove: (evt) => {
          if (mode === 'watch' || !isDrawingRef.current) return;
          const touches = evt.nativeEvent.touches;
          if (touches && touches.length > 1) return;
          if (isLikelyPalmTouch(evt.nativeEvent)) return;
          onTouchActivityRef.current?.('move');
          const { locationX, locationY } = evt.nativeEvent;
          const pt: NormalizedPoint = {
            x: clampNormalized(locationX),
            y: clampNormalized(locationY),
            timestamp: Date.now(),
          };
          const accepted = appendPointThinned(activePointsRef.current, pt);
          if (!accepted) {
            frameMonitor?.recordMoveEvent(false, activePointsRef.current.length);
            return;
          }
          if (activePointsRef.current.length > MAX_STROKE_POINTS) {
            // New array identity => the incremental path builder rebuilds once.
            activePointsRef.current = enforcePointCap(activePointsRef.current);
          }
          frameMonitor?.recordMoveEvent(true, activePointsRef.current.length);
          inkCoalescer.request();
        },
        onPanResponderRelease: () => {
          if (mode === 'watch') return;
          onTouchActivityRef.current?.('release');
          finalizeStroke(activePointsRef.current);
        },
        onPanResponderTerminate: () => {
          if (mode === 'watch') return;
          finalizeStroke(activePointsRef.current);
        },
      }),
    // Created once per (mode, canvasSize); every callback is read through a ref.
    [mode, canvasSize]
  );

  const strokeWidthGuide = Math.max(18, canvasSize * 0.062);
  const strokeWidthChild = Math.max(16, canvasSize * 0.055);

  /** Full guide path strings: recomputed only when templates or size change. */
  const templatePaths = useMemo(
    () => templates.map((t) => pointsToSvgPath(t.points, canvasSize)),
    [templates, canvasSize]
  );

  const remainingTemplateIndices = useMemo(
    () => templates.map((_, idx) => idx).filter((idx) => !prefilledTemplateIndices.includes(idx)),
    [templates, prefilledTemplateIndices]
  );

  const nextExpectedStrokeIdx =
    remainingTemplateIndices[
      Math.min(recordedStrokes.length, Math.max(0, remainingTemplateIndices.length - 1))
    ] ?? 0;

  const highlightedIdx = mode === 'watch' ? watchStrokeIndex : nextExpectedStrokeIdx;
  const activeHintStroke = templates[highlightedIdx];
  const inlineDemoTemplate =
    mode !== 'watch' && inlineDemo !== null ? templates[inlineDemo.strokeIndex] : undefined;

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
          <NotebookLines size={canvasSize} />

          {/* Pre-filled strokes (e.g. Complete the Monster game) */}
          <PrefilledLayer
            templates={templates}
            prefilled={prefilledTemplateIndices}
            paths={templatePaths}
            strokeWidth={strokeWidthChild}
          />

          {/* Guide Paths in WATCH and TRACE modes (strictly hidden in WRITE mode) */}
          {mode !== 'write' ? (
            <GuideLayer
              templates={templates}
              prefilled={prefilledTemplateIndices}
              paths={templatePaths}
              size={canvasSize}
              strokeWidthGuide={strokeWidthGuide}
              mode={mode}
              highlightedIdx={highlightedIdx}
              pulseStartBadge={pulseStartBadge}
            />
          ) : null}

          {/* WATCH mode animated demonstration strokes + moving indicator */}
          {mode === 'watch' && templates.length > 0 ? (
            <WatchLayer
              templates={templates}
              paths={templatePaths}
              size={canvasSize}
              strokeWidth={strokeWidthChild}
              triggerKey={watchTriggerKey}
              slow={slowWatch}
              onStrokeIndexChange={setWatchStrokeIndex}
              onComplete={onWatchComplete}
            />
          ) : null}

          {/* In-place single-stroke demo replay (missed trace stroke, 12s idle, or "Show me" button) */}
          {inlineDemoTemplate && inlineDemo ? (
            <InlineDemoLayer
              key={`inline_demo_${inlineDemo.key}`}
              template={inlineDemoTemplate}
              size={canvasSize}
              strokeWidth={strokeWidthChild}
              onFinished={handleInlineDemoFinished}
            />
          ) : null}

          {/* Child's completed strokes (green locked-in when perStrokeTrace is active) */}
          {mode !== 'watch' ? (
            <RecordedStrokesLayer
              strokes={recordedStrokes}
              size={canvasSize}
              color={
                mode === 'trace' && perStrokeTrace
                  ? COLORS.canvasSuccessStroke
                  : COLORS.canvasActiveStroke
              }
              strokeWidth={strokeWidthChild}
            />
          ) : null}

          {/* Rejected stroke briefly fading out after a miss in TRACE mode */}
          {mode !== 'watch' && rejectedPoints.length > 0 ? (
            <StrokePath
              points={rejectedPoints}
              size={canvasSize}
              color={COLORS.coralOrangeLight}
              strokeWidth={strokeWidthChild}
            />
          ) : null}

          {/* Child's currently active stroke: permanently mounted, d="" when idle */}
          <ActiveInkLayer ref={inkRef} strokeWidth={strokeWidthChild} />
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
