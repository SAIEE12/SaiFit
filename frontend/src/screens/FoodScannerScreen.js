import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../api/client';

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
      // In a real app, ensure backend accepts this large payload
      // or upload to Cloudinary first, then send URL to backend
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
          <ActivityIndicator size="large" color="#4CAF50" />
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
    backgroundColor: '#121212',
    padding: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 15,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
  resultContainer: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 15,
    width: '100%',
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 15,
    textTransform: 'capitalize',
  },
  resultText: {
    color: '#ddd',
    fontSize: 16,
    marginBottom: 8,
  }
});
