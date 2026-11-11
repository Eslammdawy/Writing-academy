import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MascotBanner,
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../../src/components/PlayfulUI';
import { useAppState } from '../../../src/context/AppStateContext';
import { getLettersByLanguage } from '../../../src/data/curriculum';
import { useSafeNavigate } from '../../../src/hooks/useSafeNavigate';
import { useTabletLayout } from '../../../src/hooks/useTabletLayout';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../src/theme/tokens';
import { LanguageCode } from '../../../src/types';

export default function LanguageHubScreen() {
  const nav = useSafeNavigate();
  const params = useLocalSearchParams<{ language: string }>();
  const language: LanguageCode = params.language === 'ar' ? 'ar' : 'en';
  const isAr = language === 'ar';
  const { isLandscape } = useTabletLayout();
  const { activeChild, progressMap } = useAppState();

  const letters = useMemo(() => getLettersByLanguage(language), [language]);

  const hubStats = useMemo(() => {
    let mastered = 0;
    let practicing = 0;
    let started = 0;
    for (const l of letters) {
      const rec = progressMap[l.id];
      if (!rec || rec.attempts === 0) continue;
      started++;
      if (rec.masteryStatus === 'mastered') mastered++;
      else practicing++;
    }
    const recommended =
      letters.find((l) => {
        const rec = progressMap[l.id];
        return !rec || rec.masteryStatus !== 'mastered';
      }) ?? letters[0];

    return { mastered, practicing, started, total: letters.length, recommended };
  }, [letters, progressMap]);

  const worldColor = isAr ? COLORS.mintGreen : COLORS.skyBlue;
  const worldBg = isAr ? COLORS.arabicWorldBg : COLORS.englishWorldBg;

  return (
    <ScreenContainer backgroundColor={worldBg}>
      <TopAdventureHeader
        title={isAr ? 'عالم الحروف العربية' : 'English ABC World'}
        subtitle={
          isAr
            ? 'الحروف، الأصوات، أشكال الحرف في الكلمة، والحركات القصيرة'
            : 'Capital & lowercase letters, phonics sounds, tracing & words'
        }
        language={language}
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onBack={() => nav.back()}
        onHome={nav.goHome}
      />

      <MascotBanner
        mascotEmoji={isAr ? '🦉🌙' : '🦊☀️'}
        title={
          isAr
            ? `أهلاً بك يا ${activeChild.name} في واحة الحروف العربية!`
            : `Welcome to the English Island, ${activeChild.name}!`
        }
        message={
          isAr
            ? `تعلّمت ${hubStats.started} من أصل ${hubStats.total} حرفًا. هيا نكتشف الحرف التالي!`
            : `You have explored ${hubStats.started} of ${hubStats.total} letters. Let's keep going!`
        }
        isRtl={isAr}
      />

      {/* Recommended Next Activity Card */}
      <View
        style={[
          styles.recommendedCard,
          SHADOWS.card,
          isAr && { flexDirection: 'row-reverse' },
        ]}
      >
        <View style={[styles.heroCharBox, { backgroundColor: `${worldColor}22` }]}>
          <Text style={[styles.heroCharText, { color: worldColor }]}>
            {isAr
              ? hubStats.recommended.character
              : `${hubStats.recommended.character} ${hubStats.recommended.lowercaseCharacter ?? ''}`}
          </Text>
          <Text style={styles.heroEmoji}>{hubStats.recommended.example.emoji}</Text>
        </View>

        <View style={[styles.recTextCol, isAr && { alignItems: 'flex-end' }]}>
          <Text style={[styles.recTag, { color: worldColor }]}>
            {isAr ? 'النشاط المقترح التالي' : 'NEXT RECOMMENDED LESSON'}
          </Text>
          <Text style={[styles.recTitle, isAr && styles.rtlText]}>
            {isAr ? hubStats.recommended.nameAr : hubStats.recommended.nameEn} —{' '}
            {hubStats.recommended.example.word}
          </Text>
          <Text style={[styles.recSub, isAr && styles.rtlText]}>
            {isAr
              ? hubStats.recommended.example.sentenceAr
              : hubStats.recommended.example.sentenceEn}
          </Text>
        </View>

        <PlayfulButton
          emoji="🎨"
          label={isAr ? 'ابدأ الدرس' : 'Start Lesson'}
          color={worldColor}
          onPress={() => nav.push(`/(child)/lesson/${hubStats.recommended.id}`)}
        />
      </View>

      {/* Main Feature Cards for this Language */}
      <View style={[styles.hubGrid, isLandscape && styles.hubGridLandscape]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isAr ? 'مستكشف الحروف' : 'Alphabet Explorer'}
          onPress={() => nav.push(`/(child)/alphabet/${language}`)}
          style={[styles.hubFeatureCard, SHADOWS.card]}
        >
          <Text style={styles.featureEmoji}>{isAr ? 'أ ب ت' : '🔤'}</Text>
          <Text style={styles.featureTitle}>
            {isAr ? 'مستكشف الحروف (٢٨ حرفًا)' : 'Alphabet Explorer (A–Z)'}
          </Text>
          <Text style={styles.featureDesc}>
            {isAr
              ? 'جميع الحروف العربية مع أشكالها في أول ووسط وآخر الكلمة والحركات'
              : 'All 26 uppercase & lowercase letters with phonics and tracing'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isAr ? 'تركيب الكلمات' : 'Word Builder'}
          onPress={() => nav.push(`/(child)/words/${language}`)}
          style={[styles.hubFeatureCard, SHADOWS.card]}
        >
          <Text style={styles.featureEmoji}>🧩</Text>
          <Text style={styles.featureTitle}>
            {isAr ? 'باني الكلمات العربية' : 'English Word Builder'}
          </Text>
          <Text style={styles.featureDesc}>
            {isAr
              ? 'رتّب الحروف من اليمين إلى اليسار لتكوين كلمات مصورة جميلة'
              : 'Arrange letters from left to right to spell picture words'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isAr ? 'ألعاب الحروف' : 'Letter Games'}
          onPress={() => nav.push(`/(child)/games?lang=${language}`)}
          style={[styles.hubFeatureCard, SHADOWS.card]}
        >
          <Text style={styles.featureEmoji}>🚀</Text>
          <Text style={styles.featureTitle}>
            {isAr ? 'ألعاب الحروف الخمس' : '5 Learning Games'}
          </Text>
          <Text style={styles.featureDesc}>
            {isAr
              ? 'صندوق الكنز، طابق الصورة، اكتب لتنطلق بالصاروخ، وأكمل الوحش اللطيف!'
              : 'Treasure Hunt, Match the Picture, Write to Launch, and Complete the Monster!'}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  recommendedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  heroCharBox: {
    width: 104,
    height: 104,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCharText: {
    fontSize: 36,
    fontWeight: '900',
  },
  heroEmoji: {
    fontSize: 26,
    marginTop: 2,
  },
  recTextCol: {
    flex: 1,
    minWidth: 200,
  },
  recTag: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  recTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  recSub: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hubGrid: {
    gap: SPACING.md,
  },
  hubGridLandscape: {
    flexDirection: 'row',
  },
  hubFeatureCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.borderLight,
  },
  featureEmoji: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.skyBlueDark,
    marginBottom: SPACING.sm,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
