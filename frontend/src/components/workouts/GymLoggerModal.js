import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';
import ModalView from '../ui/ModalView';
import Card from '../ui/Card';
import Button from '../ui/Button';
import apiClient from '../../api/client';

export default function GymLoggerModal({
  visible,
  onClose,
  selectedDate,
  exercisesList = [],
  selectedCategory,
  onSaveSuccess,
  showDialog
}) {
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [addedExercises, setAddedExercises] = useState([]);
  const [activePickerRowIndex, setActivePickerRowIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  // Reset local state when visible/hidden
  useEffect(() => {
    if (visible) {
      setNotes('');
      setDuration('');
      setAddedExercises([]);
      setActivePickerRowIndex(null);
    }
  }, [visible]);

  const getFilteredExercises = () => {
    if (!selectedCategory) return exercisesList;
    return exercisesList.filter(
      ex => ex.category && ex.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  };

  const handleAddExerciseRow = () => {
    const list = getFilteredExercises();
    if (list.length === 0) {
      showDialog('Warning', 'No exercises available in this category.', 'warning');
      return;
    }
    setAddedExercises([
      ...addedExercises,
      {
        exercise_id: list[0].id.toString(),
        sets: '3',
        reps: '10',
        weight: '60'
      }
    ]);
  };

  const handleRemoveExerciseRow = (index) => {
    const updated = [...addedExercises];
    updated.splice(index, 1);
    setAddedExercises(updated);
  };

  const handleUpdateExerciseRow = (index, field, value) => {
    const updated = [...addedExercises];
    updated[index] = { ...updated[index], [field]: value };
    setAddedExercises(updated);
  };

  const handleSaveWorkout = async () => {
    if (!notes.trim()) {
      showDialog('Required Field', 'Please enter workout name or notes.', 'warning');
      return;
    }
    if (!duration || isNaN(duration)) {
      showDialog('Invalid Input', 'Please enter a valid duration in minutes.', 'warning');
      return;
    }
    if (addedExercises.length === 0) {
      showDialog('No Exercises', 'Please add at least one exercise row to this session.', 'warning');
      return;
    }

    // Validate exercise fields
    for (let i = 0; i < addedExercises.length; i++) {
      const ex = addedExercises[i];
      if (!ex.sets || isNaN(ex.sets) || !ex.reps || isNaN(ex.reps) || !ex.weight || isNaN(ex.weight)) {
        showDialog('Invalid Metrics', `Please make sure Sets, Reps, and Weight are numeric in Row #${i + 1}.`, 'warning');
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        date: selectedDate,
        notes: notes.trim(),
        duration_minutes: parseInt(duration),
        exercises: addedExercises.map(ex => ({
          exercise_id: parseInt(ex.exercise_id),
          sets: parseInt(ex.sets),
          reps: parseInt(ex.reps),
          weight: parseFloat(ex.weight)
        }))
      };

      await apiClient.post('/workouts/log', payload);
      showDialog('Logged! 🎉', 'Your workout session has been recorded successfully.', 'success', () => {
        onSaveSuccess();
      });
    } catch (e) {
      showDialog('Logging Failed', e.response?.data?.error || e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModalView visible={visible} title="Log Workout" onClose={onClose}>
        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.inputLabel}>Workout Name / Notes</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Upper Body Strength"
            placeholderTextColor={theme.colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 15 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 45"
                placeholderTextColor={theme.colors.textTertiary}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Selected Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.border, color: theme.colors.textSecondary }]}
                value={selectedDate}
                editable={false}
              />
            </View>
          </View>

          {/* Dynamic Exercises Sets Builder */}
          <View style={styles.exerciseSectionHeader}>
            <Text style={styles.exerciseSectionTitle}>Exercises & Sets</Text>
            <Button variant="secondary" size="sm" onPress={handleAddExerciseRow} icon={<Feather name="plus" size={14} color="#FFF" />}>
              Add Row
            </Button>
          </View>

          {addedExercises.map((row, idx) => (
            <Card key={idx} style={styles.exerciseRowCard}>
              <View style={styles.exerciseRowHeader}>
                <Text style={styles.exerciseRowTitle}>Exercise #{idx + 1}</Text>
                <TouchableOpacity onPress={() => handleRemoveExerciseRow(idx)} accessibilityLabel={`Remove exercise row ${idx + 1}`} accessibilityRole="button">
                  <Feather name="trash-2" size={16} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>

              {/* Custom Cross-Platform Exercise Selector */}
              <TouchableOpacity
                style={styles.customPickerButton}
                onPress={() => setActivePickerRowIndex(idx)}
                accessibilityLabel="Select exercise type"
                accessibilityRole="button"
              >
                <Text style={styles.customPickerButtonText}>
                  {getFilteredExercises().find(ex => ex.id.toString() === row.exercise_id.toString())?.name || "Select Exercise"}
                </Text>
                <Feather name="chevron-down" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              {/* Sets, Reps, Weight metrics layout */}
              <View style={styles.metricsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metricLabel}>Sets</Text>
                  <TextInput
                    style={styles.metricInput}
                    value={row.sets}
                    onChangeText={(val) => handleUpdateExerciseRow(idx, 'sets', val)}
                    keyboardType="numeric"
                    placeholder="3"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metricLabel}>Reps</Text>
                  <TextInput
                    style={styles.metricInput}
                    value={row.reps}
                    onChangeText={(val) => handleUpdateExerciseRow(idx, 'reps', val)}
                    keyboardType="numeric"
                    placeholder="10"
                  />
                </View>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.metricLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.metricInput}
                    value={row.weight}
                    onChangeText={(val) => handleUpdateExerciseRow(idx, 'weight', val)}
                    keyboardType="numeric"
                    placeholder="60"
                  />
                </View>
              </View>
            </Card>
          ))}

          {addedExercises.length === 0 && (
            <View style={styles.emptyExerciseBox}>
              <Text style={styles.emptyExerciseText}>No exercises added. Tap "Add Row" to customize.</Text>
            </View>
          )}

          {/* Save Button */}
          <Button variant="primary" size="lg" onPress={handleSaveWorkout} loading={saving} style={{ marginTop: 20 }}>
            Save Session
          </Button>

          <View style={{ height: 60 }} />
        </ScrollView>
      </ModalView>

      {/* Exercise Picker Modal */}
      <ModalView
        visible={activePickerRowIndex !== null}
        title="Select Exercise"
        onClose={() => setActivePickerRowIndex(null)}
      >
        <ScrollView style={{ padding: theme.spacing.lg }} showsVerticalScrollIndicator={false}>
          {activePickerRowIndex !== null && getFilteredExercises().map((item) => {
            const isSelected = addedExercises[activePickerRowIndex]?.exercise_id?.toString() === item.id.toString();
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.pickerItemRow,
                  isSelected && styles.pickerItemRowSelected
                ]}
                onPress={() => {
                  handleUpdateExerciseRow(activePickerRowIndex, 'exercise_id', item.id.toString());
                  setActivePickerRowIndex(null);
                }}
              >
                <Text style={[
                  styles.pickerItemRowText,
                  isSelected && styles.pickerItemRowTextSelected
                ]}>
                  {item.name}
                </Text>
                {isSelected && (
                  <Feather name="check" size={16} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ModalView>
    </>
  );
}

const styles = StyleSheet.create({
  modalBody: {
    padding: theme.spacing.lg,
  },
  inputLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: theme.spacing.md,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    ...theme.typography.bodySmall,
  },
  exerciseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  exerciseSectionTitle: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
  },
  exerciseRowCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderColor: theme.colors.border,
    borderWidth: 1,
    backgroundColor: theme.colors.surface,
  },
  exerciseRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  exerciseRowTitle: {
    ...theme.typography.captionStrong,
    color: theme.colors.textPrimary,
  },
  customPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.sm,
  },
  customPickerButtonText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: theme.spacing.sm,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  metricInput: {
    height: 38,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.sm,
    textAlign: 'center',
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
    fontSize: 12,
  },
  emptyExerciseBox: {
    padding: theme.spacing.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.md,
  },
  emptyExerciseText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  pickerItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerItemRowSelected: {
    backgroundColor: 'rgba(255, 45, 85, 0.05)',
  },
  pickerItemRowText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
  },
  pickerItemRowTextSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
