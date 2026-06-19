import React from 'react';
import { View, Text, StyleSheet, Modal as RNModal, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function ModalView({
  visible,
  title,
  onClose,
  children,
  presentationStyle = 'pageSheet',
  animationType = 'slide',
}) {
  const { theme } = useTheme();
  const styles = stylesFactory(theme);

  return (
    <RNModal
      visible={visible}
      animationType={animationType}
      presentationStyle={presentationStyle}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Modal Header */}
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {onClose && (
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeBtn} 
              activeOpacity={0.7}
              accessibilityLabel="Close modal"
              accessibilityRole="button"
            >
              <Feather name="x" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Modal Body */}
        <View style={styles.body}>
          {children}
        </View>
      </View>
    </RNModal>
  );
}

const stylesFactory = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
});
