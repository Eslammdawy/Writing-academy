import { getLetterById } from '../../data/curriculum';
import {
  DEFAULT_BEGINNER_THRESHOLDS,
  evaluateHandwritingAttempt,
  evaluateStrokeAgainstTemplate,
  ScoringThresholds,
  WIDE_ASSISTED_THRESHOLDS,
} from '../../services/scoring/handwritingEvaluator';
import {
  CurriculumLetter,
  LetterFormKey,
  NormalizedPoint,
  NormalizedStrokeTemplate,
  RecordedStroke,
} from '../../types';

export type LessonPhase =
  | 'INTRO'
  | 'WATCH'
  | 'TRACE'
  | 'WRITE'
  | 'HELP'
  | 'CELEBRATE'
  | 'GENTLE_SKIP'
  | 'DONE';

export const INTRO_DURATION_MS = 4200;
export const CELEBRATE_DURATION_MS = 3000;
export const GENTLE_SKIP_DURATION_MS = 3000;

export interface LessonMachineState {
  letterId: string;
  phase: LessonPhase;
  forms: LetterFormKey[];
  formIndex: number;
  currentForm: LetterFormKey;
  strokeIndex: number;
  totalStrokesInForm: number;
  tracedStrokes: RecordedStroke[];
  writeStrokes: RecordedStroke[];
  /** Missed strokes within the current attempt */
  strokeMissCountInAttempt: number;
  /** Consecutive failed attempts across the current letter (drives fail-soft ladder) */
  consecutiveFails: number;
  /** Slower WATCH animation enabled after 2 consecutive fails */
  slowWatch: boolean;
  /** Wider scoring tolerance enabled for 1 attempt after 2 consecutive fails */
  useWideThresholds: boolean;
  /** Set true when 3 consecutive fails trigger GENTLE_SKIP */
  flaggedNeedsHelp: boolean;
  /** Final stars earned (1 for effort on gentle skip, 1..3 on celebrate) */
  starsEarned: 1 | 2 | 3;
  /** Final overall score [0..100] */
  overallScore: number;
  /** Last narration key triggered by the state transition */
  lastNarrationKey: string | null;
}

export type LessonEvent =
  | { type: 'INTRO_COMPLETE' }
  | { type: 'WATCH_COMPLETE' }
  | { type: 'TRACE_STROKE_DRAWN'; points: NormalizedPoint[]; startedAt?: number; endedAt?: number }
  | { type: 'WRITE_SUBMIT'; strokes: RecordedStroke[] }
  | { type: 'IDLE_STUCK' }
  | { type: 'REQUEST_SHOW_ME' }
  | { type: 'CELEBRATE_COMPLETE' }
  | { type: 'GENTLE_SKIP_COMPLETE' };

export function getPrimaryFormsForLetter(letter: CurriculumLetter): LetterFormKey[] {
  if (letter.language === 'en') {
    return ['uppercase', 'lowercase'];
  }
  return ['isolated'];
}

export function getTemplatesForForm(
  letter: CurriculumLetter,
  formKey: LetterFormKey
): NormalizedStrokeTemplate[] {
  return (
    letter.strokeTemplates[formKey] ??
    letter.strokeTemplates[letter.language === 'ar' ? 'isolated' : 'uppercase'] ??
    []
  );
}

export function createInitialLessonState(letterOrId: CurriculumLetter | string): LessonMachineState {
  const letter =
    typeof letterOrId === 'string'
      ? getLetterById(letterOrId) ?? getLetterById('en_A')!
      : letterOrId;
  const forms = getPrimaryFormsForLetter(letter);
  const currentForm = forms[0];
  const templates = getTemplatesForForm(letter, currentForm);

  return {
    letterId: letter.id,
    phase: 'INTRO',
    forms,
    formIndex: 0,
    currentForm,
    strokeIndex: 0,
    totalStrokesInForm: templates.length,
    tracedStrokes: [],
    writeStrokes: [],
    strokeMissCountInAttempt: 0,
    consecutiveFails: 0,
    slowWatch: false,
    useWideThresholds: false,
    flaggedNeedsHelp: false,
    starsEarned: 3,
    overallScore: 0,
    lastNarrationKey: 'lesson.intro',
  };
}

export function getActiveThresholdsForState(state: LessonMachineState): ScoringThresholds {
  return state.useWideThresholds ? WIDE_ASSISTED_THRESHOLDS : DEFAULT_BEGINNER_THRESHOLDS;
}

