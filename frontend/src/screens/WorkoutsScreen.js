import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Animated,
  Platform,
  TouchableWithoutFeedback,
  RefreshControl,
  LayoutAnimation,
  UIManager
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { EmptyState } from '../components/ui/StateViews';
import ModalView from '../components/ui/ModalView';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function WorkoutsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const routeDate = route?.params?.date;

  // Selected date defaults to route parameter or current local date
  const [selectedDate, setSelectedDate] = useState(routeDate || getLocalDateString());
  const [workouts, setWorkouts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [exercisesList, setExercisesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Category selection filter state
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Workout checklist states
  const [checkedExercises, setCheckedExercises] = useState({});

  // Success confirm visual state
  const [gotItSuccess, setGotItSuccess] = useState(false);

  // Recommendation State
  const [recommendation, setRecommendation] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [showAiPlanModal, setShowAiPlanModal] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [addedExercises, setAddedExercises] = useState([]);

  // Log Activity Form State
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityName, setActivityName] = useState('');
  const [activityCategory, setActivityCategory] = useState('yoga');
  const [activityDuration, setActivityDuration] = useState('');
  const [activityIntensity, setActivityIntensity] = useState('medium');
  const [activityNotes, setActivityNotes] = useState('');
  const [activityTrackId, setActivityTrackId] = useState('');

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

  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-15)).current;
  const sparkleOpacity = useRef(new Animated.Value(0.6)).current;
  const skeletonAlpha = useRef(new Animated.Value(0.3)).current;
  const emptyStatePulse = useRef(new Animated.Value(1)).current;

  // Staggered entrance animations
  const entranceAnims = useRef([
    new Animated.Value(0), // Categories ribbon
    new Animated.Value(0), // Logs Header / list
    new Animated.Value(0), // Custom activities list
    new Animated.Value(0), // AI Coach suggestion card
  ]).current;

  // Press interaction scales
  const logGymScale = useRef(new Animated.Value(1)).current;
  const logActivityScale = useRef(new Animated.Value(1)).current;
  const viewPlanScale = useRef(new Animated.Value(1)).current;
  const gotItScale = useRef(new Animated.Value(1)).current;

  // Synchronize date selection from params
  useEffect(() => {
    if (routeDate) {
      setSelectedDate(routeDate);
    }
  }, [routeDate]);

  // Entrance and loop animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerTranslateY, { toValue: 0, duration: 400, useNativeDriver: true })
    ]).start();

    const anims = entranceAnims.map(anim =>
      Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true })
    );
    Animated.stagger(100, anims).start();

    const sparkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(sparkleOpacity, { toValue: 0.6, duration: 800, useNativeDriver: true })
      ])
    );
    sparkleLoop.start();

    return () => sparkleLoop.stop();
  }, []);

  // Pulse effect on empty state
  useEffect(() => {
    let pulse;
    if (workouts.length === 0 && activities.length === 0 && !loading) {
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(emptyStatePulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(emptyStatePulse, { toValue: 1, duration: 900, useNativeDriver: true })
        ])
      );
      pulse.start();
    }
    return () => pulse && pulse.stop();
  }, [workouts, activities, loading]);

  // Breathing skeleton loader animation
  useEffect(() => {
    let loop;
    if (loading) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonAlpha, { toValue: 0.7, duration: 600, useNativeDriver: true }),
          Animated.timing(skeletonAlpha, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
    } else {
      skeletonAlpha.setValue(0.3);
    }
    return () => loop && loop.stop();
  }, [loading]);

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
      const res = await apiClient.get(`/recommendations/workout-coach?date=${selectedDate}`);
      setRecommendation(res.data);
    } catch (e) {
      console.error('Failed to fetch recommendation:', e);
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
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      const res = await apiClient.get('/lifestyle/tracks');
      setTracks(res.data || []);
    } catch (e) {
      console.error('Failed to fetch tracks:', e);
    }
  };

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const [workoutsRes, activitiesRes] = await Promise.all([
        apiClient.get(`/workouts?date=${selectedDate}`),
        apiClient.get(`/activities?date=${selectedDate}`)
      ]);
      setWorkouts(workoutsRes.data || []);
      setActivities(activitiesRes.data || []);
    } catch (e) {
      console.error('Failed to fetch workouts/activities:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchWorkouts(), fetchRecommendation()]);
    setRefreshing(false);
  };

  const getActivityIcon = (category) => {
    switch (category) {
      case 'yoga': return 'spa';
      case 'meditation': return 'brain';
      case 'dance': return 'music';
      case 'strength': return 'dumbbell';
      case 'cardio': return 'running';
      default: return 'walking';
    }
  };

  const getActivityColor = (category) => {
    switch (category) {
      case 'yoga': return theme.colors.success;
      case 'meditation': return theme.colors.primary;
      case 'dance': return theme.colors.orange;
      case 'strength': return theme.colors.danger;
      case 'cardio': return theme.colors.info;
      default: return theme.colors.textSecondary;
    }
  };

  const handleDeleteActivity = async (id) => {
    showDialog(
      'Delete Log',
      'Are you sure you want to delete this activity log?',
      'danger',
      async () => {
        try {
          await apiClient.delete(`/activities/${id}`);
          fetchWorkouts();
        } catch (e) {
          showDialog('Failed', 'Could not delete activity log.', 'error');
        }
      },
      () => {},
      'Delete'
    );
  };

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
        setActivityName('');
        setActivityDuration('');
        setActivityNotes('');
        setActivityTrackId('');
        setActivityCategory('yoga');
        setActivityIntensity('medium');
        setShowActivityModal(false);
        fetchWorkouts();
      });
    } catch (e) {
      showDialog('Logging Failed', e.response?.data?.error || e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const fetchExercisesList = async () => {
    try {
      const res = await apiClient.get('/workouts/exercises');
      setExercisesList(res.data);
    } catch (e) {
      console.error('Failed to fetch exercises list:', e);
    }
  };

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
    updated[index][field] = value;
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
        setNotes('');
        setDuration('');
        setAddedExercises([]);
        setShowModal(false);
        fetchWorkouts();
      });
    } catch (e) {
      showDialog('Logging Failed', e.response?.data?.error || e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Categories metadata with matching DB values
  const categories = [
    { name: 'Chest', icon: 'stop-circle', color: theme.colors.orange },
    { name: 'Back', icon: 'align-center', color: theme.colors.primary },
    { name: 'Legs', icon: 'child', color: theme.colors.yellow },
    { name: 'Cardio', icon: 'running', color: theme.colors.info },
    { name: 'Shoulders', icon: 'user', color: theme.colors.success },
    { name: 'Arms', icon: 'activity', color: theme.colors.primary }
  ];

  const toggleCategory = (catName) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selectedCategory === catName) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(catName);
    }
  };

  // Got it click confirm handler
  const handleGotItPress = () => {
    setGotItSuccess(true);
    setTimeout(() => {
      setShowAiPlanModal(false);
      setGotItSuccess(false);
      setCheckedExercises({});
    }, 850);
  };

  // Press Scale Handlers
  const handlePressInLogGym = () => Animated.spring(logGymScale, { toValue: 0.9, useNativeDriver: true }).start();
  const handlePressOutLogGym = () => Animated.spring(logGymScale, { toValue: 1, useNativeDriver: true }).start();

  const handlePressInLogActivity = () => Animated.spring(logActivityScale, { toValue: 0.9, useNativeDriver: true }).start();
  const handlePressOutLogActivity = () => Animated.spring(logActivityScale, { toValue: 1, useNativeDriver: true }).start();

  const handlePressInViewPlan = () => Animated.spring(viewPlanScale, { toValue: 0.9, useNativeDriver: true }).start();
  const handlePressOutViewPlan = () => Animated.spring(viewPlanScale, { toValue: 1, useNativeDriver: true }).start();

  const handlePressInGotIt = () => Animated.spring(gotItScale, { toValue: 0.95, useNativeDriver: true }).start();
  const handlePressOutGotIt = () => Animated.spring(gotItScale, { toValue: 1, useNativeDriver: true }).start();

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

  // Category Render Helper
  const CategoryPill = ({ cat }) => {
    const isSelected = selectedCategory === cat.name;
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

    return (
      <TouchableWithoutFeedback
        onPress={() => toggleCategory(cat.name)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`Filter exercises database by ${cat.name}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
      >
        <Animated.View style={[styles.categoryItem, { transform: [{ scale }] }]}>
          <Card
            style={[
              styles.categoryIconWrap,
              isSelected && { backgroundColor: cat.color, borderColor: cat.color, ...theme.shadows.primaryGlow }
            ]}
          >
            <FontAwesome5 name={cat.icon} size={18} color={isSelected ? '#FFF' : cat.color} />
          </Card>
          <Text style={[styles.categoryName, isSelected && { color: theme.colors.textPrimary, fontWeight: '700' }]}>
            {cat.name}
          </Text>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };

  // Interactive Checklist Card helper
  const InteractiveExerciseCard = ({ exercise, idx }) => {
    const isChecked = !!checkedExercises[idx];
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

    return (
      <TouchableWithoutFeedback
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setCheckedExercises(prev => ({ ...prev, [idx]: !prev[idx] }));
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`Mark recommended exercise ${exercise} as complete`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked }}
      >
        <Animated.View style={{ transform: [{ scale }], marginBottom: 12 }}>
          <Card
            style={[
              styles.aiExerciseCard,
              isChecked && { borderColor: theme.colors.success, backgroundColor: theme.colors.successLight }
            ]}
          >
            <View style={[styles.aiExerciseNumberWrap, isChecked && { backgroundColor: theme.colors.success }]}>
              {isChecked ? (
                <Feather name="check" size={14} color="#FFF" />
              ) : (
                <Text style={styles.aiExerciseNumber}>{idx + 1}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.aiExerciseName,
                  isChecked && { textDecorationLine: 'line-through', color: theme.colors.textSecondary }
                ]}
              >
                {exercise}
              </Text>
            </View>
          </Card>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };

  // Skeleton rendering helpers
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <Animated.View style={[styles.skeletonCard, { opacity: skeletonAlpha, height: 78 }]} />
      <Animated.View style={[styles.skeletonCard, { opacity: skeletonAlpha, height: 78 }]} />
      <Animated.View style={[styles.skeletonCard, { opacity: skeletonAlpha, height: 78 }]} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Safe Custom Header - No device status bar overlap */}
      <Animated.View
        style={[
          styles.safeHeader,
          {
            paddingTop: Math.max(theme.spacing.sm, insets.top),
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }]
          }
        ]}
      >
        <Header
          title="Workouts"
          subtitle={selectedDate === getLocalDateString() ? 'Today' : selectedDate.toUpperCase()}
          rightElement={
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Log Activity Button */}
              <TouchableWithoutFeedback
                onPress={() => setShowActivityModal(true)}
                onPressIn={handlePressInLogActivity}
                onPressOut={handlePressOutLogActivity}
                accessibilityLabel="Log custom wellness activity"
                accessibilityRole="button"
              >
                <Animated.View style={{ transform: [{ scale: logActivityScale }] }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    pointerEvents="none"
                    icon={<Feather name="plus" size={14} color={theme.colors.primary} />}
                    style={{ backgroundColor: '#FFF', borderColor: theme.colors.primary, borderWidth: 1 }}
                  >
                    Log Activity
                  </Button>
                </Animated.View>
              </TouchableWithoutFeedback>

              {/* Log Gym Button */}
              <TouchableWithoutFeedback
                onPress={() => setShowModal(true)}
                onPressIn={handlePressInLogGym}
                onPressOut={handlePressOutLogGym}
                accessibilityLabel="Log structural gym workout session"
                accessibilityRole="button"
              >
                <Animated.View style={{ transform: [{ scale: logGymScale }] }}>
                  <Button variant="primary" size="sm" pointerEvents="none" icon={<Feather name="plus" size={14} color="#FFF" />}>
                    Log Gym
                  </Button>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          }
        />
      </Animated.View>

      <ScreenContainer scrollable={false} keyboardAvoiding={false}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
        >
          {/* 1. Category filter Ribbon */}
          <Animated.View style={[styles.categoriesWrapper, getEntranceStyle(0)]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
              {categories.map((cat, index) => (
                <CategoryPill key={index} cat={cat} />
              ))}
            </ScrollView>
          </Animated.View>

          {/* 2. Logs Title Header */}
          <Animated.View style={getEntranceStyle(1)}>
            <SectionHeader
              title={selectedCategory ? `ACTIVITY LOGS: ${selectedCategory.toUpperCase()}` : 'ALL ACTIVITY LOGS'}
            />
          </Animated.View>

          {/* 3. Workouts List Feed */}
          {loading ? (
            renderSkeleton()
          ) : workouts.length === 0 && activities.length === 0 ? (
            <Animated.View style={[getEntranceStyle(2), { transform: [{ scale: emptyStatePulse }], alignItems: 'center' }]}>
              <EmptyState
                icon="zap"
                title="No workout logs"
                description={
                  selectedCategory
                    ? `You haven't logged any ${selectedCategory} workouts for this date.`
                    : "You haven't recorded any workouts or activities for this date."
                }
              />
            </Animated.View>
          ) : (
            <Animated.View style={getEntranceStyle(2)}>
              {/* Gym Workouts logs */}
              {workouts
                .filter(w => {
                  if (!selectedCategory) return true;
                  // If category filter is active, check if any workout exercise matches the category
                  if (w.exercises && w.exercises.length > 0) {
                    return w.exercises.some(
                      ex => ex.category && ex.category.toLowerCase() === selectedCategory.toLowerCase()
                    );
                  }
                  return false;
                })
                .map((workout, index) => (
                  <Card key={`workout-${index}`} style={styles.workoutRow}>
                    <View style={[styles.workoutImage, { backgroundColor: theme.colors.primary }]}>
                      <FontAwesome5 name="dumbbell" size={18} color="#FFF" />
                    </View>
                    <View style={styles.workoutInfo}>
                      <View style={styles.workoutHeaderRow}>
                        <Text style={styles.workoutTitle} numberOfLines={1}>{workout.notes || 'Workout Session'}</Text>
                        <Text style={styles.durationTag}>{workout.duration_minutes} mins</Text>
                      </View>
                      <Text style={styles.workoutDesc}>Gym session completed</Text>
                      <View style={styles.tagsRow}>
                        <Badge variant="primary" label="Gym" />
                      </View>
                    </View>
                  </Card>
                ))}

              {/* Custom Activities logs */}
              {activities
                .filter(a => {
                  if (!selectedCategory) return true;
                  return a.category && a.category.toLowerCase() === selectedCategory.toLowerCase();
                })
                .map((activity, index) => (
                  <Card key={`activity-${index}`} style={styles.workoutRow}>
                    <View style={[styles.workoutImage, { backgroundColor: getActivityColor(activity.category) }]}>
                      <FontAwesome5 name={getActivityIcon(activity.category)} size={18} color="#FFF" />
                    </View>
                    <View style={styles.workoutInfo}>
                      <View style={styles.workoutHeaderRow}>
                        <Text style={styles.workoutTitle} numberOfLines={1}>{activity.activity_name}</Text>
                        <Text style={styles.durationTag}>{activity.duration_minutes} mins</Text>
                      </View>
                      <Text style={styles.workoutDesc}>
                        {activity.notes || `${activity.category.toUpperCase()} session`}
                      </Text>
                      <View style={styles.tagsRow}>
                        <Badge variant="secondary" label={activity.track_name || activity.category} />
                        {activity.intensity && (
                          <Badge
                            variant="primary"
                            label={`${activity.intensity.toUpperCase()}`}
                            style={{ marginLeft: 6, backgroundColor: theme.colors.warningLight }}
                          />
                        )}
                        <TouchableOpacity
                          style={{ marginLeft: 'auto', padding: 15 }}
                          onPress={() => handleDeleteActivity(activity.id)}
                          accessibilityLabel="Delete activity log"
                          accessibilityRole="button"
                        >
                          <Feather name="trash-2" size={14} color={theme.colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                ))}
            </Animated.View>
          )}

          {/* 4. AI Coach Workout Recommendation Block */}
          <Animated.View style={getEntranceStyle(3)}>
            {recommendation && recommendation.viewingPast ? (
              <Card style={styles.pastDataIndicator}>
                <View style={styles.pastDataRow}>
                  <Feather name="clock" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                  <Text style={styles.pastDataText}>Viewing historical recommendations for {selectedDate}</Text>
                </View>
              </Card>
            ) : recommendation ? (
              <Animated.View style={{ opacity: sparkleOpacity }}>
                <AICoachCard
                  title="AI SUGGESTED TOMORROW"
                  scoreLabel="Workout Focus"
                  scoreValue={recommendation.workout_plan || 'Active Recovery'}
                  narrative={recommendation.recovery_advice}
                  actions={
                    <TouchableWithoutFeedback
                      onPress={() => setShowAiPlanModal(true)}
                      onPressIn={handlePressInViewPlan}
                      onPressOut={handlePressOutViewPlan}
                      accessibilityLabel="View tomorrow AI workout details"
                      accessibilityRole="button"
                    >
                      <Animated.View style={{ transform: [{ scale: viewPlanScale }] }}>
                        <Button variant="primary" size="md" pointerEvents="none" icon={<Feather name="arrow-right" size={16} color="#FFF" />}>
                          View Plan
                        </Button>
                      </Animated.View>
                    </TouchableWithoutFeedback>
                  }
                />
              </Animated.View>
            ) : loadingRecommendation ? (
              <Card variant="ai" style={[styles.loadingCard, { marginHorizontal: theme.spacing.xxl, marginTop: 12 }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading dynamic AI plan...</Text>
              </Card>
            ) : null}
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
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
                <TouchableOpacity onPress={() => handleRemoveExerciseRow(idx)} accessibilityLabel={`Remove exercise row ${idx + 1}`} accessibilityRole="button">
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
                  {getFilteredExercises().map((item) => (
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

      {/* Log Activity Modal */}
      <ModalView visible={showActivityModal} title="Log Custom Activity" onClose={() => setShowActivityModal(false)}>
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

      {/* AI Plan Modal */}
      <ModalView visible={showAiPlanModal} title="AI Workout Plan" onClose={() => setShowAiPlanModal(false)}>
        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          {recommendation && (
            <>
              {/* Premium Gradient Hero Block */}
              <View style={styles.aiPlanHeroCard}>
                <Text style={styles.aiPlanHeroLabel}>TOMORROW'S FOCUS</Text>
                <Text style={styles.aiPlanHeroTitle}>{recommendation.workout_plan}</Text>
              </View>

              {/* Numbered Exercises checklist */}
              <Text style={styles.sectionHeading}>Exercises & Activities</Text>
              {recommendation.exercises && recommendation.exercises.length > 0 ? (
                recommendation.exercises.map((exercise, idx) => (
                  <InteractiveExerciseCard key={idx} exercise={exercise} idx={idx} />
                ))
              ) : (
                <Text style={styles.noExercisesText}>No specific exercises listed. Focus on active mobility!</Text>
              )}

              {/* Coach Guidance Block */}
              <Text style={styles.sectionHeading}>Coach's Advice</Text>
              <AICoachCard
                title="Coach's Guidance"
                narrative={recommendation.recovery_advice}
                expanded={true}
                style={{ marginHorizontal: 0, marginBottom: 32 }}
              />

              {/* Satisfying Confirmation CTA */}
              <TouchableWithoutFeedback
                onPress={handleGotItPress}
                onPressIn={handlePressInGotIt}
                onPressOut={handlePressOutGotIt}
                disabled={gotItSuccess}
                accessibilityLabel="Confirm understanding of workout plan"
                accessibilityRole="button"
              >
                <Animated.View style={{ transform: [{ scale: gotItScale }], marginBottom: 40 }}>
                  <Button
                    variant="primary"
                    size="lg"
                    pointerEvents="none"
                    style={{ backgroundColor: gotItSuccess ? theme.colors.success : theme.colors.primary }}
                    textStyle={{ color: '#FFF' }}
                    icon={
                      gotItSuccess ? (
                        <Feather name="check" size={18} color="#FFF" />
                      ) : (
                        <Feather name="thumbs-up" size={18} color="#FFF" />
                      )
                    }
                  >
                    {gotItSuccess ? "Let's Crush It! 🎉" : "Got it, Let's do it! 💪"}
                  </Button>
                </Animated.View>
              </TouchableWithoutFeedback>
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
  safeHeader: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  categoriesWrapper: {
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
  },
  categoriesScroll: {
    paddingHorizontal: theme.spacing.xxl,
    gap: 12,
  },
  categoryItem: {
    alignItems: 'center',
    width: 68,
  },
  categoryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    padding: 0,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: '#FFF',
    ...theme.shadows.soft,
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
    borderColor: theme.colors.border,
    borderWidth: 1,
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
    alignItems: 'center',
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
  aiPlanHeroCard: {
    backgroundColor: theme.colors.primary,
    padding: 24,
    borderRadius: theme.radii.xxl,
    marginBottom: 28,
    ...theme.shadows.primaryGlow,
  },
  aiPlanHeroLabel: {
    ...theme.typography.labelSmall,
    color: 'rgba(255, 255, 255, 0.8)',
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
    borderColor: theme.colors.border,
    borderWidth: 1,
    ...theme.shadows.soft,
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
    gap: 14,
    marginTop: theme.spacing.md,
  },
  skeletonCard: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.lg,
  },
  loadingCard: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  loadingText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
});
