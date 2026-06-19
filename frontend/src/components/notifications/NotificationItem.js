import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const cleaned = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    const date = new Date(cleaned);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  } catch (_) {
    return 'Just now';
  }
};

const renderNotificationIcon = (notif) => {
  const iconType = notif.icon_type || notif.iconType;
  const icon = notif.icon || 'bell';
  const color = notif.color || theme.colors.primary;
  if (iconType === 'ionicons') {
    return <Ionicons name={icon} size={18} color={color} />;
  } else if (iconType === 'material') {
    return <MaterialCommunityIcons name={icon} size={18} color={color} />;
  } else {
    return <Feather name={icon} size={18} color={color} />;
  }
};

export default function NotificationItem({
  item,
  onPress,
  onLongPress,
  mutedCategories = [],
  adjustHydration,
  navigation,
  onCloseModal
}) {
  const itemBgColor = item.bgColor || (item.color ? item.color + '20' : theme.colors.primaryLight);
  const isItemMuted = mutedCategories.includes(item.category);
  
  let actionPayload = {};
  try {
    if (item.action_payload) {
      actionPayload = typeof item.action_payload === 'string' 
        ? JSON.parse(item.action_payload) 
        : item.action_payload;
    }
  } catch (_) {}

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(item.id)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={400}
      style={[
        styles.notificationCard,
        !item.isRead && styles.notificationCardUnread,
        item.isPinned && styles.notificationCardPinned
      ]}
    >
      <View style={[styles.notificationIconWrap, { backgroundColor: itemBgColor }]}>
        {renderNotificationIcon(item)}
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeaderRow}>
          <View style={styles.categoryBadgeRow}>
            {item.isPinned && <MaterialCommunityIcons name="pin" size={10} color={theme.colors.warning} style={{ marginRight: 4 }} />}
            {isItemMuted && <Feather name="bell-off" size={10} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />}
            <Text style={[styles.notificationCategory, { color: item.color || theme.colors.primary }]}>{item.category}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {!item.isRead && <View style={styles.unreadIndicatorDot} />}
            <Text style={styles.notificationTime}>{formatRelativeTime(item.created_at)}</Text>
          </View>
        </View>

        <Text style={[styles.notificationTextTitle, !item.isRead && styles.notificationTextTitleUnread]}>
          {item.title || 'Notification'}
        </Text>
        <Text style={styles.notificationDesc}>{item.body || item.desc || ''}</Text>

        {/* Quick Actions */}
        {!item.isRead && item.action_type === 'hydrate' && (
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => {
              const amount = actionPayload.amount || 250;
              adjustHydration(amount);
              onPress(item.id);
            }}
          >
            <MaterialCommunityIcons name="water-plus" size={14} color={theme.colors.info} style={{ marginRight: 4 }} />
            <Text style={[styles.quickActionText, { color: theme.colors.info }]}>
              + {actionPayload.amount || 250}ml
            </Text>
          </TouchableOpacity>
        )}

        {!item.isRead && item.action_type === 'navigate' && (
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: theme.colors.border }]}
            onPress={() => {
              const screen = actionPayload.screen || 'Workouts';
              onPress(item.id);
              onCloseModal();
              navigation.navigate(screen);
            }}
          >
            <Feather name="play" size={12} color={theme.colors.textPrimary} style={{ marginRight: 4 }} />
            <Text style={[styles.quickActionText, { color: theme.colors.textPrimary }]}>
              {item.category === 'AI COACH ALERT' ? 'Start Workout' : 'View Details'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  notificationCard: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  notificationCardUnread: {
    backgroundColor: 'rgba(255, 45, 85, 0.02)',
  },
  notificationCardPinned: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  notificationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationCategory: {
    ...theme.typography.labelSmall,
    fontSize: 9,
    fontWeight: '900',
  },
  unreadIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  notificationTime: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  notificationTextTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  notificationTextTitleUnread: {
    fontWeight: '900',
  },
  notificationDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: theme.spacing.sm,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.infoLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  quickActionText: {
    ...theme.typography.captionStrong,
    fontSize: 11,
  },
});
