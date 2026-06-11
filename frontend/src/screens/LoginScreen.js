import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import apiClient, { setAuthToken } from '../api/client';
import { theme } from '../theme';
import ScreenContainer from '../components/ui/ScreenContainer';
import TextField from '../components/ui/TextField';
import Button from '../components/ui/Button';

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
        <ScreenContainer scrollable={false} contentContainerStyle={styles.inner}>
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
                        <Feather name="alert-circle" size={16} color={theme.colors.danger} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <TextField
                    label="USERNAME"
                    placeholder="Enter your username"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    icon={<Feather name="user" size={18} color={theme.colors.textSecondary} />}
                />

                <TextField
                    label="INVITE CODE"
                    placeholder="e.g. FIT482"
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    autoCapitalize="characters"
                    icon={<Feather name="key" size={18} color={theme.colors.textSecondary} />}
                />

                <Button 
                    variant="primary" 
                    size="lg" 
                    onPress={handleLogin} 
                    loading={loading}
                    style={styles.loginBtn}
                >
                    Enter SaiFit
                </Button>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Access restricted to invited users only.</Text>
            </View>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
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
        borderRadius: theme.radii.xl,
        backgroundColor: theme.colors.accentPinkLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 45, 85, 0.15)',
    },
    brandName: {
        ...theme.typography.h1,
        color: theme.colors.textPrimary,
        marginBottom: 6,
    },
    welcomeText: {
        ...theme.typography.captionStrong,
        color: theme.colors.textSecondary,
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
        borderRadius: theme.radii.lg,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FFD2D2',
    },
    errorText: {
        color: theme.colors.danger,
        marginLeft: 8,
        ...theme.typography.bodySmall,
        fontWeight: '600',
    },
    loginBtn: {
        marginTop: 10,
    },
    footer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    footerText: {
        ...theme.typography.captionStrong,
        color: theme.colors.textSecondary,
    }
});
