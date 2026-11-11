import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MascotBanner,
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../../src/components/PlayfulUI';
import { useAppState } from '../../../src/context/AppStateContext';
import { getWordBuilderDeck } from '../../../src/data/curriculum';
import { audioService } from '../../../src/services/audio/audioService';
import { SCORING_VERSION } from '../../../src/services/scoring/handwritingEvaluator';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../src/theme/tokens';
import { LanguageCode } from '../../../src/types';

export default function WordBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ language: string }>();
  const [language, setLanguage] = useState<LanguageCode>(
    params.language === 'ar' ? 'ar' : 'en'
  );
  const isAr = language === 'ar';
  const { activeChild, recordPractice, unlockBadge } = useAppState();

  const deck = useMemo(() => getWordBuilderDeck(language), [language]);
  const [wordIndex, setWordIndex] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [completedCurrent, setCompletedCurrent] = useState(false);
  const [gentleHint, setGentleHint] = useState<string | null>(null);

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

  const handleSwitchLanguage = (nextLang: LanguageCode) => {
    audioService.playSoundEffect('tap');
    setLanguage(nextLang);
    setWordIndex(0);
    setSelectedIndices([]);
    setCompletedCurrent(false);
    setGentleHint(null);
  };

  const handleSelectTile = async (poolIndex: number) => {
    if (completedCurrent || selectedIndices.includes(poolIndex)) return;
    const picked = scrambledPool[poolIndex];
    const nextExpectedIdx = selectedIndices.length;
    const expectedChar = targetLetters[nextExpectedIdx];

    if (picked.char === expectedChar) {
      audioService.playSoundEffect('sparkle');
      const nextSelected = [...selectedIndices, poolIndex];
      setSelectedIndices(nextSelected);
      setGentleHint(null);

      if (nextSelected.length === targetLetters.length) {
        setCompletedCurrent(true);
        audioService.playSoundEffect('celebrate');
        audioService.pronounceWord(currentItem.example.word, language);
        await unlockBadge('word_builder_star');
        await recordPractice({
          letterId: currentItem.letterId,
          formKey: isAr ? 'isolated' : 'uppercase',
          mode: 'recognition',
          score: 95,
          passed: true,
          starsEarned: 2,
          scoringVersion: SCORING_VERSION,
          metricsJson: JSON.stringify({ wordBuilt: currentItem.example.word }),
          durationSeconds: 15,
        });
      }
    } else {
      audioService.playSoundEffect('gentle_hint');
      setGentleHint(
        isAr
          ? `جرّب البحث عن حرف (${expectedChar}) الآن!`
          : `Try looking for the letter "${expectedChar}" next!`
      );
    }
  };

  const handleNextWord = () => {
    audioService.playSoundEffect('tap');
    setWordIndex((i) => (i + 1) % deck.length);
    setSelectedIndices([]);
    setCompletedCurrent(false);
    setGentleHint(null);
  };

  return (
    <ScreenContainer
      backgroundColor={isAr ? COLORS.arabicWorldBg : COLORS.englishWorldBg}
    >
      <TopAdventureHeader
        title={isAr ? 'باني الكلمات المصورة' : 'Picture Word Builder'}
        subtitle={
          isAr
            ? 'رتّب الحروف من اليمين إلى اليسار لتكوين الكلمة'
            : 'Tap letters in order from left to right to spell the word!'
        }
        language={language}
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onBack={() => router.back()}
        onHome={() => router.push('/(child)/home')}
      />

      {/* Language Switcher Bar */}
      <View style={styles.langSwitchRow}>
        <PlayfulButton
          emoji="🔤"
          label="English Words"
          color={COLORS.skyBlue}
          variant={language === 'en' ? 'solid' : 'outline'}
          minHeight={54}
          onPress={() => handleSwitchLanguage('en')}
        />
        <PlayfulButton
          emoji="🕌"
          label="كلمات عربية"
          color={COLORS.mintGreen}
          variant={language === 'ar' ? 'solid' : 'outline'}
          minHeight={54}
          onPress={() => handleSwitchLanguage('ar')}
        />
      </View>

      <MascotBanner
        mascotEmoji="🧩🦊"
        title={
          completedCurrent
            ? isAr
              ? 'أحسنت! ركّبت الكلمة بنجاح! ⭐'
              : 'Awesome! You built the word! ⭐'
            : isAr
              ? `الكلمة ${wordIndex + 1} من ${deck.length}`
              : `Word ${wordIndex + 1} of ${deck.length}`
        }
        message={
          gentleHint ??
          (isAr
            ? 'اضغط على الحروف بالترتيب الصحيح من اليمين إلى اليسار'
            : 'Tap the letter tiles below in order to build the word')
        }
        isRtl={isAr}
        onAudioReplay={() =>
          audioService.pronounceWord(currentItem.example.word, language)
        }
      />

      {/* Word & Picture Stage */}
      <View style={[styles.stageCard, SHADOWS.card]}>
        <View style={styles.pictureRow}>
          <View style={styles.emojiCircle}>
            <Text style={styles.bigEmoji}>{currentItem.example.emoji}</Text>
          </View>
          <View style={styles.wordMetaCol}>
            <Text style={styles.meaningLabel}>
              {isAr ? currentItem.example.meaningEn : currentItem.example.meaningAr}
            </Text>
            {/* Show joined Arabic word preview or completed word */}
            <Text style={styles.joinedPreview}>
              {completedCurrent
                ? currentItem.example.word
                : isAr
                  ? `الكلمة المتصلة: ${currentItem.example.word}`
                  : `Target Word: ${currentItem.example.word}`}
            </Text>
            {completedCurrent &&
            (currentItem.example.sentenceEn || currentItem.example.sentenceAr) ? (
              <Text style={styles.unlockedPhrase}>
                ✨ {isAr ? currentItem.example.sentenceAr : currentItem.example.sentenceEn}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Listen to word"
            onPress={() =>
              audioService.pronounceWord(currentItem.example.word, language)
            }
            style={styles.speakerBtn}
          >
            <Text style={{ fontSize: 28 }}>🔊</Text>
          </Pressable>
        </View>

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

        {/* Scrambled Letter Tiles */}
        <View style={[styles.tilesRow, isAr && styles.slotsRowRtl]}>
          {scrambledPool.map((tile, poolIdx) => {
            const used = selectedIndices.includes(poolIdx);
            return (
              <Pressable
                key={`tile_${poolIdx}`}
                accessibilityRole="button"
                accessibilityLabel={`Letter tile ${tile.char}`}
                disabled={used}
                onPress={() => handleSelectTile(poolIdx)}
                style={[
                  styles.letterChoiceTile,
                  SHADOWS.button,
                  used && styles.letterChoiceTileUsed,
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
            label={isAr ? 'إعادة ترتيب' : 'Reset Letters'}
            color={COLORS.textSecondary}
            variant="outline"
            onPress={() => {
              setSelectedIndices([]);
              setCompletedCurrent(false);
              setGentleHint(null);
            }}
          />

          <PlayfulButton
            emoji="➡️"
            label={isAr ? 'الكلمة التالية' : 'Next Word'}
            color={COLORS.coralOrange}
            onPress={handleNextWord}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  langSwitchRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
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
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: COLORS.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.sunshineYellow,
  },
  bigEmoji: {
    fontSize: 60,
  },
  wordMetaCol: {
    flex: 1,
    minWidth: 200,
  },
  meaningLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  joinedPreview: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 4,
    fontFamily: 'NotoSansArabic-Regular',
  },
  unlockedPhrase: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.mintGreenDark,
    marginTop: 6,
  },
  speakerBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.skyBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  slotsRowRtl: {
    flexDirection: 'row-reverse',
  },
  slotBox: {
    width: 82,
    height: 82,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: COLORS.borderCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCharText: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  letterChoiceTile: {
    width: 86,
    height: 86,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.sunshineYellowLight,
    borderWidth: 3,
    borderColor: COLORS.sunshineYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterChoiceTileUsed: {
    opacity: 0.28,
  },
  letterChoiceText: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
});
