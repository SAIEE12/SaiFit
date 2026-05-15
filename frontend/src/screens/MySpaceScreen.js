import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../api/client';

export default function MySpaceScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [nutritionSummary, setNutritionSummary] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [hydration, setHydration] = useState(0);
  const [dailyWorkouts, setDailyWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  useEffect(() => {
    fetchDailyData();
  }, [selectedDate]);

  const fetchDailyData = async () => {
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
      setHydration(hydrationRes.data.amount_ml || 0);
      
      let totals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      mealsRes.data.forEach(meal => {
        totals.calories += meal.total_calories;
        totals.protein += meal.total_protein;
        totals.carbs += meal.total_carbs;
        totals.fats += meal.total_fats;
      });
      setNutritionSummary(totals);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{selectedDate === new Date().toISOString().split('T')[0] ? 'TODAY' : selectedDate.toUpperCase()}</Text>
            <Text style={styles.greeting}>Hi, Fitness Fan! 👋</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn}>
              <Feather name="bell" size={22} color="#1A1A1A" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
            <ActivityIndicator size="large" color="#E91E63" style={{marginTop: 50}} />
        ) : (
          <>
            {/* Daily Calorie Banner */}
            <TouchableOpacity style={styles.banner}>
              <View>
                <Text style={styles.bannerTitle}>DAILY CALORIE TARGET</Text>
                <Text style={styles.bannerSubtitle}>{nutritionSummary.calories} / 2,200 kcal consumed</Text>
              </View>
              <View style={styles.bannerAction}>
                <Text style={styles.bannerActionText}>{Math.max(0, 2200 - nutritionSummary.calories)} left</Text>
              </View>
            </TouchableOpacity>

            {/* Macro Balance */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Macro Balance</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <View style={[styles.macroCard, {borderColor: '#E91E63'}]}>
                <Text style={styles.macroTitle}>Protein</Text>
                <Text style={styles.macroValue}>{nutritionSummary.protein}g <Text style={styles.macroTarget}>/ 140g</Text></Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, {width: `${Math.min(100, (nutritionSummary.protein/140)*100)}%`, backgroundColor: '#E91E63'}]} />
                </View>
              </View>
              
              <View style={[styles.macroCard, {borderColor: '#4CAF50'}]}>
                <Text style={styles.macroTitle}>Carbs</Text>
                <Text style={styles.macroValue}>{nutritionSummary.carbs}g <Text style={styles.macroTarget}>/ 200g</Text></Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, {width: `${Math.min(100, (nutritionSummary.carbs/200)*100)}%`, backgroundColor: '#4CAF50'}]} />
                </View>
              </View>

              <View style={[styles.macroCard, {borderColor: '#FFC107'}]}>
                <Text style={styles.macroTitle}>Fats</Text>
                <Text style={styles.macroValue}>{nutritionSummary.fats}g <Text style={styles.macroTarget}>/ 65g</Text></Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, {width: `${Math.min(100, (nutritionSummary.fats/65)*100)}%`, backgroundColor: '#FFC107'}]} />
                </View>
              </View>
            </ScrollView>

        {/* AI Insight / Recommendation */}
        {recommendation && (
            <View style={styles.insightCard}>
              <View style={styles.insightIconWrap}>
                <FontAwesome5 name="magic" size={16} color="#FFF" />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.insightTitle}>AI Health Insight</Text>
                <Text style={styles.insightText}>{recommendation.recovery_advice}</Text>
              </View>
            </View>
        )}

        {/* Health Tracking */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Health Tracking</Text>
        </View>

        <View style={styles.goalCard}>
          <View style={styles.goalRow}>
            <View style={[styles.goalIconWrap, {backgroundColor: '#E3F2FD'}]}>
              <MaterialCommunityIcons name="water" size={20} color="#2196F3" />
            </View>
            <Text style={styles.goalText}>Hydration</Text>
          </View>
          <View style={styles.trackAction}>
            <Text style={styles.goalValue}>{hydration} / 3000 ml</Text>
            <TouchableOpacity 
                style={styles.addBtn}
                onPress={async () => {
                    try {
                        await apiClient.post('/hydration/log', { amount_ml: 250, date: selectedDate });
                        setHydration(prev => prev + 250);
                    } catch(e) { console.error(e); }
                }}
            >
                <Feather name="plus" size={16} color="#FFF"/>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.goalCard}>
          <View style={styles.goalRow}>
            <View style={[styles.goalIconWrap, {backgroundColor: '#EDE7F6'}]}>
              <MaterialCommunityIcons name="bed-empty" size={20} color="#673AB7" />
            </View>
            <Text style={styles.goalText}>Workouts</Text>
          </View>
          <View style={styles.trackAction}>
            <Text style={styles.goalValue}>{dailyWorkouts.length} logged</Text>
            <TouchableOpacity 
                style={styles.addBtn}
                onPress={() => navigation.navigate('Workouts')}
            >
                <Feather name="arrow-right" size={16} color="#FFF"/>
            </TouchableOpacity>
          </View>
        </View>
        </>
        )}

        <View style={{height: 40}} />
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  date: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 5,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginLeft: 15,
  },
  banner: {
    backgroundColor: '#E91E63',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#E91E63',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  bannerActionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  seeAll: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  horizontalScroll: {
    paddingLeft: 20,
    marginBottom: 25,
  },
  macroCard: {
    width: 140,
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 16,
    marginRight: 15,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  macroTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 5,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  macroTarget: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    width: '100%',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  insightCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  goalCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  trackAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginRight: 12,
  },
  addBtn: {
    backgroundColor: '#1A1A1A',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
