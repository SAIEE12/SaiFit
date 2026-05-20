import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../api/client';
import { theme } from '../theme';

export default function FoodScannerScreen() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nutrition, setNutrition] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      analyzeFood(result.assets[0].base64);
    }
  };

  const analyzeFood = async (base64) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/nutrition/analyze', {
        imageBase64: base64,
      });
      setNutrition(response.data);
    } catch (error) {
      console.error("Failed to analyze image", error);
      alert("Error analyzing image. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Pick Food Image</Text>
      </TouchableOpacity>

      {image && (
        <Image source={{ uri: image }} style={styles.image} />
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Analyzing with Gemini AI...</Text>
        </View>
      )}

      {nutrition && !loading && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>{nutrition.food_name}</Text>
          <Text style={styles.resultText}>Calories: {nutrition.calories} kcal</Text>
          <Text style={styles.resultText}>Protein: {nutrition.protein} g</Text>
          <Text style={styles.resultText}>Carbs: {nutrition.carbs} g</Text>
          <Text style={styles.resultText}>Fats: {nutrition.fats} g</Text>
          
          <TouchableOpacity style={[styles.button, {marginTop: 20}]}>
            <Text style={styles.buttonText}>Log Meal</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: theme.borderRadius.xxl,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: 10,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: theme.colors.card,
    padding: 20,
    borderRadius: theme.borderRadius.xxl,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 15,
    textTransform: 'capitalize',
  },
  resultText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  }
});
