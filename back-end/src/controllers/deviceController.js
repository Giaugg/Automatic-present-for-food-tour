const { extractServerDeviceInfo } = require('../services/deviceDetectionService');
const pool = require('../config/db');

const identify = async (req, res) => {
  // Dữ liệu nhận diện phía server (IP, User-Agent, OS, browser...).
  const serverDevice = extractServerDeviceInfo(req);

  // Dữ liệu do client gửi thêm để tăng độ chính xác hiển thị thống kê.
  const clientHints = {
    timezone: req.body?.timezone || null,
    language: req.body?.language || null,
    platform: req.body?.platform || null,
    screenResolution: req.body?.screenResolution || null,
    touchPoints: Number.isFinite(req.body?.touchPoints) ? req.body.touchPoints : null
  };

  // Log gọn để dễ theo dõi khi kiểm tra realtime trong container.
  console.log('[DEVICE_TRACK]', {
    ipAddress: serverDevice.ipAddress,
    deviceType: serverDevice.deviceType,
    browser: serverDevice.browser,
    operatingSystem: serverDevice.operatingSystem,
    timezone: clientHints.timezone,
    screenResolution: clientHints.screenResolution
  });

  try {
    await pool.query(
      `INSERT INTO device_access_logs (
        ip_address, user_agent, device_type, browser, operating_system,
        accept_language, platform_hint, timezone, language, platform,
        screen_resolution, touch_points, user_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13::UUID
      )`,
      [
        serverDevice.ipAddress,
        serverDevice.userAgent,
        serverDevice.deviceType,
        serverDevice.browser,
        serverDevice.operatingSystem,
        serverDevice.acceptLanguage,
        serverDevice.platformHint,
        clientHints.timezone,
        clientHints.language,
        clientHints.platform,
        clientHints.screenResolution,
        clientHints.touchPoints,
        req.user?.id || null
      ]
    );
  } catch (err) {
    console.error('[DEVICE_TRACK_ERROR]', err.message);
  }

  return res.status(200).json({
    message: 'Nhận diện thiết bị thành công',
    data: {
      ...serverDevice,
      clientHints
    }
  });
};

const getRecentLogs = async (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 30, 200);

  try {
    const result = await pool.query(
      `SELECT id, ip_address, device_type, browser, operating_system,
              timezone, screen_resolution, created_at, user_id
       FROM device_access_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return res.json({
      message: 'Lấy danh sách thiết bị gần nhất thành công',
      count: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Không thể lấy log thiết bị' });
  }
};

module.exports = {
  identify,
  getRecentLogs
};
