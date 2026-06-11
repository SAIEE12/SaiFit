import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { theme } from '../../theme';

/**
 * TextField
 * Props: label, error, helperText, icon, containerStyle, inputStyle, ...textInputProps
 */
export default function TextField({
  label,
  error,
  helperText,
  icon,
  containerStyle,
  inputStyle,
  ...props
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label.toUpperCase()}</Text>}
      
      <View style={[
        styles.inputWrapper, 
        error ? styles.inputWrapperError : null,
        props.editable === false ? styles.inputWrapperDisabled : null
      ]}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={theme.colors.textTertiary}
          {...props}
        />
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    paddingHorizontal: theme.spacing.lg,
    height: 56,
    ...theme.shadows.soft,
  },
  inputWrapperError: {
    borderColor: theme.colors.danger,
  },
  inputWrapperDisabled: {
    backgroundColor: theme.colors.border,
    borderColor: theme.colors.border,
  },
  iconWrap: {
    marginRight: theme.spacing.md,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    height: '100%',
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
    marginLeft: 4,
    fontWeight: '700',
  },
  helperText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginLeft: 4,
  },
});
