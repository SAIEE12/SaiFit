import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';
import Button from './Button';

/**
 * LoadingState
 * Props: message, style
 */
export function LoadingState({ message = 'Loading...', style }) {
  return (
    <View style={[styles.center, style]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

/**
 * ErrorState
 * Props: message, onRetry, style
 */
export function ErrorState({ message = 'Something went wrong', onRetry, style }) {
  return (
    <View style={[styles.center, styles.padded, style]}>
      <View style={[styles.iconCircle, styles.dangerCircle]}>
        <Feather name="alert-circle" size={28} color={theme.colors.danger} />
      </View>
      <Text style={styles.titleText}>Error</Text>
      <Text style={styles.descText}>{message}</Text>
      {onRetry && (
        <Button variant="outline" size="sm" onPress={onRetry} style={styles.retryBtn}>
          Try Again
        </Button>
      )}
    </View>
  );
}

/**
 * EmptyState
 * Props: icon, title, description, actionElement, style
 */
export function EmptyState({
  icon = 'coffee',
  title = 'No Data',
  description = 'There is nothing here yet.',
  actionElement,
  style,
}) {
  return (
    <View style={[styles.center, styles.padded, style]}>
      <View style={styles.iconCircle}>
        <Feather name={icon} size={28} color={theme.colors.textSecondary} />
      </View>
      <Text style={styles.titleText}>{title}</Text>
      <Text style={styles.descText}>{description}</Text>
      {actionElement && <View style={styles.actionWrap}>{actionElement}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.huge,
  },
  padded: {
    paddingHorizontal: theme.spacing.xxl,
  },
  loadingText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  dangerCircle: {
    backgroundColor: theme.colors.dangerLight,
  },
  titleText: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  descText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: theme.spacing.sm,
  },
  actionWrap: {
    marginTop: theme.spacing.sm,
  },
});
