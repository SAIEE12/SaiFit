import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export function Header({ title, subtitle, rightElement, style }) {
  const { theme } = useTheme();
  const styles = stylesFactory(theme);

  return (
    <View style={[styles.headerContainer, style]}>
      <View style={styles.textContainer}>
        {subtitle && <Text style={styles.subtitle}>{subtitle.toUpperCase()}</Text>}
        <Text style={styles.title}>{title}</Text>
      </View>
      {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
    </View>
  );
}

export function SectionHeader({ title, rightElement, style }) {
  const { theme } = useTheme();
  const styles = stylesFactory(theme);

  return (
    <View style={[styles.sectionContainer, style]}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {rightElement && <View>{rightElement}</View>}
    </View>
  );
}

const stylesFactory = (theme) => StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  rightElement: {
    justifyContent: 'center',
  },
  sectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
  },
});
