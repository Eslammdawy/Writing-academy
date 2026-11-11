import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AVATAR_CATALOG } from '../data/curriculum';
import { useTabletLayout } from '../hooks/useTabletLayout';
import { audioService } from '../services/audio/audioService';
import { COLORS, RADIUS, SHADOWS, SPACING, TOUCH_TARGETS } from '../theme/tokens';
import { AvatarId, LanguageCode, MasteryStatus } from '../types';

export const ScreenContainer: React.FC<{
  children: React.ReactNode;
  scroll?: boolean;
  backgroundColor?: string;
  contentStyle?: StyleProp<ViewStyle>;
}> = ({ children, scroll = true, backgroundColor = COLORS.background, contentStyle }) => {
  const { maxContentWidth, horizontalPadding } = useTabletLayout();

  const inner = (
    <View
      style={[
        styles.centeredContent,
        { maxWidth: maxContentWidth, paddingHorizontal: horizontalPadding },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollOuter}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={styles.nonScrollOuter}>{inner}</View>
      )}
    </SafeAreaView>
  );
};

export const PlayfulButton: React.FC<{
  label: string;
  sublabel?: string;
  emoji?: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  variant?: 'solid' | 'outline' | 'soft';
  minHeight?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}> = ({
  label,
  sublabel,
  emoji,
  onPress,
  color = COLORS.skyBlue,
  textColor = COLORS.textOnDark,
  variant = 'solid',
  minHeight = TOUCH_TARGETS.minChildButtonHeight,
  disabled = false,
  style,
  accessibilityLabel,
}) => {
  const bg =
    variant === 'solid'
      ? color
      : variant === 'soft'
        ? `${color}22`
        : COLORS.surface;
  const fg = variant === 'solid' ? textColor : color;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={() => {
        audioService.playSoundEffect('tap');
        onPress();
      }}
      style={({ pressed }) => [
        styles.buttonBase,
        SHADOWS.button,
        {
          minHeight,
          backgroundColor: bg,
          borderColor: color,
          borderWidth: variant === 'outline' ? 2.5 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {emoji ? <Text style={styles.buttonEmoji}>{emoji}</Text> : null}
      <View style={styles.buttonTextCol}>
        <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.buttonSublabel, { color: fg, opacity: 0.9 }]}>{sublabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
};

export const TopAdventureHeader: React.FC<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onHome?: () => void;
  childName?: string;
  childAvatar?: AvatarId;
  starsCount?: number;
  onPressChildBadge?: () => void;
  language?: LanguageCode;
  rightElement?: React.ReactNode;
}> = ({
  title,
  subtitle,
  onBack,
  onHome,
  childName,
  childAvatar,
  starsCount,
  onPressChildBadge,
  language = 'en',
  rightElement,
}) => {
  const avatarDef = AVATAR_CATALOG.find((a) => a.id === childAvatar) ?? AVATAR_CATALOG[0];
  const isRtl = language === 'ar';

  return (
    <View style={[styles.headerRow, isRtl && styles.headerRowRtl]}>
      <View style={styles.headerLeftGroup}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go Back"
            onPress={() => {
              audioService.playSoundEffect('tap');
              onBack();
            }}
            style={styles.navIconBtn}
          >
            <Text style={styles.navIconEmoji}>{isRtl ? '➡️' : '⬅️'}</Text>
            <Text style={styles.navIconText}>{isRtl ? 'رجوع' : 'Back'}</Text>
          </Pressable>
        ) : null}

        {onHome ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Home"
            onPress={() => {
              audioService.playSoundEffect('tap');
              onHome();
            }}
            style={[styles.navIconBtn, { backgroundColor: COLORS.sunshineYellowLight }]}
          >
            <Text style={styles.navIconEmoji}>🏠</Text>
            <Text style={styles.navIconText}>{isRtl ? 'الرئيسية' : 'Home'}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.headerTitleBox}>
        <Text style={[styles.headerTitle, isRtl && styles.rtlText]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, isRtl && styles.rtlText]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.headerRightGroup}>
        {typeof starsCount === 'number' ? (
          <View style={styles.starPill}>
            <Text style={styles.starEmoji}>⭐</Text>
            <Text style={styles.starCountText}>{starsCount}</Text>
          </View>
        ) : null}

        {childName ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Active explorer ${childName}`}
            onPress={onPressChildBadge}
            style={[styles.childBadge, { backgroundColor: avatarDef.bgColor }]}
          >
            <Text style={styles.childBadgeEmoji}>{avatarDef.emoji}</Text>
            <Text style={styles.childBadgeName}>{childName}</Text>
          </Pressable>
        ) : null}

        {rightElement}
      </View>
    </View>
  );
};

export const MasteryBadgePill: React.FC<{
  status: MasteryStatus;
  language?: LanguageCode;
}> = ({ status, language = 'en' }) => {
  const isAr = language === 'ar';
  const meta: Record<
    MasteryStatus,
    { labelEn: string; labelAr: string; icon: string; bg: string; fg: string }
  > = {
    new: {
      labelEn: 'New',
      labelAr: 'جديد',
      icon: '🌱',
      bg: '#F1F5F9',
      fg: '#475569',
    },
    learning: {
      labelEn: 'Learning',
      labelAr: 'يتعلم',
      icon: '🌟',
      bg: COLORS.skyBlueLight,
      fg: COLORS.skyBlueDark,
    },
    practicing: {
      labelEn: 'Practicing',
      labelAr: 'يتدرب',
      icon: '🎨',
      bg: COLORS.sunshineYellowLight,
      fg: COLORS.sunshineYellowDark,
    },
    mastered: {
      labelEn: 'Mastered',
      labelAr: 'مُتقَن',
      icon: '👑',
      bg: COLORS.mintGreenLight,
      fg: COLORS.mintGreenDark,
    },
  };

  const item = meta[status];
  return (
    <View style={[styles.masteryPill, { backgroundColor: item.bg }]}>
      <Text style={styles.masteryIcon}>{item.icon}</Text>
      <Text style={[styles.masteryText, { color: item.fg }]}>
        {isAr ? item.labelAr : item.labelEn}
      </Text>
    </View>
  );
};

export const MascotBanner: React.FC<{
  mascotEmoji?: string;
  title: string;
  message: string;
  color?: string;
  isRtl?: boolean;
  onAudioReplay?: () => void;
}> = ({
  mascotEmoji = '🦊🦉',
  title,
  message,
  color = COLORS.surfaceWarm,
  isRtl = false,
  onAudioReplay,
}) => {
  return (
    <View
      style={[
        styles.mascotBanner,
        SHADOWS.card,
        { backgroundColor: color },
        isRtl && styles.headerRowRtl,
      ]}
    >
      <View style={styles.mascotAvatarBubble}>
        <Text style={styles.mascotEmojiText}>{mascotEmoji}</Text>
      </View>
      <View style={[styles.mascotTextWrap, isRtl && { alignItems: 'flex-end' }]}>
        <Text style={[styles.mascotTitle, isRtl && styles.rtlText]}>{title}</Text>
        <Text style={[styles.mascotMessage, isRtl && styles.rtlText]}>{message}</Text>
      </View>
      {onAudioReplay ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Listen to instruction"
          onPress={onAudioReplay}
          style={styles.speakerCircleBtn}
        >
          <Text style={{ fontSize: 24 }}>🔊</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollOuter: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  nonScrollOuter: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  centeredContent: {
    width: '100%',
    flex: 1,
  },
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  buttonEmoji: {
    fontSize: 26,
  },
  buttonTextCol: {
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Nunito-Regular',
  },
  buttonSublabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  headerRowRtl: {
    flexDirection: 'row-reverse',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  navIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    height: 58,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    gap: 6,
  },
  navIconEmoji: {
    fontSize: 20,
  },
  navIconText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.sunshineYellowLight,
    paddingHorizontal: SPACING.md,
    height: 54,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: COLORS.sunshineYellow,
    gap: 6,
  },
  starEmoji: {
    fontSize: 22,
  },
  starCountText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.sunshineYellowDark,
  },
  childBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 54,
    borderRadius: RADIUS.pill,
    gap: 8,
  },
  childBadgeEmoji: {
    fontSize: 24,
  },
  childBadgeName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  masteryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    gap: 4,
  },
  masteryIcon: {
    fontSize: 14,
  },
  masteryText: {
    fontSize: 13,
    fontWeight: '800',
  },
  mascotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: '#FDE68A',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  mascotAvatarBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotEmojiText: {
    fontSize: 28,
  },
  mascotTextWrap: {
    flex: 1,
  },
  mascotTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  mascotMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  speakerCircleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.skyBlueLight,
  },
});
