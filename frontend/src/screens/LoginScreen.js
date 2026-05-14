import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import apiClient, { setAuthToken } from '../api/client';

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
                        <Feather name="activity" size={40} color="#E91E63" />
                    </View>
                    <Text style={styles.brandName}>SaiFit</Text>
                    <Text style={styles.welcomeText}>Private Fitness Assistant</Text>
                </View>

                <View style={styles.formContainer}>
                    {error ? (
                        <View style={styles.errorBox}>
                            <Feather name="alert-circle" size={16} color="#FF5252" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Username</Text>
                        <View style={styles.inputWrapper}>
                            <Feather name="user" size={20} color="#8E8E93" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="Enter your username"
                                placeholderTextColor="#666"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Invite Code</Text>
                        <View style={styles.inputWrapper}>
                            <Feather name="key" size={20} color="#8E8E93" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="e.g. FIT482"
                                placeholderTextColor="#666"
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
        backgroundColor: '#121212',
    },
    inner: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginTop: 60,
    },
    logoWrap: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: 'rgba(233, 30, 99, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    brandName: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 1,
        marginBottom: 8,
    },
    welcomeText: {
        fontSize: 16,
        color: '#8E8E93',
        fontWeight: '500',
    },
    formContainer: {
        width: '100%',
        marginTop: 40,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 82, 82, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 82, 82, 0.3)',
    },
    errorText: {
        color: '#FF5252',
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#E0E0E0',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#333',
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
    },
    loginBtn: {
        backgroundColor: '#E91E63',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#E91E63',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
    loginBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    footer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    footerText: {
        color: '#666',
        fontSize: 13,
    }
});
