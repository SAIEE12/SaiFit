import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, Switch, LayoutAnimation, UIManager } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../api/client';
import CustomDialog from '../components/CustomDialog';
import { theme } from '../theme';
import ScreenContainer from '../components/ui/ScreenContainer';
import { Header, SectionHeader } from '../components/ui/Header';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const DEFAULT_PROMPTS = {
    PROMPT_GLOBAL_INSIGHT: 'Act as an elite AI Personal Health Companion. Analyze today and yesterday health data: {{DATA}}. Highlight improvements, hydration, macros, and workout splits in 2 sentences.',
    PROMPT_WORKOUT_SUGGESTION: defaultWorkoutPrompt,
    PROMPT_MEAL_ANALYSIS: defaultMealPrompt,
    PROMPT_SMART_SEARCH: 'Act as an expert AI Nutrition Chef. Suggest premium, high-density recipes or ingredient alternatives based on user search: {{QUERY}}. Return a friendly markdown response.',
    PROMPT_CALENDAR_COACH: 'Act as an elite AI Fitness Journey Analyst from Apple and Google Fit. Analyze the user last 14 days logs: {{LOGS}}. Streak: {{STREAK}} days. Provide workout splits consistency score, overtraining alerts, and milestones. Format as JSON with keys summary, expanded_narrative, consistency_score, streak_analysis, workout_predictions, best_time_suggestion, overtraining_alerts, milestones.',
    PROMPT_PROFILE_COACH: 'Act as an expert AI Progress & Body Metrics Analyst. Analyze user profile weights, height, target weights, gender, age: {{PROFILE}}. Provide adaptive progress timelines, body predictions, adaptive suggestions, and a dynamic fitness score.',
    PROMPT_SMART_NOTIFICATIONS: 'Act as an elite, ultra-encouraging notification copywriter from Apple/Nike. Write a personalized push notification copy based on user status: {{STATUS}} suggesting actions.',
    PROMPT_HYDRATION_COACH: 'Act as an expert AI Hydration Specialist. Design a simple personalized water drinking schedule based on user total logged exercises and activities: {{HYDRATION_DATA}}. Provide a simple hourly timeline.',
    PROMPT_SLEEP_ADVISOR: 'Act as an expert AI Sleep & Muscle Recovery Advisor. Analyze user daily active logs and suggest sleep targets, recovery suggestions, and fatigue checks: {{RECOVERY_DATA}}.'
};

const PROMPT_LABELS = {
    PROMPT_GLOBAL_INSIGHT: 'Dashboard Insights',
    PROMPT_WORKOUT_SUGGESTION: 'Workout Trainer',
    PROMPT_MEAL_ANALYSIS: 'Meal Nutrition Scanner',
    PROMPT_SMART_SEARCH: 'Conceptual Smart Search',
    PROMPT_CALENDAR_COACH: 'Calendar Analyst',
    PROMPT_PROFILE_COACH: 'Profile Progress Predictor',
    PROMPT_SMART_NOTIFICATIONS: 'Smart Notifications Copy',
    PROMPT_HYDRATION_COACH: 'Hydration Scheduler',
    PROMPT_SLEEP_ADVISOR: 'Sleep & Muscle Recovery'
};

