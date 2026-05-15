import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import apiClient from '../api/client';
import CalendarStrip from '../components/CalendarStrip';

export default function DashboardScreen({ navigation }) {
  const [recommendation, setRecommendation] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [nutritionSummary, setNutritionSummary] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [hydration, setHydration] = useState(0);
  const [dailyWorkouts, setDailyWorkouts] = useState([]);
  const [dailyMeals, setDailyMeals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [recRes, mealsRes, workoutsRes, hydrationRes] = await Promise.all([
        apiClient.get('/recommendations'),
        apiClient.get(`/nutrition/meals?date=${selectedDate}`),
        apiClient.get(`/workouts?date=${selectedDate}`),
        apiClient.get(`/hydration?date=${selectedDate}`)
      ]);
      
      setRecommendation(recRes.data);
      setDailyWorkouts(workoutsRes.data);
      setDailyMeals(mealsRes.data);
      setHydration(hydrationRes.data.amount_ml || 0);
      
      // Calculate totals
      let totals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      mealsRes.data.forEach(meal => {
        totals.calories += meal.total_calories;
        totals.protein += meal.total_protein;
        totals.carbs += meal.total_carbs;
        totals.fats += meal.total_fats;
      });
      setNutritionSummary(totals);
      
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  const updateHydration = async (amount) => {
    try {
        await apiClient.post('/hydration/log', { amount_ml: amount, date: selectedDate });
        setHydration(prev => prev + amount);
    } catch (e) {
        console.error("Failed to update hydration", e);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Your Fitness Hub 🚀</Text>
          <Text style={styles.subtitle}>Track your complete journey in one place.</Text>
        </View>

        <CalendarStrip selectedDate={selectedDate} onDateSelected={setSelectedDate} />

        {loading ? (
          <ActivityIndicator size="large" color="#E91E63" style={{marginTop: 50}} />
        ) : (
          <>
            {/* Unified Stats Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Daily Snapshot</Text>
                <Text style={styles.dateLabel}>{selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}</Text>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{nutritionSummary.calories}</Text>
                    <Text style={styles.statLabel}>kcal</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={[styles.statValue, {color: '#2196F3'}]}>{hydration}ml</Text>
                    <Text style={styles.statLabel}>Water</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={[styles.statValue, {color: '#4CAF50'}]}>{dailyWorkouts.length}</Text>
                    <Text style={styles.statLabel}>Workouts</Text>
                </View>
              </View>

              <View style={styles.macrosRow}>
                <View style={styles.macroItem}><Text style={styles.macroLabel}>P: {nutritionSummary.protein}g</Text></View>
                <View style={styles.macroItem}><Text style={styles.macroLabel}>C: {nutritionSummary.carbs}g</Text></View>
                <View style={styles.macroItem}><Text style={styles.macroLabel}>F: {nutritionSummary.fats}g</Text></View>
              </View>
            </View>

            {/* Hydration Quick Log */}
            <View style={styles.hydrationCard}>
               <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                  <FontAwesome5 name="tint" size={20} color="#2196F3" />
                  <View style={{marginLeft: 15}}>
                     <Text style={styles.hydrationTitle}>Hydration</Text>
                     <Text style={styles.hydrationSub}>{hydration} / 3000ml goal</Text>
                  </View>
               </View>
               <View style={{flexDirection: 'row'}}>
                  <TouchableOpacity style={styles.waterBtn} onPress={() => updateHydration(250)}>
                     <Text style={styles.waterBtnText}>+250ml</Text>
                  </TouchableOpacity>
               </View>
            </View>

            {/* Daily Timeline */}
            <View style={styles.sectionHeader}>
               <Text style={styles.sectionTitle}>Activity Feed</Text>
            </View>

            {dailyMeals.length === 0 && dailyWorkouts.length === 0 ? (
                <View style={styles.emptyFeed}>
                    <Feather name="activity" size={40} color="#DDD" />
                    <Text style={styles.emptyFeedText}>No activity tracked for this day.</Text>
                </View>
            ) : (
                <View style={styles.timeline}>
                    {/* Render Workouts */}
                    {dailyWorkouts.map((workout, idx) => (
                        <View key={`w-${idx}`} style={styles.timelineItem}>
                            <View style={[styles.timelineIcon, {backgroundColor: '#E91E63'}]}>
                                <FontAwesome5 name="dumbbell" size={14} color="#FFF" />
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>{workout.notes || 'Workout Session'}</Text>
                                <Text style={styles.timelineDesc}>{workout.duration_minutes} mins • Physical Activity</Text>
                            </View>
                        </View>
                    ))}

                    {/* Render Meals */}
                    {dailyMeals.map((meal, idx) => (
                        <View key={`m-${idx}`} style={styles.timelineItem}>
                            <View style={[styles.timelineIcon, {backgroundColor: '#4CAF50'}]}>
                                <FontAwesome5 name="utensils" size={14} color="#FFF" />
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>{meal.meal_type.toUpperCase()}</Text>
                                <Text style={styles.timelineDesc}>{meal.total_calories} kcal • {meal.logs?.length || 0} items</Text>
                                <View style={styles.timelineMacros}>
                                    <Text style={styles.miniMacro}>P: {meal.total_protein}g</Text>
                                    <Text style={styles.miniMacro}>C: {meal.total_carbs}g</Text>
                                    <Text style={styles.miniMacro}>F: {meal.total_fats}g</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* AI Recommendation */}
            {recommendation && (
              <View style={[styles.card, {backgroundColor: '#1A1A1A', borderContent: '#E91E63'}]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, {color: '#FFF'}]}>AI Coach Insights</Text>
                  <FontAwesome5 name="magic" size={16} color="#E91E63" />
                </View>
                <Text style={[styles.recTitle, {color: '#FFF'}]}>{recommendation.workout_plan}</Text>
                <View style={styles.tipBox}>
                    <Text style={styles.tipText}>{recommendation.recovery_advice}</Text>
                </View>
              </View>
            )}
          </>
        )}
        
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 10,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#E91E63',
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  macroItem: {
    marginHorizontal: 15,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  hydrationCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  hydrationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  hydrationSub: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  waterBtn: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  waterBtnText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyFeedText: {
    marginTop: 10,
    fontSize: 14,
    color: '#AAA',
    fontWeight: '500',
  },
  timeline: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  timelineDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  timelineMacros: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  miniMacro: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    marginRight: 10,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 15,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  recTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 10,
  },
  tipBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 5,
  },
  tipText: {
    fontSize: 12,
    color: '#EEE',
    lineHeight: 18,
    fontStyle: 'italic',
  }
});
