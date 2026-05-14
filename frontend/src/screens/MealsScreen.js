import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';

export default function MealsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>FRIDAY, 06 MAY</Text>
            <Text style={styles.greeting}>Nutrition Diary</Text>
          </View>
        </View>

        {/* AI Scanner Button */}
        <TouchableOpacity style={styles.scannerBtn}>
          <Feather name="camera" size={20} color="#FFF" style={{marginRight: 8}} />
          <Text style={styles.scannerBtnText}>AI Food Scanner</Text>
        </TouchableOpacity>

        {/* Meal Time Tabs */}
        <View style={styles.mealTabs}>
          <TouchableOpacity style={styles.mealTab}><Text style={styles.mealTabText}>Breakfast</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.mealTab, styles.mealTabActive]}><Text style={styles.mealTabTextActive}>Lunch</Text></TouchableOpacity>
          <TouchableOpacity style={styles.mealTab}><Text style={styles.mealTabText}>Snack</Text></TouchableOpacity>
          <TouchableOpacity style={styles.mealTab}><Text style={styles.mealTabText}>Dinner</Text></TouchableOpacity>
        </View>

        {/* Main Meal Card (Scanned Item) */}
        <View style={styles.mealCard}>
          <View style={[styles.mealImagePlaceholder, {backgroundColor: '#E67E22'}]}>
             <View style={styles.aiTag}>
               <FontAwesome5 name="magic" size={10} color="#E91E63" style={{marginRight: 4}} />
               <Text style={styles.aiTagText}>AI Scanned</Text>
             </View>
          </View>
          
          <View style={styles.mealInfo}>
            <View style={styles.mealRow}>
              <Text style={styles.mealName}>Grilled Chicken Bowl</Text>
              <TouchableOpacity style={styles.editBtn}>
                <Feather name="edit-2" size={14} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.macroChips}>
               <View style={[styles.chip, {backgroundColor: '#FFF0F5'}]}><Text style={styles.chipText}>🔥 480 kcal</Text></View>
               <View style={[styles.chip, {backgroundColor: '#E3F2FD'}]}><Text style={styles.chipText}>🥩 45g P</Text></View>
               <View style={[styles.chip, {backgroundColor: '#E8F5E9'}]}><Text style={styles.chipText}>🍚 40g C</Text></View>
               <View style={[styles.chip, {backgroundColor: '#FFF8E1'}]}><Text style={styles.chipText}>🥑 15g F</Text></View>
            </View>
            
            <View style={styles.ingredientsList}>
              <Text style={styles.ingredient}>🍗 Grilled chicken breast (approx 150g)</Text>
              <Text style={styles.ingredient}>🍚 Quinoa / Brown Rice (approx 100g)</Text>
              <Text style={styles.ingredient}>🥬 Mixed veggies & avocado</Text>
            </View>
          </View>
        </View>

        {/* Bottom Menu Item */}
        <TouchableOpacity style={styles.bottomMenuItem}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Feather name="pie-chart" size={20} color="#1A1A1A" style={{marginRight: 10}} />
            <Text style={styles.bottomMenuText}>View Weekly Nutrition Analytics</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#8E8E93" />
        </TouchableOpacity>
        
        <View style={{height: 30}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
  scannerBtn: {
    backgroundColor: '#E91E63',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#E91E63',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  scannerBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  mealTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  mealTab: {
    paddingBottom: 5,
  },
  mealTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#1A1A1A',
  },
  mealTabText: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '500',
  },
  mealTabTextActive: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '700',
  },
  mealCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
    marginBottom: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  mealImagePlaceholder: {
    height: 180,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 15,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  mealInfo: {
    padding: 20,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  mealName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  editBtn: {
    padding: 5,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  macroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  ingredientsList: {
    marginTop: 5,
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 12,
  },
  ingredient: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  bottomMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  }
});
