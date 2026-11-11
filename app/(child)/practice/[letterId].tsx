import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../../src/components/PlayfulUI';
import { useAppState } from '../../../src/context/AppStateContext';
import { BADGE_CATALOG, getLetterById, getNextLetter } from '../../../src/data/curriculum';
import { HandwritingCanvas } from '../../../src/features/handwriting/HandwritingCanvas';
import { useTabletLayout } from '../../../src/hooks/useTabletLayout';
import { audioService } from '../../../src/services/audio/audioService';
import {
  evaluateHandwritingAttempt,
  SCORING_VERSION,
} from '../../../src/services/scoring/handwritingEvaluator';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../src/theme/tokens';
import {
  AchievementType,
  ArabicPositionalFormKey,
  EnglishFormKey,
  HandwritingEvaluationResult,
  HandwritingMode,
  LetterFormKey,
  RecordedStroke,
} from '../../../src/types';

export default function HandwritingStudioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    letterId: string;
    mode?: string;
    form?: string;
  }>();

  const letter = getLetterById(params.letterId ?? 'en_A') ?? getLetterById('en_A')!;
  const isAr = letter.language === 'ar';
  const { isLandscape, canvasSize } = useTabletLayout();
  const { activeChild, recordPractice, parentSettings, updateSettings } = useAppState();

  const initialMode: HandwritingMode =
    params.mode === 'watch' || params.mode === 'write' ? params.mode : 'trace';
  const initialForm: LetterFormKey =
    (params.form as LetterFormKey) ?? (isAr ? 'isolated' : 'uppercase');

  const [mode, setMode] = useState<HandwritingMode>(initialMode);
  const [formKey, setFormKey] = useState<LetterFormKey>(initialForm);
  const [recordedStrokes, setRecordedStrokes] = useState<RecordedStroke[]>([]);
  const [watchReplayCounter, setWatchReplayCounter] = useState(0);
  const [evaluationResult, setEvaluationResult] =
    useState<HandwritingEvaluationResult | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<AchievementType[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  const sessionStartRef = useRef<number>(Date.now());
  const isSubmittingRef = useRef<boolean>(false);

  const templates = useMemo(() => {
    return (
      letter.strokeTemplates[formKey] ??
      letter.strokeTemplates[isAr ? 'isolated' : 'uppercase'] ??
      []
    );
  }, [letter, formKey, isAr]);

  const displayedGlyph = useMemo(() => {
    if (!isAr) {
      return formKey === 'lowercase'
        ? letter.lowercaseCharacter ?? letter.character.toLowerCase()
        : letter.character;
    }
    return letter.arabicForms?.[formKey as ArabicPositionalFormKey] ?? letter.character;
  }, [letter, formKey, isAr]);

  const handleSwitchMode = (nextMode: HandwritingMode) => {
    audioService.playSoundEffect('tap');
    setMode(nextMode);
    setRecordedStrokes([]);
    setEvaluationResult(null);
    sessionStartRef.current = Date.now();
    if (nextMode === 'watch') {
      setWatchReplayCounter((c) => c + 1);
    }
  };

  const handleSwitchForm = (nextForm: LetterFormKey) => {
    audioService.playSoundEffect('tap');
    setFormKey(nextForm);
    setRecordedStrokes([]);
    setEvaluationResult(null);
    sessionStartRef.current = Date.now();
  };

  const handleUndo = () => {
    if (recordedStrokes.length === 0) return;
    audioService.playSoundEffect('tap');
    setRecordedStrokes((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    audioService.playSoundEffect('tap');
    setRecordedStrokes([]);
  };

  const handleReplayGuide = () => {
    audioService.pronounceLetter(letter);
    if (mode !== 'watch') {
      setMode('watch');
    }
    setWatchReplayCounter((c) => c + 1);
  };

  const handleEvaluateAttempt = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      const result = evaluateHandwritingAttempt(mode, formKey, templates, recordedStrokes);
      setEvaluationResult(result);

      if (result.passed) {
        audioService.playSoundEffect('celebrate');
      } else {
        audioService.playSoundEffect('gentle_hint');
      }

      const durationSeconds = Math.max(
        5,
        Math.round((Date.now() - sessionStartRef.current) / 1000)
      );

      const hasDots = Boolean(letter.dotCount && letter.dotCount > 0 && result.dotsAndMarksScore >= 70);

      const saved = await recordPractice({
        letterId: letter.id,
        formKey,
        mode,
        score: result.overallScore,
        passed: result.passed,
        starsEarned: result.starsEarned,
        scoringVersion: SCORING_VERSION,
        metricsJson: JSON.stringify({
          coverageScore: result.coverageScore,
          similarityScore: result.similarityScore,
          strokeOrderScore: result.strokeOrderScore,
          startEndScore: result.startEndScore,
          dotsAndMarksScore: result.dotsAndMarksScore,
          strokesRecorded: recordedStrokes.length,
        }),
        durationSeconds,
        hasDotsReward: hasDots,
        isRetry: retryCount > 0,
      });

      setUnlockedBadges(saved.newAchievements);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const nextLetter = getNextLetter(letter.id);

  return (
    <ScreenContainer
      backgroundColor={isAr ? COLORS.arabicWorldBg : COLORS.englishWorldBg}
    >
      <TopAdventureHeader
        title={isAr ? `مرسم الخط: ${letter.nameAr}` : `Handwriting Studio: ${letter.nameEn}`}
        subtitle={
          mode === 'watch'
            ? isAr
              ? 'شاهد كيف نكتب الحرف خطوة بخطوة'
              : 'Watch each numbered stroke animate in order'
            : mode === 'trace'
              ? isAr
                ? 'تتبّع النقاط بإصبعك أو بالقلم'
                : 'Trace along the dotted path with your finger or stylus'
              : isAr
                ? 'اكتب الحرف بمفردك على السطر!'
                : 'Write the letter all by yourself on the line!'
        }
        language={letter.language}
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onBack={() => router.push(`/(child)/letter/${letter.id}`)}
        onHome={() => router.push('/(child)/home')}
        rightElement={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle Sound"
            onPress={() =>
              updateSettings({ audioEnabled: !parentSettings.audioEnabled })
            }
            style={styles.audioToggleBtn}
          >
            <Text style={{ fontSize: 22 }}>
              {parentSettings.audioEnabled ? '🔊' : '🔇'}
            </Text>
          </Pressable>
        }
      />

      <View style={[styles.studioBody, isLandscape && styles.studioBodyLandscape]}>
        {/* Main Canvas Area (Central & Spacious, free from floating overlays) */}
        <View style={styles.canvasColumn}>
          <HandwritingCanvas
            mode={mode}
            language={letter.language}
            templates={templates}
            recordedStrokes={recordedStrokes}
            onStrokesChange={setRecordedStrokes}
            canvasSize={canvasSize}
            watchTriggerKey={watchReplayCounter}
          />

          {/* Bottom Canvas Action Row: Undo, Clear, Replay Guide, Check / Next */}
          <View style={styles.actionRow}>
            <PlayfulButton
              emoji="↩️"
              label={isAr ? 'تراجع' : 'Undo'}
              color={COLORS.textSecondary}
              variant="outline"
              minHeight={60}
              disabled={mode === 'watch' || recordedStrokes.length === 0}
              onPress={handleUndo}
              style={styles.actionBtn}
            />

            <PlayfulButton
              emoji="🧹"
              label={isAr ? 'مسح' : 'Clear'}
              color={COLORS.coralOrange}
              variant="outline"
              minHeight={60}
              disabled={mode === 'watch' || recordedStrokes.length === 0}
              onPress={handleClear}
              style={styles.actionBtn}
            />

            <PlayfulButton
              emoji="🎬"
              label={isAr ? 'إعادة الشرح' : 'Replay Guide'}
              color={COLORS.lavenderPurple}
              variant="soft"
              minHeight={60}
              onPress={handleReplayGuide}
              style={styles.actionBtn}
            />

            {mode === 'watch' ? (
              <PlayfulButton
                emoji="☝️"
                label={isAr ? 'ابدأ التتبع!' : 'Start Tracing!'}
                color={COLORS.skyBlue}
                minHeight={60}
                onPress={() => handleSwitchMode('trace')}
                style={styles.actionBtnPrimary}
              />
            ) : (
              <PlayfulButton
                emoji="🌟"
                label={isAr ? 'تحقّق من كتابتي' : 'Check Writing'}
                color={COLORS.mintGreen}
                minHeight={60}
                disabled={recordedStrokes.length === 0}
                onPress={handleEvaluateAttempt}
                style={styles.actionBtnPrimary}
              />
            )}
          </View>
        </View>

        {/* Side / Top Panel: Target Letter, Mode Switcher, Form Selector, Audio & Instructions */}
        <View style={[styles.sidePanel, SHADOWS.card]}>
          {/* Target Letter Card */}
          <View style={styles.targetHeaderRow}>
            <View style={styles.targetGlyphBubble}>
              <Text style={styles.targetGlyphText}>{displayedGlyph}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.targetLetterTitle}>
                {isAr ? letter.nameAr : letter.nameEn}
              </Text>
              <Text style={styles.targetWordExample}>
                {letter.example.emoji} {letter.example.word}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Play pronunciation"
              onPress={() => audioService.pronounceLetter(letter)}
              style={styles.speakCircle}
            >
              <Text style={{ fontSize: 24 }}>🔊</Text>
            </Pressable>
          </View>

          {/* 3 Mode Selector Pills: WATCH / TRACE / WRITE */}
          <Text style={styles.panelSectionLabel}>
            {isAr ? 'وضع التدريب:' : 'Practice Mode:'}
          </Text>
          <View style={styles.modeSelectorRow}>
            {(
              [
                { key: 'watch', labelEn: '1. Watch', labelAr: '١. شاهد', emoji: '👀' },
                { key: 'trace', labelEn: '2. Trace', labelAr: '٢. تتبّع', emoji: '☝️' },
                { key: 'write', labelEn: '3. Write', labelAr: '٣. اكتب', emoji: '✏️' },
              ] as Array<{ key: HandwritingMode; labelEn: string; labelAr: string; emoji: string }>
            ).map((m) => {
              const active = mode === m.key;
              return (
                <Pressable
                  key={m.key}
                  accessibilityRole="button"
                  onPress={() => handleSwitchMode(m.key)}
                  style={[
                    styles.modeTabBtn,
                    active && {
                      backgroundColor: COLORS.skyBlue,
                      borderColor: COLORS.skyBlueDark,
                    },
                  ]}
                >
                  <Text style={styles.modeTabEmoji}>{m.emoji}</Text>
                  <Text style={[styles.modeTabText, active && { color: '#FFF' }]}>
                    {isAr ? m.labelAr : m.labelEn}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Form Selector Pills (Uppercase/Lowercase or Isolated/Initial/Medial/Final) */}
          <Text style={styles.panelSectionLabel}>
            {isAr ? 'شكل الحرف:' : 'Letter Form:'}
          </Text>
          {!isAr ? (
            <View style={styles.formSelectorRow}>
              {(['uppercase', 'lowercase'] as EnglishFormKey[]).map((fk) => {
                const active = formKey === fk;
                return (
                  <Pressable
                    key={fk}
                    accessibilityRole="button"
                    onPress={() => handleSwitchForm(fk)}
                    style={[
                      styles.formChip,
                      active && {
                        backgroundColor: COLORS.mintGreen,
                        borderColor: COLORS.mintGreenDark,
                      },
                    ]}
                  >
                    <Text style={[styles.formChipText, active && { color: '#FFF' }]}>
                      {fk === 'uppercase'
                        ? `Capital (${letter.character})`
                        : `Lowercase (${letter.lowercaseCharacter})`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={[styles.formSelectorRow, { flexDirection: 'row-reverse' }]}>
              {(
                [
                  { key: 'isolated', label: 'منفصل' },
                  { key: 'initial', label: 'أول' },
                  { key: 'medial', label: 'وسط' },
                  { key: 'final', label: 'آخر' },
                ] as Array<{ key: ArabicPositionalFormKey; label: string }>
              ).map((fk) => {
                const active = formKey === fk.key;
                const g = letter.arabicForms?.[fk.key] ?? letter.character;
                return (
                  <Pressable
                    key={fk.key}
                    accessibilityRole="button"
                    onPress={() => handleSwitchForm(fk.key)}
                    style={[
                      styles.formChip,
                      active && {
                        backgroundColor: COLORS.mintGreen,
                        borderColor: COLORS.mintGreenDark,
                      },
                    ]}
                  >
                    <Text style={[styles.formChipText, active && { color: '#FFF' }]}>
                      {g} ({fk.label})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Live Stroke Progress Indicator */}
          <View style={styles.progressBox}>
            <Text style={styles.progressTitle}>
              {isAr
                ? `الخطوات المرسومة: ${recordedStrokes.length} / ${templates.length}`
                : `Strokes Drawn: ${recordedStrokes.length} of ${templates.length}`}
            </Text>
            <Text style={styles.progressSub}>
              {letter.dotCount && letter.dotCount > 0
                ? isAr
                  ? `تذكّر وضع نقاط الحرف (${letter.dotCount}) في مكانها!`
                  : `Remember to place the ${letter.dotCount} Arabic dot(s)!`
                : isAr
                  ? 'ابدأ من الدائرة المرقمة واتبع السهم.'
                  : 'Start at the numbered circle and follow the arrow.'}
            </Text>
          </View>
        </View>
      </View>

      {/* Screen 8 — Result / Encouragement Modal */}
      <Modal
        visible={evaluationResult !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEvaluationResult(null)}
      >
        <View style={styles.modalBackdrop}>
          {evaluationResult ? (
            <View style={[styles.resultCard, SHADOWS.card]}>
              {/* Animated/Celebratory Stars Row */}
              <View style={styles.starsCelebrationRow}>
                {[1, 2, 3].map((starNum) => {
                  const earned = starNum <= evaluationResult.starsEarned;
                  return (
                    <Text
                      key={starNum}
                      style={[
                        styles.bigStarEmoji,
                        { opacity: earned ? 1 : 0.25 },
                      ]}
                    >
                      ⭐
                    </Text>
                  );
                })}
              </View>

              <Text style={styles.resultTitle}>
                {isAr
                  ? evaluationResult.encouragementTitleAr
                  : evaluationResult.encouragementTitleEn}
              </Text>

              <Text style={styles.resultHint}>
                {isAr
                  ? evaluationResult.gentleHintAr
                  : evaluationResult.gentleHintEn}
              </Text>

              {/* Newly unlocked badges celebration */}
              {unlockedBadges.length > 0 ? (
                <View style={styles.badgeUnlockBox}>
                  {unlockedBadges.map((bType) => {
                    const bDef = BADGE_CATALOG.find((b) => b.type === bType);
                    if (!bDef) return null;
                    return (
                      <View key={bType} style={styles.badgeUnlockRow}>
                        <Text style={{ fontSize: 26 }}>{bDef.emoji}</Text>
                        <Text style={styles.badgeUnlockText}>
                          New Badge: {isAr ? bDef.titleAr : bDef.titleEn}!
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.resultButtonsRow}>
                <PlayfulButton
                  emoji="🔄"
                  label={isAr ? 'حاول مرة أخرى' : 'Try Again'}
                  color={COLORS.skyBlue}
                  variant="outline"
                  onPress={() => {
                    setRetryCount((r) => r + 1);
                    setRecordedStrokes([]);
                    setEvaluationResult(null);
                    sessionStartRef.current = Date.now();
                  }}
                  style={styles.resultBtn}
                />

                {mode === 'trace' && evaluationResult.passed ? (
                  <PlayfulButton
                    emoji="✏️"
                    label={isAr ? 'اكتب بمفردك الآن!' : 'Try Write Solo!'}
                    color={COLORS.mintGreen}
                    onPress={() => handleSwitchMode('write')}
                    style={styles.resultBtn}
                  />
                ) : (
                  <PlayfulButton
                    emoji="➡️"
                    label={isAr ? 'الحرف التالي' : 'Next Letter'}
                    color={COLORS.mintGreen}
                    onPress={() => {
                      setEvaluationResult(null);
                      router.replace(`/(child)/letter/${nextLetter.id}`);
                    }}
                    style={styles.resultBtn}
                  />
                )}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  audioToggleBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  studioBody: {
    gap: SPACING.lg,
    alignItems: 'center',
  },
  studioBodyLandscape: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  canvasColumn: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    width: '100%',
  },
  actionBtn: {
    minWidth: 115,
    paddingHorizontal: SPACING.md,
  },
  actionBtnPrimary: {
    minWidth: 165,
    paddingHorizontal: SPACING.lg,
  },
  sidePanel: {
    flex: 1,
    minWidth: 280,
    maxWidth: 420,
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  targetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.borderLight,
  },
  targetGlyphBubble: {
    width: 78,
    height: 78,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetGlyphText: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  targetLetterTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  targetWordExample: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  speakCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.skyBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelSectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeTabBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  modeTabEmoji: {
    fontSize: 20,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  formSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formChip: {
    flex: 1,
    minWidth: 80,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  formChipText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  progressBox: {
    backgroundColor: COLORS.surfaceWarm,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.xs,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  progressSub: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  resultCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.sunshineYellow,
  },
  starsCelebrationRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  bigStarEmoji: {
    fontSize: 54,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  resultHint: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  badgeUnlockBox: {
    width: '100%',
    backgroundColor: COLORS.sunshineYellowLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: 6,
  },
  badgeUnlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  badgeUnlockText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.sunshineYellowDark,
  },
  resultButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    width: '100%',
  },
  resultBtn: {
    flex: 1,
    minWidth: 180,
  },
});
