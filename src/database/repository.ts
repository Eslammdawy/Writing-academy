import { ALL_LETTERS } from '../data/curriculum';
import {
  AchievementRecord,
  AchievementType,
  AvatarId,
  ChildProfile,
  HandwritingMode,
  LanguageCode,
  LearningProgressRecord,
  LetterFormKey,
  MasteryStatus,
  ParentSettingsRecord,
  PracticeAttemptRecord,
  PracticeSessionRecord,
} from '../types';
import { DEFAULT_PARENT_PIN_HASH, hashParentPin, verifyParentPin } from '../utils/pinSecurity';
import { MIGRATION_SQL_V1, MIGRATION_SQL_V2_STATEMENTS, SCHEMA_VERSION } from './schema';

/**
 * Forward-only SQLite migration runner (WP8).
 * Safely upgrades an existing v1 database (or fresh database) to SCHEMA_VERSION = 2
 * using `schema_migrations` without dropping or resetting existing child data.
 */
export async function runForwardMigrations(sqliteDb: any): Promise<number[]> {
  if (!sqliteDb) return [];
  const appliedNow: number[] = [];
  const nowIso = new Date().toISOString();

  // Always ensure base v1 tables exist (`CREATE TABLE IF NOT EXISTS ...`)
  await sqliteDb.execAsync(MIGRATION_SQL_V1);

  const appliedRows: { version: number }[] =
    (await sqliteDb.getAllAsync('SELECT version FROM schema_migrations ORDER BY version ASC')) ??
    [];
  const appliedVersions = new Set<number>(appliedRows.map((r) => Number(r.version)));

  if (!appliedVersions.has(1)) {
    await sqliteDb.runAsync(
      'INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, ?)',
      [nowIso]
    );
    appliedVersions.add(1);
    appliedNow.push(1);
  }

  if (SCHEMA_VERSION >= 2 && !appliedVersions.has(2)) {
    for (const statement of MIGRATION_SQL_V2_STATEMENTS) {
      try {
        await sqliteDb.execAsync(statement);
      } catch {
        // Ignore duplicate column errors if migration was partially applied previously
      }
    }
    await sqliteDb.runAsync(
      'INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (2, ?)',
      [nowIso]
    );
    appliedVersions.add(2);
    appliedNow.push(2);
  }

  return appliedNow;
}

/**
 * Computes mastery status deterministically.
 * Mastery requires repeated success across attempts (at least 3 successful attempts AND
 * strong tracing + independent writing/recognition performance), never a single attempt.
 */
export function computeMasteryStatus(
  attempts: number,
  successfulAttempts: number,
  recognitionScore: number,
  tracingScore: number,
  independentWritingScore: number
): MasteryStatus {
  if (attempts <= 0) return 'new';
  if (
    successfulAttempts >= 3 &&
    tracingScore >= 65 &&
    (independentWritingScore >= 60 || recognitionScore >= 75)
  ) {
    return 'mastered';
  }
  if (successfulAttempts >= 2 || tracingScore >= 60 || independentWritingScore >= 55) {
    return 'practicing';
  }
  return 'learning';
}

export interface RecordPracticeInput {
  childId: string;
  letterId: string;
  formKey: LetterFormKey;
  mode: HandwritingMode | 'recognition';
  score: number;
  passed: boolean;
  starsEarned: number;
  scoringVersion: string;
  metricsJson: string;
  durationSeconds: number;
  hasDotsReward?: boolean;
  isRetry?: boolean;
  needsHelp?: boolean;
  consecutiveFails?: number;
}

