import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';

/**
 * ListItem
 * Props: title, subtitle, info, icon, rightIcon, onPress, disabled, style
 */
export default function ListItem({
  title,
  subtitle,
  info,
  icon,
  rightIcon,
  onPress,
  disabled = false,
  style,
}) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.container, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      {icon && <View style={styles.iconWrap}>{icon}</View>}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {info && (
        <View style={styles.infoWrap}>
          <Text style={styles.infoText}>{info}</Text>
        </View>
      )}

      {rightIcon && <View style={styles.rightIconWrap}>{rightIcon}</View>}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.xxl,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.h5,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  infoWrap: {
    marginHorizontal: theme.spacing.sm,
  },
  infoText: {
    ...theme.typography.captionStrong,
    color: theme.colors.primary,
  },
  rightIconWrap: {
    marginLeft: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
