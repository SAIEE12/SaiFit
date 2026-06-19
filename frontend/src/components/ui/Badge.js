import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function Badge({
  label,
  variant = 'primary',
  style,
  textStyle,
}) {
  const { theme } = useTheme();
  const styles = stylesFactory(theme);

  return (
    <View style={[styles.badge, styles[`variant_${variant}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>
        {label}
      </Text>
    </View>
  );
}

const stylesFactory = (theme) => StyleSheet.create({
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
