import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';

/**
 * Card — base surface container
 * Props: children, style, variant ('default' | 'elevated' | 'ai')
 *        padding (override inner padding), noPadding, onPress
 */
export default function Card({
  children,
  style,
  variant = 'default',
  noPadding = false,
  onPress,
  ...props
}) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : undefined}
      style={[
        styles.base,
        styles[`variant_${variant}`],
        noPadding && styles.noPadding,
        style,
      ]}
      {...props}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xxl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  noPadding: {
    padding: 0,
  },

  variant_default: {},

  variant_elevated: {
    ...theme.shadows.card,
  },

  // AI coach / insight cards get a subtle primary-tinted border
  variant_ai: {
    borderColor: theme.colors.primaryBorder,
    ...theme.shadows.premium,
  },
});
