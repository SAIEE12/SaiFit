import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Clipboard, Modal, LayoutAnimation, Platform, UIManager, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../api/client';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AdminScreen() {
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
    
    // Expansion states
    const [isAIExpanded, setIsAIExpanded] = useState(true);
    const [isInviteExpanded, setIsInviteExpanded] = useState(false);
    
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
            
            // Map settings array to object
            if (settingsRes.data) {
                const settingsObj = {};
                settingsRes.data.forEach(s => {
                    settingsObj[s.key] = s.value;
                });
                setSettings(prev => ({ ...prev, ...settingsObj }));
            }
        } catch(e) {
            Alert.alert("Error", "Could not load admin data");
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
            Alert.alert("Error", `Could not update ${key}`);
        } finally {
            setLoading(false);
        }
    };

    const generateInvite = async () => {
        try {
            const limit = parseInt(newCodeLimit) || 10;
            const res = await apiClient.post('/admin/invite', { max_daily_requests: limit });
            Alert.alert("Invite Created! 🎉", `Code: ${res.data.code}`);
            fetchData();
        } catch(e) {
            Alert.alert("Error", "Could not create invite");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Admin Dashboard</Text>
                    <Text style={styles.headerSubtitle}>System governance and AI configuration</Text>
                </View>

                {/* AI Configuration - Image Reference Style */}
                <View style={styles.configSection}>
                    <View style={styles.sectionTitleRow}>
                        <Feather name="zap" size={20} color="#E91E63" />
                        <View style={{marginLeft: 10}}>
                            <Text style={styles.sectionMainTitle}>AI Configuration</Text>
                            <Text style={styles.sectionSubTitle}>Configure the AI provider, model, and analysis prompts.</Text>
                        </View>
                    </View>
                    
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>AI Configured and Active</Text>
                    </View>

                    {/* Toggles */}
                    <View style={styles.card}>
                        <View style={styles.toggleRow}>
                            <View>
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
                            <View>
                                <Text style={styles.toggleLabel}>Enable Smart Search</Text>
                                <Text style={styles.toggleDesc}>Show or hide the "Smart Search" option in the side pane.</Text>
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
                        <Text style={styles.subHeaderTitle}>API CONFIGURATION</Text>
                    </View>
                    
                    <View style={styles.row}>
                        <View style={{flex: 1, marginRight: 10}}>
                            <Text style={styles.fieldLabel}>AI Provider</Text>
                            <View style={styles.pickerWrap}>
                                <Picker
                                    selectedValue={settings.AI_PROVIDER}
                                    onValueChange={(val) => updateSetting('AI_PROVIDER', val)}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Google Gemini" value="Google Gemini" />
                                    <Picker.Item label="OpenAI (Coming Soon)" value="OpenAI" enabled={false} />
                                </Picker>
                            </View>
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.fieldLabel}>Model Name</Text>
                            <View style={styles.pickerWrap}>
                                <Picker
                                    selectedValue={settings.GEMINI_MODEL_NAME}
                                    onValueChange={(val) => updateSetting('GEMINI_MODEL_NAME', val)}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Gemini 3 Pro (Stable)" value="gemini-3-pro" />
                                    <Picker.Item label="Gemini 2.5 Flash-Lite (Stable)" value="gemini-2.5-flash-lite" />
                                    <Picker.Item label="Gemini 2.0 Flash" value="gemini-2.0-flash" />
                                    <Picker.Item label="Gemini 1.5 Pro" value="gemini-1.5-pro" />
                                </Picker>
                            </View>
                        </View>
                    </View>

                    <View style={{marginTop: 15}}>
                        <Text style={styles.fieldLabel}>API Key *</Text>
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
                        <Text style={styles.helperText}>Your API key is stored securely. Leave blank to use system environment variables.</Text>
                    </View>

                    {/* Prompt Configuration */}
                    <View style={[styles.subHeaderRow, {marginTop: 30}]}>
                        <Feather name="edit-2" size={16} color="#8E8E93" />
                        <Text style={styles.subHeaderTitle}>PROMPT CONFIGURATION</Text>
                    </View>

                    <View style={styles.promptCard}>
                        <View style={styles.promptHeader}>
                            <Text style={styles.promptLabel}>Meal Analysis Prompt</Text>
                            <TouchableOpacity><Text style={styles.resetText}>Reset to Default</Text></TouchableOpacity>
                        </View>
                        <TextInput 
                            style={styles.textArea}
                            multiline
                            value={settings.PROMPT_MEAL_ANALYSIS}
                            onChangeText={(v) => setSettings({...settings, PROMPT_MEAL_ANALYSIS: v})}
                            onBlur={() => updateSetting('PROMPT_MEAL_ANALYSIS', settings.PROMPT_MEAL_ANALYSIS)}
                            placeholder="System instructions for food scanning..."
                        />
                    </View>

                    <View style={[styles.promptCard, {marginTop: 20}]}>
                        <View style={styles.promptHeader}>
                            <Text style={styles.promptLabel}>Workout Suggestion Prompt</Text>
                            <TouchableOpacity><Text style={styles.resetText}>Reset to Default</Text></TouchableOpacity>
                        </View>
                        <TextInput 
                            style={styles.textArea}
                            multiline
                            value={settings.PROMPT_WORKOUT_SUGGESTION}
                            onChangeText={(v) => setSettings({...settings, PROMPT_WORKOUT_SUGGESTION: v})}
                            onBlur={() => updateSetting('PROMPT_WORKOUT_SUGGESTION', settings.PROMPT_WORKOUT_SUGGESTION)}
                            placeholder="System instructions for workout recommendations..."
                        />
                    </View>
                </View>

                {/* User Management Section */}
                <View style={[styles.configSection, {marginTop: 40}]}>
                     <View style={styles.sectionTitleRow}>
                        <Feather name="users" size={20} color="#1A1A1A" />
                        <Text style={[styles.sectionMainTitle, {marginLeft: 10}]}>User Management</Text>
                    </View>
                    <View style={styles.card}>
                        <Text style={styles.toggleLabel}>Create Invite Code</Text>
                        <View style={styles.inviteInputRow}>
                            <TextInput 
                                style={styles.inviteInput}
                                value={newCodeLimit}
                                onChangeText={setNewCodeLimit}
                                keyboardType="numeric"
                                placeholder="Request Limit (e.g. 10)"
                            />
                            <TouchableOpacity style={styles.inviteBtn} onPress={generateInvite}>
                                <Text style={styles.inviteBtnText}>Generate</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={{height: 100}} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFD' },
    header: { padding: 25, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
    headerSubtitle: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
    configSection: { padding: 20 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    sectionMainTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
    sectionSubTitle: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
    statusBadge: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', 
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 20
    },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 8 },
    statusText: { fontSize: 12, color: '#4CAF50', fontWeight: '700' },
    card: { 
        backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0',
        shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1
    },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    toggleLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
    toggleDesc: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
    subHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, marginTop: 25 },
    subHeaderTitle: { fontSize: 12, fontWeight: '800', color: '#8E8E93', marginLeft: 8, letterSpacing: 1 },
    row: { flexDirection: 'row' },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
    pickerWrap: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden' },
    picker: { height: 50, width: '100%' },
    inputContainer: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
        borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0', paddingHorizontal: 15 
    },
    apiKeyInput: { flex: 1, height: 50, fontSize: 14, color: '#1A1A1A' },
    helperText: { fontSize: 11, color: '#8E8E93', marginTop: 8, fontStyle: 'italic' },
    promptCard: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0', padding: 20 },
    promptHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    promptLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
    resetText: { fontSize: 12, color: '#E91E63', fontWeight: '600' },
    textArea: { 
        backgroundColor: '#F9F9F9', borderRadius: 12, padding: 15, fontSize: 13, 
        color: '#666', minHeight: 120, textAlignVertical: 'top', lineHeight: 20
    },
    inviteInputRow: { flexDirection: 'row', marginTop: 15 },
    inviteInput: { 
        flex: 1, backgroundColor: '#F9F9F9', borderRadius: 12, borderWidth: 1, 
        borderColor: '#EEE', paddingHorizontal: 15, height: 50, marginRight: 10
    },
    inviteBtn: { backgroundColor: '#1A1A1A', paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
    inviteBtnText: { color: '#FFF', fontWeight: '800' }
});