export interface AcademyRepository {
  initialize(): Promise<void>;
  getChildren(): Promise<ChildProfile[]>;
  getChildById(childId: string): Promise<ChildProfile | undefined>;
  updateChildProfile(childId: string, name: string, avatar: AvatarId, preferredLanguage?: LanguageCode): Promise<ChildProfile>;
  addChildProfile(name: string, avatar: AvatarId, preferredLanguage?: LanguageCode): Promise<ChildProfile>;
  getProgressForChild(childId: string): Promise<Record<string, LearningProgressRecord>>;
  recordPracticeOutcome(input: RecordPracticeInput): Promise<{
    updatedProgress: LearningProgressRecord;
    newAchievements: AchievementType[];
    updatedChild: ChildProfile;
  }>;
  getAchievementsForChild(childId: string): Promise<AchievementRecord[]>;
  unlockAchievement(childId: string, type: AchievementType): Promise<boolean>;
  getSessionsForChild(childId: string): Promise<PracticeSessionRecord[]>;
  getAttemptsForChild(childId: string): Promise<PracticeAttemptRecord[]>;
  getParentSettings(): Promise<ParentSettingsRecord>;
  updateParentSettings(partial: Partial<Omit<ParentSettingsRecord, 'id' | 'pinHash'>>): Promise<ParentSettingsRecord>;
  verifyPin(inputPin: string): Promise<boolean>;
  updateParentPin(newPin: string): Promise<void>;
  resetChildProgress(childId: string): Promise<void>;
  resetAllProgress(): Promise<void>;
}

/**
 * Durable repository backed by Expo SQLite on Android/iOS with an identical in-memory
 * storage engine when running inside Jest or non-SQLite environments.
 */
export class LocalAcademyRepository implements AcademyRepository {
  private sqliteDb: any = null;
  private initialized = false;

  // In-memory state mirror for instant synchronous/asynchronous consistency & Jest testing
  private childrenMap = new Map<string, ChildProfile>();
  private progressMap = new Map<string, LearningProgressRecord>(); // key: `${childId}:${letterId}`
  private sessions: PracticeSessionRecord[] = [];
  private attempts: PracticeAttemptRecord[] = [];
  private achievementsMap = new Map<string, AchievementRecord>(); // key: `${childId}:${type}`
  private parentSettings: ParentSettingsRecord = {
    id: 1,
    pinHash: DEFAULT_PARENT_PIN_HASH,
    pinHintShown: false,
    dailyGoalMinutes: 10,
    dailyGoalLetters: 3,
    audioEnabled: true,
    narrationEnabled: true,
    soundEffectsVolume: 0.85,
    guidedMode: true,
    exploreMode: false,
  };

