import {
  DEFAULT_BEGINNER_THRESHOLDS,
  evaluateHandwritingAttempt,
  ScoringThresholds,
} from '../../services/scoring/handwritingEvaluator';
import {
  HandwritingEvaluationResult,
  LetterFormKey,
  NormalizedStrokeTemplate,
  RecordedStroke,
} from '../../types';

/**
 * Evaluates a canvas round in `write_to_launch` or `complete_monster` honestly (WP5, fixes P12).
 * Never passes on `recordedStrokes.length >= 1` alone — requires actual geometric trace match.
 */
export function evaluateGameCanvasRound(
  gameMode: 'write_to_launch' | 'complete_monster',
  formKey: LetterFormKey,
  fullTemplates: NormalizedStrokeTemplate[],
  recordedStrokes: RecordedStroke[],
  thresholds: ScoringThresholds = DEFAULT_BEGINNER_THRESHOLDS
): HandwritingEvaluationResult {
  const templatesToCheck =
    gameMode === 'complete_monster' && fullTemplates.length > 1
      ? [fullTemplates[fullTemplates.length - 1]]
      : fullTemplates;

  return evaluateHandwritingAttempt(
    'trace',
    formKey,
    templatesToCheck,
    recordedStrokes,
    thresholds
  );
}

/**
 * Computes a round score [0..100] for a recognition tap round based on wrong taps before success.
 */
export function computeChoiceRoundScore(wrongTapsInRound: number): number {
  if (wrongTapsInRound <= 0) return 100;
  if (wrongTapsInRound === 1) return 80;
  if (wrongTapsInRound === 2) return 65;
  return 55;
}

/**
 * Aggregates round scores and elapsed time into an honest game outcome for `recordPractice`.
 */
export function aggregateGameOutcome(
  roundScores: number[],
  elapsedMs: number
): {
  score: number;
  starsEarned: 1 | 2 | 3;
  durationSeconds: number;
  passed: boolean;
} {
  const validScores = roundScores.length > 0 ? roundScores : [0];
  const avgScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    )
  );
  const passed = avgScore >= DEFAULT_BEGINNER_THRESHOLDS.passThreshold;
  const starsEarned: 1 | 2 | 3 =
    avgScore >= DEFAULT_BEGINNER_THRESHOLDS.threeStarThreshold && passed
      ? 3
      : avgScore >= DEFAULT_BEGINNER_THRESHOLDS.twoStarThreshold && passed
        ? 2
        : 1;
  const durationSeconds = Math.max(5, Math.round(Math.max(1000, elapsedMs) / 1000));

  return {
    score: avgScore,
    starsEarned,
    durationSeconds,
    passed,
  };
}

/**
 * Computes honest score, stars, and duration for a Word Builder completion (fixes P12).
 */
export function computeWordBuilderOutcome(
  letterCount: number,
  wrongTapCount: number,
  elapsedMs: number
): {
  score: number;
  starsEarned: 1 | 2 | 3;
  durationSeconds: number;
  passed: boolean;
} {
  const totalExpected = Math.max(1, letterCount);
  const penalty = Math.min(45, wrongTapCount * Math.round(36 / totalExpected));
  const score = Math.max(55, Math.min(100, 100 - penalty));
  const starsEarned: 1 | 2 | 3 =
    score >= 85 ? 3 : score >= 70 ? 2 : 1;
  const durationSeconds = Math.max(5, Math.round(Math.max(1000, elapsedMs) / 1000));

  return {
    score,
    starsEarned,
    durationSeconds,
    passed: true,
  };
}
