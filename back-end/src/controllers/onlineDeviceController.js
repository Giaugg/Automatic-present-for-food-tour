const pool = require('../config/db');
const { extractServerDeviceInfo } = require('../services/deviceDetectionService');

/**
 * Online Device Controller
 * Theo dõi những thiết bị đang hoạt động trong hệ thống
 */

// Helper: Kiểm tra giới hạn trial account
const checkTrialLimits = async (userId, deviceId, ipAddress) => {
  try {
    // Lấy thông tin trial account
    const trialResult = await pool.query(
      `SELECT ta.max_devices, ta.max_sessions, ta.max_ips, ta.trial_status, ta.trial_end_at
       FROM trial_accounts ta
       JOIN users u ON ta.user_id = u.id
       WHERE u.id = $1 AND u.is_trial_user = TRUE`,
      [userId]
    );

    if (trialResult.rows.length === 0) {
      return { allowed: true }; // Không phải trial user
    }

    const trial = trialResult.rows[0];

    // Kiểm tra trial còn active không
    if (trial.trial_status !== 'active' || new Date() > new Date(trial.trial_end_at)) {
      return { allowed: false, reason: 'Trial account đã hết hạn' };
    }

    // Đếm số devices đang active (unique device_id)
    const deviceCount = await pool.query(
      `SELECT COUNT(DISTINCT device_id) as count
       FROM user_sessions
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    // Đếm số sessions đang active
    const sessionCount = await pool.query(
      `SELECT COUNT(*) as count
       FROM user_sessions
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    // Đếm số IPs đang active (unique ip_address)
    const ipCount = await pool.query(
      `SELECT COUNT(DISTINCT ip_address) as count
       FROM user_sessions
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    const currentDevices = deviceCount.rows[0].count;
    const currentSessions = sessionCount.rows[0].count;
    const currentIPs = ipCount.rows[0].count;

    // Kiểm tra giới hạn
    if (currentDevices >= trial.max_devices) {
      return {
        allowed: false,
        reason: `Đã đạt giới hạn thiết bị (${trial.max_devices}). Vui lòng logout thiết bị khác hoặc nâng cấp tài khoản.`
      };
    }

    if (currentSessions >= trial.max_sessions) {
      return {
        allowed: false,
        reason: `Đã đạt giới hạn phiên làm việc (${trial.max_sessions}). Vui lòng logout phiên khác.`
      };
    }

    if (currentIPs >= trial.max_ips) {
      return {
        allowed: false,
        reason: `Đã đạt giới hạn IP (${trial.max_ips}). Vui lòng thử lại sau.`
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error('[TRIAL_LIMIT_CHECK_ERROR]', err.message);
    return { allowed: false, reason: 'Lỗi kiểm tra giới hạn trial' };
  }
};

// Tạo session mới khi user login
const createSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      device_id,
      timezone,
      screen_resolution,
      platform
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }

    const serverDevice = extractServerDeviceInfo(req);

    // Kiểm tra giới hạn trial account
    const limitCheck = await checkTrialLimits(userId, device_id, serverDevice.ipAddress);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: 'Giới hạn trial account',
        reason: limitCheck.reason
      });
    }

    // Kiểm tra xem device đã có session chưa (cùng user, cùng device_id)
    const existingSession = await pool.query(
      `SELECT id FROM user_sessions 
       WHERE user_id = $1 AND device_id = $2 AND is_active = TRUE`,
      [userId, device_id]
    );

    const sessionId = existingSession.rows.length > 0
      ? existingSession.rows[0].id
      : null;

    if (sessionId) {
      // Update session hiện tại
      const result = await pool.query(
        `UPDATE user_sessions 
         SET last_activity_at = NOW(), 
             login_at = NOW(),
             timezone = $2,
             screen_resolution = $3
         WHERE id = $1
         RETURNING *`,
        [sessionId, timezone, screen_resolution]
      );

      return res.json({
        message: 'Cập nhật session thành công',
        sessionId,
        isNewSession: false,
        data: result.rows[0]
      });
    }

    // Tạo session mới
    const result = await pool.query(
      `INSERT INTO user_sessions (
        user_id, device_id, ip_address, device_type, browser, 
        operating_system, user_agent, timezone, screen_resolution, 
        is_active, last_activity_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW())
      RETURNING *`,
      [
        userId,
        device_id,
        serverDevice.ipAddress,
        serverDevice.deviceType,
        serverDevice.browser,
        serverDevice.operatingSystem,
        serverDevice.userAgent,
        timezone,
        screen_resolution
      ]
    );

    console.log('[SESSION_CREATED]', {
      userId,
      deviceId: device_id,
      sessionId: result.rows[0].id,
      ipAddress: serverDevice.ipAddress,
      browser: serverDevice.browser
    });

    return res.status(201).json({
      message: 'Tạo session mới thành công',
      sessionId: result.rows[0].id,
      isNewSession: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('[SESSION_CREATE_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể tạo session',
      details: err.message
    });
  }
};

// Update activity (heartbeat)
const updateActivity = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { session_id } = req.body;

    if (!userId || !session_id) {
      return res.status(400).json({
        error: 'userId và session_id là bắt buộc'
      });
    }

    const result = await pool.query(
      `UPDATE user_sessions 
       SET last_activity_at = NOW()
       WHERE id = $1 AND user_id = $2 AND is_active = TRUE
       RETURNING last_activity_at`,
      [session_id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Session không tồn tại hoặc đã hết hạn'
      });
    }

    return res.json({
      message: 'Cập nhật hoạt động thành công',
      lastActivityAt: result.rows[0].last_activity_at
    });
  } catch (err) {
    console.error('[ACTIVITY_UPDATE_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể cập nhật hoạt động',
      details: err.message
    });
  }
};

// Logout session
const endSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { session_id } = req.params;
    console.log('[END_SESSION_ATTEMPT]', { userId, session_id });

    if (!userId || !session_id) {
      console.log('[END_SESSION_ERROR] Missing userId or session_id', { userId, session_id });
      return res.status(400).json({
        error: 'userId và session_id là bắt buộc'
      });
    }

    const result = await pool.query(
      `UPDATE user_sessions 
       SET is_active = FALSE, 
           logout_at = NOW(),
           session_duration_minutes = EXTRACT(MINUTE FROM NOW() - login_at) + 
                                      EXTRACT(HOUR FROM NOW() - login_at) * 60
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [session_id, userId]
    );

    if (result.rows.length === 0) {
      console.log('[END_SESSION_ERROR] Session not found or user mismatch', { session_id, userId });
      return res.status(404).json({
        error: 'Session không tồn tại'
      });
    }

    console.log('[SESSION_ENDED]', {
      sessionId: session_id,
      userId,
      duration: result.rows[0].session_duration_minutes
    });

    return res.json({
      message: 'Logout thành công',
      data: {
        sessionId: session_id,
        logoutAt: result.rows[0].logout_at,
        sessionDurationMinutes: result.rows[0].session_duration_minutes
      }
    });
  } catch (err) {
    console.error('[SESSION_END_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể kết thúc session',
      details: err.message
    });
  }
};

