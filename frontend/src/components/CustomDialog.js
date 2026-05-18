import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

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
        return <Feather name="check-circle" size={32} color="#4CAF50" />;
      case 'error':
        return <Feather name="x-circle" size={32} color="#FF5252" />;
      case 'warning':
        return <Feather name="alert-triangle" size={32} color="#FFB300" />;
      case 'confirm':
        return <Feather name="help-circle" size={32} color="#2196F3" />;
      case 'info':
      default:
        return <Feather name="info" size={32} color="#E91E63" />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'success': return '#E8F5E9';
      case 'error': return '#FFEBEE';
      case 'warning': return '#FFF8E1';
      case 'confirm': return '#E3F2FD';
      case 'info':
      default: return '#FFF0F5';
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
                type === 'error' && { backgroundColor: '#FF5252' },
                type === 'warning' && { backgroundColor: '#FFB300' }
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  dialogCard: {
    backgroundColor: '#FFF',
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
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
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
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
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  cancelBtn: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
  },
  confirmHalfBtn: {
    backgroundColor: '#1A1A1A',
  },
  confirmFullBtn: {
    backgroundColor: '#E91E63',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
});
