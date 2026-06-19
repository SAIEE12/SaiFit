const db = require('../config/db');
const notificationService = require('../services/notificationService');

// Get list of active notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await notificationService.getNotificationsForUser(userId);
    
    // Calculate unread count
    const unreadRes = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0 AND is_archived = 0',
      [userId]
    );
    const unreadCount = parseInt(unreadRes.rows[0].count) || 0;

    res.json({
      notifications,
      unread_count: unreadCount,
      total: notifications.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get lightweight unread count for badge
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadRes = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0 AND is_archived = 0',
      [userId]
    );
    const unreadCount = parseInt(unreadRes.rows[0].count) || 0;
    res.json({ unread_count: unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await db.query(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = 0 AND is_archived = 0',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle notification pinned status
exports.togglePin = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get current status
    const currentRes = await db.query(
      'SELECT is_pinned FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const nextPinState = currentRes.rows[0].is_pinned ? 0 : 1;

    await db.query(
      'UPDATE notifications SET is_pinned = $1 WHERE id = $2 AND user_id = $3',
      [nextPinState, id, userId]
    );

    res.json({ message: nextPinState ? 'Notification pinned' : 'Notification unpinned', is_pinned: !!nextPinState });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete (archive) single notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await db.query(
      'UPDATE notifications SET is_archived = 1 WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Clear (archive) all notifications
exports.clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(
      'UPDATE notifications SET is_archived = 1 WHERE user_id = $1 AND is_archived = 0',
      [userId]
    );

    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get notification preferences
exports.getPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await notificationService.getOrCreatePreferences(userId);
    
    // Parse categories from JSON string
    let mutedCategories = [];
    try {
      mutedCategories = JSON.parse(preferences.muted_categories || '[]');
    } catch (_) {}

    res.json({
      ...preferences,
      muted_categories: mutedCategories
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update notification preferences
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { muted_categories, coach_tone, quiet_hours_start, quiet_hours_end } = req.body;

    const currentPrefs = await notificationService.getOrCreatePreferences(userId);

    const updatedMuted = muted_categories !== undefined 
      ? JSON.stringify(muted_categories) 
      : currentPrefs.muted_categories;
      
    const updatedTone = coach_tone !== undefined 
      ? coach_tone 
      : currentPrefs.coach_tone;
      
    const updatedQuietStart = quiet_hours_start !== undefined 
      ? quiet_hours_start 
      : currentPrefs.quiet_hours_start;
      
    const updatedQuietEnd = quiet_hours_end !== undefined 
      ? quiet_hours_end 
      : currentPrefs.quiet_hours_end;

    await db.query(
      `UPDATE notification_preferences 
       SET muted_categories = $1, coach_tone = $2, quiet_hours_start = $3, quiet_hours_end = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $5`,
      [updatedMuted, updatedTone, updatedQuietStart, updatedQuietEnd, userId]
    );

    res.json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Real-time notification SSE stream
exports.setupNotificationStream = (req, res) => {
  const userId = req.user.id;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

  // Register client
  notificationService.registerClient(userId, res);

  // Keep connection alive with simple heartbeat every 15s
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (_) {}
  }, 15000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    notificationService.unregisterClient(userId, res);
    console.log(`SSE connection closed for user ${userId}`);
  });
};
