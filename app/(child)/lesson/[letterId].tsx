import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import {
  MascotBanner,
  ScreenContainer,
  TopAdventureHeader,
} from '../../../src/components/PlayfulUI';
import { useAppState } from '../../../src/context/AppStateContext';
import { getLetterById, getNextLetter } from '../../../src/data/curriculum';
import {
  HandwritingCanvas,
  TraceStrokeResultEvent,
} from '../../../src/features/handwriting/HandwritingCanvas';
import {
  CELEBRATE_DURATION_MS,
  createInitialLessonState,
  GENTLE_SKIP_DURATION_MS,
  getActiveThresholdsForState,
  getTemplatesForForm,
  INTRO_DURATION_MS,
  lessonReducer,
} from '../../../src/features/lesson/lessonMachine';
import { useIdleHint } from '../../../src/features/lesson/useIdleHint';
import { useSafeNavigate } from '../../../src/hooks/useSafeNavigate';
import { useTabletLayout } from '../../../src/hooks/useTabletLayout';
import { audioService } from '../../../src/services/audio/audioService';
import { narrator } from '../../../src/services/audio/narrator';
import { SCORING_VERSION } from '../../../src/services/scoring/handwritingEvaluator';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../src/theme/tokens';
import { RecordedStroke } from '../../../src/types';

