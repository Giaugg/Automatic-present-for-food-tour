const pool = require('../config/db');
const bcrypt = require('bcrypt');

/**
 * Trial Account Controller
 * Quản lý tài khoản dùng thử với thời gian giới hạn
 */

// Kiểm tra xem trial account đã hết hạn chưa
const checkTrialExpiration = async (userId) => {
  try {
    const result = await pool.query(
      `SELECT trial_end_at, trial_status FROM trial_accounts 
       WHERE user_id = $1 AND trial_status = 'active'`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { isExpired: true, status: 'no_trial' };
    }

    const trial = result.rows[0];
    const now = new Date();
    const trialEndDate = new Date(trial.trial_end_at);

    if (now > trialEndDate) {
      // Update status thành expired
      await pool.query(
        `UPDATE trial_accounts SET trial_status = 'expired' WHERE user_id = $1`,
        [userId]
      );
      return { isExpired: true, status: 'expired', expiresAt: trial.trial_end_at };
    }

    return {
      isExpired: false,
      status: 'active',
      expiresAt: trial.trial_end_at,
      daysRemaining: Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24))
    };
  } catch (err) {
    console.error('[TRIAL_EXPIRATION_CHECK]', err.message);
    return { isExpired: false, error: err.message };
  }
};

// Tạo tài khoản dùng thử mới
const createTrialAccount = async (req, res) => {
  try {
    const {
      email,
      full_name,
      max_devices = 3,
      max_sessions = 5,
      max_ips = 5,
      max_duration_days = 7,
      features
    } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email là bắt buộc'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Kiểm tra email đã tồn tại chưa
      const existingUser = await client.query(
        `SELECT id FROM users WHERE email = $1`,
        [email]
      );

      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Email đã tồn tại trong hệ thống'
        });
      }

      // 2. Tạo user mới với password mặc định
      const defaultPassword = bcrypt.hashSync('123456', 10);
      const trialEndAt = new Date();
      trialEndAt.setDate(trialEndAt.getDate() + max_duration_days);

      const userResult = await client.query(
        `INSERT INTO users (
          email, password_hash, full_name, role,
          is_trial_user, trial_expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, full_name, created_at`,
        [email, defaultPassword, full_name || 'Khách hàng dùng thử', 'visitor', true, trialEndAt]
      );

      const userId = userResult.rows[0].id;

      // 3. Tạo trial account record với giới hạn
      const defaultFeatures = {
        maxTours: 3,
        maxPOIs: 10,
        canUploadAudio: false,
        canUploadThumbnail: false,
        ...features
      };

      const trialResult = await client.query(
        `INSERT INTO trial_accounts (
          user_id, max_devices, max_sessions, max_ips, max_duration_days,
          trial_start_at, trial_end_at, trial_status, features
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, trial_start_at, trial_end_at, trial_status`,
        [
          userId,
          max_devices,
          max_sessions,
          max_ips,
          max_duration_days,
          new Date(),
          trialEndAt,
          'active',
          JSON.stringify(defaultFeatures)
        ]
      );

      // 4. Update user với trial_account_id
      await client.query(
        `UPDATE users SET trial_account_id = $1 WHERE id = $2`,
        [trialResult.rows[0].id, userId]
      );

      await client.query('COMMIT');

      console.log('[TRIAL_CREATED]', {
        userId,
        email,
        maxDevices: max_devices,
        maxSessions: max_sessions,
        maxIPs: max_ips,
        durationDays: max_duration_days
      });

      return res.status(201).json({
        message: 'Tạo tài khoản dùng thử thành công',
        data: {
          userId,
          email: userResult.rows[0].email,
          fullName: userResult.rows[0].full_name,
          trialStartAt: trialResult.rows[0].trial_start_at,
          trialEndAt: trialResult.rows[0].trial_end_at,
          durationDays: max_duration_days,
          limits: {
            maxDevices: max_devices,
            maxSessions: max_sessions,
            maxIPs: max_ips
          },
          features: defaultFeatures,
          defaultPassword: '123456'
        }
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[TRIAL_CREATE_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể tạo tài khoản dùng thử',
      details: err.message
    });
  }
};

