import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import apiClient, { setAuthToken } from '../api/client';
import { theme } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ProfileScreen({ navigation, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // AI Progression Coach State
  const [profileCoach, setProfileCoach] = useState(null);
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [coachExpanded, setCoachExpanded] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
      full_name: '',
      age: '',
      gender: '',
      height: '',
      weight: '',
      target_weight: '',
      activity_level: '',
      fitness_goal: ''
  });

  useEffect(() => {
      fetchProfile();
      fetchProfileCoach();
  }, []);

  const fetchProfile = async () => {
      try {
          const res = await apiClient.get('/profile');
          setUserData(res.data.user);
          setProfileData(res.data.profile);
          setFormData({
              full_name: res.data.profile.full_name || '',
              age: res.data.profile.age?.toString() || '',
              gender: res.data.profile.gender || '',
              height: res.data.profile.height?.toString() || '',
              weight: res.data.profile.weight?.toString() || '',
              target_weight: res.data.profile.target_weight?.toString() || '',
              activity_level: res.data.profile.activity_level || '',
              fitness_goal: res.data.profile.fitness_goal || ''
          });
      } catch(e) {
          Alert.alert("Error", "Could not load profile details.");
      } finally {
          setLoading(false);
      }
  };

  const fetchProfileCoach = async () => {
      try {
          setLoadingCoach(true);
          const res = await apiClient.get('/recommendations/profile-coach');
          setProfileCoach(res.data);
      } catch (e) {
          console.error("Failed to load profile coach recommendations", e);
      } finally {
          setLoadingCoach(false);
      }
  };

  const toggleCoach = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCoachExpanded(!coachExpanded);
  };

  const handleSave = async () => {
      try {
          setLoading(true);
          const payload = {
              full_name: formData.full_name,
              age: parseInt(formData.age) || 0,
              gender: formData.gender,
              height: parseFloat(formData.height) || 0,
              weight: parseFloat(formData.weight) || 0,
              target_weight: parseFloat(formData.target_weight) || 0,
              activity_level: formData.activity_level,
              fitness_goal: formData.fitness_goal
          };
          const res = await apiClient.put('/profile', payload);
          setProfileData(res.data);
          setIsEditing(false);
          Alert.alert("Success", "Profile updated successfully!", [
              { text: "OK", onPress: () => fetchProfileCoach() }
          ]);
      } catch(e) {
          Alert.alert("Error", "Could not save profile.");
      } finally {
          setLoading(false);
      }
  };

  const handleLogout = async () => {
    await setAuthToken(null);
    if (onLogout) onLogout();
  };

  if (loading && !profileData) {
      return (
          <SafeAreaView style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setIsEditing(true)}>
            <Feather name="edit-2" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Feather name="user" size={36} color="#FFF" />
            </View>
          </View>
          <Text style={styles.userName}>{profileData?.full_name || 'Fitness Fan'}</Text>
          <Text style={styles.userEmail}>@{userData?.username}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profileData?.weight || 0} <Text style={styles.statUnit}>kg</Text></Text>
            <Text style={styles.statLabel}>Weight</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profileData?.height || 0} <Text style={styles.statUnit}>cm</Text></Text>
            <Text style={styles.statLabel}>Height</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profileData?.age || 0} <Text style={styles.statUnit}>yo</Text></Text>
            <Text style={styles.statLabel}>Age</Text>
          </View>
        </View>

        {/* AI Progression Intelligence */}
        {profileCoach && !profileCoach.disabled && (
            coachExpanded ? (
                <TouchableOpacity activeOpacity={0.9} style={styles.aiCoachCard} onPress={toggleCoach}>
                    <View style={styles.aiCoachHeader}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <View style={styles.sparkleBg}>
                                <Ionicons name="sparkles" size={14} color="#FFF" />
                            </View>
                            <Text style={styles.aiCoachTitle}>AI PROGRESSION INTELLIGENCE</Text>
                        </View>
                        <Feather name="chevron-up" size={18} color={theme.colors.textSecondary} />
                    </View>

                    {/* Dedicated Highlighted Score Bar */}
                    <View style={styles.scoreHighlightBar}>
                        <Text style={styles.scoreHighlightLabel}>FITNESS INDEX</Text>
                        <View style={styles.scoreHighlightBadge}>
                            <Text style={styles.scoreHighlightValue}>{profileCoach.fitness_score} / 100</Text>
                        </View>
                    </View>

                    <View style={styles.expandedAiContent}>
                        <View style={styles.progressRow}>
                            <View style={styles.progressStat}>
                                <Text style={styles.progressLabel}>STRENGTHS</Text>
                                <Text style={styles.progressText}>{profileCoach.strengths}</Text>
                            </View>
                            <View style={styles.progressStat}>
                                <Text style={styles.progressLabel}>AREAS TO IMPROVE</Text>
                                <Text style={styles.progressText}>{profileCoach.weaknesses}</Text>
                            </View>
                        </View>

                        <View style={styles.predictionBox}>
                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
                                <Feather name="calendar" size={14} color={theme.colors.primary} style={{marginRight: 6}} />
                                <Text style={styles.predictionLabel}>TARGET WEIGHT TIMELINE</Text>
                            </View>
                            <Text style={styles.predictionText}>{profileCoach.target_weight_timeline}</Text>
                        </View>

                        <View style={styles.predictionBox}>
                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
                                <Feather name="trending-up" size={14} color={theme.colors.green} style={{marginRight: 6}} />
                                <Text style={styles.predictionLabel}>ADAPTIVE GOAL SUGGESTIONS</Text>
                            </View>
                            <Text style={styles.predictionText}>{profileCoach.adaptive_goal_suggestions}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity activeOpacity={0.8} style={styles.minimalCoachTrigger} onPress={toggleCoach}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="sparkles" size={15} color={theme.colors.primary} style={{marginRight: 8}} />
                        <Text style={styles.minimalCoachTriggerText}>AI Progression Analyst</Text>
                    </View>
                    <Feather name="chevron-down" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
            )
        )}

        {/* Fitness Goal Banner */}
        <TouchableOpacity style={styles.goalBanner} onPress={() => setIsEditing(true)}>
          <View style={styles.goalInfo}>
            <Text style={styles.goalLabel}>CURRENT GOAL</Text>
            <Text style={styles.goalTitle}>{profileData?.fitness_goal || 'Set your fitness goal'}</Text>
          </View>
          <View style={styles.goalIconWrap}>
            <FontAwesome5 name="dumbbell" size={18} color={theme.colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: theme.colors.accentBlueLight}]}>
                <Feather name="user" size={16} color={theme.colors.secondary} />
              </View>
              <Text style={styles.menuItemText}>Gender: {profileData?.gender || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: theme.colors.accentGreenLight}]}>
                <Feather name="target" size={16} color={theme.colors.green} />
              </View>
              <Text style={styles.menuItemText}>Target Weight: {profileData?.target_weight || 0} kg</Text>
            </View>
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: theme.colors.accentYellowLight}]}>
                <Feather name="activity" size={16} color={theme.colors.orange} />
              </View>
              <Text style={styles.menuItemText}>Activity Level: {profileData?.activity_level || 'Not set'}</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, {marginTop: 20}]}>PREFERENCES & CONTROLS</Text>
          
          {userData?.role === 'admin' && (
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Admin')}>
                <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconWrap, {backgroundColor: theme.colors.accentPinkLight}]}>
                        <Feather name="shield" size={16} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.menuItemText}>Admin Privileges</Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: '#F4F5F7'}]}>
                <FontAwesome5 name="user-tag" size={14} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.menuItemText}>Role: {userData?.role.toUpperCase()}</Text>
            </View>
          </View>

          {/* Premium Integrated Logout Card */}
          <TouchableOpacity style={[styles.menuItem, styles.logoutCard]} onPress={handleLogout} activeOpacity={0.85}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: 'rgba(255, 59, 48, 0.08)'}]}>
                <Feather name="log-out" size={16} color="#FF3B30" />
              </View>
              <Text style={styles.logoutCardText}>Log Out</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
        
        <View style={{height: 60}} />
      </ScrollView>

      {/* Edit Profile Modal */}
      {/* Edit Profile Modal */}
      <Modal visible={isEditing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsEditing(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Profile</Text>
                  <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.closeModalBtn}>
                      <Feather name="x" size={20} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  
                  {/* Full Name input block */}
                  <View style={styles.premiumInputBlock}>
                    <View style={styles.inputIconContainer}>
                      <Feather name="user" size={16} color="#FF2D55" />
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.premiumInputLabel}>FULL NAME</Text>
                      <TextInput 
                        style={styles.premiumTextInput} 
                        value={formData.full_name} 
                        onChangeText={t => setFormData({...formData, full_name: t})} 
                        placeholder="John Doe" 
                        placeholderTextColor="#8E8E93" 
                      />
                    </View>
                  </View>

                  <View style={{flexDirection: 'row', gap: 12, marginTop: 12}}>
                    {/* Age Input */}
                    <View style={[styles.premiumInputBlock, {flex: 1}]}>
                      <View style={styles.inputIconContainer}>
                        <Feather name="hash" size={16} color="#FF2D55" />
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.premiumInputLabel}>AGE</Text>
                        <TextInput 
                          style={styles.premiumTextInput} 
                          value={formData.age} 
                          onChangeText={t => setFormData({...formData, age: t})} 
                          keyboardType="numeric" 
                          placeholder="25" 
                          placeholderTextColor="#8E8E93" 
                        />
                      </View>
                    </View>

                    {/* Height */}
                    <View style={[styles.premiumInputBlock, {flex: 1}]}>
                      <View style={styles.inputIconContainer}>
                        <Feather name="maximize-2" size={16} color="#FF2D55" />
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.premiumInputLabel}>HEIGHT (CM)</Text>
                        <TextInput 
                          style={styles.premiumTextInput} 
                          value={formData.height} 
                          onChangeText={t => setFormData({...formData, height: t})} 
                          keyboardType="numeric" 
                          placeholder="175" 
                          placeholderTextColor="#8E8E93" 
                        />
                      </View>
                    </View>
                  </View>

                  <View style={{flexDirection: 'row', gap: 12, marginTop: 12}}>
                    {/* Weight */}
                    <View style={[styles.premiumInputBlock, {flex: 1}]}>
                      <View style={styles.inputIconContainer}>
                        <MaterialCommunityIcons name="weight-kilogram" size={16} color="#FF2D55" />
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.premiumInputLabel}>WEIGHT (KG)</Text>
                        <TextInput 
                          style={styles.premiumTextInput} 
                          value={formData.weight} 
                          onChangeText={t => setFormData({...formData, weight: t})} 
                          keyboardType="numeric" 
                          placeholder="70" 
                          placeholderTextColor="#8E8E93" 
                        />
                      </View>
                    </View>

                    {/* Target Weight */}
                    <View style={[styles.premiumInputBlock, {flex: 1}]}>
                      <View style={styles.inputIconContainer}>
                        <Feather name="target" size={16} color="#FF2D55" />
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.premiumInputLabel}>TARGET (KG)</Text>
                        <TextInput 
                          style={styles.premiumTextInput} 
                          value={formData.target_weight} 
                          onChangeText={t => setFormData({...formData, target_weight: t})} 
                          keyboardType="numeric" 
                          placeholder="65" 
                          placeholderTextColor="#8E8E93" 
                        />
                      </View>
                    </View>
                  </View>

                  {/* Gender Selection */}
                  <View style={{marginTop: 16}}>
                    <Text style={styles.segmentedLabel}>GENDER</Text>
                    <View style={styles.genderPillsContainer}>
                      {['Male', 'Female', 'Other'].map(g => (
                        <TouchableOpacity 
                          key={g} 
                          style={[styles.genderPill, formData.gender === g && styles.genderPillActive]} 
                          onPress={() => setFormData({...formData, gender: g})}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.genderPillText, formData.gender === g && styles.genderPillTextActive]}>{g}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Activity Level */}
                  <View style={{marginTop: 16}}>
                    <Text style={styles.segmentedLabel}>ACTIVITY LEVEL</Text>
                    <View style={styles.activityPillsContainer}>
                      {['Beginner', 'Intermediate', 'Advanced'].map(act => (
                        <TouchableOpacity 
                          key={act} 
                          style={[styles.activityPill, formData.activity_level === act && styles.activityPillActive]} 
                          onPress={() => setFormData({...formData, activity_level: act})}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.activityPillText, formData.activity_level === act && styles.activityPillTextActive]}>{act}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Fitness Goal */}
                  <View style={{marginTop: 16}}>
                    <Text style={styles.segmentedLabel}>FITNESS GOAL</Text>
                    <View style={styles.goalPillsGrid}>
                      {['Home Workout', 'Gym Workout', 'Yoga', 'Muscle Gain', 'Fat Loss'].map(g => (
                        <TouchableOpacity 
                          key={g} 
                          style={[styles.goalPillItem, formData.fitness_goal === g && styles.goalPillActive]} 
                          onPress={() => setFormData({...formData, fitness_goal: g})}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.goalPillText, formData.fitness_goal === g && styles.goalPillTextActive]}>{g}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                      {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                  </TouchableOpacity>
                  <View style={{height: 50}} />
              </ScrollView>
          </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.5 },
  iconBtn: { 
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: { alignItems: 'center', marginBottom: 25 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: theme.colors.darkBase,
    justifyContent: 'center', alignItems: 'center',
    ...theme.shadows.soft,
  },
  userName: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 4, letterSpacing: -0.5 },
  userEmail: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: theme.spacing.xxl, marginBottom: 25 },
  statCard: {
    backgroundColor: theme.colors.card, 
    flex: 1, 
    alignItems: 'center', 
    paddingVertical: 16,
    borderRadius: theme.borderRadius.xxl, 
    marginHorizontal: 6, 
    borderWidth: 1, 
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 4 },
  statUnit: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
  statLabel: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },
  goalBanner: {
    backgroundColor: theme.colors.card, 
    marginHorizontal: theme.spacing.xxl, 
    padding: 20, 
    borderRadius: theme.borderRadius.xxl,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 28,
    borderWidth: 1, 
    borderColor: theme.colors.border, 
    borderLeftWidth: 4, 
    borderLeftColor: theme.colors.primary,
    ...theme.shadows.soft
  },
  goalInfo: { flex: 1 },
  goalLabel: { fontSize: 10, color: theme.colors.textSecondary, fontWeight: '800', marginBottom: 6, letterSpacing: 1.5 },
  goalTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary },
  goalIconWrap: { width: 40, height: 40, borderRadius: 14, backgroundColor: theme.colors.accentPinkLight, justifyContent: 'center', alignItems: 'center' },
  menuContainer: { paddingHorizontal: theme.spacing.xxl, marginBottom: 28 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 1.5, marginBottom: 14 },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.card, padding: 16, borderRadius: theme.borderRadius.xxl, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuItemText: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  logoutCard: {
    borderColor: 'rgba(255, 59, 48, 0.18)',
    shadowColor: '#FF3B30',
    shadowOpacity: 0.04,
  },
  logoutCardText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF3B30',
    letterSpacing: -0.2,
  },
  
  // Modal Edit Styles
  modalContainer: { flex: 1, backgroundColor: theme.colors.card },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderBottomColor: theme.colors.border, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary },
  modalBody: { padding: 24 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: theme.colors.textSecondary, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: theme.colors.border, borderRadius: theme.borderRadius.lg, padding: 16, fontSize: 16, color: theme.colors.textPrimary, fontWeight: '500' },
  pickerWrap: { backgroundColor: theme.colors.border, borderRadius: theme.borderRadius.lg, overflow: 'hidden' },
  picker: { height: Platform.OS === 'ios' ? 120 : 50, width: '100%', backgroundColor: 'transparent' },
  pickerItem: { fontSize: 15 },
  saveBtn: { 
    backgroundColor: theme.colors.primary, padding: 16, borderRadius: theme.borderRadius.lg, alignItems: 'center', marginTop: 30,
    shadowColor: theme.colors.primary, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  // Premium AI Progression Coach styling
  aiCoachCard: {
      backgroundColor: theme.colors.card,
      marginHorizontal: theme.spacing.xxl,
      padding: 20,
      borderRadius: theme.borderRadius.xxl,
      borderWidth: 1,
      borderColor: 'rgba(255, 45, 85, 0.15)',
      ...theme.shadows.premium,
      marginBottom: 28,
  },
  aiCoachHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  sparkleBg: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
  },
  aiCoachTitle: {
      fontSize: 10,
      fontWeight: '900',
      color: theme.colors.primary,
      letterSpacing: 1.5,
  },
  badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  scorePill: {
      backgroundColor: theme.colors.accentPinkLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      marginRight: 8,
  },
  scorePillText: {
      fontSize: 9,
      fontWeight: '900',
      color: theme.colors.primary,
  },
  aiCoachSummary: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      lineHeight: 22,
  },
  tapPrompt: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 10,
      alignItems: 'center',
  },
  tapPromptText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.colors.primary,
      letterSpacing: 0.5,
  },
  expandedAiContent: {
      marginTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 14,
      gap: 12,
  },
  progressRow: {
      flexDirection: 'row',
      gap: 12,
  },
  progressStat: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  progressLabel: {
      fontSize: 9,
      fontWeight: '900',
      color: theme.colors.textSecondary,
      letterSpacing: 1,
      marginBottom: 4,
  },
  progressText: {
      fontSize: 12,
      color: theme.colors.textPrimary,
      fontWeight: '700',
      lineHeight: 16,
  },
  predictionBox: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  predictionLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      letterSpacing: 1,
  },
  predictionText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 18,
      fontWeight: '600',
  },
  minimalCoachTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FFFFFF',
      borderRadius: theme.borderRadius.xxl,
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginHorizontal: theme.spacing.xxl,
      marginTop: 4,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 45, 85, 0.12)',
      shadowColor: '#FF2D55',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
  },
  minimalCoachTriggerText: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.primary,
      letterSpacing: 0.2,
  },
  scoreHighlightBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.accentPinkLight,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: theme.borderRadius.lg,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 45, 85, 0.08)',
  },
  scoreHighlightLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.colors.primary,
      letterSpacing: 1,
  },
  scoreHighlightBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
  },
  scoreHighlightValue: {
      fontSize: 11,
      fontWeight: '900',
      color: '#FFFFFF',
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumInputBlock: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 45, 85, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  premiumInputLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 1,
    marginBottom: 4,
  },
  premiumTextInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    padding: 0,
  },
  segmentedLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  genderPillsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  genderPill: {
    flex: 1,
    backgroundColor: '#FAFBFC',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    alignItems: 'center',
  },
  genderPillActive: {
    backgroundColor: 'rgba(255, 45, 85, 0.08)',
    borderColor: 'rgba(255, 45, 85, 0.3)',
  },
  genderPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  genderPillTextActive: {
    color: '#FF2D55',
    fontWeight: '800',
  },
  activityPillsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  activityPill: {
    flex: 1,
    backgroundColor: '#FAFBFC',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    alignItems: 'center',
  },
  activityPillActive: {
    backgroundColor: 'rgba(255, 45, 85, 0.08)',
    borderColor: 'rgba(255, 45, 85, 0.3)',
  },
  activityPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activityPillTextActive: {
    color: '#FF2D55',
    fontWeight: '800',
  },
  goalPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalPillItem: {
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  goalPillActive: {
    backgroundColor: 'rgba(255, 45, 85, 0.08)',
    borderColor: 'rgba(255, 45, 85, 0.3)',
  },
  goalPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  goalPillTextActive: {
    color: '#FF2D55',
    fontWeight: '800',
  },
});
