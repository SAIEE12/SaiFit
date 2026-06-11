import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    paddingVertical: theme.spacing.md,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
  },
  dateCard: {
    width: 55,
    alignItems: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  dayText: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedCircle: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.primaryGlow,
  },
  todayCircle: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  dateText: {
    ...theme.typography.body,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  selectedText: {
    color: '#FFF',
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  }
});

export default CalendarStrip;
