import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function ChatBubble({ role, message, timestamp }) {
  const { theme } = useTheme();
  const styles = stylesFactory(theme);

  const isUser = role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble
        ]}
      >
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message}
        </Text>
      </View>
      {timestamp && (
        <Text style={[styles.timeText, isUser ? styles.userTime : styles.assistantTime]}>
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}
    </View>
  );
}

const stylesFactory = (theme) => StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    width: '100%',
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxLength: '80%',
    borderRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    maxWidth: '85%',
    ...theme.shadows.soft,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: theme.radii.xs,
  },
  assistantBubble: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderBottomLeftRadius: theme.radii.xs,
  },
  text: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    lineHeight: 20,
  },
  userText: {
    color: '#FFF',
  },
  assistantText: {
    color: theme.colors.textPrimary,
  },
  timeText: {
    ...theme.typography.labelSmall,
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  userTime: {
    marginRight: 4,
  },
  assistantTime: {
    marginLeft: 4,
  },
});