  constructor(private readonly forceInMemory = false, customSqliteDb: any = null) {
    if (customSqliteDb) {
      this.sqliteDb = customSqliteDb;
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.seedDefaultsInMemory();

    if (this.sqliteDb) {
      await runForwardMigrations(this.sqliteDb);
      await this.syncWithSqliteOnBoot();
    } else if (!this.forceInMemory) {
      try {
        // Dynamically load expo-sqlite when running in Expo native runtime
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const SQLite = require('expo-sqlite');
        if (SQLite && typeof SQLite.openDatabaseAsync === 'function') {
          this.sqliteDb = await SQLite.openDatabaseAsync('soufy_nadine_academy.db');
          await runForwardMigrations(this.sqliteDb);
          await this.syncWithSqliteOnBoot();
        }
      } catch {
        // Fallback gracefully to in-memory store (e.g., Jest test environment)
        this.sqliteDb = null;
      }
    }

    this.initialized = true;
  }

  private seedDefaultsInMemory(): void {
    const now = '2026-11-11T08:00:00.000Z';
    const soufy: ChildProfile = {
      id: 'child_soufy',
      name: 'Soufy',
      avatar: 'explorer_fox',
      preferredLanguage: 'en',
      starsCount: 0,
      createdAt: now,
    };
    const nadine: ChildProfile = {
      id: 'child_nadine',
      name: 'Nadine',
      avatar: 'star_owl',
      preferredLanguage: 'ar',
      starsCount: 0,
      createdAt: now,
    };
    this.childrenMap.set(soufy.id, soufy);
    this.childrenMap.set(nadine.id, nadine);
  }

  private async syncWithSqliteOnBoot(): Promise<void> {
    if (!this.sqliteDb) return;

    // 1. Seed parent settings if empty
    const settingsRow = await this.sqliteDb.getFirstAsync(
      'SELECT * FROM parent_settings WHERE id = 1'
    );
    if (!settingsRow) {
      await this.sqliteDb.runAsync(
        `INSERT INTO parent_settings (id, pin_hash_or_secure_representation, pin_hint_shown, daily_goal_minutes, daily_goal_letters, audio_enabled, narration_enabled, sound_effects_volume, guided_mode, explore_mode)
         VALUES (1, ?, 0, 10, 3, 1, 1, 0.85, 1, 0)`,
        [DEFAULT_PARENT_PIN_HASH]
      );
    } else {
      this.parentSettings = {
        id: 1,
        pinHash: settingsRow.pin_hash_or_secure_representation,
        pinHintShown: Boolean(settingsRow.pin_hint_shown),
        dailyGoalMinutes: Number(settingsRow.daily_goal_minutes ?? 10),
        dailyGoalLetters: Number(settingsRow.daily_goal_letters ?? 3),
        audioEnabled: Boolean(settingsRow.audio_enabled ?? 1),
        narrationEnabled: Boolean(settingsRow.narration_enabled ?? 1),
        soundEffectsVolume: Number(settingsRow.sound_effects_volume ?? 0.85),
        guidedMode:
          settingsRow.guided_mode === undefined ? true : Boolean(settingsRow.guided_mode),
        exploreMode:
          settingsRow.explore_mode === undefined ? false : Boolean(settingsRow.explore_mode),
      };
    }

    // 2. Seed curriculum letters table if empty
    const letterCountRow = await this.sqliteDb.getFirstAsync(
      'SELECT COUNT(*) as cnt FROM letters'
    );
    if (!letterCountRow || Number(letterCountRow.cnt) < ALL_LETTERS.length) {
      for (const letter of ALL_LETTERS) {
        await this.sqliteDb.runAsync(
          `INSERT OR REPLACE INTO letters (id, language, character, lowercase_character, isolated_form, initial_form, medial_form, final_form, example_word, pronunciation_asset, illustration_asset, difficulty_level)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            letter.id,
            letter.language,
            letter.character,
            letter.lowercaseCharacter ?? null,
            letter.arabicForms?.isolated ?? null,
            letter.arabicForms?.initial ?? null,
            letter.arabicForms?.medial ?? null,
            letter.arabicForms?.final ?? null,
            letter.example.word,
            letter.pronunciationAsset,
            letter.example.illustrationKey,
            letter.difficultyLevel,
          ]
        );
      }
    }

    // 3. Load or seed default children (Soufy & Nadine)
    const childRows = await this.sqliteDb.getAllAsync('SELECT * FROM children ORDER BY created_at ASC');
    if (!childRows || childRows.length === 0) {
      for (const child of this.childrenMap.values()) {
        await this.sqliteDb.runAsync(
          `INSERT INTO children (id, name, avatar, preferred_language, stars_count, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            child.id,
            child.name,
            child.avatar,
            child.preferredLanguage,
            child.starsCount,
            child.createdAt,
          ]
        );
      }
    } else {
      this.childrenMap.clear();
      for (const r of childRows) {
        this.childrenMap.set(r.id, {
          id: r.id,
          name: r.name,
          avatar: r.avatar as AvatarId,
          preferredLanguage: (r.preferred_language as LanguageCode) || 'en',
          starsCount: Number(r.stars_count ?? 0),
          createdAt: r.created_at,
        });
      }
    }

    // 4. Load learning_progress
    const progRows = await this.sqliteDb.getAllAsync('SELECT * FROM learning_progress');
    this.progressMap.clear();
    for (const r of progRows ?? []) {
      const rec: LearningProgressRecord = {
        id: r.id,
        childId: r.child_id,
        letterId: r.letter_id,
        recognitionScore: Number(r.recognition_score ?? 0),
        tracingScore: Number(r.tracing_score ?? 0),
        independentWritingScore: Number(r.independent_writing_score ?? 0),
        attempts: Number(r.attempts ?? 0),
        successfulAttempts: Number(r.successful_attempts ?? 0),
        masteryStatus: (r.mastery_status as MasteryStatus) || 'new',
        lastPracticed: r.last_practiced ?? null,
        needsHelp: Boolean(r.needs_help ?? 0),
        consecutiveFails: Number(r.consecutive_fails ?? 0),
      };
      this.progressMap.set(`${rec.childId}:${rec.letterId}`, rec);
    }

    // 5. Load achievements
    const achRows = await this.sqliteDb.getAllAsync('SELECT * FROM achievements');
    this.achievementsMap.clear();
    for (const r of achRows ?? []) {
      const rec: AchievementRecord = {
        id: r.id,
        childId: r.child_id,
        achievementType: r.achievement_type as AchievementType,
        achievedAt: r.achieved_at,
      };
      this.achievementsMap.set(`${rec.childId}:${rec.achievementType}`, rec);
    }

    // 6. Load sessions
    const sessRows = await this.sqliteDb.getAllAsync(
      'SELECT * FROM practice_sessions ORDER BY session_date DESC LIMIT 200'
    );
    this.sessions = (sessRows ?? []).map((r: any) => ({
      id: r.id,
      childId: r.child_id,
      language: r.language as LanguageCode,
      sessionDate: r.session_date,
      durationSeconds: Number(r.duration_seconds ?? 0),
      score: Number(r.score ?? 0),
    }));

    // 7. Load recent attempts
    const attRows = await this.sqliteDb.getAllAsync(
      'SELECT * FROM practice_attempts ORDER BY created_at DESC LIMIT 300'
    );
    this.attempts = (attRows ?? []).map((r: any) => ({
      id: r.id,
      childId: r.child_id,
      letterId: r.letter_id,
      formKey: r.form_key as LetterFormKey,
      mode: r.mode as HandwritingMode,
      metricsJson: r.metrics_json,
      scoringVersion: r.scoring_version,
      score: Number(r.score ?? 0),
      createdAt: r.created_at,
    }));
  }

  async getChildren(): Promise<ChildProfile[]> {
    await this.initialize();
    return Array.from(this.childrenMap.values());
  }

  async getChildById(childId: string): Promise<ChildProfile | undefined> {
    await this.initialize();
    return this.childrenMap.get(childId);
  }

  async updateChildProfile(
    childId: string,
    name: string,
    avatar: AvatarId,
    preferredLanguage?: LanguageCode
  ): Promise<ChildProfile> {
    await this.initialize();
    const existing = this.childrenMap.get(childId);
    if (!existing) {
      throw new Error(`Child profile not found: ${childId}`);
    }
    const updated: ChildProfile = {
      ...existing,
      name: name.trim() || existing.name,
      avatar,
      preferredLanguage: preferredLanguage ?? existing.preferredLanguage,
    };
    this.childrenMap.set(childId, updated);

    if (this.sqliteDb) {
      await this.sqliteDb.runAsync(
        'UPDATE children SET name = ?, avatar = ?, preferred_language = ? WHERE id = ?',
        [updated.name, updated.avatar, updated.preferredLanguage, childId]
      );
    }
    return updated;
  }

  async addChildProfile(
    name: string,
    avatar: AvatarId,
    preferredLanguage: LanguageCode = 'en'
  ): Promise<ChildProfile> {
    await this.initialize();
    const id = `child_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const created: ChildProfile = {
      id,
      name: name.trim() || 'Explorer',
      avatar,
      preferredLanguage,
      starsCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.childrenMap.set(id, created);
    if (this.sqliteDb) {
      await this.sqliteDb.runAsync(
        `INSERT INTO children (id, name, avatar, preferred_language, stars_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          created.id,
          created.name,
          created.avatar,
          created.preferredLanguage,
          created.starsCount,
          created.createdAt,
        ]
      );
    }
    return created;
  }

  async getProgressForChild(childId: string): Promise<Record<string, LearningProgressRecord>> {
    await this.initialize();
    const result: Record<string, LearningProgressRecord> = {};
    for (const letter of ALL_LETTERS) {
      const key = `${childId}:${letter.id}`;
      const existing = this.progressMap.get(key);
      if (existing) {
        result[letter.id] = existing;
      } else {
        result[letter.id] = {
          id: `prog_${childId}_${letter.id}`,
          childId,
          letterId: letter.id,
          recognitionScore: 0,
          tracingScore: 0,
          independentWritingScore: 0,
          attempts: 0,
          successfulAttempts: 0,
          masteryStatus: 'new',
          lastPracticed: null,
          needsHelp: false,
          consecutiveFails: 0,
        };
      }
    }
    return result;
  }

  async recordPracticeOutcome(input: RecordPracticeInput): Promise<{
    updatedProgress: LearningProgressRecord;
    newAchievements: AchievementType[];
    updatedChild: ChildProfile;
  }> {
    await this.initialize();
    const now = new Date().toISOString();
    const key = `${input.childId}:${input.letterId}`;
    const current = this.progressMap.get(key) ?? {
      id: `prog_${input.childId}_${input.letterId}`,
      childId: input.childId,
      letterId: input.letterId,
      recognitionScore: 0,
      tracingScore: 0,
      independentWritingScore: 0,
      attempts: 0,
      successfulAttempts: 0,
      masteryStatus: 'new' as MasteryStatus,
      lastPracticed: null,
      needsHelp: false,
      consecutiveFails: 0,
    };

    const nextAttempts = current.attempts + 1;
    const nextSuccessful = current.successfulAttempts + (input.passed ? 1 : 0);
    const nextRecognition =
      input.mode === 'recognition' || input.mode === 'watch'
        ? Math.max(current.recognitionScore, input.score)
        : current.recognitionScore;
    const nextTracing =
      input.mode === 'trace' ? Math.max(current.tracingScore, input.score) : current.tracingScore;
    const nextWriting =
      input.mode === 'write'
        ? Math.max(current.independentWritingScore, input.score)
        : current.independentWritingScore;

    const masteryStatus = computeMasteryStatus(
      nextAttempts,
      nextSuccessful,
      nextRecognition,
      nextTracing,
      nextWriting
    );

    const nextConsecutiveFails =
      input.consecutiveFails !== undefined
        ? input.consecutiveFails
        : input.passed
          ? 0
          : (current.consecutiveFails ?? 0) + 1;

    const nextNeedsHelp =
      input.needsHelp !== undefined
        ? input.needsHelp
        : input.passed
          ? false
          : Boolean(current.needsHelp || nextConsecutiveFails >= 3);

    const updatedProgress: LearningProgressRecord = {
      ...current,
      recognitionScore: nextRecognition,
      tracingScore: nextTracing,
      independentWritingScore: nextWriting,
      attempts: nextAttempts,
      successfulAttempts: nextSuccessful,
      masteryStatus,
      lastPracticed: now,
      needsHelp: nextNeedsHelp,
      consecutiveFails: nextConsecutiveFails,
    };
    this.progressMap.set(key, updatedProgress);

    // Update child's stars
    const child = this.childrenMap.get(input.childId);
    if (!child) {
      throw new Error(`Child not found: ${input.childId}`);
    }
    const updatedChild: ChildProfile = {
      ...child,
      starsCount: child.starsCount + Math.max(0, input.starsEarned),
    };
    this.childrenMap.set(input.childId, updatedChild);

    // Record practice attempt & session
    const attemptRec: PracticeAttemptRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      childId: input.childId,
      letterId: input.letterId,
      formKey: input.formKey,
      mode: input.mode === 'recognition' ? 'watch' : input.mode,
      metricsJson: input.metricsJson,
      scoringVersion: input.scoringVersion,
      score: input.score,
      createdAt: now,
    };
    this.attempts.unshift(attemptRec);

    const language: LanguageCode = input.letterId.startsWith('ar_') ? 'ar' : 'en';
    const sessionRec: PracticeSessionRecord = {
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      childId: input.childId,
      language,
      sessionDate: now,
      durationSeconds: Math.max(5, input.durationSeconds),
      score: input.score,
    };
    this.sessions.unshift(sessionRec);

    if (this.sqliteDb) {
      await this.sqliteDb.runAsync(
        `INSERT OR REPLACE INTO learning_progress
         (id, child_id, letter_id, recognition_score, tracing_score, independent_writing_score, attempts, successful_attempts, mastery_status, last_practiced, needs_help, consecutive_fails)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          updatedProgress.id,
          updatedProgress.childId,
          updatedProgress.letterId,
          updatedProgress.recognitionScore,
          updatedProgress.tracingScore,
          updatedProgress.independentWritingScore,
          updatedProgress.attempts,
          updatedProgress.successfulAttempts,
          updatedProgress.masteryStatus,
          updatedProgress.lastPracticed,
          updatedProgress.needsHelp ? 1 : 0,
          updatedProgress.consecutiveFails ?? 0,
        ]
      );
      await this.sqliteDb.runAsync('UPDATE children SET stars_count = ? WHERE id = ?', [
        updatedChild.starsCount,
        updatedChild.id,
      ]);
      await this.sqliteDb.runAsync(
        `INSERT INTO practice_attempts (id, child_id, letter_id, form_key, mode, metrics_json, scoring_version, score, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attemptRec.id,
          attemptRec.childId,
          attemptRec.letterId,
          attemptRec.formKey,
          attemptRec.mode,
          attemptRec.metricsJson,
          attemptRec.scoringVersion,
          attemptRec.score,
          attemptRec.createdAt,
        ]
      );
      await this.sqliteDb.runAsync(
        `INSERT INTO practice_sessions (id, child_id, language, session_date, duration_seconds, score)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          sessionRec.id,
          sessionRec.childId,
          sessionRec.language,
          sessionRec.sessionDate,
          sessionRec.durationSeconds,
          sessionRec.score,
        ]
      );
    }

    // Check & award achievements idempotently
    const newAchievements: AchievementType[] = [];
    const tryAward = async (type: AchievementType) => {
      const newlyUnlocked = await this.unlockAchievement(input.childId, type);
      if (newlyUnlocked) newAchievements.push(type);
    };

    if (input.mode === 'trace' && input.passed) {
      await tryAward('first_letter_traced');
    }
    if (input.mode === 'write' && input.passed) {
      await tryAward('first_independent_write');
    }
    if (input.isRetry) {
      await tryAward('brave_retry');
    }
    if (input.hasDotsReward && input.passed) {
      await tryAward('dots_detective');
    }

    // Count practiced letters in each language for this child
    let enPracticed = 0;
    let arPracticed = 0;
    for (const [k, p] of this.progressMap.entries()) {
      if (!k.startsWith(`${input.childId}:`) || p.attempts === 0) continue;
      if (p.letterId.startsWith('en_')) enPracticed++;
      if (p.letterId.startsWith('ar_')) arPracticed++;
    }
    if (enPracticed >= 5) await tryAward('five_english_letters');
    if (arPracticed >= 5) await tryAward('five_arabic_letters');
    if (enPracticed >= 1 && arPracticed >= 1) await tryAward('alphabet_explorer');

    return {
      updatedProgress,
      newAchievements,
      updatedChild,
    };
  }

  async getAchievementsForChild(childId: string): Promise<AchievementRecord[]> {
    await this.initialize();
    const list: AchievementRecord[] = [];
    for (const [k, rec] of this.achievementsMap.entries()) {
      if (k.startsWith(`${childId}:`)) {
        list.push(rec);
      }
    }
    return list;
  }

  async unlockAchievement(childId: string, type: AchievementType): Promise<boolean> {
    await this.initialize();
    const key = `${childId}:${type}`;
    if (this.achievementsMap.has(key)) {
      return false; // Already unlocked — idempotent
    }
    const rec: AchievementRecord = {
      id: `ach_${childId}_${type}`,
      childId,
      achievementType: type,
      achievedAt: new Date().toISOString(),
    };
    this.achievementsMap.set(key, rec);
    if (this.sqliteDb) {
      await this.sqliteDb.runAsync(
        `INSERT OR IGNORE INTO achievements (id, child_id, achievement_type, achieved_at)
         VALUES (?, ?, ?, ?)`,
        [rec.id, rec.childId, rec.achievementType, rec.achievedAt]
      );
    }
    return true;
  }

  async getSessionsForChild(childId: string): Promise<PracticeSessionRecord[]> {
    await this.initialize();
    return this.sessions.filter((s) => s.childId === childId);
  }

  async getAttemptsForChild(childId: string): Promise<PracticeAttemptRecord[]> {
    await this.initialize();
    return this.attempts.filter((a) => a.childId === childId);
  }

  async getParentSettings(): Promise<ParentSettingsRecord> {
    await this.initialize();
    return { ...this.parentSettings };
  }

  async updateParentSettings(
    partial: Partial<Omit<ParentSettingsRecord, 'id' | 'pinHash'>>
  ): Promise<ParentSettingsRecord> {
    await this.initialize();
    this.parentSettings = {
      ...this.parentSettings,
      ...partial,
    };
    if (this.sqliteDb) {
      await this.sqliteDb.runAsync(
        `UPDATE parent_settings
         SET pin_hint_shown = ?, daily_goal_minutes = ?, daily_goal_letters = ?, audio_enabled = ?, narration_enabled = ?, sound_effects_volume = ?, guided_mode = ?, explore_mode = ?
         WHERE id = 1`,
        [
          this.parentSettings.pinHintShown ? 1 : 0,
          this.parentSettings.dailyGoalMinutes,
          this.parentSettings.dailyGoalLetters,
          this.parentSettings.audioEnabled ? 1 : 0,
          this.parentSettings.narrationEnabled ? 1 : 0,
          this.parentSettings.soundEffectsVolume,
          this.parentSettings.guidedMode === false ? 0 : 1,
          this.parentSettings.exploreMode ? 1 : 0,
        ]
      );
    }
    return { ...this.parentSettings };
  }

  async verifyPin(inputPin: string): Promise<boolean> {
    await this.initialize();
    return verifyParentPin(inputPin, this.parentSettings.pinHash);
  }

  async updateParentPin(newPin: string): Promise<void> {
    await this.initialize();
    if (!/^\d{4}$/.test(newPin.trim())) {
      throw new Error('Parent PIN must be a 4-digit number.');
    }
    const newHash = hashParentPin(newPin.trim());
    this.parentSettings.pinHash = newHash;
    this.parentSettings.pinHintShown = true;
    if (this.sqliteDb) {
      await this.sqliteDb.runAsync(
        'UPDATE parent_settings SET pin_hash_or_secure_representation = ?, pin_hint_shown = 1 WHERE id = 1',
        [newHash]
      );
    }
  }

  async resetChildProgress(childId: string): Promise<void> {
    await this.initialize();
    for (const k of Array.from(this.progressMap.keys())) {
      if (k.startsWith(`${childId}:`)) {
        this.progressMap.delete(k);
      }
    }
    for (const k of Array.from(this.achievementsMap.keys())) {
      if (k.startsWith(`${childId}:`)) {
        this.achievementsMap.delete(k);
      }
    }
    this.sessions = this.sessions.filter((s) => s.childId !== childId);
    this.attempts = this.attempts.filter((a) => a.childId !== childId);

    const child = this.childrenMap.get(childId);
    if (child) {
      this.childrenMap.set(childId, { ...child, starsCount: 0 });
    }

    if (this.sqliteDb) {
      await this.sqliteDb.runAsync('DELETE FROM learning_progress WHERE child_id = ?', [childId]);
      await this.sqliteDb.runAsync('DELETE FROM achievements WHERE child_id = ?', [childId]);
      await this.sqliteDb.runAsync('DELETE FROM practice_sessions WHERE child_id = ?', [childId]);
      await this.sqliteDb.runAsync('DELETE FROM practice_attempts WHERE child_id = ?', [childId]);
      await this.sqliteDb.runAsync('UPDATE children SET stars_count = 0 WHERE id = ?', [childId]);
    }
  }

  async resetAllProgress(): Promise<void> {
    await this.initialize();
    for (const childId of this.childrenMap.keys()) {
      await this.resetChildProgress(childId);
    }
  }
}

export const defaultRepository = new LocalAcademyRepository();
