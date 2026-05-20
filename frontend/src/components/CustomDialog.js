import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

export default function CustomDialog({ 
  visible, 
  title, 
  description, 
  type = 'info', 
  confirmText = 'OK', 
  cancelText = 'Cancel', 
  onConfirm, 
  onCancel 
}) {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Feather name="check-circle" size={32} color={theme.colors.green} />;
      case 'error':
        return <Feather name="x-circle" size={32} color="#FF3B30" />;
      case 'warning':
        return <Feather name="alert-triangle" size={32} color={theme.colors.orange} />;
      case 'confirm':
        return <Feather name="help-circle" size={32} color={theme.colors.secondary} />;
      case 'info':
      default:
        return <Feather name="info" size={32} color={theme.colors.primary} />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'success': return theme.colors.accentGreenLight;
      case 'error': return '#FFEBEE';
      case 'warning': return '#FFF8E1';
      case 'confirm': return theme.colors.accentBlueLight;
      case 'info':
      default: return theme.colors.accentPinkLight;
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          {/* Icon Header wrapper */}
          <View style={[styles.iconWrap, { backgroundColor: getHeaderBg() }]}>
            {getIcon()}
          </View>

          {/* Title & Desc */}
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}

          {/* Buttons row */}
          <View style={styles.btnRow}>
            {onCancel ? (
              <TouchableOpacity 
                style={[styles.btn, styles.cancelBtn]} 
                onPress={onCancel}
              >
                <Text style={styles.cancelBtnText}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}
            
            <TouchableOpacity 
              style={[
                styles.btn, 
                onCancel ? styles.confirmHalfBtn : styles.confirmFullBtn,
                type === 'error' && { backgroundColor: '#FF3B30' },
                type === 'warning' && { backgroundColor: theme.colors.orange }
              ]} 
              onPress={onConfirm}
            >
              <Text style={styles.confirmBtnText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.darkSheetOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  dialogCard: {
    backgroundColor: theme.colors.card,
    width: '100%',
    maxWidth: 320,
    borderRadius: theme.borderRadius.xxl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  btn: {
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  cancelBtn: {
    backgroundColor: theme.colors.border,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  confirmHalfBtn: {
    backgroundColor: theme.colors.darkBase,
  },
  confirmFullBtn: {
    backgroundColor: theme.colors.primary,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
});
