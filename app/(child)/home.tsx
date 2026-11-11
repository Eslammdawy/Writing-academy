import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MascotBanner,
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../src/components/PlayfulUI';
import { useAppState } from '../../src/context/AppStateContext';
import {
  buildTodaysMission,
  evaluateDailySessionBreak,
} from '../../src/features/mission/missionPlanner';
import { useSafeNavigate } from '../../src/hooks/useSafeNavigate';
import { useTabletLayout } from '../../src/hooks/useTabletLayout';
import { audioService } from '../../src/services/audio/audioService';
import { narrator } from '../../src/services/audio/narrator';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/theme/tokens';
import { LanguageCode } from '../../src/types';

export default function ChildHomeAdventureScreen() {
  const nav = useSafeNavigate();
  const params = useLocalSearchParams<{ done?: string; lang?: string }>();
  const { isLandscape } = useTabletLayout();
  const { activeChild, progressMap, parentSettings, achievements, sessions } =
    useAppState();

  const [adventureLang, setAdventureLang] = useState<LanguageCode>(
    params.lang === 'ar' || params.lang === 'en'
      ? params.lang
      : activeChild.preferredLanguage
  );
  const [dismissedBreakToday, setDismissedBreakToday] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  // Intercept Android hardware back on Home so a child cannot exit the app accidentally (WP7)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowExitPrompt(true);
      audioService.playSoundEffect('gentle_hint');
      return true;
    });
    return () => sub.remove();
  }, []);

  // Sync default adventure language when switching child profiles
  useEffect(() => {
    if (!params.lang) {
      setAdventureLang(activeChild.preferredLanguage);
    }
  }, [activeChild.id, activeChild.preferredLanguage, params.lang]);

  const uiLang = activeChild.preferredLanguage;
  const isUiAr = uiLang === 'ar';
  const missionDoneParam = params.done === '1';

  const missionPlan = useMemo(
    () =>
      buildTodaysMission({
        language: adventureLang,
        progressMap,
        dailyGoalLetters: parentSettings.dailyGoalLetters || 3,
        achievements,
        completedGameToday: missionDoneParam,
      }),
    [
      adventureLang,
      progressMap,
      parentSettings.dailyGoalLetters,
      achievements,
      missionDoneParam,
    ]
  );

  const breakStatus = useMemo(
    () =>
      evaluateDailySessionBreak({
        sessions,
        dailyGoalMinutes: parentSettings.dailyGoalMinutes || 10,
        dismissedBreakToday,
      }),
    [sessions, parentSettings.dailyGoalMinutes, dismissedBreakToday]
  );

  const showAllDoneCelebration = missionDoneParam || missionPlan.isAllDone;

  useEffect(() => {
    if (showAllDoneCelebration) {
      audioService.playSoundEffect('celebrate');
      narrator.say('session.done', undefined, { language: uiLang });
      return;
    }
    if (breakStatus.shouldSuggestBreak) {
      narrator.say('session.breakSuggestion', undefined, { language: uiLang });
      return;
    }
    narrator.say(
      'home.welcome',
      { name: activeChild.name },
      { language: uiLang }
    );
  }, [
    showAllDoneCelebration,
    breakStatus.shouldSuggestBreak,
    activeChild.name,
    uiLang,
  ]);

  const handlePressGiantPlay = () => {
    audioService.playSoundEffect('celebrate');
    nav.push(missionPlan.nextActiveStep.href);
  };

  return (
    <ScreenContainer>
      <TopAdventureHeader
        title={
          isUiAr
            ? `أهلًا ${activeChild.name}!`
            : `Hi, ${activeChild.name}!`
        }
        language={uiLang}
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onPressChildBadge={() => nav.push('/(child)/profiles')}
        rightElement={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Parent Gate (Hold for 2 seconds)"
            delayLongPress={1800}
            onPress={() => {
              setShowExitPrompt(true);
              audioService.playSoundEffect('gentle_hint');
            }}
            onLongPress={() => {
              setShowExitPrompt(false);
              audioService.playSoundEffect('tap');
              nav.push('/(parent)/pin');
            }}
            style={styles.parentLockBtn}
          >
            <Text style={styles.parentLockEmoji}>🔒</Text>
          </Pressable>
        }
      />

      {showExitPrompt ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowExitPrompt(false)}
          style={styles.exitPromptBanner}
        >
          <Text style={styles.exitPromptText}>
            {isUiAr
              ? '🔒 اطلب من أحد الوالدين الضغط مطولًا على القفل للخروج أو الإعدادات'
              : '🔒 Ask a grown-up to press & hold 🔒 for 2 seconds'}
          </Text>
        </Pressable>
      ) : null}

      <MascotBanner
        mascotEmoji="🦊✨"
        title={
          showAllDoneCelebration
            ? isUiAr
              ? 'انتهينا لليوم! نلتقي غدًا 🌟'
              : 'All done for today! See you tomorrow 🌟'
            : isUiAr
              ? 'اضغط على النجمة الكبيرة لنبدأ!'
              : 'Tap the big star to start!'
        }
        message={
          isUiAr
            ? `مغامرة اليوم: ${missionPlan.completedStepsCount} / ${missionPlan.steps.length}`
            : `Today's Adventure: ${missionPlan.completedStepsCount} / ${missionPlan.steps.length}`
        }
        isRtl={isUiAr}
        color={COLORS.surfaceWarm}
      />

      {/* Friendly Non-Blocking Break Suggestion (WP6: dailyGoalMinutes) */}
      {breakStatus.shouldSuggestBreak ? (
        <View style={[styles.breakSuggestionCard, SHADOWS.card]}>
          <Text style={styles.breakEmoji}>🌈😴</Text>
          <Text style={styles.breakTitle}>
            {isUiAr ? 'وقت استراحة قصيرة؟' : 'Time for a little rest?'}
          </Text>
          <View style={styles.breakActionsRow}>
            <PlayfulButton
              emoji="😴"
              label={isUiAr ? 'استراحة' : 'Rest'}
              color={COLORS.mintGreen}
              minHeight={76}
              onPress={() => {
                setDismissedBreakToday(true);
                nav.replace('/');
              }}
              style={{ flex: 1 }}
            />
            <PlayfulButton
              emoji="▶"
              label={isUiAr ? 'نكمل اللعب' : 'Keep Playing'}
              color={COLORS.skyBlue}
              minHeight={76}
              onPress={() => setDismissedBreakToday(true)}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}

      {/* End-of-Mission Sticker Reveal ("All done for today!") */}
      {showAllDoneCelebration ? (
        <View style={[styles.allDoneCard, SHADOWS.card]}>
          <Text style={styles.allDoneStars}>⭐⭐⭐</Text>
          <View style={styles.stickerRevealBubble}>
            <Text style={styles.stickerRevealEmoji}>
              {missionPlan.featuredSticker.emoji}
            </Text>
          </View>
          <Text style={styles.allDoneTitle}>
            {isUiAr
              ? missionPlan.featuredSticker.titleAr
              : missionPlan.featuredSticker.titleEn}
          </Text>
          <Text style={styles.allDoneSubtitle}>
            {isUiAr
              ? 'أكملنا مغامرة اليوم بنجاح! نلتقي غدًا 👋'
              : 'You finished Today’s Adventure! See you tomorrow 👋'}
          </Text>
        </View>
      ) : null}

      {/* Core Guided Adventure Stage: Visual World Switch + Trail of Stars + ONE Giant Play Star */}
      <View
        style={[
          styles.adventureStageCard,
          SHADOWS.card,
          {
            backgroundColor:
              adventureLang === 'ar' ? COLORS.arabicWorldBg : COLORS.englishWorldBg,
            borderColor:
              adventureLang === 'ar' ? COLORS.mintGreen : COLORS.skyBlue,
          },
        ]}
      >
        {/* Simple Visual World Switch (🔤 A B C / 🕌 أ ب ت) */}
        <View style={styles.worldSwitchRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="English ABC World"
            onPress={() => {
              audioService.playSoundEffect('tap');
              setAdventureLang('en');
            }}
            style={[
              styles.worldSwitchPill,
              adventureLang === 'en' && styles.worldSwitchPillActiveEn,
            ]}
          >
            <Text style={styles.worldSwitchEmoji}>🔤</Text>
            <Text
              style={[
                styles.worldSwitchText,
                adventureLang === 'en' && { color: '#FFFFFF' },
              ]}
            >
              A B C
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Arabic Alphabet World"
            onPress={() => {
              audioService.playSoundEffect('tap');
              setAdventureLang('ar');
            }}
            style={[
              styles.worldSwitchPill,
              adventureLang === 'ar' && styles.worldSwitchPillActiveAr,
            ]}
          >
            <Text style={styles.worldSwitchEmoji}>🕌</Text>
            <Text
              style={[
                styles.worldSwitchText,
                adventureLang === 'ar' && { color: '#FFFFFF' },
              ]}
            >
              أ ب ت
            </Text>
          </Pressable>
        </View>

        {/* Today's Adventure Trail of Stars */}
        <View
          style={[
            styles.starTrailRow,
            adventureLang === 'ar' && { flexDirection: 'row-reverse' },
          ]}
        >
          {missionPlan.steps.map((step) => {
            const isNext = step.index === missionPlan.nextActiveStep.index;
            return (
              <Pressable
                key={step.id}
                accessibilityRole="button"
                accessibilityLabel={`Adventure step ${step.label}`}
                onPress={() => {
                  audioService.playSoundEffect('sparkle');
                  nav.push(step.href);
                }}
                style={({ pressed }) => [
                  styles.trailStarNode,
                  step.completed && styles.trailStarCompleted,
                  isNext && styles.trailStarActive,
                  { transform: [{ scale: pressed ? 0.94 : isNext ? 1.08 : 1 }] },
                ]}
              >
                <Text style={styles.trailStarBadge}>
                  {step.completed ? '⭐' : isNext ? '🌟' : '☆'}
                </Text>
                <Text style={styles.trailNodeChar}>{step.label}</Text>
                <Text style={styles.trailNodeEmoji}>{step.emoji}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ONE Giant "Play ⭐" Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isUiAr ? 'ابدأ اللعب' : 'Play Today’s Adventure'}
          onPress={handlePressGiantPlay}
          style={({ pressed }) => [
            styles.giantPlayButton,
            SHADOWS.button,
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
        >
          <Text style={styles.giantPlayStarIcon}>⭐</Text>
          <Text style={styles.giantPlayLabel}>
            {isUiAr ? 'نلعب!' : 'Play!'}
          </Text>
          <Text style={styles.giantPlayArrow}>▶</Text>
        </Pressable>
      </View>

      {/* 3 Small Icon-Only Secondary Buttons: Letters · Games · My Stars (>= 72 dp, >= 16 dp apart) */}
      <View style={styles.secondaryIconsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isUiAr ? 'الحروف' : 'Letters'}
          onPress={() => {
            audioService.playSoundEffect('tap');
            nav.push(`/(child)/alphabet/${adventureLang}`);
          }}
          style={({ pressed }) => [
            styles.iconOnlyCard,
            SHADOWS.button,
            {
              backgroundColor: COLORS.skyBlueLight,
              borderColor: COLORS.skyBlue,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Text style={styles.iconOnlyEmoji}>
            {adventureLang === 'ar' ? 'أ ب' : '🔤'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isUiAr ? 'الألعاب' : 'Games'}
          onPress={() => {
            audioService.playSoundEffect('tap');
            nav.push(`/(child)/games?lang=${adventureLang}`);
          }}
          style={({ pressed }) => [
            styles.iconOnlyCard,
            SHADOWS.button,
            {
              backgroundColor: COLORS.lavenderPurpleLight,
              borderColor: COLORS.lavenderPurple,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Text style={styles.iconOnlyEmoji}>🎮</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isUiAr ? 'نجومي' : 'My Stars'}
          onPress={() => {
            audioService.playSoundEffect('tap');
            nav.push('/(child)/rewards');
          }}
          style={({ pressed }) => [
            styles.iconOnlyCard,
            SHADOWS.button,
            {
              backgroundColor: COLORS.sunshineYellowLight,
              borderColor: COLORS.sunshineYellow,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Text style={styles.iconOnlyEmoji}>🏆</Text>
        </Pressable>
      </View>

      {/* Parent-Enabled Explore Mode Panel (Hidden by default in Guided Mode per WP2) */}
      {parentSettings.exploreMode ? (
        <View style={[styles.exploreGrid, isLandscape && styles.exploreGridLandscape]}>
          <PlayfulButton
            emoji="🔤"
            label={isUiAr ? 'عالم الإنجليزية' : 'English World'}
            color={COLORS.skyBlue}
            onPress={() => nav.push('/(child)/language/en')}
            style={styles.exploreBtn}
          />
          <PlayfulButton
            emoji="🕌"
            label={isUiAr ? 'عالم العربية' : 'Arabic World'}
            color={COLORS.mintGreen}
            onPress={() => nav.push('/(child)/language/ar')}
            style={styles.exploreBtn}
          />
          <PlayfulButton
            emoji="🧩"
            label={isUiAr ? 'باني الكلمات' : 'Word Builder'}
            color={COLORS.coralOrange}
            onPress={() => nav.push(`/(child)/words/${adventureLang}`)}
            style={styles.exploreBtn}
          />
          <PlayfulButton
            emoji="🗺️"
            label={isUiAr ? 'رحلتي' : 'My Journey'}
            color={COLORS.lavenderPurple}
            onPress={() => nav.push('/(child)/progress')}
            style={styles.exploreBtn}
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  parentLockBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderCard,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.72,
  },
  parentLockEmoji: {
    fontSize: 20,
  },
  exitPromptBanner: {
    alignSelf: 'center',
    backgroundColor: COLORS.surfaceWarm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: '#FDE68A',
    marginBottom: SPACING.sm,
  },
  exitPromptText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  breakSuggestionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.mintGreen,
    gap: SPACING.md,
  },
  breakEmoji: {
    fontSize: 52,
  },
  breakTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  breakActionsRow: {
    flexDirection: 'row',
    gap: 20,
    width: '100%',
    maxWidth: 460,
  },
  allDoneCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.sunshineYellow,
    gap: SPACING.sm,
  },
  allDoneStars: {
    fontSize: 44,
  },
  stickerRevealBubble: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.sunshineYellowLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.sunshineYellow,
  },
  stickerRevealEmoji: {
    fontSize: 58,
  },
  allDoneTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  allDoneSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  adventureStageCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 4,
    alignItems: 'center',
    gap: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  worldSwitchRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  worldSwitchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.borderCard,
    gap: 10,
  },
  worldSwitchPillActiveEn: {
    backgroundColor: COLORS.skyBlue,
    borderColor: COLORS.skyBlueDark,
  },
  worldSwitchPillActiveAr: {
    backgroundColor: COLORS.mintGreen,
    borderColor: COLORS.mintGreenDark,
  },
  worldSwitchEmoji: {
    fontSize: 28,
  },
  worldSwitchText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  starTrailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  trailStarNode: {
    width: 114,
    height: 128,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    borderWidth: 3.5,
    borderColor: COLORS.borderCard,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  trailStarCompleted: {
    backgroundColor: COLORS.sunshineYellowLight,
    borderColor: COLORS.sunshineYellow,
  },
  trailStarActive: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.coralOrange,
    borderWidth: 5,
  },
  trailStarBadge: {
    fontSize: 24,
  },
  trailNodeChar: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  trailNodeEmoji: {
    fontSize: 22,
  },
  giantPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 460,
    minHeight: 112,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.sunshineYellow,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
  },
  giantPlayStarIcon: {
    fontSize: 54,
  },
  giantPlayLabel: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  giantPlayArrow: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  secondaryIconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24, // >= 16 dp spacing (WP9)
    marginBottom: SPACING.md,
  },
  iconOnlyCard: {
    width: 96, // >= 72 dp (WP9)
    height: 84,
    borderRadius: RADIUS.xl,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOnlyEmoji: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  exploreGrid: {
    gap: 16,
    marginTop: SPACING.sm,
  },
  exploreGridLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  exploreBtn: {
    flex: 1,
    minWidth: 210,
  },
});
