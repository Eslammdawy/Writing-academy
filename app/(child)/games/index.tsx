import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MascotBanner,
  ScreenContainer,
  TopAdventureHeader,
} from '../../../src/components/PlayfulUI';
import { useAppState } from '../../../src/context/AppStateContext';
import { useSafeNavigate } from '../../../src/hooks/useSafeNavigate';
import { audioService } from '../../../src/services/audio/audioService';
import { narrator } from '../../../src/services/audio/narrator';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../src/theme/tokens';
import { GameId, LanguageCode } from '../../../src/types';

export interface GameLobbyCardSpec {
  id: GameId;
  titleEn: string;
  titleAr: string;
  shortEn: string;
  shortAr: string;
  descEn: string;
  descAr: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export const GAMES_CATALOG: GameLobbyCardSpec[] = [
  {
    id: 'treasure_hunt',
    titleEn: 'Treasure Hunt',
    titleAr: 'كنز الحروف',
    shortEn: 'Find Letter',
    shortAr: 'ابحث عن الحرف',
    descEn: 'Find the glowing target letter among the treasure chests!',
    descAr: 'ابحث عن الحرف المطلوب بين صناديق الكنز!',
    emoji: '💎',
    color: COLORS.sunshineYellowDark,
    bgColor: COLORS.sunshineYellowLight,
  },
  {
    id: 'match_picture',
    titleEn: 'Match Picture',
    titleAr: 'طابق الصورة',
    shortEn: 'Match Sound',
    shortAr: 'طابق الصوت',
    descEn: 'Listen to the letter sound and pair it with its picture friend!',
    descAr: 'اسمع صوت الحرف وصِله بالصورة والكلمة المناسبة!',
    emoji: '🖼️',
    color: COLORS.skyBlueDark,
    bgColor: COLORS.skyBlueLight,
  },
  {
    id: 'write_to_launch',
    titleEn: 'Rocket Launch',
    titleAr: 'انطلاق الصاروخ',
    shortEn: 'Write & Blast',
    shortAr: 'اكتب وانطلق',
    descEn: 'Write the fuel letter on the launchpad to blast the rocket into space!',
    descAr: 'اكتب الحرف على منصة الإطلاق لينطلق الصاروخ نحو النجوم!',
    emoji: '🚀',
    color: COLORS.coralOrangeDark,
    bgColor: COLORS.coralOrangeLight,
  },
  {
    id: 'complete_monster',
    titleEn: 'Monster Helper',
    titleAr: 'الوحش اللطيف',
    shortEn: 'Finish Letter',
    shortAr: 'أكمل الحرف',
    descEn: 'Draw the missing letter curve or dot to make the friendly monster smile!',
    descAr: 'أكمل الجزء الناقص من الحرف ليبتسم الوحش اللطيف!',
    emoji: '👾',
    color: COLORS.lavenderPurpleDark,
    bgColor: COLORS.lavenderPurpleLight,
  },
  {
    id: 'letter_challenge',
    titleEn: 'Star Challenge',
    titleAr: 'تحدّي النجوم',
    shortEn: 'Mix & Play',
    shortAr: 'العب وراجع',
    descEn: 'A fun 3-step mix: Spot the letter, match the picture, and trace it!',
    descAr: 'مراجعة مرحة من ٣ خطوات: اكتشف الحرف، طابق الصورة، وتتبّعه!',
    emoji: '🏆',
    color: COLORS.mintGreenDark,
    bgColor: COLORS.mintGreenLight,
  },
];

export default function GamesLobbyScreen() {
  const nav = useSafeNavigate();
  const params = useLocalSearchParams<{ lang?: string }>();
  const { activeChild, parentSettings } = useAppState();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(
    params.lang === 'ar' || params.lang === 'en'
      ? params.lang
      : activeChild.preferredLanguage
  );
  const isAr = selectedLang === 'ar';

  useEffect(() => {
    narrator.say('game.challenge', undefined, { language: selectedLang });
  }, [selectedLang]);

  return (
    <ScreenContainer>
      <TopAdventureHeader
        title={isAr ? 'الألعاب' : 'Games'}
        language={selectedLang}
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onBack={() => nav.back()}
        onHome={nav.goHome}
        rightElement={
          parentSettings.exploreMode ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch game language"
              onPress={() => {
                audioService.playSoundEffect('tap');
                setSelectedLang((l) => (l === 'en' ? 'ar' : 'en'));
              }}
              style={styles.flagSwitchBtn}
            >
              <Text style={styles.flagSwitchText}>
                {selectedLang === 'en' ? '🔤 EN' : '🕌 ع'}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <MascotBanner
        mascotEmoji="🎮🦊"
        title={isAr ? 'لنختر لعبة ممتعة!' : 'Pick a game to play!'}
        message={isAr ? '💎  🖼️  🚀  👾  🏆' : '💎  🖼️  🚀  👾  🏆'}
        isRtl={isAr}
      />

      <View style={styles.gamesGrid}>
        {GAMES_CATALOG.map((game) => (
          <Pressable
            key={game.id}
            accessibilityRole="button"
            accessibilityLabel={isAr ? game.titleAr : game.titleEn}
            onPress={() => {
              audioService.playSoundEffect('sparkle');
              nav.push(`/(child)/games/${game.id}?lang=${selectedLang}`);
            }}
            style={({ pressed }) => [
              styles.gameCard,
              SHADOWS.card,
              {
                borderColor: game.color,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <View style={[styles.gameIconBubble, { backgroundColor: game.bgColor }]}>
              <Text style={styles.gameEmoji}>{game.emoji}</Text>
            </View>

            <Text style={styles.gameTitle}>
              {isAr ? game.titleAr : game.titleEn}
            </Text>

            {parentSettings.exploreMode ? (
              <Text style={styles.gameDesc}>
                {isAr ? game.descAr : game.descEn}
              </Text>
            ) : null}

            <View style={[styles.playPill, { backgroundColor: game.bgColor }]}>
              <Text style={[styles.playPillText, { color: game.color }]}>▶</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flagSwitchBtn: {
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
  flagSwitchText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20, // >= 16 dp spacing (WP9)
  },
  gameCard: {
    width: '31%',
    minWidth: 240,
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 4,
    gap: SPACING.sm,
  },
  gameIconBubble: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameEmoji: {
    fontSize: 56,
  },
  gameTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontFamily: 'NotoSansArabic-Regular',
  },
  gameDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  playPill: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  playPillText: {
    fontSize: 32,
    fontWeight: '900',
  },
});