/**
 * Applies the WP4 fail-soft ladder when an attempt fails or the child is stuck for 25s:
 * - 1st fail: retry current phase (`lesson.retry`)
 * - 2nd consecutive fail: return to WATCH with slower animation and wider tolerance for this attempt only
 * - 3rd consecutive fail: GENTLE_SKIP (award 1 effort star, say `lesson.gentleSkip`, flag letter `needsHelp`, move on)
 */
function applyFailSoftEscalation(state: LessonMachineState): LessonMachineState {
  const nextFails = state.consecutiveFails + 1;

  if (nextFails >= 3) {
    return {
      ...state,
      phase: 'GENTLE_SKIP',
      consecutiveFails: nextFails,
      flaggedNeedsHelp: true,
      starsEarned: 1,
      overallScore: Math.max(state.overallScore, 45),
      tracedStrokes: [],
      writeStrokes: [],
      strokeIndex: 0,
      strokeMissCountInAttempt: 0,
      lastNarrationKey: 'lesson.gentleSkip',
    };
  }

  if (nextFails === 2) {
    return {
      ...state,
      phase: 'WATCH',
      consecutiveFails: nextFails,
      slowWatch: true,
      useWideThresholds: true,
      tracedStrokes: [],
      writeStrokes: [],
      strokeIndex: 0,
      strokeMissCountInAttempt: 0,
      lastNarrationKey: 'lesson.watch',
    };
  }

  // 1st fail -> stay in TRACE or WRITE, clear current attempt strokes, encourage retry
  return {
    ...state,
    consecutiveFails: nextFails,
    tracedStrokes: [],
    writeStrokes: [],
    strokeIndex: 0,
    strokeMissCountInAttempt: 0,
    lastNarrationKey: 'lesson.retry',
  };
}

/**
 * Pure, deterministic state machine reducer for the Guided Lesson Runner (WP3 & WP4).
 */
export function lessonReducer(
  state: LessonMachineState,
  event: LessonEvent
): LessonMachineState {
  const letter = getLetterById(state.letterId) ?? getLetterById('en_A')!;
  const templates = getTemplatesForForm(letter, state.currentForm);
  const thresholds = getActiveThresholdsForState(state);

  switch (event.type) {
    case 'INTRO_COMPLETE': {
      if (state.phase !== 'INTRO') return state;
      return {
        ...state,
        phase: 'WATCH',
        strokeIndex: 0,
        lastNarrationKey: 'lesson.watch',
      };
    }

    case 'WATCH_COMPLETE': {
      if (state.phase !== 'WATCH' && state.phase !== 'HELP') return state;
      return {
        ...state,
        phase: 'TRACE',
        strokeIndex: 0,
        tracedStrokes: [],
        strokeMissCountInAttempt: 0,
        lastNarrationKey: 'lesson.trace.start',
      };
    }

    case 'TRACE_STROKE_DRAWN': {
      if (state.phase !== 'TRACE') return state;
      const expectedTemplate = templates[state.strokeIndex];
      if (!expectedTemplate) return state;

      const detail = evaluateStrokeAgainstTemplate(
        expectedTemplate,
        event.points,
        'trace',
        thresholds
      );

      if (detail.matched) {
        const recorded: RecordedStroke = {
          points: event.points,
          startedAt: event.startedAt ?? 1000,
          endedAt: event.endedAt ?? 1500,
        };
        const nextTraced = [...state.tracedStrokes, recorded];
        const nextStrokeIdx = state.strokeIndex + 1;

        if (nextStrokeIdx >= templates.length) {
          // Completed all trace strokes for this form -> automatically advance to WRITE!
          return {
            ...state,
            phase: 'WRITE',
            tracedStrokes: nextTraced,
            writeStrokes: [],
            strokeIndex: 0,
            strokeMissCountInAttempt: 0,
            lastNarrationKey: 'lesson.write.start',
          };
        }

        return {
          ...state,
          tracedStrokes: nextTraced,
          strokeIndex: nextStrokeIdx,
          strokeMissCountInAttempt: 0,
          lastNarrationKey: 'lesson.stroke.ok',
        };
      }

      // Stroke missed
      const nextMisses = state.strokeMissCountInAttempt + 1;
      if (nextMisses >= 2) {
        // 2 missed strokes in this trace attempt counts as a failed attempt on the fail-soft ladder
        return applyFailSoftEscalation(state);
      }

      return {
        ...state,
        strokeMissCountInAttempt: nextMisses,
        lastNarrationKey: 'lesson.stroke.retry',
      };
    }

    case 'WRITE_SUBMIT': {
      if (state.phase !== 'WRITE') return state;
      const evalRes = evaluateHandwritingAttempt(
        'write',
        state.currentForm,
        templates,
        event.strokes,
        thresholds
      );

      if (evalRes.passed) {
        const nextFormIndex = state.formIndex + 1;
        const bestScore =
          state.overallScore > 0
            ? Math.round((state.overallScore + evalRes.overallScore) / 2)
            : evalRes.overallScore;

        if (nextFormIndex < state.forms.length) {
          // Advance to next mini-round (e.g. English lowercase after uppercase)
          const nextForm = state.forms[nextFormIndex];
          const nextTemplates = getTemplatesForForm(letter, nextForm);
          return {
            ...state,
            phase: 'WATCH',
            formIndex: nextFormIndex,
            currentForm: nextForm,
            totalStrokesInForm: nextTemplates.length,
            strokeIndex: 0,
            tracedStrokes: [],
            writeStrokes: [],
            strokeMissCountInAttempt: 0,
            consecutiveFails: 0,
            slowWatch: false,
            useWideThresholds: false,
            overallScore: bestScore,
            starsEarned: evalRes.starsEarned,
            lastNarrationKey: 'lesson.lowercaseIntro',
          };
        }

        // All forms for this letter completed! Move to CELEBRATE
        return {
          ...state,
          phase: 'CELEBRATE',
          writeStrokes: event.strokes,
          overallScore: bestScore,
          starsEarned: evalRes.starsEarned,
          slowWatch: false,
          useWideThresholds: false,
          lastNarrationKey: 'lesson.success',
        };
      }

      // Failed WRITE evaluation -> escalate on fail-soft ladder
      return applyFailSoftEscalation(state);
    }

    case 'IDLE_STUCK': {
      if (state.phase !== 'TRACE' && state.phase !== 'WRITE') return state;
      return applyFailSoftEscalation(state);
    }

    case 'REQUEST_SHOW_ME': {
      return {
        ...state,
        lastNarrationKey: 'lesson.watch',
      };
    }

    case 'CELEBRATE_COMPLETE': {
      if (state.phase !== 'CELEBRATE') return state;
      return {
        ...state,
        phase: 'DONE',
      };
    }

    case 'GENTLE_SKIP_COMPLETE': {
      if (state.phase !== 'GENTLE_SKIP') return state;
      return {
        ...state,
        phase: 'DONE',
      };
    }

    default:
      return state;
  }
}

