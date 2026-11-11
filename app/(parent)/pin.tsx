import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../src/components/PlayfulUI';
import { useAppState } from '../../src/context/AppStateContext';
import { audioService } from '../../src/services/audio/audioService';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/theme/tokens';
import {
  DEFAULT_PARENT_PIN_HASH,
  generateAdultMathChallenge,
} from '../../src/utils/pinSecurity';

export default function ParentPinGateScreen() {
  const router = useRouter();
  const {
    parentSettings,
    authenticateParent,
    authenticateParentByRecovery,
    changeParentPin,
  } = useAppState();

  const isFirstVisitSetup =
    !parentSettings.pinHintShown &&
    parentSettings.pinHash === DEFAULT_PARENT_PIN_HASH;

  const [digits, setDigits] = useState<string>('');
  const [setupStep, setSetupStep] = useState<'enter' | 'confirm'>('enter');
  const [firstPinEntry, setFirstPinEntry] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [challengeSeed, setChallengeSeed] = useState(0);

  // Randomized recovery math challenge (WP7 / Fixes P11)
  const challenge = useMemo(
    () => generateAdultMathChallenge(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challengeSeed]
  );

  const handleDigitPress = async (d: string) => {
    audioService.playSoundEffect('tap');
    setErrorMsg(null);
    if (digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);

    if (next.length === 4) {
      if (isFirstVisitSetup) {
        if (setupStep === 'enter') {
          setFirstPinEntry(next);
          setDigits('');
          setSetupStep('confirm');
          return;
        }
        // Confirm step
        if (next === firstPinEntry) {
          await changeParentPin(next);
          await authenticateParent(next);
          audioService.playSoundEffect('sparkle');
          router.replace('/(parent)/dashboard');
        } else {
          audioService.playSoundEffect('gentle_hint');
          setErrorMsg('PINs did not match. Please choose a 4-digit PIN again.');
          setFirstPinEntry('');
          setDigits('');
          setSetupStep('enter');
        }
        return;
      }

      const ok = await authenticateParent(next);
      if (ok) {
        audioService.playSoundEffect('sparkle');
        router.replace('/(parent)/dashboard');
      } else {
        audioService.playSoundEffect('gentle_hint');
        setErrorMsg('Incorrect PIN. Please try again. • الرمز غير صحيح');
        setDigits('');
      }
    }
  };

  const handleBackspace = () => {
    audioService.playSoundEffect('tap');
    setDigits((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleVerifyRecovery = async () => {
    if (Number(recoveryInput.trim()) === challenge.answer) {
      await authenticateParentByRecovery();
      router.replace('/(parent)/settings');
    } else {
      setErrorMsg('Incorrect answer. Try the new parent math question.');
      setRecoveryInput('');
      setChallengeSeed((s) => s + 1);
    }
  };

  const titleText = isFirstVisitSetup
    ? setupStep === 'enter'
      ? 'Create Your 4-Digit Parent PIN'
      : 'Confirm Your 4-Digit Parent PIN'
    : 'Enter 4-Digit Parent PIN';

  const subtitleText = isFirstVisitSetup
    ? setupStep === 'enter'
      ? 'Choose a 4-digit PIN (enter twice to confirm) • أنشئ رمز الوالدين'
      : 'Re-enter the same 4 digits to confirm • أعد إدخال الرمز للتأكيد'
    : 'أدخل الرمز السري المكون من ٤ أرقام';

  return (
    <ScreenContainer>
      <TopAdventureHeader
        title="Parent Gate • بوابة الوالدين"
        subtitle="Protected area for progress reports, profiles, and settings"
        onBack={() => router.replace('/')}
      />

      <View style={styles.centerWrap}>
        <View style={[styles.pinCard, SHADOWS.card]}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.cardTitle}>{titleText}</Text>
          <Text style={styles.cardSubtitle}>{subtitleText}</Text>

          {/* 4 PIN Dots */}
          <View style={styles.pinDotsRow}>
            {[0, 1, 2, 3].map((idx) => {
              const filled = idx < digits.length;
              return (
                <View
                  key={idx}
                  style={[
                    styles.pinDot,
                    filled && {
                      backgroundColor: COLORS.skyBlue,
                      borderColor: COLORS.skyBlueDark,
                    },
                  ]}
                />
              );
            })}
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {/* Numeric Keypad */}
          <View style={styles.keypadGrid}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(
              (key) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`Keypad ${key}`}
                  onPress={() => {
                    if (key === 'C') {
                      setDigits('');
                      setErrorMsg(null);
                    } else if (key === '⌫') {
                      handleBackspace();
                    } else {
                      handleDigitPress(key);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.keyBtn,
                    pressed && { backgroundColor: COLORS.skyBlueLight },
                  ]}
                >
                  <Text style={styles.keyBtnText}>{key}</Text>
                </Pressable>
              )
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setShowRecovery((s) => !s);
              setChallengeSeed((s) => s + 1);
              setRecoveryInput('');
            }}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotLinkText}>
              Forgot PIN? Adult Challenge Recovery • نسيت الرمز؟
            </Text>
          </Pressable>

          {showRecovery ? (
            <View style={styles.recoveryBox}>
              <Text style={styles.recoveryLabel}>
                Parent Verification: What is {challenge.prompt}?
              </Text>
              <View style={styles.recoveryInputRow}>
                <TextInput
                  value={recoveryInput}
                  onChangeText={setRecoveryInput}
                  keyboardType="number-pad"
                  placeholder="Answer"
                  style={styles.recoveryInput}
                />
                <PlayfulButton
                  label="Unlock & Reset PIN"
                  color={COLORS.mintGreen}
                  minHeight={50}
                  onPress={handleVerifyRecovery}
                />
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  pinCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  lockIcon: {
    fontSize: 42,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginVertical: SPACING.md,
  },
  pinDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: COLORS.borderCard,
    backgroundColor: COLORS.surfaceSoft,
  },
  errorText: {
    color: COLORS.coralOrangeDark,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 320,
    marginTop: SPACING.sm,
  },
  keyBtn: {
    width: 86,
    height: 64,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBtnText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  forgotLink: {
    marginTop: SPACING.lg,
    padding: 8,
  },
  forgotLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.skyBlueDark,
    textDecorationLine: 'underline',
  },
  recoveryBox: {
    width: '100%',
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  recoveryLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  recoveryInputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  recoveryInput: {
    flex: 1,
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.borderCard,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: '800',
  },
});
