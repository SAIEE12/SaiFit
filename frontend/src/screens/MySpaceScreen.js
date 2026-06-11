import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Feather, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';
import { theme } from '../theme';
import ScreenContainer from '../components/ui/ScreenContainer';
import { Header, SectionHeader } from '../components/ui/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AICoachCard from '../components/ui/AICoachCard';
import Badge from '../components/ui/Badge';
import { LoadingState, EmptyState } from '../components/ui/StateViews';

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
  const [insightExpanded, setInsightExpanded] = useState(false);
  const [username, setUsername] = useState('Fitness Fan');
  const [showNotifications, setShowNotifications] = useState(false);

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
      color: theme.colors.primary,
      bgColor: theme.colors.primaryLight
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
      color: theme.colors.info,
      bgColor: theme.colors.infoLight
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
      color: theme.colors.success,
      bgColor: theme.colors.successLight
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
      color: theme.colors.warning,
      bgColor: theme.colors.warningLight
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
    <ScreenContainer scrollable keyboardAvoiding={false}>
      {/* Header */}
      <Header
        title={`Hi, ${username}! 👋`}
        subtitle={selectedDate === getLocalDateString() ? 'TODAY' : selectedDate.toUpperCase()}
        rightElement={
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowNotifications(true)}>
            <Feather name="bell" size={22} color={theme.colors.textPrimary} />
            {hasUnread && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        }
      />

      {loading ? (
        <LoadingState message="Loading daily targets..." />
      ) : (
        <>
          {/* Daily Calorie Target Card */}
          <Card variant="elevated" style={styles.calorieCard}>
            <View style={styles.calorieHeader}>
              <View>
                <Text style={styles.cardSectionLabel}>CALORIES CONSUMED</Text>
                <Text style={styles.calorieValue}>
                  {nutritionSummary.calories} <Text style={styles.calorieTarget}>/ 2,200 kcal</Text>
                </Text>
              </View>
              <Badge
                variant="primary"
                label={`${Math.max(0, 2200 - nutritionSummary.calories)} left`}
                style={styles.caloriePill}
              />
            </View>
            <View style={styles.calorieProgressBg}>
              <View 
                style={[
                  styles.calorieProgressFill, 
                  { width: `${Math.min(100, (nutritionSummary.calories / 2200) * 100)}%` }
                ]} 
              />
            </View>
          </Card>

          {/* Macro Balance */}
          <SectionHeader title="MACRO TRACKER" />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
            {/* Protein Card */}
            <Card style={[styles.macroCard, { borderLeftColor: theme.colors.primary, borderLeftWidth: 4 }]}>
              <Text style={styles.macroTitle}>Protein</Text>
              <Text style={styles.macroValue}>
                {nutritionSummary.protein}g <Text style={styles.macroTarget}>/ 140g</Text>
              </Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, (nutritionSummary.protein / 140) * 100)}%`, backgroundColor: theme.colors.primary }]} />
              </View>
            </Card>
            
            {/* Carbs Card */}
            <Card style={[styles.macroCard, { borderLeftColor: theme.colors.success, borderLeftWidth: 4 }]}>
              <Text style={styles.macroTitle}>Carbs</Text>
              <Text style={styles.macroValue}>
                {nutritionSummary.carbs}g <Text style={styles.macroTarget}>/ 200g</Text>
              </Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, (nutritionSummary.carbs / 200) * 100)}%`, backgroundColor: theme.colors.success }]} />
              </View>
            </Card>

            {/* Fats Card */}
            <Card style={[styles.macroCard, { borderLeftColor: theme.colors.warning, borderLeftWidth: 4 }]}>
              <Text style={styles.macroTitle}>Fats</Text>
              <Text style={styles.macroValue}>
                {nutritionSummary.fats}g <Text style={styles.macroTarget}>/ 65g</Text>
              </Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, (nutritionSummary.fats / 65) * 100)}%`, backgroundColor: theme.colors.warning }]} />
              </View>
            </Card>
          </ScrollView>

          {/* AI Insight */}
          {recommendation && !recommendation.disabled && (
            <AICoachCard
              title="COACH'S DAILY INSIGHT"
              scoreLabel="RECOVERY STATUS"
              scoreValue="Optimal Recovery"
              narrative={recommendation.recovery_advice}
              expanded={insightExpanded}
              onToggle={() => setInsightExpanded(!insightExpanded)}
              segments={
                insightExpanded && recommendation.workout_plan
                  ? [
                      {
                        icon: 'trending-up',
                        title: 'Workout Focus',
                        text: recommendation.workout_plan,
                        color: theme.colors.primary,
                      },
                    ]
                  : []
              }
              milestones={
                insightExpanded && recommendation.exercises && recommendation.exercises.length > 0
                  ? recommendation.exercises
                  : []
              }
            />
          )}

          {/* Health Tracking Section */}
          <SectionHeader title="HEALTH METRICS" />

          {/* Hydration Card */}
          <Card style={styles.metricCard}>
            <View style={styles.metricRow}>
              <View style={[styles.metricIconWrap, { backgroundColor: theme.colors.infoLight }]}>
                <MaterialCommunityIcons name="water" size={22} color={theme.colors.info} />
              </View>
              <View>
                <Text style={styles.metricLabel}>Water Intake</Text>
                <Text style={styles.metricValue}>{hydration} / 3000 ml</Text>
              </View>
            </View>
            <View style={styles.hydrationActionRow}>
              {/* Decrement (-) Button */}
              <TouchableOpacity 
                style={[styles.actionButton, styles.minusBtn]}
                onPress={async () => {
                  const dec = Math.min(250, hydration);
                  if (dec <= 0) return;
                  try {
                    await apiClient.post('/hydration/log', { amount_ml: -dec, date: selectedDate });
                    setHydration(prev => Math.max(0, prev - dec));
                  } catch(e) { console.error(e); }
                }}
                activeOpacity={0.8}
              >
                <Feather name="minus" size={16} color={theme.colors.info} />
              </TouchableOpacity>

              {/* Increment (+) Button */}
              <TouchableOpacity 
                style={[styles.actionButton, styles.plusBtn]}
                onPress={async () => {
                  try {
                    await apiClient.post('/hydration/log', { amount_ml: 250, date: selectedDate });
                    setHydration(prev => prev + 250);
                  } catch(e) { console.error(e); }
                }}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </Card>

          {/* Workouts Target Card */}
          <Card style={styles.metricCard}>
            <View style={styles.metricRow}>
              <View style={[styles.metricIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
                <MaterialCommunityIcons name="run" size={22} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.metricLabel}>Daily Workouts</Text>
                <Text style={styles.metricValue}>{dailyWorkouts.length} logged today</Text>
              </View>
            </View>
            <Button
              variant="secondary"
              size="sm"
              style={{ width: 36, height: 36, paddingHorizontal: 0, borderRadius: 18 }}
              onPress={() => navigation.navigate('Workouts')}
            >
              <Feather name="arrow-right" size={18} color="#FFF" />
            </Button>
          </Card>
        </>
      )}

      {/* Notifications PageSheet/Modal */}
      <Modal visible={showNotifications} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNotifications(false)}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setShowNotifications(false)} style={styles.closeHeaderBtn}>
              <Feather name="chevron-down" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Modal Body Scroll Container */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Notification Tools Bar */}
            <View style={styles.notificationToolsBar}>
              <Text style={styles.notificationCountText}>
                {notifications.filter(n => !n.isRead).length} unread
              </Text>
              <View style={styles.toolsActions}>
                {hasUnread && (
                  <TouchableOpacity onPress={markAllAsRead} style={styles.toolActionBtn}>
                    <Feather name="check-square" size={13} color={theme.colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.toolActionText}>Mark Read</Text>
                  </TouchableOpacity>
                )}
                {notifications.length > 0 && (
                  <>
                    {hasUnread && <View style={styles.toolSeparator} />}
                    <TouchableOpacity onPress={clearAllNotifications} style={styles.toolActionBtn}>
                      <Feather name="trash-2" size={13} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.toolActionText, { color: theme.colors.textSecondary }]}>Clear All</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Tone Selector Settings */}
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
                  <View style={[styles.notificationIconWrap, { backgroundColor: item.bgColor }]}>
                    {renderNotificationIcon(item)}
                  </View>

                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeaderRow}>
                      <View style={styles.categoryBadgeRow}>
                        {item.isPinned && <MaterialCommunityIcons name="pin" size={10} color={theme.colors.warning} style={{ marginRight: 4 }} />}
                        {item.isMuted && <Feather name="bell-off" size={10} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />}
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

                    {/* Quick Actions */}
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
                        <MaterialCommunityIcons name="water-plus" size={14} color={theme.colors.info} style={{ marginRight: 4 }} />
                        <Text style={[styles.quickActionText, { color: theme.colors.info }]}>+ 250ml</Text>
                      </TouchableOpacity>
                    )}

                    {!item.isRead && item.id === 1 && (
                      <TouchableOpacity 
                        style={[styles.quickActionBtn, { backgroundColor: theme.colors.border }]}
                        onPress={() => {
                          markAsRead(item.id);
                          setShowNotifications(false);
                          navigation.navigate('Workouts');
                        }}
                      >
                        <Feather name="play" size={12} color={theme.colors.textPrimary} style={{ marginRight: 4 }} />
                        <Text style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>Start Workout</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Empty State notifications */}
            {notifications.length === 0 && (
              <EmptyState
                icon="bell"
                title="All Clean!"
                description="Your custom coach feed is fully up to date."
              />
            )}

            <View style={{ height: 60 }} />
          </ScrollView>

          {/* Undo Floating Snackbar */}
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
            <View style={styles.sheetHandle} />
            
            {selectedNotification && (
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetCategory, { color: selectedNotification.color }]}>{selectedNotification.category}</Text>
                <Text style={styles.sheetTitle} numberOfLines={1}>{selectedNotification.title}</Text>
              </View>
            )}

            {selectedNotification && (
              <View style={styles.sheetActionsList}>
                <TouchableOpacity style={styles.sheetActionRow} onPress={() => toggleReadStatus(selectedNotification.id)}>
                  <View style={styles.actionIconWrap}>
                    <Feather name={selectedNotification.isRead ? "mail" : "eye"} size={18} color={theme.colors.textPrimary} />
                  </View>
                  <Text style={styles.actionRowText}>
                    {selectedNotification.isRead ? 'Mark as Unread' : 'Mark as Read'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sheetActionRow} onPress={() => togglePinStatus(selectedNotification.id)}>
                  <View style={styles.actionIconWrap}>
                    <MaterialCommunityIcons name="pin" size={18} color={selectedNotification.isPinned ? theme.colors.primary : theme.colors.textPrimary} />
                  </View>
                  <Text style={styles.actionRowText}>
                    {selectedNotification.isPinned ? 'Unpin from Top' : 'Pin to Top'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sheetActionRow} onPress={() => toggleMuteStatus(selectedNotification.id)}>
                  <View style={styles.actionIconWrap}>
                    <Feather name={selectedNotification.isMuted ? "bell" : "bell-off"} size={18} color={theme.colors.textPrimary} />
                  </View>
                  <Text style={styles.actionRowText}>
                    {selectedNotification.isMuted ? 'Unmute Alerts' : 'Mute Category Alerts'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.sheetActionRow, styles.deleteActionRow]} onPress={() => handleDeleteFromMenu(selectedNotification.id)}>
                  <View style={[styles.actionIconWrap, { backgroundColor: theme.colors.dangerLight }]}>
                    <Feather name="trash-2" size={18} color={theme.colors.danger} />
                  </View>
                  <Text style={[styles.actionRowText, { color: theme.colors.danger, fontWeight: '700' }]}>
                    Delete Notification
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.border,
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
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  calorieCard: {
    marginHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardSectionLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  calorieValue: {
    ...theme.typography.metricSmall,
    color: theme.colors.textPrimary,
  },
  calorieTarget: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  caloriePill: {
    alignSelf: 'center',
  },
  calorieProgressBg: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  calorieProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  horizontalScroll: {
    marginBottom: theme.spacing.xl,
  },
  horizontalScrollContent: {
    paddingLeft: theme.spacing.xxl,
    paddingRight: theme.spacing.sm,
  },
  macroCard: {
    width: 140,
    marginRight: theme.spacing.lg,
  },
  macroTitle: {
    ...theme.typography.h5,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  macroValue: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  macroTarget: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: theme.colors.border,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  metricCard: {
    marginHorizontal: theme.spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  metricLabel: {
    ...theme.typography.h5,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  metricValue: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  
  // Refactored Notifications modal
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    position: 'relative',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  closeHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  modalBody: {
    paddingHorizontal: theme.spacing.xl,
  },
  toneSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: 3,
    marginBottom: 20,
  },
  toneBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radii.md,
  },
  toneBtnActive: {
    backgroundColor: '#FFF',
    ...theme.shadows.soft,
  },
  toneBtnText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
  },
  toneBtnTextActive: {
    color: theme.colors.textPrimary,
  },

  notificationCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.soft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  notificationCardUnread: {
    borderColor: theme.colors.infoLight,
  },
  notificationCardPinned: {
    borderColor: theme.colors.warningLight,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  notificationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
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
    ...theme.typography.labelSmall,
  },
  unreadIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.info,
  },
  notificationTime: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    letterSpacing: 0,
  },
  notificationTextTitle: {
    ...theme.typography.h5,
    color: theme.colors.textSecondary,
    marginBottom: 3,
  },
  notificationTextTitleUnread: {
    color: theme.colors.textPrimary,
  },
  notificationDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
  quickActionBtn: {
    backgroundColor: theme.colors.infoLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  quickActionText: {
    ...theme.typography.captionStrong,
  },
  
  // High-End Undo Floating Snackbar styles
  undoSnackbar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.premium,
    zIndex: 2000,
  },
  undoText: {
    color: '#FFF',
    ...theme.typography.bodySmall,
    fontWeight: '600',
  },
  undoBtn: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radii.md,
  },
  undoBtnText: {
    color: theme.colors.primary,
    ...theme.typography.captionStrong,
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
    borderTopLeftRadius: theme.radii.huge,
    borderTopRightRadius: theme.radii.huge,
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: 40,
    paddingTop: 12,
    ...theme.shadows.premium,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    backgroundColor: theme.colors.border,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sheetCategory: {
    ...theme.typography.labelSmall,
    marginBottom: 4,
  },
  sheetTitle: {
    ...theme.typography.h5,
    color: theme.colors.textPrimary,
  },
  sheetActionsList: {
    gap: 8,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deleteActionRow: {
    borderColor: theme.colors.dangerLight,
    backgroundColor: theme.colors.dangerLight,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionRowText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
  },
  hydrationActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  minusBtn: {
    backgroundColor: theme.colors.infoLight,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.15)',
  },
  plusBtn: {
    backgroundColor: theme.colors.info,
  },
  notificationToolsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  notificationCountText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
  },
  toolsActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  toolActionText: {
    ...theme.typography.captionStrong,
    color: theme.colors.primary,
  },
  toolSeparator: {
    width: 1,
    height: 10,
    backgroundColor: theme.colors.border,
    marginHorizontal: 8,
  },
});