export default function GuidedLessonScreen() {
  const nav = useSafeNavigate();
  const params = useLocalSearchParams<{
    letterId: string;
    nextHref?: string;
    stepIndex?: string;
    totalSteps?: string;
  }>();

  const letter = getLetterById(params.letterId ?? 'en_A') ?? getLetterById('en_A')!;
  const isAr = letter.language === 'ar';
  const uiLang = isAr ? 'ar' : 'en';
  const { canvasSize, isLandscape } = useTabletLayout();
  const { activeChild, recordPractice } = useAppState();

  const [state, dispatch] = useReducer(
    lessonReducer,
    letter,
    createInitialLessonState
  );

  const [localWriteStrokes, setLocalWriteStrokes] = useState<RecordedStroke[]>([]);
  const [demoStrokeRequest, setDemoStrokeRequest] = useState<{
    strokeIndex: number;
    key: number;
  } | null>(null);
  const [watchReplayCounter, setWatchReplayCounter] = useState(0);

  const sessionStartRef = useRef<number>(Date.now());
  const outcomeSavedRef = useRef<boolean>(false);

  const templates = useMemo(
    () => getTemplatesForForm(letter, state.currentForm),
    [letter, state.currentForm]
  );

  const displayedGlyph = useMemo(() => {
    if (!isAr) {
      return state.currentForm === 'lowercase'
        ? letter.lowercaseCharacter ?? letter.character.toLowerCase()
        : letter.character;
    }
    return letter.character;
  }, [letter, state.currentForm, isAr]);

  const activeThresholds = useMemo(
    () => getActiveThresholdsForState(state),
    [state]
  );

  // Reanimated star celebration values
  const star1Scale = useSharedValue(0.3);
  const star2Scale = useSharedValue(0.3);
  const star3Scale = useSharedValue(0.3);

  const star1Style = useAnimatedStyle(() => ({
    transform: [{ scale: star1Scale.value }],
  }));
  const star2Style = useAnimatedStyle(() => ({
    transform: [{ scale: star2Scale.value }],
  }));
  const star3Style = useAnimatedStyle(() => ({
    transform: [{ scale: star3Scale.value }],
  }));

  // Navigate to next step of Today's Adventure (or next curriculum letter) when DONE
  const handleAdvanceToNextStep = useCallback(() => {
    if (params.nextHref) {
      nav.replace(params.nextHref);
      return;
    }
    const nextLetter = getNextLetter(letter.id);
    nav.replace(`/(child)/lesson/${nextLetter.id}`);
  }, [params.nextHref, letter.id, nav]);

  // Speak phase instructions on phase / form transitions
  useEffect(() => {
    const vars = {
      letter: displayedGlyph,
      letterName: isAr ? letter.nameAr.split('/')[0].trim() : letter.character,
      word: letter.example.word,
      name: activeChild.name,
    };

    if (state.phase === 'INTRO') {
      audioService.pronounceLetter(letter);
      narrator.say('lesson.intro', vars, { language: uiLang });
      const timer = setTimeout(() => {
        dispatch({ type: 'INTRO_COMPLETE' });
      }, INTRO_DURATION_MS);
      return () => clearTimeout(timer);
    }

    if (state.phase === 'WATCH') {
      if (state.formIndex > 0 && !isAr) {
        narrator.say('lesson.lowercaseIntro', vars, { language: uiLang });
      } else {
        narrator.say('lesson.watch', vars, { language: uiLang });
      }
      setWatchReplayCounter((c) => c + 1);
    } else if (state.phase === 'TRACE') {
      narrator.say('lesson.trace.start', vars, { language: uiLang });
    } else if (state.phase === 'WRITE') {
      setLocalWriteStrokes([]);
      narrator.say('lesson.write.start', vars, { language: uiLang });
    } else if (state.phase === 'CELEBRATE' || state.phase === 'GENTLE_SKIP') {
      const isGentleSkip = state.phase === 'GENTLE_SKIP';
      audioService.playSoundEffect(isGentleSkip ? 'star_earn' : 'celebrate');
      narrator.say(isGentleSkip ? 'lesson.gentleSkip' : 'lesson.success', vars, {
        language: uiLang,
      });

      star1Scale.value = withSpring(1.15);
      star2Scale.value = withDelay(180, withSpring(state.starsEarned >= 2 ? 1.2 : 0.85));
      star3Scale.value = withDelay(360, withSpring(state.starsEarned >= 3 ? 1.25 : 0.85));

      if (!outcomeSavedRef.current) {
        outcomeSavedRef.current = true;
        const durationSeconds = Math.max(
          5,
          Math.round((Date.now() - sessionStartRef.current) / 1000)
        );
        recordPractice({
          letterId: letter.id,
          formKey: state.currentForm,
          mode: isGentleSkip ? 'trace' : 'write',
          score: state.overallScore,
          passed: !isGentleSkip,
          starsEarned: state.starsEarned,
          scoringVersion: SCORING_VERSION,
          metricsJson: JSON.stringify({
            guidedLesson: true,
            gentleSkip: isGentleSkip,
            needsHelp: state.flaggedNeedsHelp,
            consecutiveFails: state.consecutiveFails,
          }),
          durationSeconds,
          hasDotsReward: Boolean(letter.dotCount && letter.dotCount > 0 && !isGentleSkip),
          isRetry: state.consecutiveFails > 0,
        }).catch(() => {});
      }

      const waitMs = isGentleSkip ? GENTLE_SKIP_DURATION_MS : CELEBRATE_DURATION_MS;
      const timer = setTimeout(() => {
        dispatch({
          type: isGentleSkip ? 'GENTLE_SKIP_COMPLETE' : 'CELEBRATE_COMPLETE',
        });
      }, waitMs);
      return () => clearTimeout(timer);
    } else if (state.phase === 'DONE') {
      handleAdvanceToNextStep();
    }
  }, [
    state.phase,
    state.formIndex,
    state.currentForm,
    state.starsEarned,
    state.overallScore,
    state.flaggedNeedsHelp,
    state.consecutiveFails,
    displayedGlyph,
    isAr,
    uiLang,
    letter,
    activeChild.name,
    recordPractice,
    handleAdvanceToNextStep,
    star1Scale,
    star2Scale,
    star3Scale,
  ]);

  // WP4 Idle help ladder (6s pulse -> 12s stroke demo -> 25s fail-soft escalation)
  const isDrawingPhase = state.phase === 'TRACE' || state.phase === 'WRITE';
  const { pulseStartBadge, registerActivity } = useIdleHint({
    enabled: isDrawingPhase,
    onPulseHint: () => {
      audioService.playSoundEffect('gentle_hint');
      narrator.say('lesson.idle', undefined, { language: uiLang });
    },
    onReplayStrokeDemo: () => {
      const targetIdx = state.phase === 'TRACE' ? state.strokeIndex : 0;
      setDemoStrokeRequest({ strokeIndex: targetIdx, key: Date.now() });
    },
    onStuck: () => {
      dispatch({ type: 'IDLE_STUCK' });
    },
  });

  const handleWatchComplete = useCallback(() => {
    dispatch({ type: 'WATCH_COMPLETE' });
  }, []);

  const handleTraceStrokeResult = useCallback(
    (event: TraceStrokeResultEvent) => {
      registerActivity();
      const lastStroke = event.allStrokes[event.allStrokes.length - 1];
      const pts =
        event.passed && lastStroke
          ? lastStroke.points
          : [{ x: 0.02, y: 0.02 }]; // non-matching points when rejected

      if (event.passed) {
        audioService.playSoundEffect('sparkle');
        if (!event.completedAllStrokes) {
          narrator.say('lesson.stroke.ok', undefined, { language: uiLang });
        }
      } else {
        audioService.playSoundEffect('gentle_hint');
        narrator.say('lesson.stroke.retry', undefined, { language: uiLang });
      }

      dispatch({
        type: 'TRACE_STROKE_DRAWN',
        points: event.passed ? pts : [{ x: 0.01, y: 0.01 }],
      });
    },
    [registerActivity, uiLang]
  );

  const handleAutoOrManualWriteSubmit = useCallback(
    (strokesToSubmit: RecordedStroke[]) => {
      if (state.phase !== 'WRITE' || strokesToSubmit.length === 0) return;
      registerActivity();
      const prevFails = state.consecutiveFails;
      dispatch({ type: 'WRITE_SUBMIT', strokes: strokesToSubmit });
      // Clear local strokes if the attempt did not pass so the child has a fresh canvas
      setLocalWriteStrokes([]);
      if (prevFails >= 0) {
        audioService.playSoundEffect('sparkle');
      }
    },
    [state.phase, state.consecutiveFails, registerActivity]
  );

  // "Show me" 👀 button replays the current stroke demo in-place without switching modes (WP9)
  const handleShowMeInPlace = () => {
    registerActivity();
    audioService.playSoundEffect('tap');
    narrator.say('lesson.watch', undefined, { language: uiLang });
    const targetIdx = state.phase === 'TRACE' ? state.strokeIndex : 0;
    setDemoStrokeRequest({ strokeIndex: targetIdx, key: Date.now() });
  };

  const handleUndoWrite = () => {
    registerActivity();
    audioService.playSoundEffect('tap');
    if (state.phase === 'WRITE') {
      setLocalWriteStrokes((prev) => prev.slice(0, -1));
    }
  };

  const handleClearCanvas = () => {
    registerActivity();
    audioService.playSoundEffect('tap');
    if (state.phase === 'WRITE') {
      setLocalWriteStrokes([]);
    }
  };

  const bannerMessage = useMemo(() => {
    if (state.phase === 'INTRO') {
      return `${displayedGlyph} — ${letter.example.emoji} ${letter.example.word}`;
    }
    if (state.phase === 'WATCH') {
      return isAr ? 'هيا نشاهد كيف نكتب الحرف 👀' : 'Watch how we write it 👀';
    }
    if (state.phase === 'TRACE') {
      return isAr
        ? 'نبدأ من النجمة ★ ونتبع السهم ☝️'
        : 'Start at the star ★ and follow the arrow ☝️';
    }
    if (state.phase === 'WRITE') {
      return isAr ? 'الآن نكتب الحرف بمفردنا ✏️' : 'Now write it all by yourself ✏️';
    }
    return isAr ? 'عمل رائع! ⭐' : 'Wonderful job! ⭐';
  }, [state.phase, displayedGlyph, letter.example.emoji, letter.example.word, isAr]);

  return (
    <ScreenContainer
      scroll={false}
      backgroundColor={isAr ? COLORS.arabicWorldBg : COLORS.englishWorldBg}
    >
      <TopAdventureHeader
        title={`${displayedGlyph}  ${letter.example.emoji} ${letter.example.word}`}
        language={letter.language}
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onHome={nav.goHome}
      />

      <MascotBanner
        mascotEmoji={isAr ? '🦉✨' : '🦊✨'}
        title={displayedGlyph}
        message={bannerMessage}
        isRtl={isAr}
        onAudioReplay={() => narrator.repeat()}
      />

      {/* Phase 1: INTRO Stage (~4.2s automatic card with giant letter + picture + sound) */}
      {state.phase === 'INTRO' ? (
        <View style={[styles.introStage, SHADOWS.card]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hear letter sound"
            onPress={() => audioService.pronounceLetter(letter)}
            style={styles.introHeroRow}
          >
            <View style={styles.introGlyphBubble}>
              <Text
                style={[
                  styles.introGlyphText,
                  { color: isAr ? COLORS.mintGreenDark : COLORS.skyBlueDark },
                ]}
              >
                {displayedGlyph}
              </Text>
            </View>

            <View style={styles.introWordBubble}>
              <Text style={styles.introEmoji}>{letter.example.emoji}</Text>
              <Text style={styles.introWordText}>{letter.example.word}</Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start Watching Now"
            onPress={() => dispatch({ type: 'INTRO_COMPLETE' })}
            style={styles.bigContinueCircle}
          >
            <Text style={styles.bigContinueIcon}>▶</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Phase 2-4: WATCH / TRACE / WRITE Interactive Canvas */}
      {state.phase === 'WATCH' || state.phase === 'TRACE' || state.phase === 'WRITE' ? (
        <View style={[styles.lessonStudioWrap, isLandscape && styles.lessonStudioLandscape]}>
          <HandwritingCanvas
            mode={
              state.phase === 'WATCH'
                ? 'watch'
                : state.phase === 'TRACE'
                  ? 'trace'
                  : 'write'
            }
            language={letter.language}
            templates={templates}
            recordedStrokes={
              state.phase === 'TRACE' ? state.tracedStrokes : localWriteStrokes
            }
            onStrokesChange={(next) => {
              if (state.phase === 'WRITE') {
                setLocalWriteStrokes(next);
              }
            }}
            canvasSize={canvasSize}
            watchTriggerKey={watchReplayCounter}
            onWatchComplete={handleWatchComplete}
            perStrokeTrace={state.phase === 'TRACE'}
            onTraceStrokeResult={handleTraceStrokeResult}
            onAutoEvaluateWrite={handleAutoOrManualWriteSubmit}
            autoEvaluateWriteMs={1200}
            onTouchActivity={registerActivity}
            pulseStartBadge={pulseStartBadge}
            demoStrokeRequest={demoStrokeRequest}
            slowWatch={state.slowWatch}
            thresholds={activeThresholds}
            hideTopRibbon
          />

          {/* Minimal Large Icon Controls (>= 72 dp, >= 16 dp spacing, spoken label on long-press) */}
          {state.phase !== 'WATCH' ? (
            <View style={[styles.iconControlsBar, isLandscape && styles.iconControlsColumn]}>
              {/* "Show me" 👀 button replays current stroke demo in place */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isAr ? 'شاهد الخطوة' : 'Show me'}
                onPress={handleShowMeInPlace}
                onLongPress={() =>
                  narrator.say('lesson.watch', undefined, { language: uiLang })
                }
                style={({ pressed }) => [
                  styles.roundIconBtn,
                  SHADOWS.button,
                  {
                    backgroundColor: COLORS.lavenderPurple,
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  },
                ]}
              >
                <Text style={styles.roundIconEmoji}>👀</Text>
              </Pressable>

              {state.phase === 'WRITE' ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isAr ? 'تراجع' : 'Undo'}
                    disabled={localWriteStrokes.length === 0}
                    onPress={handleUndoWrite}
                    onLongPress={() =>
                      narrator.sayText(isAr ? 'تراجع' : 'Undo', uiLang)
                    }
                    style={({ pressed }) => [
                      styles.roundIconBtn,
                      SHADOWS.button,
                      {
                        backgroundColor: COLORS.surface,
                        borderWidth: 3,
                        borderColor: COLORS.borderCard,
                        opacity: localWriteStrokes.length === 0 ? 0.4 : 1,
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                      },
                    ]}
                  >
                    <Text style={styles.roundIconEmoji}>↩️</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isAr ? 'مسح' : 'Clear'}
                    disabled={localWriteStrokes.length === 0}
                    onPress={handleClearCanvas}
                    onLongPress={() =>
                      narrator.sayText(isAr ? 'مسح' : 'Clear', uiLang)
                    }
                    style={({ pressed }) => [
                      styles.roundIconBtn,
                      SHADOWS.button,
                      {
                        backgroundColor: COLORS.coralOrangeLight,
                        borderWidth: 3,
                        borderColor: COLORS.coralOrange,
                        opacity: localWriteStrokes.length === 0 ? 0.4 : 1,
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                      },
                    ]}
                  >
                    <Text style={styles.roundIconEmoji}>🧹</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isAr ? 'تم' : 'Done'}
                    disabled={localWriteStrokes.length === 0}
                    onPress={() => handleAutoOrManualWriteSubmit(localWriteStrokes)}
                    style={({ pressed }) => [
                      styles.roundIconBtn,
                      SHADOWS.button,
                      {
                        backgroundColor: COLORS.mintGreen,
                        opacity: localWriteStrokes.length === 0 ? 0.45 : 1,
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                      },
                    ]}
                  >
                    <Text style={[styles.roundIconEmoji, { color: '#FFFFFF' }]}>✓</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Phase 5: In-place CELEBRATE / GENTLE_SKIP (auto-continues in ~3s + big ▶ icon) */}
      {state.phase === 'CELEBRATE' || state.phase === 'GENTLE_SKIP' ? (
        <View style={[styles.celebrateStage, SHADOWS.card]}>
          <View style={styles.starsRow}>
            <Animated.View style={star1Style}>
              <Text style={styles.celebrateStar}>⭐</Text>
            </Animated.View>
            <Animated.View style={star2Style}>
              <Text
                style={[
                  styles.celebrateStar,
                  { opacity: state.starsEarned >= 2 ? 1 : 0.25 },
                ]}
              >
                ⭐
              </Text>
            </Animated.View>
            <Animated.View style={star3Style}>
              <Text
                style={[
                  styles.celebrateStar,
                  { opacity: state.starsEarned >= 3 ? 1 : 0.25 },
                ]}
              >
                ⭐
              </Text>
            </Animated.View>
          </View>

          <Text style={styles.celebrateGlyph}>{displayedGlyph}</Text>
          <Text style={styles.celebrateWord}>
            {letter.example.emoji} {letter.example.word}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue to next adventure step"
            onPress={() =>
              dispatch({
                type:
                  state.phase === 'GENTLE_SKIP'
                    ? 'GENTLE_SKIP_COMPLETE'
                    : 'CELEBRATE_COMPLETE',
              })
            }
            style={({ pressed }) => [
              styles.bigContinueCircle,
              SHADOWS.button,
              { transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <Text style={styles.bigContinueIcon}>▶</Text>
          </Pressable>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  introStage: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 4,
    borderColor: COLORS.sunshineYellow,
  },
  introHeroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  introGlyphBubble: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 5,
    borderColor: COLORS.skyBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introGlyphText: {
    fontSize: 112,
    fontWeight: '900',
    fontFamily: 'NotoSansArabic-Regular',
  },
  introWordBubble: {
    minWidth: 210,
    backgroundColor: COLORS.surfaceWarm,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FDE68A',
    gap: SPACING.sm,
  },
  introEmoji: {
    fontSize: 82,
  },
  introWordText: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  lessonStudioWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  lessonStudioLandscape: {
    flexDirection: 'row',
  },
  iconControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20, // >= 16 dp spacing (WP9)
  },
  iconControlsColumn: {
    flexDirection: 'column',
  },
  roundIconBtn: {
    width: 76, // >= 72 dp target (WP9)
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundIconEmoji: {
    fontSize: 34,
    fontWeight: '900',
  },
  celebrateStage: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.sunshineYellow,
    gap: SPACING.lg,
  },
  starsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  celebrateStar: {
    fontSize: 72,
  },
  celebrateGlyph: {
    fontSize: 88,
    fontWeight: '900',
    color: COLORS.mintGreenDark,
    fontFamily: 'NotoSansArabic-Regular',
  },
  celebrateWord: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  bigContinueCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.mintGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigContinueIcon: {
    fontSize: 38,
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
