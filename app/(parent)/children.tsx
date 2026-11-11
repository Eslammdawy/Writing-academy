import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../src/components/PlayfulUI';
import { useAppState } from '../../src/context/AppStateContext';
import { AVATAR_CATALOG } from '../../src/data/curriculum';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/theme/tokens';
import { AvatarId, LanguageCode } from '../../src/types';

export default function ManageChildrenScreen() {
  const router = useRouter();
  const {
    isParentAuthenticated,
    childrenProfiles,
    updateChild,
    addChild,
  } = useAppState();

  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [newChildName, setNewChildName] = useState('');
  const [newChildAvatar, setNewChildAvatar] = useState<AvatarId>('sunny_lion');
  const [newChildLang, setNewChildLang] = useState<LanguageCode>('en');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isParentAuthenticated) {
      router.replace('/(parent)/pin');
    }
  }, [isParentAuthenticated, router]);

  if (!isParentAuthenticated) return null;

  return (
    <ScreenContainer>
      <TopAdventureHeader
        title="Manage Child Profiles • إدارة ملفات الأطفال"
        subtitle="Edit names, avatars, or add another local child profile"
        onBack={() => router.push('/(parent)/dashboard')}
      />

      {savedNotice ? (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>✓ {savedNotice}</Text>
        </View>
      ) : null}

      <View style={styles.profilesList}>
        {childrenProfiles.map((child) => {
          const currentName = editingNames[child.id] ?? child.name;
          return (
            <View key={child.id} style={[styles.childEditorCard, SHADOWS.card]}>
              <Text style={styles.cardHeader}>Profile: {child.name}</Text>

              <View style={styles.inputRow}>
                <Text style={styles.fieldLabel}>Display Name:</Text>
                <TextInput
                  value={currentName}
                  onChangeText={(txt) =>
                    setEditingNames((prev) => ({ ...prev, [child.id]: txt }))
                  }
                  style={styles.textInput}
                  placeholder="Child Name"
                />
                <PlayfulButton
                  label="Save Name"
                  color={COLORS.skyBlue}
                  minHeight={50}
                  onPress={async () => {
                    await updateChild(
                      child.id,
                      currentName,
                      child.avatar,
                      child.preferredLanguage
                    );
                    setSavedNotice(`Saved ${currentName}'s profile!`);
                  }}
                />
              </View>

              <Text style={styles.fieldLabel}>Avatar Buddy:</Text>
              <View style={styles.avatarsRow}>
                {AVATAR_CATALOG.map((av) => {
                  const selected = av.id === child.avatar;
                  return (
                    <Pressable
                      key={av.id}
                      onPress={() =>
                        updateChild(
                          child.id,
                          currentName,
                          av.id,
                          child.preferredLanguage
                        )
                      }
                      style={[
                        styles.avOption,
                        {
                          backgroundColor: av.bgColor,
                          borderColor: selected ? av.accentColor : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 28 }}>{av.emoji}</Text>
                      <Text style={styles.avOptionName}>{av.nameEn}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* Add Another Local Child Profile */}
      <View style={[styles.childEditorCard, SHADOWS.card, { marginTop: SPACING.lg }]}>
        <Text style={styles.cardHeader}>➕ Add Another Child Profile</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={newChildName}
            onChangeText={setNewChildName}
            placeholder="New child name (e.g. Adam)"
            style={styles.textInput}
          />
          <PlayfulButton
            label={newChildLang === 'en' ? 'Default: EN' : 'Default: AR'}
            color={COLORS.lavenderPurple}
            variant="outline"
            minHeight={50}
            onPress={() => setNewChildLang((l) => (l === 'en' ? 'ar' : 'en'))}
          />
          <PlayfulButton
            emoji="➕"
            label="Add Profile"
            color={COLORS.mintGreen}
            minHeight={50}
            disabled={!newChildName.trim()}
            onPress={async () => {
              const created = await addChild(
                newChildName.trim(),
                newChildAvatar,
                newChildLang
              );
              setNewChildName('');
              setSavedNotice(`Added profile for ${created.name}!`);
            }}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  noticeBanner: {
    backgroundColor: COLORS.mintGreenLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  noticeText: {
    color: COLORS.mintGreenDark,
    fontWeight: '800',
    fontSize: 15,
  },
  profilesList: {
    gap: SPACING.md,
  },
  childEditorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  cardHeader: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  textInput: {
    flex: 1,
    minWidth: 180,
    height: 50,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderCard,
    paddingHorizontal: 14,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  avatarsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  avOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 3,
    alignItems: 'center',
  },
  avOptionName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
});
