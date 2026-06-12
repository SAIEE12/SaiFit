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
            const [usersRes, invitesRes] = await Promise.all([
                apiClient.get('/admin/users'),
                apiClient.get('/admin/invites')
            ]);
            setUsers(usersRes.data);
            setInvites(invitesRes.data);
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
                    
                    {/* Invite Codes Section */}
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Invite Codes</Text>
                        <Text style={styles.badgeText}>{invites.length} Total</Text>
                    </View>

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

                    {/* Users Section */}
                    <View style={[styles.sectionHeaderRow, { marginTop: theme.spacing.xl }]}>
                        <Text style={styles.sectionTitle}>Registered Users</Text>
                        <Text style={styles.badgeText}>{users.length} Total</Text>
                    </View>

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
