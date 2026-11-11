import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PlayfulButton, ScreenContainer } from '../src/components/PlayfulUI';
import { useAppState } from '../src/context/AppStateContext';
import { useTabletLayout } from '../src/hooks/useTabletLayout';
import { audioService } from '../src/services/audio/audioService';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../src/theme/tokens';

export default function WelcomeSplashScreen() {
  const router = useRouter();
  const { isLandscape } = useTabletLayout();
  const { activeChild } = useAppState();
  const [floatStep, setFloatStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFloatStep((s) => (s + 1) % 2);
    }, 900);
    return () => clearInterval(timer);
  }, []);

  return (
    <ScreenContainer backgroundColor={COLORS.background}>
      {/* Discreet Parent Gate entry in top corner */}
      <View style={styles.topUtilityBar}>
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineDot}>●</Text>
          <Text style={styles.offlineText}>100% Offline Ready • جاهز بدون إنترنت</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Parent Area"
          onPress={() => {
            audioService.playSoundEffect('tap');
            router.push('/(parent)/pin');
          }}
          style={styles.parentEntryBtn}
        >
          <Text style={styles.parentEntryIcon}>🔒</Text>
          <Text style={styles.parentEntryText}>Parents • للوالدين</Text>
        </Pressable>
      </View>

      <View style={[styles.heroContainer, isLandscape && styles.heroContainerLandscape]}>
        {/* Left/Top: Floating Alphabet Adventure Illustration */}
        <View style={styles.illustrationCard}>
          <View style={styles.floatingLettersRow}>
            <View
              style={[
                styles.floatingBubble,
                {
                  backgroundColor: COLORS.skyBlueLight,
                  transform: [{ translateY: floatStep === 0 ? -6 : 4 }],
                },
              ]}
            >
              <Text style={[styles.floatingLetterText, { color: COLORS.skyBlueDark }]}>A a</Text>
            </View>
            <View
              style={[
                styles.floatingBubble,
                {
                  backgroundColor: COLORS.mintGreenLight,
                  transform: [{ translateY: floatStep === 1 ? -6 : 4 }],
                },
              ]}
            >
              <Text style={[styles.floatingLetterText, { color: COLORS.mintGreenDark }]}>أ ب</Text>
            </View>
            <View
              style={[
                styles.floatingBubble,
                {
                  backgroundColor: COLORS.sunshineYellowLight,
                  transform: [{ translateY: floatStep === 0 ? 4 : -6 }],
                },
              ]}
            >
              <Text style={[styles.floatingLetterText, { color: COLORS.sunshineYellowDark }]}>
                B ت
              </Text>
            </View>
          </View>

          <View style={styles.mascotStage}>
            <View style={[styles.mascotCircle, { backgroundColor: COLORS.coralOrangeLight }]}>
              <Text style={styles.mascotHeroEmoji}>🦊</Text>
              <Text style={styles.mascotTag}>Soufy</Text>
            </View>
            <Text style={styles.sparkleCenter}>✨🎨✨</Text>
            <View style={[styles.mascotCircle, { backgroundColor: COLORS.lavenderPurpleLight }]}>
              <Text style={styles.mascotHeroEmoji}>🦉</Text>
              <Text style={styles.mascotTag}>Nadine</Text>
            </View>
          </View>
        </View>

        {/* Right/Bottom: Brand Title & Big Play Action */}
        <View style={styles.brandPanel}>
          <Text style={styles.titleEn}>Soufy & Nadine</Text>
          <Text style={styles.subtitleAr}>نتعلم الكتابة ونلعب معًا</Text>
          <Text style={styles.taglineEn}>
            Playful Arabic & English Handwriting Academy
          </Text>

          <View style={styles.ctaGroup}>
            <PlayfulButton
              emoji="🚀"
              label="Let's Play & Learn!"
              sublabel="يلا نتعلم ونلعب"
              color={COLORS.mintGreen}
              minHeight={76}
              onPress={() => {
                audioService.playSoundEffect('celebrate');
                router.push('/(child)/profiles');
              }}
              style={styles.mainCta}
            />

            <PlayfulButton
              emoji="🗺️"
              label={`Continue as ${activeChild.name}`}
              sublabel={`المتابعة باسم ${activeChild.name}`}
              color={COLORS.skyBlue}
              variant="soft"
              minHeight={64}
              onPress={() => {
                router.push('/(child)/home');
              }}
              style={styles.secondaryCta}
            />
          </View>
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
    marginBottom: SPACING.md,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mintGreenLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    gap: 6,
  },
  offlineDot: {
    color: COLORS.mintGreenDark,
    fontSize: 14,
  },
  offlineText: {
    color: COLORS.mintGreenDark,
    fontSize: 13,
    fontWeight: '800',
  },
  parentEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.borderCard,
    gap: 6,
  },
  parentEntryIcon: {
    fontSize: 15,
  },
  parentEntryText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  heroContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  heroContainerLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  illustrationCard: {
    flex: 1,
    maxWidth: 500,
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.skyBlueLight,
    ...SHADOWS.card,
  },
  floatingLettersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  floatingBubble: {
    width: 82,
    height: 82,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingLetterText: {
    fontSize: 28,
    fontWeight: '900',
  },
  mascotStage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  mascotCircle: {
    width: 118,
    height: 118,
    borderRadius: 59,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  mascotHeroEmoji: {
    fontSize: 52,
  },
  mascotTag: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  sparkleCenter: {
    fontSize: 26,
  },
  brandPanel: {
    flex: 1,
    maxWidth: 520,
    width: '100%',
    alignItems: 'center',
  },
  titleEn: {
    fontSize: 46,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitleAr: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.mintGreenDark,
    marginTop: 6,
    textAlign: 'center',
    fontFamily: 'NotoSansArabic-Regular',
  },
  taglineEn: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  ctaGroup: {
    width: '100%',
    gap: SPACING.md,
  },
  mainCta: {
    width: '100%',
  },
  secondaryCta: {
    width: '100%',
  },
});
