const db = require('../config/db');

// SSE clients lookup
const clients = new Map(); // userId -> Array of response objects

/**
 * Register an SSE client connection
 */
const registerClient = (userId, res) => {
  if (!clients.has(userId)) {
    clients.set(userId, []);
  }
  clients.get(userId).push(res);
};

/**
 * Remove an SSE client connection
 */
const unregisterClient = (userId, res) => {
  if (!clients.has(userId)) return;
  const userClients = clients.get(userId);
  const index = userClients.indexOf(res);
  if (index !== -1) {
    userClients.splice(index, 1);
  }
  if (userClients.length === 0) {
    clients.delete(userId);
  }
};

/**
 * Send real-time notification to active SSE connections
 */
const sendToClient = (userId, data) => {
  const userClients = clients.get(userId);
  if (userClients && userClients.length > 0) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    userClients.forEach(res => {
      try {
        res.write(payload);
      } catch (e) {
        console.error('Failed to write to SSE stream:', e);
      }
    });
  }
};

/**
 * Get or create notification preferences for a user
 */
const getOrCreatePreferences = async (userId) => {
  try {
    const res = await db.query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
    if (res.rows.length > 0) {
      return res.rows[0];
    }
    
    // Create default preferences
    await db.query(
      'INSERT INTO notification_preferences (user_id, muted_categories, coach_tone) VALUES ($1, $2, $3)',
      [userId, JSON.stringify([]), 'Supportive']
    );
    
    const newPref = await db.query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
    return newPref.rows[0];
  } catch (e) {
    console.error('Failed to get/create notification preferences:', e);
    return { muted_categories: '[]', coach_tone: 'Supportive' };
  }
};

/**
 * Create a new notification for a user
 * 
 * @param {number} userId - The user ID
 * @param {object} params - Notification parameters
 * @param {string} params.category - 'AI COACH ALERT' | 'HYDRATION TARGET' | 'NUTRITION TARGET' | 'STREAK MILESTONE' | 'SYSTEM'
 * @param {string} params.title - Default title
 * @param {string} params.body - Default body / description
 * @param {object} [params.templates] - Optional tone templates: { Supportive: { title, body }, Direct: { title, body }, Challenger: { title, body } }
 * @param {string} [params.icon] - Icon name
 * @param {string} [params.icon_type] - 'feather' | 'material' | 'ionicons'
 * @param {string} [params.color] - Color (hex or color name)
 * @param {string} [params.priority] - 'low' | 'normal' | 'high' | 'urgent'
 * @param {string} [params.action_type] - 'navigate' | 'hydrate' | 'log_meal' | etc.
 * @param {object|string} [params.action_payload] - Object or JSON string
 * @param {number} [params.expiresInDays] - Expire duration, defaults to 30 days
 */
const createNotification = async (userId, params) => {
  try {
    const {
      category,
      title: defaultTitle,
      body: defaultBody,
      templates,
      icon = 'bell',
      icon_type = 'feather',
      color,
      priority = 'normal',
      action_type = null,
      action_payload = null,
      expiresInDays = 30
    } = params;

    // Get preferences to check if category is muted
    const prefs = await getOrCreatePreferences(userId);
    let mutedCategories = [];
    try {
      mutedCategories = JSON.parse(prefs.muted_categories || '[]');
    } catch (_) {}

    if (mutedCategories.includes(category)) {
      console.log(`Notification creation skipped: Category ${category} is muted for user ${userId}`);
      return null;
    }

    // Determine quiet hours check
    if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
      const now = new Date();
      const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const inQuietHours = prefs.quiet_hours_start <= prefs.quiet_hours_end
        ? (currentHourMin >= prefs.quiet_hours_start && currentHourMin <= prefs.quiet_hours_end)
        : (currentHourMin >= prefs.quiet_hours_start || currentHourMin <= prefs.quiet_hours_end);

      if (inQuietHours && priority !== 'urgent') {
        console.log(`Notification creation deferred/skipped: Quiet hours active for user ${userId}`);
        // For enterprise, we might queue it, but here we just drop low/normal priority or store silently
        if (priority === 'low') return null; 
      }
    }

    // Choose title and body based on coach tone
    let title = defaultTitle;
    let body = defaultBody;
    
    if (templates && templates[prefs.coach_tone]) {
      title = templates[prefs.coach_tone].title || title;
      body = templates[prefs.coach_tone].body || body;
    }

    // Serialize payload if object
    const payloadStr = action_payload && typeof action_payload === 'object'
      ? JSON.stringify(action_payload)
      : action_payload;

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    const expiresAtStr = expiresAt.toISOString().replace('T', ' ').substring(0, 19);

    // Save notification
    const res = await db.query(
      `INSERT INTO notifications (
        user_id, category, title, body, icon, icon_type, color, priority, action_type, action_payload, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [userId, category, title, body, icon, icon_type, color, priority, action_type, payloadStr, expiresAtStr]
    );

    const notification = res.rows[0];

    // Push real-time event to SSE clients
    sendToClient(userId, {
      type: 'new_notification',
      notification: {
        ...notification,
        is_read: !!notification.is_read,
        is_pinned: !!notification.is_pinned,
        is_archived: !!notification.is_archived
      }
    });

    return notification;
  } catch (e) {
    console.error('Failed to create notification:', e);
    return null;
  }
};

/**
 * Get active notifications for a user (automatically excludes expired/archived)
 */
const getNotificationsForUser = async (userId) => {
  try {
    // Auto-clean expired notifications first
    await db.query(
      'UPDATE notifications SET is_archived = 1 WHERE user_id = $1 AND expires_at < CURRENT_TIMESTAMP AND is_archived = 0',
      [userId]
    );

    const res = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 AND is_archived = 0 
       ORDER BY is_pinned DESC, created_at DESC`,
      [userId]
    );

    return res.rows.map(row => ({
      ...row,
      is_read: !!row.is_read,
      is_pinned: !!row.is_pinned,
      is_archived: !!row.is_archived
    }));
  } catch (e) {
    console.error('Failed to get notifications:', e);
    return [];
  }
};

module.exports = {
  createNotification,
  getNotificationsForUser,
  getOrCreatePreferences,
  registerClient,
  unregisterClient,
  sendToClient
};
