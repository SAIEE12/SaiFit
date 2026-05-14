import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import apiClient from '../api/client';

export default function MealsScreen() {
  const [loading, setLoading] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [showTextUI, setShowTextUI] = useState(false);
  
  // Camera state
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef(null);

  const handleUploadImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      analyzeImage(result.assets[0].uri, 'upload');
    }
  };

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setShowCamera(false);
      analyzeImage(photo.uri, 'scan');
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') return alert('Camera permission needed');
    }
    setShowCamera(true);
  };

  const analyzeImage = async (uri, type) => {
    setLoading(true);
    setScannedResult(null);
    setShowTextUI(false);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri,
        name: 'food.jpg',
        type: 'image/jpeg',
      });

      const res = await apiClient.post('/nutrition/analyze/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setScannedResult({ ...res.data, input_type: type, localUri: uri });
    } catch (error) {
      alert('Analysis failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeText = async () => {
    if (!textInput.trim()) return;
    setLoading(true);
    setScannedResult(null);
    try {
      const res = await apiClient.post('/nutrition/analyze/text', { text: textInput });
      setScannedResult({ ...res.data, input_type: 'text' });
      setShowTextUI(false);
      setTextInput('');
    } catch (error) {
      alert('Analysis failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveLog = async () => {
    if (!scannedResult) return;
    setLoading(true);
    try {
      await apiClient.post('/nutrition/log', {
        food_name: scannedResult.food_name,
        calories: scannedResult.calories,
        protein: scannedResult.protein,
        carbs: scannedResult.carbs,
        fats: scannedResult.fats,
        image_url: scannedResult.image_url,
        input_type: scannedResult.input_type
      });
      alert('Food logged successfully! ✅');
      setScannedResult(null);
    } catch (error) {
      alert('Failed to save log');
    } finally {
      setLoading(false);
    }
  };

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing="back" />
        <View style={[styles.cameraOverlay, StyleSheet.absoluteFill]}>
            <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.closeCameraBtn}>
                <Feather name="x" size={28} color="#FFF"/>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleTakePicture} style={styles.captureBtn}>
                <View style={styles.captureBtnInner} />
            </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Nutrition Diary</Text>
        </View>

        {/* Input Methods Row */}
        <View style={styles.inputMethodsRow}>
          <TouchableOpacity style={styles.inputBtn} onPress={openCamera}>
            <View style={styles.inputIconWrap}><Feather name="camera" size={24} color="#E91E63" /></View>
            <Text style={styles.inputBtnText}>Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inputBtn} onPress={handleUploadImage}>
            <View style={styles.inputIconWrap}><Feather name="image" size={24} color="#4CAF50" /></View>
            <Text style={styles.inputBtnText}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inputBtn} onPress={() => setShowTextUI(!showTextUI)}>
            <View style={styles.inputIconWrap}><Feather name="type" size={24} color="#2196F3" /></View>
            <Text style={styles.inputBtnText}>Text</Text>
          </TouchableOpacity>
        </View>

        {/* Text Input UI */}
        {showTextUI && (
          <View style={styles.textInputCard}>
            <TextInput 
              style={styles.textInput} 
              placeholder='e.g., "2 eggs and a bowl of oats"' 
              placeholderTextColor="#8E8E93"
              value={textInput}
              onChangeText={setTextInput}
              multiline
            />
            <TouchableOpacity style={styles.analyzeBtn} onPress={analyzeText}>
              <Text style={styles.analyzeBtnText}>Analyze</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E91E63" />
            <Text style={styles.loadingText}>Gemini AI is analyzing...</Text>
          </View>
        )}

        {/* Scanned Result Card */}
        {scannedResult && !loading && (
          <View style={styles.mealCard}>
            {scannedResult.localUri ? (
              <Image source={{uri: scannedResult.localUri}} style={styles.mealImagePlaceholder} />
            ) : (
              <View style={[styles.mealImagePlaceholder, {backgroundColor: '#E91E63', justifyContent:'center', alignItems:'center'}]}>
                 <FontAwesome5 name="utensils" size={40} color="#FFF" />
              </View>
            )}
            
            <View style={styles.mealInfo}>
              <View style={styles.mealRow}>
                <Text style={styles.mealName}>{scannedResult.food_name}</Text>
                <View style={styles.aiTag}>
                  <FontAwesome5 name="magic" size={10} color="#E91E63" style={{marginRight: 4}} />
                  <Text style={styles.aiTagText}>AI Estimated</Text>
                </View>
              </View>
              
              <View style={styles.macroChips}>
                 <View style={[styles.chip, {backgroundColor: '#FFF0F5'}]}><Text style={styles.chipText}>🔥 {scannedResult.calories} kcal</Text></View>
                 <View style={[styles.chip, {backgroundColor: '#E3F2FD'}]}><Text style={styles.chipText}>🥩 {scannedResult.protein}g P</Text></View>
                 <View style={[styles.chip, {backgroundColor: '#E8F5E9'}]}><Text style={styles.chipText}>🍚 {scannedResult.carbs}g C</Text></View>
                 <View style={[styles.chip, {backgroundColor: '#FFF8E1'}]}><Text style={styles.chipText}>🥑 {scannedResult.fats}g F</Text></View>
              </View>
              
              <TouchableOpacity style={styles.saveBtn} onPress={saveLog}>
                <Feather name="check" size={18} color="#FFF" style={{marginRight: 8}}/>
                <Text style={styles.saveBtnText}>Save Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 30,
  },
  closeCameraBtn: {
    alignSelf: 'flex-start',
    marginTop: 40,
  },
  captureBtn: {
    alignSelf: 'center',
    marginBottom: 40,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  inputMethodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inputBtn: {
    alignItems: 'center',
  },
  inputIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  inputBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  textInputCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  textInput: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  analyzeBtn: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  analyzeBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingContainer: {
    marginVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
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
    height: 200,
    width: '100%',
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
    flex: 1,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 10,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E91E63',
  },
  macroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
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
  saveBtn: {
    backgroundColor: '#E91E63',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  }
});
