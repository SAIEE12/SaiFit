import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import Card from './Card';

/**
 * AICoachCard — Reusable, context-aware AI Coach Card
 */
export default function AICoachCard({
  title = "AI COACH INSIGHT",
  scoreLabel,
  scoreValue,
  narrative,
  segments = [],
  milestones = [],
  actions,
  expanded = false,
  onToggle,
  loading = false,
  style,
}) {
  if (loading) {
    return (
      <Card variant="ai" style={[styles.loadingCard, style]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Analyzing fitness progression...</Text>
      </Card>
    );
  }

  // Handle collapsible trigger mode
  if (!expanded && onToggle) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.minimalTrigger, style]}
        onPress={onToggle}
      >
        <View style={styles.triggerLeft}>
          <Ionicons name="sparkles" size={15} color={theme.colors.primary} />
          <Text style={styles.triggerText}>{title}</Text>
        </View>
        <Feather name="chevron-down" size={16} color={theme.colors.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <Card variant="ai" style={[styles.aiCard, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <View style={styles.sparkleIcon}>
            <Ionicons name="sparkles" size={14} color="#FFF" />
          </View>
          <Text style={styles.titleText}>{title.toUpperCase()}</Text>
        </View>
        {onToggle && (
          <TouchableOpacity onPress={onToggle} style={styles.collapseBtn}>
            <Feather name="chevron-up" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Score bar */}
      {scoreLabel && scoreValue && (
        <View style={styles.scoreBar}>
          <Text style={styles.scoreLabel}>{scoreLabel.toUpperCase()}</Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreValue}>{scoreValue}</Text>
          </View>
        </View>
      )}

      {/* Main Narrative / Advice */}
      {narrative && (
        <View style={styles.narrativeWrap}>
          <Text style={styles.narrativeText}>{narrative}</Text>
        </View>
      )}

      {/* Dynamic Segments */}
      {segments.length > 0 && (
        <View style={styles.segmentsWrap}>
          {segments.map((seg, idx) => (
            <View key={idx} style={styles.segmentCard}>
              <View style={styles.segmentHeader}>
                {seg.icon && (
                  <Feather
                    name={seg.icon}
                    size={14}
                    color={seg.color || theme.colors.primary}
                    style={styles.segmentIcon}
                  />
                )}
                <Text style={styles.segmentTitle}>{seg.title}</Text>
              </View>
              <Text style={styles.segmentText}>{seg.text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Milestones list */}
      {milestones.length > 0 && (
        <View style={styles.milestonesWrap}>
          <Text style={styles.sectionHeading}>JOURNEY MILESTONES</Text>
          <View style={styles.milestoneGrid}>
            {milestones.map((mil, idx) => (
              <View key={idx} style={styles.milestonePill}>
                <Ionicons
                  name="trophy-outline"
                  size={12}
                  color={theme.colors.primary}
                  style={styles.trophyIcon}
                />
                <Text style={styles.milestoneText}>{mil}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Action buttons (view plan, generate suggestions, etc.) */}
      {actions && <View style={styles.actionsWrap}>{actions}</View>}
    </Card>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  minimalTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xxl,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.12)',
    ...theme.shadows.soft,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  triggerText: {
    ...theme.typography.bodySmall,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  aiCard: {
    marginHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sparkleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    ...theme.typography.labelSmall,
    color: theme.colors.primary,
    letterSpacing: 1.5,
  },
  collapseBtn: {
    padding: theme.spacing.xs,
  },
  scoreBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.08)',
  },
  scoreLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  scoreBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
  },
  scoreValue: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
  },
  narrativeWrap: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.1)',
    marginBottom: theme.spacing.md,
  },
  narrativeText: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '600',
    lineHeight: 20,
  },
  segmentsWrap: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  segmentCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  segmentIcon: {
    marginRight: theme.spacing.sm,
  },
  segmentTitle: {
    ...theme.typography.captionStrong,
    color: theme.colors.textPrimary,
  },
  segmentText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    fontWeight: '500',
  },
  milestonesWrap: {
    marginTop: theme.spacing.sm,
  },
  sectionHeading: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: theme.spacing.sm,
  },
  milestoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  milestonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
  },
  trophyIcon: {
    marginRight: 6,
  },
  milestoneText: {
    ...theme.typography.labelSmall,
    color: theme.colors.primary,
    letterSpacing: 0,
    fontWeight: '700',
  },
  actionsWrap: {
    marginTop: theme.spacing.md,
  },
});