// Lấy danh sách thiết bị đang online
const getOnlineDevices = async (req, res) => {
  try {
    const timeoutMinutes = Number.parseInt(req.query.timeout || '30', 10);
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 100, 500);

    // Cập nhật các session quá hạn thành inactive
    await pool.query(
      `UPDATE user_sessions 
       SET is_active = FALSE, session_duration_minutes = 
           EXTRACT(MINUTE FROM NOW() - login_at) + 
           EXTRACT(HOUR FROM NOW() - login_at) * 60
       WHERE is_active = TRUE AND last_activity_at < NOW() - INTERVAL '1 minute' * $1`,
      [timeoutMinutes]
    );

    // Lấy danh sách device đang online
    const result = await pool.query(
      `SELECT 
        us.id, us.user_id, us.device_id, us.ip_address, us.device_type, 
        us.browser, us.operating_system, us.timezone, us.screen_resolution,
        us.login_at, us.last_activity_at,
        u.email, u.full_name, u.role,
        CEIL(EXTRACT(EPOCH FROM NOW() - us.last_activity_at) / 60) as idle_minutes,
        CEIL(EXTRACT(EPOCH FROM NOW() - us.login_at) / 60) as session_minutes,
        ta.trial_status,
        CASE 
          WHEN ta.trial_end_at > NOW() THEN CEIL(EXTRACT(DAY FROM ta.trial_end_at - NOW()))
          ELSE 0
        END as trial_days_remaining
       FROM user_sessions us
       JOIN users u ON us.user_id = u.id
       LEFT JOIN trial_accounts ta ON u.id = ta.user_id
       WHERE us.is_active = TRUE
       ORDER BY us.last_activity_at DESC
       LIMIT $1`,
      [limit]
    );

    // Tính toán thống kê
    const stats = {
      total: result.rowCount,
      byDeviceType: {},
      byBrowser: {},
      byRole: {},
      totalSessions: result.rowCount
    };

    result.rows.forEach(row => {
      // Thống kê theo device type
      stats.byDeviceType[row.device_type] = (stats.byDeviceType[row.device_type] || 0) + 1;
      // Thống kê theo browser
      stats.byBrowser[row.browser] = (stats.byBrowser[row.browser] || 0) + 1;
      // Thống kê theo role
      stats.byRole[row.role] = (stats.byRole[row.role] || 0) + 1;
    });

    return res.json({
      message: 'Lấy danh sách thiết bị online thành công',
      timeoutMinutes,
      stats,
      count: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    console.error('[ONLINE_DEVICES_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể lấy danh sách thiết bị online',
      details: err.message
    });
  }
};

