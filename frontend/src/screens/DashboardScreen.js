import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import apiClient from '../api/client';

export default function DashboardScreen({ navigation }) {
  const [recommendation, setRecommendation] = useState(null);

  useEffect(() => {
    // In a real app, you would fetch this after checking if user is logged in
    const fetchRecommendations = async () => {
      try {
        // Uncomment when auth is implemented
        // const response = await apiClient.get('/recommendations');
        // setRecommendation(response.data);
        
        // Mock data for UI preview
        setRecommendation({
          workout_plan: "Full Body Beginner Routine",
          exercises: ["Pushups - 3x10", "Squats - 3x15", "Plank - 3x30s"],
          recovery_advice: "Make sure to stretch your legs and get at least 8 hours of sleep."
        });
      } catch (error) {
        console.error("Failed to load recommendations", error);
      }
    };
    fetchRecommendations();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, User!</Text>
        <Text style={styles.subtitle}>Let's crush your goals today.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Nutrition</Text>
        <Text style={styles.cardText}>Calories: 1200 / 2000 kcal</Text>
        <Text style={styles.cardText}>Protein: 80g / 150g</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('FoodScanner')}
        >
          <Text style={styles.buttonText}>Scan Meal</Text>
        </TouchableOpacity>
      </View>

      {recommendation && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI Recommendation</Text>
          <Text style={styles.cardSubtitle}>{recommendation.workout_plan}</Text>
          {recommendation.exercises.map((ex, idx) => (
            <Text key={idx} style={styles.listItem}>• {ex}</Text>
          ))}
          <Text style={[styles.cardText, { marginTop: 10, fontStyle: 'italic' }]}>
            Tip: {recommendation.recovery_advice}
          </Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 20,
    marginTop: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#1E1E1E',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  cardSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  cardText: {
    color: '#ddd',
    fontSize: 16,
    marginBottom: 5,
  },
  listItem: {
    color: '#bbb',
    fontSize: 15,
    marginLeft: 10,
    marginTop: 5,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
