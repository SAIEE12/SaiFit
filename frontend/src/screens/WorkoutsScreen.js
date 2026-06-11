import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Feather, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import CustomDialog from '../components/CustomDialog';
import apiClient from '../api/client';
import { theme } from '../theme';
import ScreenContainer from '../components/ui/ScreenContainer';
import { Header, SectionHeader } from '../components/ui/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AICoachCard from '../components/ui/AICoachCard';
import Badge from '../components/ui/Badge';
import { LoadingState, EmptyState } from '../components/ui/StateViews';
import ModalView from '../components/ui/ModalView';

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
      const res = await apiClient.get('/recommendations/workout-coach');
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
    { name: 'Cardio', icon: 'running', color: theme.colors.info },
    { name: 'Full Body', icon: 'dumbbell', color: theme.colors.success }
  ];

  return (
    <View style={styles.container}>
      <Header
        title="Workouts"
        rightElement={
          <Button variant="primary" size="sm" onPress={() => setShowModal(true)} icon={<Feather name="plus" size={14} color="#FFF" />}>
            Log Session
          </Button>
        }
      />

      <ScreenContainer scrollable keyboardAvoiding={false} edges={['bottom']}>
        {/* Categories ribbon */}
        <View style={styles.categoriesWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {categories.map((cat, index) => (
              <TouchableOpacity key={index} style={styles.categoryItem} activeOpacity={0.8}>
                <Card style={styles.categoryIconWrap}>
                  <FontAwesome5 name={cat.icon} size={18} color={cat.color} />
                </Card>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <SectionHeader title="ACTIVITY LOGS" />

        {loading ? (
          <LoadingState message="Fetching logged sessions..." />
        ) : workouts.length === 0 ? (
          <EmptyState
            icon="zap"
            title="No workout logs"
            description="You haven't recorded any workouts for today."
          />
        ) : (
          workouts.map((workout, index) => (
            <Card key={index} style={styles.workoutRow}>
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
                  <Badge variant="primary" label="Active" />
                </View>
              </View>
            </Card>
          ))
        )}

        {/* AI Recommendation Suggestion */}
        {recommendation ? (
          <AICoachCard
            title="AI SUGGESTED TOMORROW"
            scoreLabel="Workout Focus"
            scoreValue={recommendation.workout_plan || 'Active Recovery'}
            narrative={recommendation.recovery_advice}
            actions={
              <Button variant="secondary" size="md" onPress={() => setShowAiPlanModal(true)} icon={<Feather name="arrow-right" size={16} color="#FFF" style={{ marginLeft: 'auto' }} />}>
                View Plan
              </Button>
            }
          />
        ) : loadingRecommendation ? (
          <LoadingState message="Loading dynamic AI plan..." />
        ) : null}
      </ScreenContainer>

      {/* Log Workout Modal */}
      <ModalView visible={showModal} title="Log Workout" onClose={() => setShowModal(false)}>
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
                <TouchableOpacity onPress={() => handleRemoveExerciseRow(idx)}>
                  <Feather name="trash-2" size={16} color={theme.colors.danger} />
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

      {/* AI Plan Modal */}
      <ModalView visible={showAiPlanModal} title="AI Workout Plan" onClose={() => setShowAiPlanModal(false)}>
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
                  <Card key={idx} style={styles.aiExerciseCard}>
                    <View style={styles.aiExerciseNumberWrap}>
                      <Text style={styles.aiExerciseNumber}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiExerciseName}>{exercise}</Text>
                    </View>
                  </Card>
                ))
              ) : (
                <Text style={styles.noExercisesText}>No specific exercises listed. Focus on active mobility!</Text>
              )}

              <Text style={styles.sectionHeading}>Recovery Guidance</Text>
              <Card style={styles.aiRecoveryCard}>
                <View style={styles.aiRecoveryHeader}>
                  <FontAwesome5 name="heartbeat" size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.aiRecoveryTitle}>Coach's Guidance</Text>
                </View>
                <Text style={styles.aiRecoveryText}>{recommendation.recovery_advice}</Text>
              </Card>

              <Button variant="primary" size="lg" onPress={() => setShowAiPlanModal(false)} style={{ marginBottom: 40 }}>
                Got it, Let's do it! 💪
              </Button>
            </>
          )}
        </ScrollView>
      </ModalView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    padding: 0,
  },
  categoryName: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    letterSpacing: 0,
  },
  workoutRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.xxl,
    marginBottom: 14,
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
    ...theme.typography.h5,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  durationTag: {
    ...theme.typography.captionStrong,
    color: theme.colors.primary,
  },
  workoutDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
  },
  modalBody: {
    padding: 24,
  },
  inputLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
  },
  input: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.lg,
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
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  exerciseRowCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  exerciseRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseRowTitle: {
    ...theme.typography.h5,
    color: theme.colors.textPrimary,
  },
  pickerWrap: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
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
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  metricInput: {
    backgroundColor: theme.colors.surface,
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
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  emptyExerciseText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  
  // AI Plan Modal styles
  aiPlanHeroCard: {
    backgroundColor: theme.colors.darkBase,
    padding: 24,
    borderRadius: theme.radii.xxl,
    marginBottom: 28,
  },
  aiPlanHeroLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  aiPlanHeroTitle: {
    ...theme.typography.h3,
    color: '#FFF',
    lineHeight: 32,
  },
  sectionHeading: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
    marginTop: 10,
    marginBottom: 16,
  },
  aiExerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    ...theme.typography.body,
    fontWeight: '700',
  },
  noExercisesText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  aiRecoveryCard: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryBorder,
    borderWidth: 1,
    marginBottom: 32,
  },
  aiRecoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiRecoveryTitle: {
    ...theme.typography.captionStrong,
    color: theme.colors.primary,
  },
  aiRecoveryText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
});