// Lấy sessions của một user
const getUserSessions = async (req, res) => {
  try {
    const userId = req.user?.id;
    const includeInactive = req.query.includeInactive === 'true';

    if (!userId) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }

    let query = `SELECT * FROM user_sessions WHERE user_id = $1`;
    if (!includeInactive) {
      query += ` AND is_active = TRUE`;
    }
    query += ` ORDER BY login_at DESC LIMIT 50`;

    const result = await pool.query(query, [userId]);

    return res.json({
      message: 'Lấy danh sách session thành công',
      count: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    console.error('[USER_SESSIONS_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể lấy danh sách session',
      details: err.message
    });
  }
};

const getMySession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const includeInactive = req.query.includeInactive === 'true';

    if (!userId) {
      return res.status(401).json({ error: 'Chưa xác thực' });
    }
    let query = `SELECT * FROM user_sessions WHERE user_id = $1`;
    if (!includeInactive) {
      query += ` AND is_active = TRUE`;
    }
    query += ` ORDER BY login_at DESC LIMIT 1`;

    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy session nào' });
    }
    return res.json({
      message: 'Lấy session thành công',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('[MY_SESSION_ERROR]', err.message);
    return res.status(500).json({ error: 'Không thể lấy session của bạn', details: err.message });
  }
};

// Lấy thống kê online devices
const getOnlineDevicesStats = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_active_sessions,
        COUNT(CASE WHEN device_type = 'mobile' THEN 1 END) as mobile_count,
        COUNT(CASE WHEN device_type = 'tablet' THEN 1 END) as tablet_count,
        COUNT(CASE WHEN device_type = 'desktop' THEN 1 END) as desktop_count,
        COUNT(DISTINCT user_id) as unique_users_online,
        COUNT(DISTINCT ip_address) as unique_ips,
        ROUND(AVG(EXTRACT(EPOCH FROM NOW() - last_activity_at) / 60)::numeric, 2) as avg_idle_minutes
       FROM user_sessions
       WHERE is_active = TRUE`
    );

    // Lấy thêm thông tin peak hours
    const peakHours = await pool.query(
      `SELECT 
        EXTRACT(HOUR FROM login_at) as hour,
        COUNT(*) as count
       FROM user_sessions
       WHERE login_at >= NOW() - INTERVAL '24 hours'
       GROUP BY EXTRACT(HOUR FROM login_at)
       ORDER BY count DESC
       LIMIT 5`
    );

    return res.json({
      message: 'Lấy thống kê thiết bị online thành công',
      stats: result.rows[0],
      peakHours: peakHours.rows
    });
  } catch (err) {
    console.error('[ONLINE_STATS_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể lấy thống kê',
      details: err.message
    });
  }
};

// Kick out session (admin only)
const kickOutSession = async (req, res) => {
  try {
    const { session_id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE user_sessions 
       SET is_active = FALSE, logout_at = NOW()
       WHERE id = $1
       RETURNING user_id, device_id, device_type`,
      [session_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Session không tồn tại'
      });
    }

    console.log('[SESSION_KICKED]', {
      sessionId: session_id,
      reason: reason || 'Admin kicked',
      ...result.rows[0]
    });

    return res.json({
      message: 'Đã kết thúc session thành công',
      data: {
        sessionId: session_id,
        reason: reason || 'Kicked by admin'
      }
    });
  } catch (err) {
    console.error('[KICK_SESSION_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể kick session',
      details: err.message
    });
  }
};

module.exports = {
  createSession,
  updateActivity,
  endSession,
  getOnlineDevices,
  getUserSessions,
  getOnlineDevicesStats,
  kickOutSession,
  getMySession
};
