import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  MascotBanner,
  ScreenContainer,
  TopAdventureHeader,
} from '../../src/components/PlayfulUI';
import { useAppState } from '../../src/context/AppStateContext';
import { BADGE_CATALOG } from '../../src/data/curriculum';
import { useSafeNavigate } from '../../src/hooks/useSafeNavigate';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/theme/tokens';

export default function RewardsStickerGalleryScreen() {
  const nav = useSafeNavigate();
  const { activeChild, achievements } = useAppState();

  const unlockedTypes = new Set(achievements.map((a) => a.achievementType));

  return (
    <ScreenContainer>
      <TopAdventureHeader
        title={`${activeChild.name}'s Stars & Stickers • نجومي وملصقاتي`}
        subtitle="Collected by trying, tracing, writing, and playing!"
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onBack={() => nav.back()}
        onHome={nav.goHome}
      />

      <MascotBanner
        mascotEmoji="🏆🌟"
        title={`You have ${activeChild.starsCount} Stars & ${achievements.length} / ${BADGE_CATALOG.length} Stickers!`}
        message="Every time you practice a letter or play a game, your sticker book grows!"
        color={COLORS.sunshineYellowLight}
      />

      <View style={styles.badgesGrid}>
        {BADGE_CATALOG.map((badge) => {
          const isUnlocked = unlockedTypes.has(badge.type);
          return (
            <View
              key={badge.type}
              style={[
                styles.badgeCard,
                SHADOWS.card,
                {
                  borderColor: isUnlocked ? badge.color : COLORS.borderLight,
                  backgroundColor: isUnlocked ? COLORS.surface : '#F8FAFC',
                  opacity: isUnlocked ? 1 : 0.65,
                },
              ]}
            >
              <View
                style={[
                  styles.badgeEmojiCircle,
                  { backgroundColor: isUnlocked ? `${badge.color}22` : '#E2E8F0' },
                ]}
              >
                <Text style={styles.badgeEmoji}>{isUnlocked ? badge.emoji : '🔒'}</Text>
              </View>

              <Text style={styles.badgeTitleEn}>{badge.titleEn}</Text>
              <Text style={styles.badgeTitleAr}>{badge.titleAr}</Text>
              <Text style={styles.badgeDesc}>{badge.descriptionEn}</Text>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isUnlocked
                      ? COLORS.mintGreenLight
                      : COLORS.borderLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: isUnlocked ? COLORS.mintGreenDark : COLORS.textMuted },
                  ]}
                >
                  {isUnlocked ? '✓ Collected • مكتسب' : 'Keep Exploring!'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  badgeCard: {
    width: '31%',
    minWidth: 230,
    flexGrow: 1,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 3,
  },
  badgeEmojiCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  badgeEmoji: {
    fontSize: 42,
  },
  badgeTitleEn: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  badgeTitleAr: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.mintGreenDark,
    textAlign: 'center',
    fontFamily: 'NotoSansArabic-Regular',
  },
  badgeDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: SPACING.sm,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
