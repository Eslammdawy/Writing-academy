import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MascotBanner,
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../../src/components/PlayfulUI';
import { useAppState } from '../../../src/context/AppStateContext';
import { getWordBuilderDeck } from '../../../src/data/curriculum';
import { computeWordBuilderOutcome } from '../../../src/features/games/gameScoring';
import { useSafeNavigate } from '../../../src/hooks/useSafeNavigate';
import { audioService } from '../../../src/services/audio/audioService';
import { narrator } from '../../../src/services/audio/narrator';
import { SCORING_VERSION } from '../../../src/services/scoring/handwritingEvaluator';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../src/theme/tokens';
import { LanguageCode } from '../../../src/types';

export default function WordBuilderScreen() {
  const nav = useSafeNavigate();
  const params = useLocalSearchParams<{ language: string }>();
  const { activeChild, parentSettings, recordPractice, unlockBadge } = useAppState();
  const [language, setLanguage] = useState<LanguageCode>(
    params.language === 'ar' || params.language === 'en'
      ? params.language
      : activeChild.preferredLanguage
  );
  const isAr = language === 'ar';

  const deck = useMemo(() => getWordBuilderDeck(language), [language]);
  const [wordIndex, setWordIndex] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [completedCurrent, setCompletedCurrent] = useState(false);
  const [wrongTapsOnCurrentSlot, setWrongTapsOnCurrentSlot] = useState(0);
  const [totalWrongTapsOnWord, setTotalWrongTapsOnWord] = useState(0);
  const [shakingPoolIdx, setShakingPoolIdx] = useState<number | null>(null);

  const wordStartTimeRef = useRef<number>(Date.now());

  const currentItem = deck[wordIndex % deck.length] ?? deck[0];
  const targetLetters = currentItem.example.letters;

  // Deterministic scramble so tiles are shuffled
  const scrambledPool = useMemo(() => {
    const indexed = targetLetters.map((char, idx) => ({ char, originalIdx: idx }));
    return [...indexed].sort((a, b) => {
      const hashA = (a.originalIdx * 31 + a.char.charCodeAt(0)) % 17;
      const hashB = (b.originalIdx * 31 + b.char.charCodeAt(0)) % 17;
      return hashA - hashB || b.originalIdx - a.originalIdx;
    });
  }, [targetLetters]);

  // Speak target word when entering a new word card (WP5)
  useEffect(() => {
    wordStartTimeRef.current = Date.now();
    audioService.pronounceWord(currentItem.example.word, language);
    narrator.say(
      'words.intro',
      { word: currentItem.example.word },
      { language, enqueue: true }
    );
  }, [currentItem.example.word, language]);

  const handleSwitchLanguage = (nextLang: LanguageCode) => {
    audioService.playSoundEffect('tap');
    setLanguage(nextLang);
    setWordIndex(0);
    setSelectedIndices([]);
    setCompletedCurrent(false);
    setWrongTapsOnCurrentSlot(0);
    setTotalWrongTapsOnWord(0);
  };

  const handleSelectTile = async (poolIndex: number) => {
    if (completedCurrent || selectedIndices.includes(poolIndex)) return;
    const picked = scrambledPool[poolIndex];
    const nextExpectedIdx = selectedIndices.length;
    const expectedChar = targetLetters[nextExpectedIdx];

    // Always speak the tapped letter
    audioService.speakText(picked.char, language);

    if (picked.char === expectedChar) {
      audioService.playSoundEffect('sparkle');
      const nextSelected = [...selectedIndices, poolIndex];
      setSelectedIndices(nextSelected);
      setWrongTapsOnCurrentSlot(0);

      if (nextSelected.length === targetLetters.length) {
        setCompletedCurrent(true);
        audioService.playSoundEffect('celebrate');
        narrator.say(
          'words.completed',
          { word: currentItem.example.word },
          { language }
        );

        const outcome = computeWordBuilderOutcome(
          targetLetters.length,
          totalWrongTapsOnWord,
          Date.now() - wordStartTimeRef.current
        );

        await unlockBadge('word_builder_star');
        await recordPractice({
          letterId: currentItem.letterId,
          formKey: isAr ? 'isolated' : 'uppercase',
          mode: 'recognition',
          score: outcome.score,
          passed: outcome.passed,
          starsEarned: outcome.starsEarned,
          scoringVersion: SCORING_VERSION,
          metricsJson: JSON.stringify({
            wordBuilt: currentItem.example.word,
            wrongTapCount: totalWrongTapsOnWord,
          }),
          durationSeconds: outcome.durationSeconds,
        });
      }
    } else {
      const nextWrongSlot = wrongTapsOnCurrentSlot + 1;
      setWrongTapsOnCurrentSlot(nextWrongSlot);
      setTotalWrongTapsOnWord((w) => w + 1);
      setShakingPoolIdx(poolIndex);
      setTimeout(() => setShakingPoolIdx(null), 360);

      audioService.playSoundEffect('gentle_hint');
      if (nextWrongSlot >= 2) {
        narrator.say('words.tapNext', { letter: expectedChar }, { language });
      }
    }
  };

  const handleNextWord = () => {
    audioService.playSoundEffect('tap');
    setWordIndex((i) => (i + 1) % deck.length);
    setSelectedIndices([]);
    setCompletedCurrent(false);
    setWrongTapsOnCurrentSlot(0);
    setTotalWrongTapsOnWord(0);
  };

  const expectedCharForNextSlot = targetLetters[selectedIndices.length];
  const pulseCorrectTile = wrongTapsOnCurrentSlot >= 2;

  return (
    <ScreenContainer
      backgroundColor={isAr ? COLORS.arabicWorldBg : COLORS.englishWorldBg}
    >
      <TopAdventureHeader
        title={isAr ? 'باني الكلمات' : 'Word Builder'}
        language={language}
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onBack={() => nav.back()}
        onHome={nav.goHome}
        rightElement={
          parentSettings.exploreMode ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch language"
              onPress={() => handleSwitchLanguage(language === 'en' ? 'ar' : 'en')}
              style={styles.langPillBtn}
            >
              <Text style={styles.langPillText}>
                {language === 'en' ? '🔤 EN' : '🕌 ع'}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <MascotBanner
        mascotEmoji="🧩🦊"
        title={`${currentItem.example.emoji} ${currentItem.example.word}`}
        message={
          completedCurrent
            ? '⭐⭐⭐'
            : isAr
              ? 'اضغط لسماع الكلمة مرة أخرى 🔊'
              : 'Tap to hear the word again 🔊'
        }
        isRtl={isAr}
        onAudioReplay={() =>
          audioService.pronounceWord(currentItem.example.word, language)
        }
      />

      {/* Word & Picture Stage */}
      <View style={[styles.stageCard, SHADOWS.card]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Listen to word"
          onPress={() =>
            audioService.pronounceWord(currentItem.example.word, language)
          }
          style={styles.pictureRow}
        >
          <View style={styles.emojiCircle}>
            <Text style={styles.bigEmoji}>{currentItem.example.emoji}</Text>
          </View>
          <View style={styles.wordMetaCol}>
            <Text style={styles.joinedPreview}>{currentItem.example.word}</Text>
          </View>
          <View style={styles.speakerBtn}>
            <Text style={{ fontSize: 30 }}>🔊</Text>
          </View>
        </Pressable>

        {/* Answer Slots (RTL for Arabic, LTR for English) */}
        <View style={[styles.slotsRow, isAr && styles.slotsRowRtl]}>
          {targetLetters.map((expectedChar, slotIdx) => {
            const filled = slotIdx < selectedIndices.length;
            return (
              <View
                key={`slot_${slotIdx}`}
                style={[
                  styles.slotBox,
                  filled && {
                    backgroundColor: COLORS.mintGreenLight,
                    borderColor: COLORS.mintGreen,
                    borderStyle: 'solid',
                  },
                ]}
              >
                <Text style={styles.slotCharText}>
                  {filled ? expectedChar : '?'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Scrambled Letter Tiles (pulses correct tile after 2 wrong taps) */}
        <View style={[styles.tilesRow, isAr && styles.slotsRowRtl]}>
          {scrambledPool.map((tile, poolIdx) => {
            const used = selectedIndices.includes(poolIdx);
            const isCorrectNext =
              !used &&
              !completedCurrent &&
              tile.char === expectedCharForNextSlot;
            const isGlowing = pulseCorrectTile && isCorrectNext;
            const isShaking = shakingPoolIdx === poolIdx;

            return (
              <Pressable
                key={`tile_${poolIdx}`}
                accessibilityRole="button"
                accessibilityLabel={`Letter tile ${tile.char}`}
                disabled={used}
                onPress={() => handleSelectTile(poolIdx)}
                style={({ pressed }) => [
                  styles.letterChoiceTile,
                  SHADOWS.button,
                  used && styles.letterChoiceTileUsed,
                  isGlowing && styles.letterChoiceTileGlow,
                  {
                    transform: [
                      { scale: pressed ? 0.94 : isGlowing ? 1.1 : 1 },
                      { translateX: isShaking ? -8 : 0 },
                    ],
                  },
                ]}
              >
                <Text style={styles.letterChoiceText}>{tile.char}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.bottomActions}>
          <PlayfulButton
            emoji="🔄"
            label={isAr ? 'إعادة' : 'Reset'}
            color={COLORS.textSecondary}
            variant="outline"
            minHeight={72}
            onPress={() => {
              setSelectedIndices([]);
              setCompletedCurrent(false);
              setWrongTapsOnCurrentSlot(0);
            }}
          />

          <PlayfulButton
            emoji="▶"
            label={isAr ? 'التالي' : 'Next'}
            color={COLORS.coralOrange}
            minHeight={72}
            onPress={handleNextWord}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  langPillBtn: {
    minWidth: 72,
    height: 54,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.borderCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPillText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  stageCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.lg,
  },
  pictureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    width: '100%',
    flexWrap: 'wrap',
  },
  emojiCircle: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: COLORS.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: COLORS.sunshineYellow,
  },
  bigEmoji: {
    fontSize: 64,
  },
  wordMetaCol: {
    flex: 1,
    minWidth: 160,
    alignItems: 'center',
  },
  joinedPreview: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  speakerBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.skyBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 18,
  },
  slotsRowRtl: {
    flexDirection: 'row-reverse',
  },
  slotBox: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 3.5,
    borderStyle: 'dashed',
    borderColor: COLORS.borderCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCharText: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20, // >= 16 dp spacing (WP9)
  },
  letterChoiceTile: {
    width: 92, // >= 72 dp (WP9)
    height: 92,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.sunshineYellowLight,
    borderWidth: 3.5,
    borderColor: COLORS.sunshineYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterChoiceTileUsed: {
    opacity: 0.25,
  },
  letterChoiceTileGlow: {
    backgroundColor: COLORS.mintGreenLight,
    borderColor: COLORS.mintGreen,
    borderWidth: 6,
  },
  letterChoiceText: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: SPACING.sm,
  },
});
