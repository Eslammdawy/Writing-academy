import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MascotBanner,
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../src/components/PlayfulUI';
import { useAppState } from '../../src/context/AppStateContext';
import { ALL_LETTERS } from '../../src/data/curriculum';
import { useTabletLayout } from '../../src/hooks/useTabletLayout';
import { audioService } from '../../src/services/audio/audioService';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/theme/tokens';

export default function ChildHomeAdventureScreen() {
  const router = useRouter();
  const { isLandscape } = useTabletLayout();
  const { activeChild, progressMap, parentSettings, achievements } = useAppState();

  const stats = useMemo(() => {
    const records = Object.values(progressMap);
    const enLearned = records.filter(
      (r) => r.letterId.startsWith('en_') && r.attempts > 0
    ).length;
    const arLearned = records.filter(
      (r) => r.letterId.startsWith('ar_') && r.attempts > 0
    ).length;

    const todayPrefix = new Date().toISOString().slice(0, 10);
    const practicedToday = records.filter(
      (r) => r.lastPracticed && r.lastPracticed.startsWith(todayPrefix)
    ).length;

    // Pick next recommended letter for "Continue Learning"
    const nextLetter =
      ALL_LETTERS.find((l) => {
        const rec = progressMap[l.id];
        return rec && rec.masteryStatus === 'practicing';
      }) ??
      ALL_LETTERS.find((l) => {
        const rec = progressMap[l.id];
        return !rec || rec.attempts === 0;
      }) ??
      ALL_LETTERS[0];

    return {
      enLearned,
      arLearned,
      practicedToday,
      nextLetter,
    };
  }, [progressMap]);

  const goalTarget = parentSettings.dailyGoalLetters || 3;
  const goalProgress = Math.min(goalTarget, stats.practicedToday);

  return (
    <ScreenContainer>
      <TopAdventureHeader
        title={`Hello, ${activeChild.name}! • مرحبًا ${activeChild.name}`}
        subtitle="Adventure Map • خريطة المغامرات"
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onPressChildBadge={() => router.push('/(child)/profiles')}
      />

      <MascotBanner
        mascotEmoji="🦊✨"
        title="Ready for Today's Adventure?"
        message={`Daily Goal: Practice ${goalTarget} letters (${goalProgress}/${goalTarget} done today!) • هدف اليوم: تدرب على ${goalTarget} حروف`}
        color={COLORS.surfaceWarm}
      />

      {/* Two Big Language Adventure Worlds (Side-by-side in Landscape, Stacked in Portrait) */}
      <View style={[styles.worldsRow, isLandscape && styles.worldsRowLandscape]}>
        {/* English ABC Adventure */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="English ABC Adventure"
          onPress={() => {
            audioService.playSoundEffect('sparkle');
            router.push('/(child)/language/en');
          }}
          style={[styles.worldCard, SHADOWS.card, styles.englishCard]}
        >
          <View style={styles.worldHeaderRow}>
            <View style={[styles.worldIconCircle, { backgroundColor: COLORS.skyBlueLight }]}>
              <Text style={styles.worldHeroLetters}>A B C</Text>
            </View>
            <View style={styles.worldProgressPill}>
              <Text style={styles.worldProgressText}>{stats.enLearned} / 26 Letters</Text>
            </View>
          </View>

          <Text style={styles.worldTitleEn}>English ABC Adventure</Text>
          <Text style={styles.worldSubtitle}>
            Uppercase & lowercase letters, phonics sounds, tracing, and fun words!
          </Text>

          <View style={styles.worldActionBar}>
            <Text style={[styles.worldActionText, { color: COLORS.skyBlueDark }]}>
              Enter English World ➡️
            </Text>
          </View>
        </Pressable>

        {/* Arabic Alphabet Adventure */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Arabic Alphabet Adventure مغامرة الحروف العربية"
          onPress={() => {
            audioService.playSoundEffect('sparkle');
            router.push('/(child)/language/ar');
          }}
          style={[styles.worldCard, SHADOWS.card, styles.arabicCard]}
        >
          <View style={[styles.worldHeaderRow, { flexDirection: 'row-reverse' }]}>
            <View style={[styles.worldIconCircle, { backgroundColor: COLORS.mintGreenLight }]}>
              <Text style={styles.worldHeroLettersAr}>أ ب ت</Text>
            </View>
            <View style={[styles.worldProgressPill, { backgroundColor: COLORS.mintGreenLight }]}>
              <Text style={[styles.worldProgressText, { color: COLORS.mintGreenDark }]}>
                {stats.arLearned} / 28 حرفًا
              </Text>
            </View>
          </View>

          <Text style={styles.worldTitleAr}>مغامرة الحروف العربية</Text>
          <Text style={[styles.worldSubtitle, styles.rtlText]}>
            تعرّف على الحروف وأشكالها في الكلمة والحركات القصيرة والكتابة الممتعة!
          </Text>

          <View style={[styles.worldActionBar, { alignItems: 'flex-end' }]}>
            <Text style={[styles.worldActionText, { color: COLORS.mintGreenDark }]}>
              ⬅️ ادخل عالم العربية
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Continue Learning + Today's Goal Panel */}
      <View style={[styles.middlePanel, isLandscape && styles.middlePanelLandscape]}>
        <View style={[styles.continueCard, SHADOWS.card]}>
          <View style={styles.continueBadgeBox}>
            <Text style={styles.continueChar}>{stats.nextLetter.character}</Text>
            <Text style={styles.continueEmoji}>{stats.nextLetter.example.emoji}</Text>
          </View>
          <View style={styles.continueInfo}>
            <Text style={styles.continueOverline}>CONTINUE LEARNING • تابِع التعلّم</Text>
            <Text style={styles.continueTitle}>
              {stats.nextLetter.nameEn} • {stats.nextLetter.nameAr}
            </Text>
            <Text style={styles.continueWord}>
              Example: {stats.nextLetter.example.word} ({stats.nextLetter.example.meaningEn})
            </Text>
          </View>
          <PlayfulButton
            emoji="✏️"
            label="Practice Now"
            sublabel="تدرّب الآن"
            color={COLORS.coralOrange}
            onPress={() => router.push(`/(child)/letter/${stats.nextLetter.id}`)}
          />
        </View>
      </View>

      {/* Bottom Quick Destinations: Play a Game, Word Builder, My Stars/Rewards, My Progress */}
      <View style={[styles.bottomNavGrid, isLandscape && styles.bottomNavGridLandscape]}>
        <PlayfulButton
          emoji="🎮"
          label="Play a Game"
          sublabel="العب وتعلّم (5 ألعاب)"
          color={COLORS.lavenderPurple}
          onPress={() => router.push('/(child)/games')}
          style={styles.bottomGridBtn}
        />

        <PlayfulButton
          emoji="🧩"
          label="Word Builder"
          sublabel="ركّب الكلمات"
          color={COLORS.skyBlue}
          onPress={() => router.push('/(child)/words/en')}
          style={styles.bottomGridBtn}
        />

        <PlayfulButton
          emoji="🏆"
          label={`My Rewards (${achievements.length})`}
          sublabel="نجومي وملصقاتي"
          color={COLORS.sunshineYellowDark}
          onPress={() => router.push('/(child)/rewards')}
          style={styles.bottomGridBtn}
        />

        <PlayfulButton
          emoji="🗺️"
          label="My Journey"
          sublabel="رحلة تقدمي"
          color={COLORS.mintGreenDark}
          onPress={() => router.push('/(child)/progress')}
          style={styles.bottomGridBtn}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  worldsRow: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  worldsRowLandscape: {
    flexDirection: 'row',
  },
  worldCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 3.5,
  },
  englishCard: {
    backgroundColor: COLORS.englishWorldBg,
    borderColor: COLORS.skyBlue,
  },
  arabicCard: {
    backgroundColor: COLORS.arabicWorldBg,
    borderColor: COLORS.mintGreen,
  },
  worldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  worldIconCircle: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
  },
  worldHeroLetters: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.skyBlueDark,
  },
  worldHeroLettersAr: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.mintGreenDark,
    fontFamily: 'NotoSansArabic-Regular',
  },
  worldProgressPill: {
    backgroundColor: COLORS.skyBlueLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  worldProgressText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.skyBlueDark,
  },
  worldTitleEn: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  worldTitleAr: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'right',
    fontFamily: 'NotoSansArabic-Regular',
  },
  worldSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  worldActionBar: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
  },
  worldActionText: {
    fontSize: 18,
    fontWeight: '900',
  },
  middlePanel: {
    marginBottom: SPACING.md,
  },
  middlePanelLandscape: {
    flexDirection: 'row',
  },
  continueCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 2.5,
    borderColor: COLORS.coralOrangeLight,
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  continueBadgeBox: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceCoral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueChar: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.coralOrangeDark,
  },
  continueEmoji: {
    fontSize: 22,
  },
  continueInfo: {
    flex: 1,
    minWidth: 180,
  },
  continueOverline: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.coralOrangeDark,
    letterSpacing: 0.6,
  },
  continueTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  continueWord: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bottomNavGrid: {
    gap: SPACING.md,
  },
  bottomNavGridLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bottomGridBtn: {
    flex: 1,
    minWidth: 210,
  },
});