// Lấy danh sách trial account
const getTrialAccounts = async (req, res) => {
  try {
    const status = req.query.status || 'active'; // active, expired, all
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 50, 200);

    let statusFilter = "WHERE ta.trial_status = $1";
    const params = [status];

    if (status === 'all') {
      statusFilter = '';
      params.pop();
    }

    const result = await pool.query(
      `SELECT
        ta.id, ta.user_id, ta.max_devices, ta.max_sessions, ta.max_ips,
        ta.trial_start_at, ta.trial_end_at, ta.trial_status,
        ta.max_duration_days, ta.features,
        u.email, u.full_name, u.created_at,
        CASE
          WHEN ta.trial_end_at > NOW() THEN CEIL(EXTRACT(DAY FROM ta.trial_end_at - NOW()))
          ELSE 0
        END as days_remaining
       FROM trial_accounts ta
       JOIN users u ON ta.user_id = u.id
       ${statusFilter}
       ORDER BY ta.created_at DESC
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    return res.json({
      message: 'Lấy danh sách tài khoản dùng thử thành công',
      count: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    console.error('[TRIAL_LIST_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể lấy danh sách trial account',
      details: err.message
    });
  }
};

// Lấy chi tiết trial account của một user
const getTrialAccountDetail = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT
        ta.id, ta.user_id, ta.max_devices, ta.max_sessions, ta.max_ips,
        ta.trial_start_at, ta.trial_end_at, ta.trial_status,
        ta.max_duration_days, ta.features,
        u.email, u.full_name, u.balance, u.created_at,
        COUNT(us.id) as active_sessions,
        CASE
          WHEN ta.trial_end_at > NOW() THEN CEIL(EXTRACT(DAY FROM ta.trial_end_at - NOW()))
          ELSE 0
        END as days_remaining
       FROM trial_accounts ta
       JOIN users u ON ta.user_id = u.id
       LEFT JOIN user_sessions us ON u.id = us.user_id AND us.is_active = TRUE
       WHERE ta.user_id = $1
       GROUP BY ta.id, u.id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Không tìm thấy trial account'
      });
    }

    return res.json({
      message: 'Lấy chi tiết trial account thành công',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('[TRIAL_DETAIL_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể lấy chi tiết trial account',
      details: err.message
    });
  }
};

// Gia hạn trial account
const extendTrialAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { additionalDays = 7 } = req.body;

    const result = await pool.query(
      `UPDATE trial_accounts 
       SET trial_end_at = trial_end_at + INTERVAL '1 day' * $2,
           trial_duration_days = trial_duration_days + $2
       WHERE user_id = $1
       RETURNING id, trial_start_at, trial_end_at, trial_status, trial_duration_days`,
      [userId, additionalDays]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Không tìm thấy trial account'
      });
    }

    const trial = result.rows[0];

    return res.json({
      message: 'Gia hạn tài khoản dùng thử thành công',
      data: {
        trialEndAt: trial.trial_end_at,
        totalDurationDays: trial.trial_duration_days,
        daysAdded: additionalDays
      }
    });
  } catch (err) {
    console.error('[TRIAL_EXTEND_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể gia hạn trial account',
      details: err.message
    });
  }
};

// Hủy trial account
const cancelTrialAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE trial_accounts 
       SET trial_status = 'cancelled', updated_at = NOW()
       WHERE user_id = $1
       RETURNING id, user_id, trial_status`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Không tìm thấy trial account'
      });
    }

    return res.json({
      message: 'Hủy tài khoản dùng thử thành công',
      data: {
        userId,
        status: result.rows[0].trial_status,
        reason: reason || 'No reason provided'
      }
    });
  } catch (err) {
    console.error('[TRIAL_CANCEL_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể hủy trial account',
      details: err.message
    });
  }
};

// Kiểm tra trial status khi user login
const checkTrialStatus = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Chưa xác thực'
      });
    }

    const result = await pool.query(
      `SELECT ta.*, u.is_trial_user 
       FROM trial_accounts ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        isTrialUser: false,
        message: 'Đây là tài khoản thường, không phải trial'
      });
    }

    const trial = result.rows[0];
    const expirationCheck = await checkTrialExpiration(userId);

    return res.json({
      message: 'Kiểm tra trạng thái trial thành công',
      data: {
        isTrialUser: true,
        trialStatus: trial.trial_status,
        ...expirationCheck,
        trialStartAt: trial.trial_start_at,
        trialEndAt: trial.trial_end_at,
        features: trial.features
      }
    });
  } catch (err) {
    console.error('[TRIAL_CHECK_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể kiểm tra trạng thái trial',
      details: err.message
    });
  }
};

// Thống kê trial accounts
const getTrialStats = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_trials,
        COUNT(CASE WHEN trial_status = 'active' THEN 1 END) as active_trials,
        COUNT(CASE WHEN trial_status = 'expired' THEN 1 END) as expired_trials,
        COUNT(CASE WHEN trial_status = 'cancelled' THEN 1 END) as cancelled_trials,
        COUNT(CASE WHEN trial_end_at > NOW() AND trial_status = 'active' THEN 1 END) as unexpired_active,
        AVG(EXTRACT(DAY FROM trial_end_at - trial_start_at)) as avg_trial_duration_days
       FROM trial_accounts`
    );

    return res.json({
      message: 'Lấy thống kê trial account thành công',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('[TRIAL_STATS_ERROR]', err.message);
    return res.status(500).json({
      error: 'Không thể lấy thống kê trial',
      details: err.message
    });
  }
};

module.exports = {
  checkTrialExpiration,
  createTrialAccount,
  getTrialAccounts,
  getTrialAccountDetail,
  extendTrialAccount,
  cancelTrialAccount,
  checkTrialStatus,
  getTrialStats
};
