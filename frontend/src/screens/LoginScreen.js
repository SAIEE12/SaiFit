import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import apiClient, { setAuthToken } from '../api/client';
import { theme } from '../theme';

export default function LoginScreen({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!username || !inviteCode) {
            setError('Please enter both username and invite code.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await apiClient.post('/auth/login', {
                username: username.trim(),
                inviteCode: inviteCode.trim().toUpperCase()
            });

            await setAuthToken(response.data.token);
            onLoginSuccess(response.data.user);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
                
                <View style={styles.header}>
                    <View style={styles.logoWrap}>
                        <Feather name="activity" size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.brandName}>SaiFit</Text>
                    <Text style={styles.welcomeText}>Your Private Fitness Assistant</Text>
                </View>

                <View style={styles.formContainer}>
                    {error ? (
                        <View style={styles.errorBox}>
                            <Feather name="alert-circle" size={16} color={theme.colors.primary} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>USERNAME</Text>
                        <View style={styles.inputWrapper}>
                            <Feather name="user" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="Enter your username"
                                placeholderTextColor={theme.colors.textTertiary}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>INVITE CODE</Text>
                        <View style={styles.inputWrapper}>
                            <Feather name="key" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="e.g. FIT482"
                                placeholderTextColor={theme.colors.textTertiary}
                                value={inviteCode}
                                onChangeText={setInviteCode}
                                autoCapitalize="characters"
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.loginBtnText}>Enter SaiFit</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Access restricted to invited users only.</Text>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    inner: {
        flex: 1,
        justifyContent: 'space-between',
        padding: theme.spacing.xxl,
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
    },
    logoWrap: {
        width: 72,
        height: 72,
        borderRadius: theme.borderRadius.xl,
        backgroundColor: theme.colors.accentPinkLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 45, 85, 0.15)',
    },
    brandName: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.colors.textPrimary,
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    welcomeText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    formContainer: {
        width: '100%',
        marginVertical: 20,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF5F5',
        padding: 14,
        borderRadius: theme.borderRadius.lg,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FFD2D2',
    },
    errorText: {
        color: '#FF3B30',
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        fontWeight: '800',
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 1.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 16,
        height: 56,
        ...theme.shadows.soft,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: theme.colors.textPrimary,
        fontSize: 16,
        fontWeight: '500',
    },
    loginBtn: {
        backgroundColor: theme.colors.primary,
        height: 56,
        borderRadius: theme.borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    loginBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    footer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    footerText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    }
});
