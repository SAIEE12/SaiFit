import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import apiClient, { setAuthToken } from '../api/client';
import { theme } from '../theme';

export default function ProfileScreen({ navigation, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
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
          Alert.alert("Success", "Profile updated successfully!");
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
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        
        <View style={{height: 60}} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsEditing(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Profile</Text>
                  <TouchableOpacity onPress={() => setIsEditing(false)}>
                      <Feather name="x" size={24} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput style={styles.input} value={formData.full_name} onChangeText={t => setFormData({...formData, full_name: t})} placeholder="John Doe" placeholderTextColor={theme.colors.textTertiary} />
                  
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <View style={{flex: 1, marginRight: 10}}>
                          <Text style={styles.inputLabel}>Age</Text>
                          <TextInput style={styles.input} value={formData.age} onChangeText={t => setFormData({...formData, age: t})} keyboardType="numeric" placeholder="25" placeholderTextColor={theme.colors.textTertiary} />
                      </View>
                      <View style={{flex: 1}}>
                          <Text style={styles.inputLabel}>Gender</Text>
                          <View style={styles.pickerWrap}>
                              <Picker
                                  selectedValue={formData.gender}
                                  onValueChange={(itemValue) => setFormData({...formData, gender: itemValue})}
                                  style={styles.picker}
                                  itemStyle={styles.pickerItem}
                              >
                                  <Picker.Item label="Select" value="" color={theme.colors.textSecondary} />
                                  <Picker.Item label="Male" value="Male" />
                                  <Picker.Item label="Female" value="Female" />
                                  <Picker.Item label="Other" value="Other" />
                              </Picker>
                          </View>
                      </View>
                  </View>

                  <Text style={styles.inputLabel}>Height (cm)</Text>
                  <TextInput style={styles.input} value={formData.height} onChangeText={t => setFormData({...formData, height: t})} keyboardType="numeric" placeholder="175" placeholderTextColor={theme.colors.textTertiary} />

                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <View style={{flex: 1, marginRight: 10}}>
                          <Text style={styles.inputLabel}>Current Weight (kg)</Text>
                          <TextInput style={styles.input} value={formData.weight} onChangeText={t => setFormData({...formData, weight: t})} keyboardType="numeric" placeholder="70" placeholderTextColor={theme.colors.textTertiary} />
                      </View>
                      <View style={{flex: 1}}>
                          <Text style={styles.inputLabel}>Target Weight (kg)</Text>
                          <TextInput style={styles.input} value={formData.target_weight} onChangeText={t => setFormData({...formData, target_weight: t})} keyboardType="numeric" placeholder="65" placeholderTextColor={theme.colors.textTertiary} />
                      </View>
                  </View>

                  <Text style={styles.inputLabel}>Activity Level</Text>
                  <View style={styles.pickerWrap}>
                      <Picker
                          selectedValue={formData.activity_level}
                          onValueChange={(itemValue) => setFormData({...formData, activity_level: itemValue})}
                          style={styles.picker}
                          itemStyle={styles.pickerItem}
                      >
                          <Picker.Item label="Select Activity Level" value="" color={theme.colors.textSecondary} />
                          <Picker.Item label="Beginner" value="Beginner" />
                          <Picker.Item label="Intermediate" value="Intermediate" />
                          <Picker.Item label="Advanced" value="Advanced" />
                      </Picker>
                  </View>

                  <Text style={styles.inputLabel}>Fitness Goal</Text>
                  <View style={styles.pickerWrap}>
                      <Picker
                          selectedValue={formData.fitness_goal}
                          onValueChange={(itemValue) => setFormData({...formData, fitness_goal: itemValue})}
                          style={styles.picker}
                          itemStyle={styles.pickerItem}
                      >
                          <Picker.Item label="Select Fitness Goal" value="" color={theme.colors.textSecondary} />
                          <Picker.Item label="Home Workout" value="Home Workout" />
                          <Picker.Item label="Gym Workout" value="Gym Workout" />
                          <Picker.Item label="Yoga" value="Yoga" />
                          <Picker.Item label="Dance" value="Dance" />
                          <Picker.Item label="Muscle Gain" value="Muscle Gain" />
                          <Picker.Item label="Fat Loss" value="Fat Loss" />
                      </Picker>
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
  logoutBtn: { 
    marginHorizontal: theme.spacing.xxl, 
    backgroundColor: theme.colors.accentPinkLight, 
    paddingVertical: 16, 
    borderRadius: theme.borderRadius.xxl, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 45, 85, 0.15)',
    ...theme.shadows.soft
  },
  logoutText: { color: theme.colors.primary, fontSize: 16, fontWeight: '800' },
  
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
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});
