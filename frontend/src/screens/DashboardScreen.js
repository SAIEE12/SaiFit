import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
  TouchableWithoutFeedback
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';
import { theme } from '../theme';
import ScreenContainer from '../components/ui/ScreenContainer';
import { SectionHeader } from '../components/ui/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AICoachCard from '../components/ui/AICoachCard';
import Badge from '../components/ui/Badge';
import { EmptyState } from '../components/ui/StateViews';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Hydration Default Constant
const DEFAULT_HYDRATION_GOAL = 3000;

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  // Dashboard Date & Logs State
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [nutritionSummary, setNutritionSummary] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [hydration, setHydration] = useState(0);
  const [dailyWorkouts, setDailyWorkouts] = useState([]);
  const [dailyMeals, setDailyMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [insightExpanded, setInsightExpanded] = useState(false);
  const [username, setUsername] = useState('Fitness Fan');
  
  // Dynamic Goals State
  const [calorieGoal, setCalorieGoal] = useState(2200);
  const [proteinGoal, setProteinGoal] = useState(140);
  const [carbsGoal, setCarbsGoal] = useState(200);
  const [fatsGoal, setFatsGoal] = useState(65);
  const [hydrationGoal, setHydrationGoal] = useState(DEFAULT_HYDRATION_GOAL);

  // Animation values
  const caloriesAnim = useRef(new Animated.Value(0)).current;
  const proteinAnim = useRef(new Animated.Value(0)).current;
  const carbsAnim = useRef(new Animated.Value(0)).current;
  const fatsAnim = useRef(new Animated.Value(0)).current;
  
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-15)).current;
  const pulseDot = useRef(new Animated.Value(1)).current;
  const sparkleOpacity = useRef(new Animated.Value(0.6)).current;
  const skeletonAlpha = useRef(new Animated.Value(0.3)).current;

  // Staggered entrance animations
  const entranceAnims = useRef([
    new Animated.Value(0), // calendar
    new Animated.Value(0), // calories card
    new Animated.Value(0), // macros card
    new Animated.Value(0), // coach card
    new Animated.Value(0), // health metrics
    new Animated.Value(0), // activity feed
  ]).current;

  // Button pressed states (Press-scale animations)
  const bellScale = useRef(new Animated.Value(1)).current;
  const plusScale = useRef(new Animated.Value(1)).current;
  const minusScale = useRef(new Animated.Value(1)).current;
  const workoutArrowScale = useRef(new Animated.Value(1)).current;

  // Notification stream states
  const [showNotifications, setShowNotifications] = useState(false);
  const [coachTone, setCoachTone] = useState('Supportive'); // Supportive | Direct | Challenger
  const [backupNotifications, setBackupNotifications] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const [undoTimeoutId, setUndoTimeoutId] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      category: 'AI COACH ALERT',
      time: 'Just now',
      title: 'New Recovery Plan Generated',
      desc: 'Based on your active streaks, your custom workouts for tomorrow are ready to view!',
      isRead: false,
      isPinned: false,
      isMuted: false,
      icon: 'sparkles',
      iconType: 'ionicons',
      color: theme.colors.primary,
      bgColor: theme.colors.primaryLight
    },
    {
      id: 2,
      category: 'HYDRATION TARGET',
      time: '2h ago',
      title: 'Hydration Milestone Reached',
      desc: 'Awesome job! You have logged more than 50% of your daily water intake target.',
      isRead: false,
      isPinned: false,
      isMuted: false,
      icon: 'water',
      iconType: 'material',
      color: theme.colors.info,
      bgColor: theme.colors.infoLight
    },
    {
      id: 3,
      category: 'NUTRITION TARGET',
      time: '4h ago',
      title: 'Excellent Macro Balance',
      desc: 'Your latest logged lunch meal has met today\'s lean protein target goal.',
      isRead: true,
      isPinned: false,
      isMuted: false,
      icon: 'food-apple',
      iconType: 'material',
      color: theme.colors.success,
      bgColor: theme.colors.successLight
    },
    {
      id: 4,
      category: 'STREAK MILESTONE',
      time: 'Yesterday',
      title: '3 Days Active Streak',
      desc: 'Keep pushing forward! You have logged your active targets three days in a row.',
      isRead: true,
      isPinned: false,
      isMuted: false,
      icon: 'award',
      iconType: 'feather',
      color: theme.colors.warning,
      bgColor: theme.colors.warningLight
    }
  ]);

  // Trigger loading data on focus or selectedDate change
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [selectedDate])
  );

  // Entrance and loop animations setup
  useEffect(() => {
    // Header entrance animation
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerTranslateY, { toValue: 0, duration: 400, useNativeDriver: true })
    ]).start();

    // Staggered layout animations
    const anims = entranceAnims.map(anim =>
      Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true })
    );
    Animated.stagger(80, anims).start();

    // Sparkle shimmer loop
    const sparkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(sparkleOpacity, { toValue: 0.6, duration: 800, useNativeDriver: true })
      ])
    );
    sparkleLoop.start();

    return () => sparkleLoop.stop();
  }, []);

  // Pulse notification dot loop when unread notifications are present
  const hasUnread = notifications.some(n => !n.isRead);
  useEffect(() => {
    let pulse;
    if (hasUnread) {
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseDot, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseDot, { toValue: 1, duration: 600, useNativeDriver: true })
        ])
      );
      pulse.start();
    } else {
      pulseDot.setValue(1);
    }
    return () => pulse && pulse.stop();
  }, [hasUnread]);

  // Breathing skeleton loader animation loop
  useEffect(() => {
    let skeletonLoop;
    if (loading) {
      skeletonLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonAlpha, { toValue: 0.7, duration: 600, useNativeDriver: true }),
          Animated.timing(skeletonAlpha, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ])
      );
      skeletonLoop.start();
    } else {
      skeletonAlpha.setValue(0.3);
    }
    return () => skeletonLoop && skeletonLoop.stop();
  }, [loading]);

  // Dynamic Progress bar width updates
  useEffect(() => {
    Animated.parallel([
      Animated.timing(caloriesAnim, {
        toValue: Math.min(1, nutritionSummary.calories / calorieGoal),
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(proteinAnim, {
        toValue: Math.min(1, nutritionSummary.protein / proteinGoal),
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(carbsAnim, {
        toValue: Math.min(1, nutritionSummary.carbs / carbsGoal),
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(fatsAnim, {
        toValue: Math.min(1, nutritionSummary.fats / fatsGoal),
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();
  }, [nutritionSummary, calorieGoal, proteinGoal, carbsGoal, fatsGoal]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [recRes, mealsRes, workoutsRes, hydrationRes, profileRes] = await Promise.all([
        apiClient.get(`/recommendations?date=${selectedDate}&today=${getLocalDateString()}`),
        apiClient.get(`/nutrition/meals?date=${selectedDate}`),
        apiClient.get(`/workouts?date=${selectedDate}`),
        apiClient.get(`/hydration?date=${selectedDate}`),
        apiClient.get('/profile')
      ]);

      setRecommendation(recRes.data);
      setDailyWorkouts(workoutsRes.data);
      setDailyMeals(mealsRes.data);
      setHydration(hydrationRes.data.amount_ml || 0);

      // Parse goals and profile settings
      if (profileRes.data) {
        const profile = profileRes.data.profile;
        const user = profileRes.data.user;
        const goals = profileRes.data.goals;
        
        if (user && user.username) {
          setUsername(user.username);
        } else if (profile && profile.full_name) {
          setUsername(profile.full_name);
        }

        if (goals) {
          setCalorieGoal(goals.target_calories || 2200);
          setProteinGoal(goals.target_protein || 140);
          setCarbsGoal(goals.target_carbs || 200);
          setFatsGoal(goals.target_fats || 65);
        }
        if (profile && profile.target_water_ml) {
          setHydrationGoal(profile.target_water_ml);
        } else {
          setHydrationGoal(DEFAULT_HYDRATION_GOAL);
        }
      }

      // Calculate logged macros totals
      let totals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      mealsRes.data.forEach(meal => {
        totals.calories += meal.total_calories || 0;
        totals.protein += meal.total_protein || 0;
        totals.carbs += meal.total_carbs || 0;
        totals.fats += meal.total_fats || 0;
      });
      setNutritionSummary(totals);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Tactile Button interaction helpers
  const handlePressInBell = () => Animated.spring(bellScale, { toValue: 0.9, useNativeDriver: true }).start();
  const handlePressOutBell = () => Animated.spring(bellScale, { toValue: 1, useNativeDriver: true }).start();

  const handlePressInPlus = () => Animated.spring(plusScale, { toValue: 0.88, useNativeDriver: true }).start();
  const handlePressOutPlus = () => Animated.spring(plusScale, { toValue: 1, useNativeDriver: true }).start();

  const handlePressInMinus = () => Animated.spring(minusScale, { toValue: 0.88, useNativeDriver: true }).start();
  const handlePressOutMinus = () => Animated.spring(minusScale, { toValue: 1, useNativeDriver: true }).start();

  const handlePressInArrow = () => Animated.spring(workoutArrowScale, { toValue: 0.88, useNativeDriver: true }).start();
  const handlePressOutArrow = () => Animated.spring(workoutArrowScale, { toValue: 1, useNativeDriver: true }).start();

  // Water intake update actions
  const adjustHydration = async (amount) => {
    if (amount < 0 && hydration <= 0) return;
    try {
      await apiClient.post('/hydration/log', { amount_ml: amount, date: selectedDate });
      setHydration(prev => Math.max(0, prev + amount));
    } catch (e) {
      console.error('Failed to update hydration:', e);
    }
  };

  // Notifications flow logic
  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearAllNotifications = () => {
    setBackupNotifications(notifications);
    setNotifications([]);
    setShowUndo(true);

    if (undoTimeoutId) clearTimeout(undoTimeoutId);

    const timeout = setTimeout(() => {
      setShowUndo(false);
      setBackupNotifications(null);
    }, 5000);
    setUndoTimeoutId(timeout);
  };

  const dismissNotification = (id) => {
    setBackupNotifications(notifications);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setShowUndo(true);

    if (undoTimeoutId) clearTimeout(undoTimeoutId);

    const timeout = setTimeout(() => {
      setShowUndo(false);
      setBackupNotifications(null);
    }, 5000);
    setUndoTimeoutId(timeout);
  };

  const undoAction = () => {
    if (backupNotifications) {
      setNotifications(backupNotifications);
      setBackupNotifications(null);
      setShowUndo(false);
      if (undoTimeoutId) clearTimeout(undoTimeoutId);
    }
  };

  const openContextMenu = (notif) => {
    setSelectedNotification(notif);
    setShowContextMenu(true);
  };

  const toggleReadStatus = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n));
    setShowContextMenu(false);
  };

  const togglePinStatus = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
    setShowContextMenu(false);
  };

  const toggleMuteStatus = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isMuted: !n.isMuted } : n));
    setShowContextMenu(false);
  };

  const handleDeleteFromMenu = (id) => {
    setShowContextMenu(false);
    dismissNotification(id);
  };

  // Notifications contents mapping per tone settings
  const getNotificationContent = (item) => {
    if (item.id === 1) {
      if (coachTone === 'Challenger') {
        return {
          title: 'Tomorrow is War! Plan Ready ⚡',
          desc: 'Your active streak is on fire. Your tomorrow workout setup is loaded and waiting. Tap Start Workout to accept!'
        };
      } else if (coachTone === 'Direct') {
        return {
          title: 'AI Recommendation Formulated',
          desc: 'Tomorrow recovery workouts routine is calculated. Click Start Workout to load settings.'
        };
      } else {
        return {
          title: 'New Recovery Plan Generated',
          desc: 'Based on your active streaks, your custom workouts for tomorrow are ready to view! Let\'s keep it up.'
        };
      }
    } else if (item.id === 2) {
      if (coachTone === 'Challenger') {
        return {
          title: 'HYDRATE OR DEFEAT! 💧',
          desc: 'Logged 50% of your water target. Don\'t slow down now—refuel your active muscles with +250ml below!'
        };
      } else if (coachTone === 'Direct') {
        return {
          title: 'Hydration Target: 50% Logged',
          desc: 'Logged: 1500ml / 3000ml. Click +250ml below to log additional volume.'
        };
      } else {
        return {
          title: 'Hydration Milestone Reached',
          desc: 'Awesome job! You have logged more than 50% of your daily water intake. Let\'s drink a bit more.'
        };
      }
    } else if (item.id === 3) {
      if (coachTone === 'Challenger') {
        return {
          title: 'FUEL LOADED: Protein Goal Locked 🍖',
          desc: 'Sensational lunch tracking. You fed your muscle tissue exactly the amino acids required for growth!'
        };
      } else if (coachTone === 'Direct') {
        return {
          title: 'Lunch Protein Met Goals',
          desc: 'Logged lunch contains optimal protein counts aligned with current macro targets.'
        };
      }
    } else if (item.id === 4) {
      if (coachTone === 'Challenger') {
        return {
          title: '3-DAY STREAK: UNSTOPPABLE! 🔥',
          desc: 'Consistency is power. Three consecutive days of logging. Do not let this record drop!'
        };
      } else if (coachTone === 'Direct') {
        return {
          title: 'Logged: 3 Days Consecutive',
          desc: 'All targets captured consecutively for three days.'
        };
      }
    }
    return { title: item.title, desc: item.desc };
  };

  const renderNotificationIcon = (notif) => {
    if (notif.iconType === 'ionicons') {
      return <Ionicons name={notif.icon} size={18} color={notif.color} />;
    } else if (notif.iconType === 'material') {
      return <MaterialCommunityIcons name={notif.icon} size={18} color={notif.color} />;
    } else {
      return <Feather name={notif.icon} size={18} color={notif.color} />;
    }
  };

  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  // Dynamic styling helper for staggered mount animations
  const getEntranceStyle = (index) => ({
    opacity: entranceAnims[index],
    transform: [
      {
        translateY: entranceAnims[index].interpolate({
          inputRange: [0, 1],
          outputRange: [15, 0],
        }),
      },
    ],
  });

  const caloriesLeft = calorieGoal - nutritionSummary.calories;
  const isCalorieLimitExceeded = caloriesLeft < 0;

  // Render skeletons helper
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <Animated.View style={[styles.skeletonCard, { opacity: skeletonAlpha, height: 125 }]} />
      <View style={styles.skeletonMacrosRow}>
        <Animated.View style={[styles.skeletonCard, { opacity: skeletonAlpha, flex: 1, height: 95 }]} />
        <Animated.View style={[styles.skeletonCard, { opacity: skeletonAlpha, flex: 1, height: 95 }]} />
        <Animated.View style={[styles.skeletonCard, { opacity: skeletonAlpha, flex: 1, height: 95 }]} />
      </View>
      <Animated.View style={[styles.skeletonCard, { opacity: skeletonAlpha, height: 140 }]} />
    </View>
  );

  return (
    <ScreenContainer scrollable={false} keyboardAvoiding={false}>
      {/* Premium Greeting Header */}
      <Animated.View
        style={[
          styles.greetingContainer,
          {
            paddingTop: Math.max(theme.spacing.lg, insets.top),
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }]
          }
        ]}
      >
        <View style={styles.headerTextGroup}>
          <Text style={styles.greetingTitle}>Hi, {username}! 👋</Text>
          <Text style={styles.greetingSubtitle}>
            {selectedDate === getLocalDateString() ? 'TODAY' : selectedDate.toUpperCase()}
          </Text>
        </View>
        <TouchableWithoutFeedback
          onPress={() => setShowNotifications(true)}
          onPressIn={handlePressInBell}
          onPressOut={handlePressOutBell}
          accessibilityLabel="Open notification alerts"
          accessibilityRole="button"
        >
          <Animated.View style={[styles.iconBtn, { transform: [{ scale: bellScale }] }]}>
            <Feather name="bell" size={22} color={theme.colors.textPrimary} />
            {hasUnread && (
              <Animated.View style={[styles.notificationDot, { transform: [{ scale: pulseDot }] }]} />
            )}
          </Animated.View>
        </TouchableWithoutFeedback>
      </Animated.View>



      {/* Main Content Area */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {loading ? (
          renderSkeleton()
        ) : (
          <>
            {/* 1. Calories Card */}
            <Animated.View style={getEntranceStyle(1)}>
              <Card variant="elevated" style={styles.calorieCard}>
                <View style={styles.calorieHeader}>
                  <View>
                    <Text style={styles.cardSectionLabel}>CALORIES CONSUMED</Text>
                    <Text style={styles.calorieValue}>
                      {nutritionSummary.calories} <Text style={styles.calorieTarget}>/ {calorieGoal} kcal</Text>
                    </Text>
                  </View>
                  <Badge
                    variant={isCalorieLimitExceeded ? 'danger' : 'primary'}
                    label={isCalorieLimitExceeded ? `${Math.abs(caloriesLeft)} over` : `${caloriesLeft} left`}
                    style={styles.caloriePill}
                  />
                </View>
                <View style={styles.calorieProgressBg}>
                  <Animated.View
                    style={[
                      styles.calorieProgressFill,
                      {
                        width: caloriesAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                        backgroundColor: isCalorieLimitExceeded ? theme.colors.danger : theme.colors.primary,
                      }
                    ]}
                  />
                </View>
              </Card>
            </Animated.View>

            {/* 2. Macros Tracker Cards (Non-scrollable, resized side-by-side) */}
            <Animated.View style={getEntranceStyle(2)}>
              <SectionHeader title="MACRO TRACKER" />
              <View style={styles.macrosRow}>
                {/* Protein Card */}
                <Card style={[styles.macroCard, { borderLeftColor: theme.colors.primary, borderLeftWidth: 3.5 }]}>
                  <Text style={styles.macroTitle} numberOfLines={1} adjustsFontSizeToFit>Protein</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.macroValue}>
                    {nutritionSummary.protein}g<Text style={styles.macroTarget}>/{proteinGoal}g</Text>
                  </Text>
                  <View style={styles.progressBarBg}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          width: proteinAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                          backgroundColor: theme.colors.primary
                        }
                      ]}
                    />
                  </View>
                </Card>

                {/* Carbs Card */}
                <Card style={[styles.macroCard, { borderLeftColor: theme.colors.success, borderLeftWidth: 3.5 }]}>
                  <Text style={styles.macroTitle} numberOfLines={1} adjustsFontSizeToFit>Carbs</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.macroValue}>
                    {nutritionSummary.carbs}g<Text style={styles.macroTarget}>/{carbsGoal}g</Text>
                  </Text>
                  <View style={styles.progressBarBg}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          width: carbsAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                          backgroundColor: theme.colors.success
                        }
                      ]}
                    />
                  </View>
                </Card>

                {/* Fats Card */}
                <Card style={[styles.macroCard, { borderLeftColor: theme.colors.warning, borderLeftWidth: 3.5 }]}>
                  <Text style={styles.macroTitle} numberOfLines={1} adjustsFontSizeToFit>Fats</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.macroValue}>
                    {nutritionSummary.fats}g<Text style={styles.macroTarget}>/{fatsGoal}g</Text>
                  </Text>
                  <View style={styles.progressBarBg}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          width: fatsAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                          backgroundColor: theme.colors.warning
                        }
                      ]}
                    />
                  </View>
                </Card>
              </View>
            </Animated.View>

            {/* 3. AI Coach Card or Past Data Banner */}
            <Animated.View style={{ opacity: entranceAnims[3], width: '100%' }}>
              {recommendation && recommendation.viewingPast ? (
                <Card style={styles.pastDataIndicator}>
                  <View style={styles.pastDataRow}>
                    <Feather name="clock" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                    <Text style={styles.pastDataText}>Viewing historical logs for {selectedDate}</Text>
                  </View>
                </Card>
              ) : (
                recommendation && !recommendation.disabled && (
                  <AICoachCard
                    title="COACH'S DAILY INSIGHT"
                    scoreLabel={recommendation.isError ? undefined : "RECOVERY STATUS"}
                    scoreValue={recommendation.isError ? undefined : "Optimal Recovery"}
                    narrative={recommendation.recovery_advice}
                    expanded={insightExpanded}
                    isError={!!recommendation.isError}
                    onToggle={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setInsightExpanded(!insightExpanded);
                    }}
                    segments={
                      insightExpanded && recommendation.workout_plan
                        ? [
                            {
                              icon: 'trending-up',
                              title: 'Workout Focus',
                              text: recommendation.workout_plan,
                              color: theme.colors.primary,
                            },
                          ]
                        : []
                    }
                    milestones={
                      insightExpanded && recommendation.exercises && recommendation.exercises.length > 0
                        ? recommendation.exercises
                        : []
                    }
                    actions={
                      recommendation.isError ? (
                        <Button
                          title="Retry Connection"
                          variant="primary"
                          onPress={fetchDashboardData}
                        />
                      ) : null
                    }
                  />
                )
              )}
            </Animated.View>

            {/* 4. Health Metrics & Quick Logs */}
            <Animated.View style={getEntranceStyle(4)}>
              <SectionHeader title="HEALTH METRICS" />

              {/* Hydration Card */}
              <Card style={styles.metricCard}>
                <View style={styles.metricRow}>
                  <View style={[styles.metricIconWrap, { backgroundColor: theme.colors.infoLight }]}>
                    <MaterialCommunityIcons name="water" size={22} color={theme.colors.info} />
                  </View>
                  <View>
                    <Text style={styles.metricLabel}>Water Intake</Text>
                    <Text style={styles.metricValue}>{hydration} / {hydrationGoal} ml</Text>
                  </View>
                </View>
                <View style={styles.hydrationActionRow}>
                  {/* Decrement (-) Button */}
                  <TouchableWithoutFeedback
                    onPress={() => hydration > 0 && adjustHydration(-250)}
                    onPressIn={() => hydration > 0 && handlePressInMinus()}
                    onPressOut={() => hydration > 0 && handlePressOutMinus()}
                    disabled={hydration <= 0}
                    accessibilityLabel="Log 250 milliliters water less"
                    accessibilityRole="button"
                  >
                    <Animated.View style={[
                      styles.actionButton,
                      styles.minusBtn,
                      { transform: [{ scale: minusScale }] },
                      hydration <= 0 && { opacity: 0.4 }
                    ]}>
                      <Feather name="minus" size={16} color={theme.colors.info} />
                    </Animated.View>
                  </TouchableWithoutFeedback>

                  {/* Increment (+) Button */}
                  <TouchableWithoutFeedback
                    onPress={() => adjustHydration(250)}
                    onPressIn={handlePressInPlus}
                    onPressOut={handlePressOutPlus}
                    accessibilityLabel="Log 250 milliliters water more"
                    accessibilityRole="button"
                  >
                    <Animated.View style={[styles.actionButton, styles.plusBtn, { transform: [{ scale: plusScale }] }]}>
                      <Feather name="plus" size={16} color="#FFF" />
                    </Animated.View>
                  </TouchableWithoutFeedback>
                </View>
              </Card>

              {/* Workouts Card */}
              <Card style={styles.metricCard}>
                <View style={styles.metricRow}>
                  <View style={[styles.metricIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
                    <MaterialCommunityIcons name="run" size={22} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                    <Text style={styles.metricLabel}>Daily Workouts</Text>
                    <Text style={styles.metricValue}>{dailyWorkouts.length} logged today</Text>
                    {dailyWorkouts.length > 0 && (
                      <View style={styles.workoutPillsWrapper}>
                        {dailyWorkouts.map((workout, index) => (
                          <View key={index} style={styles.workoutIndicatorBadge}>
                            <FontAwesome5 name="dumbbell" size={10} color={theme.colors.primary} style={{ marginRight: 4 }} />
                            <Text style={styles.workoutIndicatorText} numberOfLines={1}>{workout.notes || 'Workout'}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
                <TouchableWithoutFeedback
                  onPress={() => navigation.navigate('Workouts')}
                  onPressIn={handlePressInArrow}
                  onPressOut={handlePressOutArrow}
                  accessibilityLabel="Navigate to workouts details page"
                  accessibilityRole="button"
                >
                  <Animated.View style={[styles.arrowBtn, { transform: [{ scale: workoutArrowScale }] }]}>
                    <Feather name="arrow-right" size={18} color="#FFF" />
                  </Animated.View>
                </TouchableWithoutFeedback>
              </Card>
            </Animated.View>

            {/* 5. Activity Empty States Handling */}
            {dailyMeals.length === 0 && dailyWorkouts.length === 0 && (
              <Animated.View style={getEntranceStyle(5)}>
                <EmptyState
                  icon="activity"
                  title="No logged activity yet"
                  description="Use the tabs below to log your meals and workouts for the day!"
                />
              </Animated.View>
            )}

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setShowNotifications(false)} style={styles.closeHeaderBtn}>
              <Feather name="chevron-down" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Notifications Toolbar */}
            <View style={styles.notificationToolsBar}>
              <Text style={styles.notificationCountText}>
                {notifications.filter(n => !n.isRead).length} unread
              </Text>
              <View style={styles.toolsActions}>
                {hasUnread && (
                  <TouchableOpacity onPress={markAllAsRead} style={styles.toolActionBtn}>
                    <Feather name="check-square" size={13} color={theme.colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.toolActionText}>Mark Read</Text>
                  </TouchableOpacity>
                )}
                {notifications.length > 0 && (
                  <>
                    {hasUnread && <View style={styles.toolSeparator} />}
                    <TouchableOpacity onPress={clearAllNotifications} style={styles.toolActionBtn}>
                      <Feather name="trash-2" size={13} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.toolActionText, { color: theme.colors.textSecondary }]}>Clear All</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Empathy Tone Selector */}
            <View style={styles.toneSelectorContainer}>
              <TouchableOpacity onPress={() => setCoachTone('Supportive')} style={[styles.toneBtn, coachTone === 'Supportive' && styles.toneBtnActive]}>
                <Text style={[styles.toneBtnText, coachTone === 'Supportive' && styles.toneBtnTextActive]}>Supportive</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCoachTone('Direct')} style={[styles.toneBtn, coachTone === 'Direct' && styles.toneBtnActive]}>
                <Text style={[styles.toneBtnText, coachTone === 'Direct' && styles.toneBtnTextActive]}>Direct</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCoachTone('Challenger')} style={[styles.toneBtn, coachTone === 'Challenger' && styles.toneBtnActive]}>
                <Text style={[styles.toneBtnText, coachTone === 'Challenger' && styles.toneBtnTextActive]}>Challenger 🔥</Text>
              </TouchableOpacity>
            </View>

            {/* Notification List Stream */}
            {sortedNotifications.map((item) => {
              const content = getNotificationContent(item);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  onPress={() => markAsRead(item.id)}
                  onLongPress={() => openContextMenu(item)}
                  delayLongPress={400}
                  style={[
                    styles.notificationCard,
                    !item.isRead && styles.notificationCardUnread,
                    item.isPinned && styles.notificationCardPinned
                  ]}
                >
                  <View style={[styles.notificationIconWrap, { backgroundColor: item.bgColor }]}>
                    {renderNotificationIcon(item)}
                  </View>

                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeaderRow}>
                      <View style={styles.categoryBadgeRow}>
                        {item.isPinned && <MaterialCommunityIcons name="pin" size={10} color={theme.colors.warning} style={{ marginRight: 4 }} />}
                        {item.isMuted && <Feather name="bell-off" size={10} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />}
                        <Text style={[styles.notificationCategory, { color: item.color }]}>{item.category}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {!item.isRead && <View style={styles.unreadIndicatorDot} />}
                        <Text style={styles.notificationTime}>{item.time}</Text>
                      </View>
                    </View>

                    <Text style={[styles.notificationTextTitle, !item.isRead && styles.notificationTextTitleUnread]}>
                      {content.title}
                    </Text>
                    <Text style={styles.notificationDesc}>{content.desc}</Text>

                    {/* Quick Actions */}
                    {!item.isRead && item.id === 2 && (
                      <TouchableOpacity
                        style={styles.quickActionBtn}
                        onPress={() => {
                          adjustHydration(250);
                          markAsRead(item.id);
                        }}
                      >
                        <MaterialCommunityIcons name="water-plus" size={14} color={theme.colors.info} style={{ marginRight: 4 }} />
                        <Text style={[styles.quickActionText, { color: theme.colors.info }]}>+ 250ml</Text>
                      </TouchableOpacity>
                    )}

                    {!item.isRead && item.id === 1 && (
                      <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: theme.colors.border }]}
                        onPress={() => {
                          markAsRead(item.id);
                          setShowNotifications(false);
                          navigation.navigate('Workouts');
                        }}
                      >
                        <Feather name="play" size={12} color={theme.colors.textPrimary} style={{ marginRight: 4 }} />
                        <Text style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>Start Workout</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {notifications.length === 0 && (
              <EmptyState
                icon="bell"
                title="All Clean!"
                description="Your custom coach feed is fully up to date."
              />
            )}

            <View style={{ height: 60 }} />
          </ScrollView>

          {/* Undo Float Snackbar */}
          {showUndo && (
            <View style={styles.undoSnackbar}>
              <Text style={styles.undoText}>Cleared successfully</Text>
              <TouchableOpacity onPress={undoAction} style={styles.undoBtn}>
                <Text style={styles.undoBtnText}>UNDO</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Context Menu Actions Sheet */}
      <Modal
        visible={showContextMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowContextMenu(false)}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => setShowContextMenu(false)} style={styles.sheetOverlay}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />

            {selectedNotification && (
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetCategory, { color: selectedNotification.color }]}>{selectedNotification.category}</Text>
                <Text style={styles.sheetTitle} numberOfLines={1}>{selectedNotification.title}</Text>
              </View>
            )}

            {selectedNotification && (
              <View style={styles.sheetActionsList}>
                <TouchableOpacity style={styles.sheetActionRow} onPress={() => toggleReadStatus(selectedNotification.id)}>
                  <View style={styles.actionIconWrap}>
                    <Feather name={selectedNotification.isRead ? "mail" : "eye"} size={18} color={theme.colors.textPrimary} />
                  </View>
                  <Text style={styles.actionRowText}>
                    {selectedNotification.isRead ? 'Mark as Unread' : 'Mark as Read'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sheetActionRow} onPress={() => togglePinStatus(selectedNotification.id)}>
                  <View style={styles.actionIconWrap}>
                    <MaterialCommunityIcons name="pin" size={18} color={selectedNotification.isPinned ? theme.colors.primary : theme.colors.textPrimary} />
                  </View>
                  <Text style={styles.actionRowText}>
                    {selectedNotification.isPinned ? 'Unpin from Top' : 'Pin to Top'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sheetActionRow} onPress={() => toggleMuteStatus(selectedNotification.id)}>
                  <View style={styles.actionIconWrap}>
                    <Feather name={selectedNotification.isMuted ? "bell" : "bell-off"} size={18} color={theme.colors.textPrimary} />
                  </View>
                  <Text style={styles.actionRowText}>
                    {selectedNotification.isMuted ? 'Unmute Alerts' : 'Mute Category Alerts'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.sheetActionRow, styles.deleteActionRow]} onPress={() => handleDeleteFromMenu(selectedNotification.id)}>
                  <View style={[styles.actionIconWrap, { backgroundColor: theme.colors.dangerLight }]}>
                    <Feather name="trash-2" size={18} color={theme.colors.danger} />
                  </View>
                  <Text style={[styles.actionRowText, { color: theme.colors.danger, fontWeight: '700' }]}>
                    Delete Notification
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.huge,
    flexGrow: 1,
  },
  greetingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  headerTextGroup: {
    flex: 1,
  },
  greetingTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  greetingSubtitle: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...theme.shadows.soft,
  },
  notificationDot: {
    position: 'absolute',
    top: 13,
    right: 13,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  calorieCard: {
    marginHorizontal: theme.spacing.xxl,
    marginVertical: theme.spacing.md,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardSectionLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  calorieValue: {
    ...theme.typography.metricSmall,
    color: theme.colors.textPrimary,
  },
  calorieTarget: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  caloriePill: {
    alignSelf: 'center',
  },
  calorieProgressBg: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  calorieProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
    gap: 8,
  },
  macroCard: {
    flex: 1,
    padding: theme.spacing.md,
    ...theme.shadows.soft,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  macroTitle: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  macroValue: {
    ...theme.typography.bodySmall,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  macroTarget: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: theme.colors.border,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  metricCard: {
    marginHorizontal: theme.spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderColor: theme.colors.border,
    borderWidth: 1,
    ...theme.shadows.soft,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  metricLabel: {
    ...theme.typography.h5,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  metricValue: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  arrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.primaryGlow,
  },
  hydrationActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  minusBtn: {
    backgroundColor: theme.colors.infoLight,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.15)',
  },
  plusBtn: {
    backgroundColor: theme.colors.info,
  },
  workoutPillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  workoutIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  workoutIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    maxWidth: 70,
  },
  pastDataIndicator: {
    marginHorizontal: theme.spacing.xxl,
    marginVertical: theme.spacing.md,
    backgroundColor: theme.colors.border,
    borderColor: theme.colors.borderStrong,
    borderWidth: 1,
  },
  pastDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  pastDataText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
  },
  skeletonContainer: {
    paddingHorizontal: theme.spacing.xxl,
    gap: 16,
    marginTop: theme.spacing.md,
  },
  skeletonCard: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.lg,
  },
  skeletonMacrosRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    position: 'relative',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  closeHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  modalBody: {
    paddingHorizontal: theme.spacing.xl,
  },
  notificationToolsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  notificationCountText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
  },
  toolsActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  toolActionText: {
    ...theme.typography.captionStrong,
    color: theme.colors.primary,
  },
  toolSeparator: {
    width: 1,
    height: 10,
    backgroundColor: theme.colors.border,
    marginHorizontal: 8,
  },
  toneSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: 3,
    marginBottom: 20,
  },
  toneBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radii.md,
  },
  toneBtnActive: {
    backgroundColor: '#FFF',
    ...theme.shadows.soft,
  },
  toneBtnText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
  },
  toneBtnTextActive: {
    color: theme.colors.textPrimary,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.soft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  notificationCardUnread: {
    borderColor: theme.colors.infoLight,
  },
  notificationCardPinned: {
    borderColor: theme.colors.warningLight,
    borderLeftWidth: 3.5,
    borderLeftColor: theme.colors.warning,
  },
  notificationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
    alignSelf: 'flex-start',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationCategory: {
    ...theme.typography.labelSmall,
  },
  unreadIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.info,
  },
  notificationTime: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    letterSpacing: 0,
  },
  notificationTextTitle: {
    ...theme.typography.h5,
    color: theme.colors.textSecondary,
    marginBottom: 3,
  },
  notificationTextTitleUnread: {
    color: theme.colors.textPrimary,
  },
  notificationDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
  quickActionBtn: {
    backgroundColor: theme.colors.infoLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  quickActionText: {
    ...theme.typography.captionStrong,
  },
  undoSnackbar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.premium,
    zIndex: 2000,
  },
  undoText: {
    color: '#FFF',
    ...theme.typography.bodySmall,
    fontWeight: '600',
  },
  undoBtn: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radii.md,
  },
  undoBtnText: {
    color: theme.colors.primary,
    ...theme.typography.captionStrong,
    letterSpacing: 0.5,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: theme.radii.xxl,
    borderTopRightRadius: theme.radii.xxl,
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: 40,
    paddingTop: 12,
    ...theme.shadows.premium,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    backgroundColor: theme.colors.border,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sheetCategory: {
    ...theme.typography.labelSmall,
    marginBottom: 4,
  },
  sheetTitle: {
    ...theme.typography.h5,
    color: theme.colors.textPrimary,
  },
  sheetActionsList: {
    gap: 8,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deleteActionRow: {
    borderColor: theme.colors.dangerLight,
    backgroundColor: theme.colors.dangerLight,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionRowText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
  },
});
