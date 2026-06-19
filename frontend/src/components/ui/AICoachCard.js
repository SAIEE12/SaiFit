import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Card from './Card';

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
  isError = false,
  style,
}) {
  const { theme } = useTheme();
  const styles = stylesFactory(theme);
  const sparkleOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    let sparkleLoop;
    if (expanded || loading) {
      sparkleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(sparkleOpacity, { toValue: 0.6, duration: 800, useNativeDriver: true })
        ])
      );
      sparkleLoop.start();
    } else {
      sparkleOpacity.setValue(1.0);
    }
    return () => {
      if (sparkleLoop) {
        sparkleLoop.stop();
      }
    };
  }, [expanded, loading]);

  if (loading) {
    return (
      <Card variant="ai" style={[styles.loadingCard, style]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Analyzing fitness progression...</Text>
      </Card>
    );
  }

  // Handle collapsible trigger mode
  if (!expanded && onToggle && !isError) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.minimalTrigger, style]}
        onPress={onToggle}
      >
        <View style={styles.triggerLeft}>
          <Animated.View style={{ opacity: sparkleOpacity }}>
            <Ionicons name="sparkles" size={15} color={theme.colors.primary} />
          </Animated.View>
          <Text style={styles.triggerText}>{title}</Text>
        </View>
        <Feather name="chevron-down" size={16} color={theme.colors.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <Card variant={isError ? "default" : "ai"} style={[styles.aiCard, isError && styles.errorCard, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          {isError ? (
            <View style={[styles.sparkleIcon, { backgroundColor: theme.colors.danger }]}>
              <Feather name="alert-circle" size={14} color="#FFF" />
            </View>
          ) : (
            <Animated.View style={[styles.sparkleIcon, { opacity: sparkleOpacity }]}>
              <Ionicons name="sparkles" size={14} color="#FFF" />
            </Animated.View>
          )}
          <Text style={[styles.titleText, isError && { color: theme.colors.danger }]}>
            {isError ? "AI COACH OFFLINE" : title.toUpperCase()}
          </Text>
        </View>
        {onToggle && !isError && (
          <TouchableOpacity onPress={onToggle} style={styles.collapseBtn}>
            <Feather name="chevron-up" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Score bar */}
      {!isError && scoreLabel && scoreValue && (
        <View style={styles.scoreBar}>
          <Text style={styles.scoreLabel}>{scoreLabel.toUpperCase()}</Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreValue}>{scoreValue}</Text>
          </View>
        </View>
      )}

      {/* Main Narrative / Advice */}
      {narrative && (
        <View style={[styles.narrativeWrap, isError && styles.errorNarrativeWrap]}>
          <Text style={[styles.narrativeText, isError && styles.errorNarrativeText]}>{narrative}</Text>
        </View>
      )}

      {/* Dynamic Segments */}
      {!isError && segments.length > 0 && (
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
      {!isError && milestones.length > 0 && (
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

const stylesFactory = (theme) => StyleSheet.create({
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
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radii.xxl,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryBorder,
    ...theme.shadows.soft,
    marginHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.lg,
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
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryBorder,
    borderWidth: 1.5,
    ...theme.shadows.premium,
  },
  errorCard: {
    backgroundColor: theme.colors.dangerLight,
    borderColor: theme.colors.danger,
    borderWidth: 1.5,
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
    backgroundColor: theme.colors.background,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scoreLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textPrimary,
    letterSpacing: 1,
  },
  scoreBadge: {
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
  },
  scoreValue: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.background, // Adapts nicely in dark/light mode
  },
  narrativeWrap: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryBorder,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    ...theme.shadows.soft,
  },
  narrativeText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    lineHeight: 20,
  },
  errorNarrativeWrap: {
    backgroundColor: theme.colors.dangerLight,
    borderColor: theme.colors.danger,
    borderWidth: 1,
  },
  errorNarrativeText: {
    color: theme.colors.danger,
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
    color: theme.colors.textPrimary,
    lineHeight: 18,
    fontWeight: '600',
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
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  trophyIcon: {
    marginRight: 6,
  },
  milestoneText: {
    ...theme.typography.labelSmall,
    color: theme.colors.textPrimary,
    letterSpacing: 0,
    fontWeight: '700',
  },
  actionsWrap: {
    marginTop: theme.spacing.md,
  },
});
