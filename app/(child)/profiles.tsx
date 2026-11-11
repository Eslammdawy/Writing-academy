import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MascotBanner,
  ScreenContainer,
  TopAdventureHeader,
} from '../../src/components/PlayfulUI';
import { useAppState } from '../../src/context/AppStateContext';
import { AVATAR_CATALOG } from '../../src/data/curriculum';
import { useSafeNavigate } from '../../src/hooks/useSafeNavigate';
import { useTabletLayout } from '../../src/hooks/useTabletLayout';
import { audioService } from '../../src/services/audio/audioService';
import { narrator } from '../../src/services/audio/narrator';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/theme/tokens';

export default function ChooseChildScreen() {
  const nav = useSafeNavigate();
  const { isLandscape } = useTabletLayout();
  const { childrenProfiles, activeChild, selectChild } = useAppState();
  const isAr = activeChild.preferredLanguage === 'ar';

  useEffect(() => {
    narrator.say(
      'welcome.chooseAvatar',
      { name: activeChild.name },
      { language: activeChild.preferredLanguage }
    );
  }, [activeChild.name, activeChild.preferredLanguage]);

  const handleChooseChild = async (childId: string) => {
    audioService.playSoundEffect('sparkle');
    await selectChild(childId);
    nav.replace('/(child)/home');
  };

  return (
    <ScreenContainer>
      <TopAdventureHeader
        title={isAr ? 'من سيلعب اليوم؟' : 'Who is Playing?'}
        language={activeChild.preferredLanguage}
        onBack={() => nav.back()}
      />

      <MascotBanner
        mascotEmoji="🦊🦉"
        title={isAr ? 'لنختر صورتنا!' : 'Tap your picture!'}
        message={
          isAr
            ? 'اضغط على بطاقتك لنبدأ المغامرة'
            : 'Tap your card to start playing'
        }
        isRtl={isAr}
        color={COLORS.surfaceWarm}
      />

      {/* Avatar-only profile cards (avatar-picker removed per WP2; editing moved exclusively to Parent area) */}
      <View style={[styles.cardsContainer, isLandscape && styles.cardsContainerLandscape]}>
        {childrenProfiles.map((profile) => {
          const isSelected = profile.id === activeChild.id;
          const avatarDef =
            AVATAR_CATALOG.find((a) => a.id === profile.avatar) ?? AVATAR_CATALOG[0];

          return (
            <Pressable
              key={profile.id}
              accessibilityRole="button"
              accessibilityLabel={`Select ${profile.name}`}
              onPress={() => handleChooseChild(profile.id)}
              style={({ pressed }) => [
                styles.profileCard,
                SHADOWS.card,
                {
                  borderColor: isSelected ? COLORS.sunshineYellow : avatarDef.accentColor,
                  backgroundColor: isSelected ? '#FFFFFF' : COLORS.surfaceSoft,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <View style={[styles.avatarCircle, { backgroundColor: avatarDef.bgColor }]}>
                <Text style={styles.avatarEmoji}>{avatarDef.emoji}</Text>
              </View>

              <Text style={styles.profileName}>{profile.name}</Text>

              <View style={styles.starsRow}>
                <Text style={styles.starIcon}>⭐</Text>
                <Text style={styles.starNumber}>{profile.starsCount}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cardsContainer: {
    gap: SPACING.xl,
    marginTop: SPACING.md,
  },
  cardsContainerLandscape: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  profileCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  avatarCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 72,
  },
  profileName: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.sunshineYellowLight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    gap: 8,
  },
  starIcon: {
    fontSize: 22,
  },
  starNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.sunshineYellowDark,
  },
});
