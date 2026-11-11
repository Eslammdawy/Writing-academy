import {
  HandwritingEvaluationResult,
  HandwritingMode,
  LetterFormKey,
  NormalizedPoint,
  NormalizedStrokeTemplate,
  RecordedStroke,
  StrokeEvaluationDetail,
} from '../../types';

export const SCORING_VERSION = '1.0.0-deterministic';

export interface ScoringThresholds {
  /** Maximum Euclidean distance in normalized [0..1] space to count a template point as covered */
  coverageRadiusTrace: number;
  coverageRadiusWrite: number;
  /** Maximum radius for start/end anchor accuracy */
  endpointRadius: number;
  /** Maximum radius for dot/hamza placement */
  dotRadius: number;
  /** Minimum overall score [0..100] to pass and advance */
  passThreshold: number;
  twoStarThreshold: number;
  threeStarThreshold: number;
}

export const DEFAULT_BEGINNER_THRESHOLDS: ScoringThresholds = {
  coverageRadiusTrace: 0.14,
  coverageRadiusWrite: 0.19,
  endpointRadius: 0.22,
  dotRadius: 0.18,
  passThreshold: 55,
  twoStarThreshold: 70,
  threeStarThreshold: 84,
};

export function euclideanDistance(a: NormalizedPoint, b: NormalizedPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalizes a set of recorded strokes for independent WRITE mode so a 5-6 year old who draws
 * the letter slightly larger/smaller or slightly shifted on the blank canvas is evaluated fairly
 * on their shape, stroke order, direction, and relative dot placement.
 */
export function alignStrokesToTemplateBounds(
  childStrokes: RecordedStroke[],
  templates: NormalizedStrokeTemplate[]
): RecordedStroke[] {
  const allChildPts = childStrokes.flatMap((s) => s.points);
  const allTempPts = templates.flatMap((t) => t.points);
  if (allChildPts.length < 3 || allTempPts.length < 2) {
    return childStrokes;
  }

  const cMinX = Math.min(...allChildPts.map((p) => p.x));
  const cMaxX = Math.max(...allChildPts.map((p) => p.x));
  const cMinY = Math.min(...allChildPts.map((p) => p.y));
  const cMaxY = Math.max(...allChildPts.map((p) => p.y));

  const tMinX = Math.min(...allTempPts.map((p) => p.x));
  const tMaxX = Math.max(...allTempPts.map((p) => p.x));
  const tMinY = Math.min(...allTempPts.map((p) => p.y));
  const tMaxY = Math.max(...allTempPts.map((p) => p.y));

  const cSpan = Math.max(cMaxX - cMinX, cMaxY - cMinY, 0.12);
  const tSpan = Math.max(tMaxX - tMinX, tMaxY - tMinY, 0.12);

  // Reject tiny accidental taps that have almost zero span
  if (cSpan < 0.13) {
    return childStrokes;
  }

  // Blend 55% toward template bounding center & scale so size/alignment still matters (45% raw)
  const cCenterX = (cMinX + cMaxX) / 2;
  const cCenterY = (cMinY + cMaxY) / 2;
  const tCenterX = (tMinX + tMaxX) / 2;
  const tCenterY = (tMinY + tMaxY) / 2;

  const scaleFactor = Math.max(0.65, Math.min(1.45, tSpan / cSpan));
  const blendedScale = 1 + (scaleFactor - 1) * 0.55;

  return childStrokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((pt) => {
      const shiftedX = (pt.x - cCenterX) * blendedScale + (cCenterX * 0.45 + tCenterX * 0.55);
      const shiftedY = (pt.y - cCenterY) * blendedScale + (cCenterY * 0.45 + tCenterY * 0.55);
      return {
        x: Math.max(0, Math.min(1, Number(shiftedX.toFixed(4)))),
        y: Math.max(0, Math.min(1, Number(shiftedY.toFixed(4)))),
        timestamp: pt.timestamp,
      };
    }),
  }));
}

/**
 * Evaluates a single child stroke against a single template stroke.
 */
