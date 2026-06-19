import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Keyboard,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import apiClient, { setAuthToken } from '../api/client';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import AnimatedTextField from '../components/ui/AnimatedTextField';

export default function LoginScreen({ onLoginSuccess }) {
    const { theme, isDark } = useTheme();
    const styles = useThemedStyles(stylesFactory);
    const [username, setUsername] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const insets = useSafeAreaInsets();

    // Refs for keyboard navigation
    const inviteCodeInputRef = useRef(null);

    // Micro-interactions state & animated values
    const fadeLogo = useRef(new Animated.Value(0)).current;
    const fadeForm = useRef(new Animated.Value(0)).current;
    const fadeButton = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const errorFadeAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;
    const buttonPulse = useRef(new Animated.Value(1)).current;

    // Screen entrance animations
    useEffect(() => {
        Animated.stagger(150, [
            Animated.timing(fadeLogo, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(fadeForm, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(fadeButton, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    // Shake animation triggered when login fails
    const triggerShake = () => {
        shakeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 4, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
    };

    // Error box fade-in animation
    useEffect(() => {
        if (error) {
            Animated.timing(errorFadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        } else {
            errorFadeAnim.setValue(0);
        }
    }, [error]);

    // Button pulse animation during loading state
    useEffect(() => {
        let pulseLoop;
        if (loading) {
            buttonPulse.setValue(1);
            pulseLoop = Animated.loop(
                Animated.sequence([
                    Animated.timing(buttonPulse, { toValue: 0.94, duration: 550, useNativeDriver: true }),
                    Animated.timing(buttonPulse, { toValue: 1, duration: 550, useNativeDriver: true })
                ])
            );
            pulseLoop.start();
        } else {
            buttonPulse.setValue(1);
        }
        return () => {
            if (pulseLoop) pulseLoop.stop();
        };
    }, [loading]);

    const handlePressIn = () => {
        if (loading) return;
        Animated.spring(buttonScale, {
            toValue: 0.96,
            useNativeDriver: true,
            tension: 40,
            friction: 7
        }).start();
    };

    const handlePressOut = () => {
        if (loading) return;
        Animated.spring(buttonScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 40,
            friction: 7
        }).start();
    };

    const handleLogin = async () => {
        const cleanUsername = username.trim();
        const cleanInviteCode = inviteCode.trim();

        if (!cleanUsername || !cleanInviteCode) {
            setError('Please enter both username and invite code.');
            triggerShake();
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Check connectivity / mock request timeout to prevent hanging
            const response = await Promise.race([
                apiClient.post('/auth/login', {
                    username: cleanUsername,
                    inviteCode: cleanInviteCode.toUpperCase()
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Network request timed out. Please check your internet connection.')), 8000))
            ]);

            await setAuthToken(response.data.token);
            onLoginSuccess(response.data.user);
        } catch (err) {
            triggerShake();
            const errMsg = err.response?.data?.error || err.message || 'Login failed. Please check your credentials.';
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = username.trim().length > 0 && inviteCode.trim().length > 0;

    const errorTranslateY = errorFadeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-8, 0]
    });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessibilityRole="none">
            <View style={[styles.outer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoid}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* HERO/BRAND SECTION */}
                        <Animated.View style={[
                            styles.header, 
                            { 
                                opacity: fadeLogo, 
                                transform: [{ translateY: fadeLogo.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] 
                            }
                        ]}>
                            <View style={styles.brandingMoment}>
                                <View style={styles.dynamicBackgroundCircle1} />
                                <View style={styles.dynamicBackgroundCircle2} />
                                <View style={styles.logoBadge}>
                                    <Feather name="activity" size={36} color="#FFFFFF" />
                                </View>
                            </View>
                            <Text style={styles.brandName}>SAIFIT</Text>
                            <Text style={styles.tagline}>PERSONAL COACHING & INSIGHTS</Text>
                        </Animated.View>

                        {/* FORM SECTION */}
                        <Animated.View style={[
                            styles.formCard, 
                            { 
                                opacity: fadeForm, 
                                transform: [
                                    { translateY: fadeForm.interpolate({ inputRange: [0, 1], outputRange: [25, 0] }) },
                                    { translateX: shakeAnim }
                                ] 
                            }
                        ]}>
                            {/* Animated Error Box */}
                            {error ? (
                                <Animated.View style={[
                                    styles.errorBox, 
                                    { 
                                        opacity: errorFadeAnim,
                                        transform: [{ translateY: errorTranslateY }]
                                    }
                                ]}>
                                    <Feather name="alert-circle" size={18} color={theme.colors.danger} />
                                    <Text style={styles.errorText} numberOfLines={3}>{error}</Text>
                                </Animated.View>
                            ) : null}

                            <AnimatedTextField
                                label="Username"
                                placeholder="Enter your username"
                                value={username}
                                onChangeText={(val) => {
                                    setUsername(val);
                                    if (error) setError('');
                                }}
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="next"
                                onSubmitEditing={() => inviteCodeInputRef.current?.focus()}
                                icon={<Feather name="user" size={18} />}
                                accessibilityLabel="Enter your username"
                            />

                            <AnimatedTextField
                                ref={inviteCodeInputRef}
                                label="Invite Code"
                                placeholder="e.g. FIT482"
                                value={inviteCode}
                                onChangeText={(val) => {
                                    setInviteCode(val);
                                    if (error) setError('');
                                }}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                returnKeyType="done"
                                onSubmitEditing={isFormValid ? handleLogin : null}
                                icon={<Feather name="key" size={18} />}
                                accessibilityLabel="Enter your invite code"
                            />
                        </Animated.View>

                        {/* BUTTON & FOOTER SECTION */}
                        <Animated.View style={[
                            styles.bottomSection, 
                            { 
                                opacity: fadeButton, 
                                transform: [{ translateY: fadeButton.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] 
                            }
                        ]}>
                            <TouchableWithoutFeedback
                                onPress={handleLogin}
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                disabled={!isFormValid || loading}
                                accessibilityLabel="Tap to log in to SaiFit"
                                accessibilityRole="button"
                                accessibilityState={{ disabled: !isFormValid || loading }}
                            >
                                <Animated.View style={[
                                    styles.loginButton,
                                    !isFormValid && styles.loginButtonDisabled,
                                    {
                                        transform: [
                                            { scale: buttonScale },
                                            { scale: buttonPulse }
                                        ]
                                    }
                                ]}>
                                    {loading ? (
                                        <View style={styles.btnLoadingRow}>
                                            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                                            <Text style={styles.loginButtonText}>CONNECTING...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.loginButtonText}>ENTER SAIFIT</Text>
                                    )}
                                </Animated.View>
                            </TouchableWithoutFeedback>

                            <Text style={styles.footerText}>ACCESS BY INVITE ONLY</Text>
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
}

const stylesFactory = (theme) => StyleSheet.create({
    outer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.xxl,
        paddingBottom: 20,
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
    },
    brandingMoment: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    logoBadge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
        zIndex: 2,
    },
    dynamicBackgroundCircle1: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 45, 85, 0.1)',
        top: 0,
        left: 0,
    },
    dynamicBackgroundCircle2: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 45, 85, 0.15)',
        bottom: 0,
        right: 0,
    },
    brandName: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: 6,
        color: theme.colors.textPrimary,
        marginBottom: 6,
        textAlign: 'center',
    },
    tagline: {
        ...theme.typography.label,
        fontSize: 10,
        letterSpacing: 2.5,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    formCard: {
        width: '100%',
        marginVertical: 30,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.xxl,
        padding: theme.spacing.xxl,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
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
        marginLeft: 10,
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '700',
    },
    bottomSection: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 10,
    },
    loginButton: {
        width: '100%',
        height: 54,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radii.lg,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 4,
        marginBottom: 20,
    },
    loginButtonDisabled: {
        backgroundColor: theme.colors.borderStrong || '#E5E6E8',
        shadowOpacity: 0,
        elevation: 0,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    btnLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerText: {
        ...theme.typography.labelSmall,
        letterSpacing: 1.5,
        color: theme.colors.textSecondary,
    }
});
