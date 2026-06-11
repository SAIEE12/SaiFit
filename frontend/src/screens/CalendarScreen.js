import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { theme } from '../theme';
import ScreenContainer from '../components/ui/ScreenContainer';
import { Header, SectionHeader } from '../components/ui/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AICoachCard from '../components/ui/AICoachCard';
import Badge from '../components/ui/Badge';
import { LoadingState, EmptyState } from '../components/ui/StateViews';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarScreen({ navigation }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [dayData, setDayData] = useState({
        workouts: [],
        meals: [],
        hydration: 0,
        totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }
    });

    // AI Calendar Coach State
    const [calendarCoach, setCalendarCoach] = useState(null);
    const [loadingCoach, setLoadingCoach] = useState(false);
    const [coachExpanded, setCoachExpanded] = useState(false);
    const [isSmartSearchEnabled, setIsSmartSearchEnabled] = useState(false);
    const [achievements, setAchievements] = useState({});

    useEffect(() => {
        fetchDayDetails(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        fetchCalendarCoach();
        checkSmartSearchStatus();
        fetchAchievements();
    }, []);

    const fetchDayDetails = async (date) => {
        const dateStr = getLocalDateString(date);
        setLoading(true);
        try {
            const [workoutsRes, mealsRes, hydrationRes] = await Promise.all([
                apiClient.get(`/workouts?date=${dateStr}`),
                apiClient.get(`/nutrition/meals?date=${dateStr}`),
                apiClient.get(`/hydration?date=${dateStr}`)
            ]);

            const meals = mealsRes.data || [];
            const totals = meals.reduce((acc, m) => ({
                calories: acc.calories + (m.total_calories || 0),
                protein: acc.protein + (m.total_protein || 0),
                carbs: acc.carbs + (m.total_carbs || 0),
                fats: acc.fats + (m.total_fats || 0)
            }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

            setDayData({
                workouts: workoutsRes.data || [],
                meals: meals,
                hydration: hydrationRes.data?.amount_ml || 0,
                totals
            });
            
            // Refresh achievements when modifying logs
            fetchAchievements();
        } catch (e) {
            console.error("Error fetching day details:", e);
        } finally {
            setLoading(false);
        }
    };

    const checkSmartSearchStatus = async () => {
        try {
            const res = await apiClient.get('/nutrition/smart-search/status');
            setIsSmartSearchEnabled(res.data.enabled);
        } catch (e) {
            console.error("Failed to check smart search status", e);
        }
    };

    const fetchCalendarCoach = async () => {
        try {
            setLoadingCoach(true);
            const res = await apiClient.get('/recommendations/calendar-coach');
            setCalendarCoach(res.data);
        } catch (e) {
            console.error("Failed to load calendar coach:", e);
        } finally {
            setLoadingCoach(false);
        }
    };

    const fetchAchievements = async () => {
        try {
            const res = await apiClient.get('/recommendations/achievements');
            setAchievements(res.data || {});
        } catch (e) {
            console.error("Failed to fetch achievements:", e);
        }
    };

    const toggleCoach = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCoachExpanded(!coachExpanded);
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
        
        const todayStr = getLocalDateString(new Date());

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = getLocalDateString(date);
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            
            // Render indicators only for today and past days
            const showIndicators = dateStr <= todayStr;

            const stats = achievements[dateStr] || { workouts: 0, hydration: 0, calories: 0 };
            const hasWorkout = stats.workouts > 0;
            const hasWater = stats.hydration >= 3000;
            const hasMacros = stats.calories >= 1200;
            const achievedAll = hasWorkout && hasWater && hasMacros;

            days.push(
                <TouchableOpacity 
                    key={day} 
                    style={[
                        styles.dayCell, 
                        isSelected && styles.selectedDayCell,
                        isToday && !isSelected && styles.todayDayCell
                    ]}
                    onPress={() => setSelectedDate(date)}
                >
                    <Text style={[
                        styles.dayText, 
                        isSelected && styles.selectedDayText, 
                        isToday && !isSelected && styles.todayText
                    ]}>{day}</Text>
                    {showIndicators && (
                        achievedAll ? (
                            <View style={[styles.achievementBadge, styles.achievementFilled]}>
                                <Feather name="check" size={8} color="#FFF" />
                            </View>
                        ) : (
                            <View style={[styles.achievementBadge, styles.achievementIncomplete]}>
                                <Feather name="x" size={8} color={theme.colors.textSecondary} />
                            </View>
                        )
                    )}
                </TouchableOpacity>
            );
        }
        return days;
    };

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.safeHeader}>
                <Header
                    title="Daily Logs"
                    leftElement={
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Feather name="chevron-left" size={24} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                    }
                />
            </SafeAreaView>

            <ScreenContainer scrollable keyboardAvoiding={false} edges={['bottom']}>
                {/* Calendar Card */}
                <Card style={styles.calendarContainer}>
                    <View style={styles.monthHeader}>
                        <Text style={styles.monthTitle}>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</Text>
                        <View style={styles.navBtns}>
                            <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} style={styles.navBtn}><Feather name="chevron-left" size={20} color={theme.colors.textPrimary} /></TouchableOpacity>
                            <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} style={styles.navBtn}><Feather name="chevron-right" size={20} color={theme.colors.textPrimary} /></TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.weekDays}>{DAYS.map(day => <Text key={day} style={styles.weekDayText}>{day.toUpperCase()}</Text>)}</View>
                    <View style={styles.daysGrid}>{renderCalendar()}</View>
                </Card>

                {/* AI Calendar Journey Intelligence */}
                {isSmartSearchEnabled && calendarCoach && !calendarCoach.disabled && (
                    <AICoachCard
                        title="AI JOURNEY INTELLIGENCE"
                        scoreLabel="CONSISTENCY INDEX"
                        scoreValue={calendarCoach.consistency_score}
                        narrative={calendarCoach.expanded_narrative}
                        expanded={coachExpanded}
                        onToggle={toggleCoach}
                        segments={
                            coachExpanded
                                ? [
                                    {
                                        icon: 'trending-up',
                                        title: 'Streak Analysis',
                                        text: calendarCoach.streak_analysis,
                                        color: theme.colors.primary,
                                    },
                                    {
                                        icon: 'clock',
                                        title: 'Best Workout Time',
                                        text: calendarCoach.best_time_suggestion,
                                        color: theme.colors.secondary,
                                    },
                                    {
                                        icon: 'compass',
                                        title: 'Split Predictions',
                                        text: calendarCoach.workout_predictions,
                                        color: theme.colors.success,
                                    },
                                    {
                                        icon: 'heart',
                                        title: 'Overtraining Status',
                                        text: calendarCoach.overtraining_alerts,
                                        color: theme.colors.warning,
                                    },
                                ]
                                : []
                        }
                        milestones={
                            coachExpanded && calendarCoach.milestones && calendarCoach.milestones.length > 0
                                ? calendarCoach.milestones
                                : []
                        }
                    />
                )}

                {/* Day Details */}
                <View style={styles.detailsContainer}>
                    {loading ? (
                        <LoadingState message="Fetching daily details..." />
                    ) : (
                        <View style={styles.content}>
                            <SectionHeader title="ACTIVITIES" />
                            
                            {/* Workout Logs */}
                            {dayData.workouts.length > 0 ? dayData.workouts.map((w, i) => (
                                <Card key={i} style={styles.logCard}>
                                    <View style={[styles.logIcon, {backgroundColor: theme.colors.primaryLight}]}><FontAwesome5 name="running" size={16} color={theme.colors.primary} /></View>
                                    <View style={styles.logInfo}>
                                        <Text style={styles.logTitle}>{w.notes || 'Workout Session'}</Text>
                                        <Text style={styles.logSubtitle}>{w.duration_minutes} mins • {new Date(w.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                                    </View>
                                </Card>
                            )) : null}

                            {/* Meal Logs */}
                            {dayData.meals.length > 0 ? dayData.meals.map((m, i) => (
                                <Card key={i} style={styles.logCard}>
                                    <View style={[styles.logIcon, {backgroundColor: theme.colors.successLight}]}><MaterialCommunityIcons name="food" size={18} color={theme.colors.success} /></View>
                                    <View style={styles.logInfo}>
                                        <Text style={styles.logTitle}>{m.meal_type.toUpperCase()}</Text>
                                        <Text style={styles.logSubtitle}>{m.total_calories} kcal • {m.total_protein}g Protein</Text>
                                    </View>
                                </Card>
                            )) : null}

                            {dayData.workouts.length === 0 && dayData.meals.length === 0 && (
                                <EmptyState
                                    icon="activity"
                                    title="No activities"
                                    description="No activities logged on this date."
                                />
                            )}
                        </View>
                    )}
                </View>
                <View style={{height: 100}} />
            </ScreenContainer>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    safeHeader: { backgroundColor: theme.colors.background },
    backBtn: { padding: 5, marginRight: 10 },
    calendarContainer: {
        marginHorizontal: theme.spacing.xxl, 
        marginBottom: 16,
    },
    monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    monthTitle: { ...theme.typography.h4, color: theme.colors.textPrimary },
    navBtns: { flexDirection: 'row' },
    navBtn: { padding: 5, marginLeft: 10 },
    weekDays: { flexDirection: 'row', marginBottom: 10 },
    weekDayText: { flex: 1, textAlign: 'center', ...theme.typography.labelSmall, color: theme.colors.textSecondary },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { 
        width: '14.28%', 
        height: 54, 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingVertical: 4,
    },
    dayText: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
    selectedDayCell: { backgroundColor: theme.colors.border, borderRadius: theme.radii.md },
    selectedDayText: { color: theme.colors.textPrimary, fontWeight: '800' },
    todayDayCell: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary },
    todayText: { color: theme.colors.primary, fontWeight: '800' },
    detailsContainer: { paddingHorizontal: theme.spacing.xxl, paddingTop: 10 },
    logCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    logIcon: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    logInfo: { flex: 1 },
    logTitle: { ...theme.typography.h5, color: theme.colors.textPrimary },
    logSubtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
    achievementBadge: {
        width: 13,
        height: 13,
        borderRadius: 6.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    achievementFilled: {
        backgroundColor: '#10B981', // Solid Emerald Green for perfect completed goals
    },
    achievementIncomplete: {
        backgroundColor: 'rgba(28, 28, 30, 0.06)', // Translucent outline circle
        borderWidth: 0.5,
        borderColor: 'rgba(28, 28, 30, 0.15)',
    },
});