function evaluateSingleStroke(
  childPts: NormalizedPoint[],
  template: NormalizedStrokeTemplate,
  coverageRadius: number,
  thresholds: ScoringThresholds
): StrokeEvaluationDetail {
  if (childPts.length === 0) {
    return {
      strokeNumber: template.strokeNumber,
      kind: template.kind,
      matched: false,
      coverageScore: 0,
      similarityScore: 0,
      startAccuracyScore: 0,
      endAccuracyScore: 0,
      directionCorrect: false,
    };
  }

  // Special handling for Arabic/English dot strokes (short taps or tiny circles)
  if (template.kind === 'dot' || template.isDotOrMark) {
    const center = template.points[Math.floor(template.points.length / 2)] ?? template.startPoint;
    const childCenter = {
      x: childPts.reduce((acc, p) => acc + p.x, 0) / childPts.length,
      y: childPts.reduce((acc, p) => acc + p.y, 0) / childPts.length,
    };
    const dist = euclideanDistance(center, childCenter);
    const radius = template.kind === 'dot' ? thresholds.dotRadius : thresholds.endpointRadius;
    const score = Math.max(0, Math.min(100, Math.round((1 - dist / (radius * 1.6)) * 100)));
    const matched = dist <= radius * 1.25;
    return {
      strokeNumber: template.strokeNumber,
      kind: template.kind,
      matched,
      coverageScore: score,
      similarityScore: score,
      startAccuracyScore: score,
      endAccuracyScore: score,
      directionCorrect: matched,
    };
  }

  // 1. Path coverage: percentage of template points within coverageRadius of any child point
  let coveredCount = 0;
  let totalMinDistToChild = 0;
  for (const tPt of template.points) {
    let minD = Infinity;
    for (const cPt of childPts) {
      const d = euclideanDistance(tPt, cPt);
      if (d < minD) minD = d;
    }
    totalMinDistToChild += minD;
    if (minD <= coverageRadius) {
      coveredCount++;
    }
  }
  const coverageRatio = coveredCount / Math.max(1, template.points.length);
  const coverageScore = Math.round(coverageRatio * 100);

  // 2. Shape similarity (precision): how close child points stay to the template path
  let totalMinDistToTemplate = 0;
  for (const cPt of childPts) {
    let minD = Infinity;
    for (const tPt of template.points) {
      const d = euclideanDistance(cPt, tPt);
      if (d < minD) minD = d;
    }
    totalMinDistToTemplate += minD;
  }
  const avgDist =
    (totalMinDistToChild / Math.max(1, template.points.length) +
      totalMinDistToTemplate / Math.max(1, childPts.length)) /
    2;
  const similarityScore = Math.max(
    0,
    Math.min(100, Math.round((1 - avgDist / (coverageRadius * 1.75)) * 100))
  );

  // 3. Start and End accuracy + Direction check
  const childStart = childPts[0];
  const childEnd = childPts[childPts.length - 1];
  const startDist = euclideanDistance(childStart, template.startPoint);
  const endDist = euclideanDistance(childEnd, template.endPoint);
  const reversedStartDist = euclideanDistance(childStart, template.endPoint);
  const reversedEndDist = euclideanDistance(childEnd, template.startPoint);

  const startAccuracyScore = Math.max(
    0,
    Math.min(100, Math.round((1 - startDist / (thresholds.endpointRadius * 1.7)) * 100))
  );
  const endAccuracyScore = Math.max(
    0,
    Math.min(100, Math.round((1 - endDist / (thresholds.endpointRadius * 1.7)) * 100))
  );

  const isClosedLoop =
    template.kind === 'loop' ||
    euclideanDistance(template.startPoint, template.endPoint) < 0.08;
  const directionCorrect = isClosedLoop
    ? startDist <= thresholds.endpointRadius * 1.5
    : startDist + endDist <= reversedStartDist + reversedEndDist + 0.06;

  const matched = coverageScore >= 50 && similarityScore >= 45;

  return {
    strokeNumber: template.strokeNumber,
    kind: template.kind,
    matched,
    coverageScore,
    similarityScore,
    startAccuracyScore,
    endAccuracyScore,
    directionCorrect,
  };
}

/**
 * Deterministic, explainable handwriting evaluation function for WATCH, TRACE, and WRITE modes.
 * Never counts guide templates as child input.
 */
