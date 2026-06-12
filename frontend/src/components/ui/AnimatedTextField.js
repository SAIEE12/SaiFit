import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet, Animated } from 'react-native';
import { theme } from '../../theme';

const AnimatedTextField = forwardRef(({
  label,
  error,
  icon,
  containerStyle,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  
  // Expose focus to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  // Animated value for border color transition
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e) => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    if (onBlur) onBlur(e);
  };

  // Interpolate colors and shadows
  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.borderStrong || '#E5E6E8', theme.colors.primary],
  });

  const shadowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.03, 0.08],
  });

  const shadowRadius = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 16],
  });

  const backgroundColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F9FAFB', '#FFFFFF'], // subtle tint to clean white
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, isFocused && { color: theme.colors.primary }]}>
          {label.toUpperCase()}
        </Text>
      )}
      
      <Animated.View style={[
        styles.inputWrapper,
        {
          borderColor,
          backgroundColor,
          shadowOpacity,
          shadowRadius,
        },
        error ? styles.inputWrapperError : null,
        props.editable === false ? styles.inputWrapperDisabled : null
      ]}>
        {icon && (
          <View style={styles.iconWrap}>
            {React.cloneElement(icon, {
              color: error ? theme.colors.danger : (isFocused ? theme.colors.primary : theme.colors.textSecondary)
            })}
          </View>
        )}
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholderTextColor={theme.colors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </Animated.View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    marginLeft: 4,
    fontWeight: '800',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radii.lg,
    borderWidth: 1.5,
    paddingHorizontal: theme.spacing.lg,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: theme.colors.danger,
    backgroundColor: '#FFF5F5',
  },
  inputWrapperDisabled: {
    backgroundColor: theme.colors.border,
    borderColor: theme.colors.border,
  },
  iconWrap: {
    marginRight: theme.spacing.md,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    height: '100%',
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
    marginLeft: 4,
    fontWeight: '700',
  },
});

export default AnimatedTextField;
