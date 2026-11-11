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
  evaluateStrokeAgainstTemplate,
  SCORING_VERSION,
} from '../src/services/scoring/handwritingEvaluator';
import {
  createInitialLessonState,
  GuidedLessonRunner,
  lessonReducer,
} from '../src/features/lesson/lessonMachine';
import {
  IDLE_DEMO_MS,
  IDLE_PULSE_MS,
  IDLE_STUCK_MS,
  IdleHintScheduler,
} from '../src/features/lesson/useIdleHint';
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

describe('5. Core Lesson Machine, Per-Stroke Evaluation, Idle & Fail-Soft Ladders (Phase 2)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('evaluateStrokeAgainstTemplate checks individual stroke coverage and direction', () => {
    const letterA = getLetterById('en_A')!;
    const firstStroke = letterA.strokeTemplates.uppercase![0];

    // Valid stroke following the template path
    const goodDetail = evaluateStrokeAgainstTemplate(
      firstStroke,
      firstStroke.points,
      'trace'
    );
    expect(goodDetail.matched).toBe(true);
    expect(goodDetail.directionCorrect).toBe(true);
    expect(goodDetail.coverageScore).toBeGreaterThanOrEqual(90);

    // Reversed stroke (drawn bottom-to-top instead of top-to-bottom)
    const reversedPts = [...firstStroke.points].reverse();
    const reversedDetail = evaluateStrokeAgainstTemplate(
      firstStroke,
      reversedPts,
      'trace'
    );
    expect(reversedDetail.directionCorrect).toBe(false);
    expect(reversedDetail.matched).toBe(false);

    // Distant scribble
    const scribbleDetail = evaluateStrokeAgainstTemplate(
      firstStroke,
      [
        { x: 0.92, y: 0.92 },
        { x: 0.95, y: 0.95 },
      ],
      'trace'
    );
    expect(scribbleDetail.matched).toBe(false);
  });

  test('IdleHintScheduler escalates at 6s (pulse), 12s (stroke demo), and 25s (stuck) with fake timers', () => {
    jest.useFakeTimers();
    const events: string[] = [];

    const scheduler = new IdleHintScheduler({
      onPulseHint: () => events.push('pulse_6s'),
      onReplayStrokeDemo: () => events.push('demo_12s'),
      onStuck: () => events.push('stuck_25s'),
    });

    scheduler.start();
    jest.advanceTimersByTime(IDLE_PULSE_MS - 100);
    expect(events).toEqual([]);

    jest.advanceTimersByTime(200);
    expect(events).toEqual(['pulse_6s']);

    jest.advanceTimersByTime(IDLE_DEMO_MS - IDLE_PULSE_MS);
    expect(events).toEqual(['pulse_6s', 'demo_12s']);

    // Activity resets timers before 25s
    scheduler.resetActivity();
    jest.advanceTimersByTime(IDLE_PULSE_MS);
    expect(events).toEqual(['pulse_6s', 'demo_12s', 'pulse_6s']);

    jest.advanceTimersByTime(IDLE_STUCK_MS - IDLE_PULSE_MS);
    expect(events).toEqual([
      'pulse_6s',
      'demo_12s',
      'pulse_6s',
      'demo_12s',
      'stuck_25s',
    ]);
    scheduler.stop();
  });

  test('GuidedLessonRunner drives a full English lesson (uppercase + lowercase) with simulated strokes and zero UI taps', () => {
    jest.useFakeTimers();
    const letterA = getLetterById('en_A')!;
    const runner = new GuidedLessonRunner(letterA, {
      introMs: 1000,
      watchMs: 800,
      celebrateMs: 1000,
      gentleSkipMs: 1000,
    });

    runner.start();
    expect(runner.getState().phase).toBe('INTRO');
    expect(runner.getState().currentForm).toBe('uppercase');

    // Auto-advance INTRO -> WATCH -> TRACE for uppercase
    jest.advanceTimersByTime(1000);
    expect(runner.getState().phase).toBe('WATCH');
    jest.advanceTimersByTime(800);
    expect(runner.getState().phase).toBe('TRACE');

    // Draw each uppercase stroke in TRACE
    const upperTemplates = letterA.strokeTemplates.uppercase!;
    for (let i = 0; i < upperTemplates.length; i++) {
      runner.dispatch({
        type: 'TRACE_STROKE_DRAWN',
        points: upperTemplates[i].points,
      });
    }
    // Automatically in WRITE for uppercase
    expect(runner.getState().phase).toBe('WRITE');

    // Submit uppercase WRITE strokes -> automatically moves to WATCH for lowercase!
    runner.dispatch({
      type: 'WRITE_SUBMIT',
      strokes: upperTemplates.map((t) => ({
        points: t.points,
        startedAt: 100,
        endedAt: 400,
      })),
    });
    expect(runner.getState().phase).toBe('WATCH');
    expect(runner.getState().currentForm).toBe('lowercase');

    // Auto-advance WATCH -> TRACE for lowercase
    jest.advanceTimersByTime(800);
    expect(runner.getState().phase).toBe('TRACE');

    const lowerTemplates = letterA.strokeTemplates.lowercase!;
    for (let i = 0; i < lowerTemplates.length; i++) {
      runner.dispatch({
        type: 'TRACE_STROKE_DRAWN',
        points: lowerTemplates[i].points,
      });
    }
    expect(runner.getState().phase).toBe('WRITE');

    runner.dispatch({
      type: 'WRITE_SUBMIT',
      strokes: lowerTemplates.map((t) => ({
        points: t.points,
        startedAt: 100,
        endedAt: 400,
      })),
    });
    expect(runner.getState().phase).toBe('CELEBRATE');
    expect(runner.getState().starsEarned).toBe(3);

    // Auto-advance CELEBRATE -> DONE
    jest.advanceTimersByTime(1000);
    expect(runner.getState().phase).toBe('DONE');
    runner.stop();
  });

  test('Fail-soft ladder: 2 consecutive fails return to slower WATCH with wider tolerance; 3rd fail triggers GENTLE_SKIP with effort star and needsHelp flag', () => {
    const baa = getLetterById('ar_02')!;
    let state = createInitialLessonState(baa);
    state = lessonReducer(state, { type: 'INTRO_COMPLETE' });
    state = lessonReducer(state, { type: 'WATCH_COMPLETE' });
    expect(state.phase).toBe('TRACE');

    // 1st failed attempt (stuck or 2 missed strokes)
    state = lessonReducer(state, { type: 'IDLE_STUCK' });
    expect(state.consecutiveFails).toBe(1);
    expect(state.phase).toBe('TRACE');
    expect(state.lastNarrationKey).toBe('lesson.retry');

    // 2nd consecutive failed attempt -> returns to WATCH with slowWatch & wideThresholds
    state = lessonReducer(state, { type: 'IDLE_STUCK' });
    expect(state.consecutiveFails).toBe(2);
    expect(state.phase).toBe('WATCH');
    expect(state.slowWatch).toBe(true);
    expect(state.useWideThresholds).toBe(true);

    // Move back to TRACE after slow WATCH, then fail 3rd time -> GENTLE_SKIP
    state = lessonReducer(state, { type: 'WATCH_COMPLETE' });
    state = lessonReducer(state, { type: 'IDLE_STUCK' });
    expect(state.consecutiveFails).toBe(3);
    expect(state.phase).toBe('GENTLE_SKIP');
    expect(state.starsEarned).toBe(1);
    expect(state.flaggedNeedsHelp).toBe(true);
    expect(state.lastNarrationKey).toBe('lesson.gentleSkip');

    state = lessonReducer(state, { type: 'GENTLE_SKIP_COMPLETE' });
    expect(state.phase).toBe('DONE');
  });
});