export default function AdminScreen({ navigation }) {
    const [users, setUsers] = useState([]);
    const [invites, setInvites] = useState([]);
    const [settings, setSettings] = useState({ 
        GEMINI_API_KEY: '', 
        GEMINI_MODEL_NAME: 'gemini-3-pro',
        ENABLE_AI_FEATURES: 'true',
        ENABLE_GLOBAL_INSIGHT: 'true',
        ENABLE_MEAL_SCAN: 'true',
        ENABLE_WORKOUT_COACH: 'true',
        ENABLE_SMART_SEARCH: 'false',
        ENABLE_CALENDAR_COACH: 'true',
        ENABLE_PROFILE_COACH: 'true',
        ENABLE_SMART_NOTIFICATIONS: 'true',
        ENABLE_HYDRATION_COACH: 'true',
        ENABLE_SLEEP_ADVISOR: 'true',
        AI_PROVIDER: 'Google Gemini',
        PROMPT_GLOBAL_INSIGHT: '',
        PROMPT_WORKOUT_SUGGESTION: '',
        PROMPT_MEAL_ANALYSIS: '',
        PROMPT_SMART_SEARCH: '',
        PROMPT_CALENDAR_COACH: '',
        PROMPT_PROFILE_COACH: '',
        PROMPT_SMART_NOTIFICATIONS: '',
        PROMPT_HYDRATION_COACH: '',
        PROMPT_SLEEP_ADVISOR: ''
    });
    const [loading, setLoading] = useState(false);
    const [newCodeLimit, setNewCodeLimit] = useState('10');
    
    // Accordion Expansion State
    const [expandedSections, setExpandedSections] = useState({
        aiCore: true,
        prompts: false,
        tokens: false,
        users: false
    });

    // Currently Selected Prompt Tab inside Prompt Tuner Section
    const [selectedPromptKey, setSelectedPromptKey] = useState('PROMPT_GLOBAL_INSIGHT');

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

    const toggleSection = (section) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

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
        const defaultValue = DEFAULT_PROMPTS[key];
        showDialog(
            "Reset System Prompt",
            `Are you sure you want to reset the prompt for "${PROMPT_LABELS[key]}" to default system template?`,
            "warning",
            async () => {
                try {
                    setLoading(true);
                    await apiClient.post('/admin/settings', { key, value: defaultValue });
                    setSettings(prev => ({ ...prev, [key]: defaultValue }));
                    showDialog("Reset Completed! ✨", "Successfully reverted system instruction prompt to template values.", "success");
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
        <View style={styles.container}>
            <Header
                title="Governance Portal"
                subtitle="Configure AI cores, system settings, and security keys"
                leftElement={
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Feather name="chevron-left" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                }
            />

            <ScreenContainer scrollable keyboardAvoiding={false} edges={['bottom']}>
                {/* ⚙️ ACCORDION SECTION 1: AI Engine & Master Feature Suites */}
                <Card style={styles.accordionHeaderCard} onPress={() => toggleSection('aiCore')}>
                    <View style={styles.accordionHeaderRow}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <View style={[styles.accordionIconBg, {backgroundColor: theme.colors.primaryLight}]}>
                                <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
                            </View>
                            <View style={{marginLeft: 12}}>
                                <Text style={styles.accordionTitle}>AI Engine & Suite Controls</Text>
                                <Text style={styles.accordionSubtitle}>Model select, provider key, and master features</Text>
                            </View>
                        </View>
                        <Feather name={expandedSections.aiCore ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.textSecondary} />
                    </View>
                </Card>

                {expandedSections.aiCore && (
                    <View style={styles.accordionContent}>
                        {/* Global Feature Access Switch Card */}
                        <Card style={styles.globalCard}>
                            <View style={styles.toggleRow}>
                                <View style={{flex: 1, paddingRight: 10}}>
                                    <Text style={styles.globalToggleLabel}>Master AI Integration</Text>
                                    <Text style={styles.toggleDesc}>Shut down or activate all artificial intelligence cores application-wide.</Text>
                                </View>
                                <Switch 
                                    value={settings.ENABLE_AI_FEATURES === 'true'}
                                    onValueChange={(val) => updateSetting('ENABLE_AI_FEATURES', val)}
                                    trackColor={{ false: "#D1D1D6", true: theme.colors.primary }}
                                />
                            </View>
                        </Card>

                        {/* Model Configuration Params */}
                        <View style={styles.formRow}>
                            <View style={{flex: 1}}>
                                <Text style={styles.fieldLabel}>Core AI Provider</Text>
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
                                <Text style={styles.fieldLabel}>Active Model</Text>
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

                        <View style={{marginTop: 14}}>
                            <Text style={styles.fieldLabel}>Secure Key Token (Gemini Credentials)</Text>
                            <View style={styles.inputContainer}>
                                <Feather name="key" size={15} color={theme.colors.textTertiary} style={{marginRight: 8}} />
                                <TextInput 
                                    style={styles.apiKeyInput}
                                    value={settings.GEMINI_API_KEY}
                                    onChangeText={(v) => setSettings({...settings, GEMINI_API_KEY: v})}
                                    onBlur={() => updateSetting('GEMINI_API_KEY', settings.GEMINI_API_KEY)}
                                    placeholder="••••••••••••••••••••••••••••••••"
                                    secureTextEntry={true}
                                    placeholderTextColor={theme.colors.textTertiary}
                                />
                            </View>
                            <Text style={styles.helperText}>Uses standard environment variables default key if left empty.</Text>
                        </View>

                        {/* Grouped Master Feature Suite Cards */}
                        <Text style={styles.sectionHeadingText}>SUITE MASTER ACCESS CARDS</Text>

                        {/* Suite 1: AI Companion Core */}
                        <Card style={styles.suiteCard}>
                            <View style={styles.suiteHeader}>
                                <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
                                <Text style={styles.suiteTitle}>AI Companion Core</Text>
                            </View>
                            <View style={styles.suiteRow}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.suiteFeatureName}>Daily Insights</Text>
                                    <Text style={styles.suiteFeatureDesc}>Compares logs to outline improvements.</Text>
                                </View>
                                <Switch 
                                    value={settings.ENABLE_GLOBAL_INSIGHT === 'true'}
                                    onValueChange={(val) => updateSetting('ENABLE_GLOBAL_INSIGHT', val)}
                                    trackColor={{ false: "#E5E5EA", true: theme.colors.primary }}
                                />
                            </View>
                            <View style={[styles.suiteRow, styles.topDivider]}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.suiteFeatureName}>Sleep & Muscle Advisor</Text>
                                    <Text style={styles.suiteFeatureDesc}>Recovery suggestions and resting analysis.</Text>
                                </View>
                                <Switch 
                                    value={settings.ENABLE_SLEEP_ADVISOR === 'true'}
                                    onValueChange={(val) => updateSetting('ENABLE_SLEEP_ADVISOR', val)}
                                    trackColor={{ false: "#E5E5EA", true: theme.colors.primary }}
                                />
                            </View>
                        </Card>

                        {/* Suite 2: Nutrition Smart Suite */}
                        <Card style={styles.suiteCard}>
                            <View style={styles.suiteHeader}>
                                <MaterialCommunityIcons name="food-apple" size={16} color={theme.colors.success} />
                                <Text style={[styles.suiteTitle, {color: theme.colors.success}]}>Nutrition Smart Suite</Text>
                            </View>
                            <View style={styles.suiteRow}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.suiteFeatureName}>Meal Scan Analyzer</Text>
                                    <Text style={styles.suiteFeatureDesc}>Analyze food description logs.</Text>
                                </View>
                                <Switch 
                                    value={settings.ENABLE_MEAL_SCAN === 'true'}
                                    onValueChange={(val) => updateSetting('ENABLE_MEAL_SCAN', val)}
                                    trackColor={{ false: "#E5E5EA", true: theme.colors.success }}
                                />
                            </View>
                            <View style={[styles.suiteRow, styles.topDivider]}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.suiteFeatureName}>Conceptual Smart Search</Text>
                                    <Text style={styles.suiteFeatureDesc}>Admin toggled AI conceptual food recipes search.</Text>
                                </View>
                                <Switch 
                                    value={settings.ENABLE_SMART_SEARCH === 'true'}
                                    onValueChange={(val) => updateSetting('ENABLE_SMART_SEARCH', val)}
                                    trackColor={{ false: "#E5E5EA", true: theme.colors.success }}
                                />
                            </View>
                        </Card>

                        {/* Suite 3: Active Trainer Suite */}
                        <Card style={styles.suiteCard}>
                            <View style={styles.suiteHeader}>
                                <FontAwesome5 name="running" size={14} color={theme.colors.secondary} />
                                <Text style={[styles.suiteTitle, {color: theme.colors.secondary}]}>Active Trainer Suite</Text>
                            </View>
                            <View style={styles.suiteRow}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.suiteFeatureName}>Workout Recommender</Text>
                                    <Text style={styles.suiteFeatureDesc}>Personalized training coach splits.</Text>
                                </View>
                                <Switch 
                                    value={settings.ENABLE_WORKOUT_COACH === 'true'}
                                    onValueChange={(val) => updateSetting('ENABLE_WORKOUT_COACH', val)}
                                    trackColor={{ false: "#E5E5EA", true: theme.colors.secondary }}
                                />
                            </View>
                            <View style={[styles.suiteRow, styles.topDivider]}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.suiteFeatureName}>Hydration Scheduler</Text>
                                    <Text style={styles.suiteFeatureDesc}>Hourly schedules calculated via exercise level.</Text>
                                </View>
                                <Switch 
                                    value={settings.ENABLE_HYDRATION_COACH === 'true'}
                                    onValueChange={(val) => updateSetting('ENABLE_HYDRATION_COACH', val)}
                                    trackColor={{ false: "#E5E5EA", true: theme.colors.secondary }}
                                />
                            </View>
                        </Card>

                        {/* Suite 4: Journey Analytics Suite */}
                        <Card style={styles.suiteCard}>
                            <View style={styles.suiteHeader}>
                                <Feather name="trending-up" size={15} color={theme.colors.warning} />
                                <Text style={[styles.suiteTitle, {color: theme.colors.warning}]}>Journey Analytics Suite</Text>
                            </View>
                            <View style={styles.suiteRow}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.suiteFeatureName}>14-Day Calendar Analyst</Text>
                                    <Text style={styles.suiteFeatureDesc}>Muscle splits and habit streak calculations.</Text>
                                </View>
                                <Switch 
                                    value={settings.ENABLE_CALENDAR_COACH === 'true'}
                                    onValueChange={(val) => updateSetting('ENABLE_CALENDAR_COACH', val)}
                                    trackColor={{ false: "#E5E5EA", true: theme.colors.warning }}
                                />
                            </View>
                            <View style={[styles.suiteRow, styles.topDivider]}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.suiteFeatureName}>Body Progress Predictor</Text>
                                    <Text style={styles.suiteFeatureDesc}>Adaptive goal estimations and score predictor.</Text>
                                </View>
                                <Switch 
                                    value={settings.ENABLE_PROFILE_COACH === 'true'}
                                    onValueChange={(val) => updateSetting('ENABLE_PROFILE_COACH', val)}
                                    trackColor={{ false: "#E5E5EA", true: theme.colors.warning }}
                                />
                            </View>
                        </Card>

                        {/* Suite 5: Smart Notification Core */}
                        <Card style={styles.suiteCard}>
                            <View style={styles.suiteHeader}>
                                <Ionicons name="notifications-outline" size={16} color={theme.colors.primary} />
                                <Text style={styles.suiteTitle}>Alert Action Engine</Text>
                            </View>
                            <View style={styles.suiteRow}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.suiteFeatureName}>Smart Notifications Copy</Text>
                                    <Text style={styles.suiteFeatureDesc}>Writes personalized push notification reminders.</Text>
                                </View>
                                <Switch 
                                    value={settings.ENABLE_SMART_NOTIFICATIONS === 'true'}
                                    onValueChange={(val) => updateSetting('ENABLE_SMART_NOTIFICATIONS', val)}
                                    trackColor={{ false: "#E5E5EA", true: theme.colors.primary }}
                                />
                            </View>
                        </Card>
                    </View>
                )}

                {/* ✍️ ACCORDION SECTION 2: System Prompts tuner */}
                <Card style={[styles.accordionHeaderCard, {marginTop: 12}]} onPress={() => toggleSection('prompts')}>
                    <View style={styles.accordionHeaderRow}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <View style={[styles.accordionIconBg, {backgroundColor: theme.colors.secondaryLight}]}>
                                <Ionicons name="create-outline" size={16} color={theme.colors.secondary} />
                            </View>
                            <View style={{marginLeft: 12}}>
                                <Text style={styles.accordionTitle}>System Prompt Tuner</Text>
                                <Text style={styles.accordionSubtitle}>Fine-tune 9 individual generative prompts</Text>
                            </View>
                        </View>
                        <Feather name={expandedSections.prompts ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.textSecondary} />
                    </View>
                </Card>

                {expandedSections.prompts && (
                    <View style={styles.accordionContent}>
                        {/* Horizontal Tab pills selection */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsContainer}>
                            {Object.keys(PROMPT_LABELS).map((key) => (
                                <TouchableOpacity 
                                    key={key} 
                                    style={[styles.pillBtn, selectedPromptKey === key && styles.activePillBtn]}
                                    onPress={() => setSelectedPromptKey(key)}
                                >
                                    <Text style={[styles.pillText, selectedPromptKey === key && styles.activePillText]}>
                                        {PROMPT_LABELS[key]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Interactive Editor panel for selected prompt */}
                        <Card style={styles.promptCard}>
                            <View style={styles.promptHeader}>
                                <Text style={styles.promptLabel}>{PROMPT_LABELS[selectedPromptKey]}</Text>
                                <TouchableOpacity onPress={() => handleResetPrompt(selectedPromptKey)}>
                                    <Text style={styles.resetText}>Reset to Default</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <TextInput 
                                style={styles.textArea}
                                multiline
                                value={settings[selectedPromptKey]}
                                onChangeText={(v) => setSettings({...settings, [selectedPromptKey]: v})}
                                onBlur={() => updateSetting(selectedPromptKey, settings[selectedPromptKey])}
                                placeholder="Edit AI Instructions..."
                                placeholderTextColor={theme.colors.textTertiary}
                            />
                            
                            {/* Preview default template preview panel */}
                            <Text style={styles.previewHeading}>SYSTEM TEMPLATE PREVIEW:</Text>
                            <View style={styles.previewBox}>
                                <Text style={styles.previewText}>{DEFAULT_PROMPTS[selectedPromptKey]}</Text>
                            </View>
                        </Card>
                    </View>
                )}

                {/* 🔑 ACCORDION SECTION 3: Invites & Security keys */}
                <Card style={[styles.accordionHeaderCard, {marginTop: 12}]} onPress={() => toggleSection('tokens')}>
                    <View style={styles.accordionHeaderRow}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <View style={[styles.accordionIconBg, {backgroundColor: theme.colors.successLight}]}>
                                <Ionicons name="key-outline" size={16} color={theme.colors.success} />
                            </View>
                            <View style={{marginLeft: 12}}>
                                <Text style={styles.accordionTitle}>Token Key Governance</Text>
                                <Text style={styles.accordionSubtitle}>Create and audit invite tokens access</Text>
                            </View>
                        </View>
                        <Feather name={expandedSections.tokens ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.textSecondary} />
                    </View>
                </Card>

                {expandedSections.tokens && (
                    <View style={styles.accordionContent}>
                        {/* Invite Code Generator Card */}
                        <Card style={styles.card}>
                            <Text style={styles.toggleLabel}>Create Invite Access Token</Text>
                            <Text style={styles.toggleDesc}>Set a daily usage query quota limit for the invite token.</Text>
                            <View style={styles.inviteInputRow}>
                                <TextInput 
                                    style={styles.inviteInput}
                                    value={newCodeLimit}
                                    onChangeText={setNewCodeLimit}
                                    keyboardType="numeric"
                                    placeholder="Requests Limit (e.g. 10)"
                                    placeholderTextColor={theme.colors.textTertiary}
                                />
                                <Button variant="primary" size="md" onPress={generateInvite} style={{ borderRadius: theme.radii.lg }}>
                                    Generate
                                </Button>
                            </View>
                        </Card>

                        {/* Invites list */}
                        <SectionHeader title={`ACCESS TOKENS (${invites.length})`} />
                        <View style={styles.listContainer}>
                            {invites.map((inv) => (
                                <Card key={inv.id} style={styles.listItem}>
                                    <View style={styles.listItemLeft}>
                                        <View style={[styles.listIconWrap, {backgroundColor: inv.is_used ? theme.colors.primaryLight : theme.colors.secondaryLight}]}>
                                            <Feather name="key" size={16} color={inv.is_used ? theme.colors.primary : theme.colors.secondary} />
                                        </View>
                                        <View style={{flex: 1}}>
                                            <Text style={styles.itemCode}>{inv.code}</Text>
                                            <Text style={styles.itemSub}>Quota: {inv.max_daily_requests} reqs/day</Text>
                                            {inv.is_used ? (
                                                <Text style={[styles.itemStatus, {color: theme.colors.primary}]}>Registered: @{inv.assigned_username}</Text>
                                            ) : (
                                                <Text style={[styles.itemStatus, {color: theme.colors.secondary}]}>Unused & Active</Text>
                                            )}
                                        </View>
                                    </View>
                                    {!inv.is_used && (
                                        <TouchableOpacity onPress={() => deleteInvite(inv.id)} style={styles.deleteAction}>
                                            <Feather name="trash-2" size={18} color={theme.colors.danger} />
                                        </TouchableOpacity>
                                    )}
                                </Card>
                            ))}
                            {invites.length === 0 && (
                                <Text style={styles.emptyListText}>No invite codes generated yet.</Text>
                            )}
                        </View>
                    </View>
                )}

                {/* 👥 ACCORDION SECTION 4: Registered User Accounts */}
                <Card style={[styles.accordionHeaderCard, {marginTop: 12, marginBottom: 20}]} onPress={() => toggleSection('users')}>
                    <View style={styles.accordionHeaderRow}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <View style={[styles.accordionIconBg, {backgroundColor: theme.colors.border}]}>
                                <Feather name="users" size={15} color={theme.colors.textPrimary} />
                            </View>
                            <View style={{marginLeft: 12}}>
                                <Text style={styles.accordionTitle}>Registered Accounts</Text>
                                <Text style={styles.accordionSubtitle}>Total user base details and access logs</Text>
                            </View>
                        </View>
                        <Feather name={expandedSections.users ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.textSecondary} />
                    </View>
                </Card>

                {expandedSections.users && (
                    <View style={styles.accordionContent}>
                        <View style={styles.listContainer}>
                            {users.map((usr) => (
                                <Card key={usr.id} style={styles.listItem}>
                                    <View style={styles.listItemLeft}>
                                        <View style={[styles.listIconWrap, {backgroundColor: usr.role === 'admin' ? theme.colors.primaryLight : theme.colors.successLight}]}>
                                            <Feather name="user" size={16} color={usr.role === 'admin' ? theme.colors.primary : theme.colors.success} />
                                        </View>
                                        <View style={{flex: 1}}>
                                            <Text style={styles.itemUsername}>{usr.username} <Text style={styles.itemRole}>({usr.role.toUpperCase()})</Text></Text>
                                            <Text style={styles.itemSub}>API calls logged today: {usr.daily_usage_count} reqs</Text>
                                            <Text style={styles.itemDate}>Created: {new Date(usr.created_at).toLocaleDateString()}</Text>
                                        </View>
                                    </View>
                                    {usr.role !== 'admin' && (
                                        <TouchableOpacity onPress={() => deleteUser(usr.id)} style={styles.deleteAction}>
                                            <Feather name="user-x" size={18} color={theme.colors.danger} />
                                        </TouchableOpacity>
                                    )}
                                </Card>
                            ))}
                            {users.length === 0 && (
                                <Text style={styles.emptyListText}>No user accounts configured.</Text>
                            )}
                        </View>
                    </View>
                )}

                {loading && (
                    <View style={styles.absoluteLoader}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                )}

                <View style={{height: 100}} />
            </ScreenContainer>

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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    backBtn: { padding: 5, marginRight: 10 },
    
    // Collapsible Accordion Header card
    accordionHeaderCard: {
        marginHorizontal: theme.spacing.xxl,
    },
    accordionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    accordionIconBg: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    accordionTitle: {
        ...theme.typography.h5,
        color: theme.colors.textPrimary,
    },
    accordionSubtitle: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    accordionContent: {
        marginTop: 10,
        paddingHorizontal: theme.spacing.xxl,
        gap: 12,
    },

    globalCard: {
        borderColor: 'rgba(255, 45, 85, 0.15)',
        marginBottom: 4,
        padding: 16,
    },
    globalToggleLabel: {
        ...theme.typography.h5,
        color: theme.colors.primary,
    },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    toggleLabel: { ...theme.typography.h5, color: theme.colors.textPrimary },
    toggleDesc: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 15 },
    
    formRow: { flexDirection: 'row', gap: 12 },
    fieldLabel: { ...theme.typography.labelSmall, color: theme.colors.textPrimary, marginBottom: 6 },
    pickerWrap: { backgroundColor: theme.colors.card, borderRadius: theme.radii.lg, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
    picker: { height: 50, width: '100%', backgroundColor: 'transparent' },
    
    inputContainer: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, 
        borderRadius: theme.radii.lg, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12 
    },
    apiKeyInput: { flex: 1, height: 48, fontSize: 13, color: theme.colors.textPrimary, fontWeight: '500' },
    helperText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 6, fontStyle: 'italic' },
    
    sectionHeadingText: {
        ...theme.typography.labelSmall,
        color: theme.colors.textSecondary,
        marginTop: 16,
        marginBottom: 4,
    },

    // Grouped Suite Cards
    suiteCard: {
        padding: 16,
    },
    suiteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 6,
    },
    suiteTitle: {
        ...theme.typography.captionStrong,
        color: theme.colors.primary,
    },
    suiteRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    suiteFeatureName: {
        ...theme.typography.bodySmall,
        color: theme.colors.textPrimary,
        fontWeight: '700',
    },
    suiteFeatureDesc: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    topDivider: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        marginTop: 4,
        paddingTop: 12,
    },

    // Horizontal tab switcher pills
    pillsContainer: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingVertical: 6,
    },
    pillBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.card,
        marginRight: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    activePillBtn: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    pillText: {
        ...theme.typography.captionStrong,
        color: theme.colors.textSecondary,
    },
    activePillText: {
        color: '#FFF',
    },

    // Interactive Prompt tuner editor
    promptCard: { 
        padding: 16,
    },
    promptHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
    promptLabel: { ...theme.typography.bodySmall, color: theme.colors.textPrimary, fontWeight: '800' },
    resetText: { ...theme.typography.captionStrong, color: theme.colors.primary },
    textArea: { 
        backgroundColor: theme.colors.background, 
        borderRadius: theme.radii.lg, 
        padding: 12, 
        fontSize: 13, 
        color: theme.colors.textPrimary, 
        minHeight: 120, 
        textAlignVertical: 'top', 
        lineHeight: 18, 
        fontWeight: '500',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    previewHeading: {
        ...theme.typography.labelSmall,
        color: theme.colors.textSecondary,
        marginTop: 16,
        marginBottom: 6,
    },
    previewBox: {
        backgroundColor: 'rgba(28, 28, 30, 0.04)',
        borderRadius: theme.radii.lg,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    previewText: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        lineHeight: 16,
        fontStyle: 'italic',
    },

    // Token Key styles
    card: { 
        padding: 16,
    },
    inviteInputRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
    inviteInput: { 
        flex: 1, backgroundColor: theme.colors.background, borderRadius: theme.radii.lg, borderWidth: 1, 
        borderColor: theme.colors.border, paddingHorizontal: 12, height: 46, fontSize: 13, color: theme.colors.textPrimary, fontWeight: '500'
    },
    
    // Dynamic lists styling
    listContainer: {
        marginTop: 2,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        padding: 12,
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 8,
    },
    listIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemCode: {
        ...theme.typography.h5,
        color: theme.colors.textPrimary,
    },
    itemUsername: {
        ...theme.typography.h5,
        color: theme.colors.textPrimary,
    },
    itemRole: {
        ...theme.typography.labelSmall,
        color: theme.colors.textSecondary,
    },
    itemSub: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    itemDate: {
        ...theme.typography.caption,
        color: theme.colors.textTertiary,
        marginTop: 2,
    },
    itemStatus: {
        ...theme.typography.captionStrong,
        marginTop: 2,
    },
    deleteAction: {
        padding: 4,
    },
    emptyListText: {
        ...theme.typography.captionStrong,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        paddingVertical: 18,
    },
    absoluteLoader: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    }
});
