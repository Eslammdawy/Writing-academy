import * as fs from 'fs';
import * as path from 'path';
import {
  ALL_LETTERS,
  ARABIC_LETTERS,
  ENGLISH_LETTERS,
  getLetterById,
  getLetterDistractors,
  getWordBuilderDeck,
} from '../src/data/curriculum';
import {
  computeMasteryStatus,
  LocalAcademyRepository,
} from '../src/database/repository';
import { pointsToSvgPath } from '../src/data/strokeGeometry';
import {
  evaluateHandwritingAttempt,
  SCORING_VERSION,
} from '../src/services/scoring/handwritingEvaluator';
import { RecordedStroke } from '../src/types';
import {
  DEFAULT_PARENT_PIN,
  DEFAULT_PARENT_PIN_HASH,
  hashParentPin,
  verifyParentPin,
} from '../src/utils/pinSecurity';
import { formatNarrationLine } from '../src/data/narration';
import { VoiceNarrator } from '../src/services/audio/narrator';
import { getLocalDateString, isSameLocalDay } from '../src/utils/dateUtils';

describe('1. Curriculum Integrity (English A-Z & Arabic 28 Letters)', () => {
  test('contains exactly 26 unique English letters and 28 unique Arabic letters (54 total)', () => {
    expect(ENGLISH_LETTERS).toHaveLength(26);
    expect(ARABIC_LETTERS).toHaveLength(28);
    expect(ALL_LETTERS).toHaveLength(54);

    const uniqueIds = new Set(ALL_LETTERS.map((l) => l.id));
    expect(uniqueIds.size).toBe(54);
  });

  test('every English letter has uppercase & lowercase forms, stroke templates, and example words', () => {
    for (const letter of ENGLISH_LETTERS) {
      expect(letter.language).toBe('en');
      expect(letter.character).toMatch(/^[A-Z]$/);
      expect(letter.lowercaseCharacter).toBe(letter.character.toLowerCase());
      expect(letter.example.word.length).toBeGreaterThanOrEqual(2);
      expect(letter.strokeTemplates.uppercase?.length).toBeGreaterThanOrEqual(1);
      expect(letter.strokeTemplates.lowercase?.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('every Arabic letter has isolated, initial, medial, final forms, harakat, and stroke templates', () => {
    const nonJoiningChars = new Set(['أ', 'د', 'ذ', 'ر', 'ز', 'و']);
    for (const letter of ARABIC_LETTERS) {
      expect(letter.language).toBe('ar');
      expect(letter.arabicForms).toBeDefined();
      expect(letter.arabicForms?.isolated).toBeTruthy();
      expect(letter.arabicForms?.initial).toBeTruthy();
      expect(letter.arabicForms?.medial).toBeTruthy();
      expect(letter.arabicForms?.final).toBeTruthy();

      expect(letter.strokeTemplates.isolated?.length).toBeGreaterThanOrEqual(1);
      expect(letter.strokeTemplates.initial?.length).toBeGreaterThanOrEqual(1);
      expect(letter.strokeTemplates.medial?.length).toBeGreaterThanOrEqual(1);
      expect(letter.strokeTemplates.final?.length).toBeGreaterThanOrEqual(1);

      expect(letter.harakatVariants).toHaveLength(3);
      expect(Boolean(letter.nonJoiningAfter)).toBe(
        nonJoiningChars.has(letter.character)
      );
    }
  });

  test('all 54 letter offline WAV audio files exist on disk in assets/audio/', () => {
    const audioDir = path.resolve(__dirname, '..', 'assets', 'audio');
    for (const letter of ALL_LETTERS) {
      const filePath = path.join(audioDir, `${letter.pronunciationAsset}.wav`);
      expect(fs.existsSync(filePath)).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(100);
    }
  });

  test('distractor generator avoids visually similar Arabic groups for beginners when requested', () => {
    const baa = getLetterById('ar_02')!; // ب (visualGroup: ba_ta_tha)
    const beginnerDistractors = getLetterDistractors(baa, 3, false);
    expect(beginnerDistractors).toHaveLength(3);
    for (const d of beginnerDistractors) {
      expect(d.visualGroup).not.toBe('ba_ta_tha');
    }

    const advancedDistractors = getLetterDistractors(baa, 3, true);
    expect(advancedDistractors.some((d) => d.visualGroup === 'ba_ta_tha')).toBe(
      true
    );
  });

  test('Word Builder deck provides valid letter arrays for both English and Arabic', () => {
    const enDeck = getWordBuilderDeck('en');
    const arDeck = getWordBuilderDeck('ar');
    expect(enDeck.length).toBeGreaterThanOrEqual(26);
    expect(arDeck.length).toBeGreaterThanOrEqual(28);
  });
});

describe('2. Handwriting Engine & Deterministic Evaluation', () => {
  test('never counts guide templates as child strokes when child strokes are empty', () => {
    const letterA = getLetterById('en_A')!;
    const templates = letterA.strokeTemplates.uppercase!;

    const traceEmpty = evaluateHandwritingAttempt('trace', 'uppercase', templates, []);
    expect(traceEmpty.overallScore).toBe(0);
    expect(traceEmpty.passed).toBe(false);

    const writeEmpty = evaluateHandwritingAttempt('write', 'uppercase', templates, []);
    expect(writeEmpty.overallScore).toBe(0);
    expect(writeEmpty.passed).toBe(false);
  });

  test('evaluates representative straight (I), curved (C), and multi-stroke (A) letters deterministically', () => {
    for (const id of ['en_I', 'en_C', 'en_A']) {
      const letter = getLetterById(id)!;
      const templates = letter.strokeTemplates.uppercase!;
      const simulatedChildStrokes: RecordedStroke[] = templates.map((t) => ({
        points: t.points.map((p) => ({
          x: Number((p.x + 0.01).toFixed(4)),
          y: Number((p.y - 0.01).toFixed(4)),
        })),
        startedAt: 1000,
        endedAt: 1500,
      }));

      const res1 = evaluateHandwritingAttempt(
        'trace',
        'uppercase',
        templates,
        simulatedChildStrokes
      );
      const res2 = evaluateHandwritingAttempt(
        'trace',
        'uppercase',
        templates,
        simulatedChildStrokes
      );

      expect(res1).toEqual(res2); // 100% deterministic
      expect(res1.scoringVersion).toBe(SCORING_VERSION);
      expect(res1.passed).toBe(true);
      expect(res1.overallScore).toBeGreaterThanOrEqual(80);
      expect(res1.starsEarned).toBe(3);
    }
  });

  test('explicitly evaluates Arabic dots (e.g. ب Baa and ث Thaa) and detects missing dots', () => {
    const baa = getLetterById('ar_02')!; // ب has 1 body stroke + 1 dot stroke below
    const templates = baa.strokeTemplates.isolated!;
    expect(templates.length).toBe(2);
    expect(templates[1].kind).toBe('dot');

    // Attempt with ONLY the boat body stroke (missing the dot)
    const bodyOnlyStrokes: RecordedStroke[] = [
      {
        points: templates[0].points,
        startedAt: 1000,
        endedAt: 1400,
      },
    ];
    const missingDotResult = evaluateHandwritingAttempt(
      'trace',
      'isolated',
      templates,
      bodyOnlyStrokes
    );
    expect(missingDotResult.dotsAndMarksScore).toBeLessThan(50);
    expect(missingDotResult.passed).toBe(false);
    expect(missingDotResult.gentleHintEn).toContain('dot');

    // Attempt with both the body stroke AND the dot stroke
    const fullStrokes: RecordedStroke[] = templates.map((t) => ({
      points: t.points,
      startedAt: 1000,
      endedAt: 1400,
    }));
    const completeResult = evaluateHandwritingAttempt(
      'trace',
      'isolated',
      templates,
      fullStrokes
    );
    expect(completeResult.dotsAndMarksScore).toBeGreaterThanOrEqual(85);
    expect(completeResult.passed).toBe(true);
    expect(completeResult.starsEarned).toBe(3);
  });

  test('supports independent WRITE mode with scaled/shifted freehand strokes', () => {
    const letterL = getLetterById('en_L')!;
    const templates = letterL.strokeTemplates.uppercase!;

    // Shifted and slightly smaller freehand L
    const freehandStrokes: RecordedStroke[] = templates.map((t) => ({
      points: t.points.map((p) => ({
        x: Number((p.x * 0.85 + 0.06).toFixed(4)),
        y: Number((p.y * 0.85 + 0.05).toFixed(4)),
      })),
      startedAt: 1000,
      endedAt: 1500,
    }));

    const writeResult = evaluateHandwritingAttempt(
      'write',
      'uppercase',
      templates,
      freehandStrokes
    );
    expect(writeResult.passed).toBe(true);
    expect(writeResult.overallScore).toBeGreaterThanOrEqual(65);
  });

  test('pointsToSvgPath scales normalized coordinates cleanly across tablet dimensions', () => {
    const pts = [
      { x: 0.25, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.75, y: 0.5 },
    ];
    const path400 = pointsToSvgPath(pts, 400);
    const path600 = pointsToSvgPath(pts, 600);
    expect(path400).toContain('M 100.0 200.0');
    expect(path600).toContain('M 150.0 300.0');
  });
});

describe('3. Profiles, Mastery Progression, Rewards & Parent PIN Security', () => {
  test('Soufy and Nadine profiles are seeded and strictly isolated', async () => {
    const repo = new LocalAcademyRepository(true);
    await repo.initialize();

    const children = await repo.getChildren();
    expect(children.map((c) => c.name)).toEqual(['Soufy', 'Nadine']);

    // Record practice for Soufy on en_A
    await repo.recordPracticeOutcome({
      childId: 'child_soufy',
      letterId: 'en_A',
      formKey: 'uppercase',
      mode: 'trace',
      score: 90,
      passed: true,
      starsEarned: 3,
      scoringVersion: SCORING_VERSION,
      metricsJson: '{}',
      durationSeconds: 20,
    });

    const soufyProgress = await repo.getProgressForChild('child_soufy');
    const nadineProgress = await repo.getProgressForChild('child_nadine');

    expect(soufyProgress['en_A'].attempts).toBe(1);
    expect(soufyProgress['en_A'].tracingScore).toBe(90);

    // Nadine's progress on en_A must remain completely untouched
    expect(nadineProgress['en_A'].attempts).toBe(0);
    expect(nadineProgress['en_A'].tracingScore).toBe(0);

    const soufyProfile = await repo.getChildById('child_soufy');
    const nadineProfile = await repo.getChildById('child_nadine');
    expect(soufyProfile?.starsCount).toBe(3);
    expect(nadineProfile?.starsCount).toBe(0);
  });

  test('Mastery status requires repeated success, never a single attempt', () => {
    expect(computeMasteryStatus(0, 0, 0, 0, 0)).toBe('new');
    expect(computeMasteryStatus(1, 1, 0, 95, 0)).toBe('practicing');
    expect(computeMasteryStatus(2, 2, 0, 90, 85)).toBe('practicing');
    expect(computeMasteryStatus(3, 3, 0, 88, 82)).toBe('mastered');
  });

  test('Achievements are unlocked once per child (idempotent)', async () => {
    const repo = new LocalAcademyRepository(true);
    await repo.initialize();

    const firstUnlock = await repo.unlockAchievement(
      'child_soufy',
      'first_letter_traced'
    );
    const duplicateUnlock = await repo.unlockAchievement(
      'child_soufy',
      'first_letter_traced'
    );

    expect(firstUnlock).toBe(true);
    expect(duplicateUnlock).toBe(false);

    const list = await repo.getAchievementsForChild('child_soufy');
    expect(list).toHaveLength(1);
  });

  test('Parent PIN is stored as salted SHA-256 hash and verifies accurately', async () => {
    expect(DEFAULT_PARENT_PIN_HASH).toMatch(/^sha256\$[0-9a-f]{64}$/);
    expect(DEFAULT_PARENT_PIN_HASH).not.toContain(DEFAULT_PARENT_PIN);
    expect(verifyParentPin('1234', DEFAULT_PARENT_PIN_HASH)).toBe(true);
    expect(verifyParentPin('0000', DEFAULT_PARENT_PIN_HASH)).toBe(false);

    const repo = new LocalAcademyRepository(true);
    await repo.initialize();
    expect(await repo.verifyPin('1234')).toBe(true);
    expect(await repo.verifyPin('9999')).toBe(false);

    await repo.updateParentPin('4321');
    expect(await repo.verifyPin('4321')).toBe(true);
    expect(await repo.verifyPin('1234')).toBe(false);
    const settings = await repo.getParentSettings();
    expect(settings.pinHash).toBe(hashParentPin('4321'));
  });
});

describe('4. Voice-First Narrator Queue & Local Date Utilities (Phase 1)', () => {
  test('narrator formats English and gender-neutral Arabic lines and queues without overlap', async () => {
    const enWelcome = formatNarrationLine('home.welcome', 'en', { name: 'Soufy' });
    const arWelcome = formatNarrationLine('home.welcome', 'ar', { name: 'Nadine' });
    expect(enWelcome).toBe('Hi Soufy! Tap the big star to start.');
    expect(arWelcome).toContain('Nadine');
    expect(arWelcome).toContain('لنضغط');

    const spokenLog: Array<{ text: string; lang?: string }> = [];
    let stopCount = 0;
    let pendingOnDone: (() => void) | null = null;

    const testNarrator = new VoiceNarrator();
    testNarrator.setSpeechDriverForTesting({
      speak: (text, opts) => {
        spokenLog.push({ text, lang: opts?.language });
        pendingOnDone = opts?.onDone ?? null;
      },
      stop: () => {
        stopCount += 1;
      },
      getAvailableVoicesAsync: async () => [
        { language: 'en-US', identifier: 'en-us-x-sfg' },
        { language: 'ar-SA', identifier: 'ar-sa-x-ard' },
      ],
    });

    const health = await testNarrator.checkVoiceHealth();
    expect(health.checked).toBe(true);
    expect(health.enAvailable).toBe(true);
    expect(health.arAvailable).toBe(true);

    // Enqueue two lines and verify the second waits until the first completes (no overlap)
    testNarrator.say('lesson.watch', undefined, { language: 'en', enqueue: true });
    testNarrator.say('lesson.trace.start', undefined, { language: 'en', enqueue: true });

    expect(spokenLog).toHaveLength(1);
    expect(spokenLog[0].text).toBe('Watch how we write it.');
    expect(testNarrator.getQueueLength()).toBe(2);

    // Finish first utterance -> second starts automatically
    if (pendingOnDone) (pendingOnDone as () => void)();
    expect(spokenLog).toHaveLength(2);
    expect(spokenLog[1].text).toBe('Your turn! Start at the star and follow the arrow.');
    expect(stopCount).toBeGreaterThanOrEqual(2);

    // Repeat replays the last spoken line
    const repeated = testNarrator.repeat();
    expect(repeated).toBe('Your turn! Start at the star and follow the arrow.');
    testNarrator.stop();
  });

  test('narrator detects missing Arabic voice data cleanly', async () => {
    const testNarrator = new VoiceNarrator();
    testNarrator.setSpeechDriverForTesting({
      speak: () => {},
      stop: () => {},
      getAvailableVoicesAsync: async () => [{ language: 'en-US' }],
    });

    const health = await testNarrator.checkVoiceHealth();
    expect(health.enAvailable).toBe(true);
    expect(health.arAvailable).toBe(false);
  });

  test('getLocalDateString and isSameLocalDay use local calendar date instead of UTC', () => {
    const localRef = new Date(2026, 10, 11, 23, 30, 0); // Nov 11, 2026 23:30 local
    expect(getLocalDateString(localRef)).toBe('2026-11-11');
    expect(isSameLocalDay(localRef.toISOString(), localRef)).toBe(true);
  });
});
