import { BADGE_CATALOG, getLettersByLanguage } from '../../data/curriculum';
import {
  AchievementRecord,
  CurriculumLetter,
  GameId,
  LanguageCode,
  LearningProgressRecord,
  PracticeSessionRecord,
} from '../../types';
import { isSameLocalDay } from '../../utils/dateUtils';

export interface MissionStep {
  index: number;
  type: 'letter' | 'game';
  id: string;
  label: string;
  emoji: string;
  letterId?: string;
  gameId?: GameId;
  completed: boolean;
  /** Route to launch this step, pre-wired with `nextHref` chaining through the rest of the path */
  href: string;
}

export interface TodaysMissionPlan {
  language: LanguageCode;
  goalLettersCount: number;
  steps: MissionStep[];
  completedStepsCount: number;
  isAllDone: boolean;
  nextActiveStep: MissionStep;
  featuredSticker: (typeof BADGE_CATALOG)[number];
}

const MISSION_GAMES_ROTATION: GameId[] = [
  'treasure_hunt',
  'match_picture',
  'write_to_launch',
  'complete_monster',
];

/**
 * Pure function that builds Today's Adventure path (WP6):
 * - Selects N letters (`dailyGoalLetters`): letters in `practicing` or `learning` first,
 *   then `new` letters in curriculum order, then `mastered` letters for review.
 * - Appends 1 mini-game targeting those letters.
 * - Pre-computes chained `nextHref` URLs so each step automatically transitions to the next
 *   without returning to a menu, ending at `/(child)/home?done=1`.
 */
export function buildTodaysMission(options: {
  language: LanguageCode;
  progressMap: Record<string, LearningProgressRecord>;
  dailyGoalLetters: number;
  achievements?: AchievementRecord[];
  completedGameToday?: boolean;
  referenceDate?: Date;
}): TodaysMissionPlan {
  const {
    language,
    progressMap,
    dailyGoalLetters,
    achievements = [],
    completedGameToday = false,
    referenceDate = new Date(),
  } = options;

  const targetCount = Math.max(1, Math.min(6, dailyGoalLetters || 3));
  const allLangLetters = getLettersByLanguage(language);

  // Partition letters by priority:
  // 1. Already practiced today (so the star trail stays stable during the day and lights up!)
  // 2. In `practicing` or `learning` status (or flagged `needsHelp`)
  // 3. `new` (unpracticed)
  // 4. `mastered`
  const practicedTodayLetters: CurriculumLetter[] = [];
  const inProgressLetters: CurriculumLetter[] = [];
  const newLetters: CurriculumLetter[] = [];
  const masteredLetters: CurriculumLetter[] = [];

  for (const letter of allLangLetters) {
    const prog = progressMap[letter.id];
    if (prog && isSameLocalDay(prog.lastPracticed, referenceDate)) {
      practicedTodayLetters.push(letter);
    } else if (
      prog &&
      (prog.masteryStatus === 'practicing' ||
        prog.masteryStatus === 'learning' ||
        prog.needsHelp)
    ) {
      inProgressLetters.push(letter);
    } else if (!prog || prog.masteryStatus === 'new' || prog.attempts === 0) {
      newLetters.push(letter);
    } else {
      masteredLetters.push(letter);
    }
  }

  const orderedCandidates = [
    ...practicedTodayLetters,
    ...inProgressLetters,
    ...newLetters,
    ...masteredLetters,
  ];

  const selectedLetters = orderedCandidates.slice(0, targetCount);

  // Pick a deterministic game for today based on the first selected letter's orderIndex
  const seedOrder = selectedLetters[0]?.orderIndex ?? 0;
  const missionGameId =
    MISSION_GAMES_ROTATION[seedOrder % MISSION_GAMES_ROTATION.length] ?? 'treasure_hunt';

  const letterIdsParam = selectedLetters.map((l) => l.id).join(',');
  const finalHomeHref = `/(child)/home?done=1&lang=${language}`;
  const gameHref = `/(child)/games/${missionGameId}?lang=${language}&mission=1&letters=${encodeURIComponent(
    letterIdsParam
  )}&nextHref=${encodeURIComponent(finalHomeHref)}`;

  // Build letter steps from back to front so each step's `nextHref` chains to the next step!
  const rawLetterSteps: Omit<MissionStep, 'href'>[] = selectedLetters.map((letter, idx) => {
    const prog = progressMap[letter.id];
    const doneToday = Boolean(prog && isSameLocalDay(prog.lastPracticed, referenceDate));
    return {
      index: idx,
      type: 'letter',
      id: letter.id,
      label: letter.character,
      emoji: letter.example.emoji,
      letterId: letter.id,
      completed: doneToday,
    };
  });

  const allLettersCompletedToday =
    rawLetterSteps.length > 0 && rawLetterSteps.every((s) => s.completed);
  const gameCompleted = Boolean(completedGameToday);

  const steps: MissionStep[] = new Array(rawLetterSteps.length + 1);

  // Game step is the final step in the trail
  const gameStepIndex = rawLetterSteps.length;
  steps[gameStepIndex] = {
    index: gameStepIndex,
    type: 'game',
    id: `mission_game_${missionGameId}`,
    label: '🎮',
    emoji: '🚀',
    gameId: missionGameId,
    completed: gameCompleted,
    href: gameHref,
  };

  for (let i = rawLetterSteps.length - 1; i >= 0; i--) {
    const nextStepHref = steps[i + 1].href;
    const item = rawLetterSteps[i];
    steps[i] = {
      ...item,
      href: `/(child)/lesson/${item.letterId}?nextHref=${encodeURIComponent(
        nextStepHref
      )}&stepIndex=${i + 1}&totalSteps=${steps.length}`,
    };
  }

  const completedStepsCount = steps.filter((s) => s.completed).length;
  const isAllDone = allLettersCompletedToday && gameCompleted;
  const nextActiveStep = steps.find((s) => !s.completed) ?? steps[0];

  // Pick a sticker to showcase on mission completion
  const unlockedTypes = new Set(achievements.map((a) => a.achievementType));
  const featuredSticker =
    BADGE_CATALOG.find((b) => unlockedTypes.has(b.type)) ??
    BADGE_CATALOG[seedOrder % BADGE_CATALOG.length] ??
    BADGE_CATALOG[0];

  return {
    language,
    goalLettersCount: targetCount,
    steps,
    completedStepsCount,
    isAllDone,
    nextActiveStep,
    featuredSticker,
  };
}

/**
 * Computes total seconds practiced today on the local calendar day, and whether
 * to display the friendly non-blocking break suggestion (`dailyGoalMinutes`).
 */
export function evaluateDailySessionBreak(options: {
  sessions: PracticeSessionRecord[];
  dailyGoalMinutes: number;
  dismissedBreakToday?: boolean;
  referenceDate?: Date;
}): {
  todaySeconds: number;
  todayMinutes: number;
  shouldSuggestBreak: boolean;
} {
  const {
    sessions,
    dailyGoalMinutes,
    dismissedBreakToday = false,
    referenceDate = new Date(),
  } = options;

  const todaySeconds = sessions
    .filter((s) => isSameLocalDay(s.sessionDate, referenceDate))
    .reduce((acc, s) => acc + Math.max(0, s.durationSeconds), 0);

  const todayMinutes = Math.round(todaySeconds / 60);
  const limitSeconds = Math.max(1, dailyGoalMinutes || 10) * 60;
  const shouldSuggestBreak = !dismissedBreakToday && todaySeconds >= limitSeconds;

  return {
    todaySeconds,
    todayMinutes,
    shouldSuggestBreak,
  };
}
