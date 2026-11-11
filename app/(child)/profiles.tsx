import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MascotBanner,
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../src/components/PlayfulUI';
import { useAppState } from '../../src/context/AppStateContext';
import { AVATAR_CATALOG } from '../../src/data/curriculum';
import { useTabletLayout } from '../../src/hooks/useTabletLayout';
import { audioService } from '../../src/services/audio/audioService';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/theme/tokens';

export default function ChooseChildScreen() {
  const router = useRouter();
  const { isLandscape } = useTabletLayout();
  const { childrenProfiles, activeChild, selectChild, updateChild } = useAppState();

  const handleChooseChild = async (childId: string) => {
    audioService.playSoundEffect('sparkle');
    await selectChild(childId);
    router.push('/(child)/home');
  };

  return (
    <ScreenContainer>
      <TopAdventureHeader
        title="Who is Playing Today? • من سيلعب اليوم؟"
        subtitle="Each explorer keeps their own stars, badges, and letters!"
        onBack={() => router.back()}
      />

      <MascotBanner
        mascotEmoji="🦊🦉"
        title="Choose Your Explorer Card!"
        message="اختر بطاقتك لتبدأ رحلة الحروف والكتابة الممتعة"
        color={COLORS.surfaceWarm}
      />

      <View style={[styles.cardsContainer, isLandscape && styles.cardsContainerLandscape]}>
        {childrenProfiles.map((profile) => {
          const isSelected = profile.id === activeChild.id;
          const avatarDef =
            AVATAR_CATALOG.find((a) => a.id === profile.avatar) ?? AVATAR_CATALOG[0];

          return (
            <View
              key={profile.id}
              style={[
                styles.profileCard,
                SHADOWS.card,
                {
                  borderColor: isSelected ? avatarDef.accentColor : COLORS.borderLight,
                  backgroundColor: isSelected ? '#FFFFFF' : COLORS.surfaceSoft,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select ${profile.name}`}
                onPress={() => handleChooseChild(profile.id)}
                style={styles.cardMainPress}
              >
                <View style={[styles.avatarCircle, { backgroundColor: avatarDef.bgColor }]}>
                  <Text style={styles.avatarEmoji}>{avatarDef.emoji}</Text>
                </View>

                <Text style={styles.profileName}>{profile.name}</Text>

                <View style={styles.starsRow}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={styles.starNumber}>{profile.starsCount} Stars</Text>
                </View>

                {isSelected ? (
                  <View
                    style={[
                      styles.selectedTag,
                      { backgroundColor: avatarDef.bgColor },
                    ]}
                  >
                    <Text style={[styles.selectedTagText, { color: avatarDef.accentColor }]}>
                      ✓ Selected • مختار
                    </Text>
                  </View>
                ) : null}
              </Pressable>

              {/* Quick gender-neutral avatar picker row */}
              <Text style={styles.avatarPickerLabel}>Pick Avatar Buddy • اختر صديقك:</Text>
              <View style={styles.avatarMiniRow}>
                {AVATAR_CATALOG.map((av) => {
                  const activeAv = av.id === profile.avatar;
                  return (
                    <Pressable
                      key={av.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Change ${profile.name} avatar to ${av.nameEn}`}
                      onPress={() => {
                        audioService.playSoundEffect('tap');
                        updateChild(profile.id, profile.name, av.id);
                      }}
                      style={[
                        styles.avatarMiniBtn,
                        {
                          backgroundColor: av.bgColor,
                          borderColor: activeAv ? av.accentColor : 'transparent',
                        },
                      ]}
                    >
                      <Text style={styles.avatarMiniEmoji}>{av.emoji}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <PlayfulButton
                emoji="🎨"
                label={`Play as ${profile.name}`}
                sublabel={`العب باسم ${profile.name}`}
                color={avatarDef.accentColor}
                onPress={() => handleChooseChild(profile.id)}
                style={styles.playBtn}
              />
            </View>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cardsContainer: {
    gap: SPACING.lg,
    marginTop: SPACING.sm,
  },
  cardsContainerLandscape: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  profileCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 4,
    alignItems: 'center',
  },
  cardMainPress: {
    alignItems: 'center',
    width: '100%',
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  avatarEmoji: {
    fontSize: 62,
  },
  profileName: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.sunshineYellowLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.xs,
    gap: 6,
  },
  starIcon: {
    fontSize: 18,
  },
  starNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.sunshineYellowDark,
  },
  selectedTag: {
    marginTop: SPACING.sm,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  selectedTagText: {
    fontSize: 14,
    fontWeight: '900',
  },
  avatarPickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: 8,
  },
  avatarMiniRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  avatarMiniBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  avatarMiniEmoji: {
    fontSize: 24,
  },
  playBtn: {
    width: '100%',
  },
});
