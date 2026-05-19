import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';
import CustomDialog from '../components/CustomDialog';

const defaultMealPrompt = `Analyze the food. Estimate its nutritional value. Return a JSON object exactly like this (no markdown block, pure JSON):
{
  "food_name": "Name of food",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fats": 0
}
Description / context: {{TEXT}}`;

const defaultWorkoutPrompt = `Act as an expert AI personal trainer.
User Goal: {{GOAL}}
Recent Workouts Count: {{COUNT}}

Please provide a highly personalized, beginner-friendly workout recommendation and some recovery advice for tomorrow.
Format the response as a valid JSON object with the following structure (no markdown, pure JSON):
{
  "workout_plan": "String describing the workout plan",
  "exercises": ["Exercise 1", "Exercise 2"],
  "recovery_advice": "String with recovery advice"
}`;

export default function AdminScreen({ navigation }) {
    const [users, setUsers] = useState([]);
    const [invites, setInvites] = useState([]);
    const [settings, setSettings] = useState({ 
        GEMINI_API_KEY: '', 
        GEMINI_MODEL_NAME: 'gemini-3-pro',
        ENABLE_AI_FEATURES: 'true',
        ENABLE_SMART_SEARCH: 'false',
        AI_PROVIDER: 'Google Gemini',
        PROMPT_MEAL_ANALYSIS: '',
        PROMPT_WORKOUT_SUGGESTION: ''
    });
    const [loading, setLoading] = useState(false);
    const [newCodeLimit, setNewCodeLimit] = useState('10');

    // Dialog state
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, invitesRes, settingsRes] = await Promise.all([
                apiClient.get('/admin/users'),
                apiClient.get('/admin/invites'),
                apiClient.get('/admin/settings')
            ]);
            setUsers(usersRes.data);
            setInvites(invitesRes.data);
            
            // Map settings
            if (settingsRes.data) {
                if (Array.isArray(settingsRes.data)) {
                    const settingsObj = {};
                    settingsRes.data.forEach(s => {
                        settingsObj[s.key] = s.value;
                    });
                    setSettings(prev => ({ ...prev, ...settingsObj }));
                } else {
                    setSettings(prev => ({ ...prev, ...settingsRes.data }));
                }
            }
        } catch(e) {
            showDialog("Error", "Could not load system configuration details from server.", "error");
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key, value) => {
        try {
            setLoading(true);
            await apiClient.post('/admin/settings', { key, value: String(value) });
            setSettings(prev => ({ ...prev, [key]: String(value) }));
        } catch(e) {
            showDialog("Update Failed", `Could not update ${key} variable setting.`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPrompt = async (key) => {
        const defaultValue = key === 'PROMPT_MEAL_ANALYSIS' ? defaultMealPrompt : defaultWorkoutPrompt;
        showDialog(
            "Reset System Prompt",
            "Are you sure you want to reset this prompt instruction to system default values?",
            "warning",
            async () => {
                try {
                    setLoading(true);
                    await apiClient.post('/admin/settings', { key, value: defaultValue });
                    setSettings(prev => ({ ...prev, [key]: defaultValue }));
                    showDialog("Reset Completed! ✨", "Successfully reverted system instruction prompt to system default values.", "success");
                } catch (err) {
                    showDialog("Error", "Could not reset prompt settings.", "error");
                } finally {
                    setLoading(false);
                }
            },
            () => {},
            "Reset"
        );
    };

    const generateInvite = async () => {
        try {
            setLoading(true);
            const limit = parseInt(newCodeLimit) || 10;
            const res = await apiClient.post('/admin/invite', { max_daily_requests: limit });
            showDialog("Invite Created! 🎉", `Successfully generated invite token code: ${res.data.code}`, "success");
            setNewCodeLimit('10');
            fetchData();
        } catch(e) {
            showDialog("Error", "Could not create invite access token.", "error");
        } finally {
            setLoading(false);
        }
    };

    const deleteUser = async (id) => {
        showDialog(
            "Delete Registered User",
            "Are you sure you want to remove this user account? Their profile details, logged meals, and workouts history will be permanently deleted.",
            "confirm",
            async () => {
                try {
                    setLoading(true);
                    await apiClient.delete(`/admin/users/${id}`);
                    showDialog("Account Deleted", "User has been permanently removed from the system.", "success");
                    fetchData();
                } catch(e) {
                    showDialog("Error", e.response?.data?.error || "Could not delete user account.", "error");
                } finally {
                    setLoading(false);
                }
            },
            () => {},
            "Remove User"
        );
    };

    const deleteInvite = async (id) => {
        showDialog(
            "Revoke Invite Code",
            "Are you sure you want to delete this unused invite code?",
            "confirm",
            async () => {
                try {
                    setLoading(true);
                    await apiClient.delete(`/admin/invites/${id}`);
                    showDialog("Token Revoked", "Invite code token successfully deactivated.", "success");
                    fetchData();
                } catch(e) {
                    showDialog("Error", e.response?.data?.error || "Could not delete invite code.", "error");
                } finally {
                    setLoading(false);
                }
            },
            () => {},
            "Revoke Code"
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header with Back Navigation */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Feather name="chevron-left" size={24} color="#E91E63" />
                    <Text style={styles.backBtnText}>Back to Profile</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>System Governance</Text>
                <Text style={styles.headerSubtitle}>Configure prompts, tokens, and active invite codes</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* AI Configuration Section */}
                <View style={styles.configSection}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="sparkles" size={20} color="#E91E63" />
                        <View style={{marginLeft: 10}}>
                            <Text style={styles.sectionMainTitle}>AI Configuration</Text>
                            <Text style={styles.sectionSubTitle}>Configure system providers, model naming, and secure tokens.</Text>
                        </View>
                    </View>
                    
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>AI Core Active & Synchronized</Text>
                    </View>

                    {/* Toggles */}
                    <View style={styles.card}>
                        <View style={styles.toggleRow}>
                            <View style={{flex: 1, paddingRight: 10}}>
                                <Text style={styles.toggleLabel}>Enable AI Features</Text>
                                <Text style={styles.toggleDesc}>Toggle all AI functionalities across the platform.</Text>
                            </View>
                            <Switch 
                                value={settings.ENABLE_AI_FEATURES === 'true'}
                                onValueChange={(val) => updateSetting('ENABLE_AI_FEATURES', val)}
                                trackColor={{ false: "#D1D1D6", true: "#E91E63" }}
                            />
                        </View>
                        <View style={[styles.toggleRow, {borderTopWidth: 1, borderTopColor: '#F0F0F0', marginTop: 15, paddingTop: 15}]}>
                            <View style={{flex: 1, paddingRight: 10}}>
                                <Text style={styles.toggleLabel}>Enable Smart Search</Text>
                                <Text style={styles.toggleDesc}>Expose conceptual AI search capabilities to users on their nutrition dashboard.</Text>
                            </View>
                            <Switch 
                                value={settings.ENABLE_SMART_SEARCH === 'true'}
                                onValueChange={(val) => updateSetting('ENABLE_SMART_SEARCH', val)}
                                trackColor={{ false: "#D1D1D6", true: "#E91E63" }}
                            />
                        </View>
                    </View>

                    {/* API Configuration */}
                    <View style={styles.subHeaderRow}>
                        <Feather name="settings" size={16} color="#8E8E93" />
                        <Text style={styles.subHeaderTitle}>API CREDENTIALS & MODELS</Text>
                    </View>
                    
                    <View style={styles.rowGap}>
                        <View style={{flex: 1}}>
                            <Text style={styles.fieldLabel}>AI Provider</Text>
                            <View style={styles.pickerWrap}>
                                <Picker
                                    selectedValue={settings.AI_PROVIDER}
                                    onValueChange={(val) => updateSetting('AI_PROVIDER', val)}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Google Gemini" value="Google Gemini" />
                                    <Picker.Item label="OpenAI (Soon)" value="OpenAI" enabled={false} />
                                </Picker>
                            </View>
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.fieldLabel}>Model Select</Text>
                            <View style={styles.pickerWrap}>
                                <Picker
                                    selectedValue={settings.GEMINI_MODEL_NAME}
                                    onValueChange={(val) => updateSetting('GEMINI_MODEL_NAME', val)}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Gemini 3 Pro" value="gemini-3-pro" />
                                    <Picker.Item label="Gemini 2.5 Flash-Lite" value="gemini-2.5-flash-lite" />
                                    <Picker.Item label="Gemini 2.0 Flash" value="gemini-2.0-flash" />
                                    <Picker.Item label="Gemini 1.5 Pro" value="gemini-1.5-pro" />
                                </Picker>
                            </View>
                        </View>
                    </View>

                    <View style={{marginTop: 15}}>
                        <Text style={styles.fieldLabel}>API Credentials Key *</Text>
                        <View style={styles.inputContainer}>
                            <Feather name="key" size={16} color="#CCC" style={{marginRight: 10}} />
                            <TextInput 
                                style={styles.apiKeyInput}
                                value={settings.GEMINI_API_KEY}
                                onChangeText={(v) => setSettings({...settings, GEMINI_API_KEY: v})}
                                onBlur={() => updateSetting('GEMINI_API_KEY', settings.GEMINI_API_KEY)}
                                placeholder="••••••••••••••••••••••••••••••••"
                                secureTextEntry={true}
                            />
                        </View>
                        <Text style={styles.helperText}>Stored securely. Defaults to system .env key if left empty.</Text>
                    </View>

                    {/* Prompt Configuration */}
                    <View style={[styles.subHeaderRow, {marginTop: 30}]}>
                        <Feather name="edit-2" size={16} color="#8E8E93" />
                        <Text style={styles.subHeaderTitle}>PROMPT ALGORITHMS CONFIG</Text>
                    </View>

                    <View style={styles.promptCard}>
                        <View style={styles.promptHeader}>
                            <Text style={styles.promptLabel}>Meal Analysis Prompt</Text>
                            <TouchableOpacity onPress={() => handleResetPrompt('PROMPT_MEAL_ANALYSIS')}>
                                <Text style={styles.resetText}>Reset to Default</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput 
                            style={styles.textArea}
                            multiline
                            value={settings.PROMPT_MEAL_ANALYSIS}
                            onChangeText={(v) => setSettings({...settings, PROMPT_MEAL_ANALYSIS: v})}
                            onBlur={() => updateSetting('PROMPT_MEAL_ANALYSIS', settings.PROMPT_MEAL_ANALYSIS)}
                            placeholder="Meal analysis prompt structure..."
                        />
                    </View>

                    <View style={[styles.promptCard, {marginTop: 20}]}>
                        <View style={styles.promptHeader}>
                            <Text style={styles.promptLabel}>Workout Suggestion Prompt</Text>
                            <TouchableOpacity onPress={() => handleResetPrompt('PROMPT_WORKOUT_SUGGESTION')}>
                                <Text style={styles.resetText}>Reset to Default</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput 
                            style={styles.textArea}
                            multiline
                            value={settings.PROMPT_WORKOUT_SUGGESTION}
                            onChangeText={(v) => setSettings({...settings, PROMPT_WORKOUT_SUGGESTION: v})}
                            onBlur={() => updateSetting('PROMPT_WORKOUT_SUGGESTION', settings.PROMPT_WORKOUT_SUGGESTION)}
                            placeholder="Workout recommender prompt structure..."
                        />
                    </View>
                </View>

                {/* User & Invite Management Section */}
                <View style={[styles.configSection, {marginTop: 10}]}>
                     <View style={styles.sectionTitleRow}>
                        <Feather name="users" size={20} color="#1A1A1A" />
                        <Text style={[styles.sectionMainTitle, {marginLeft: 10}]}>User & Token Access</Text>
                    </View>

                    {/* Invite Code Generator Card */}
                    <View style={styles.card}>
                        <Text style={styles.toggleLabel}>Create Invite Access Token</Text>
                        <Text style={styles.toggleDesc}>Set a daily usage query quota limit for the invite token.</Text>
                        <View style={styles.inviteInputRow}>
                            <TextInput 
                                style={styles.inviteInput}
                                value={newCodeLimit}
                                onChangeText={setNewCodeLimit}
                                keyboardType="numeric"
                                placeholder="Requests Limit (e.g. 10)"
                            />
                            <TouchableOpacity style={styles.inviteBtn} onPress={generateInvite}>
                                <Text style={styles.inviteBtnText}>Generate</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Invites list */}
                    <View style={[styles.subHeaderRow, {marginTop: 30}]}>
                        <Feather name="key" size={16} color="#8E8E93" />
                        <Text style={styles.subHeaderTitle}>ACCESS TOKENS ({invites.length})</Text>
                    </View>
                    
                    <View style={styles.listContainer}>
                        {invites.map((inv) => (
                            <View key={inv.id} style={styles.listItem}>
                                <View style={styles.listItemLeft}>
                                    <View style={[styles.listIconWrap, {backgroundColor: inv.is_used ? '#E91E63' : '#E3F2FD'}]}>
                                        <Feather name="key" size={16} color={inv.is_used ? '#FFF' : '#2196F3'} />
                                    </View>
                                    <View style={{flex: 1}}>
                                        <Text style={styles.itemCode}>{inv.code}</Text>
                                        <Text style={styles.itemSub}>Quota: {inv.max_daily_requests} reqs/day</Text>
                                        {inv.is_used ? (
                                            <Text style={[styles.itemStatus, {color: '#E91E63'}]}>Registered: @{inv.assigned_username}</Text>
                                        ) : (
                                            <Text style={[styles.itemStatus, {color: '#2196F3'}]}>Unused & Active</Text>
                                        )}
                                    </View>
                                </View>
                                {!inv.is_used && (
                                    <TouchableOpacity onPress={() => deleteInvite(inv.id)} style={styles.deleteAction}>
                                        <Feather name="trash-2" size={18} color="#FF5252" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                        {invites.length === 0 && (
                            <Text style={styles.emptyListText}>No invite codes generated yet.</Text>
                        )}
                    </View>

                    {/* Users list */}
                    <View style={[styles.subHeaderRow, {marginTop: 30}]}>
                        <Feather name="users" size={16} color="#8E8E93" />
                        <Text style={styles.subHeaderTitle}>REGISTERED ACCOUNTS ({users.length})</Text>
                    </View>

                    <View style={styles.listContainer}>
                        {users.map((usr) => (
                            <View key={usr.id} style={styles.listItem}>
                                <View style={styles.listItemLeft}>
                                    <View style={[styles.listIconWrap, {backgroundColor: usr.role === 'admin' ? '#E91E63' : '#E8F5E9'}]}>
                                        <Feather name="user" size={16} color={usr.role === 'admin' ? '#FFF' : '#4CAF50'} />
                                    </View>
                                    <View style={{flex: 1}}>
                                        <Text style={styles.itemUsername}>{usr.username} <Text style={styles.itemRole}>({usr.role.toUpperCase()})</Text></Text>
                                        <Text style={styles.itemSub}>API calls logged today: {usr.daily_usage_count} reqs</Text>
                                        <Text style={styles.itemDate}>Created: {new Date(usr.created_at).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                                {usr.role !== 'admin' && (
                                    <TouchableOpacity onPress={() => deleteUser(usr.id)} style={styles.deleteAction}>
                                        <Feather name="user-x" size={18} color="#FF5252" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                        {users.length === 0 && (
                            <Text style={styles.emptyListText}>No user accounts configured.</Text>
                        )}
                    </View>
                </View>

                {loading && (
                    <View style={styles.absoluteLoader}>
                        <ActivityIndicator size="large" color="#E91E63" />
                    </View>
                )}

                <View style={{height: 100}} />
            </ScrollView>

            {/* Custom Dialog Alert Portal */}
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
    container: { flex: 1, backgroundColor: '#F8FAFD' },
    header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, marginLeft: -5 },
    backBtnText: { color: '#E91E63', fontSize: 15, fontWeight: '700', marginLeft: 2 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A' },
    headerSubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 4, fontWeight: '500' },
    configSection: { padding: 20 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    sectionMainTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
    sectionSubTitle: { fontSize: 12, color: '#8E8E93', marginTop: 2, fontWeight: '500', lineHeight: 16 },
    statusBadge: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', 
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 20
    },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 8 },
    statusText: { fontSize: 11, color: '#4CAF50', fontWeight: '800' },
    card: { 
        backgroundColor: '#FFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0',
        shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1
    },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    toggleLabel: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
    toggleDesc: { fontSize: 12, color: '#8E8E93', marginTop: 2, lineHeight: 16, fontWeight: '500' },
    subHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, marginTop: 25 },
    subHeaderTitle: { fontSize: 12, fontWeight: '800', color: '#8E8E93', marginLeft: 8, letterSpacing: 1 },
    rowGap: { flexDirection: 'row', gap: 15 },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
    pickerWrap: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', overflow: 'hidden' },
    picker: { height: Platform.OS === 'ios' ? 120 : 50, width: '100%', backgroundColor: 'transparent' },
    pickerItem: { fontSize: 14 },
    inputContainer: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
        borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 15 
    },
    apiKeyInput: { flex: 1, height: 50, fontSize: 14, color: '#1A1A1A' },
    helperText: { fontSize: 11, color: '#8E8E93', marginTop: 8, fontStyle: 'italic', fontWeight: '500' },
    promptCard: { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0', padding: 20 },
    promptHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    promptLabel: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
    resetText: { fontSize: 12, color: '#E91E63', fontWeight: '700' },
    textArea: { 
        backgroundColor: '#F9F9F9', borderRadius: 12, padding: 15, fontSize: 13, 
        color: '#555', minHeight: 120, textAlignVertical: 'top', lineHeight: 20, fontWeight: '500'
    },
    inviteInputRow: { flexDirection: 'row', marginTop: 15 },
    inviteInput: { 
        flex: 1, backgroundColor: '#F9F9F9', borderRadius: 12, borderWidth: 1, 
        borderColor: '#E0E0E0', paddingHorizontal: 15, height: 50, marginRight: 10, fontSize: 14
    },
    inviteBtn: { backgroundColor: '#1A1A1A', paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
    inviteBtnText: { color: '#FFF', fontWeight: '800' },

    // Dynamic Lists Styling
    listContainer: {
        marginTop: 5,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 10,
    },
    listIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    itemCode: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    itemUsername: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    itemRole: {
        fontSize: 10,
        fontWeight: '800',
        color: '#8E8E93',
    },
    itemSub: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '500',
        marginTop: 2,
    },
    itemDate: {
        fontSize: 10,
        color: '#BBB',
        fontWeight: '600',
        marginTop: 2,
    },
    itemStatus: {
        fontSize: 11,
        fontWeight: '800',
        marginTop: 3,
    },
    deleteAction: {
        padding: 5,
    },
    emptyListText: {
        fontSize: 13,
        color: '#AAA',
        textAlign: 'center',
        paddingVertical: 20,
        fontStyle: 'italic',
        fontWeight: '600',
    },
    absoluteLoader: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    }
});
