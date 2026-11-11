import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../src/components/PlayfulUI';
import { useAppState } from '../src/context/AppStateContext';
import { AVATAR_CATALOG } from '../src/data/curriculum';
import { useSafeNavigate } from '../src/hooks/useSafeNavigate';
import { useTabletLayout } from '../src/hooks/useTabletLayout';
import { audioService } from '../src/services/audio/audioService';
import { narrator } from '../src/services/audio/narrator';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../src/theme/tokens';

export default function WelcomeSplashScreen() {
  const nav = useSafeNavigate();
  const { isLandscape } = useTabletLayout();
  const { childrenProfiles, activeChild, selectChild, isReady } = useAppState();
  const isAr = activeChild.preferredLanguage === 'ar';

  useEffect(() => {
    if (!isReady) return;
    narrator.say(
      'welcome.chooseAvatar',
      { name: activeChild.name },
      { language: activeChild.preferredLanguage }
    );
  }, [isReady, activeChild.id, activeChild.name, activeChild.preferredLanguage]);

  const handleSelectAvatarTile = async (childId: string) => {
    audioService.playSoundEffect('celebrate');
    await selectChild(childId);
    nav.replace('/(child)/home');
  };

  return (
    <ScreenContainer scroll={false} backgroundColor={COLORS.background}>
      {/* Discreet Parent Gate entry in top corner (long-press or tap per WP7) */}
      <View style={styles.topUtilityBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Repeat welcome voice"
          onPress={() => {
            audioService.playSoundEffect('tap');
            narrator.repeat();
          }}
          style={styles.speakerUtilityBtn}
        >
          <Text style={styles.speakerUtilityIcon}>🔊</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Parent Gate (Hold for 2 seconds)"
          delayLongPress={1800}
          onLongPress={() => {
            audioService.playSoundEffect('tap');
            nav.push('/(parent)/pin');
          }}
          style={styles.parentEntryBtn}
        >
          <Text style={styles.parentEntryIcon}>🔒</Text>
        </Pressable>
      </View>

      <View style={styles.centerStage}>
        {/* Brand Mascots Header */}
        <View style={styles.mascotRow}>
          <Text style={styles.mascotEmoji}>🦊</Text>
          <Text style={styles.brandTitle}>
            {isAr ? 'صوفي ونادين' : 'Soufy & Nadine'}
          </Text>
          <Text style={styles.mascotEmoji}>🦉</Text>
        </View>

        {/* Avatar-only tiles (last active child pre-highlighted; 1 tap to Home) */}
        <View style={[styles.avatarTilesRow, isLandscape && styles.avatarTilesLandscape]}>
          {childrenProfiles.map((profile) => {
            const isHighlighted = profile.id === activeChild.id;
            const avatarDef =
              AVATAR_CATALOG.find((a) => a.id === profile.avatar) ?? AVATAR_CATALOG[0];

            return (
              <Pressable
                key={profile.id}
                accessibilityRole="button"
                accessibilityLabel={profile.name}
                onPress={() => handleSelectAvatarTile(profile.id)}
                style={({ pressed }) => [
                  styles.avatarTile,
                  SHADOWS.card,
                  {
                    borderColor: isHighlighted
                      ? COLORS.sunshineYellow
                      : avatarDef.accentColor,
                    borderWidth: isHighlighted ? 6 : 3.5,
                    backgroundColor: isHighlighted ? '#FFFFFF' : COLORS.surfaceSoft,
                    transform: [{ scale: pressed ? 0.96 : isHighlighted ? 1.03 : 1 }],
                  },
                ]}
              >
                {isHighlighted ? (
                  <View style={styles.preHighlightCrown}>
                    <Text style={styles.crownEmoji}>⭐</Text>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.avatarFaceCircle,
                    { backgroundColor: avatarDef.bgColor },
                  ]}
                >
                  <Text style={styles.avatarFaceEmoji}>{avatarDef.emoji}</Text>
                </View>

                <Text style={styles.avatarTileName}>{profile.name}</Text>

                <View style={styles.starsBadge}>
                  <Text style={styles.starsBadgeEmoji}>⭐</Text>
                  <Text style={styles.starsBadgeCount}>{profile.starsCount}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topUtilityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speakerUtilityBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.skyBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.skyBlue,
  },
  speakerUtilityIcon: {
    fontSize: 28,
  },
  parentEntryBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderCard,
    opacity: 0.75,
  },
  parentEntryIcon: {
    fontSize: 22,
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  mascotEmoji: {
    fontSize: 48,
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontFamily: 'NotoSansArabic-Regular',
  },
  avatarTilesRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xl,
  },
  avatarTilesLandscape: {
    flexDirection: 'row',
  },
  avatarTile: {
    minWidth: 240,
    maxWidth: 320,
    flex: 1,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    position: 'relative',
  },
  preHighlightCrown: {
    position: 'absolute',
    top: -18,
    right: -12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.sunshineYellow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  crownEmoji: {
    fontSize: 24,
  },
  avatarFaceCircle: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFaceEmoji: {
    fontSize: 82,
  },
  avatarTileName: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  starsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.sunshineYellowLight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    gap: 8,
  },
  starsBadgeEmoji: {
    fontSize: 22,
  },
  starsBadgeCount: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.sunshineYellowDark,
  },
});
