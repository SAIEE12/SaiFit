import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';

export default function UndoSnackbar({ visible, message, onUndo }) {
  if (!visible) return null;

  return (
    <View style={styles.undoSnackbar}>
      <Text style={styles.undoText}>{message || 'Cleared successfully'}</Text>
      <TouchableOpacity onPress={onUndo} style={styles.undoBtn}>
        <Text style={styles.undoBtnText}>UNDO</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  undoSnackbar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.textPrimary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.lg,
    ...theme.shadows.premium,
  },
  undoText: {
    ...theme.typography.bodySmall,
    color: '#FFF',
    fontWeight: '700',
  },
  undoBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  undoBtnText: {
    ...theme.typography.labelSmall,
    color: theme.colors.primary,
    fontWeight: '900',
  },
});
