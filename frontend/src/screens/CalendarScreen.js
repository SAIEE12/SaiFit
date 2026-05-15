import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../api/client';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
        const dateStr = date.toISOString().split('T')[0];
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
                    <Feather name="chevron-left" size={28} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Daily Logs</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{backgroundColor: '#F8FAFD'}} contentContainerStyle={{backgroundColor: '#F8FAFD'}}>
                <View style={styles.calendarContainer}>
                    <View style={styles.monthHeader}>
                        <Text style={styles.monthTitle}>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</Text>
                        <View style={styles.navBtns}>
                            <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} style={styles.navBtn}><Feather name="chevron-left" size={20} color="#1A1A1A" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} style={styles.navBtn}><Feather name="chevron-right" size={20} color="#1A1A1A" /></TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.weekDays}>{DAYS.map(day => <Text key={day} style={styles.weekDayText}>{day}</Text>)}</View>
                    <View style={styles.daysGrid}>{renderCalendar()}</View>
                </View>

                <View style={styles.detailsContainer}>
                    <Text style={styles.dateDisplay}>{selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                    
                    {loading ? (
                        <ActivityIndicator color="#E91E63" size="large" style={{marginTop: 30}} />
                    ) : (
                        <View style={styles.content}>
                            {/* Summary Progress */}
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

                            <Text style={styles.sectionTitle}>Activities</Text>
                            
                            {/* Workout Logs */}
                            {dayData.workouts.length > 0 ? dayData.workouts.map((w, i) => (
                                <TouchableOpacity key={i} style={styles.logCard}>
                                    <View style={[styles.logIcon, {backgroundColor: '#E8F5E9'}]}><FontAwesome5 name="running" size={18} color="#4CAF50" /></View>
                                    <View style={styles.logInfo}>
                                        <Text style={styles.logTitle}>{w.notes || 'Workout Session'}</Text>
                                        <Text style={styles.logSubtitle}>{w.duration_minutes} mins • {new Date(w.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                                    </View>
                                    <Feather name="chevron-right" size={18} color="#CCC" />
                                </TouchableOpacity>
                            )) : (
                                <View style={styles.emptyActivity}>
                                    <Text style={styles.emptyText}>No workouts logged</Text>
                                </View>
                            )}

                            {/* Meal Logs */}
                            {dayData.meals.length > 0 ? dayData.meals.map((m, i) => (
                                <TouchableOpacity key={i} style={styles.logCard}>
                                    <View style={[styles.logIcon, {backgroundColor: '#FFF3E0'}]}><MaterialCommunityIcons name="food" size={20} color="#FF9800" /></View>
                                    <View style={styles.logInfo}>
                                        <Text style={styles.logTitle}>{m.meal_type.toUpperCase()}</Text>
                                        <Text style={styles.logSubtitle}>{m.total_calories} kcal • {m.total_protein}g Protein</Text>
                                    </View>
                                    <Feather name="chevron-right" size={18} color="#CCC" />
                                </TouchableOpacity>
                            )) : (
                                <View style={styles.emptyActivity}>
                                    <Text style={styles.emptyText}>No meals logged</Text>
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
    container: { flex: 1, backgroundColor: '#F8FAFD' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
    calendarContainer: {
        backgroundColor: '#FFF', marginHorizontal: 20, padding: 15, borderRadius: 24,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F5F5F5'
    },
    monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    monthTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
    navBtns: { flexDirection: 'row' },
    navBtn: { padding: 5, marginLeft: 10 },
    weekDays: { flexDirection: 'row', marginBottom: 10 },
    weekDayText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#8E8E93' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', height: 40, justifyContent: 'center', alignItems: 'center' },
    dayText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
    selectedDayCell: { backgroundColor: '#E91E63', borderRadius: 10 },
    selectedDayText: { color: '#FFF', fontWeight: '800' },
    todayText: { color: '#E91E63', fontWeight: '800' },
    todayDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#E91E63', marginTop: 2 },
    detailsContainer: { padding: 20 },
    dateDisplay: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 20 },
    summaryCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: '#F5F5F5' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryVal: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
    summaryLab: { fontSize: 11, fontWeight: '600', color: '#8E8E93', marginTop: 2 },
    divider: { width: 1, height: 30, backgroundColor: '#EEE' },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 15 },
    logCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: '#F5F5F5' },
    logIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    logInfo: { flex: 1 },
    logTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
    logSubtitle: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
    emptyActivity: { padding: 15, backgroundColor: '#F9F9F9', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#EEE', marginBottom: 15, alignItems: 'center' },
    emptyText: { fontSize: 13, color: '#AAA', fontWeight: '500' }
});
