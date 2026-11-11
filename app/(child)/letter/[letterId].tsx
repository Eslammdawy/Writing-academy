import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MasteryBadgePill,
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../../src/components/PlayfulUI';
import { useAppState } from '../../../src/context/AppStateContext';
import { getLetterById, getNextLetter } from '../../../src/data/curriculum';
import { useSafeNavigate } from '../../../src/hooks/useSafeNavigate';
import { useTabletLayout } from '../../../src/hooks/useTabletLayout';
import { audioService } from '../../../src/services/audio/audioService';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../../src/theme/tokens';
import {
  ArabicPositionalFormKey,
  EnglishFormKey,
  HarakatKey,
  LetterFormKey,
} from '../../../src/types';

export default function LetterDiscoveryLessonScreen() {
  const nav = useSafeNavigate();
  const params = useLocalSearchParams<{ letterId: string }>();
  const letter = getLetterById(params.letterId ?? 'en_A') ?? getLetterById('en_A')!;
  const isAr = letter.language === 'ar';
  const { isLandscape } = useTabletLayout();
  const { activeChild, progressMap } = useAppState();

  const [selectedForm, setSelectedForm] = useState<LetterFormKey>(
    isAr ? 'isolated' : 'uppercase'
  );
  const [selectedHarakat, setSelectedHarakat] = useState<HarakatKey>('none');

  const progress = progressMap[letter.id];
  const masteryStatus = progress?.masteryStatus ?? 'new';

  const displayedCharacter = (() => {
    if (!isAr) {
      return selectedForm === 'lowercase'
        ? letter.lowercaseCharacter ?? letter.character.toLowerCase()
        : letter.character;
    }
    const baseForm =
      letter.arabicForms?.[selectedForm as ArabicPositionalFormKey] ?? letter.character;
    if (selectedHarakat !== 'none' && letter.harakatVariants) {
      const hv = letter.harakatVariants.find((v) => v.key === selectedHarakat);
      if (hv) return hv.displayWithLetter;
    }
    return baseForm;
  })();

  const activeStrokes =
    letter.strokeTemplates[selectedForm] ??
    letter.strokeTemplates[isAr ? 'isolated' : 'uppercase'] ??
    [];

  const nextLetter = getNextLetter(letter.id);

  return (
    <ScreenContainer
      backgroundColor={isAr ? COLORS.arabicWorldBg : COLORS.englishWorldBg}
    >
      <TopAdventureHeader
        title={isAr ? `درس ${letter.nameAr}` : `${letter.nameEn} Discovery`}
        subtitle={letter.soundLabel}
        language={letter.language}
        childName={activeChild.name}
        childAvatar={activeChild.avatar}
        starsCount={activeChild.starsCount}
        onBack={() => nav.back(`/(child)/alphabet/${letter.language}`)}
        onHome={nav.goHome}
      />

      <View style={[styles.mainRow, isLandscape && styles.mainRowLandscape]}>
        {/* Left/Top Column: Hero Character + Form Selector + Harakat */}
        <View style={[styles.heroCard, SHADOWS.card]}>
          <View style={styles.heroCardTopBar}>
            <MasteryBadgePill status={masteryStatus} language={letter.language} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hear pronunciation"
              onPress={() => audioService.pronounceLetter(letter)}
              style={styles.listenBtn}
            >
              <Text style={styles.listenIcon}>🔊</Text>
              <Text style={styles.listenLabel}>
                {isAr ? 'اسمع الصوت' : 'Hear Sound'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.bigCharacterStage}>
            <Text
              style={[
                styles.bigCharacterText,
                { color: isAr ? COLORS.mintGreenDark : COLORS.skyBlueDark },
              ]}
            >
              {displayedCharacter}
            </Text>
          </View>

          {/* Form Selector: Uppercase/Lowercase for EN, or 4 Positional Forms for AR */}
          {!isAr ? (
            <View style={styles.selectorSection}>
              <Text style={styles.selectorLabel}>Choose Form:</Text>
              <View style={styles.tabsRow}>
                {(['uppercase', 'lowercase'] as EnglishFormKey[]).map((fKey) => {
                  const active = selectedForm === fKey;
                  return (
                    <Pressable
                      key={fKey}
                      accessibilityRole="button"
                      onPress={() => {
                        audioService.playSoundEffect('tap');
                        setSelectedForm(fKey);
                      }}
                      style={[
                        styles.formTab,
                        active && {
                          backgroundColor: COLORS.skyBlue,
                          borderColor: COLORS.skyBlueDark,
                        },
                      ]}
                    >
                      <Text style={[styles.formTabChar, active && { color: '#FFF' }]}>
                        {fKey === 'uppercase' ? letter.character : letter.lowercaseCharacter}
                      </Text>
                      <Text style={[styles.formTabTitle, active && { color: '#FFF' }]}>
                        {fKey === 'uppercase' ? 'Capital (Big)' : 'Lowercase (Small)'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.selectorSection}>
              <Text style={[styles.selectorLabel, styles.rtlText]}>
                أشكال الحرف حسب موقعه في الكلمة:
              </Text>
              <View style={[styles.tabsRow, { flexDirection: 'row-reverse' }]}>
                {(
                  [
                    { key: 'isolated', labelAr: 'منفصل', labelEn: 'Isolated' },
                    { key: 'initial', labelAr: 'أول الكلمة', labelEn: 'Initial' },
                    { key: 'medial', labelAr: 'وسط الكلمة', labelEn: 'Medial' },
                    { key: 'final', labelAr: 'آخر الكلمة', labelEn: 'Final' },
                  ] as Array<{ key: ArabicPositionalFormKey; labelAr: string; labelEn: string }>
                ).map((item) => {
                  const active = selectedForm === item.key;
                  const glyph = letter.arabicForms?.[item.key] ?? letter.character;
                  return (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      onPress={() => {
                        audioService.playSoundEffect('tap');
                        setSelectedForm(item.key);
                      }}
                      style={[
                        styles.formTab,
                        active && {
                          backgroundColor: COLORS.mintGreen,
                          borderColor: COLORS.mintGreenDark,
                        },
                      ]}
                    >
                      <Text style={[styles.formTabChar, active && { color: '#FFF' }]}>
                        {glyph}
                      </Text>
                      <Text style={[styles.formTabTitle, active && { color: '#FFF' }]}>
                        {item.labelAr}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Non-joining behavior callout for أ د ذ ر ز و */}
              <View style={styles.arabicRuleBox}>
                <Text style={styles.arabicRuleText}>
                  {letter.nonJoiningAfter
                    ? `💡 حرف (${letter.character}) من الحروف الرافسة: يتصل بما قبله ولا يتصل بالحرف الذي يأتي بعده!`
                    : `🤝 حرف (${letter.character}) يتصل بالحروف قبله وبعده في الكلمة.`}
                  {letter.dotCount && letter.dotCount > 0
                    ? ` • عدد النقاط: ${letter.dotCount}`
                    : ' • بدون نقاط'}
                </Text>
              </View>

              {/* Harakat Interactive Explorer */}
              {letter.harakatVariants ? (
                <View style={styles.harakatSection}>
                  <Text style={[styles.selectorLabel, styles.rtlText]}>
                    جرّب الحركات القصيرة (فتحة، كسرة، ضمة):
                  </Text>
                  <View style={[styles.tabsRow, { flexDirection: 'row-reverse' }]}>
                    {letter.harakatVariants.map((hv) => {
                      const active = selectedHarakat === hv.key;
                      return (
                        <Pressable
                          key={hv.key}
                          accessibilityRole="button"
                          onPress={() => {
                            setSelectedHarakat(active ? 'none' : hv.key);
                            audioService.pronounceLetter(letter, hv.soundLabelAr);
                          }}
                          style={[
                            styles.harakatPill,
                            active && {
                              backgroundColor: COLORS.sunshineYellow,
                              borderColor: COLORS.sunshineYellowDark,
                            },
                          ]}
                        >
                          <Text style={styles.harakatGlyph}>{hv.displayWithLetter}</Text>
                          <Text style={styles.harakatLabel}>{hv.soundLabelAr}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Right/Bottom Column: Picture Word Card + Stroke Steps + Watch / Trace / Write Actions */}
        <View style={styles.rightColumn}>
          <View style={[styles.wordExampleCard, SHADOWS.card]}>
            <View style={styles.wordTopRow}>
              <View style={styles.wordEmojiCircle}>
                <Text style={styles.wordBigEmoji}>{letter.example.emoji}</Text>
              </View>
              <View style={[styles.wordTextCol, isAr && { alignItems: 'flex-end' }]}>
                <Text style={styles.wordLabel}>
                  {isAr ? 'مثال وصورة' : 'EXAMPLE WORD'}
                </Text>
                <Text style={styles.wordMain}>{letter.example.word}</Text>
                <Text style={styles.wordTranslation}>
                  {isAr ? letter.example.meaningEn : letter.example.meaningAr}
                </Text>
                {letter.example.sentenceEn || letter.example.sentenceAr ? (
                  <Text style={styles.wordSentence}>
                    “{isAr ? letter.example.sentenceAr : letter.example.sentenceEn}”
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pronounce example word"
                onPress={() =>
                  audioService.pronounceWord(letter.example.word, letter.language)
                }
                style={styles.wordSpeakerBtn}
              >
                <Text style={{ fontSize: 24 }}>🔊</Text>
              </Pressable>
            </View>
          </View>

          {/* Stroke formation summary card */}
          <View style={[styles.strokeSummaryCard, SHADOWS.card]}>
            <Text style={[styles.strokeSummaryTitle, isAr && styles.rtlText]}>
              {isAr
                ? `خطوات كتابة الحرف (${activeStrokes.length} خطوات):`
                : `How to Write It (${activeStrokes.length} ${activeStrokes.length === 1 ? 'stroke' : 'strokes'}):`}
            </Text>
            {activeStrokes.map((st) => (
              <View
                key={st.strokeNumber}
                style={[styles.strokeStepRow, isAr && { flexDirection: 'row-reverse' }]}
              >
                <View style={styles.strokeStepBadge}>
                  <Text style={styles.strokeStepNum}>{st.strokeNumber}</Text>
                </View>
                <Text style={[styles.strokeStepDesc, isAr && styles.rtlText]}>
                  {isAr ? st.instructionAr : st.instructionEn}
                </Text>
              </View>
            ))}
          </View>

          {/* Three Core Handwriting Modes: Watch, Trace, Write */}
          <View style={styles.modeButtonsRow}>
            <PlayfulButton
              emoji="👀"
              label={isAr ? '١. شاهد' : '1. Watch'}
              sublabel={isAr ? 'شاهد الرسم' : 'See strokes'}
              color={COLORS.lavenderPurple}
              onPress={() =>
                nav.push(
                  `/(child)/practice/${letter.id}?mode=watch&form=${selectedForm}`
                )
              }
              style={styles.modeBtn}
            />

            <PlayfulButton
              emoji="☝️"
              label={isAr ? '٢. تتبّع' : '2. Trace'}
              sublabel={isAr ? 'تتبّع النقاط' : 'Follow dots'}
              color={COLORS.skyBlue}
              onPress={() =>
                nav.push(
                  `/(child)/practice/${letter.id}?mode=trace&form=${selectedForm}`
                )
              }
              style={styles.modeBtn}
            />

            <PlayfulButton
              emoji="✏️"
              label={isAr ? '٣. اكتب' : '3. Write'}
              sublabel={isAr ? 'اكتب بمفردك' : 'Write solo'}
              color={COLORS.mintGreen}
              onPress={() =>
                nav.push(
                  `/(child)/practice/${letter.id}?mode=write&form=${selectedForm}`
                )
              }
              style={styles.modeBtn}
            />
          </View>

          <PlayfulButton
            emoji="➡️"
            label={
              isAr
                ? `الحرف التالي: ${nextLetter.nameAr}`
                : `Next Letter: ${nextLetter.nameEn}`
            }
            color={COLORS.textSecondary}
            variant="outline"
            minHeight={56}
            onPress={() => nav.replace(`/(child)/letter/${nextLetter.id}`)}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  mainRow: {
    gap: SPACING.lg,
  },
  mainRowLandscape: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  heroCardTopBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.sunshineYellowLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: COLORS.sunshineYellow,
    gap: 6,
  },
  listenIcon: {
    fontSize: 20,
  },
  listenLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.sunshineYellowDark,
  },
  bigCharacterStage: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.md,
    borderWidth: 4,
    borderColor: COLORS.skyBlueLight,
  },
  bigCharacterText: {
    fontSize: 96,
    fontWeight: '900',
    fontFamily: 'NotoSansArabic-Regular',
  },
  selectorSection: {
    width: '100%',
    marginTop: SPACING.xs,
  },
  selectorLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formTab: {
    flex: 1,
    minWidth: 96,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  formTabChar: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  formTabTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  arabicRuleBox: {
    backgroundColor: COLORS.surfaceWarm,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  arabicRuleText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  harakatSection: {
    marginTop: SPACING.md,
  },
  harakatPill: {
    flex: 1,
    minWidth: 90,
    backgroundColor: COLORS.surfaceWarm,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  harakatGlyph: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'NotoSansArabic-Regular',
  },
  harakatLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  rightColumn: {
    flex: 1,
    gap: SPACING.md,
  },
  wordExampleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  wordTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  wordEmojiCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordBigEmoji: {
    fontSize: 48,
  },
  wordTextCol: {
    flex: 1,
  },
  wordLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.coralOrangeDark,
    letterSpacing: 0.5,
  },
  wordMain: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  wordTranslation: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  wordSentence: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.mintGreenDark,
    marginTop: 4,
  },
  wordSpeakerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.skyBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strokeSummaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: 8,
  },
  strokeSummaryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  strokeStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  strokeStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.skyBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strokeStepNum: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
  strokeStepDesc: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modeButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  modeBtn: {
    flex: 1,
    minWidth: 135,
  },
});
