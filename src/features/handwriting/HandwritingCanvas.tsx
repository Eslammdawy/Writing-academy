import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { COLORS, RADIUS, SHADOWS } from '../../theme/tokens';
import {
  HandwritingMode,
  LanguageCode,
  NormalizedPoint,
  NormalizedStrokeTemplate,
  RecordedStroke,
} from '../../types';

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
}) => {
  const [activePoints, setActivePoints] = useState<NormalizedPoint[]>([]);
  const activeStartRef = useRef<number>(0);
  const strokesRef = useRef<RecordedStroke[]>(recordedStrokes);
  strokesRef.current = recordedStrokes;

  const activePointsRef = useRef<NormalizedPoint[]>([]);
  activePointsRef.current = activePoints;

  // WATCH mode animation state
  const [watchStrokeIndex, setWatchStrokeIndex] = useState(0);
  const [watchPointCount, setWatchPointCount] = useState(1);

  useEffect(() => {
    if (mode !== 'watch' || templates.length === 0) return;

    setWatchStrokeIndex(0);
    setWatchPointCount(1);

    let sIdx = 0;
    let pCount = 1;
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
    }, 55);

    return () => clearInterval(timer);
  }, [mode, templates, watchTriggerKey, onWatchComplete]);

  const clampNormalized = (val: number): number => {
    const normalized = val / Math.max(1, canvasSize);
    return Math.max(0.02, Math.min(0.98, Number(normalized.toFixed(4))));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => mode !== 'watch',
        onMoveShouldSetPanResponder: () => mode !== 'watch',
        onPanResponderGrant: (evt) => {
          if (mode === 'watch') return;
          const { locationX, locationY } = evt.nativeEvent;
          const pt: NormalizedPoint = {
            x: clampNormalized(locationX),
            y: clampNormalized(locationY),
            timestamp: Date.now(),
          };
          activeStartRef.current = Date.now();
          activePointsRef.current = [pt];
          setActivePoints([pt]);
        },
        onPanResponderMove: (evt) => {
          if (mode === 'watch') return;
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
          const finishedPoints = activePointsRef.current;
          if (finishedPoints.length > 0) {
            const newStroke: RecordedStroke = {
              points: finishedPoints,
              startedAt: activeStartRef.current,
              endedAt: Date.now(),
            };
            onStrokesChange([...strokesRef.current, newStroke]);
          }
          activePointsRef.current = [];
          setActivePoints([]);
        },
        onPanResponderTerminate: () => {
          const finishedPoints = activePointsRef.current;
          if (finishedPoints.length > 0) {
            const newStroke: RecordedStroke = {
              points: finishedPoints,
              startedAt: activeStartRef.current,
              endedAt: Date.now(),
            };
            onStrokesChange([...strokesRef.current, newStroke]);
          }
          activePointsRef.current = [];
          setActivePoints([]);
        },
      }),
    [mode, canvasSize, onStrokesChange]
  );

  const strokeWidthGuide = Math.max(18, canvasSize * 0.062);
  const strokeWidthChild = Math.max(16, canvasSize * 0.055);
  const nextExpectedStrokeIdx = Math.min(recordedStrokes.length, Math.max(0, templates.length - 1));
  const activeHintStroke = templates[mode === 'watch' ? watchStrokeIndex : nextExpectedStrokeIdx];

  return (
    <View style={[styles.canvasOuter, SHADOWS.card, { width: canvasSize, height: canvasSize }]}>
      {/* Top-corner direction & mode ribbon */}
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
              ? language === 'ar'
                ? '١. شاهد المسار 👀'
                : '1. Watch 👀'
              : mode === 'trace'
                ? language === 'ar'
                  ? '٢. تتبّع النقاط ☝️'
                  : '2. Trace ☝️'
                : language === 'ar'
                  ? '٣. اكتب بمفردك ✏️'
                  : '3. Write Freehand ✏️'}
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

              return (
                <G key={`guide_${t.strokeNumber}`}>
                  {/* Soft background track */}
                  <Path
                    d={fullPath}
                    stroke={isCurrentTraceTarget ? '#BAE6FD' : '#F1F5F9'}
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
                      r={strokeWidthGuide * 0.52}
                      fill={isCurrentTraceTarget ? COLORS.coralOrangeLight : '#E2E8F0'}
                      stroke={COLORS.coralOrange}
                      strokeWidth={3}
                      strokeDasharray="5,4"
                    />
                  ) : (
                    <Path
                      d={fullPath}
                      stroke={isCurrentTraceTarget ? COLORS.skyBlue : COLORS.canvasGuideStroke}
                      strokeWidth={4}
                      strokeDasharray="10,10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  )}

                  {/* Directional Arrow near midpoint/end of stroke */}
                  {!isDot && t.points.length >= 3 ? (
                    <Polygon
                      points={buildArrowPolygon(
                        t.points[Math.max(0, Math.floor(t.points.length * 0.65) - 1)],
                        t.points[Math.floor(t.points.length * 0.65)],
                        canvasSize
                      )}
                      fill={isCurrentTraceTarget ? COLORS.skyBlueDark : COLORS.canvasGuideStroke}
                    />
                  ) : null}

                  {/* Numbered start badge */}
                  <Circle
                    cx={t.startPoint.x * canvasSize}
                    cy={t.startPoint.y * canvasSize}
                    r={16}
                    fill={
                      isCurrentTraceTarget
                        ? COLORS.sunshineYellow
                        : t.isDotOrMark
                          ? COLORS.coralOrange
                          : COLORS.skyBlueDark
                    }
                  />
                  <SvgText
                    x={t.startPoint.x * canvasSize}
                    y={t.startPoint.y * canvasSize + 5}
                    fontSize={14}
                    fontWeight="bold"
                    fill="#FFFFFF"
                    textAnchor="middle"
                  >
                    {String(t.strokeNumber)}
                  </SvgText>
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
                        r={18}
                        fill={COLORS.sunshineYellow}
                        stroke="#FFFFFF"
                        strokeWidth={3}
                      />
                      <SvgText
                        x={tip.x * canvasSize}
                        y={tip.y * canvasSize + 6}
                        fontSize={16}
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

          {/* Child's completed strokes (kept distinct per stroke) */}
          {mode !== 'watch' &&
            recordedStrokes.map((stroke, sIdx) => (
              <Path
                key={`child_stroke_${sIdx}`}
                d={pointsToSvgPath(stroke.points, canvasSize)}
                stroke={COLORS.canvasActiveStroke}
                strokeWidth={strokeWidthChild}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}

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
    fontSize: 14,
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
    maxWidth: '62%',
  },
  strokeStepText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
