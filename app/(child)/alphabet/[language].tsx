import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MasteryBadgePill,
  ScreenContainer,
  TopAdventureHeader,
} from '../../../src/components/PlayfulUI';
import { useAppState } from '../../../src/context/AppStateContext';
import { getLettersByLanguage } from '../../../src/data/curriculum';
import { useSafeNavigate } from '../../../src/hooks/useSafeNavigate';
import { useTabletLayout } from '../../../src/hooks/useTabletLayout';
import { audioService } from '../../../src/services/audio/audioService';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../src/theme/tokens';
import { LanguageCode } from '../../../src/types';

type ChildFilter = 'all' | 'learned' | 'practice_again';

export default function AlphabetExplorerScreen() {
  const nav = useSafeNavigate();
  const params = useLocalSearchParams<{ language: string }>();
  const language: LanguageCode = params.language === 'ar' ? 'ar' : 'en';
  const isAr = language === 'ar';
  const { gridColumns } = useTabletLayout();
  const { activeChild, progressMap, parentSettings } = useAppState();
  const [filter, setFilter] = useState<ChildFilter>('all');

  const allLetters = useMemo(() => getLettersByLanguage(language), [language]);

  const filteredLetters = useMemo(() => {
    return allLetters.filter((letter) => {
      const prog = progressMap[letter.id];
      const status = prog?.masteryStatus ?? 'new';
      if (filter === 'learned') {
        return status === 'mastered' || status === 'practicing';
      }
      if (filter === 'practice_again') {
        return status === 'learning' || status === 'practicing';
      }
      return true;
    });
  }, [allLetters, progressMap, filter]);

  const tileBasisPercent = `${Math.floor(100 / gridColumns) - 2}%` as any;

  return (
    <ScreenContainer
      backgroundColor={isAr ? COLORS.arabicWorldBg : COLORS.englishWorldBg}
    >
      <TopAdventureHeader
        title={isAr ? 'جميع الحروف العربية (٢٨)' : 'All English Letters (26)'}
        subtitle={
          isAr
            ? 'اختر أي حرف لتسمع صوته وتتعلّم كتابته'
            : 'Tap any letter tile to hear its sound and practice writing!'
        }
        language={language}
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onBack={() => nav.back(`/(child)/language/${language}`)}
        onHome={nav.goHome}
      />

      {/* Simple Child-Friendly Filter Pills */}
      <View style={[styles.filterBar, isAr && { flexDirection: 'row-reverse' }]}>
        {[
          {
            key: 'all' as ChildFilter,
            labelEn: `All Letters (${allLetters.length})`,
            labelAr: `كل الحروف (${allLetters.length})`,
            emoji: '🌈',
          },
          {
            key: 'learned' as ChildFilter,
            labelEn: 'Learned & Practicing',
            labelAr: 'حروف تعلمتها',
            emoji: '👑',
          },
          {
            key: 'practice_again' as ChildFilter,
            labelEn: 'Practice Again',
            labelAr: 'تدرّب مرة أخرى',
            emoji: '🎨',
          },
        ].map((tab) => {
          const active = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              onPress={() => {
                audioService.playSoundEffect('tap');
                setFilter(tab.key);
              }}
              style={[
                styles.filterPill,
                active && {
                  backgroundColor: isAr ? COLORS.mintGreen : COLORS.skyBlue,
                  borderColor: isAr ? COLORS.mintGreenDark : COLORS.skyBlueDark,
                },
              ]}
            >
              <Text style={styles.filterEmoji}>{tab.emoji}</Text>
              <Text style={[styles.filterText, active && { color: COLORS.textOnDark }]}>
                {isAr ? tab.labelAr : tab.labelEn}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filteredLetters.length === 0 ? (
        <View style={[styles.emptyStateBox, SHADOWS.card]}>
          <Text style={styles.emptyEmoji}>🌟</Text>
          <Text style={styles.emptyTitle}>
            {isAr ? 'لا توجد حروف في هذا القسم بعد!' : 'No letters in this filter yet!'}
          </Text>
          <Text style={styles.emptySub}>
            {isAr
              ? 'اختر "كل الحروف" وابدأ بتتبع أول حرف لك!'
              : 'Switch to "All Letters" and trace your first letter!'}
          </Text>
        </View>
      ) : (
        <View style={[styles.tilesGrid, isAr && styles.tilesGridRtl]}>
          {filteredLetters.map((letter) => {
            const prog = progressMap[letter.id];
            const status = prog?.masteryStatus ?? 'new';

            return (
              <Pressable
                key={letter.id}
                accessibilityRole="button"
                accessibilityLabel={`${letter.nameEn} ${letter.example.word}`}
                onPress={() => {
                  audioService.pronounceLetter(letter);
                  if (parentSettings.exploreMode) {
                    nav.push(`/(child)/letter/${letter.id}`);
                  } else {
                    nav.push(`/(child)/lesson/${letter.id}`);
                  }
                }}
                style={({ pressed }) => [
                  styles.letterTile,
                  SHADOWS.card,
                  {
                    width: tileBasisPercent,
                    borderColor:
                      status === 'mastered'
                        ? COLORS.mintGreen
                        : status === 'practicing'
                          ? COLORS.sunshineYellow
                          : COLORS.borderLight,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tileHeroChar,
                    { color: isAr ? COLORS.mintGreenDark : COLORS.skyBlueDark },
                  ]}
                >
                  {isAr
                    ? letter.character
                    : `${letter.character} ${letter.lowercaseCharacter ?? ''}`}
                </Text>

                <View style={styles.tileWordRow}>
                  <Text style={styles.tileWordEmoji}>{letter.example.emoji}</Text>
                  <Text style={styles.tileWordText} numberOfLines={1}>
                    {letter.example.word}
                  </Text>
                </View>

                <MasteryBadgePill status={status} language={language} />
              </Pressable>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    height: 54,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    gap: 8,
  },
  filterEmoji: {
    fontSize: 18,
  },
  filterText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'flex-start',
  },
  tilesGridRtl: {
    flexDirection: 'row-reverse',
  },
  letterTile: {
    minWidth: 145,
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    borderWidth: 3,
    gap: 6,
  },
  tileHeroChar: {
    fontSize: 40,
    fontWeight: '900',
    fontFamily: 'NotoSansArabic-Regular',
  },
  tileWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tileWordEmoji: {
    fontSize: 18,
  },
  tileWordText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptyStateBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 6,
  },
});
