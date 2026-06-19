import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { theme } from '../theme';
import ScreenContainer from '../components/ui/ScreenContainer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import CustomDialog from '../components/CustomDialog';

const DIETARY_OPTIONS = [
    { label: 'No restrictions', value: 'no_restrictions' },
    { label: 'Vegetarian', value: 'vegetarian' },
    { label: 'Vegan', value: 'vegan' },
    { label: 'Sattvic', value: 'sattvic' },
    { label: 'Early dinner / time-restricted eating', value: 'eat_before_sunset' },
    { label: 'Intermittent fasting', value: 'intermittent_fasting' },
    { label: 'Other', value: 'other' }
];

export default function ChoosePathScreen({ onComplete, isEdit = false, navigation }) {
    const [tracks, setTracks] = useState([]);
    const [selectedTrackIds, setSelectedTrackIds] = useState([]);
    const [primaryTrackId, setPrimaryTrackId] = useState(null);
    const [dietaryPhilosophy, setDietaryPhilosophy] = useState('no_restrictions');
    const [dietaryNotes, setDietaryNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0); // 0: Training focus, 1: Dietary, 2: Celebration

    // Animation values
    const fadeAnim = useRef(new Animated.Value(1)).current;
    
    // Dialog state
    const [dialog, setDialog] = useState({
        visible: false,
        title: '',
        description: '',
        type: 'info',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [tracksRes, myTracksRes, profileRes] = await Promise.all([
                apiClient.get('/lifestyle/tracks'),
                apiClient.get('/lifestyle/my-tracks'),
                apiClient.get('/profile')
            ]);
            
            setTracks(tracksRes.data);
            
            // Map user selected tracks
            if (myTracksRes.data && myTracksRes.data.length > 0) {
                const ids = myTracksRes.data.map(t => t.id);
                setSelectedTrackIds(ids);
                const primary = myTracksRes.data.find(t => t.is_primary === 1);
                if (primary) {
                    setPrimaryTrackId(primary.id);
                } else {
                    setPrimaryTrackId(ids[0]);
                }
            }

            // Map user dietary profile
            if (profileRes.data && profileRes.data.profile) {
                const dp = profileRes.data.profile.dietary_philosophy || 'no_restrictions';
                setDietaryPhilosophy(dp);
                setDietaryNotes(profileRes.data.profile.dietary_notes || '');
            }
        } catch (e) {
            console.error('Error loading path details:', e);
        } finally {
            setLoading(false);
        }
    };

    const animateTransition = (nextStep) => {
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true
            }),
            Animated.delay(50),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true
            })
        ]).start();
        setStep(nextStep);
    };

    const toggleTrackSelection = (trackId) => {
        let updatedIds = [...selectedTrackIds];
        if (updatedIds.includes(trackId)) {
            updatedIds = updatedIds.filter(id => id !== trackId);
            if (primaryTrackId === trackId) {
                setPrimaryTrackId(updatedIds[0] || null);
            }
        } else {
            updatedIds.push(trackId);
            if (!primaryTrackId) {
                setPrimaryTrackId(trackId);
            }
        }
        setSelectedTrackIds(updatedIds);
    };

    const handleNext = () => {
        if (selectedTrackIds.length === 0) {
            setDialog({
                visible: true,
                title: 'Selection Required',
                description: 'Please select at least one lifestyle track path to personalize your experience.',
                type: 'warning'
            });
            return;
        }
        animateTransition(1);
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            // 1. Save tracks
            await apiClient.put('/lifestyle/my-tracks', {
                tracks: selectedTrackIds,
                primaryTrackId: primaryTrackId
            });

            // 2. Fetch current profile details to prevent erasing other fields
            const profileRes = await apiClient.get('/profile');
            const currentProfile = profileRes.data.profile || {};

            // 3. Save dietary details
            await apiClient.put('/profile', {
                ...currentProfile,
                dietary_philosophy: dietaryPhilosophy,
                dietary_notes: dietaryNotes
            });

            if (!isEdit) {
                animateTransition(2);
            } else {
                setDialog({
                    visible: true,
                    title: 'Path Saved! ✨',
                    description: 'Your training preferences and dietary philosophies have been updated.',
                    type: 'success'
                });
                setTimeout(() => {
                    setDialog(prev => ({ ...prev, visible: false }));
                    if (onComplete) onComplete();
                    else if (navigation) navigation.goBack();
                }, 1500);
            }

        } catch (e) {
            setDialog({
                visible: true,
                title: 'Save Failed',
                description: 'Could not update your path configuration. Please try again.',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const getIconInfo = (key) => {
        switch (key) {
            case 'gym': return { family: 'FontAwesome5', name: 'dumbbell' };
            case 'home_workout': return { family: 'Feather', name: 'home' };
            case 'yoga_meditation': return { family: 'Feather', name: 'sun' };
            case 'dance': return { family: 'Feather', name: 'music' };
            default: return { family: 'Feather', name: 'activity' };
        }
    };

    const renderStepIndicator = () => {
        if (step === 2) return null;
        return (
            <View style={styles.indicatorContainer}>
                <View style={styles.stepIndicator}>
                    <View style={[styles.indicatorDot, step >= 0 && styles.indicatorDotActive]} />
                    <Text style={[styles.indicatorLabel, step === 0 && styles.indicatorLabelActive]}>Training</Text>
                </View>
                <View style={[styles.indicatorLine, step >= 1 && styles.indicatorLineActive]} />
                <View style={styles.stepIndicator}>
                    <View style={[styles.indicatorDot, step >= 1 && styles.indicatorDotActive]} />
                    <Text style={[styles.indicatorLabel, step === 1 && styles.indicatorLabelActive]}>Nutrition</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.safeHeader}>
                <View style={styles.headerRow}>
                    {(isEdit || step > 0) && (
                        <TouchableOpacity 
                            style={styles.backBtn} 
                            onPress={() => {
                                if (step > 0) {
                                    animateTransition(step - 1);
                                } else {
                                    navigation.goBack();
                                }
                            }}
                            accessibilityLabel="Go back to previous screen or step"
                            accessibilityRole="button"
                        >
                            <Feather name="chevron-left" size={24} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.headerTitle}>
                        {step === 2 ? 'All Set! 🎉' : isEdit ? 'Update Your Path' : 'Choose Your Path'}
                    </Text>
                </View>
                {renderStepIndicator()}
            </SafeAreaView>

            <ScreenContainer scrollable={true} keyboardAvoiding={false} edges={['bottom']}>
                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    {step === 0 && (
                        <View>
                            <Text style={styles.subtitle}>
                                Select one or more training paths to align the AI coaching engines.
                            </Text>

                            <Text style={styles.sectionTitle}>1. Choose Training Focus</Text>
                            <View style={styles.tracksGrid}>
                                {tracks.map((track) => {
                                    const isSelected = selectedTrackIds.includes(track.id);
                                    const isPrimary = primaryTrackId === track.id;
                                    const iconInfo = getIconInfo(track.key);

                                    return (
                                        <TouchableOpacity
                                            key={track.id}
                                            activeOpacity={0.8}
                                            onPress={() => toggleTrackSelection(track.id)}
                                            style={[
                                                styles.trackCardWrap,
                                                isSelected && styles.trackCardSelected,
                                                isPrimary && styles.trackCardPrimary
                                            ]}
                                        >
                                            <Card style={styles.trackCardInner}>
                                                <View style={styles.cardHeaderRow}>
                                                    <View style={[
                                                        styles.iconWrap, 
                                                        isSelected ? styles.iconWrapSelected : styles.iconWrapUnselected
                                                    ]}>
                                                        {iconInfo.family === 'FontAwesome5' ? (
                                                            <FontAwesome5 
                                                                name={iconInfo.name} 
                                                                size={18} 
                                                                color={isSelected ? theme.colors.primary : theme.colors.textSecondary} 
                                                            />
                                                        ) : (
                                                            <Feather 
                                                                name={iconInfo.name} 
                                                                size={20} 
                                                                color={isSelected ? theme.colors.primary : theme.colors.textSecondary} 
                                                            />
                                                        )}
                                                    </View>
                                                    
                                                    {isSelected && (
                                                        <TouchableOpacity 
                                                            style={styles.primaryToggle}
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                setPrimaryTrackId(track.id);
                                                            }}
                                                            accessibilityLabel={`Set ${track.display_name} as primary focus`}
                                                            accessibilityRole="button"
                                                        >
                                                            <Feather 
                                                                name="star" 
                                                                size={18} 
                                                                color={isPrimary ? '#FFD700' : theme.colors.textTertiary} 
                                                                style={isPrimary && { fill: '#FFD700' }}
                                                            />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>

                                                <Text style={styles.trackName}>{track.display_name}</Text>
                                                <Text style={styles.trackDesc}>{track.description}</Text>
                                                
                                                {isPrimary && (
                                                    <View style={styles.primaryBadge}>
                                                        <Text style={styles.primaryBadgeText}>Primary Focus</Text>
                                                    </View>
                                                )}
                                            </Card>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Button 
                                variant="primary" 
                                size="lg" 
                                onPress={handleNext} 
                                style={styles.saveBtn}
                                icon={<Feather name="arrow-right" size={16} color="#FFF" />}
                            >
                                Next Step
                            </Button>
                        </View>
                    )}

                    {step === 1 && (
                        <View>
                            <Text style={styles.subtitle}>
                                Set your nutritional rules. This helps customize meal plans and recommendation engines.
                            </Text>

                            <Text style={styles.sectionTitle}>2. Dietary Philosophy</Text>
                            <View style={styles.chipsContainer}>
                                {DIETARY_OPTIONS.map((opt) => {
                                    const isSelected = dietaryPhilosophy === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.value}
                                            onPress={() => setDietaryPhilosophy(opt.value)}
                                            style={[
                                                styles.chip,
                                                isSelected && styles.chipSelected
                                            ]}
                                        >
                                            <Text style={[
                                                styles.chipText,
                                                isSelected && styles.chipTextSelected
                                            ]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {dietaryPhilosophy === 'other' && (
                                <View style={styles.notesContainer}>
                                    <Text style={styles.fieldLabel}>Explain dietary focus / restrictions</Text>
                                    <TextInput
                                        style={styles.notesInput}
                                        multiline
                                        numberOfLines={3}
                                        value={dietaryNotes}
                                        onChangeText={setDietaryNotes}
                                        placeholder="e.g. no onion/garlic, early dinner by 7 PM, keto balance..."
                                        placeholderTextColor={theme.colors.textTertiary}
                                    />
                                </View>
                            )}

                            <Button 
                                variant="primary" 
                                size="lg" 
                                onPress={handleSave} 
                                style={styles.saveBtn}
                            >
                                {isEdit ? 'Save Changes' : 'Confirm & Customize'}
                            </Button>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.celebrationContainer}>
                            <View style={styles.celebrationIconWrap}>
                                <Ionicons name="sparkles" size={56} color={theme.colors.primary} />
                            </View>

                            <Text style={styles.celebrationTitle}>You're All Set! 🚀</Text>
                            
                            <Text style={styles.celebrationSubtitle}>
                                Your personal AI Coach has configured your experience based on your selections:
                            </Text>

                            <Card style={styles.summaryCard}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Training Focus:</Text>
                                    <Text style={styles.summaryValue}>
                                        {tracks.filter(t => selectedTrackIds.includes(t.id)).map(t => t.display_name).join(', ') || 'None selected'}
                                    </Text>
                                </View>
                                <View style={styles.summaryDivider} />
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Dietary Philosophy:</Text>
                                    <Text style={styles.summaryValue}>
                                        {DIETARY_OPTIONS.find(o => o.value === dietaryPhilosophy)?.label || 'None'}
                                    </Text>
                                </View>
                            </Card>

                            <Text style={styles.celebrationFooterText}>
                                Let's get started on your fitness journey today.
                            </Text>

                            <Button 
                                variant="primary" 
                                size="lg" 
                                onPress={() => {
                                    if (onComplete) onComplete();
                                }} 
                                style={[styles.saveBtn, { width: '100%' }]}
                            >
                                Enter My Space
                            </Button>
                        </View>
                    )}
                </Animated.View>
            </ScreenContainer>

            {loading && (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            )}

            <CustomDialog
                visible={dialog.visible}
                title={dialog.title}
                description={dialog.description}
                type={dialog.type}
                confirmText="OK"
                onConfirm={() => setDialog(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    safeHeader: { backgroundColor: theme.colors.background },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xxl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xs,
    },
    backBtn: {
        marginRight: theme.spacing.sm,
        padding: theme.spacing.xs,
        marginLeft: -theme.spacing.xs,
    },
    headerTitle: {
        ...theme.typography.h2,
        color: theme.colors.textPrimary,
    },
    indicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xxl,
        paddingBottom: theme.spacing.md,
        paddingTop: theme.spacing.xs,
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    indicatorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.border,
    },
    indicatorDotActive: {
        backgroundColor: theme.colors.primary,
    },
    indicatorLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        fontSize: 11,
    },
    indicatorLabelActive: {
        color: theme.colors.textPrimary,
        fontWeight: 'bold',
    },
    indicatorLine: {
        flex: 1,
        height: 2,
        backgroundColor: theme.colors.border,
        marginHorizontal: 12,
    },
    indicatorLineActive: {
        backgroundColor: theme.colors.primary,
    },
    content: {
        paddingHorizontal: theme.spacing.xxl,
        paddingBottom: theme.spacing.huge,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        lineHeight: 20,
    },
    sectionTitle: {
        ...theme.typography.h3,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    tracksGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    trackCardWrap: {
        width: '48%',
        borderRadius: theme.radii.lg,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    trackCardSelected: {
        borderColor: theme.colors.primaryLight,
    },
    trackCardPrimary: {
        borderColor: theme.colors.primary,
    },
    trackCardInner: {
        padding: 14,
        flex: 1,
        minHeight: 150,
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconWrapSelected: {
        backgroundColor: theme.colors.primaryLight,
    },
    iconWrapUnselected: {
        backgroundColor: theme.colors.border,
    },
    primaryToggle: {
        padding: 4,
    },
    trackName: {
        ...theme.typography.h4,
        color: theme.colors.textPrimary,
        marginTop: 4,
    },
    trackDesc: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        marginTop: 4,
        lineHeight: 14,
    },
    primaryBadge: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 10,
    },
    primaryBadgeText: {
        ...theme.typography.captionStrong,
        color: '#FFF',
        fontSize: 10,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    chipSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primaryLight,
    },
    chipText: {
        ...theme.typography.captionStrong,
        color: theme.colors.textSecondary,
    },
    chipTextSelected: {
        color: theme.colors.primary,
    },
    notesContainer: {
        marginTop: theme.spacing.lg,
    },
    fieldLabel: {
        ...theme.typography.labelSmall,
        color: theme.colors.textPrimary,
        marginBottom: 6,
    },
    notesInput: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.radii.lg,
        padding: 12,
        fontSize: 13,
        color: theme.colors.textPrimary,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    saveBtn: {
        marginTop: theme.spacing.huge,
        borderRadius: theme.radii.lg,
    },
    loader: {
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
    celebrationContainer: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
    },
    celebrationIconWrap: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    celebrationTitle: {
        ...theme.typography.h1,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    celebrationSubtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
        lineHeight: 20,
    },
    summaryCard: {
        width: '100%',
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderColor: theme.colors.border,
        borderWidth: 1,
        backgroundColor: theme.colors.surface,
    },
    summaryRow: {
        flexDirection: 'column',
        gap: 4,
    },
    summaryLabel: {
        ...theme.typography.captionStrong,
        color: theme.colors.textSecondary,
    },
    summaryValue: {
        ...theme.typography.bodySmall,
        color: theme.colors.textPrimary,
        fontWeight: '700',
    },
    summaryDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.md,
    },
    celebrationFooterText: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.sm,
    },
});
