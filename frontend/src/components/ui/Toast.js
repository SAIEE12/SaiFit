import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';

const { width } = Dimensions.get('window');

/**
 * Toast — Reusable notification alert component for inline user feedback.
 * Props: visible, message, onDismiss, type ('success' | 'error' | 'info'), duration
 */
export default function Toast({
  visible,
  message,
  onDismiss,
  type = 'success',
  duration = 2500,
}) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss timer
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    // Exit
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 60,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Feather name="check-circle" size={16} color={theme.colors.success} />;
      case 'error':
        return <Feather name="alert-circle" size={16} color={theme.colors.danger} />;
      case 'info':
      default:
        return <Feather name="info" size={16} color={theme.colors.primary} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.danger;
      case 'info':
      default:
        return theme.colors.primary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          borderLeftColor: getBorderColor(),
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconWrap}>{getIcon()}</View>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90, // Positions it cleanly above the safe bottom tab bar
    left: theme.spacing.xxl,
    right: theme.spacing.xxl,
    backgroundColor: '#1C1C1E', // WCAG AA dark theme base
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderLeftWidth: 4,
    ...theme.shadows.premium,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    ...theme.typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '700',
    flex: 1,
  },
});
