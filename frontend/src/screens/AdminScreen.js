import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Clipboard, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import apiClient from '../api/client';

export default function AdminScreen() {
    const [users, setUsers] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newCodeLimit, setNewCodeLimit] = useState('10');
    
    // Modal state
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, invitesRes] = await Promise.all([
                apiClient.get('/admin/users'),
                apiClient.get('/admin/invites')
            ]);
            setUsers(usersRes.data);
            setInvites(invitesRes.data);
        } catch(e) {
            Alert.alert("Error", "Could not load admin data");
        } finally {
            setLoading(false);
        }
    };

    const generateInvite = async () => {
        try {
            const limit = parseInt(newCodeLimit) || 10;
            const res = await apiClient.post('/admin/invite', { max_daily_requests: limit });
            Alert.alert("Invite Created! 🎉", `Share this code:\n\n${res.data.code}\n\nMax Daily limit: ${limit}`);
            fetchData();
        } catch(e) {
            Alert.alert("Error", "Could not create invite");
        }
    };

    const copyToClipboard = (code) => {
        Clipboard.setString(code);
        Alert.alert("Copied", `${code} copied to clipboard`);
    };

    const deleteInvite = (inviteId) => {
        Alert.alert(
            "Delete Invite Code",
            "Are you sure you want to delete this unused invite code?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await apiClient.delete(`/admin/invites/${inviteId}`);
                            fetchData();
                            Alert.alert("Success", "Invite code deleted successfully");
                        } catch(e) {
                            Alert.alert("Error", e.response?.data?.error || "Could not delete invite code");
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const deleteUser = (userId) => {
        Alert.alert(
            "Delete User",
            "Are you sure you want to completely delete this user? All of their tracked data, food logs, and workouts will be permanently lost.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await apiClient.delete(`/admin/users/${userId}`);
                            setSelectedUser(null);
                            fetchData();
                            Alert.alert("Success", "User deleted successfully");
                        } catch(e) {
                            Alert.alert("Error", e.response?.data?.error || "Could not delete user");
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Admin Control</Text>
                </View>

                {/* Generate Invite Code */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Generate Invite Code</Text>
                    <Text style={styles.label}>Max Daily AI Requests</Text>
                    <TextInput 
                        style={styles.input}
                        value={newCodeLimit}
                        onChangeText={setNewCodeLimit}
                        keyboardType="numeric"
                    />
                    <TouchableOpacity style={styles.btn} onPress={generateInvite}>
                        <Feather name="plus" size={18} color="#FFF" style={{marginRight: 6}}/>
                        <Text style={styles.btnText}>Create Invite Code</Text>
                    </TouchableOpacity>
                </View>

                {loading ? <ActivityIndicator color="#E91E63" style={{marginTop:40}}/> : (
                    <>
                        {/* Invite Codes List */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Generated Invites</Text>
                            <TouchableOpacity onPress={fetchData}>
                                <Feather name="refresh-cw" size={18} color="#1A1A1A"/>
                            </TouchableOpacity>
                        </View>
                        {invites.length === 0 && <Text style={styles.emptyText}>No invite codes generated yet.</Text>}
                        {invites.map(inv => (
                            <View key={inv.id} style={styles.inviteRow}>
                                <View style={styles.inviteInfo}>
                                    <Text style={styles.inviteCode}>{inv.code}</Text>
                                    <Text style={styles.inviteLimit}>Limit: {inv.max_daily_requests} requests/day</Text>
                                    {inv.is_used ? (
                                        <Text style={styles.usedTag}>✅ Claimed by: {inv.assigned_username}</Text>
                                    ) : (
                                        <Text style={styles.unusedTag}>⏳ Unused</Text>
                                    )}
                                </View>
                                {!inv.is_used && (
                                    <View style={{flexDirection: 'row'}}>
                                        <TouchableOpacity style={[styles.actionBtn, {marginRight: 8}]} onPress={() => copyToClipboard(inv.code)}>
                                            <Feather name="copy" size={20} color="#1A1A1A" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionBtn} onPress={() => deleteInvite(inv.id)}>
                                            <Feather name="trash-2" size={20} color="#FF5252" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}

                        <View style={{height: 10}} />

                        {/* Users List */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Registered Users</Text>
                        </View>
                        {users.length === 0 && <Text style={styles.emptyText}>No users found.</Text>}
                        {users.map(u => (
                            <TouchableOpacity key={u.id} style={styles.userRow} onPress={() => setSelectedUser(u)}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.username}>{u.username}</Text>
                                    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                                        <View style={styles.roleTag}>
                                            <Text style={styles.roleText}>{u.role.toUpperCase()}</Text>
                                        </View>
                                        <Text style={styles.joinedText}>Joined: {new Date(u.created_at).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                                <View style={styles.usageWrap}>
                                    <Text style={styles.usageValue}>{u.daily_usage_count}</Text>
                                    <Text style={styles.usageLabel}>calls today</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </>
                )}
                
                <View style={{height: 40}} />
            </ScrollView>

            {/* User Details Modal */}
            <Modal
                visible={!!selectedUser}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedUser(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>User Details</Text>
                            <TouchableOpacity onPress={() => setSelectedUser(null)}>
                                <Feather name="x" size={24} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>
                        
                        {selectedUser && (
                            <View style={styles.modalBody}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Username</Text>
                                    <Text style={styles.detailValue}>{selectedUser.username}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Role</Text>
                                    <Text style={[styles.detailValue, {color: '#4CAF50'}]}>{selectedUser.role.toUpperCase()}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Joined Date</Text>
                                    <Text style={styles.detailValue}>{new Date(selectedUser.created_at).toLocaleDateString()}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Today's API Usage</Text>
                                    <Text style={[styles.detailValue, {color: '#E91E63'}]}>{selectedUser.daily_usage_count} Requests</Text>
                                </View>

                                {selectedUser.role !== 'admin' && (
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteUser(selectedUser.id)}>
                                        <Feather name="trash-2" size={18} color="#FFF" style={{marginRight: 8}}/>
                                        <Text style={styles.deleteBtnText}>Delete User</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { padding: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },
  card: {
      backgroundColor: '#FFF',
      marginHorizontal: 20,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#F0F0F0',
      marginBottom: 25,
      shadowColor: '#000',
      shadowOpacity: 0.02,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 15 },
  label: { fontSize: 13, color: '#8E8E93', marginBottom: 6 },
  input: {
      backgroundColor: '#F9F9F9',
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      marginBottom: 15,
  },
  btn: {
      backgroundColor: '#1A1A1A',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 12,
  },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginTop: 10,
      marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  emptyText: { marginHorizontal: 20, color: '#8E8E93', fontStyle: 'italic', marginBottom: 15 },
  inviteRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#FFF',
      marginHorizontal: 20,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#F0F0F0',
      marginBottom: 10,
  },
  inviteInfo: { flex: 1 },
  inviteCode: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', letterSpacing: 1, marginBottom: 4 },
  inviteLimit: { fontSize: 13, color: '#666', marginBottom: 6 },
  unusedTag: { color: '#FF9800', fontSize: 12, fontWeight: '700' },
  usedTag: { color: '#4CAF50', fontSize: 12, fontWeight: '700' },
  actionBtn: {
      backgroundColor: '#F0F0F0',
      padding: 10,
      borderRadius: 8,
  },
  userRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#FFF',
      marginHorizontal: 20,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#F0F0F0',
      marginBottom: 10,
  },
  username: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  roleTag: { 
      backgroundColor: '#E8F5E9', 
      paddingHorizontal: 8, 
      paddingVertical: 4, 
      borderRadius: 6,
      marginRight: 10,
  },
  roleText: { fontSize: 10, color: '#4CAF50', fontWeight: '800' },
  joinedText: { fontSize: 11, color: '#8E8E93' },
  usageWrap: { alignItems: 'flex-end', justifyContent: 'center' },
  usageValue: { fontSize: 22, fontWeight: '800', color: '#E91E63' },
  usageLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '500' },
  
  // Modal Styles
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
  },
  modalContent: {
      backgroundColor: '#FFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  modalBody: {
      marginTop: 10,
  },
  detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
  },
  detailLabel: { fontSize: 15, color: '#8E8E93', fontWeight: '500' },
  detailValue: { fontSize: 16, color: '#1A1A1A', fontWeight: '700' },
  deleteBtn: {
      backgroundColor: '#FF5252',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 16,
      borderRadius: 14,
      marginTop: 30,
  },
  deleteBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
