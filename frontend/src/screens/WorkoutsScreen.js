import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Feather, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import CustomDialog from '../components/CustomDialog';
import apiClient from '../api/client';


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

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
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
    { name: 'Chest', icon: 'stop-circle', color: '#F39C12' },
    { name: 'Back', icon: 'align-center', color: '#E74C3C' },
    { name: 'Legs', icon: 'child', color: '#F1C40F' },
    { name: 'Cardio', icon: 'running', color: '#3498DB' },
    { name: 'Full Body', icon: 'dumbbell', color: '#2ECC71' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Log Workout</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Feather name="plus" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Log New</Text>
        </TouchableOpacity>
      </View>

      {/* Categories ribbon */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((cat, index) => (
            <TouchableOpacity key={index} style={styles.categoryItem}>
              <View style={styles.categoryIconWrap}>
                <FontAwesome5 name={cat.icon} size={20} color={cat.color} />
              </View>
              <Text style={styles.categoryName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main workouts history stream */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#E91E63" style={{ marginTop: 30 }} />
        ) : workouts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="dumbbell" size={50} color="#DDD" />
            <Text style={styles.emptyText}>No workouts logged for this day.</Text>
          </View>
        ) : (
          workouts.map((workout, index) => (
            <View key={index} style={styles.workoutRow}>
              <View style={[styles.workoutImage, { backgroundColor: '#E91E63' }]}>
                <FontAwesome5 name="dumbbell" size={22} color="#FFF" />
              </View>
              <View style={styles.workoutInfo}>
                <View style={styles.workoutHeaderRow}>
                  <Text style={styles.workoutTitle} numberOfLines={1}>{workout.notes || 'Workout Session'}</Text>
                  <Text style={styles.tagText}>{workout.duration_minutes}m</Text>
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

        {/* Static AI Recommendation Suggestion */}
        <View style={[styles.aiCard, { marginTop: 25 }]}>
          <View style={styles.aiHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="sparkles" size={16} color="#E91E63" />
              <Text style={styles.aiTitle}>AI Suggested Tomorrow</Text>
            </View>
          </View>
          <Text style={styles.aiWorkoutTitle}>Legs & Core Recovery</Text>
          <Text style={styles.aiDesc}>Based on your recent Upper Body session and frequency, your legs are fully recovered. Let's hit Squats and Lunges.</Text>
          <TouchableOpacity style={styles.aiBtn}>
            <Text style={styles.aiBtnText}>View Plan</Text>
            <Feather name="arrow-right" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Log Workout Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Workout</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Feather name="x" size={28} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          {/* Modal Form ScrollView */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Workout Name / Notes</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Upper Body Strength"
              value={notes}
              onChangeText={setNotes}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 15 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Duration (minutes)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 45"
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Selected Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#F0F0F0', color: '#666' }]}
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
                    <Feather name="trash-2" size={16} color="#FF5252" />
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
                <Text style={styles.emptyExerciseText}>No exercises added. Click "+ Add Row" to begin builder.</Text>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWorkout} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Workout session</Text>
              )}
            </TouchableOpacity>
            
            <View style={{ height: 60 }} />
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
    backgroundColor: '#F8FAFD',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E91E63',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '700',
    marginLeft: 4,
    fontSize: 13,
  },
  categoriesWrapper: {
    marginBottom: 20,
  },
  categoriesScroll: {
    paddingLeft: 20,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 25,
  },
  categoryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  aiCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E91E63',
    marginLeft: 8,
  },
  aiWorkoutTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  aiDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  aiBtn: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    borderRadius: 12,
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
  workoutRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  workoutImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutInfo: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
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
    color: '#1A1A1A',
    flex: 1,
  },
  workoutDesc: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
  },
  tag: {
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E91E63',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#AAA',
    fontWeight: '600',
  },

  // Modal styling
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#1A1A1A',
  },
  exerciseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 15,
  },
  exerciseSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addExerciseBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  exerciseRowCard: {
    backgroundColor: '#FCFCFD',
    borderWidth: 1,
    borderColor: '#ECEEF2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
  },
  exerciseRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  pickerWrap: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
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
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  metricInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  emptyExerciseBox: {
    padding: 20,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  emptyExerciseText: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '600',
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: '#E91E63',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 25,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
