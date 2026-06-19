import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const CHIPS_BY_COACH = {
  hydration_coach: [
    "How much water during workouts?",
    "Should I drink electrolytes?",
    "Best hydration scheduling tips",
    "Signs of dehydration"
  ],
  sleep_advisor: [
    "How to improve deep sleep?",
    "Best pre-sleep recovery routine",
    "Should I eat before bed?",
    "Managing muscle fatigue"
  ],
  workout_coach: [
    "Bench press form check",
    "Suggest a cardio plan",
    "How to prevent sore muscles?",
    "Home vs Gym training efficiency"
  ],
  progression_coach: [
    "Break a weight loss plateau",
    "Explain my Fitness Index",
    "Adjust weekly calorie targets",
    "How to maintain muscle mass?"
  ]
};

export default function QuickChips({ coachType, onChipPress }) {
  const { theme } = useTheme();
  const styles = stylesFactory(theme);

  const chips = CHIPS_BY_COACH[coachType] || [
    "Give me wellness tips",
    "Recommend a healthy routine",
    "Tell me about my stats"
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {chips.map((chip, index) => (
        <TouchableOpacity
          key={index}
          style={styles.chip}
          onPress={() => onChipPress(chip)}
          activeOpacity={0.8}
        >
          <Text style={styles.chipText}>{chip}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const stylesFactory = (theme) => StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  chip: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
  },
  chipText: {
    ...theme.typography.labelSmall,
    color: theme.colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
