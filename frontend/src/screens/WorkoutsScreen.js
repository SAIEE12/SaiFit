import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import CalendarStrip from '../components/CalendarStrip';
import apiClient from '../api/client';

export default function WorkoutsScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWorkouts();
  }, [selectedDate]);

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
  const categories = [
    { name: 'Chest', icon: 'stop-circle', color: '#F39C12' },
    { name: 'Back', icon: 'align-center', color: '#E74C3C' },
    { name: 'Legs', icon: 'child', color: '#F1C40F' },
    { name: 'Cardio', icon: 'running', color: '#3498DB' },
    { name: 'Full Body', icon: 'dumbbell', color: '#2ECC71' }
  ];

  const recentWorkouts = [
    {
      title: 'Upper Body Hypertrophy',
      desc: 'Bench Press, Rows, Shoulder Press, Arms.',
      duration: '45m',
      date: 'Yesterday',
      color: '#E91E63',
    },
    {
      title: 'HIIT Treadmill Sprints',
      desc: '10 intervals of 30s sprint / 30s walk.',
      duration: '20m',
      date: 'Wed, 04 May',
      color: '#3498DB',
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Log Workout</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Feather name="plus" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Log New</Text>
        </TouchableOpacity>
      </View>

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
        
        {/* AI Recommendation */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <FontAwesome5 name="robot" size={16} color="#E91E63" />
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

        <View style={{height: 30}} />
      </ScrollView>
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
    marginBottom: 20,
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
    marginBottom: 25,
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
    marginBottom: 25,
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
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
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
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutInfo: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
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
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
  },
  tag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#AAA',
    fontWeight: '500',
  }
});
