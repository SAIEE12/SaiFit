import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';

export default function ToneSelector({ activeTone, onToneChange }) {
  const tones = [
    { key: 'Supportive', label: 'Supportive' },
    { key: 'Direct', label: 'Direct' },
    { key: 'Challenger', label: 'Challenger 🔥' }
  ];

  return (
    <View style={styles.toneSelectorContainer}>
      {tones.map((t) => (
        <TouchableOpacity
          key={t.key}
          onPress={() => onToneChange(t.key)}
          style={[
            styles.toneBtn,
            activeTone === t.key && styles.toneBtnActive
          ]}
        >
          <Text
            style={[
              styles.toneBtnText,
              activeTone === t.key && styles.toneBtnTextActive
            ]}
          >
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  toneSelectorContainer: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    backgroundColor: theme.colors.border,
    padding: 4,
    borderRadius: theme.radii.lg,
  },
  toneBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radii.md,
  },
  toneBtnActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.soft,
  },
  toneBtnText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
  },
  toneBtnTextActive: {
    color: theme.colors.primary,
    fontWeight: '900',
  },
});
