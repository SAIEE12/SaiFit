import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

/**
 * Badge / Tag
 * Props: label, variant ('primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'), style, textStyle
 */
export default function Badge({
  label,
  variant = 'primary',
  style,
  textStyle,
}) {
  return (
    <View style={[styles.badge, styles[`variant_${variant}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    alignSelf: 'flex-start',
  },
  text: {
    ...theme.typography.labelSmall,
    fontWeight: '900',
  },

  // ── Variant Styles
  variant_primary: {
    backgroundColor: theme.colors.primaryLight,
  },
  text_primary: {
    color: theme.colors.primary,
  },

  variant_secondary: {
    backgroundColor: theme.colors.border,
  },
  text_secondary: {
    color: theme.colors.textSecondary,
  },

  variant_success: {
    backgroundColor: theme.colors.successLight,
  },
  text_success: {
    color: theme.colors.success,
  },

  variant_warning: {
    backgroundColor: theme.colors.warningLight,
  },
  text_warning: {
    color: theme.colors.warning,
  },

  variant_danger: {
    backgroundColor: theme.colors.dangerLight,
  },
  text_danger: {
    color: theme.colors.danger,
  },

  variant_info: {
    backgroundColor: theme.colors.infoLight,
  },
  text_info: {
    color: theme.colors.info,
  },
});
