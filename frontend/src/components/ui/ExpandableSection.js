import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Card from './Card';
import { theme } from '../../theme';

/**
 * ExpandableSection
 * Props: title, subtitle, icon, expanded, onPress, children, style, iconBgColor
 */
export default function ExpandableSection({
  title,
  subtitle,
  icon,
  expanded,
  onPress,
  children,
  style,
  iconBgColor
}) {
  return (
    <View style={styles.container}>
      <Card style={[styles.headerCard, style]} onPress={onPress}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {icon && (
              <View style={[styles.iconContainer, iconBgColor ? { backgroundColor: iconBgColor } : null]}>
                {icon}
              </View>
            )}
            <View style={icon ? styles.textContainerWithIcon : styles.textContainer}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.textSecondary} />
        </View>
      </Card>
      {expanded && (
        <View style={styles.contentContainer}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  headerCard: {
    marginHorizontal: theme.spacing.xxl,
    padding: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  textContainerWithIcon: {
    flex: 1,
    marginLeft: theme.spacing.md,
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
  contentContainer: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
});
