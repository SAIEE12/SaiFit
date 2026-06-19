import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function ChatInput({ onSend, loading }) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const styles = stylesFactory(theme);

  const handleSend = () => {
    if (!text.trim() || loading) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Ask your coach anything..."
        placeholderTextColor={theme.colors.textSecondary}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={500}
        editable={!loading}
      />
      <TouchableOpacity
        style={[styles.sendButton, (!text.trim() || loading) && styles.disabledButton]}
        onPress={handleSend}
        disabled={!text.trim() || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Feather name="send" size={18} color="#FFF" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const stylesFactory = (theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.xxl,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textPrimary,
    ...theme.typography.bodySmall,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
    ...theme.shadows.soft,
  },
  disabledButton: {
    backgroundColor: theme.colors.textSecondary,
    opacity: 0.5,
  },
});
