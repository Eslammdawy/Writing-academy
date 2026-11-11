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

export default function ParentDashboardScreen() {
  const router = useRouter();
  const { isLandscape } = useTabletLayout();
  const {
    isParentAuthenticated,
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

    const needsRevision = ALL_LETTERS.filter((l) => {
      const p = summary.progress[l.id];
      return (
        p &&
        p.attempts > 0 &&
        p.masteryStatus !== 'mastered' &&
        (p.tracingScore < 68 || p.independentWritingScore < 62)
      );
    }).slice(0, 8);

    const totalSeconds = summary.sessions.reduce(
      (acc, s) => acc + s.durationSeconds,
      0
    );
    const totalMinutes = Math.max(
      totalSeconds > 0 ? 1 : 0,
      Math.round(totalSeconds / 60)
    );

    return {
      introducedCount: introduced.length,
      practicingCount: practicing.length,
      masteredCount: mastered.length,
      enIntroduced,
      arIntroduced,
      avgRecognition,
      avgTracing,
      avgWriting,
      needsRevision,
      totalMinutes,
      sessionsCount: summary.sessions.length,
    };
  }, [summary]);

  if (!isParentAuthenticated) {
    return null;
  }

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

          {/* Weekly Summary & Letters Needing Revision */}
          <View style={[styles.detailsRow, isLandscape && styles.kpiGridLandscape]}>
            <View style={[styles.detailCard, SHADOWS.card]}>
              <Text style={styles.sectionTitle}>
                📌 Weekly Summary (Generated Locally)
              </Text>
              <Text style={styles.weeklyText}>
                • {summary.child.name} has practiced {metrics.introducedCount} letters
                ({metrics.enIntroduced} English, {metrics.arIntroduced} Arabic) and
                collected {summary.achievements.length} sticker badges.
              </Text>
              <Text style={styles.weeklyText}>
                • Tracing accuracy averages {metrics.avgTracing}%, and freehand writing
                averages {metrics.avgWriting}%.
              </Text>
              <Text style={styles.weeklyText}>
                • Note: Scores are deterministic geometric guidance metrics for 5–6 year
                olds, not clinical assessments.
              </Text>
            </View>

            <View style={[styles.detailCard, SHADOWS.card]}>
              <Text style={styles.sectionTitle}>
                🔍 Letters Recommended for Revision
              </Text>
              {metrics.needsRevision.length === 0 ? (
                <Text style={styles.weeklyText}>
                  No letters flagged for extra revision yet! Encourage{' '}
                  {summary.child.name} to explore new letters in the Alphabet Explorer.
                </Text>
              ) : (
                <View style={styles.revisionPillsWrap}>
                  {metrics.needsRevision.map((l) => (
                    <View key={l.id} style={styles.revisionPill}>
                      <Text style={styles.revisionPillChar}>{l.character}</Text>
                      <Text style={styles.revisionPillName}>{l.example.word}</Text>
                    </View>
                  ))}
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
    gap: 6,
  },
  revisionPillChar: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.coralOrangeDark,
  },
  revisionPillName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
