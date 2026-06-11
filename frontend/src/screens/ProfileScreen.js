import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import apiClient, { setAuthToken } from '../api/client';
import { theme } from '../theme';
import ScreenContainer from '../components/ui/ScreenContainer';
import { Header, SectionHeader } from '../components/ui/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AICoachCard from '../components/ui/AICoachCard';
import Badge from '../components/ui/Badge';
import { LoadingState } from '../components/ui/StateViews';
import ModalView from '../components/ui/ModalView';

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
          <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Profile"
        rightElement={
          <TouchableOpacity style={styles.iconBtn} onPress={() => setIsEditing(true)}>
            <Feather name="edit-2" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScreenContainer scrollable keyboardAvoiding={false} edges={['bottom']}>
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
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{profileData?.weight || 0} <Text style={styles.statUnit}>kg</Text></Text>
            <Text style={styles.statLabel}>Weight</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{profileData?.height || 0} <Text style={styles.statUnit}>cm</Text></Text>
            <Text style={styles.statLabel}>Height</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{profileData?.age || 0} <Text style={styles.statUnit}>yo</Text></Text>
            <Text style={styles.statLabel}>Age</Text>
          </Card>
        </View>

        {/* AI Progression Intelligence */}
        {profileCoach && !profileCoach.disabled && (
            <AICoachCard
                title="AI PROGRESSION INTELLIGENCE"
                scoreLabel="FITNESS INDEX"
                scoreValue={`${profileCoach.fitness_score} / 100`}
                narrative={profileCoach.adaptive_goal_suggestions}
                expanded={coachExpanded}
                onToggle={toggleCoach}
                segments={
                    coachExpanded
                        ? [
                            {
                                icon: 'award',
                                title: 'Strengths',
                                text: profileCoach.strengths,
                                color: theme.colors.success,
                            },
                            {
                                icon: 'alert-circle',
                                title: 'Areas to Improve',
                                text: profileCoach.weaknesses,
                                color: theme.colors.warning,
                            },
                            {
                                icon: 'calendar',
                                title: 'Target Weight Timeline',
                                text: profileCoach.target_weight_timeline,
                                color: theme.colors.primary,
                            },
                        ]
                        : []
                }
            />
        )}

        {/* Fitness Goal Banner */}
        <Card style={styles.goalBanner} onPress={() => setIsEditing(true)}>
          <View style={styles.goalInfo}>
            <Text style={styles.goalLabel}>CURRENT GOAL</Text>
            <Text style={styles.goalTitle}>{profileData?.fitness_goal || 'Set your fitness goal'}</Text>
          </View>
          <View style={styles.goalIconWrap}>
            <FontAwesome5 name="dumbbell" size={18} color={theme.colors.primary} />
          </View>
        </Card>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <SectionHeader title="ACCOUNT DETAILS" />
          
          <Card style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: theme.colors.secondaryLight}]}>
                <Feather name="user" size={16} color={theme.colors.secondary} />
              </View>
              <Text style={styles.menuItemText}>Gender: {profileData?.gender || 'Not specified'}</Text>
            </View>
          </Card>

          <Card style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: theme.colors.successLight}]}>
                <Feather name="target" size={16} color={theme.colors.success} />
              </View>
              <Text style={styles.menuItemText}>Target Weight: {profileData?.target_weight || 0} kg</Text>
            </View>
          </Card>

          <Card style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: theme.colors.warningLight}]}>
                <Feather name="activity" size={16} color={theme.colors.warning} />
              </View>
              <Text style={styles.menuItemText}>Activity Level: {profileData?.activity_level || 'Not set'}</Text>
            </View>
          </Card>

          <SectionHeader title="PREFERENCES & CONTROLS" style={{marginTop: 20}} />
          
          {userData?.role === 'admin' && (
            <Card style={styles.menuItem} onPress={() => navigation.navigate('Admin')}>
                <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconWrap, {backgroundColor: theme.colors.primaryLight}]}>
                        <Feather name="shield" size={16} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.menuItemText}>Admin Privileges</Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
            </Card>
          )}

          <Card style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: theme.colors.border}]}>
                <FontAwesome5 name="user-tag" size={14} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.menuItemText}>Role: {userData?.role.toUpperCase()}</Text>
            </View>
          </Card>

          {/* Premium Integrated Logout Card */}
          <Card style={[styles.menuItem, styles.logoutCard]} onPress={handleLogout}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: theme.colors.dangerLight}]}>
                <Feather name="log-out" size={16} color={theme.colors.danger} />
              </View>
              <Text style={styles.logoutCardText}>Log Out</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.colors.danger} />
          </Card>
        </View>
        
        <View style={{height: 60}} />
      </ScreenContainer>

      {/* Edit Profile Modal */}
      <ModalView visible={isEditing} title="Edit Profile" onClose={() => setIsEditing(false)}>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              
              {/* Full Name input block */}
              <View style={styles.premiumInputBlock}>
                <View style={styles.inputIconContainer}>
                  <Feather name="user" size={16} color={theme.colors.primary} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.premiumInputLabel}>FULL NAME</Text>
                  <TextInput 
                    style={styles.premiumTextInput} 
                    value={formData.full_name} 
                    onChangeText={t => setFormData({...formData, full_name: t})} 
                    placeholder="John Doe" 
                    placeholderTextColor={theme.colors.textTertiary} 
                  />
                </View>
              </View>

              <View style={{flexDirection: 'row', gap: 12, marginTop: 12}}>
                {/* Age Input */}
                <View style={[styles.premiumInputBlock, {flex: 1}]}>
                  <View style={styles.inputIconContainer}>
                    <Feather name="hash" size={16} color={theme.colors.primary} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.premiumInputLabel}>AGE</Text>
                    <TextInput 
                      style={styles.premiumTextInput} 
                      value={formData.age} 
                      onChangeText={t => setFormData({...formData, age: t})} 
                      keyboardType="numeric" 
                      placeholder="25" 
                      placeholderTextColor={theme.colors.textTertiary} 
                    />
                  </View>
                </View>

                {/* Height */}
                <View style={[styles.premiumInputBlock, {flex: 1}]}>
                  <View style={styles.inputIconContainer}>
                    <Feather name="maximize-2" size={16} color={theme.colors.primary} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.premiumInputLabel}>HEIGHT (CM)</Text>
                    <TextInput 
                      style={styles.premiumTextInput} 
                      value={formData.height} 
                      onChangeText={t => setFormData({...formData, height: t})} 
                      keyboardType="numeric" 
                      placeholder="175" 
                      placeholderTextColor={theme.colors.textTertiary} 
                    />
                  </View>
                </View>
              </View>

              <View style={{flexDirection: 'row', gap: 12, marginTop: 12}}>
                {/* Weight */}
                <View style={[styles.premiumInputBlock, {flex: 1}]}>
                  <View style={styles.inputIconContainer}>
                    <MaterialCommunityIcons name="weight-kilogram" size={16} color={theme.colors.primary} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.premiumInputLabel}>WEIGHT (KG)</Text>
                    <TextInput 
                      style={styles.premiumTextInput} 
                      value={formData.weight} 
                      onChangeText={t => setFormData({...formData, weight: t})} 
                      keyboardType="numeric" 
                      placeholder="70" 
                      placeholderTextColor={theme.colors.textTertiary} 
                    />
                  </View>
                </View>

                {/* Target Weight */}
                <View style={[styles.premiumInputBlock, {flex: 1}]}>
                  <View style={styles.inputIconContainer}>
                    <Feather name="target" size={16} color={theme.colors.primary} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.premiumInputLabel}>TARGET (KG)</Text>
                    <TextInput 
                      style={styles.premiumTextInput} 
                      value={formData.target_weight} 
                      onChangeText={t => setFormData({...formData, target_weight: t})} 
                      keyboardType="numeric" 
                      placeholder="65" 
                      placeholderTextColor={theme.colors.textTertiary} 
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

              <Button variant="primary" size="lg" onPress={handleSave} loading={loading} style={{ marginTop: 30 }}>
                Save Changes
              </Button>
              <View style={{height: 50}} />
          </ScrollView>
      </ModalView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
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
  userName: { ...theme.typography.h3, color: theme.colors.textPrimary, marginBottom: 4 },
  userEmail: { ...theme.typography.captionStrong, color: theme.colors.textSecondary },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: theme.spacing.xxl, marginBottom: 25 },
  statCard: {
    flex: 1, 
    alignItems: 'center', 
    paddingVertical: 16,
    marginHorizontal: 6, 
    paddingHorizontal: 0,
  },
  statValue: { ...theme.typography.h4, color: theme.colors.textPrimary, marginBottom: 4 },
  statUnit: { ...theme.typography.caption, color: theme.colors.textSecondary },
  statLabel: { ...theme.typography.captionStrong, color: theme.colors.textSecondary },
  goalBanner: {
    marginHorizontal: theme.spacing.xxl, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 28,
    borderLeftWidth: 4, 
    borderLeftColor: theme.colors.primary,
  },
  goalInfo: { flex: 1 },
  goalLabel: { ...theme.typography.labelSmall, color: theme.colors.textSecondary, marginBottom: 6 },
  goalTitle: { ...theme.typography.h4, color: theme.colors.textPrimary },
  goalIconWrap: { width: 40, height: 40, borderRadius: 14, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  menuContainer: { paddingHorizontal: theme.spacing.xxl, marginBottom: 28 },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
    padding: 16,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuItemText: { ...theme.typography.bodySmall, color: theme.colors.textPrimary, fontWeight: '600' },
  logoutCard: {
    borderColor: 'rgba(255, 59, 48, 0.18)',
  },
  logoutCardText: {
    ...theme.typography.bodySmall,
    fontWeight: '800',
    color: '#FF3B30',
  },
  modalBody: { padding: 24 },
  premiumInputBlock: {
    backgroundColor: '#FAFBFC',
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  premiumInputLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  premiumTextInput: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    padding: 0,
  },
  segmentedLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
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
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  genderPillActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryBorder,
  },
  genderPillText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
  },
  genderPillTextActive: {
    color: theme.colors.primary,
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
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  activityPillActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryBorder,
  },
  activityPillText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
  },
  activityPillTextActive: {
    color: theme.colors.primary,
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
    borderColor: theme.colors.border,
  },
  goalPillActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryBorder,
  },
  goalPillText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
  },
  goalPillTextActive: {
    color: theme.colors.primary,
  },
});
