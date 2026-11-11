export type LanguageCode = 'en' | 'ar';

export type ArabicPositionalFormKey = 'isolated' | 'initial' | 'medial' | 'final';
export type EnglishFormKey = 'uppercase' | 'lowercase';
export type LetterFormKey = ArabicPositionalFormKey | EnglishFormKey;

export type HarakatKey = 'none' | 'fatha' | 'kasra' | 'damma';

export interface NormalizedPoint {
  /** Normalized X coordinate in [0, 1] (0 = left, 1 = right) */
  x: number;
  /** Normalized Y coordinate in [0, 1] (0 = top, 1 = bottom) */
  y: number;
  /** Optional timestamp (ms) for velocity/timing telemetry */
  timestamp?: number;
}

export type StrokeKind = 'line' | 'curve' | 'loop' | 'dot' | 'hamza';

export interface NormalizedStrokeTemplate {
  strokeNumber: number;
  kind: StrokeKind;
  /** Ordered normalized points [0..1] defining the ideal path */
  points: NormalizedPoint[];
  startPoint: NormalizedPoint;
  endPoint: NormalizedPoint;
  /** Expected primary direction in degrees or semantic label */
  directionLabel: string;
  /** Spoken/visual hint for 5-6 year olds */
  instructionEn: string;
  instructionAr: string;
  /** Whether this stroke is an Arabic dot or hamza mark */
  isDotOrMark?: boolean;
}

export interface ArabicPositionalForms {
  isolated: string;
  initial: string;
  medial: string;
  final: string;
}

export interface HarakatVariant {
  key: HarakatKey;
  symbol: string;
  displayWithLetter: string;
  soundLabelEn: string;
  soundLabelAr: string;
  phoneticHint: string;
}

export interface WordExample {
  id: string;
  word: string;
  transliteration?: string;
  meaningEn: string;
  meaningAr: string;
  emoji: string;
  illustrationKey: string;
  letters: string[];
  sentenceEn?: string;
  sentenceAr?: string;
}

export interface CurriculumLetter {
  id: string;
  language: LanguageCode;
  orderIndex: number;
  /** Primary display character (Uppercase for EN, Isolated for AR) */
  character: string;
  /** Lowercase character for English */
  lowercaseCharacter?: string;
  /** Name of the letter (e.g. "Alef / ألف" or "A /エイ") */
  nameEn: string;
  nameAr: string;
  /** Phonetic sound description */
  soundLabel: string;
  /** Spoken TTS phrase when pronounced */
  ttsPrompt: string;
  /** Bundled offline audio asset key */
  pronunciationAsset: string;
  /** Difficulty tier 1 (easiest) to 3 */
  difficultyLevel: 1 | 2 | 3;
  /** Visual similarity group ID to prevent confusing distractors early on */
  visualGroup: string;
  /** Arabic-specific metadata */
  arabicForms?: ArabicPositionalForms;
  /** True if the Arabic letter does NOT connect to the following letter (أ د ذ ر ز و) */
  nonJoiningAfter?: boolean;
  /** Number of dots on this Arabic letter (0, 1, 2, or 3) */
  dotCount?: 0 | 1 | 2 | 3;
  /** Dot position relative to letter body */
  dotPlacement?: 'none' | 'above' | 'below' | 'inside';
  /** Whether the letter carries a Hamza mark */
  hasHamza?: boolean;
  /** Harakat variants for Arabic letters */
  harakatVariants?: HarakatVariant[];
  /** Primary example word & picture */
  example: WordExample;
  /** Secondary example word for games & word builder */
  secondaryExample?: WordExample;
  /** Normalized stroke templates keyed by form ('uppercase'|'lowercase' or 'isolated'|'initial'|'medial'|'final') */
  strokeTemplates: Partial<Record<LetterFormKey, NormalizedStrokeTemplate[]>>;
}

export type MasteryStatus = 'new' | 'learning' | 'practicing' | 'mastered';

export type HandwritingMode = 'watch' | 'trace' | 'write';

export interface RecordedStroke {
  points: NormalizedPoint[];
  startedAt: number;
  endedAt: number;
}

export interface StrokeEvaluationDetail {
  strokeNumber: number;
  kind: StrokeKind;
  matched: boolean;
  coverageScore: number;
  similarityScore: number;
  startAccuracyScore: number;
  endAccuracyScore: number;
  directionCorrect: boolean;
}

export interface HandwritingEvaluationResult {
  scoringVersion: string;
  mode: HandwritingMode;
  formKey: LetterFormKey;
  overallScore: number; // 0 to 100
  starsEarned: 1 | 2 | 3;
  passed: boolean;
  coverageScore: number;
  similarityScore: number;
  strokeOrderScore: number;
  startEndScore: number;
  dotsAndMarksScore: number;
  strokeDetails: StrokeEvaluationDetail[];
  encouragementTitleEn: string;
  encouragementTitleAr: string;
  gentleHintEn: string;
  gentleHintAr: string;
}

export type AvatarId =
  | 'explorer_fox'
  | 'star_owl'
  | 'sunny_lion'
  | 'mint_turtle'
  | 'cosmic_bunny'
  | 'rainbow_dolphin';

export interface ChildProfile {
  id: string;
  name: string;
  avatar: AvatarId;
  preferredLanguage: LanguageCode;
  starsCount: number;
  createdAt: string;
}

export interface LearningProgressRecord {
  id: string;
  childId: string;
  letterId: string;
  recognitionScore: number;
  tracingScore: number;
  independentWritingScore: number;
  attempts: number;
  successfulAttempts: number;
  masteryStatus: MasteryStatus;
  lastPracticed: string | null;
  needsHelp?: boolean;
  consecutiveFails?: number;
}

export interface PracticeSessionRecord {
  id: string;
  childId: string;
  language: LanguageCode;
  sessionDate: string;
  durationSeconds: number;
  score: number;
}

export interface PracticeAttemptRecord {
  id: string;
  childId: string;
  letterId: string;
  formKey: LetterFormKey;
  mode: HandwritingMode;
  metricsJson: string;
  scoringVersion: string;
  score: number;
  createdAt: string;
}

export type AchievementType =
  | 'first_letter_traced'
  | 'first_independent_write'
  | 'brave_retry'
  | 'five_english_letters'
  | 'five_arabic_letters'
  | 'dots_detective'
  | 'word_builder_star'
  | 'rocket_launcher'
  | 'monster_helper'
  | 'treasure_hunter'
  | 'review_champion'
  | 'alphabet_explorer';

export interface AchievementRecord {
  id: string;
  childId: string;
  achievementType: AchievementType;
  achievedAt: string;
}

export interface ParentSettingsRecord {
  id: number;
  pinHash: string;
  pinHintShown: boolean;
  dailyGoalMinutes: number;
  dailyGoalLetters: number;
  audioEnabled: boolean;
  narrationEnabled: boolean;
  soundEffectsVolume: number;
  guidedMode?: boolean;
  exploreMode?: boolean;
}

export type GameId =
  | 'treasure_hunt'
  | 'match_picture'
  | 'write_to_launch'
  | 'complete_monster'
  | 'letter_challenge';
