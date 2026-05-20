import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import CustomDialog from '../components/CustomDialog';
import apiClient from '../api/client';
import { theme } from '../theme';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function MealsScreen() {
  const [loading, setLoading] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [showTextUI, setShowTextUI] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [mealLogs, setMealLogs] = useState([]);
  const [macros, setMacros] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  
  // Smart Search States
  const [isSmartSearchEnabled, setIsSmartSearchEnabled] = useState(false);
  const [isSmartSearchCollapsed, setIsSmartSearchCollapsed] = useState(false);
  const [smartSearchQuery, setSmartSearchQuery] = useState('');
  const [smartSearchResult, setSmartSearchResult] = useState(null);
  const [lastLoggedSmartSearchId, setLastLoggedSmartSearchId] = useState(null);
  const [searchingAI, setSearchingAI] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef(null);

  // Reusable Dialog State
  const [dialog, setDialog] = useState({
      visible: false,
      title: '',
      description: '',
      type: 'info',
      confirmText: 'OK',
      cancelText: 'Cancel',
      onConfirm: () => {},
      onCancel: null
  });

  const showDialog = (title, description, type = 'info', onConfirm = null, onCancel = null, confirmText = 'OK') => {
      setDialog({
          visible: true,
          title,
          description,
          type,
          confirmText,
          cancelText: 'Cancel',
          onConfirm: () => {
              setDialog(prev => ({ ...prev, visible: false }));
              if (onConfirm) onConfirm();
          },
          onCancel: onCancel ? () => {
              setDialog(prev => ({ ...prev, visible: false }));
              onCancel();
          } : null
      });
  };

  useFocusEffect(
    useCallback(() => {
      fetchMealLogs();
      checkSmartSearchStatus();
    }, [selectedDate])
  );

  const checkSmartSearchStatus = async () => {
    try {
      const res = await apiClient.get('/nutrition/smart-search/status');
      setIsSmartSearchEnabled(res.data.enabled);
    } catch (e) {
      console.error("Failed to check smart search status", e);
    }
  };

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
      quality: 0.2, // Highly compressed for rapid AI scanning
    });
    if (!result.canceled) analyzeImage(result.assets[0].uri, 'upload');
  };

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ 
        quality: 0.2, // Compressed camera resolution
        skipProcessing: false
      });
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
      showDialog("Analysis Failed", error.message, "error");
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
      showDialog("Analysis Failed", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSmartSearch = async () => {
    if (!smartSearchQuery.trim()) return;
    setSearchingAI(true);
    setSmartSearchResult(null);
    setLastLoggedSmartSearchId(null); // Reset for new search
    try {
      const res = await apiClient.post('/nutrition/smart-search', { query: smartSearchQuery });
      setSmartSearchResult(res.data);
    } catch (e) {
      showDialog("AI Search Error", e.response?.data?.error || e.message, "error");
    } finally {
      setSearchingAI(false);
    }
  };

  const logSmartSearchResult = async () => {
    if (!smartSearchResult) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/nutrition/log', {
        food_name: smartSearchResult.food_name,
        calories: smartSearchResult.calories,
        protein: smartSearchResult.protein,
        carbs: smartSearchResult.carbs,
        fats: smartSearchResult.fats,
        input_type: 'smart_search',
        date: selectedDate
      });
      // Track logged log ID
      if (res.data && res.data.id) {
          setLastLoggedSmartSearchId(res.data.id);
      }
      showDialog("Logged! 🎉", "AI suggested meal nutrition logged successfully.", "success", () => {
          fetchMealLogs();
      });
    } catch (error) {
      showDialog("Error", "Failed to save smart search nutrition log.", "error");
    } finally {
      setLoading(false);
    }
  };

  const unlogSmartSearchResult = async () => {
    if (!lastLoggedSmartSearchId) return;
    showDialog(
        "Unlog Food Recommendation",
        "Are you sure you want to remove this recommended item from your logs?",
        "confirm",
        async () => {
            try {
                setLoading(true);
                await apiClient.delete(`/nutrition/log/${lastLoggedSmartSearchId}`);
                setLastLoggedSmartSearchId(null); // Revert to default
                showDialog("Removed", "Recommended meal successfully removed.", "success", () => {
                    fetchMealLogs();
                });
            } catch(e) {
                showDialog("Error", "Could not unlog recommended meal.", "error");
            } finally {
                setLoading(false);
            }
        },
        () => {},
        "Unlog"
    );
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
        input_type: scannedResult.input_type,
        date: selectedDate
      });
      setScannedResult(null);
      showDialog("Logged! 🎉", "Meal nutrition logged successfully.", "success", () => {
          fetchMealLogs();
      });
    } catch (error) {
      showDialog("Error", "Failed to save nutrition log to database.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMealLog = async (logId) => {
    showDialog(
        "Remove Food Log",
        "Are you sure you want to remove this food item from your daily logs?",
        "confirm",
        async () => {
            try {
                setLoading(true);
                await apiClient.delete(`/nutrition/log/${logId}`);
                // If the user deletes the log from history that matches the last logged smart search, reset toggle button state
                if (logId === lastLoggedSmartSearchId) {
                    setLastLoggedSmartSearchId(null);
                }
                showDialog("Removed", "Food item has been deleted successfully.", "success", () => {
                    fetchMealLogs();
                });
            } catch(e) {
                showDialog("Error", e.response?.data?.error || "Could not delete food log.", "error");
            } finally {
                setLoading(false);
            }
        },
        () => {},
        "Delete"
    );
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

  // Extract individual logs self-healingly
  const foodLogsList = mealLogs.flatMap(meal => (meal.logs || []).map(log => ({ ...log, mealId: meal.id })));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nutrition</Text>
        </View>

        {/* Macros Dashboard Card */}
        <View style={styles.dashboard}>
          <View style={styles.mainCals}>
            <Text style={styles.dashboardVal}>{macros.calories}</Text>
            <Text style={styles.dashboardLab}>kcal consumed</Text>
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
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: theme.colors.primary}]} onPress={() => {
            if (!permission || !permission.granted) {
              requestPermission().then(res => {
                if (res.granted) setShowCamera(true);
              });
            } else {
              setShowCamera(true);
            }
          }}>
            <Feather name="camera" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: theme.colors.green}]} onPress={handleUploadImage}>
            <Feather name="image" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: theme.colors.darkBase}]} onPress={() => setShowTextUI(!showTextUI)}>
            <Feather name="edit-3" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>Type</Text>
          </TouchableOpacity>
        </View>

        {/* AI Smart Search Card */}
        {isSmartSearchEnabled && (
          <View style={styles.smartSearchCard}>
            <View style={styles.smartSearchHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
                <Text style={styles.smartSearchTitle}>AI SMART SEARCH</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={styles.smartSearchLiveTag}>LIVE</Text>
                <TouchableOpacity onPress={() => setIsSmartSearchCollapsed(!isSmartSearchCollapsed)} style={styles.minimizeBtn}>
                  <Feather name={isSmartSearchCollapsed ? "chevron-down" : "chevron-up"} size={18} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
            
            {!isSmartSearchCollapsed && (
              <>
                <Text style={styles.smartSearchDesc}>Search conceptually for recipes, meals, or nutrients (e.g. "Suggest a recovery meal post long run").</Text>
                
                <View style={styles.smartSearchRow}>
                  <TextInput 
                    style={styles.smartSearchInput}
                    placeholder="Search recovery recipes or conceptual meals..."
                    placeholderTextColor={theme.colors.textTertiary}
                    value={smartSearchQuery}
                    onChangeText={setSmartSearchQuery}
                  />
                  <TouchableOpacity style={styles.smartSearchBtn} onPress={handleSmartSearch} disabled={searchingAI}>
                    {searchingAI ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Feather name="search" size={18} color="#FFF" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Smart Search Result Panel */}
                {smartSearchResult && (
                  <View style={styles.smartResultContainer}>
                    <View style={styles.smartResultHeader}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={[styles.smartResultName, { flex: 1, paddingRight: 10 }]}>{smartSearchResult.food_name}</Text>
                        <TouchableOpacity onPress={() => {
                          setSmartSearchResult(null);
                          setSmartSearchQuery('');
                          setLastLoggedSmartSearchId(null);
                        }} style={styles.clearResultBtn}>
                          <Feather name="trash-2" size={15} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.smartResultAdvice}>💡 {smartSearchResult.advice}</Text>
                    </View>
                    
                    <View style={styles.smartResultMacros}>
                      <View style={styles.smartMacro}><Text style={styles.smartMacroVal}>{smartSearchResult.calories}</Text><Text style={styles.smartMacroLab}>kcal</Text></View>
                      <View style={styles.smartMacro}><Text style={styles.smartMacroVal}>{smartSearchResult.protein}g</Text><Text style={styles.smartMacroLab}>Prot</Text></View>
                      <View style={styles.smartMacro}><Text style={styles.smartMacroVal}>{smartSearchResult.carbs}g</Text><Text style={styles.smartMacroLab}>Carb</Text></View>
                      <View style={styles.smartMacro}><Text style={styles.smartMacroVal}>{smartSearchResult.fats}g</Text><Text style={styles.smartMacroLab}>Fat</Text></View>
                    </View>

                    {lastLoggedSmartSearchId ? (
                      <TouchableOpacity style={styles.smartUnlogBtn} onPress={unlogSmartSearchResult}>
                        <Text style={styles.smartUnlogBtnText}>Unlog Recommended Meal</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.smartLogBtn} onPress={logSmartSearchResult}>
                        <Text style={styles.smartLogBtnText}>Log Recommended Meal</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {showTextUI && (
          <View style={styles.textInputCard}>
            <TextInput 
              style={styles.textInput} 
              placeholder='e.g., "Chicken salad with olive oil"' 
              placeholderTextColor={theme.colors.textTertiary}
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
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>AI is calculating nutrients...</Text>
          </View>
        )}

        {scannedResult && !loading && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
                <Text style={styles.resultName}>{scannedResult.food_name}</Text>
                <View style={styles.aiBadge}><Feather name="zap" size={12} color={theme.colors.primary} /><Text style={styles.aiBadgeText}>AI ANALYZED</Text></View>
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
          <Text style={styles.sectionTitle}>
            {selectedDate === getLocalDateString() ? "TODAY'S HISTORY" : `${selectedDate}'S HISTORY`}
          </Text>
          {foodLogsList.length > 0 ? foodLogsList.map((log, i) => (
            <View key={i} style={styles.historyCard}>
              <View style={styles.historyIcon}><MaterialCommunityIcons name="food" size={20} color={theme.colors.primary} /></View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyName}>{log.food_name}</Text>
                <Text style={styles.historyMeta}>{log.calories} kcal • {log.protein}g Protein</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={styles.historyTime}>{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                <TouchableOpacity onPress={() => handleDeleteMealLog(log.id)} style={styles.deleteAction}>
                  <Feather name="x-circle" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          )) : (
            <View style={styles.emptyHistory}>
              <Feather name="coffee" size={36} color={theme.colors.textTertiary} />
              <Text style={styles.emptyText}>No food logs recorded today.</Text>
            </View>
          )}
        </View>
        
        <View style={{height: 100}} />
      </ScrollView>

      {/* Custom Reusable Dialog Alert */}
      <CustomDialog 
          visible={dialog.visible}
          title={dialog.title}
          description={dialog.description}
          type={dialog.type}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          onConfirm={dialog.onConfirm}
          onCancel={dialog.onCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.xxl, paddingTop: theme.spacing.lg, marginBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.5 },
  dashboard: {
    backgroundColor: theme.colors.card, 
    marginHorizontal: theme.spacing.xxl, 
    padding: 20, 
    borderRadius: theme.borderRadius.xxl,
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 25,
    borderWidth: 1, 
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  mainCals: { alignItems: 'center', flex: 1 },
  dashboardVal: { fontSize: 30, fontWeight: '800', color: theme.colors.primary, letterSpacing: -0.5 },
  dashboardLab: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 0.5 },
  dashboardDivider: { width: 1, height: 44, backgroundColor: theme.colors.border, marginHorizontal: 16 },
  macroGrid: { flex: 2, flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { alignItems: 'center' },
  macroVal: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
  macroLab: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 12, paddingHorizontal: theme.spacing.xxl, marginBottom: 25 },
  actionBtn: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    paddingVertical: 14, borderRadius: theme.borderRadius.xxl, gap: 8,
    ...theme.shadows.soft
  },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  textInputCard: { marginHorizontal: theme.spacing.xxl, backgroundColor: theme.colors.card, padding: 16, borderRadius: theme.borderRadius.xxl, marginBottom: 25, borderWidth: 1, borderColor: theme.colors.border },
  textInput: { backgroundColor: theme.colors.border, borderRadius: theme.borderRadius.lg, padding: 16, minHeight: 80, textAlignVertical: 'top', fontSize: 15, color: theme.colors.textPrimary, marginBottom: 15, fontWeight: '500' },
  analyzeBtn: { backgroundColor: theme.colors.darkBase, paddingVertical: 14, borderRadius: theme.borderRadius.lg, alignItems: 'center' },
  analyzeBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  loadingWrap: { marginVertical: 30, alignItems: 'center' },
  loadingText: { marginTop: 10, color: theme.colors.textSecondary, fontWeight: '600', fontSize: 13 },
  resultCard: { backgroundColor: theme.colors.card, marginHorizontal: theme.spacing.xxl, padding: 20, borderRadius: theme.borderRadius.xxl, marginBottom: 25, borderWidth: 1, borderColor: theme.colors.primary },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  resultName: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, flex: 1 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.accentPinkLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  aiBadgeText: { fontSize: 9, fontWeight: '900', color: theme.colors.primary, marginLeft: 4 },
  resultMacros: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  resMacro: { alignItems: 'center' },
  resMacroVal: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
  resMacroLab: { fontSize: 11, color: theme.colors.textSecondary },
  saveBtn: { backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: theme.borderRadius.lg, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  historySection: { paddingHorizontal: theme.spacing.xxl },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 1.5, marginBottom: 14 },
  historyCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, padding: 16, borderRadius: theme.borderRadius.xxl, 
    marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.soft
  },
  historyIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: theme.colors.accentPinkLight, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  historyInfo: { flex: 1 },
  historyName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  historyMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  historyTime: { fontSize: 12, fontWeight: '700', color: theme.colors.textTertiary },
  emptyHistory: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 10, color: theme.colors.textSecondary, fontWeight: '600', fontSize: 14 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: 30 },
  closeCameraBtn: { marginTop: 40 },
  captureBtn: { alignSelf: 'center', marginBottom: 40, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF' },
  deleteAction: { padding: 4 },

  smartSearchCard: {
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.xxl,
    borderRadius: theme.borderRadius.xxl,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  smartSearchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  smartSearchTitle: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 1.5,
  },
  smartSearchLiveTag: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: '900',
    backgroundColor: theme.colors.accentPinkLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 1,
  },
  minimizeBtn: {
    padding: 2,
  },
  smartSearchDesc: {
    color: '#666',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    fontWeight: '500',
  },
  smartSearchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smartSearchInput: {
    flex: 1,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  smartSearchBtn: {
    backgroundColor: theme.colors.primary,
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartResultContainer: {
    marginTop: 20,
    backgroundColor: theme.colors.accentPinkLight,
    borderRadius: theme.borderRadius.xxl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.15)',
  },
  smartResultHeader: {
    marginBottom: 12,
  },
  smartResultName: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  smartResultAdvice: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  smartResultMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: theme.colors.card,
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  smartMacro: {
    alignItems: 'center',
  },
  smartMacroVal: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  smartMacroLab: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  smartLogBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  smartLogBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  smartUnlogBtn: {
    backgroundColor: theme.colors.border,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  smartUnlogBtnText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '800',
  },
  clearResultBtn: {
    padding: 4,
  },
});
