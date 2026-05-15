import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const CalendarStrip = ({ selectedDate, onDateSelected }) => {
  const dates = [];
  const today = new Date();
  
  // Generate dates for the last 10 days and next 10 days
  for (let i = -10; i <= 10; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);
    dates.push(date);
  }

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getDayName = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {dates.map((date, index) => {
          const dateStr = formatDate(date);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === formatDate(today);

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dateCard,
                isSelected && styles.selectedCard
              ]}
              onPress={() => onDateSelected(dateStr)}
            >
              <Text style={[styles.dayText, isSelected && styles.selectedText]}>{getDayName(date).toUpperCase()}</Text>
              <View style={[styles.circle, isSelected && styles.selectedCircle, isToday && !isSelected && styles.todayCircle]}>
                <Text style={[styles.dateText, isSelected && styles.selectedText]}>{date.getDate()}</Text>
              </View>
              {isToday && !isSelected && <View style={styles.todayIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 15,
  },
  dateCard: {
    width: 55,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  dayText: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 1,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  selectedCircle: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63',
    shadowColor: '#E91E63',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  todayCircle: {
    borderColor: '#E91E63',
    borderWidth: 1.5,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  selectedText: {
    color: '#FFF',
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E91E63',
    marginTop: 6,
  }
});

export default CalendarStrip;
