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
import ScreenContainer from '../components/ui/ScreenContainer';
import { Header, SectionHeader } from '../components/ui/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { LoadingState, EmptyState } from '../components/ui/StateViews';

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
    <View style={styles.container}>
      <Header title="Nutrition" />

      <ScreenContainer scrollable keyboardAvoiding={false} edges={['bottom']}>
        {/* Macros Dashboard Card */}
        <Card variant="elevated" style={styles.dashboard}>
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
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Button variant="primary" style={{ flex: 1 }} onPress={() => {
            if (!permission || !permission.granted) {
              requestPermission().then(res => {
                if (res.granted) setShowCamera(true);
              });
            } else {
              setShowCamera(true);
            }
          }} icon={<Feather name="camera" size={16} color="#FFF" />}>
            Scan
          </Button>
          <Button variant="secondary" style={{ flex: 1, backgroundColor: theme.colors.success }} onPress={handleUploadImage} icon={<Feather name="image" size={16} color="#FFF" />}>
            Upload
          </Button>
          <Button variant="secondary" style={{ flex: 1, backgroundColor: theme.colors.darkBase }} onPress={() => setShowTextUI(!showTextUI)} icon={<Feather name="edit-3" size={16} color="#FFF" />}>
            Type
          </Button>
        </View>

        {/* AI Smart Search Card */}
        {isSmartSearchEnabled && (
          <Card style={styles.smartSearchCard}>
            <View style={styles.smartSearchHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
                <Text style={styles.smartSearchTitle}>AI SMART SEARCH</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Badge variant="primary" label="LIVE" style={{ paddingHorizontal: 8, paddingVertical: 3 }} />
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
                  <Button variant="primary" size="sm" onPress={handleSmartSearch} loading={searchingAI} style={styles.smartSearchBtn}>
                    <Feather name="search" size={18} color="#FFF" />
                  </Button>
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
                          <Feather name="trash-2" size={15} color={theme.colors.danger} />
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
                      <Button variant="secondary" size="md" onPress={unlogSmartSearchResult} style={{ backgroundColor: theme.colors.border }} textStyle={{ color: theme.colors.danger }}>
                        Unlog Recommended Meal
                      </Button>
                    ) : (
                      <Button variant="primary" size="md" onPress={logSmartSearchResult}>
                        Log Recommended Meal
                      </Button>
                    )}
                  </View>
                )}
              </>
            )}
          </Card>
        )}

        {showTextUI && (
          <Card style={styles.textInputCard}>
            <TextInput 
              style={styles.textInput} 
              placeholder='e.g., "Chicken salad with olive oil"' 
              placeholderTextColor={theme.colors.textTertiary}
              value={textInput}
              onChangeText={setTextInput}
              multiline
            />
            <Button variant="primary" size="md" onPress={analyzeText} style={{ backgroundColor: theme.colors.darkBase }}>
              Analyze with AI
            </Button>
          </Card>
        )}

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>AI is calculating nutrients...</Text>
          </View>
        )}

        {scannedResult && !loading && (
          <Card style={[styles.resultCard, { borderColor: theme.colors.primary, borderWidth: 1.5 }]}>
            <View style={styles.resultHeader}>
                <Text style={styles.resultName}>{scannedResult.food_name}</Text>
                <Badge variant="primary" label="AI ANALYZED" icon={<Feather name="zap" size={10} color="#FFF" style={{ marginRight: 2 }} />} />
            </View>
            <View style={styles.resultMacros}>
                <View style={styles.resMacro}><Text style={styles.resMacroVal}>{scannedResult.calories}</Text><Text style={styles.resMacroLab}>kcal</Text></View>
                <View style={styles.resMacro}><Text style={styles.resMacroVal}>{scannedResult.protein}g</Text><Text style={styles.resMacroLab}>Prot</Text></View>
                <View style={styles.resMacro}><Text style={styles.resMacroVal}>{scannedResult.carbs}g</Text><Text style={styles.resMacroLab}>Carb</Text></View>
                <View style={styles.resMacro}><Text style={styles.resMacroVal}>{scannedResult.fats}g</Text><Text style={styles.resMacroLab}>Fat</Text></View>
            </View>
            <Button variant="primary" size="md" onPress={saveLog}>
              Log this Meal
            </Button>
          </Card>
        )}

        <SectionHeader title={selectedDate === getLocalDateString() ? "TODAY'S HISTORY" : `${selectedDate}'S HISTORY`} />

        <View style={{ paddingHorizontal: theme.spacing.xxl }}>
          {foodLogsList.length > 0 ? foodLogsList.map((log, i) => (
            <Card key={i} style={styles.historyCard}>
              <View style={styles.historyIcon}><MaterialCommunityIcons name="food" size={20} color={theme.colors.primary} /></View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyName}>{log.food_name}</Text>
                <Text style={styles.historyMeta}>{log.calories} kcal • {log.protein}g Protein</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={styles.historyTime}>{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                <TouchableOpacity onPress={() => handleDeleteMealLog(log.id)} style={styles.deleteAction}>
                  <Feather name="x-circle" size={18} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            </Card>
          )) : (
            <EmptyState
              icon="coffee"
              title="No food logs"
              description="No food logs recorded today."
            />
          )}
        </View>
        
        <View style={{height: 100}} />
      </ScreenContainer>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  dashboard: {
    marginHorizontal: theme.spacing.xxl, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 25,
  },
  mainCals: { alignItems: 'center', flex: 1 },
  dashboardVal: { ...theme.typography.metricSmall, color: theme.colors.primary },
  dashboardLab: { ...theme.typography.labelSmall, color: theme.colors.textSecondary },
  dashboardDivider: { width: 1, height: 44, backgroundColor: theme.colors.border, marginHorizontal: 16 },
  macroGrid: { flex: 2, flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { alignItems: 'center' },
  macroVal: { ...theme.typography.h5, color: theme.colors.textPrimary },
  macroLab: { ...theme.typography.caption, color: theme.colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 12, paddingHorizontal: theme.spacing.xxl, marginBottom: 25 },
  textInputCard: { marginHorizontal: theme.spacing.xxl, marginBottom: 25 },
  textInput: { backgroundColor: theme.colors.border, borderRadius: theme.radii.lg, padding: 16, minHeight: 80, textAlignVertical: 'top', fontSize: 15, color: theme.colors.textPrimary, marginBottom: 15, fontWeight: '500' },
  loadingWrap: { marginVertical: 30, alignItems: 'center' },
  loadingText: { ...theme.typography.captionStrong, color: theme.colors.textSecondary, marginTop: 10 },
  resultCard: { marginHorizontal: theme.spacing.xxl, marginBottom: 25 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  resultName: { ...theme.typography.h4, color: theme.colors.textPrimary, flex: 1 },
  resultMacros: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  resMacro: { alignItems: 'center' },
  resMacroVal: { ...theme.typography.h5, color: theme.colors.textPrimary },
  resMacroLab: { ...theme.typography.caption, color: theme.colors.textSecondary },
  historyCard: { 
    flexDirection: 'row', alignItems: 'center', 
    marginBottom: 12,
  },
  historyIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  historyInfo: { flex: 1 },
  historyName: { ...theme.typography.h5, color: theme.colors.textPrimary },
  historyMeta: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  historyTime: { ...theme.typography.captionStrong, color: theme.colors.textSecondary },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: 30 },
  closeCameraBtn: { marginTop: 40 },
  captureBtn: { alignSelf: 'center', marginBottom: 40, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF' },
  deleteAction: { padding: 4 },

  smartSearchCard: {
    marginHorizontal: theme.spacing.xxl,
    marginBottom: 25,
  },
  smartSearchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  smartSearchTitle: {
    ...theme.typography.labelSmall,
    color: theme.colors.textPrimary,
    marginLeft: 6,
  },
  minimizeBtn: {
    padding: 2,
  },
  smartSearchDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  smartSearchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smartSearchInput: {
    flex: 1,
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  smartSearchBtn: {
    width: 48,
    height: 48,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartResultContainer: {
    marginTop: 20,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  smartResultHeader: {
    marginBottom: 12,
  },
  smartResultName: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  smartResultAdvice: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    lineHeight: 18,
  },
  smartResultMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  smartMacro: {
    alignItems: 'center',
  },
  smartMacroVal: {
    ...theme.typography.h5,
    color: theme.colors.textPrimary,
  },
  smartMacroLab: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  clearResultBtn: {
    padding: 4,
  },
});
