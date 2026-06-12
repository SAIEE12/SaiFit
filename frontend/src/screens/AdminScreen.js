import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import apiClient from '../api/client';
import CustomDialog from '../components/CustomDialog';
import { theme } from '../theme';
import ScreenContainer from '../components/ui/ScreenContainer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function AdminScreen({ navigation }) {
    const [users, setUsers] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newCodeLimit, setNewCodeLimit] = useState('10');

    // New State Variables
    const [aiPeriod, setAiPeriod] = useState('today');
    const [aiUsage, setAiUsage] = useState({ users: [], appWideTotal: 0 });
    const [userActivity, setUserActivity] = useState([]);

    const [showInvites, setShowInvites] = useState(true);
    const [showUsers, setShowUsers] = useState(true);
    const [showAiUsage, setShowAiUsage] = useState(true);
    const [showUserActivity, setShowUserActivity] = useState(true);
    const [showSettings, setShowSettings] = useState(true);
    const [geminiKey, setGeminiKey] = useState('');
    const [secureKeyEntry, setSecureKeyEntry] = useState(true);

    // Inline Quota Edit state
    const [editingUserId, setEditingUserId] = useState(null);
    const [editingQuotaValue, setEditingQuotaValue] = useState('');

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

    useEffect(() => {
        fetchAiUsage();
    }, [aiPeriod]);

    const fetchAiUsage = async () => {
        try {
            const res = await apiClient.get(`/admin/ai-usage?period=${aiPeriod}`);
            setAiUsage(res.data);
        } catch (e) {
            console.error("Failed to load AI usage details:", e);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await apiClient.get('/admin/settings');
            setGeminiKey(res.data.gemini_api_key || '');
        } catch (e) {
            console.error("Failed to load system settings:", e);
        }
    };

    const saveSettings = async () => {
        try {
            setLoading(true);
            await apiClient.post('/admin/settings', { gemini_api_key: geminiKey });
            showDialog("Success", "System settings updated successfully.", "success");
            fetchSettings();
        } catch (e) {
            showDialog("Error", e.response?.data?.error || "Could not update system settings.", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, invitesRes, activityRes] = await Promise.all([
                apiClient.get('/admin/users'),
                apiClient.get('/admin/invites'),
                apiClient.get('/admin/user-activity'),
                fetchSettings()
            ]);
            setUsers(usersRes.data);
            setInvites(invitesRes.data);
            setUserActivity(activityRes.data);
            await fetchAiUsage();
        } catch(e) {
            showDialog("Error", "Could not load admin management details from server.", "error");
        } finally {
            setLoading(false);
        }
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

    const saveQuota = async (userId) => {
        const val = parseInt(editingQuotaValue);
        if (isNaN(val) || val < 0) {
            showDialog("Invalid Input", "Please enter a valid positive number for requests limit.", "error");
            return;
        }

        try {
            setLoading(true);
            await apiClient.put(`/admin/users/${userId}/quota`, { max_daily_requests: val });
            showDialog("Success", "Daily quota limit updated successfully.", "success");
            setEditingUserId(null);
            fetchData();
        } catch(e) {
            showDialog("Error", e.response?.data?.error || "Could not update quota limit.", "error");
        } finally {
            setLoading(false);
        }
    };

    const deleteInvite = async (id, isUsed = false) => {
        const title = isUsed ? "Delete Active Invite Code" : "Revoke Invite Code";
        const desc = isUsed 
            ? "Are you sure you want to delete this invite code? It has already been used by a registered user. Deleting it will detach the code tracking but keep their user account active." 
            : "Are you sure you want to delete this unused invite code?";
        const confirmText = isUsed ? "Delete Code" : "Revoke Code";

        showDialog(
            title,
            desc,
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
            confirmText
        );
    };

    const formatRequestType = (type) => {
        switch (type) {
            case 'insight': return 'Insight';
            case 'workout_coach': return 'Workout Coach';
            case 'workout': return 'Workout';
            case 'calendar_coach': return 'Calendar';
            case 'profile_coach': return 'Profile';
            case 'meal_scan': return 'Meals';
            case 'smart_search': return 'Search';
            case 'chat': return 'Chat';
            default: return type;
        }
    };

    const renderBreakdown = (breakdown) => {
        if (!breakdown || Object.keys(breakdown).length === 0) return 'No requests logged';
        const parts = Object.entries(breakdown).map(([type, count]) => {
            return `${formatRequestType(type)}: ${count}`;
        });
        return parts.join(' · ');
    };

    const getRelativeTime = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays} days ago`;
    };

    const formatActivityType = (type) => {
        switch (type) {
            case 'meal': return 'Logged a meal';
            case 'workout': return 'Logged a workout';
            case 'hydration': return 'Logged water';
            case 'custom_activity': return 'Logged an activity';
            default: return 'Logged activity';
        }
    };

    const formatLastActivity = (activity) => {
        if (!activity) return 'No activity logged';
        const typeLabel = formatActivityType(activity.type);
        const timeLabel = getRelativeTime(activity.date);
        return `${typeLabel} — ${timeLabel}`;
    };

    const isInactive = (lastLoginAt, lastActivityDate) => {
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const now = new Date().getTime();
        
        const loginTime = lastLoginAt ? new Date(lastLoginAt).getTime() : 0;
        const activityTime = lastActivityDate ? new Date(lastActivityDate).getTime() : 0;
        
        if (!lastLoginAt && !lastActivityDate) return true;
        
        const lastActiveTime = Math.max(loginTime, activityTime);
        return (now - lastActiveTime) > threeDaysMs;
    };

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.safeHeader}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Feather name="chevron-left" size={24} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Manage Invites & Users</Text>
                </View>
            </SafeAreaView>

            <ScreenContainer scrollable keyboardAvoiding={false} edges={['bottom']}>
                <View style={styles.contentContainer}>
                    
                    {/* System Settings Section */}
                    <TouchableOpacity 
                        style={styles.sectionHeaderRow} 
                        onPress={() => setShowSettings(!showSettings)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>System Settings</Text>
                        </View>
                        <Feather name={showSettings ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    {showSettings && (
                        <Card style={styles.createCard}>
                            <Text style={styles.cardLabel}>Gemini API Key</Text>
                            <Text style={styles.cardDesc}>
                                Enter a new Gemini API Key to update the application-wide configuration. Clear the input and save to remove the key.
                            </Text>
                            <View style={styles.settingsInputRow}>
                                <View style={styles.passwordContainer}>
                                    <TextInput 
                                        style={styles.settingsInput}
                                        value={geminiKey}
                                        onChangeText={setGeminiKey}
                                        secureTextEntry={secureKeyEntry}
                                        placeholder="Enter Gemini API Key"
                                        placeholderTextColor={theme.colors.textTertiary}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <TouchableOpacity 
                                        style={styles.eyeBtn} 
                                        onPress={() => setSecureKeyEntry(!secureKeyEntry)}
                                    >
                                        <Feather 
                                            name={secureKeyEntry ? "eye-off" : "eye"} 
                                            size={18} 
                                            color={theme.colors.textSecondary} 
                                        />
                                    </TouchableOpacity>
                                </View>
                                <Button variant="primary" size="md" onPress={saveSettings} style={styles.saveSettingsBtn}>
                                    Save
                                </Button>
                            </View>
                        </Card>
                    )}

                    {/* Invite Codes Section */}
                    <TouchableOpacity 
                        style={[styles.sectionHeaderRow, { marginTop: theme.spacing.lg }]} 
                        onPress={() => setShowInvites(!showInvites)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>Invite Codes</Text>
                            <Text style={styles.badgeText}>{invites.length} Total</Text>
                        </View>
                        <Feather name={showInvites ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    {showInvites && (
                        <View>
                            <Card style={styles.createCard}>
                                <Text style={styles.cardLabel}>Generate Invite Code</Text>
                                <Text style={styles.cardDesc}>Set a daily usage request quota limit for the invite token.</Text>
                                <View style={styles.inviteInputRow}>
                                    <TextInput 
                                        style={styles.inviteInput}
                                        value={newCodeLimit}
                                        onChangeText={setNewCodeLimit}
                                        keyboardType="numeric"
                                        placeholder="Requests Limit (e.g. 10)"
                                        placeholderTextColor={theme.colors.textTertiary}
                                    />
                                    <Button variant="primary" size="md" onPress={generateInvite} style={styles.generateBtn}>
                                        Generate
                                    </Button>
                                </View>
                            </Card>

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
                                        <TouchableOpacity onPress={() => deleteInvite(inv.id, inv.is_used)} style={styles.deleteAction}>
                                            <Feather name="trash-2" size={18} color={theme.colors.danger} />
                                        </TouchableOpacity>
                                    </Card>
                                ))}
                                {invites.length === 0 && (
                                    <Text style={styles.emptyListText}>No invite codes generated yet.</Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Users Section */}
                    <TouchableOpacity 
                        style={[styles.sectionHeaderRow, { marginTop: theme.spacing.xl }]} 
                        onPress={() => setShowUsers(!showUsers)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>Registered Users</Text>
                            <Text style={styles.badgeText}>{users.length} Total</Text>
                        </View>
                        <Feather name={showUsers ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    {showUsers && (
                        <View style={styles.listContainer}>
                            {users.map((usr) => (
                                <Card key={usr.id} style={styles.listItem}>
                                    <View style={styles.listItemLeft}>
                                        <View style={[styles.listIconWrap, {backgroundColor: usr.role === 'admin' ? theme.colors.primaryLight : theme.colors.successLight}]}>
                                            <Feather name="user" size={16} color={usr.role === 'admin' ? theme.colors.primary : theme.colors.success} />
                                        </View>
                                        <View style={{flex: 1}}>
                                            <Text style={styles.itemUsername}>{usr.username} <Text style={styles.itemRole}>({usr.role.toUpperCase()})</Text></Text>
                                            {editingUserId === usr.id ? (
                                                <View style={styles.inlineEditRow}>
                                                    <Text style={styles.inlineEditLabel}>Limit:</Text>
                                                    <TextInput 
                                                        style={styles.inlineEditInput}
                                                        value={editingQuotaValue}
                                                        onChangeText={setEditingQuotaValue}
                                                        keyboardType="numeric"
                                                        autoFocus
                                                    />
                                                    <TouchableOpacity onPress={() => saveQuota(usr.id)} style={styles.inlineEditAction}>
                                                        <Feather name="check" size={16} color={theme.colors.success} />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => setEditingUserId(null)} style={styles.inlineEditAction}>
                                                        <Feather name="x" size={16} color={theme.colors.danger} />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View style={styles.quotaLimitRow}>
                                                    <Text style={styles.itemSub}>
                                                        Today: {usr.daily_usage_count} reqs · Limit: {usr.quota_limit !== null && usr.quota_limit !== undefined ? usr.quota_limit : 10} reqs/day
                                                    </Text>
                                                    <TouchableOpacity 
                                                        onPress={() => {
                                                            setEditingUserId(usr.id);
                                                            setEditingQuotaValue(String(usr.quota_limit !== null && usr.quota_limit !== undefined ? usr.quota_limit : 10));
                                                        }}
                                                        style={styles.editQuotaBtn}
                                                    >
                                                        <Feather name="edit-2" size={11} color={theme.colors.primary} />
                                                    </TouchableOpacity>
                                                </View>
                                            )}
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
                    )}

                    {/* AI Usage Dashboard Section */}
                    <TouchableOpacity 
                        style={[styles.sectionHeaderRow, { marginTop: theme.spacing.xl }]} 
                        onPress={() => setShowAiUsage(!showAiUsage)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>AI Usage</Text>
                            <Text style={[styles.badgeText, { backgroundColor: theme.colors.primaryLight, color: theme.colors.primary }]}>
                                {aiUsage.appWideTotal} Total
                            </Text>
                        </View>
                        <Feather name={showAiUsage ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    {showAiUsage && (
                        <View>
                            {/* Period Selector Chips */}
                            <View style={styles.periodChipsRow}>
                                {['today', 'week', 'month'].map((p) => {
                                    const isSelected = aiPeriod === p;
                                    return (
                                        <TouchableOpacity
                                            key={p}
                                            onPress={() => setAiPeriod(p)}
                                            style={[
                                                styles.periodChip,
                                                isSelected && styles.periodChipSelected
                                            ]}
                                        >
                                            <Text style={[
                                                styles.periodChipText,
                                                isSelected && styles.periodChipTextSelected
                                            ]}>
                                                {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={styles.listContainer}>
                                {aiUsage.users.map((usr) => {
                                    const isToday = aiPeriod === 'today';
                                    const nearLimit = isToday && (usr.total >= usr.max_daily_requests * 0.8);
                                    
                                    return (
                                        <Card key={usr.username} style={styles.listItem}>
                                            <View style={styles.listItemLeft}>
                                                <View style={[styles.listIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
                                                    <Feather name="cpu" size={16} color={theme.colors.primary} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <Text style={styles.itemUsername}>@{usr.username}</Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Text style={styles.usageCountText}>
                                                                {usr.total} {isToday ? `/ ${usr.max_daily_requests}` : 'reqs'}
                                                            </Text>
                                                            {nearLimit && (
                                                                <View style={styles.nearLimitBadge}>
                                                                    <Text style={styles.nearLimitBadgeText}>LIMIT NEAR</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>
                                                    
                                                    <Text style={styles.itemSub} numberOfLines={2}>
                                                        {renderBreakdown(usr.breakdown)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </Card>
                                    );
                                })}
                                {aiUsage.users.length === 0 && (
                                    <Text style={styles.emptyListText}>No AI usage logged in this period.</Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* User Activity Overview Section */}
                    <TouchableOpacity 
                        style={[styles.sectionHeaderRow, { marginTop: theme.spacing.xl }]} 
                        onPress={() => setShowUserActivity(!showUserActivity)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>User Activity</Text>
                            <Text style={styles.badgeText}>{userActivity.length} Users</Text>
                        </View>
                        <Feather name={showUserActivity ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    {showUserActivity && (
                        <View style={styles.listContainer}>
                            {userActivity.map((act) => {
                                const inactive = isInactive(act.last_login_at, act.last_activity?.date);
                                return (
                                    <Card 
                                        key={act.username} 
                                        style={[
                                            styles.listItem,
                                            inactive && styles.inactiveListItem
                                        ]}
                                    >
                                        <View style={styles.listItemLeft}>
                                            <View style={[
                                                styles.listIconWrap, 
                                                { 
                                                    backgroundColor: inactive 
                                                        ? theme.colors.border 
                                                        : theme.colors.successLight 
                                                }
                                            ]}>
                                                <Feather 
                                                    name={inactive ? "user-minus" : "activity"} 
                                                    size={16} 
                                                    color={inactive ? theme.colors.textSecondary : theme.colors.success} 
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Text style={[
                                                        styles.itemUsername,
                                                        inactive && styles.inactiveText
                                                    ]}>
                                                        @{act.username}
                                                    </Text>
                                                    {act.streak > 0 && (
                                                        <Text style={styles.streakText}>🔥 {act.streak} day{act.streak !== 1 ? 's' : ''}</Text>
                                                    )}
                                                </View>
                                                
                                                <Text style={[
                                                    styles.itemSub,
                                                    inactive && styles.inactiveText
                                                ]}>
                                                    Last Login: {getRelativeTime(act.last_login_at)}
                                                </Text>
                                                
                                                <Text style={[
                                                    styles.itemSub,
                                                    inactive && styles.inactiveText
                                                ]}>
                                                    Last Activity: {formatLastActivity(act.last_activity)}
                                                </Text>
                                            </View>
                                        </View>
                                    </Card>
                                );
                            })}
                            {userActivity.length === 0 && (
                                <Text style={styles.emptyListText}>No user activity logged.</Text>
                            )}
                        </View>
                    )}

                </View>
            </ScreenContainer>

            {loading && (
                <View style={styles.absoluteLoader}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            )}

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
    safeHeader: { backgroundColor: theme.colors.background },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xxl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    headerTitle: {
        ...theme.typography.h2,
        color: theme.colors.textPrimary,
    },
    backBtn: {
        marginRight: theme.spacing.sm,
        padding: theme.spacing.xs,
        marginLeft: -theme.spacing.xs,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xxl,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        ...theme.typography.h3,
        color: theme.colors.textPrimary,
    },
    badgeText: {
        ...theme.typography.labelSmall,
        color: theme.colors.textSecondary,
        backgroundColor: theme.colors.border,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        overflow: 'hidden',
        marginLeft: 8,
    },
    contentContainer: {
        paddingBottom: theme.spacing.huge,
    },
    createCard: {
        marginHorizontal: theme.spacing.xxl,
        padding: 16,
        marginBottom: 12,
    },
    cardLabel: {
        ...theme.typography.h4,
        color: theme.colors.textPrimary,
    },
    cardDesc: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 2,
        lineHeight: 15,
    },
    inviteInputRow: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    inviteInput: {
        flex: 1,
        backgroundColor: theme.colors.background,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 12,
        height: 46,
        fontSize: 13,
        color: theme.colors.textPrimary,
        fontWeight: '500',
    },
    generateBtn: {
        borderRadius: theme.radii.lg,
    },
    listContainer: {
        marginHorizontal: theme.spacing.xxl,
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
    periodChipsRow: {
        flexDirection: 'row',
        marginHorizontal: theme.spacing.xxl,
        marginBottom: 12,
        gap: 8,
    },
    periodChip: {
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    periodChipSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primaryLight,
    },
    periodChipText: {
        ...theme.typography.captionStrong,
        color: theme.colors.textSecondary,
    },
    periodChipTextSelected: {
        color: theme.colors.primary,
    },
    usageCountText: {
        ...theme.typography.captionStrong,
        color: theme.colors.textPrimary,
        fontWeight: '700',
    },
    nearLimitBadge: {
        backgroundColor: theme.colors.dangerLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 6,
    },
    nearLimitBadgeText: {
        ...theme.typography.captionStrong,
        color: theme.colors.danger,
        fontSize: 9,
    },
    streakText: {
        ...theme.typography.captionStrong,
        color: '#FF9500', // Matches warning/orange
    },
    inactiveListItem: {
        opacity: 0.65,
        backgroundColor: '#F9F9F9',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    inactiveText: {
        color: theme.colors.textTertiary,
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
    },
    inlineEditRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    inlineEditLabel: {
        ...theme.typography.captionStrong,
        color: theme.colors.textSecondary,
    },
    inlineEditInput: {
        width: 50,
        height: 26,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 6,
        backgroundColor: theme.colors.background,
        paddingHorizontal: 6,
        fontSize: 11,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    inlineEditAction: {
        padding: 4,
    },
    quotaLimitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    editQuotaBtn: {
        marginLeft: 6,
        paddingVertical: 2,
        paddingHorizontal: 4,
    },
    settingsInputRow: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
        alignItems: 'center',
    },
    passwordContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        height: 46,
        paddingRight: 10,
    },
    settingsInput: {
        flex: 1,
        paddingHorizontal: 12,
        height: '100%',
        fontSize: 13,
        color: theme.colors.textPrimary,
        fontWeight: '500',
    },
    eyeBtn: {
        padding: 4,
    },
    saveSettingsBtn: {
        borderRadius: theme.radii.lg,
        height: 46,
        justifyContent: 'center',
    },
});
