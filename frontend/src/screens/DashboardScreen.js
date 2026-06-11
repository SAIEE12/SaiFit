import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';
import CalendarStrip from '../components/CalendarStrip';
import { theme } from '../theme';
import ScreenContainer from '../components/ui/ScreenContainer';
import { Header, SectionHeader } from '../components/ui/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AICoachCard from '../components/ui/AICoachCard';
import { LoadingState, EmptyState } from '../components/ui/StateViews';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DashboardScreen({ navigation }) {
  const [insight, setInsight] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [nutritionSummary, setNutritionSummary] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [hydration, setHydration] = useState(0);
  const [dailyWorkouts, setDailyWorkouts] = useState([]);
  const [dailyMeals, setDailyMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [insightExpanded, setInsightExpanded] = useState(false);
  const [completedActions, setCompletedActions] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [recRes, mealsRes, workoutsRes, hydrationRes] = await Promise.all([
        apiClient.get('/recommendations/insight'),
        apiClient.get(`/nutrition/meals?date=${selectedDate}`),
        apiClient.get(`/workouts?date=${selectedDate}`),
        apiClient.get(`/hydration?date=${selectedDate}`)
      ]);
      
      setInsight(recRes.data);
      setDailyWorkouts(workoutsRes.data);
      setDailyMeals(mealsRes.data);
      setHydration(hydrationRes.data.amount_ml || 0);
      
      // Calculate totals
      let totals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      mealsRes.data.forEach(meal => {
        totals.calories += meal.total_calories || 0;
        totals.protein += meal.total_protein || 0;
        totals.carbs += meal.total_carbs || 0;
        totals.fats += meal.total_fats || 0;
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

  const toggleInsight = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInsightExpanded(!insightExpanded);
  };

  const toggleAction = (idx) => {
    setCompletedActions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Map suggested actions to visual segment/checkbox list
  const renderActions = () => {
    if (!insight || !insight.next_actions || insight.next_actions.length === 0) return null;
    return (
      <View style={styles.actionsBlock}>
        <Text style={styles.actionsHeading}>TRAINER SUGGESTED ACTIONS</Text>
        {insight.next_actions.map((act, idx) => {
          const isDone = !!completedActions[idx];
          return (
            <TouchableOpacity key={idx} style={styles.actionRowItem} onPress={() => toggleAction(idx)}>
              <View style={[styles.checkBoxCircle, isDone && styles.checkBoxCircleDone]}>
                {isDone && <Feather name="check" size={10} color="#FFF" />}
              </View>
              <Text style={[styles.actionRowText, isDone && styles.actionRowTextDone]}>{act}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <Header
        title="Your Fitness Hub 🚀"
        subtitle="Track your complete journey in one place."
      />

      <CalendarStrip selectedDate={selectedDate} onDateSelected={setSelectedDate} />

      <ScreenContainer scrollable keyboardAvoiding={false} edges={['bottom']}>
        {loading ? (
          <LoadingState message="Calculating daily metrics..." />
        ) : (
          <>
            {/* Context-Aware AI Personal Trainer Panel */}
            {insight && (
              <AICoachCard
                title="AI PERSONAL TRAINER"
                scoreLabel="Recovery Status"
                scoreValue="Optimal Recovery"
                narrative={insight.summary}
                expanded={insightExpanded}
                onToggle={toggleInsight}
                segments={
                  insightExpanded
                    ? [
                        {
                          icon: 'trending-up',
                          title: 'Daily Analysis',
                          text: insight.analysis,
                          color: theme.colors.primary,
                        },
                      ]
                    : []
                }
                actions={
                  insightExpanded ? (
                    <View>
                      {insight.motivational_quote && (
                        <View style={styles.quoteBlock}>
                          <Feather name="info" size={16} color={theme.colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
                          <Text style={styles.quoteText}>"{insight.motivational_quote}"</Text>
                        </View>
                      )}
                      {renderActions()}
                    </View>
                  ) : null
                }
              />
            )}

            {/* Unified Stats Card */}
            <Card variant="elevated" style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Daily Snapshot</Text>
                <Text style={styles.dateLabel}>{selectedDate === getLocalDateString() ? 'Today' : selectedDate}</Text>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{nutritionSummary.calories}</Text>
                    <Text style={styles.statLabel}>kcal</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: theme.colors.info }]}>{hydration}ml</Text>
                    <Text style={styles.statLabel}>Water</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: theme.colors.success }]}>{dailyWorkouts.length}</Text>
                    <Text style={styles.statLabel}>Workouts</Text>
                </View>
              </View>

              <View style={styles.macrosRow}>
                <View style={styles.macroItem}><Text style={styles.macroLabel}>P: {nutritionSummary.protein}g</Text></View>
                <View style={styles.macroItem}><Text style={styles.macroLabel}>C: {nutritionSummary.carbs}g</Text></View>
                <View style={styles.macroItem}><Text style={styles.macroLabel}>F: {nutritionSummary.fats}g</Text></View>
              </View>
            </Card>

            {/* Hydration Quick Log */}
            <Card style={styles.hydrationCard}>
               <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <FontAwesome5 name="tint" size={20} color={theme.colors.info} />
                  <View style={{ marginLeft: 15 }}>
                     <Text style={styles.hydrationTitle}>Hydration</Text>
                     <Text style={styles.hydrationSub}>{hydration} / 3000ml goal</Text>
                  </View>
               </View>
               <Button variant="outline" size="sm" onPress={() => updateHydration(250)} textStyle={{ color: theme.colors.info }} style={{ borderColor: theme.colors.info }}>
                  +250ml
               </Button>
            </Card>

            {/* Daily Timeline */}
            <SectionHeader title="Activity Feed" />

            {dailyMeals.length === 0 && dailyWorkouts.length === 0 ? (
              <EmptyState
                icon="activity"
                title="No activity tracked"
                description="Use meals or workouts tab to add data for today."
              />
            ) : (
                <View style={styles.timeline}>
                    {/* Render Workouts */}
                    {dailyWorkouts.map((workout, idx) => (
                        <View key={`w-${idx}`} style={styles.timelineItem}>
                            <View style={[styles.timelineIcon, { backgroundColor: theme.colors.primary }]}>
                                <FontAwesome5 name="dumbbell" size={14} color="#FFF" />
                            </View>
                            <Card style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>{workout.notes || 'Workout Session'}</Text>
                                <Text style={styles.timelineDesc}>{workout.duration_minutes} mins • Physical Activity</Text>
                            </Card>
                        </View>
                    ))}

                    {/* Render Meals */}
                    {dailyMeals.map((meal, idx) => (
                        <View key={`m-${idx}`} style={styles.timelineItem}>
                            <View style={[styles.timelineIcon, { backgroundColor: theme.colors.success }]}>
                                <FontAwesome5 name="utensils" size={14} color="#FFF" />
                            </View>
                            <Card style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>{meal.meal_type.toUpperCase()}</Text>
                                <Text style={styles.timelineDesc}>{meal.total_calories} kcal • {meal.logs?.length || 0} items</Text>
                                <View style={styles.timelineMacros}>
                                    <Text style={styles.miniMacro}>P: {meal.total_protein}g</Text>
                                    <Text style={styles.miniMacro}>C: {meal.total_carbs}g</Text>
                                    <Text style={styles.miniMacro}>F: {meal.total_fats}g</Text>
                                </View>
                            </Card>
                        </View>
                    ))}
                </View>
            )}
          </>
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  card: {
    marginHorizontal: theme.spacing.xxl,
    marginVertical: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
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
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  statLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  dateLabel: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  macroItem: {
    marginHorizontal: 15,
  },
  macroLabel: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
  },
  hydrationCard: {
    marginHorizontal: theme.spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  hydrationTitle: {
    ...theme.typography.h5,
    color: theme.colors.textPrimary,
  },
  hydrationSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  timeline: {
    marginHorizontal: theme.spacing.xxl,
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
    padding: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timelineTitle: {
    ...theme.typography.h5,
    color: theme.colors.textPrimary,
  },
  timelineDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  timelineMacros: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  miniMacro: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginRight: 10,
  },
  quoteBlock: {
    flexDirection: 'row',
    backgroundColor: theme.colors.accentPinkLight,
    padding: 14,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.1)',
    marginBottom: 16,
  },
  quoteText: {
    flex: 1,
    ...theme.typography.captionStrong,
    color: theme.colors.primary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionsBlock: {
    marginTop: 5,
  },
  actionsHeading: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  actionRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: theme.radii.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  checkBoxCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkBoxCircleDone: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  actionRowText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
  },
  actionRowTextDone: {
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
});
