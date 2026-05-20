import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function MySpaceScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [nutritionSummary, setNutritionSummary] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [hydration, setHydration] = useState(0);
  const [dailyWorkouts, setDailyWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [username, setUsername] = useState('Fitness Fan');
  const [showNotifications, setShowNotifications] = useState(false);

  // Active Streak Tracker States
  const [streakCount, setStreakCount] = useState(5);
  const [completedDays, setCompletedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const weekDays = [
    { label: 'M', name: 'Mon' },
    { label: 'T', name: 'Tue' },
    { label: 'W', name: 'Wed' },
    { label: 'T', name: 'Thu' },
    { label: 'F', name: 'Fri' },
    { label: 'S', name: 'Sat' },
    { label: 'S', name: 'Sun' }
  ];

  // AI Tone System State
  const [coachTone, setCoachTone] = useState('Supportive'); // Supportive | Direct | Challenger

  // Undo Mechanism State
  const [backupNotifications, setBackupNotifications] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const [undoTimeoutId, setUndoTimeoutId] = useState(null);

  // Context Menu bottom sheet state
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);

  // Interactive Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      category: 'AI COACH ALERT',
      time: 'Just now',
      title: 'New Recovery Plan Generated',
      desc: 'Based on your active streaks, your custom workouts for tomorrow are ready to view!',
      isRead: false,
      isPinned: false,
      isMuted: false,
      icon: 'sparkles',
      iconType: 'ionicons',
      color: '#FF2D55',
      bgColor: 'rgba(255, 45, 85, 0.08)'
    },
    {
      id: 2,
      category: 'HYDRATION TARGET',
      time: '2h ago',
      title: 'Hydration Milestone Reached',
      desc: 'Awesome job! You have logged more than 50% of your daily water intake target.',
      isRead: false,
      isPinned: false,
      isMuted: false,
      icon: 'water',
      iconType: 'material',
      color: '#007AFF',
      bgColor: 'rgba(0, 122, 255, 0.08)'
    },
    {
      id: 3,
      category: 'NUTRITION TARGET',
      time: '4h ago',
      title: 'Excellent Macro Balance',
      desc: 'Your latest logged lunch meal has met today\'s lean protein target goal.',
      isRead: true,
      isPinned: false,
      isMuted: false,
      icon: 'food-apple',
      iconType: 'material',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.08)'
    },
    {
      id: 4,
      category: 'STREAK MILESTONE',
      time: 'Yesterday',
      title: '3 Days Active Streak',
      desc: 'Keep pushing forward! You have logged your active targets three days in a row.',
      isRead: true,
      isPinned: false,
      isMuted: false,
      icon: 'award',
      iconType: 'feather',
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.08)'
    }
  ]);

  useFocusEffect(
    useCallback(() => {
      fetchDailyData();
    }, [selectedDate])
  );

  const fetchDailyData = async () => {
    try {
      setLoading(true);
      const [recRes, mealsRes, workoutsRes, hydrationRes, profileRes] = await Promise.all([
        apiClient.get('/recommendations'),
        apiClient.get(`/nutrition/meals?date=${selectedDate}`),
        apiClient.get(`/workouts?date=${selectedDate}`),
        apiClient.get(`/hydration?date=${selectedDate}`),
        apiClient.get('/profile')
      ]);
      
      setRecommendation(recRes.data);
      setDailyWorkouts(workoutsRes.data);
      setHydration(hydrationRes.data.amount_ml || 0);
      
      if (profileRes.data && profileRes.data.user && profileRes.data.user.username) {
        setUsername(profileRes.data.user.username);
      } else if (profileRes.data && profileRes.data.profile && profileRes.data.profile.full_name) {
        setUsername(profileRes.data.profile.full_name);
      }
      
      let totals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      mealsRes.data.forEach(meal => {
        totals.calories += meal.total_calories;
        totals.protein += meal.total_protein;
        totals.carbs += meal.total_carbs;
        totals.fats += meal.total_fats;
      });
      setNutritionSummary(totals);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearAllNotifications = () => {
    setBackupNotifications(notifications);
    setNotifications([]);
    setShowUndo(true);

    if (undoTimeoutId) clearTimeout(undoTimeoutId);

    const timeout = setTimeout(() => {
      setShowUndo(false);
      setBackupNotifications(null);
    }, 5000);
    setUndoTimeoutId(timeout);
  };

  const dismissNotification = (id) => {
    setBackupNotifications(notifications);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setShowUndo(true);

    if (undoTimeoutId) clearTimeout(undoTimeoutId);

    const timeout = setTimeout(() => {
      setShowUndo(false);
      setBackupNotifications(null);
    }, 5000);
    setUndoTimeoutId(timeout);
  };

  const undoAction = () => {
    if (backupNotifications) {
      setNotifications(backupNotifications);
      setBackupNotifications(null);
      setShowUndo(false);
      if (undoTimeoutId) clearTimeout(undoTimeoutId);
    }
  };

  // Streak Week Day Toggle Logic
  const handleToggleDay = (dayName) => {
    if (completedDays.includes(dayName)) {
      setCompletedDays(prev => prev.filter(d => d !== dayName));
      setStreakCount(prev => Math.max(0, prev - 1));
    } else {
      setCompletedDays(prev => [...prev, dayName]);
      setStreakCount(prev => prev + 1);
    }
  };

  // Context Menu Actions
  const openContextMenu = (notif) => {
    setSelectedNotification(notif);
    setShowContextMenu(true);
  };

  const toggleReadStatus = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n));
    setShowContextMenu(false);
  };

  const togglePinStatus = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
    setShowContextMenu(false);
  };

  const toggleMuteStatus = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isMuted: !n.isMuted } : n));
    setShowContextMenu(false);
  };

  const handleDeleteFromMenu = (id) => {
    setShowContextMenu(false);
    dismissNotification(id);
  };

  const hasUnread = notifications.some(n => !n.isRead);

  // Sorting: Pinned notifications stay beautifully pinned at top
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  // Dynamic Empathy Tone Mapping
  const getNotificationContent = (item) => {
    if (item.id === 1) { // AI Coach Recommendation Alert
      if (coachTone === 'Challenger') {
        return {
          title: 'Tomorrow is War! Plan Ready ⚡',
          desc: 'Your active streak is on fire. Your tomorrow workout setup is loaded and waiting. Tap Start Workout to accept!'
        };
      } else if (coachTone === 'Direct') {
        return {
          title: 'AI Recommendation Formulated',
          desc: 'Tomorrow recovery workouts routine is calculated. Click Start Workout to load settings.'
        };
      } else { // Supportive
        return {
          title: 'New Recovery Plan Generated',
          desc: 'Based on your active streaks, your custom workouts for tomorrow are ready to view! Let\'s keep it up.'
        };
      }
    } else if (item.id === 2) { // Hydration Goal Alert
      if (coachTone === 'Challenger') {
        return {
          title: 'HYDRATE OR DEFEAT! 💧',
          desc: 'Logged 50% of your water target. Don\'t slow down now—refuel your active muscles with +250ml below!'
        };
      } else if (coachTone === 'Direct') {
        return {
          title: 'Hydration Target: 50% Logged',
          desc: 'Logged: 1500ml / 3000ml. Click +250ml below to log additional volume.'
        };
      } else { // Supportive
        return {
          title: 'Hydration Milestone Reached',
          desc: 'Awesome job! You have logged more than 50% of your daily water intake. Let\'s drink a bit more.'
        };
      }
    } else if (item.id === 3) { // Nutrition Alert
      if (coachTone === 'Challenger') {
        return {
          title: 'FUEL LOADED: Protein Goal Locked 🍖',
          desc: 'Sensational lunch tracking. You fed your muscle tissue exactly the amino acids required for growth!'
        };
      } else if (coachTone === 'Direct') {
        return {
          title: 'Lunch Protein Met Goals',
          desc: 'Logged lunch contains optimal protein counts aligned with current macro targets.'
        };
      }
    } else if (item.id === 4) { // Streak Milestone
      if (coachTone === 'Challenger') {
        return {
          title: '3-DAY STREAK: UNSTOPPABLE! 🔥',
          desc: 'Consistency is power. Three consecutive days of logging. Do not let this record drop!'
        };
      } else if (coachTone === 'Direct') {
        return {
          title: 'Logged: 3 Days Consecutive',
          desc: 'All targets captured consecutively for three days.'
        };
      }
    }
    return { title: item.title, desc: item.desc };
  };

  const renderNotificationIcon = (notif) => {
    if (notif.iconType === 'ionicons') {
      return <Ionicons name={notif.icon} size={18} color={notif.color} />;
    } else if (notif.iconType === 'material') {
      return <MaterialCommunityIcons name={notif.icon} size={18} color={notif.color} />;
    } else {
      return <Feather name={notif.icon} size={18} color={notif.color} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateLabel}>{selectedDate === getLocalDateString() ? 'TODAY' : selectedDate.toUpperCase()}</Text>
            <Text style={styles.greeting}>Hi, {username}! 👋</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowNotifications(true)}>
            <Feather name="bell" size={22} color="#1C1C1E" />
            {hasUnread && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#FF2D55" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* Elite Streak Banner Widget */}
            <View style={styles.streakCard}>
              <View style={styles.streakInfoRow}>
                <View style={styles.streakFlameWrap}>
                  <MaterialCommunityIcons name="fire" size={26} color="#FFF" />
                </View>
                <View style={styles.streakTitleWrap}>
                  <Text style={styles.streakCountText}>{streakCount} Day Streak!</Text>
                  <Text style={styles.streakDescText}>You are in the top 5% of active users today! 🔥</Text>
                </View>
              </View>
              
              {/* Daily Tracker Rings */}
              <View style={styles.weekCalendarRow}>
                {weekDays.map((day) => {
                  const isCompleted = completedDays.includes(day.name);
                  return (
                    <TouchableOpacity 
                      key={day.name} 
                      activeOpacity={0.8}
                      onPress={() => handleToggleDay(day.name)}
                      style={[
                        styles.calendarDayRing,
                        isCompleted && styles.calendarDayRingCompleted
                      ]}
                    >
                      <Text style={[
                        styles.calendarDayText,
                        isCompleted && styles.calendarDayTextCompleted
                      ]}>
                        {day.label}
                      </Text>
                      {isCompleted && (
                        <View style={styles.calendarDayFlameDot}>
                          <MaterialCommunityIcons name="fire" size={8} color="#FF9500" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Daily Calorie Target Card */}
            <View style={styles.calorieCard}>
              <View style={styles.calorieHeader}>
                <View>
                  <Text style={styles.cardSectionLabel}>CALORIES CONSUMED</Text>
                  <Text style={styles.calorieValue}>
                    {nutritionSummary.calories} <Text style={styles.calorieTarget}>/ 2,200 kcal</Text>
                  </Text>
                </View>
                <View style={styles.caloriePill}>
                  <Text style={styles.caloriePillText}>
                    {Math.max(0, 2200 - nutritionSummary.calories)} left
                  </Text>
                </View>
              </View>
              <View style={styles.calorieProgressBg}>
                <View 
                  style={[
                    styles.calorieProgressFill, 
                    { width: `${Math.min(100, (nutritionSummary.calories / 2200) * 100)}%` }
                  ]} 
                />
              </View>
            </View>

            {/* Macro Balance */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MACRO TRACKER</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
              {/* Protein Card */}
              <View style={[styles.macroCard, { borderLeftColor: '#FF2D55' }]}>
                <Text style={styles.macroTitle}>Protein</Text>
                <Text style={styles.macroValue}>
                  {nutritionSummary.protein}g <Text style={styles.macroTarget}>/ 140g</Text>
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(100, (nutritionSummary.protein / 140) * 100)}%`, backgroundColor: '#FF2D55' }]} />
                </View>
              </View>
              
              {/* Carbs Card */}
              <View style={[styles.macroCard, { borderLeftColor: '#10B981' }]}>
                <Text style={styles.macroTitle}>Carbs</Text>
                <Text style={styles.macroValue}>
                  {nutritionSummary.carbs}g <Text style={styles.macroTarget}>/ 200g</Text>
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(100, (nutritionSummary.carbs / 200) * 100)}%`, backgroundColor: '#10B981' }]} />
                </View>
              </View>

              {/* Fats Card */}
              <View style={[styles.macroCard, { borderLeftColor: '#F59E0B' }]}>
                <Text style={styles.macroTitle}>Fats</Text>
                <Text style={styles.macroValue}>
                  {nutritionSummary.fats}g <Text style={styles.macroTarget}>/ 65g</Text>
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(100, (nutritionSummary.fats / 65) * 100)}%`, backgroundColor: '#F59E0B' }]} />
                </View>
              </View>
            </ScrollView>

            {/* AI Insight */}
            {recommendation && (
              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <View style={styles.insightIconWrap}>
                    <Ionicons name="sparkles" size={16} color="#FFF" />
                  </View>
                  <Text style={styles.insightTitle}>COACH'S DAILY INSIGHT</Text>
                </View>
                <Text style={styles.insightText}>{recommendation.recovery_advice}</Text>
              </View>
            )}

            {/* Health Tracking Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>HEALTH METRICS</Text>
            </View>

            {/* Hydration Card */}
            <View style={styles.metricCard}>
              <View style={styles.metricRow}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#E3F2FD' }]}>
                  <MaterialCommunityIcons name="water" size={22} color="#2196F3" />
                </View>
                <View>
                  <Text style={styles.metricLabel}>Water Intake</Text>
                  <Text style={styles.metricValue}>{hydration} / 3000 ml</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.addBtn}
                onPress={async () => {
                  try {
                    await apiClient.post('/hydration/log', { amount_ml: 250, date: selectedDate });
                    setHydration(prev => prev + 250);
                  } catch(e) { console.error(e); }
                }}
              >
                <Feather name="plus" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Workouts Target Card */}
            <View style={styles.metricCard}>
              <View style={styles.metricRow}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#FCE4EC' }]}>
                  <MaterialCommunityIcons name="run" size={22} color="#FF2D55" />
                </View>
                <View>
                  <Text style={styles.metricLabel}>Daily Workouts</Text>
                  <Text style={styles.metricValue}>{dailyWorkouts.length} logged today</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.addBtn, { backgroundColor: '#1C1C1E' }]}
                onPress={() => navigation.navigate('Workouts')}
              >
                <Feather name="arrow-right" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Notifications PageSheet/Modal (Editorial Redesign) */}
      <Modal visible={showNotifications} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNotifications(false)}>
        <View style={styles.modalContainer}>
          {/* Minimalist Apple-like Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <View style={styles.modalActionsRow}>
              {hasUnread && (
                <TouchableOpacity onPress={markAllAsRead}>
                  <Text style={styles.headerActionLink}>Mark Read</Text>
                </TouchableOpacity>
              )}
              {notifications.length > 0 && (
                <>
                  {hasUnread && <View style={styles.actionSeparator} />}
                  <TouchableOpacity onPress={clearAllNotifications}>
                    <Text style={[styles.headerActionLink, { color: '#8E8E93' }]}>Clear All</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={() => setShowNotifications(false)} style={styles.closeHeaderBtn}>
                <Feather name="chevron-down" size={20} color="#1C1C1E" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Modal Body Scroll Container */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Tone Selector Settings (Premium Soft Translucent Pill Bar) */}
            <View style={styles.toneSelectorContainer}>
              <TouchableOpacity onPress={() => setCoachTone('Supportive')} style={[styles.toneBtn, coachTone === 'Supportive' && styles.toneBtnActive]}>
                <Text style={[styles.toneBtnText, coachTone === 'Supportive' && styles.toneBtnTextActive]}>Supportive</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCoachTone('Direct')} style={[styles.toneBtn, coachTone === 'Direct' && styles.toneBtnActive]}>
                <Text style={[styles.toneBtnText, coachTone === 'Direct' && styles.toneBtnTextActive]}>Direct</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCoachTone('Challenger')} style={[styles.toneBtn, coachTone === 'Challenger' && styles.toneBtnActive]}>
                <Text style={[styles.toneBtnText, coachTone === 'Challenger' && styles.toneBtnTextActive]}>Challenger 🔥</Text>
              </TouchableOpacity>
            </View>

            {/* Notification Stream */}
            {sortedNotifications.map((item) => {
              const content = getNotificationContent(item);
              return (
                <TouchableOpacity 
                  key={item.id} 
                  activeOpacity={0.9}
                  onPress={() => markAsRead(item.id)}
                  onLongPress={() => openContextMenu(item)}
                  delayLongPress={400}
                  style={[
                    styles.notificationCard, 
                    !item.isRead && styles.notificationCardUnread,
                    item.isPinned && styles.notificationCardPinned
                  ]}
                >
                  {/* Soft Circular Icon badge on left */}
                  <View style={[styles.notificationIconWrap, { backgroundColor: item.bgColor }]}>
                    {renderNotificationIcon(item)}
                  </View>

                  {/* Notification Content Block on right */}
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeaderRow}>
                      <View style={styles.categoryBadgeRow}>
                        {item.isPinned && <Feather name="pin" size={10} color="#FF9500" style={{ marginRight: 4 }} />}
                        {item.isMuted && <Feather name="bell-off" size={10} color="#8E8E93" style={{ marginRight: 4 }} />}
                        <Text style={[styles.notificationCategory, { color: item.color }]}>{item.category}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {!item.isRead && <View style={styles.unreadIndicatorDot} />}
                        <Text style={styles.notificationTime}>{item.time}</Text>
                      </View>
                    </View>
                    
                    <Text style={[styles.notificationTextTitle, !item.isRead && styles.notificationTextTitleUnread]}>
                      {content.title}
                    </Text>
                    <Text style={styles.notificationDesc}>{content.desc}</Text>

                    {/* Premium Translucent Quick Actions */}
                    {!item.isRead && item.id === 2 && (
                      <TouchableOpacity 
                        style={styles.quickActionBtn}
                        onPress={async () => {
                          try {
                            await apiClient.post('/hydration/log', { amount_ml: 250, date: selectedDate });
                            setHydration(prev => prev + 250);
                            markAsRead(item.id);
                          } catch(e) { console.error(e); }
                        }}
                      >
                        <MaterialCommunityIcons name="water-plus" size={14} color="#007AFF" style={{ marginRight: 4 }} />
                        <Text style={[styles.quickActionText, { color: '#007AFF' }]}>+ 250ml</Text>
                      </TouchableOpacity>
                    )}

                    {!item.isRead && item.id === 1 && (
                      <TouchableOpacity 
                        style={[styles.quickActionBtn, { backgroundColor: 'rgba(28, 28, 30, 0.06)' }]}
                        onPress={() => {
                          markAsRead(item.id);
                          setShowNotifications(false);
                          navigation.navigate('Workouts');
                        }}
                      >
                        <Feather name="play" size={12} color="#1C1C1E" style={{ marginRight: 4 }} />
                        <Text style={[styles.quickActionText, { color: '#1C1C1E' }]}>Start Workout</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Premium Empty State */}
            {notifications.length === 0 && (
              <View style={styles.emptyActivity}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="sparkles-outline" size={28} color="#FF2D55" />
                </View>
                <Text style={styles.emptyTitleText}>All Clean!</Text>
                <Text style={styles.emptyDescText}>Your custom coach feed is fully up to date.</Text>
              </View>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>

          {/* Elite Undo Floating Snackbar */}
          {showUndo && (
            <View style={styles.undoSnackbar}>
              <Text style={styles.undoText}>Cleared successfully</Text>
              <TouchableOpacity onPress={undoAction} style={styles.undoBtn}>
                <Text style={styles.undoBtnText}>UNDO</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Context Menu Bottom Action Sheet Modal */}
      <Modal visible={showContextMenu} transparent={true} animationType="fade" onRequestClose={() => setShowContextMenu(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowContextMenu(false)} style={styles.sheetOverlay}>
          <View style={styles.sheetContent}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />
            
            {selectedNotification && (
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetCategory, { color: selectedNotification.color }]}>{selectedNotification.category}</Text>
                <Text style={styles.sheetTitle} numberOfLines={1}>{selectedNotification.title}</Text>
              </View>
            )}

            {selectedNotification && (
              <View style={styles.sheetActionsList}>
                {/* Action 1: Toggle Read/Unread Status */}
                <TouchableOpacity style={styles.sheetActionRow} onPress={() => toggleReadStatus(selectedNotification.id)}>
                  <View style={styles.actionIconWrap}>
                    <Feather name={selectedNotification.isRead ? "mail" : "eye"} size={18} color="#1C1C1E" />
                  </View>
                  <Text style={styles.actionRowText}>
                    {selectedNotification.isRead ? 'Mark as Unread' : 'Mark as Read'}
                  </Text>
                </TouchableOpacity>

                {/* Action 2: Star & Pin to Top */}
                <TouchableOpacity style={styles.sheetActionRow} onPress={() => togglePinStatus(selectedNotification.id)}>
                  <View style={styles.actionIconWrap}>
                    <Feather name="pin" size={18} color={selectedNotification.isPinned ? '#FF2D55' : '#1C1C1E'} />
                  </View>
                  <Text style={styles.actionRowText}>
                    {selectedNotification.isPinned ? 'Unpin from Top' : 'Pin to Top'}
                  </Text>
                </TouchableOpacity>

                {/* Action 3: Mute Category Alerts */}
                <TouchableOpacity style={styles.sheetActionRow} onPress={() => toggleMuteStatus(selectedNotification.id)}>
                  <View style={styles.actionIconWrap}>
                    <Feather name={selectedNotification.isMuted ? "bell" : "bell-off"} size={18} color="#1C1C1E" />
                  </View>
                  <Text style={styles.actionRowText}>
                    {selectedNotification.isMuted ? 'Unmute Alerts' : 'Mute Category Alerts'}
                  </Text>
                </TouchableOpacity>

                {/* Action 4: Delete Notification */}
                <TouchableOpacity style={[styles.sheetActionRow, styles.deleteActionRow]} onPress={() => handleDeleteFromMenu(selectedNotification.id)}>
                  <View style={[styles.actionIconWrap, { backgroundColor: '#FFF0F3' }]}>
                    <Feather name="trash-2" size={18} color="#FF2D55" />
                  </View>
                  <Text style={[styles.actionRowText, { color: '#FF2D55', fontWeight: '700' }]}>
                    Delete Notification
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  dateLabel: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F3F5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF2D55',
    borderWidth: 1.5,
    borderColor: '#F2F3F5',
  },
  
  // Advanced Pinned Streak Widget styles
  streakCard: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#FF9500',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  streakInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakFlameWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF9500',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  streakTitleWrap: {
    marginLeft: 14,
    flex: 1,
  },
  streakCountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 2,
  },
  streakDescText: {
    fontSize: 11,
    color: '#AEAEB2',
    fontWeight: '500',
  },
  weekCalendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  calendarDayRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#3A3A3C',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  calendarDayRingCompleted: {
    borderColor: '#FF9500',
    backgroundColor: '#FF9500',
  },
  calendarDayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
  },
  calendarDayTextCompleted: {
    color: '#FFF',
  },
  calendarDayFlameDot: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#1C1C1E',
    borderRadius: 6,
    padding: 1,
  },

  calorieCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 28,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  calorieValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  calorieTarget: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  caloriePill: {
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  caloriePillText: {
    color: '#FF2D55',
    fontSize: 12,
    fontWeight: '700',
  },
  calorieProgressBg: {
    height: 8,
    backgroundColor: '#F2F3F5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  calorieProgressFill: {
    height: '100%',
    backgroundColor: '#FF2D55',
    borderRadius: 4,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 1.5,
  },
  horizontalScroll: {
    marginBottom: 28,
  },
  horizontalScrollContent: {
    paddingLeft: 24,
    paddingRight: 8,
  },
  macroCard: {
    width: 140,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  macroTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  macroTarget: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#F2F3F5',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  insightCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF2D55',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  insightTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF2D55',
    letterSpacing: 1.5,
  },
  insightText: {
    fontSize: 14,
    color: '#48484A',
    lineHeight: 22,
    fontWeight: '500',
  },
  metricCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 24,
    padding: 18,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 2,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  addBtn: {
    backgroundColor: '#FF2D55',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF2D55',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  
  // Refactored Apple-Style Notifications modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAFBFC', // Clean Apple Slate Light background
    position: 'relative',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#FAFBFC',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionLink: {
    fontSize: 14,
    color: '#FF2D55',
    fontWeight: '700',
  },
  actionSeparator: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 10,
  },
  closeHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  toneSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 20,
  },
  toneBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 11,
  },
  toneBtnActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  toneBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  toneBtnTextActive: {
    color: '#1C1C1E',
    fontWeight: '700',
  },

  // Apple & Instagram Clean Notification Card Refactor
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F2F3F5',
  },
  notificationCardUnread: {
    borderColor: 'rgba(0, 122, 255, 0.1)', // Very faint sapphire halo
  },
  notificationCardPinned: {
    borderColor: 'rgba(255, 149, 0, 0.2)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  notificationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    alignSelf: 'flex-start',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationCategory: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  unreadIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF', // High-end Sapphire Blue indicator
  },
  notificationTime: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '600',
  },
  notificationTextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 3,
  },
  notificationTextTitleUnread: {
    color: '#1C1C1E',
    fontWeight: '800',
  },
  notificationDesc: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 17,
    fontWeight: '500',
  },
  quickActionBtn: {
    backgroundColor: 'rgba(0, 122, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Premium Empty State Redesign
  emptyActivity: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 45, 85, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  emptyDescText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  
  // High-End Undo Floating Snackbar styles
  undoSnackbar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 2000,
  },
  undoText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  undoBtn: {
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  undoBtnText: {
    color: '#FF2D55',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Haptic Context Menu Bottom Sheet styles
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#E5E5EA',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F3F5',
  },
  sheetCategory: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  sheetActionsList: {
    gap: 8,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  deleteActionRow: {
    borderColor: '#FFE3E8',
    backgroundColor: '#FFF0F3',
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});
