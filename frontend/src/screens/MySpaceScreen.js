import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

export default function MySpaceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>FRIDAY, 06 MAY</Text>
            <Text style={styles.greeting}>Hi, Manish 👋</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn}>
              <Feather name="bell" size={22} color="#1A1A1A" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Feather name="settings" size={22} color="#1A1A1A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Calorie Banner */}
        <TouchableOpacity style={styles.banner}>
          <View>
            <Text style={styles.bannerTitle}>DAILY CALORIE TARGET</Text>
            <Text style={styles.bannerSubtitle}>1,450 / 2,200 kcal consumed</Text>
          </View>
          <View style={styles.bannerAction}>
            <Text style={styles.bannerActionText}>750 left</Text>
          </View>
        </TouchableOpacity>

        {/* Macro Balance */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Macro Balance</Text>
          <TouchableOpacity><Text style={styles.seeAll}>DETAILS</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          <View style={[styles.macroCard, {borderColor: '#E91E63'}]}>
            <Text style={styles.macroTitle}>Protein</Text>
            <Text style={styles.macroValue}>85g <Text style={styles.macroTarget}>/ 140g</Text></Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, {width: '60%', backgroundColor: '#E91E63'}]} />
            </View>
          </View>
          
          <View style={[styles.macroCard, {borderColor: '#4CAF50'}]}>
            <Text style={styles.macroTitle}>Carbs</Text>
            <Text style={styles.macroValue}>120g <Text style={styles.macroTarget}>/ 200g</Text></Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, {width: '60%', backgroundColor: '#4CAF50'}]} />
            </View>
          </View>

          <View style={[styles.macroCard, {borderColor: '#FFC107'}]}>
            <Text style={styles.macroTitle}>Fats</Text>
            <Text style={styles.macroValue}>45g <Text style={styles.macroTarget}>/ 65g</Text></Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, {width: '70%', backgroundColor: '#FFC107'}]} />
            </View>
          </View>
        </ScrollView>

        {/* AI Insight / Recommendation */}
        <View style={styles.insightCard}>
          <View style={styles.insightIconWrap}>
            <FontAwesome5 name="magic" size={16} color="#FFF" />
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.insightTitle}>AI Health Insight</Text>
            <Text style={styles.insightText}>Increase protein intake by 20g today to meet your muscle gain goal. Try adding a protein shake or chicken breast to your dinner.</Text>
          </View>
        </View>

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
            <Text style={styles.goalValue}>4 / 8 gl</Text>
            <TouchableOpacity style={styles.addBtn}><Feather name="plus" size={16} color="#FFF"/></TouchableOpacity>
          </View>
        </View>

        <View style={styles.goalCard}>
          <View style={styles.goalRow}>
            <View style={[styles.goalIconWrap, {backgroundColor: '#EDE7F6'}]}>
              <MaterialCommunityIcons name="bed-empty" size={20} color="#673AB7" />
            </View>
            <Text style={styles.goalText}>Sleep</Text>
          </View>
          <View style={styles.trackAction}>
            <Text style={styles.goalValue}>6h 30m</Text>
            <TouchableOpacity style={styles.addBtn}><Feather name="plus" size={16} color="#FFF"/></TouchableOpacity>
          </View>
        </View>

        <View style={{height: 40}} />
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
