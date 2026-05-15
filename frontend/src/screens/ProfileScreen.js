import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import apiClient, { setAuthToken } from '../api/client';

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
              <ActivityIndicator size="large" color="#E91E63" />
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
            <Feather name="edit-2" size={22} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Feather name="user" size={40} color="#FFF" />
            </View>
          </View>
          <Text style={styles.userName}>{profileData?.full_name || 'New User'}</Text>
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
            <Text style={styles.goalLabel}>Current Goal</Text>
            <Text style={styles.goalTitle}>{profileData?.fitness_goal || 'Set your goal'}</Text>
          </View>
          <View style={styles.goalIconWrap}>
            <FontAwesome5 name="dumbbell" size={20} color="#E91E63" />
          </View>
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: '#E3F2FD'}]}>
                <Feather name="user" size={18} color="#2196F3" />
              </View>
              <Text style={styles.menuItemText}>Gender: {profileData?.gender || 'Not specified'}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: '#E8F5E9'}]}>
                <Feather name="target" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuItemText}>Target Weight: {profileData?.target_weight || 0} kg</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: '#FFF3E0'}]}>
                <Feather name="activity" size={18} color="#FF9800" />
              </View>
              <Text style={styles.menuItemText}>Activity: {profileData?.activity_level || 'Not set'}</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, {marginTop: 20}]}>Preferences</Text>
          
          {userData?.role === 'admin' && (
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Admin')}>
                <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconWrap, {backgroundColor: '#E91E63'}]}>
                        <Feather name="shield" size={18} color="#FFF" />
                    </View>
                    <Text style={styles.menuItemText}>Admin Privileges</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, {backgroundColor: '#FFEBEE'}]}>
                <FontAwesome5 name="robot" size={16} color="#F44336" />
              </View>
              <Text style={styles.menuItemText}>Role: {userData?.role.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        
        <View style={{height: 40}} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsEditing(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Profile</Text>
                  <TouchableOpacity onPress={() => setIsEditing(false)}>
                      <Feather name="x" size={28} color="#1A1A1A" />
                  </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput style={styles.input} value={formData.full_name} onChangeText={t => setFormData({...formData, full_name: t})} placeholder="John Doe" />
                  
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <View style={{flex: 1, marginRight: 10}}>
                          <Text style={styles.inputLabel}>Age</Text>
                          <TextInput style={styles.input} value={formData.age} onChangeText={t => setFormData({...formData, age: t})} keyboardType="numeric" placeholder="25" />
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
                                  <Picker.Item label="Select" value="" color="#8E8E93" />
                                  <Picker.Item label="Male" value="Male" />
                                  <Picker.Item label="Female" value="Female" />
                                  <Picker.Item label="Other" value="Other" />
                              </Picker>
                          </View>
                      </View>
                  </View>

                  <Text style={styles.inputLabel}>Height (cm)</Text>
                  <TextInput style={styles.input} value={formData.height} onChangeText={t => setFormData({...formData, height: t})} keyboardType="numeric" placeholder="175" />

                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <View style={{flex: 1, marginRight: 10}}>
                          <Text style={styles.inputLabel}>Current Weight (kg)</Text>
                          <TextInput style={styles.input} value={formData.weight} onChangeText={t => setFormData({...formData, weight: t})} keyboardType="numeric" placeholder="70" />
                      </View>
                      <View style={{flex: 1}}>
                          <Text style={styles.inputLabel}>Target Weight (kg)</Text>
                          <TextInput style={styles.input} value={formData.target_weight} onChangeText={t => setFormData({...formData, target_weight: t})} keyboardType="numeric" placeholder="65" />
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
                          <Picker.Item label="Select Activity Level" value="" color="#8E8E93" />
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
                          <Picker.Item label="Select Fitness Goal" value="" color="#8E8E93" />
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
  container: { flex: 1, backgroundColor: '#F8FAFD' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 25,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },
  iconBtn: { padding: 5 },
  profileSection: { alignItems: 'center', marginBottom: 25 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  userName: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 25 },
  statCard: {
    backgroundColor: '#FFF', flex: 1, alignItems: 'center', paddingVertical: 15,
    borderRadius: 16, marginHorizontal: 5, borderWidth: 1, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  statUnit: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  statLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
  goalBanner: {
    backgroundColor: '#FFF', marginHorizontal: 20, padding: 20, borderRadius: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30,
    borderWidth: 1, borderColor: '#F0F0F0', borderLeftWidth: 4, borderLeftColor: '#E91E63',
  },
  goalInfo: { flex: 1 },
  goalLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '600', marginBottom: 4 },
  goalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  goalIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0F5', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { paddingHorizontal: 20, marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 15 },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0',
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuItemText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  logoutBtn: { marginHorizontal: 20, backgroundColor: '#FFF0F5', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FCE4EC' },
  logoutText: { color: '#E91E63', fontSize: 16, fontWeight: '700' },
  
  // Modal Edit Styles
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#8E8E93', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 15, fontSize: 16, color: '#1A1A1A' },
  pickerWrap: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, overflow: 'hidden' },
  picker: { height: Platform.OS === 'ios' ? 120 : 50, width: '100%', backgroundColor: 'transparent' },
  pickerItem: { fontSize: 15 },
  saveBtn: { backgroundColor: '#E91E63', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
