import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { theme } from '../theme';

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

    useEffect(() => {
        fetchDayDetails(selectedDate);
    }, [selectedDate]);

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
        } catch (e) {
            console.error("Error fetching day details:", e);
        } finally {
            setLoading(false);
        }
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
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            days.push(
                <TouchableOpacity 
                    key={day} 
                    style={[styles.dayCell, isSelected && styles.selectedDayCell]}
                    onPress={() => setSelectedDate(date)}
                >
                    <Text style={[styles.dayText, isSelected && styles.selectedDayText, isToday && !isSelected && styles.todayText]}>{day}</Text>
                    {isToday && !isSelected && <View style={styles.todayDot} />}
                </TouchableOpacity>
            );
        }
        return days;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Daily Logs</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Calendar Card */}
                <View style={styles.calendarContainer}>
                    <View style={styles.monthHeader}>
                        <Text style={styles.monthTitle}>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</Text>
                        <View style={styles.navBtns}>
                            <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} style={styles.navBtn}><Feather name="chevron-left" size={20} color={theme.colors.textPrimary} /></TouchableOpacity>
                            <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} style={styles.navBtn}><Feather name="chevron-right" size={20} color={theme.colors.textPrimary} /></TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.weekDays}>{DAYS.map(day => <Text key={day} style={styles.weekDayText}>{day.toUpperCase()}</Text>)}</View>
                    <View style={styles.daysGrid}>{renderCalendar()}</View>
                </View>

                {/* Day Details */}
                <View style={styles.detailsContainer}>
                    <Text style={styles.dateDisplay}>{selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                    
                    {loading ? (
                        <ActivityIndicator color={theme.colors.primary} size="large" style={{marginTop: 30}} />
                    ) : (
                        <View style={styles.content}>
                            {/* Summary Snapshot Card */}
                            <View style={styles.summaryCard}>
                                <View style={styles.summaryRow}>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryVal}>{dayData.totals.calories}</Text>
                                        <Text style={styles.summaryLab}>Calories</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryVal}>{dayData.totals.protein}g</Text>
                                        <Text style={styles.summaryLab}>Protein</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryVal}>{dayData.hydration}ml</Text>
                                        <Text style={styles.summaryLab}>Water</Text>
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.sectionTitle}>ACTIVITIES</Text>
                            
                            {/* Workout Logs */}
                            {dayData.workouts.length > 0 ? dayData.workouts.map((w, i) => (
                                <View key={i} style={styles.logCard}>
                                    <View style={[styles.logIcon, {backgroundColor: theme.colors.accentPinkLight}]}><FontAwesome5 name="running" size={16} color={theme.colors.primary} /></View>
                                    <View style={styles.logInfo}>
                                        <Text style={styles.logTitle}>{w.notes || 'Workout Session'}</Text>
                                        <Text style={styles.logSubtitle}>{w.duration_minutes} mins • {new Date(w.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                                    </View>
                                </View>
                            )) : null}

                            {/* Meal Logs */}
                            {dayData.meals.length > 0 ? dayData.meals.map((m, i) => (
                                <View key={i} style={styles.logCard}>
                                    <View style={[styles.logIcon, {backgroundColor: theme.colors.accentGreenLight}]}><MaterialCommunityIcons name="food" size={18} color={theme.colors.green} /></View>
                                    <View style={styles.logInfo}>
                                        <Text style={styles.logTitle}>{m.meal_type.toUpperCase()}</Text>
                                        <Text style={styles.logSubtitle}>{m.total_calories} kcal • {m.total_protein}g Protein</Text>
                                    </View>
                                </View>
                            )) : null}

                            {dayData.workouts.length === 0 && dayData.meals.length === 0 && (
                                <View style={styles.emptyActivity}>
                                    <Feather name="activity" size={32} color={theme.colors.textTertiary} />
                                    <Text style={styles.emptyText}>No activities logged on this date.</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
                <View style={{height: 100}} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.xxl, paddingTop: theme.spacing.lg, marginBottom: 10 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.5 },
    calendarContainer: {
        backgroundColor: theme.colors.card, 
        marginHorizontal: theme.spacing.xxl, 
        padding: 20, 
        borderRadius: theme.borderRadius.xxl,
        borderWidth: 1, 
        borderColor: theme.colors.border,
        ...theme.shadows.soft,
    },
    monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    monthTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
    navBtns: { flexDirection: 'row' },
    navBtn: { padding: 5, marginLeft: 10 },
    weekDays: { flexDirection: 'row', marginBottom: 10 },
    weekDayText: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 0.5 },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', height: 40, justifyContent: 'center', alignItems: 'center' },
    dayText: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
    selectedDayCell: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, shadowColor: theme.colors.primary, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
    selectedDayText: { color: '#FFF', fontWeight: '800' },
    todayText: { color: theme.colors.primary, fontWeight: '800' },
    todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.primary, marginTop: 2 },
    detailsContainer: { paddingHorizontal: theme.spacing.xxl, paddingTop: 20 },
    dateDisplay: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 20 },
    summaryCard: { backgroundColor: theme.colors.card, padding: 20, borderRadius: theme.borderRadius.xxl, marginBottom: 25, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.soft },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryVal: { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary },
    summaryLab: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 2 },
    divider: { width: 1, height: 30, backgroundColor: theme.colors.border },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 1.5, marginBottom: 14 },
    logCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, padding: 16, borderRadius: theme.borderRadius.xxl, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.soft },
    logIcon: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    logInfo: { flex: 1 },
    logTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
    logSubtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    emptyActivity: { padding: 24, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.xxl, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', gap: 10 },
    emptyText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' }
});
