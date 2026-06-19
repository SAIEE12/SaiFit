import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';
import EmptyState from '../ui/EmptyState';
import NotificationItem from './NotificationItem';
import ToneSelector from './ToneSelector';
import UndoSnackbar from './UndoSnackbar';

export default function NotificationModal({
  visible,
  onClose,
  notifications = [],
  mutedCategories = [],
  coachTone,
  onToneChange,
  onMarkAllRead,
  onClearAll,
  onMarkRead,
  onLongPressNotification,
  adjustHydration,
  navigation,
  showUndo,
  undoAction
}) {
  const hasUnread = notifications.some(n => !n.isRead);

  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Notifications</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeHeaderBtn}>
            <Feather name="chevron-down" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Modal Body */}
        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          {/* Notifications Toolbar */}
          <View style={styles.notificationToolsBar}>
            <Text style={styles.notificationCountText}>
              {notifications.filter(n => !n.isRead).length} unread
            </Text>
            <View style={styles.toolsActions}>
              {hasUnread && (
                <TouchableOpacity onPress={onMarkAllRead} style={styles.toolActionBtn}>
                  <Feather name="check-square" size={13} color={theme.colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.toolActionText}>Mark Read</Text>
                </TouchableOpacity>
              )}
              {notifications.length > 0 && (
                <>
                  {hasUnread && <View style={styles.toolSeparator} />}
                  <TouchableOpacity onPress={onClearAll} style={styles.toolActionBtn}>
                    <Feather name="trash-2" size={13} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.toolActionText, { color: theme.colors.textSecondary }]}>Clear All</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Empathy Tone Selector */}
          <ToneSelector activeTone={coachTone} onToneChange={onToneChange} />

          {/* Notification List Stream */}
          {sortedNotifications.map((item) => (
            <NotificationItem
              key={item.id}
              item={item}
              onPress={onMarkRead}
              onLongPress={onLongPressNotification}
              mutedCategories={mutedCategories}
              adjustHydration={adjustHydration}
              navigation={navigation}
              onCloseModal={onClose}
            />
          ))}

          {notifications.length === 0 && (
            <EmptyState
              icon="bell"
              title="All Clean!"
              description="Your custom coach feed is fully up to date."
            />
          )}

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Undo Float Snackbar */}
        <UndoSnackbar visible={showUndo} onUndo={undoAction} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  closeHeaderBtn: {
    padding: 6,
  },
  modalBody: {
    flex: 1,
  },
  notificationToolsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  notificationCountText: {
    ...theme.typography.captionStrong,
    color: theme.colors.textSecondary,
  },
  toolsActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  toolActionText: {
    ...theme.typography.captionStrong,
    color: theme.colors.primary,
  },
  toolSeparator: {
    width: 1,
    height: 12,
    backgroundColor: theme.colors.border,
    marginHorizontal: 4,
  },
});