/**
 * Timer-driven wrapper around `lessonReducer` so automated tests and UI screens can run
 * the entire automatic guided lesson flow (`INTRO -> WATCH -> TRACE -> WRITE -> CELEBRATE -> DONE`)
 * without manual button taps.
 */
export class GuidedLessonRunner {
  private state: LessonMachineState;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(state: LessonMachineState) => void>();

  constructor(
    letterOrId: CurriculumLetter | string,
    private readonly timingConfig = {
      introMs: INTRO_DURATION_MS,
      watchMs: 1200,
      celebrateMs: CELEBRATE_DURATION_MS,
      gentleSkipMs: GENTLE_SKIP_DURATION_MS,
    }
  ) {
    this.state = createInitialLessonState(letterOrId);
  }

  getState(): LessonMachineState {
    return this.state;
  }

  subscribe(listener: (state: LessonMachineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    this.scheduleAutoPhaseTransition();
  }

  stop(): void {
    this.clearPhaseTimer();
  }

  dispatch(event: LessonEvent): LessonMachineState {
    const prevPhase = this.state.phase;
    const prevFormIdx = this.state.formIndex;
    this.state = lessonReducer(this.state, event);
    if (this.state.phase !== prevPhase || this.state.formIndex !== prevFormIdx) {
      this.scheduleAutoPhaseTransition();
    }
    for (const listener of this.listeners) {
      listener(this.state);
    }
    return this.state;
  }

  private clearPhaseTimer(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private scheduleAutoPhaseTransition(): void {
    this.clearPhaseTimer();
    const { phase } = this.state;

    if (phase === 'INTRO') {
      this.phaseTimer = setTimeout(() => {
        this.dispatch({ type: 'INTRO_COMPLETE' });
      }, this.timingConfig.introMs);
    } else if (phase === 'WATCH') {
      this.phaseTimer = setTimeout(() => {
        this.dispatch({ type: 'WATCH_COMPLETE' });
      }, this.timingConfig.watchMs);
    } else if (phase === 'CELEBRATE') {
      this.phaseTimer = setTimeout(() => {
        this.dispatch({ type: 'CELEBRATE_COMPLETE' });
      }, this.timingConfig.celebrateMs);
    } else if (phase === 'GENTLE_SKIP') {
      this.phaseTimer = setTimeout(() => {
        this.dispatch({ type: 'GENTLE_SKIP_COMPLETE' });
      }, this.timingConfig.gentleSkipMs);
    }
  }
}
