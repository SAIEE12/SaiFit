import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

export default function ContextMenuSheet({
  visible,
  selectedNotification,
  mutedCategories = [],
  onClose,
  onToggleRead,
  onTogglePin,
  onToggleMute,
  onDelete
}) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.sheetOverlay}>
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandle} />

          {selectedNotification && (
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetCategory, { color: selectedNotification.color || theme.colors.primary }]}>
                {selectedNotification.category}
              </Text>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {selectedNotification.title}
              </Text>
            </View>
          )}

          {selectedNotification && (
            <View style={styles.sheetActionsList}>
              <TouchableOpacity
                style={styles.sheetActionRow}
                onPress={() => {
                  onToggleRead(selectedNotification.id);
                  onClose();
                }}
              >
                <View style={styles.actionIconWrap}>
                  <Feather
                    name={selectedNotification.isRead ? "mail" : "eye"}
                    size={18}
                    color={theme.colors.textPrimary}
                  />
                </View>
                <Text style={styles.actionRowText}>
                  {selectedNotification.isRead ? 'Mark as Unread' : 'Mark as Read'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetActionRow}
                onPress={() => {
                  onTogglePin(selectedNotification.id);
                  onClose();
                }}
              >
                <View style={styles.actionIconWrap}>
                  <MaterialCommunityIcons
                    name="pin"
                    size={18}
                    color={selectedNotification.isPinned ? theme.colors.primary : theme.colors.textPrimary}
                  />
                </View>
                <Text style={styles.actionRowText}>
                  {selectedNotification.isPinned ? 'Unpin from Top' : 'Pin to Top'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetActionRow}
                onPress={() => {
                  onToggleMute(selectedNotification);
                  onClose();
                }}
              >
                <View style={styles.actionIconWrap}>
                  <Feather
                    name={mutedCategories.includes(selectedNotification.category) ? "bell" : "bell-off"}
                    size={18}
                    color={theme.colors.textPrimary}
                  />
                </View>
                <Text style={styles.actionRowText}>
                  {mutedCategories.includes(selectedNotification.category) ? 'Unmute Category Alerts' : 'Mute Category Alerts'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetActionRow, styles.deleteActionRow]}
                onPress={() => {
                  onDelete(selectedNotification.id);
                  onClose();
                }}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: theme.colors.dangerLight }]}>
                  <Feather name="trash-2" size={18} color={theme.colors.danger} />
                </View>
                <Text style={[styles.actionRowText, { color: theme.colors.danger, fontWeight: '700' }]}>
                  Delete Notification
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radii.xxl,
    borderTopRightRadius: theme.radii.xxl,
    paddingBottom: 34,
    paddingHorizontal: theme.spacing.xl,
    ...theme.shadows.premium,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: theme.spacing.lg,
  },
  sheetHeader: {
    marginBottom: theme.spacing.lg,
  },
  sheetCategory: {
    ...theme.typography.labelSmall,
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 4,
  },
  sheetTitle: {
    ...theme.typography.h4,
    color: theme.colors.textPrimary,
  },
  sheetActionsList: {
    gap: 4,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.lg,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  actionRowText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  deleteActionRow: {
    marginTop: theme.spacing.sm,
  },
});
