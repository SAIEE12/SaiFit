import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Feather, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import CustomDialog from '../components/CustomDialog';
import apiClient from '../api/client';
import { theme } from '../theme';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function WorkoutsScreen() {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [workouts, setWorkouts] = useState([]);
  const [exercisesList, setExercisesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Recommendation State
  const [recommendation, setRecommendation] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [showAiPlanModal, setShowAiPlanModal] = useState(false);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [addedExercises, setAddedExercises] = useState([]);

  // Reusable Dialog State
  const [dialog, setDialog] = useState({
      visible: false,
      title: '',
      description: '',
      type: 'info',
      confirmText: 'OK',
      cancelText: 'Cancel',
      onConfirm: () => {},
      onCancel: null
  });

  const showDialog = (title, description, type = 'info', onConfirm = null, onCancel = null, confirmText = 'OK') => {
      setDialog({
          visible: true,
          title,
          description,
          type,
          confirmText,
          cancelText: 'Cancel',
          onConfirm: () => {
              setDialog(prev => ({ ...prev, visible: false }));
              if (onConfirm) onConfirm();
          },
          onCancel: onCancel ? () => {
              setDialog(prev => ({ ...prev, visible: false }));
              onCancel();
          } : null
      });
  };

  const fetchRecommendation = async () => {
    try {
      setLoadingRecommendation(true);
      const res = await apiClient.get('/recommendations');
      setRecommendation(res.data);
    } catch (e) {
      console.error("Failed to fetch recommendation", e);
    } finally {
      setLoadingRecommendation(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
      fetchRecommendation();
    }, [selectedDate])
  );

  useEffect(() => {
    fetchExercisesList();
  }, []);

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/workouts?date=${selectedDate}`);
      setWorkouts(res.data);
    } catch (e) {
      console.error("Failed to fetch workouts", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchExercisesList = async () => {
    try {
      const res = await apiClient.get('/workouts/exercises');
      setExercisesList(res.data);
    } catch (e) {
      console.error("Failed to fetch exercises list", e);
    }
  };

  const handleAddExerciseRow = () => {
    if (exercisesList.length === 0) {
      showDialog("Warning", "Exercises database is empty or loading. Please wait.", "warning");
      return;
    }
    setAddedExercises([
      ...addedExercises,
      {
        exercise_id: exercisesList[0].id.toString(),
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
    updated[index][field] = value;
    setAddedExercises(updated);
  };

  const handleSaveWorkout = async () => {
    if (!notes.trim()) {
      showDialog("Required Field", "Please enter workout name or notes.", "warning");
      return;
    }
    if (!duration || isNaN(duration)) {
      showDialog("Invalid Input", "Please enter a valid duration in minutes.", "warning");
      return;
    }
    if (addedExercises.length === 0) {
      showDialog("No Exercises", "Please add at least one exercise row to this session.", "warning");
      return;
    }

    // Validate exercise fields
    for (let i = 0; i < addedExercises.length; i++) {
      const ex = addedExercises[i];
      if (!ex.sets || isNaN(ex.sets) || !ex.reps || isNaN(ex.reps) || !ex.weight || isNaN(ex.weight)) {
        showDialog("Invalid Metrics", `Please make sure Sets, Reps, and Weight are numeric in Row #${i + 1}.`, "warning");
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
      showDialog("Logged! 🎉", "Your workout session has been recorded successfully.", "success", () => {
        // Reset form
        setNotes('');
        setDuration('');
        setAddedExercises([]);
        setShowModal(false);
        // Refresh list
        fetchWorkouts();
      });
    } catch (e) {
      showDialog("Logging Failed", e.response?.data?.error || e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { name: 'Chest', icon: 'stop-circle', color: theme.colors.orange },
    { name: 'Back', icon: 'align-center', color: theme.colors.primary },
    { name: 'Legs', icon: 'child', color: theme.colors.yellow },
    { name: 'Cardio', icon: 'running', color: theme.colors.secondary },
    { name: 'Full Body', icon: 'dumbbell', color: theme.colors.green }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workouts</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Feather name="plus" size={16} color="#FFF" />
          <Text style={styles.addBtnText}>Log Session</Text>
        </TouchableOpacity>
      </View>

      {/* Main workouts history stream */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
        
        {/* Categories ribbon */}
        <View style={styles.categoriesWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {categories.map((cat, index) => (
              <TouchableOpacity key={index} style={styles.categoryItem}>
                <View style={styles.categoryIconWrap}>
                  <FontAwesome5 name={cat.icon} size={18} color={cat.color} />
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Text style={styles.sectionTitle}>ACTIVITY LOGS</Text>

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 30 }} />
        ) : workouts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="dumbbell" size={44} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No workout logs for today.</Text>
          </View>
        ) : (
          workouts.map((workout, index) => (
            <View key={index} style={styles.workoutRow}>
              <View style={[styles.workoutImage, { backgroundColor: theme.colors.primary }]}>
                <FontAwesome5 name="dumbbell" size={18} color="#FFF" />
              </View>
              <View style={styles.workoutInfo}>
                <View style={styles.workoutHeaderRow}>
                  <Text style={styles.workoutTitle} numberOfLines={1}>{workout.notes || 'Workout Session'}</Text>
                  <Text style={styles.durationTag}>{workout.duration_minutes} mins</Text>
                </View>
                <Text style={styles.workoutDesc}>Completed successfully today</Text>
                <View style={styles.tagsRow}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>Active</Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}

        {/* AI Recommendation Suggestion */}
        {recommendation ? (
          <View style={[styles.aiCard, { marginTop: 25 }]}>
            <View style={styles.aiHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
                <Text style={styles.aiTitle}>AI SUGGESTED TOMORROW</Text>
              </View>
            </View>
            <Text style={styles.aiWorkoutTitle}>{recommendation.workout_plan || 'Active Recovery'}</Text>
            <Text style={styles.aiDesc} numberOfLines={3}>
              {recommendation.recovery_advice || 'Based on your recent activities, follow this personalized recommendation.'}
            </Text>
            <TouchableOpacity style={styles.aiBtn} onPress={() => setShowAiPlanModal(true)}>
              <Text style={styles.aiBtnText}>View Plan</Text>
              <Feather name="arrow-right" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : loadingRecommendation ? (
          <View style={[styles.aiCard, { marginTop: 25, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={{ marginTop: 8, color: theme.colors.textSecondary, fontSize: 12 }}>Loading dynamic AI plan...</Text>
          </View>
        ) : null}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Log Workout Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Workout</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Feather name="x" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Modal Form ScrollView */}
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
              <TouchableOpacity style={styles.addExerciseBtn} onPress={handleAddExerciseRow}>
                <Feather name="plus" size={14} color="#FFF" />
                <Text style={styles.addExerciseBtnText}>Add Row</Text>
              </TouchableOpacity>
            </View>

            {addedExercises.map((row, idx) => (
              <View key={idx} style={styles.exerciseRowCard}>
                <View style={styles.exerciseRowHeader}>
                  <Text style={styles.exerciseRowTitle}>Exercise #{idx + 1}</Text>
                  <TouchableOpacity onPress={() => handleRemoveExerciseRow(idx)}>
                    <Feather name="trash-2" size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>

                {/* Exercises picker wrap */}
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={row.exercise_id}
                    onValueChange={(val) => handleUpdateExerciseRow(idx, 'exercise_id', val)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {exercisesList.map((item) => (
                      <Picker.Item key={item.id} label={item.name} value={item.id.toString()} />
                    ))}
                  </Picker>
                </View>

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
              </View>
            ))}

            {addedExercises.length === 0 && (
              <View style={styles.emptyExerciseBox}>
                <Text style={styles.emptyExerciseText}>No exercises added. Tap "+ Add Row" to customize.</Text>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWorkout} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Session</Text>
              )}
            </TouchableOpacity>
            
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* AI Plan Modal */}
      <Modal visible={showAiPlanModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAiPlanModal(false)}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomWidth: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="sparkles" size={22} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>AI Workout Plan</Text>
            </View>
            <TouchableOpacity onPress={() => setShowAiPlanModal(false)}>
              <Feather name="x" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {recommendation && (
              <>
                <View style={styles.aiPlanHeroCard}>
                  <Text style={styles.aiPlanHeroLabel}>TOMORROW'S FOCUS</Text>
                  <Text style={styles.aiPlanHeroTitle}>{recommendation.workout_plan}</Text>
                </View>

                <Text style={styles.sectionHeading}>Exercises & Activities</Text>
                {recommendation.exercises && recommendation.exercises.length > 0 ? (
                  recommendation.exercises.map((exercise, idx) => (
                    <View key={idx} style={styles.aiExerciseCard}>
                      <View style={styles.aiExerciseNumberWrap}>
                        <Text style={styles.aiExerciseNumber}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.aiExerciseName}>{exercise}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noExercisesText}>No specific exercises listed. Focus on active mobility!</Text>
                )}

                <Text style={styles.sectionHeading}>Recovery Guidance</Text>
                <View style={styles.aiRecoveryCard}>
                  <View style={styles.aiRecoveryHeader}>
                    <FontAwesome5 name="heartbeat" size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.aiRecoveryTitle}>Coach's Guidance</Text>
                  </View>
                  <Text style={styles.aiRecoveryText}>{recommendation.recovery_advice}</Text>
                </View>

                <TouchableOpacity style={styles.aiPlanGotItBtn} onPress={() => setShowAiPlanModal(false)}>
                  <Text style={styles.aiPlanGotItBtnText}>Got it, Let's do it! 💪</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Custom Reusable Dialog */}
      <CustomDialog 
          visible={dialog.visible}
          title={dialog.title}
          description={dialog.description}
          type={dialog.type}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          onConfirm={dialog.onConfirm}
          onCancel={dialog.onCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.xxl,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '700',
    marginLeft: 4,
    fontSize: 13,
  },
  categoriesWrapper: {
    marginBottom: 20,
    marginTop: 10,
  },
  categoriesScroll: {
    paddingLeft: theme.spacing.xxl,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  categoryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 1.5,
    marginHorizontal: theme.spacing.xxl,
    marginBottom: 14,
    marginTop: 10,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: theme.spacing.xxl,
    marginBottom: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  workoutRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: theme.borderRadius.xxl,
    marginHorizontal: theme.spacing.xxl,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  workoutImage: {
    width: 48,
    height: 48,
    borderRadius: 16,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  workoutHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  durationTag: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  workoutDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
  },
  tag: {
    backgroundColor: theme.colors.accentPinkLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  aiCard: {
    backgroundColor: theme.colors.card,
    padding: 24,
    borderRadius: theme.borderRadius.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: theme.spacing.xxl,
    ...theme.shadows.premium,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primary,
    marginLeft: 8,
    letterSpacing: 1.5,
  },
  aiWorkoutTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  aiDesc: {
    fontSize: 14,
    color: '#48484A',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
  },
  aiBtn: {
    backgroundColor: theme.colors.darkBase,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
  },

  // Modal styling
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modalBody: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  exerciseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  exerciseSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.darkBase,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addExerciseBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  exerciseRowCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.xxl,
    padding: 16,
    marginBottom: 16,
  },
  exerciseRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  pickerWrap: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: 12,
  },
  picker: {
    height: Platform.OS === 'ios' ? 120 : 50,
    width: '100%',
    backgroundColor: 'transparent',
  },
  pickerItem: {
    fontSize: 15,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  metricInput: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyExerciseBox: {
    padding: 24,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  emptyExerciseText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  
  // AI Plan Modal styles
  aiPlanHeroCard: {
    backgroundColor: theme.colors.darkBase,
    padding: 24,
    borderRadius: theme.borderRadius.xxl,
    marginBottom: 28,
  },
  aiPlanHeroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  aiPlanHeroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 10,
    marginBottom: 16,
  },
  aiExerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: theme.borderRadius.xxl,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  aiExerciseNumberWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aiExerciseNumber: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  aiExerciseName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  noExercisesText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  aiRecoveryCard: {
    backgroundColor: theme.colors.accentPinkLight,
    padding: 20,
    borderRadius: theme.borderRadius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.15)',
    marginBottom: 32,
  },
  aiRecoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiRecoveryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  aiRecoveryText: {
    fontSize: 14,
    color: '#48484A',
    lineHeight: 22,
    fontWeight: '500',
  },
  aiPlanGotItBtn: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  aiPlanGotItBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
