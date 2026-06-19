import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { theme } from '../../theme';
import ModalView from '../ui/ModalView';
import Button from '../ui/Button';
import apiClient from '../../api/client';

export default function ActivityLoggerModal({
  visible,
  onClose,
  selectedDate,
  tracks = [],
  onSaveSuccess,
  showDialog
}) {
  const [activityName, setActivityName] = useState('');
  const [activityDuration, setActivityDuration] = useState('');
  const [activityIntensity, setActivityIntensity] = useState('medium');
  const [activityCategory, setActivityCategory] = useState('yoga');
  const [activityTrackId, setActivityTrackId] = useState('');
  const [activityNotes, setActivityNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset local state when visible/hidden
  useEffect(() => {
    if (visible) {
      setActivityName('');
      setActivityDuration('');
      setActivityIntensity('medium');
      setActivityCategory('yoga');
      setActivityTrackId('');
      setActivityNotes('');
    }
  }, [visible]);

  const handleSaveActivity = async () => {
    if (!activityName.trim()) {
      showDialog('Required Field', 'Please enter an activity name.', 'warning');
      return;
    }
    if (!activityDuration || isNaN(activityDuration)) {
      showDialog('Invalid Input', 'Please enter a valid duration in minutes.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        track_id: activityTrackId ? parseInt(activityTrackId) : null,
        activity_name: activityName.trim(),
        category: activityCategory,
        date: selectedDate,
        duration_minutes: parseInt(activityDuration),
        intensity: activityIntensity,
        notes: activityNotes.trim()
      };

      await apiClient.post('/activities/log', payload);
      showDialog('Logged! 🎉', 'Your activity has been recorded successfully.', 'success', () => {
        onSaveSuccess();
      });
    } catch (e) {
      showDialog('Logging Failed', e.response?.data?.error || e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalView visible={visible} title="Log Custom Activity" onClose={onClose}>
      <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.inputLabel}>Activity Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Morning Hatha Yoga, Evening Dance"
          placeholderTextColor={theme.colors.textTertiary}
          value={activityName}
          onChangeText={setActivityName}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 15 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 30"
              placeholderTextColor={theme.colors.textTertiary}
              value={activityDuration}
              onChangeText={setActivityDuration}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Intensity</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={activityIntensity}
                onValueChange={(val) => setActivityIntensity(val)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="Low" value="low" />
                <Picker.Item label="Medium" value="medium" />
                <Picker.Item label="High" value="high" />
              </Picker>
            </View>
          </View>
        </View>

        <Text style={styles.inputLabel}>Category</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={activityCategory}
            onValueChange={(val) => setActivityCategory(val)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            <Picker.Item label="Yoga" value="yoga" />
            <Picker.Item label="Meditation" value="meditation" />
            <Picker.Item label="Dance" value="dance" />
            <Picker.Item label="Cardio" value="cardio" />
            <Picker.Item label="Strength" value="strength" />
            <Picker.Item label="Other" value="other" />
          </Picker>
        </View>

        <Text style={styles.inputLabel}>Associate with lifestyle track (Optional)</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={activityTrackId}
            onValueChange={(val) => setActivityTrackId(val)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            <Picker.Item label="None" value="" />
            {tracks.map((t) => (
              <Picker.Item key={t.id} label={t.display_name} value={t.id.toString()} />
            ))}
          </Picker>
        </View>

        <Text style={styles.inputLabel}>Notes</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="e.g. Felt highly energetic, practiced deep breathing"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          numberOfLines={3}
          value={activityNotes}
          onChangeText={setActivityNotes}
        />

        {/* Save Button */}
        <Button variant="primary" size="lg" onPress={handleSaveActivity} loading={saving} style={{ marginTop: 20 }}>
          Log Activity
        </Button>

        <View style={{ height: 60 }} />
      </ScrollView>
    </ModalView>
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
  pickerWrap: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    height: 48,
    overflow: 'hidden',
  },
  picker: {
    color: theme.colors.textPrimary,
    backgroundColor: 'transparent',
  },
  pickerItem: {
    ...theme.typography.bodySmall,
  },
});
