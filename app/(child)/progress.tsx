import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MascotBanner,
  MasteryBadgePill,
  ScreenContainer,
  TopAdventureHeader,
} from '../../src/components/PlayfulUI';
import { useAppState } from '../../src/context/AppStateContext';
import { ARABIC_LETTERS, ENGLISH_LETTERS } from '../../src/data/curriculum';
import { useSafeNavigate } from '../../src/hooks/useSafeNavigate';
import { useTabletLayout } from '../../src/hooks/useTabletLayout';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/theme/tokens';
import { isSameLocalDay } from '../../src/utils/dateUtils';

export default function ChildProgressJourneyScreen() {
  const nav = useSafeNavigate();
  const { isLandscape } = useTabletLayout();
  const { activeChild, progressMap, sessions } = useAppState();

  const summary = useMemo(() => {
    const todaySeconds = sessions
      .filter((s) => isSameLocalDay(s.sessionDate))
      .reduce((acc, s) => acc + s.durationSeconds, 0);
    const todayMinutes = Math.max(
      todaySeconds > 0 ? 1 : 0,
      Math.round(todaySeconds / 60)
    );

    const enLearned = ENGLISH_LETTERS.filter(
      (l) => (progressMap[l.id]?.attempts ?? 0) > 0
    );
    const arLearned = ARABIC_LETTERS.filter(
      (l) => (progressMap[l.id]?.attempts ?? 0) > 0
    );

    const revisitList = [...ENGLISH_LETTERS, ...ARABIC_LETTERS]
      .filter((l) => {
        const p = progressMap[l.id];
        return p && p.attempts > 0 && p.masteryStatus !== 'mastered';
      })
      .slice(0, 6);

    return {
      todayMinutes,
      enLearned,
      arLearned,
      revisitList,
    };
  }, [progressMap, sessions]);

  return (
    <ScreenContainer>
      <TopAdventureHeader
        title={`${activeChild.name}'s Learning Journey • رحلتي`}
        subtitle="Look at all the letters you have explored!"
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onBack={() => nav.back()}
        onHome={nav.goHome}
      />

      <MascotBanner
        mascotEmoji="🗺️🦉"
        title={`Today's Fun Time: ${summary.todayMinutes} min • وقت التدريب اليوم: ${summary.todayMinutes} دقيقة`}
        message={`Stars earned: ${activeChild.starsCount} ⭐ • English: ${summary.enLearned.length}/26 • العربية: ${summary.arLearned.length}/28`}
        color={COLORS.surfaceMint}
      />

      <View style={[styles.journeyRow, isLandscape && styles.journeyRowLandscape]}>
        {/* English Visual Journey */}
        <View style={[styles.journeyCard, SHADOWS.card]}>
          <Text style={styles.journeyCardTitle}>
            🔤 English Letters ({summary.enLearned.length} / 26)
          </Text>
          <View style={styles.bubblesWrap}>
            {ENGLISH_LETTERS.map((l) => {
              const p = progressMap[l.id];
              const practiced = (p?.attempts ?? 0) > 0;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => nav.push(`/(child)/letter/${l.id}`)}
                  style={[
                    styles.miniBubble,
                    practiced && {
                      backgroundColor: COLORS.skyBlueLight,
                      borderColor: COLORS.skyBlue,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniBubbleText,
                      practiced && { color: COLORS.skyBlueDark },
                    ]}
                  >
                    {l.character}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Arabic Visual Journey */}
        <View style={[styles.journeyCard, SHADOWS.card]}>
          <Text style={[styles.journeyCardTitle, { textAlign: 'right' }]}>
            🕌 الحروف العربية ({summary.arLearned.length} / 28)
          </Text>
          <View style={[styles.bubblesWrap, { flexDirection: 'row-reverse' }]}>
            {ARABIC_LETTERS.map((l) => {
              const p = progressMap[l.id];
              const practiced = (p?.attempts ?? 0) > 0;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => nav.push(`/(child)/letter/${l.id}`)}
                  style={[
                    styles.miniBubble,
                    practiced && {
                      backgroundColor: COLORS.mintGreenLight,
                      borderColor: COLORS.mintGreen,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniBubbleText,
                      practiced && { color: COLORS.mintGreenDark },
                    ]}
                  >
                    {l.character}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Letters to Revisit */}
      {summary.revisitList.length > 0 ? (
        <View style={[styles.revisitCard, SHADOWS.card]}>
          <Text style={styles.journeyCardTitle}>
            🎨 Let's Practice Again • حروف نراجعها معًا
          </Text>
          <View style={styles.revisitRow}>
            {summary.revisitList.map((l) => (
              <Pressable
                key={l.id}
                onPress={() => nav.push(`/(child)/letter/${l.id}`)}
                style={styles.revisitTile}
              >
                <Text style={styles.revisitChar}>{l.character}</Text>
                <Text style={styles.revisitWord}>{l.example.word}</Text>
                <MasteryBadgePill
                  status={progressMap[l.id]?.masteryStatus ?? 'learning'}
                  language={l.language}
                />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  journeyRow: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  journeyRowLandscape: {
    flexDirection: 'row',
  },
  journeyCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  journeyCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  bubblesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBubbleText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textMuted,
    fontFamily: 'NotoSansArabic-Regular',
  },
  revisitCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  revisitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  revisitTile: {
    minWidth: 130,
    backgroundColor: COLORS.surfaceWarm,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 4,
  },
  revisitChar: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  revisitWord: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
