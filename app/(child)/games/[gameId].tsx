import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MascotBanner,
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../../src/components/PlayfulUI';
import { useAppState } from '../../../src/context/AppStateContext';
import {
  getLetterDistractors,
  getLettersByLanguage,
} from '../../../src/data/curriculum';
import { HandwritingCanvas } from '../../../src/features/handwriting/HandwritingCanvas';
import { useTabletLayout } from '../../../src/hooks/useTabletLayout';
import { audioService } from '../../../src/services/audio/audioService';
import {
  evaluateHandwritingAttempt,
  SCORING_VERSION,
} from '../../../src/services/scoring/handwritingEvaluator';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../src/theme/tokens';
import {
  AchievementType,
  GameId,
  LanguageCode,
  RecordedStroke,
} from '../../../src/types';
import { GAMES_CATALOG } from './index';

const TOTAL_ROUNDS = 3;

export default function GamePlayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameId: string; lang?: string }>();
  const gameId = (params.gameId as GameId) || 'treasure_hunt';
  const language: LanguageCode = params.lang === 'ar' ? 'ar' : 'en';
  const isAr = language === 'ar';

  const { canvasSize } = useTabletLayout();
  const { activeChild, progressMap, recordPractice, unlockBadge } = useAppState();

  const gameSpec =
    GAMES_CATALOG.find((g) => g.id === gameId) ?? GAMES_CATALOG[0];
  const letters = useMemo(() => getLettersByLanguage(language), [language]);

  const [round, setRound] = useState(0);
  const [letterCursor, setLetterCursor] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [recordedStrokes, setRecordedStrokes] = useState<RecordedStroke[]>([]);
  const [rocketLaunching, setRocketLaunching] = useState(false);
  const [monsterSmiling, setMonsterSmiling] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  const completionRecordedRef = useRef(false);

  const targetLetter = letters[(letterCursor + round * 3) % letters.length] ?? letters[0];
  const targetProgress = progressMap[targetLetter.id];
  // Only introduce visually-similar Arabic distractors (e.g. ب/ت/ث) once the child has started learning the letter
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

  // For Complete the Monster: pre-fill all strokes except the last stroke (e.g. final curve or Arabic dot!)
  const prefilledIndices = useMemo(() => {
    if (activeModeForChallenge !== 'complete_monster' || fullTemplates.length <= 1) {
      return [];
    }
    return fullTemplates.slice(0, -1).map((_, idx) => idx);
  }, [activeModeForChallenge, fullTemplates]);

  const finishRoundOrGame = async () => {
    if (round + 1 < TOTAL_ROUNDS) {
      setRound((r) => r + 1);
      setRecordedStrokes([]);
      setFeedbackMsg(null);
      setRocketLaunching(false);
      setMonsterSmiling(false);
    } else {
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
        await unlockBadge(badgeMap[gameId]);
        await recordPractice({
          letterId: targetLetter.id,
          formKey,
          mode:
            activeModeForChallenge === 'write_to_launch' ||
            activeModeForChallenge === 'complete_monster'
              ? 'trace'
              : 'recognition',
          score: 92,
          passed: true,
          starsEarned: 3,
          scoringVersion: SCORING_VERSION,
          metricsJson: JSON.stringify({ gameId, roundsCompleted: TOTAL_ROUNDS }),
          durationSeconds: 35,
        });
      }
      setGameFinished(true);
    }
  };

  const handleChoiceSelect = async (pickedId: string) => {
    if (pickedId === targetLetter.id) {
      audioService.playSoundEffect('sparkle');
      audioService.pronounceLetter(targetLetter);
      setFeedbackMsg(
        isAr ? '🎉 إجابة صحيحة! عمل رائع!' : '🎉 Correct! Wonderful job!'
      );
      setTimeout(() => {
        finishRoundOrGame();
      }, 650);
    } else {
      audioService.playSoundEffect('gentle_hint');
      setFeedbackMsg(
        isAr
          ? `ابحث مرة أخرى عن ${targetLetter.nameAr} (${targetLetter.character})!`
          : `Try again! Look for ${targetLetter.character} (${targetLetter.example.word})!`
      );
    }
  };

  const handleCanvasSubmit = async () => {
    const templatesToCheck =
      activeModeForChallenge === 'complete_monster' && fullTemplates.length > 1
        ? [fullTemplates[fullTemplates.length - 1]]
        : fullTemplates;

    const evalRes = evaluateHandwritingAttempt(
      'trace',
      formKey,
      templatesToCheck,
      recordedStrokes
    );

    if (evalRes.passed || recordedStrokes.length >= 1) {
      if (activeModeForChallenge === 'write_to_launch') {
        audioService.playSoundEffect('rocket_launch');
        setRocketLaunching(true);
      } else {
        audioService.playSoundEffect('celebrate');
        setMonsterSmiling(true);
      }
      setFeedbackMsg(
        isAr ? evalRes.encouragementTitleAr : evalRes.encouragementTitleEn
      );
      setTimeout(() => {
        finishRoundOrGame();
      }, 950);
    } else {
      audioService.playSoundEffect('gentle_hint');
      setFeedbackMsg(isAr ? evalRes.gentleHintAr : evalRes.gentleHintEn);
    }
  };

  const handleRestartGame = () => {
    completionRecordedRef.current = false;
    setRound(0);
    setLetterCursor((c) => c + 2);
    setRecordedStrokes([]);
    setFeedbackMsg(null);
    setRocketLaunching(false);
    setMonsterSmiling(false);
    setGameFinished(false);
  };

  return (
    <ScreenContainer>
      <TopAdventureHeader
        title={isAr ? gameSpec.titleAr : gameSpec.titleEn}
        subtitle={
          isAr
            ? `الجولة ${round + 1} من ${TOTAL_ROUNDS}`
            : `Round ${round + 1} of ${TOTAL_ROUNDS}`
        }
        language={language}
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onBack={() => router.push('/(child)/games')}
        onHome={() => router.push('/(child)/home')}
      />

      {gameFinished ? (
        <View style={[styles.celebrationCard, SHADOWS.card]}>
          <Text style={styles.bigCelebrationEmoji}>🏆⭐🎉</Text>
          <Text style={styles.celebrationTitle}>
            {isAr ? 'أحسنت يا بطل! أكملت اللعبة!' : 'Hooray! You Completed the Game!'}
          </Text>
          <Text style={styles.celebrationSubtitle}>
            {isAr
              ? 'حصلت على ٣ نجوم ذهبية وملصق جديد في ألبومك!'
              : 'You earned +3 Golden Stars and a Sticker Badge for your album!'}
          </Text>

          <View style={styles.finishButtonsRow}>
            <PlayfulButton
              emoji="🔄"
              label={isAr ? 'العب مرة أخرى' : 'Play Again'}
              color={COLORS.skyBlue}
              onPress={handleRestartGame}
              style={{ flex: 1 }}
            />
            <PlayfulButton
              emoji="🎮"
              label={isAr ? 'كل الألعاب' : 'Games Lobby'}
              color={COLORS.mintGreen}
              onPress={() => router.push('/(child)/games')}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : (
        <>
          <MascotBanner
            mascotEmoji={gameSpec.emoji}
            title={
              feedbackMsg ??
              (activeModeForChallenge === 'treasure_hunt'
                ? isAr
                  ? `افتح الصندوق الذي يحتوي على: ${targetLetter.nameAr}`
                  : `Find the treasure chest with: ${targetLetter.nameEn}`
                : activeModeForChallenge === 'match_picture'
                  ? isAr
                    ? `أي صورة تبدأ بحرف (${targetLetter.character})؟`
                    : `Which picture starts with the letter "${targetLetter.character}"?`
                  : activeModeForChallenge === 'write_to_launch'
                    ? isAr
                      ? `اكتب حرف (${targetLetter.character}) لإطلاق الصاروخ! 🚀`
                      : `Trace letter "${targetLetter.character}" to launch the rocket! 🚀`
                    : isAr
                      ? `أكمل الجزء الناقص من حرف (${targetLetter.character}) ليبتسم الوحش! 👾`
                      : `Complete the missing stroke of "${targetLetter.character}" for the friendly monster! 👾`)
            }
            message={
              isAr
                ? `مثال: ${targetLetter.example.word} ${targetLetter.example.emoji}`
                : `Hint: ${targetLetter.character} is for ${targetLetter.example.word} ${targetLetter.example.emoji}`
            }
            isRtl={isAr}
            onAudioReplay={() => audioService.pronounceLetter(targetLetter)}
          />

          {/* Game Mechanics 1 & 2: Treasure Hunt OR Match the Picture */}
          {activeModeForChallenge === 'treasure_hunt' ||
          activeModeForChallenge === 'match_picture' ? (
            <View style={[styles.gameStageCard, SHADOWS.card]}>
              <View style={styles.promptBanner}>
                <Text style={styles.promptEmoji}>
                  {activeModeForChallenge === 'treasure_hunt'
                    ? targetLetter.example.emoji
                    : '🔊'}
                </Text>
                <Text style={styles.promptTargetText}>
                  {activeModeForChallenge === 'treasure_hunt'
                    ? `${targetLetter.character}`
                    : `${targetLetter.character} (${targetLetter.soundLabel})`}
                </Text>
              </View>

              <View style={styles.choicesGrid}>
                {choices.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Choice ${item.character} ${item.example.word}`}
                    onPress={() => handleChoiceSelect(item.id)}
                    style={({ pressed }) => [
                      styles.choiceCard,
                      SHADOWS.button,
                      { transform: [{ scale: pressed ? 0.96 : 1 }] },
                    ]}
                  >
                    {activeModeForChallenge === 'treasure_hunt' ? (
                      <>
                        <Text style={styles.chestIcon}>🎁</Text>
                        <Text style={styles.choiceBigLetter}>{item.character}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.choiceBigEmoji}>{item.example.emoji}</Text>
                        <Text style={styles.choiceWordText}>{item.example.word}</Text>
                      </>
                    )}
                  </Pressable>
                ))}
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
                  canvasSize={Math.min(canvasSize, 420)}
                  prefilledTemplateIndices={prefilledIndices}
                />

                <View style={styles.canvasGameActions}>
                  <PlayfulButton
                    emoji="🧹"
                    label={isAr ? 'مسح' : 'Clear'}
                    color={COLORS.textSecondary}
                    variant="outline"
                    onPress={() => setRecordedStrokes([])}
                  />
                  <PlayfulButton
                    emoji={
                      activeModeForChallenge === 'write_to_launch' ? '🚀' : '👾'
                    }
                    label={
                      activeModeForChallenge === 'write_to_launch'
                        ? isAr
                          ? 'أطلق الصاروخ!'
                          : 'Launch Rocket!'
                        : isAr
                          ? 'أكمل الوحش!'
                          : 'Complete Monster!'
                    }
                    color={
                      activeModeForChallenge === 'write_to_launch'
                        ? COLORS.coralOrange
                        : COLORS.lavenderPurple
                    }
                    disabled={recordedStrokes.length === 0}
                    onPress={handleCanvasSubmit}
                  />
                </View>
              </View>

              {/* Animated Rocket or Friendly Monster Companion Panel */}
              <View style={[styles.companionCard, SHADOWS.card]}>
                {activeModeForChallenge === 'write_to_launch' ? (
                  <>
                    <Text
                      style={[
                        styles.companionHeroEmoji,
                        rocketLaunching && { transform: [{ translateY: -28 }] },
                      ]}
                    >
                      {rocketLaunching ? '🚀✨🔥' : '🚀'}
                    </Text>
                    <Text style={styles.companionTitle}>
                      {rocketLaunching
                        ? isAr
                          ? 'انطلاق رائع إلى الفضاء!'
                          : '3... 2... 1... Blast Off!'
                        : isAr
                          ? 'الصاروخ جاهز على المنصة'
                          : 'Rocket Ready on Launchpad'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.companionHeroEmoji}>
                      {monsterSmiling ? '👾🎉💖' : '👾❓'}
                    </Text>
                    <Text style={styles.companionTitle}>
                      {monsterSmiling
                        ? isAr
                          ? 'الوحش اللطيف سعيد جدًا!'
                          : 'Monster Buddy is Super Happy!'
                        : isAr
                          ? 'أكمل الخط أو النقطة الأخيرة!'
                          : 'Finish the missing curve or dot!'}
                    </Text>
                  </>
                )}
                <Text style={styles.companionTargetChar}>{targetLetter.character}</Text>
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
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
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
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.lg,
    width: '100%',
  },
  choiceCard: {
    width: '44%',
    minWidth: 180,
    maxWidth: 260,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.skyBlueLight,
    gap: 8,
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
    fontSize: 58,
  },
  choiceWordText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  canvasGameRow: {
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
    gap: SPACING.md,
  },
  companionCard: {
    minWidth: 250,
    maxWidth: 340,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  companionHeroEmoji: {
    fontSize: 68,
  },
  companionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  companionTargetChar: {
    fontSize: 64,
    fontWeight: '900',
    color: COLORS.coralOrangeDark,
    fontFamily: 'NotoSansArabic-Regular',
  },
  companionWord: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  celebrationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.sunshineYellow,
    marginTop: SPACING.lg,
  },
  bigCelebrationEmoji: {
    fontSize: 68,
    marginBottom: SPACING.md,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  finishButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
    maxWidth: 460,
  },
});
