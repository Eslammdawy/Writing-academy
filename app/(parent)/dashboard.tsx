import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  PlayfulButton,
  ScreenContainer,
  TopAdventureHeader,
} from '../../src/components/PlayfulUI';
import {
  ChildAnalyticsSummary,
  useAppState,
} from '../../src/context/AppStateContext';
import {
  ALL_LETTERS,
  ARABIC_LETTERS,
  AVATAR_CATALOG,
  ENGLISH_LETTERS,
} from '../../src/data/curriculum';
import { useTabletLayout } from '../../src/hooks/useTabletLayout';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/theme/tokens';
import { getLocalDateString } from '../../src/utils/dateUtils';
import { DEFAULT_PARENT_PIN_HASH } from '../../src/utils/pinSecurity';

export default function ParentDashboardScreen() {
  const router = useRouter();
  const { isLandscape } = useTabletLayout();
  const {
    isParentAuthenticated,
    parentSettings,
    childrenProfiles,
    getChildSummaryForParent,
    lockParentArea,
  } = useAppState();

  const [selectedChildId, setSelectedChildId] = useState<string>(
    childrenProfiles[0]?.id ?? 'child_soufy'
  );
  const [summary, setSummary] = useState<ChildAnalyticsSummary | null>(null);

  useEffect(() => {
    if (!isParentAuthenticated) {
      router.replace('/(parent)/pin');
      return;
    }
    (async () => {
      const data = await getChildSummaryForParent(selectedChildId);
      setSummary(data);
    })();
  }, [isParentAuthenticated, selectedChildId, getChildSummaryForParent, router]);

  const metrics = useMemo(() => {
    if (!summary) return null;
    const records = Object.values(summary.progress);
    const introduced = records.filter((r) => r.attempts > 0);
    const practicing = records.filter((r) => r.masteryStatus === 'practicing');
    const mastered = records.filter((r) => r.masteryStatus === 'mastered');

    const enIntroduced = ENGLISH_LETTERS.filter(
      (l) => (summary.progress[l.id]?.attempts ?? 0) > 0
    ).length;
    const arIntroduced = ARABIC_LETTERS.filter(
      (l) => (summary.progress[l.id]?.attempts ?? 0) > 0
    ).length;

    const avg = (nums: number[]) =>
      nums.length === 0
        ? 0
        : Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);

    const avgRecognition = avg(
      introduced.map((r) => r.recognitionScore).filter((s) => s > 0)
    );
    const avgTracing = avg(
      introduced.map((r) => r.tracingScore).filter((s) => s > 0)
    );
    const avgWriting = avg(
      introduced.map((r) => r.independentWritingScore).filter((s) => s > 0)
    );

    // WP8 "Needs Help" list: letters flagged by fail-soft ladder (`needsHelp`) or low scores
    const needsHelpLetters = ALL_LETTERS.filter((l) => {
      const p = summary.progress[l.id];
      if (!p || p.attempts === 0) return false;
      return (
        Boolean(p.needsHelp) ||
        (p.masteryStatus !== 'mastered' &&
          (p.tracingScore < 68 || p.independentWritingScore < 62))
      );
    }).slice(0, 10);

    const totalSeconds = summary.sessions.reduce(
      (acc, s) => acc + s.durationSeconds,
      0
    );
    const totalMinutes = Math.max(
      totalSeconds > 0 ? 1 : 0,
      Math.round(totalSeconds / 60)
    );

    const lastSession = summary.sessions[0] ?? null;

    return {
      introducedCount: introduced.length,
      practicingCount: practicing.length,
      masteredCount: mastered.length,
      enIntroduced,
      arIntroduced,
      avgRecognition,
      avgTracing,
      avgWriting,
      needsHelpLetters,
      totalMinutes,
      sessionsCount: summary.sessions.length,
      lastSession,
    };
  }, [summary]);

  if (!isParentAuthenticated) {
    return null;
  }

  const isUsingDefaultPin = parentSettings.pinHash === DEFAULT_PARENT_PIN_HASH;

  return (
    <ScreenContainer>
      <TopAdventureHeader
        title="Parent Dashboard • لوحة متابعة الوالدين"
        subtitle="100% Local & Private Progress Insights (stored only on this tablet)"
        onBack={() => {
          lockParentArea();
          router.replace('/');
        }}
      />

      {/* Default PIN Warning Banner (WP7) */}
      {isUsingDefaultPin ? (
        <View style={styles.defaultPinBanner}>
          <Text style={styles.defaultPinBannerText}>
            ⚠️ Security Notice: You are still using the default PIN — please change it
            in Settings so children cannot guess it.
          </Text>
          <PlayfulButton
            label="Change PIN"
            color={COLORS.coralOrangeDark}
            minHeight={44}
            onPress={() => router.push('/(parent)/settings')}
          />
        </View>
      ) : null}

      {/* Top Navigation Bar for Parent Sections */}
      <View style={styles.parentNavRow}>
        <PlayfulButton
          emoji="📊"
          label="Progress Reports"
          color={COLORS.skyBlue}
          minHeight={54}
          onPress={() => {}}
        />
        <PlayfulButton
          emoji="👧👦"
          label="Manage Children"
          color={COLORS.lavenderPurple}
          variant="outline"
          minHeight={54}
          onPress={() => router.push('/(parent)/children')}
        />
        <PlayfulButton
          emoji="⚙️"
          label="Settings & Reset"
          color={COLORS.mintGreenDark}
          variant="outline"
          minHeight={54}
          onPress={() => router.push('/(parent)/settings')}
        />
        <PlayfulButton
          emoji="🔓"
          label="Exit Parent Area"
          color={COLORS.coralOrange}
          variant="soft"
          minHeight={54}
          onPress={() => {
            lockParentArea();
            router.replace('/(child)/home');
          }}
        />
      </View>

      {/* Child Selector Tabs */}
      <View style={styles.childTabsRow}>
        {childrenProfiles.map((c) => {
          const active = c.id === selectedChildId;
          const av = AVATAR_CATALOG.find((a) => a.id === c.avatar) ?? AVATAR_CATALOG[0];
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              onPress={() => setSelectedChildId(c.id)}
              style={[
                styles.childTabCard,
                active && {
                  backgroundColor: COLORS.skyBlueLight,
                  borderColor: COLORS.skyBlue,
                },
              ]}
            >
              <Text style={{ fontSize: 28 }}>{av.emoji}</Text>
              <View>
                <Text style={styles.childTabName}>{c.name}</Text>
                <Text style={styles.childTabStars}>⭐ {c.starsCount} Stars</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {metrics && summary ? (
        <>
          {/* KPI Summary Cards */}
          <View style={[styles.kpiGrid, isLandscape && styles.kpiGridLandscape]}>
            <View style={[styles.kpiCard, SHADOWS.card]}>
              <Text style={styles.kpiLabel}>Letters Introduced</Text>
              <Text style={styles.kpiValue}>{metrics.introducedCount} / 54</Text>
              <Text style={styles.kpiSub}>
                EN: {metrics.enIntroduced}/26 • AR: {metrics.arIntroduced}/28
              </Text>
            </View>

            <View style={[styles.kpiCard, SHADOWS.card]}>
              <Text style={styles.kpiLabel}>Practicing & Mastered</Text>
              <Text style={[styles.kpiValue, { color: COLORS.mintGreenDark }]}>
                {metrics.masteredCount} Mastered
              </Text>
              <Text style={styles.kpiSub}>
                {metrics.practicingCount} currently in active practice
              </Text>
            </View>

            <View style={[styles.kpiCard, SHADOWS.card]}>
              <Text style={styles.kpiLabel}>Skill Trend Averages</Text>
              <Text style={styles.kpiSub}>
                Recognition: {metrics.avgRecognition}% • Tracing: {metrics.avgTracing}%
              </Text>
              <Text style={styles.kpiSub}>
                Independent Writing: {metrics.avgWriting}%
              </Text>
            </View>

            <View style={[styles.kpiCard, SHADOWS.card]}>
              <Text style={styles.kpiLabel}>Practice Time & Sessions</Text>
              <Text style={[styles.kpiValue, { color: COLORS.skyBlueDark }]}>
                {metrics.totalMinutes} mins
              </Text>
              <Text style={styles.kpiSub}>
                Across {metrics.sessionsCount} completed sessions
              </Text>
            </View>
          </View>

          {/* Last Session Summary & Needs Help List (WP8) */}
          <View style={[styles.detailsRow, isLandscape && styles.kpiGridLandscape]}>
            <View style={[styles.detailCard, SHADOWS.card]}>
              <Text style={styles.sectionTitle}>
                🕒 Last Session & Weekly Summary
              </Text>
              {metrics.lastSession ? (
                <View style={styles.lastSessionBox}>
                  <Text style={styles.lastSessionHeadline}>
                    Last Session ({getLocalDateString(new Date(metrics.lastSession.sessionDate))}):
                  </Text>
                  <Text style={styles.lastSessionMeta}>
                    Language:{' '}
                    {metrics.lastSession.language === 'ar'
                      ? 'Arabic (العربية)'
                      : 'English'}{' '}
                    • Duration: {metrics.lastSession.durationSeconds}s • Score:{' '}
                    {metrics.lastSession.score}%
                  </Text>
                </View>
              ) : (
                <Text style={styles.weeklyText}>
                  • No practice sessions recorded yet for {summary.child.name}.
                </Text>
              )}

              <Text style={styles.weeklyText}>
                • {summary.child.name} has practiced {metrics.introducedCount} letters
                ({metrics.enIntroduced} English, {metrics.arIntroduced} Arabic) and
                collected {summary.achievements.length} sticker badges.
              </Text>
              <Text style={styles.weeklyText}>
                • Tracing accuracy averages {metrics.avgTracing}%, and freehand writing
                averages {metrics.avgWriting}%.
              </Text>
            </View>

            <View style={[styles.detailCard, SHADOWS.card]}>
              <Text style={styles.sectionTitle}>
                🆘 Needs Help & Recommended for Revision
              </Text>
              {metrics.needsHelpLetters.length === 0 ? (
                <Text style={styles.weeklyText}>
                  No letters flagged for extra help yet! Encourage {summary.child.name}{' '}
                  to continue Today’s Adventure.
                </Text>
              ) : (
                <View style={styles.revisionPillsWrap}>
                  {metrics.needsHelpLetters.map((l) => {
                    const p = summary.progress[l.id];
                    const flagged = Boolean(p?.needsHelp);
                    return (
                      <View
                        key={l.id}
                        style={[
                          styles.revisionPill,
                          flagged && styles.revisionPillUrgent,
                        ]}
                      >
                        <Text style={styles.revisionPillChar}>{l.character}</Text>
                        <View>
                          <Text style={styles.revisionPillName}>
                            {l.example.word} {flagged ? '• Needs Help' : ''}
                          </Text>
                          <Text style={styles.revisionPillScore}>
                            Trace {p?.tracingScore ?? 0}% • Write{' '}
                            {p?.independentWritingScore ?? 0}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  defaultPinBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceCoral,
    borderWidth: 2,
    borderColor: COLORS.coralOrange,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  defaultPinBannerText: {
    flex: 1,
    minWidth: 240,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.coralOrangeDark,
  },
  parentNavRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  childTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  childTabCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 2.5,
    borderColor: COLORS.borderLight,
    gap: 10,
  },
  childTabName: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  childTabStars: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  kpiGrid: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  kpiGridLandscape: {
    flexDirection: 'row',
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  kpiLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  kpiValue: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  detailsRow: {
    gap: SPACING.md,
  },
  detailCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  lastSessionBox: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 4,
  },
  lastSessionHeadline: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.skyBlueDark,
  },
  lastSessionMeta: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  weeklyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  revisionPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  revisionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCoral,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.coralOrangeLight,
  },
  revisionPillUrgent: {
    borderColor: COLORS.coralOrangeDark,
    borderWidth: 2.5,
  },
  revisionPillChar: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.coralOrangeDark,
    fontFamily: 'NotoSansArabic-Regular',
  },
  revisionPillName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  revisionPillScore: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