export function evaluateHandwritingAttempt(
  mode: HandwritingMode,
  formKey: LetterFormKey,
  templates: NormalizedStrokeTemplate[],
  rawChildStrokes: RecordedStroke[],
  thresholds: ScoringThresholds = DEFAULT_BEGINNER_THRESHOLDS
): HandwritingEvaluationResult {
  if (mode === 'watch') {
    return {
      scoringVersion: SCORING_VERSION,
      mode,
      formKey,
      overallScore: 100,
      starsEarned: 3,
      passed: true,
      coverageScore: 100,
      similarityScore: 100,
      strokeOrderScore: 100,
      startEndScore: 100,
      dotsAndMarksScore: 100,
      strokeDetails: [],
      encouragementTitleEn: 'Great Watching!',
      encouragementTitleAr: 'مشاهدة رائعة!',
      gentleHintEn: 'Now let’s trace the letter together!',
      gentleHintAr: 'الآن هيا نتتبع الحرف معًا!',
    };
  }

  // Filter out empty strokes
  const validChildStrokes = rawChildStrokes.filter((s) => s.points.length >= 1);

  if (validChildStrokes.length === 0 || templates.length === 0) {
    return {
      scoringVersion: SCORING_VERSION,
      mode,
      formKey,
      overallScore: 0,
      starsEarned: 1,
      passed: false,
      coverageScore: 0,
      similarityScore: 0,
      strokeOrderScore: 0,
      startEndScore: 0,
      dotsAndMarksScore: 0,
      strokeDetails: templates.map((t) => ({
        strokeNumber: t.strokeNumber,
        kind: t.kind,
        matched: false,
        coverageScore: 0,
        similarityScore: 0,
        startAccuracyScore: 0,
        endAccuracyScore: 0,
        directionCorrect: false,
      })),
      encouragementTitleEn: 'Let’s Give It a Try!',
      encouragementTitleAr: 'هيا نحاول معًا!',
      gentleHintEn: 'Touch the starting star and draw along the path.',
      gentleHintAr: 'المس نجمة البداية وارسم على المسار.',
    };
  }

  const coverageRadius =
    mode === 'trace' ? thresholds.coverageRadiusTrace : thresholds.coverageRadiusWrite;

  const preparedStrokes =
    mode === 'write'
      ? alignStrokesToTemplateBounds(validChildStrokes, templates)
      : validChildStrokes;

  const bodyTemplates = templates.filter((t) => !t.isDotOrMark && t.kind !== 'dot');
  const markTemplates = templates.filter((t) => t.isDotOrMark || t.kind === 'dot');

  const usedChildIndices = new Set<number>();
  const strokeDetails: StrokeEvaluationDetail[] = [];
  let inOrderMatches = 0;
  let lastMatchedChildIdx = -1;

  // Evaluate each template stroke in expected order
  for (let tIdx = 0; tIdx < templates.length; tIdx++) {
    const template = templates[tIdx];

    // Prefer matching corresponding child stroke index, or best remaining child stroke
    let bestDetail: StrokeEvaluationDetail | null = null;
    let bestChildIdx = -1;
    let bestCombined = -1;

    for (let cIdx = 0; cIdx < preparedStrokes.length; cIdx++) {
      if (usedChildIndices.has(cIdx)) continue;
      const detail = evaluateSingleStroke(
        preparedStrokes[cIdx].points,
        template,
        coverageRadius,
        thresholds
      );
      const orderBonus = cIdx === tIdx ? 8 : 0;
      const combined = detail.coverageScore * 0.55 + detail.similarityScore * 0.45 + orderBonus;
      if (combined > bestCombined) {
        bestCombined = combined;
        bestDetail = detail;
        bestChildIdx = cIdx;
      }
    }

    // Fallback if child combined multiple body strokes into one continuous stroke
    if (
      (!bestDetail || bestDetail.coverageScore < 35) &&
      !template.isDotOrMark &&
      preparedStrokes.length > 0
    ) {
      const mergedPoints = preparedStrokes.flatMap((s) => s.points);
      const mergedDetail = evaluateSingleStroke(mergedPoints, template, coverageRadius, thresholds);
      if (!bestDetail || mergedDetail.coverageScore > bestDetail.coverageScore) {
        bestDetail = mergedDetail;
      }
    }

    if (bestDetail && bestChildIdx >= 0 && bestDetail.coverageScore >= 30) {
      usedChildIndices.add(bestChildIdx);
      if (bestChildIdx > lastMatchedChildIdx) {
        inOrderMatches++;
        lastMatchedChildIdx = bestChildIdx;
      }
    }

    strokeDetails.push(
      bestDetail ?? {
        strokeNumber: template.strokeNumber,
        kind: template.kind,
        matched: false,
        coverageScore: 0,
        similarityScore: 0,
        startAccuracyScore: 0,
        endAccuracyScore: 0,
        directionCorrect: false,
      }
    );
  }

  const avg = (vals: number[]) =>
    vals.length === 0 ? 100 : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

  const coverageScore = avg(strokeDetails.map((d) => d.coverageScore));
  const similarityScore = avg(strokeDetails.map((d) => d.similarityScore));
  const startEndScore = avg(
    strokeDetails.map((d) =>
      Math.round(
        (d.startAccuracyScore + d.endAccuracyScore) * 0.4 + (d.directionCorrect ? 20 : 0)
      )
    )
  );

  const strokeCountRatio =
    Math.min(validChildStrokes.length, templates.length) /
    Math.max(validChildStrokes.length, templates.length);
  const orderRatio = inOrderMatches / Math.max(1, templates.length);
  const strokeOrderScore = Math.round((strokeCountRatio * 0.5 + orderRatio * 0.5) * 100);

  const markDetails = strokeDetails.filter((d) =>
    markTemplates.some((m) => m.strokeNumber === d.strokeNumber)
  );
  const dotsAndMarksScore =
    markTemplates.length === 0
      ? 100
      : avg(markDetails.map((d) => Math.round((d.coverageScore + d.similarityScore) / 2)));

  // Weighted overall score
  const hasMarks = markTemplates.length > 0;
  const overallScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        coverageScore * (hasMarks ? 0.34 : 0.42) +
          similarityScore * (hasMarks ? 0.28 : 0.34) +
          startEndScore * 0.14 +
          strokeOrderScore * 0.1 +
          (hasMarks ? dotsAndMarksScore * 0.14 : 0)
      )
    )
  );

  const passed =
    overallScore >= thresholds.passThreshold &&
    ( !hasMarks || dotsAndMarksScore >= 45 ) &&
    coverageScore >= (bodyTemplates.length > 0 ? 48 : 40);

  const starsEarned: 1 | 2 | 3 =
    overallScore >= thresholds.threeStarThreshold && passed
      ? 3
      : overallScore >= thresholds.twoStarThreshold && passed
        ? 2
        : 1;

  // Select warm, specific encouragement and gentle hints for 5-6 year olds
  let encouragementTitleEn = 'Wonderful Writing!';
  let encouragementTitleAr = 'كتابة رائعة!';
  let gentleHintEn = 'You traced every part so smoothly!';
  let gentleHintAr = 'لقد رسمت جميع أجزاء الحرف بمهارة!';

  if (hasMarks && dotsAndMarksScore < 50) {
    encouragementTitleEn = 'Great Effort!';
    encouragementTitleAr = 'محاولة جميلة!';
    gentleHintEn = 'Don’t forget to place the letter dots in their spot!';
    gentleHintAr = 'لا تنسَ وضع نقاط الحرف في مكانها الصحيح!';
  } else if (coverageScore < 55) {
    encouragementTitleEn = 'Nice Start!';
    encouragementTitleAr = 'بداية جميلة!';
    gentleHintEn = 'You missed a little part — try following the whole curve.';
    gentleHintAr = 'بقي جزء صغير، حاول إكمال مسار الحرف للنهاية.';
  } else if (strokeDetails.some((d) => !d.directionCorrect)) {
    encouragementTitleEn = 'Good Job!';
    encouragementTitleAr = 'عمل جيد!';
    gentleHintEn = 'Try starting right on the glowing star and follow the arrow.';
    gentleHintAr = 'ابدأ من النجمة المضيئة واتبع اتجاه السهم.';
  } else if (starsEarned === 2) {
    encouragementTitleEn = 'Super Job!';
    encouragementTitleAr = 'أحسنت صنعًا!';
    gentleHintEn = 'Your lines look great! One more try can make it 3 stars!';
    gentleHintAr = 'خطوطك جميلة جدًا! محاولة أخرى وتنال ٣ نجوم!';
  }

  return {
    scoringVersion: SCORING_VERSION,
    mode,
    formKey,
    overallScore,
    starsEarned,
    passed,
    coverageScore,
    similarityScore,
    strokeOrderScore,
    startEndScore,
    dotsAndMarksScore,
    strokeDetails,
    encouragementTitleEn,
    encouragementTitleAr,
    gentleHintEn,
    gentleHintAr,
  };
}
