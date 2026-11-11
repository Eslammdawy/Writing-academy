import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MascotBanner,
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../../src/components/PlayfulUI';
import { useAppState } from '../../../src/context/AppStateContext';
import { audioService } from '../../../src/services/audio/audioService';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../src/theme/tokens';
import { GameId, LanguageCode } from '../../../src/types';

interface GameLobbyCardSpec {
  id: GameId;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export const GAMES_CATALOG: GameLobbyCardSpec[] = [
  {
    id: 'treasure_hunt',
    titleEn: '1. Letter Treasure Hunt',
    titleAr: '١. كنز الحروف المخفية',
    descEn: 'Find the glowing target letter among the treasure chests!',
    descAr: 'ابحث عن الحرف المطلوب بين صناديق الكنز!',
    emoji: '💎',
    color: COLORS.sunshineYellowDark,
    bgColor: COLORS.sunshineYellowLight,
  },
  {
    id: 'match_picture',
    titleEn: '2. Match the Picture',
    titleAr: '٢. طابق الحرف بالصورة',
    descEn: 'Listen to the letter sound and pair it with its picture friend!',
    descAr: 'اسمع صوت الحرف وصِله بالصورة والكلمة المناسبة!',
    emoji: '🖼️',
    color: COLORS.skyBlueDark,
    bgColor: COLORS.skyBlueLight,
  },
  {
    id: 'write_to_launch',
    titleEn: '3. Write to Launch!',
    titleAr: '٣. اكتب لتنطلق بالصاروخ!',
    descEn: 'Write the fuel letter on the launchpad to blast the rocket into space!',
    descAr: 'اكتب الحرف على منصة الإطلاق لينطلق الصاروخ نحو النجوم!',
    emoji: '🚀',
    color: COLORS.coralOrangeDark,
    bgColor: COLORS.coralOrangeLight,
  },
  {
    id: 'complete_monster',
    titleEn: '4. Complete the Monster',
    titleAr: '٤. أكمل الوحش اللطيف',
    descEn: 'Draw the missing letter curve or dot to make the friendly monster smile!',
    descAr: 'أكمل الجزء الناقص من الحرف ليبتسم الوحش اللطيف!',
    emoji: '👾',
    color: COLORS.lavenderPurpleDark,
    bgColor: COLORS.lavenderPurpleLight,
  },
  {
    id: 'letter_challenge',
    titleEn: '5. Letter Challenge',
    titleAr: '٥. تحدّي الحروف الشامل',
    descEn: 'A fun 3-step mix: Spot the letter, match the picture, and trace it!',
    descAr: 'مراجعة مرحة من ٣ خطوات: اكتشف الحرف، طابق الصورة، وتتبّعه!',
    emoji: '🏆',
    color: COLORS.mintGreenDark,
    bgColor: COLORS.mintGreenLight,
  },
];

export default function GamesLobbyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();
  const { activeChild } = useAppState();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(
    params.lang === 'ar' ? 'ar' : activeChild.preferredLanguage
  );
  const isAr = selectedLang === 'ar';

  return (
    <ScreenContainer>
      <TopAdventureHeader
        title={isAr ? 'مدينة الألعاب التعليمية' : 'Playful Games Lobby'}
        subtitle={
          isAr
            ? 'اختر اللغة واللعبة لتبدأ المرح والتعلم!'
            : 'Pick a language and choose any of the 5 learning games!'
        }
        language={selectedLang}
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onBack={() => router.push('/(child)/home')}
        onHome={() => router.push('/(child)/home')}
      />

      {/* Language Toggle for Games */}
      <View style={styles.langToggleRow}>
        <PlayfulButton
          emoji="🔤"
          label="Play in English (A–Z)"
          color={COLORS.skyBlue}
          variant={selectedLang === 'en' ? 'solid' : 'outline'}
          minHeight={58}
          onPress={() => setSelectedLang('en')}
          style={{ flex: 1 }}
        />
        <PlayfulButton
          emoji="🕌"
          label="العب بالعربية (أ–ي)"
          color={COLORS.mintGreen}
          variant={selectedLang === 'ar' ? 'solid' : 'outline'}
          minHeight={58}
          onPress={() => setSelectedLang('ar')}
          style={{ flex: 1 }}
        />
      </View>

      <MascotBanner
        mascotEmoji="🎮🦊"
        title={
          isAr
            ? 'خمس ألعاب تعليمية ممتعة بانتظارك!'
            : 'Five Exciting Learning Games Await!'
        }
        message={
          isAr
            ? 'كل لعبة تمنحك نجومًا وملصقات جديدة عند المحاولة والإنجاز!'
            : 'Every game rewards your effort with stars and sticker badges!'
        }
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
              router.push(`/(child)/games/${game.id}?lang=${selectedLang}`);
            }}
            style={({ pressed }) => [
              styles.gameCard,
              SHADOWS.card,
              {
                borderColor: game.color,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={[styles.gameIconBubble, { backgroundColor: game.bgColor }]}>
              <Text style={styles.gameEmoji}>{game.emoji}</Text>
            </View>

            <Text style={styles.gameTitle}>{isAr ? game.titleAr : game.titleEn}</Text>
            <Text style={styles.gameDesc}>{isAr ? game.descAr : game.descEn}</Text>

            <View style={[styles.playPill, { backgroundColor: game.bgColor }]}>
              <Text style={[styles.playPillText, { color: game.color }]}>
                {isAr ? 'العب الآن ▶' : '▶ Play Now'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  langToggleRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  gameCard: {
    width: '31%',
    minWidth: 260,
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 3,
  },
  gameIconBubble: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  gameEmoji: {
    fontSize: 48,
  },
  gameTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  gameDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: SPACING.md,
  },
  playPill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    marginTop: 'auto',
  },
  playPillText: {
    fontSize: 16,
    fontWeight: '900',
  },
});
