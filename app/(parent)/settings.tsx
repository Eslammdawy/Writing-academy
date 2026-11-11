import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../src/components/PlayfulUI';
import { useAppState } from '../../src/context/AppStateContext';
import { narrator } from '../../src/services/audio/narrator';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/theme/tokens';

export default function ParentSettingsScreen() {
  const router = useRouter();
  const {
    isParentAuthenticated,
    parentSettings,
    childrenProfiles,
    voiceHealth,
    recheckVoiceHealth,
    updateSettings,
    changeParentPin,
    resetChildData,
    resetAllData,
  } = useAppState();

  const [newPin, setNewPin] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmResetTarget, setConfirmResetTarget] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!isParentAuthenticated) {
      router.replace('/(parent)/pin');
    }
  }, [isParentAuthenticated, router]);

  if (!isParentAuthenticated) return null;

  const handleSavePin = async () => {
    if (!/^\d{4}$/.test(newPin.trim())) {
      setStatusMessage('PIN must be exactly 4 digits (e.g., 2580).');
      return;
    }
    await changeParentPin(newPin.trim());
    setNewPin('');
    setStatusMessage('Parent PIN updated and stored as a salted SHA-256 hash.');
  };

  const handleTestVoice = async (lang: 'en' | 'ar') => {
    await recheckVoiceHealth();
    narrator.say('voice.test', undefined, { language: lang });
    setStatusMessage(
      lang === 'ar'
        ? 'Playing Arabic voice test (voice.test)...'
        : 'Playing English voice test (voice.test)...'
    );
  };

  const isGuidedMode = parentSettings.guidedMode !== false;
  const isExploreMode = Boolean(parentSettings.exploreMode);

  return (
    <ScreenContainer>
      <TopAdventureHeader
        title="Parent Settings & Controls • الإعدادات"
        subtitle="Guided mode, voice health, daily goals, PIN security, and local reset"
        onBack={() => router.push('/(parent)/dashboard')}
      />

      {statusMessage ? (
        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>ℹ️ {statusMessage}</Text>
        </View>
      ) : null}

      {/* Guided Mode vs Explore Mode Toggles (WP8) */}
      <View style={[styles.settingsCard, SHADOWS.card]}>
        <Text style={styles.cardTitle}>🧭 Child Navigation & Independence Mode</Text>
        <Text style={styles.cardDesc}>
          Guided Mode (default ON) focuses Home on Today’s Adventure star trail and
          auto-advancing lessons. Explore Mode unlocks additional free-roaming world
          and Word Builder shortcuts on Home.
        </Text>
        <View style={styles.rowWrap}>
          <PlayfulButton
            emoji={isGuidedMode ? '⭐' : '🧭'}
            label={
              isGuidedMode
                ? 'Guided Mode: ON (Recommended)'
                : 'Guided Mode: OFF'
            }
            color={isGuidedMode ? COLORS.mintGreen : COLORS.textSecondary}
            minHeight={54}
            onPress={() => updateSettings({ guidedMode: !isGuidedMode })}
          />

          <PlayfulButton
            emoji={isExploreMode ? '🗺️' : '🔒'}
            label={
              isExploreMode
                ? 'Explore Mode Shortcuts: ON'
                : 'Explore Mode Shortcuts: OFF'
            }
            color={isExploreMode ? COLORS.skyBlue : COLORS.textSecondary}
            minHeight={54}
            onPress={() => updateSettings({ exploreMode: !isExploreMode })}
          />
        </View>
      </View>

      {/* Sound, Narration & Voice Health (WP1 & WP8) */}
      <View style={[styles.settingsCard, SHADOWS.card]}>
        <Text style={styles.cardTitle}>🔊 Sound, Narration & Offline Voice Health</Text>
        <View style={styles.rowWrap}>
          <PlayfulButton
            emoji={parentSettings.audioEnabled ? '🔊' : '🔇'}
            label={
              parentSettings.audioEnabled
                ? 'Master Sound: ON'
                : 'Master Sound: MUTED'
            }
            color={
              parentSettings.audioEnabled ? COLORS.mintGreen : COLORS.textSecondary
            }
            minHeight={54}
            onPress={() =>
              updateSettings({ audioEnabled: !parentSettings.audioEnabled })
            }
          />

          <PlayfulButton
            emoji={parentSettings.narrationEnabled ? '🗣️' : '🤫'}
            label={
              parentSettings.narrationEnabled
                ? 'Voice Narration: ON'
                : 'Voice Narration: OFF'
            }
            color={
              parentSettings.narrationEnabled ? COLORS.skyBlue : COLORS.textSecondary
            }
            minHeight={54}
            onPress={() =>
              updateSettings({ narrationEnabled: !parentSettings.narrationEnabled })
            }
          />
        </View>

        <View style={styles.voiceHealthBox}>
          <Text style={styles.voiceHealthTitle}>
            Offline TTS Voice Status:
          </Text>
          <Text style={styles.voiceHealthLine}>
            • English Voice (`en-US`):{' '}
            <Text
              style={{
                fontWeight: '900',
                color: voiceHealth.enAvailable
                  ? COLORS.mintGreenDark
                  : COLORS.coralOrangeDark,
              }}
            >
              {voiceHealth.enAvailable ? 'Installed ✓' : 'Missing ⚠️'}
            </Text>{' '}
            • Arabic Voice (`ar`):{' '}
            <Text
              style={{
                fontWeight: '900',
                color: voiceHealth.arAvailable
                  ? COLORS.mintGreenDark
                  : COLORS.coralOrangeDark,
              }}
            >
              {voiceHealth.arAvailable ? 'Installed ✓' : 'Missing ⚠️'}
            </Text>
          </Text>

          {(!voiceHealth.enAvailable || !voiceHealth.arAvailable) ? (
            <Text style={styles.voiceWarningText}>
              ⚠️ Warning: One or more offline TTS voices are not reported on this
              device. On Android, open Settings → Accessibility → Text-to-speech
              output → Install voice data (English & Arabic) so spoken instructions
              work 100% offline.
            </Text>
          ) : null}

          <View style={styles.rowWrap}>
            <PlayfulButton
              emoji="🇬🇧"
              label="Test English Voice"
              color={COLORS.skyBlue}
              variant="outline"
              minHeight={48}
              onPress={() => handleTestVoice('en')}
            />
            <PlayfulButton
              emoji="🕌"
              label="Test Arabic Voice"
              color={COLORS.mintGreenDark}
              variant="outline"
              minHeight={48}
              onPress={() => handleTestVoice('ar')}
            />
          </View>
        </View>
      </View>

      {/* Daily Practice Goal (Drives Today's Adventure + Friendly Break Suggestion) */}
      <View style={[styles.settingsCard, SHADOWS.card]}>
        <Text style={styles.cardTitle}>
          🎯 Daily Practice Goal ({parentSettings.dailyGoalLetters} letters /{' '}
          {parentSettings.dailyGoalMinutes} mins break prompt)
        </Text>
        <Text style={styles.cardDesc}>
          Controls the number of letters in Today’s Adventure and when the friendly
          non-blocking rest suggestion appears.
        </Text>
        <View style={styles.rowWrap}>
          {[2, 3, 5].map((goalCount) => (
            <PlayfulButton
              key={goalCount}
              label={`${goalCount} Letters / ${goalCount * 3}m`}
              color={COLORS.skyBlue}
              variant={
                parentSettings.dailyGoalLetters === goalCount ? 'solid' : 'outline'
              }
              minHeight={50}
              onPress={() =>
                updateSettings({
                  dailyGoalLetters: goalCount,
                  dailyGoalMinutes: goalCount * 3,
                })
              }
            />
          ))}
        </View>
      </View>

      {/* Change Parent PIN */}
      <View style={[styles.settingsCard, SHADOWS.card]}>
        <Text style={styles.cardTitle}>🔐 Change 4-Digit Parent PIN</Text>
        <Text style={styles.cardDesc}>
          Your PIN is hashed with SHA-256 locally and never stored in plain text.
        </Text>
        <View style={styles.rowWrap}>
          <TextInput
            value={newPin}
            onChangeText={setNewPin}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            placeholder="New 4-digit PIN"
            style={styles.pinInput}
          />
          <PlayfulButton
            label="Update PIN"
            color={COLORS.lavenderPurple}
            minHeight={50}
            onPress={handleSavePin}
          />
        </View>
      </View>

      {/* Destructive Local Data Reset with Explicit Two-Step Confirmation */}
      <View style={[styles.settingsCard, SHADOWS.card, styles.dangerCard]}>
        <Text style={[styles.cardTitle, { color: COLORS.coralOrangeDark }]}>
          ⚠️ Reset Local Progress Data
        </Text>
        <Text style={styles.cardDesc}>
          Resetting clears stars, badges, and letter scores on this device. Explicit
          confirmation is required.
        </Text>

        <View style={styles.rowWrap}>
          {childrenProfiles.map((c) => (
            <PlayfulButton
              key={c.id}
              label={`Reset ${c.name}'s Progress`}
              color={COLORS.coralOrange}
              variant="outline"
              minHeight={50}
              onPress={() => setConfirmResetTarget(c.id)}
            />
          ))}
          <PlayfulButton
            label="Reset ALL Profiles"
            color={COLORS.coralOrangeDark}
            variant="outline"
            minHeight={50}
            onPress={() => setConfirmResetTarget('ALL')}
          />
        </View>

        {confirmResetTarget ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmWarningText}>
              Are you sure you want to permanently clear progress for{' '}
              {confirmResetTarget === 'ALL'
                ? 'ALL child profiles'
                : childrenProfiles.find((c) => c.id === confirmResetTarget)?.name}
              ?
            </Text>
            <View style={styles.rowWrap}>
              <PlayfulButton
                label="Cancel"
                color={COLORS.textSecondary}
                variant="outline"
                minHeight={48}
                onPress={() => setConfirmResetTarget(null)}
              />
              <PlayfulButton
                label="Yes, Confirm Reset"
                color={COLORS.coralOrangeDark}
                minHeight={48}
                onPress={async () => {
                  if (confirmResetTarget === 'ALL') {
                    await resetAllData();
                    setStatusMessage('All child progress data has been reset.');
                  } else {
                    await resetChildData(confirmResetTarget);
                    setStatusMessage('Selected child progress has been reset.');
                  }
                  setConfirmResetTarget(null);
                }}
              />
            </View>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statusBanner: {
    backgroundColor: COLORS.skyBlueLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  statusText: {
    color: COLORS.skyBlueDark,
    fontSize: 15,
    fontWeight: '800',
  },
  settingsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  dangerCard: {
    borderWidth: 2,
    borderColor: COLORS.coralOrangeLight,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  voiceHealthBox: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.xs,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    gap: SPACING.xs,
  },
  voiceHealthTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  voiceHealthLine: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  voiceWarningText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.coralOrangeDark,
    lineHeight: 19,
  },
  pinInput: {
    width: 180,
    height: 50,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderCard,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '800',
  },
  confirmBox: {
    backgroundColor: COLORS.surfaceCoral,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  confirmWarningText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.coralOrangeDark,
  },
});
