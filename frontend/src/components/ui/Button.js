import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  onPress,
  children,
  style,
  textStyle,
}) {
  const { theme } = useTheme();
  const styles = stylesFactory(theme);

  const containerStyle = [
    styles.base,
    styles[`size_${size}`],
    styles[`variant_${variant}`],
    (disabled || loading) && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    styles[`label_${variant}`],
    styles[`labelSize_${size}`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : '#FFF'}
          size="small"
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={labelStyle}>{children}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const stylesFactory = (theme) => StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radii.lg,
  },

  // ── Sizes
  size_md: { height: 48, paddingHorizontal: theme.spacing.xl },
  size_lg: { height: 56, paddingHorizontal: theme.spacing.xxl },
  size_sm: { height: 38, paddingHorizontal: theme.spacing.lg },

  // ── Variants
  variant_primary: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.primaryGlow,
  },
  variant_secondary: {
    backgroundColor: theme.colors.darkBase,
    ...theme.shadows.soft,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  variant_ghost: {
    backgroundColor: theme.colors.primaryLight,
  },
  variant_danger: {
    backgroundColor: theme.colors.danger,
    ...theme.shadows.soft,
  },
  variant_muted: {
    backgroundColor: theme.colors.border,
  },

  disabled: { opacity: 0.55 },

  // ── Labels
  label: {
    fontWeight: '800',
  },
  label_primary: { color: '#FFF' },
  label_secondary: { color: theme.colors.background }, // In dark mode, darkBase is white, so text should be dark!
  label_outline: { color: theme.colors.primary },
  label_ghost: { color: theme.colors.primary },
  label_danger: { color: '#FFF' },
  label_muted: { color: theme.colors.textSecondary },

  labelSize_sm: { fontSize: 13 },
  labelSize_md: { fontSize: 15 },
  labelSize_lg: { fontSize: 16 },
});
