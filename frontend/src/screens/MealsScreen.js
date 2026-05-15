import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import apiClient from '../api/client';

export default function MealsScreen() {
  const [loading, setLoading] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [showTextUI, setShowTextUI] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [mealLogs, setMealLogs] = useState([]);
  const [macros, setMacros] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    fetchMealLogs();
  }, [selectedDate]);

  const fetchMealLogs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/nutrition/meals?date=${selectedDate}`);
      setMealLogs(res.data);
      
      // Calculate totals
      const totals = res.data.reduce((acc, m) => ({
        calories: acc.calories + (m.total_calories || 0),
        protein: acc.protein + (m.total_protein || 0),
        carbs: acc.carbs + (m.total_carbs || 0),
        fats: acc.fats + (m.total_fats || 0)
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
      setMacros(totals);
    } catch (e) {
      console.error("Failed to fetch logs", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) analyzeImage(result.assets[0].uri, 'upload');
  };

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setShowCamera(false);
      analyzeImage(photo.uri, 'scan');
    }
  };

  const analyzeImage = async (uri, type) => {
    setLoading(true);
    setScannedResult(null);
    setShowTextUI(false);
    try {
      const formData = new FormData();
      formData.append('image', { uri, name: 'food.jpg', type: 'image/jpeg' });
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
      setScannedResult(null);
      fetchMealLogs();
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
            <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.closeCameraBtn}><Feather name="x" size={28} color="#FFF"/></TouchableOpacity>
            <TouchableOpacity onPress={handleTakePicture} style={styles.captureBtn}><View style={styles.captureBtnInner} /></TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nutrition</Text>
        </View>

        {/* Macros Dashboard */}
        <View style={styles.dashboard}>
          <View style={styles.mainCals}>
            <Text style={styles.dashboardVal}>{macros.calories}</Text>
            <Text style={styles.dashboardLab}>kcal today</Text>
          </View>
          <View style={styles.dashboardDivider} />
          <View style={styles.macroGrid}>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{macros.protein}g</Text>
              <Text style={styles.macroLab}>Protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{macros.carbs}g</Text>
              <Text style={styles.macroLab}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroVal}>{macros.fats}g</Text>
              <Text style={styles.macroLab}>Fats</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#E91E63'}]} onPress={() => setShowCamera(true)}>
            <Feather name="camera" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#4CAF50'}]} onPress={handleUploadImage}>
            <Feather name="image" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#1A1A1A'}]} onPress={() => setShowTextUI(!showTextUI)}>
            <Feather name="edit-3" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Type</Text>
          </TouchableOpacity>
        </View>

        {showTextUI && (
          <View style={styles.textInputCard}>
            <TextInput 
              style={styles.textInput} 
              placeholder='e.g., "Chicken salad with olive oil"' 
              placeholderTextColor="#8E8E93"
              value={textInput}
              onChangeText={setTextInput}
              multiline
            />
            <TouchableOpacity style={styles.analyzeBtn} onPress={analyzeText}>
              <Text style={styles.analyzeBtnText}>Analyze with AI</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#E91E63" />
            <Text style={styles.loadingText}>AI is calculating nutrients...</Text>
          </View>
        )}

        {scannedResult && !loading && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
                <Text style={styles.resultName}>{scannedResult.food_name}</Text>
                <View style={styles.aiBadge}><Feather name="zap" size={12} color="#E91E63" /><Text style={styles.aiBadgeText}>AI</Text></View>
            </View>
            <View style={styles.resultMacros}>
                <View style={styles.resMacro}><Text style={styles.resMacroVal}>{scannedResult.calories}</Text><Text style={styles.resMacroLab}>kcal</Text></View>
                <View style={styles.resMacro}><Text style={styles.resMacroVal}>{scannedResult.protein}g</Text><Text style={styles.resMacroLab}>Prot</Text></View>
                <View style={styles.resMacro}><Text style={styles.resMacroVal}>{scannedResult.carbs}g</Text><Text style={styles.resMacroLab}>Carb</Text></View>
                <View style={styles.resMacro}><Text style={styles.resMacroVal}>{scannedResult.fats}g</Text><Text style={styles.resMacroLab}>Fat</Text></View>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveLog}>
              <Text style={styles.saveBtnText}>Log this Meal</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Today's History</Text>
          {mealLogs.length > 0 ? mealLogs.map((log, i) => (
            <View key={i} style={styles.historyCard}>
              <View style={styles.historyIcon}><MaterialCommunityIcons name="food" size={22} color="#E91E63" /></View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyName}>{log.food_name || log.meal_type}</Text>
                <Text style={styles.historyMeta}>{log.total_calories} kcal • {log.total_protein}g Protein</Text>
              </View>
              <Text style={styles.historyTime}>{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </View>
          )) : (
            <View style={styles.emptyHistory}>
              <Feather name="coffee" size={40} color="#E0E0E0" />
              <Text style={styles.emptyText}>No meals logged today</Text>
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
  header: { padding: 20, paddingTop: 10 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
  dashboard: {
    backgroundColor: '#FFF', marginHorizontal: 20, padding: 20, borderRadius: 24,
    flexDirection: 'row', alignItems: 'center', marginBottom: 25,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F5F5F5'
  },
  mainCals: { alignItems: 'center', flex: 1 },
  dashboardVal: { fontSize: 32, fontWeight: '800', color: '#E91E63' },
  dashboardLab: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  dashboardDivider: { width: 1, height: 50, backgroundColor: '#EEE', marginHorizontal: 20 },
  macroGrid: { flex: 2, flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { alignItems: 'center' },
  macroVal: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  macroLab: { fontSize: 11, fontWeight: '600', color: '#8E8E93' },
  actionRow: { flexDirection: 'row', gap: 15, paddingHorizontal: 20, marginBottom: 25 },
  actionBtn: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    paddingVertical: 16, borderRadius: 16, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4
  },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  textInputCard: { marginHorizontal: 20, backgroundColor: '#FFF', padding: 15, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: '#EEE' },
  textInput: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 15, minHeight: 80, textAlignVertical: 'top', fontSize: 15, marginBottom: 15 },
  analyzeBtn: { backgroundColor: '#1A1A1A', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  analyzeBtnText: { color: '#FFF', fontWeight: '800' },
  loadingWrap: { marginVertical: 30, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#8E8E93', fontWeight: '600' },
  resultCard: { backgroundColor: '#FFF', marginHorizontal: 20, padding: 20, borderRadius: 24, marginBottom: 25, borderWidth: 1, borderColor: '#E91E63' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  resultName: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', flex: 1 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: '#E91E63', marginLeft: 4 },
  resultMacros: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  resMacro: { alignItems: 'center' },
  resMacroVal: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  resMacroLab: { fontSize: 11, color: '#8E8E93' },
  saveBtn: { backgroundColor: '#E91E63', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  historySection: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 15 },
  historyCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 20, 
    marginBottom: 12, borderWidth: 1, borderColor: '#F5F5F5' 
  },
  historyIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: '#FFF0F5', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  historyInfo: { flex: 1 },
  historyName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  historyMeta: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  historyTime: { fontSize: 12, fontWeight: '700', color: '#BBB' },
  emptyHistory: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 10, color: '#CCC', fontWeight: '600' },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: 30 },
  closeCameraBtn: { marginTop: 40 },
  captureBtn: { alignSelf: 'center', marginBottom: 40, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF' }
});
