import React from 'react';
import { View, Text, Switch, StyleSheet, Platform } from 'react-native';
import { theme } from '../../theme';

/**
 * SettingsToggle
 * Props: value (boolean), onValueChange (function), label (string), description (string), style
 */
export default function SettingsToggle({
  value,
  onValueChange,
  label,
  description,
  style
}) {
  return (
    <View style={[styles.container, style]}>
      {(label || description) && (
        <View style={styles.textContainer}>
          {label && <Text style={styles.label}>{label}</Text>}
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
      )}
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
        thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
        ios_backgroundColor="#D1D1D6"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
    paddingRight: theme.spacing.lg,
  },
  label: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  description: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
