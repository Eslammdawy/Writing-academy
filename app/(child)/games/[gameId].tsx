import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MascotBanner,
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../../src/components/PlayfulUI';
import { useAppState } from '../../../src/context/AppStateContext';
import {
  getLetterById,
  getLetterDistractors,
  getLettersByLanguage,
} from '../../../src/data/curriculum';
import {
  aggregateGameOutcome,
  computeChoiceRoundScore,
  evaluateGameCanvasRound,
} from '../../../src/features/games/gameScoring';
import {
  HandwritingCanvas,
  TraceStrokeResultEvent,
} from '../../../src/features/handwriting/HandwritingCanvas';
import { useSafeNavigate } from '../../../src/hooks/useSafeNavigate';
import { useTabletLayout } from '../../../src/hooks/useTabletLayout';
import { audioService } from '../../../src/services/audio/audioService';
import { narrator } from '../../../src/services/audio/narrator';
import { SCORING_VERSION } from '../../../src/services/scoring/handwritingEvaluator';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../src/theme/tokens';
import {
  AchievementType,
  CurriculumLetter,
  GameId,
  LanguageCode,
  RecordedStroke,
} from '../../../src/types';
import { GAMES_CATALOG } from './index';

const TOTAL_ROUNDS = 3;

export default function GamePlayScreen() {
  const nav = useSafeNavigate();
  const params = useLocalSearchParams<{
    gameId: string;
    lang?: string;
    mission?: string;
    letters?: string;
    nextHref?: string;
  }>();
  const gameId = (params.gameId as GameId) || 'treasure_hunt';
  const { canvasSize } = useTabletLayout();
  const { activeChild, progressMap, recordPractice, unlockBadge } = useAppState();

  const language: LanguageCode =
    params.lang === 'ar' || params.lang === 'en'
      ? params.lang
      : activeChild.preferredLanguage;
  const isAr = language === 'ar';

  const gameSpec =
    GAMES_CATALOG.find((g) => g.id === gameId) ?? GAMES_CATALOG[0];
  const allLangLetters = useMemo(() => getLettersByLanguage(language), [language]);

  // If launched from Today's Adventure, prioritize the session's practiced letters
  const sessionLetters = useMemo(() => {
    if (!params.letters) return null;
    const ids = params.letters
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const resolved: CurriculumLetter[] = [];
    for (const id of ids) {
      const l = getLetterById(id);
      if (l && l.language === language) resolved.push(l);
    }
    return resolved.length > 0 ? resolved : null;
  }, [params.letters, language]);

  const [round, setRound] = useState(0);
  const [letterCursor, setLetterCursor] = useState(0);
  const [wrongTapsInRound, setWrongTapsInRound] = useState(0);
  const [shakingChoiceId, setShakingChoiceId] = useState<string | null>(null);
  const [recordedStrokes, setRecordedStrokes] = useState<RecordedStroke[]>([]);
  const [rocketLaunching, setRocketLaunching] = useState(false);
  const [monsterSmiling, setMonsterSmiling] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [finalStars, setFinalStars] = useState<1 | 2 | 3>(3);
  const [howToPlayStep, setHowToPlayStep] = useState<number>(0);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(true);
  const [demoStrokeRequest, setDemoStrokeRequest] = useState<{
    strokeIndex: number;
    key: number;
  } | null>(null);

  const gameStartTimeRef = useRef<number>(Date.now());
  const completionRecordedRef = useRef(false);

  const targetLetter = useMemo(() => {
    if (sessionLetters && sessionLetters.length > 0) {
      return sessionLetters[(letterCursor + round) % sessionLetters.length]!;
    }
    return (
      allLangLetters[(letterCursor + round * 3) % allLangLetters.length] ??
      allLangLetters[0]
    );
  }, [sessionLetters, allLangLetters, letterCursor, round]);

  const targetProgress = progressMap[targetLetter.id];
  const includeSimilar = (targetProgress?.attempts ?? 0) >= 1;

  const choices = useMemo(() => {
    const distractors = getLetterDistractors(targetLetter, 3, includeSimilar);
    const all = [targetLetter, ...distractors];
    return all.sort((a, b) => {
      const ha = (a.orderIndex * 17 + round * 7) % 13;
      const hb = (b.orderIndex * 17 + round * 7) % 13;
      return ha - hb;
    });
  }, [targetLetter, includeSimilar, round]);

  const activeModeForChallenge =
    gameId === 'letter_challenge'
      ? round === 0
        ? 'treasure_hunt'
        : round === 1
          ? 'match_picture'
          : 'write_to_launch'
      : gameId;

  const formKey = isAr ? 'isolated' : 'uppercase';
  const fullTemplates = targetLetter.strokeTemplates[formKey] ?? [];

  // For Complete the Monster: pre-fill all strokes except the last stroke
  const prefilledIndices = useMemo(() => {
    if (activeModeForChallenge !== 'complete_monster' || fullTemplates.length <= 1) {
      return [];
    }
    return fullTemplates.slice(0, -1).map((_, idx) => idx);
  }, [activeModeForChallenge, fullTemplates]);

  // Speak rule & run ~3s looping "how to play" visual animation on round enter (WP5)
  useEffect(() => {
    if (gameFinished) return;
    const vars = {
      letter: targetLetter.character,
      letterName: isAr ? targetLetter.nameAr.split('/')[0].trim() : targetLetter.character,
    };

    if (activeModeForChallenge === 'treasure_hunt') {
      narrator.say('game.find', vars, { language });
    } else if (activeModeForChallenge === 'match_picture') {
      narrator.say('game.matchPicture', vars, { language });
    } else if (activeModeForChallenge === 'write_to_launch') {
      narrator.say('game.launchRocket', vars, { language });
    } else {
      narrator.say('game.completeMonster', vars, { language });
    }

    setShowHowToPlay(true);
    let tick = 0;
    const interval = setInterval(() => {
      tick += 1;
      setHowToPlayStep(tick % 2);
    }, 550);
    const hideTimer = setTimeout(() => {
      clearInterval(interval);
      setShowHowToPlay(false);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(hideTimer);
    };
  }, [round, activeModeForChallenge, targetLetter, isAr, language, gameFinished]);

  // Auto-transition to Today's Adventure completion when `nextHref` is provided
  useEffect(() => {
    if (!gameFinished || !params.nextHref) return;
    const timer = setTimeout(() => {
      nav.replace(params.nextHref!);
    }, 2800);
    return () => clearTimeout(timer);
  }, [gameFinished, params.nextHref, nav]);

  const finishRoundOrGame = useCallback(
    async (roundScore: number) => {
      const nextScores = [...roundScores, roundScore];
      setRoundScores(nextScores);

      if (round + 1 < TOTAL_ROUNDS) {
        setRound((r) => r + 1);
        setWrongTapsInRound(0);
        setShakingChoiceId(null);
        setRecordedStrokes([]);
        setRocketLaunching(false);
        setMonsterSmiling(false);
      } else {
        const outcome = aggregateGameOutcome(
          nextScores,
          Date.now() - gameStartTimeRef.current
        );
        setFinalStars(outcome.starsEarned);

        if (!completionRecordedRef.current) {
          completionRecordedRef.current = true;
          audioService.playSoundEffect('celebrate');

          const badgeMap: Record<GameId, AchievementType> = {
            treasure_hunt: 'treasure_hunter',
            match_picture: 'word_builder_star',
            write_to_launch: 'rocket_launcher',
            complete_monster: 'monster_helper',
            letter_challenge: 'review_champion',
          };
          if (outcome.passed) {
            await unlockBadge(badgeMap[gameId]);
          }
          await recordPractice({
            letterId: targetLetter.id,
            formKey,
            mode:
              activeModeForChallenge === 'write_to_launch' ||
              activeModeForChallenge === 'complete_monster'
                ? 'trace'
                : 'recognition',
            score: outcome.score,
            passed: outcome.passed,
            starsEarned: outcome.starsEarned,
            scoringVersion: SCORING_VERSION,
            metricsJson: JSON.stringify({
              gameId,
              roundsCompleted: TOTAL_ROUNDS,
              roundScores: nextScores,
            }),
            durationSeconds: outcome.durationSeconds,
          });
        }
        setGameFinished(true);
      }
    },
    [
      roundScores,
      round,
      gameId,
      targetLetter.id,
      formKey,
      activeModeForChallenge,
      unlockBadge,
      recordPractice,
    ]
  );

  const handleChoiceSelect = async (pickedId: string) => {
    setShowHowToPlay(false);
    if (pickedId === targetLetter.id) {
      audioService.playSoundEffect('sparkle');
      audioService.pronounceLetter(targetLetter);
      narrator.say('game.correct', undefined, { language });
      const earnedScore = computeChoiceRoundScore(wrongTapsInRound);
      setTimeout(() => {
        finishRoundOrGame(earnedScore);
      }, 650);
    } else {
      // Gentle shake + highlight correct tile after 2nd miss + play letter sound (WP5)
      const nextWrong = wrongTapsInRound + 1;
      setWrongTapsInRound(nextWrong);
      setShakingChoiceId(pickedId);
      setTimeout(() => setShakingChoiceId(null), 380);

      audioService.playSoundEffect('gentle_hint');
      audioService.pronounceLetter(targetLetter);
      if (nextWrong >= 2) {
        narrator.say('game.tryAgain', undefined, { language });
      }
    }
  };

  const handleEvaluateCanvasGame = useCallback(
    (strokesToEval: RecordedStroke[]) => {
      const gameMode =
        activeModeForChallenge === 'complete_monster'
          ? 'complete_monster'
          : 'write_to_launch';
      const evalRes = evaluateGameCanvasRound(
        gameMode,
        formKey,
        fullTemplates,
        strokesToEval
      );

      if (evalRes.passed) {
        if (gameMode === 'write_to_launch') {
          audioService.playSoundEffect('rocket_launch');
          setRocketLaunching(true);
        } else {
          audioService.playSoundEffect('celebrate');
          setMonsterSmiling(true);
        }
        narrator.say('game.correct', undefined, { language });
        setTimeout(() => {
          finishRoundOrGame(evalRes.overallScore);
        }, 900);
      } else {
        const nextWrong = wrongTapsInRound + 1;
        setWrongTapsInRound(nextWrong);
        audioService.playSoundEffect('gentle_hint');
        narrator.say('lesson.stroke.retry', undefined, { language });
        if (nextWrong >= 2) {
          const targetIdx =
            gameMode === 'complete_monster'
              ? Math.max(0, fullTemplates.length - 1)
              : 0;
          setDemoStrokeRequest({ strokeIndex: targetIdx, key: Date.now() });
        }
      }
    },
    [
      activeModeForChallenge,
      formKey,
      fullTemplates,
      language,
      wrongTapsInRound,
      finishRoundOrGame,
    ]
  );

  // Auto-submit canvas game round when per-stroke trace finishes all required strokes!
  const handleTraceStrokeResult = useCallback(
    (event: TraceStrokeResultEvent) => {
      setShowHowToPlay(false);
      if (event.passed) {
        audioService.playSoundEffect('sparkle');
        if (event.completedAllStrokes) {
          handleEvaluateCanvasGame(event.allStrokes);
        }
      } else {
        const nextWrong = wrongTapsInRound + 1;
        setWrongTapsInRound(nextWrong);
        audioService.playSoundEffect('gentle_hint');
        narrator.say('lesson.stroke.retry', undefined, { language });
      }
    },
    [handleEvaluateCanvasGame, wrongTapsInRound, language]
  );

  const handleRestartGame = () => {
    completionRecordedRef.current = false;
    gameStartTimeRef.current = Date.now();
    setRound(0);
    setRoundScores([]);
    setWrongTapsInRound(0);
    setShakingChoiceId(null);
    setLetterCursor((c) => c + 2);
    setRecordedStrokes([]);
    setRocketLaunching(false);
    setMonsterSmiling(false);
    setGameFinished(false);
  };

  const highlightCorrectTile = wrongTapsInRound >= 2;

  return (
    <ScreenContainer scroll={false}>
      <TopAdventureHeader
        title={`${gameSpec.emoji} ${isAr ? gameSpec.titleAr : gameSpec.titleEn}`}
        subtitle={`${round + 1} / ${TOTAL_ROUNDS}`}
        language={language}
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onBack={() => nav.back('/(child)/games')}
        onHome={nav.goHome}
      />

      {gameFinished ? (
        <View style={[styles.celebrationCard, SHADOWS.card]}>
          <View style={styles.starsCelebrationRow}>
            {[1, 2, 3].map((s) => (
              <Text
                key={s}
                style={[
                  styles.bigCelebrationStar,
                  { opacity: s <= finalStars ? 1 : 0.25 },
                ]}
              >
                ⭐
              </Text>
            ))}
          </View>
          <Text style={styles.celebrationTitle}>
            {isAr ? 'رائع! أكملنا اللعبة!' : 'Hooray! You did it!'}
          </Text>

          <View style={styles.finishButtonsRow}>
            {params.nextHref ? (
              <PlayfulButton
                emoji="▶"
                label={isAr ? 'متابعة' : 'Continue'}
                color={COLORS.mintGreen}
                minHeight={80}
                onPress={() => nav.replace(params.nextHref!)}
                style={{ flex: 1 }}
              />
            ) : (
              <>
                <PlayfulButton
                  emoji="🔄"
                  label={isAr ? 'مرة أخرى' : 'Play Again'}
                  color={COLORS.skyBlue}
                  minHeight={76}
                  onPress={handleRestartGame}
                  style={{ flex: 1 }}
                />
                <PlayfulButton
                  emoji="🎮"
                  label={isAr ? 'الألعاب' : 'Games'}
                  color={COLORS.mintGreen}
                  minHeight={76}
                  onPress={() => nav.replace(`/(child)/games?lang=${language}`)}
                  style={{ flex: 1 }}
                />
              </>
            )}
          </View>
        </View>
      ) : (
        <>
          <MascotBanner
            mascotEmoji={gameSpec.emoji}
            title={`${targetLetter.character}  ${targetLetter.example.emoji} ${targetLetter.example.word}`}
            message={
              showHowToPlay
                ? isAr
                  ? '👆 شاهد واتبع الإشارة!'
                  : '👆 Watch and follow the pointer!'
                : isAr
                  ? 'اضغط هنا لسماع الصوت مرة أخرى 🔊'
                  : 'Tap here to hear it again 🔊'
            }
            isRtl={isAr}
            onAudioReplay={() => {
              audioService.pronounceLetter(targetLetter);
              narrator.repeat();
            }}
          />

          {/* Game Mechanics 1 & 2: Treasure Hunt OR Match the Picture */}
          {activeModeForChallenge === 'treasure_hunt' ||
          activeModeForChallenge === 'match_picture' ? (
            <View style={[styles.gameStageCard, SHADOWS.card]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Play target letter sound"
                onPress={() => audioService.pronounceLetter(targetLetter)}
                style={styles.promptBanner}
              >
                <Text style={styles.promptEmoji}>
                  {activeModeForChallenge === 'treasure_hunt'
                    ? targetLetter.example.emoji
                    : '🔊'}
                </Text>
                <Text style={styles.promptTargetText}>{targetLetter.character}</Text>
                {showHowToPlay ? (
                  <Text
                    style={[
                      styles.howToPlayFinger,
                      {
                        transform: [{ translateY: howToPlayStep === 0 ? -6 : 6 }],
                      },
                    ]}
                  >
                    👆
                  </Text>
                ) : null}
              </Pressable>

              <View style={styles.choicesGrid}>
                {choices.map((item) => {
                  const isCorrect = item.id === targetLetter.id;
                  const isGlowing = highlightCorrectTile && isCorrect;
                  const isShaking = shakingChoiceId === item.id;

                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Choice ${item.character} ${item.example.word}`}
                      onPress={() => handleChoiceSelect(item.id)}
                      style={({ pressed }) => [
                        styles.choiceCard,
                        SHADOWS.button,
                        isGlowing && styles.choiceCardGlowing,
                        {
                          transform: [
                            { scale: pressed ? 0.95 : isGlowing ? 1.06 : 1 },
                            { translateX: isShaking ? -8 : 0 },
                          ],
                        },
                      ]}
                    >
                      {activeModeForChallenge === 'treasure_hunt' ? (
                        <>
                          <Text style={styles.chestIcon}>
                            {isGlowing ? '✨🎁✨' : '🎁'}
                          </Text>
                          <Text style={styles.choiceBigLetter}>{item.character}</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.choiceBigEmoji}>
                            {item.example.emoji}
                          </Text>
                          <Text style={styles.choiceWordText}>
                            {item.example.word}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            /* Game Mechanics 3 & 4: Write to Launch OR Complete the Monster */
            <View style={styles.canvasGameRow}>
              <View style={styles.canvasCenterCol}>
                <HandwritingCanvas
                  mode="trace"
                  language={language}
                  templates={fullTemplates}
                  recordedStrokes={recordedStrokes}
                  onStrokesChange={setRecordedStrokes}
                  canvasSize={Math.min(canvasSize, 410)}
                  prefilledTemplateIndices={prefilledIndices}
                  perStrokeTrace
                  onTraceStrokeResult={handleTraceStrokeResult}
                  pulseStartBadge={showHowToPlay || highlightCorrectTile}
                  demoStrokeRequest={demoStrokeRequest}
                  hideTopRibbon
                />

                <View style={styles.canvasGameActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isAr ? 'شاهد' : 'Show me'}
                    onPress={() => {
                      const targetIdx =
                        activeModeForChallenge === 'complete_monster'
                          ? Math.max(0, fullTemplates.length - 1)
                          : Math.min(
                              recordedStrokes.length,
                              Math.max(0, fullTemplates.length - 1)
                            );
                      setDemoStrokeRequest({ strokeIndex: targetIdx, key: Date.now() });
                    }}
                    style={styles.roundActionIconBtn}
                  >
                    <Text style={styles.roundActionIconText}>👀</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isAr ? 'مسح' : 'Clear'}
                    disabled={recordedStrokes.length === 0}
                    onPress={() => setRecordedStrokes([])}
                    style={[
                      styles.roundActionIconBtn,
                      { opacity: recordedStrokes.length === 0 ? 0.4 : 1 },
                    ]}
                  >
                    <Text style={styles.roundActionIconText}>🧹</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      activeModeForChallenge === 'write_to_launch'
                        ? 'Launch Rocket'
                        : 'Complete Monster'
                    }
                    disabled={recordedStrokes.length === 0}
                    onPress={() => handleEvaluateCanvasGame(recordedStrokes)}
                    style={[
                      styles.roundActionIconBtn,
                      {
                        backgroundColor:
                          activeModeForChallenge === 'write_to_launch'
                            ? COLORS.coralOrange
                            : COLORS.lavenderPurple,
                        opacity: recordedStrokes.length === 0 ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.roundActionIconText}>
                      {activeModeForChallenge === 'write_to_launch' ? '🚀' : '👾'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Animated Rocket or Friendly Monster Companion Panel */}
              <View style={[styles.companionCard, SHADOWS.card]}>
                {activeModeForChallenge === 'write_to_launch' ? (
                  <Text
                    style={[
                      styles.companionHeroEmoji,
                      rocketLaunching && { transform: [{ translateY: -28 }] },
                    ]}
                  >
                    {rocketLaunching ? '🚀✨🔥' : '🚀'}
                  </Text>
                ) : (
                  <Text style={styles.companionHeroEmoji}>
                    {monsterSmiling ? '👾🎉💖' : '👾'}
                  </Text>
                )}
                <Text style={styles.companionTargetChar}>
                  {targetLetter.character}
                </Text>
                <Text style={styles.companionWord}>
                  {targetLetter.example.emoji} {targetLetter.example.word}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gameStageCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  promptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceWarm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 3,
    borderColor: COLORS.sunshineYellow,
    gap: SPACING.md,
  },
  promptEmoji: {
    fontSize: 44,
  },
  promptTargetText: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  howToPlayFinger: {
    fontSize: 36,
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20, // >= 16 dp spacing (WP9)
    width: '100%',
  },
  choiceCard: {
    width: '44%',
    minWidth: 180,
    maxWidth: 260,
    minHeight: 136,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: COLORS.skyBlueLight,
    gap: 8,
  },
  choiceCardGlowing: {
    backgroundColor: COLORS.sunshineYellowLight,
    borderColor: COLORS.sunshineYellow,
    borderWidth: 6,
  },
  chestIcon: {
    fontSize: 32,
  },
  choiceBigLetter: {
    fontSize: 56,
    fontWeight: '900',
    color: COLORS.skyBlueDark,
    fontFamily: 'NotoSansArabic-Regular',
  },
  choiceBigEmoji: {
    fontSize: 60,
  },
  choiceWordText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  canvasGameRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xl,
  },
  canvasCenterCol: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  canvasGameActions: {
    flexDirection: 'row',
    gap: 20, // >= 16 dp spacing (WP9)
  },
  roundActionIconBtn: {
    width: 76, // >= 72 dp (WP9)
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.borderCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundActionIconText: {
    fontSize: 34,
  },
  companionCard: {
    minWidth: 220,
    maxWidth: 300,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  companionHeroEmoji: {
    fontSize: 68,
  },
  companionTargetChar: {
    fontSize: 64,
    fontWeight: '900',
    color: COLORS.coralOrangeDark,
    fontFamily: 'NotoSansArabic-Regular',
  },
  companionWord: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  celebrationCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.sunshineYellow,
    gap: SPACING.lg,
  },
  starsCelebrationRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  bigCelebrationStar: {
    fontSize: 68,
  },
  celebrationTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  finishButtonsRow: {
    flexDirection: 'row',
    gap: 20,
    width: '100%',
    maxWidth: 460,
  },
});
