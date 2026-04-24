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

const getDeviceStats = async (req, res) => {
  try {
    const timeRange = req.query.range || '24h'; // 24h, 7d, 30d, all
    let dateFilter = '';
    
    if (timeRange === '24h') {
      dateFilter = "WHERE created_at >= NOW() - INTERVAL '24 hours'";
    } else if (timeRange === '7d') {
      dateFilter = "WHERE created_at >= NOW() - INTERVAL '7 days'";
    } else if (timeRange === '30d') {
      dateFilter = "WHERE created_at >= NOW() - INTERVAL '30 days'";
    }

    const [
      totalResult,
      deviceTypeResult,
      browserResult,
      osResult,
      timezoneResult,
      uniqueIpsResult
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM device_access_logs ${dateFilter}`),
      pool.query(`
        SELECT device_type, COUNT(*) as count 
        FROM device_access_logs 
        ${dateFilter}
        GROUP BY device_type 
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT browser, COUNT(*) as count 
        FROM device_access_logs 
        ${dateFilter}
        GROUP BY browser 
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT operating_system, COUNT(*) as count 
        FROM device_access_logs 
        ${dateFilter}
        GROUP BY operating_system 
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT timezone, COUNT(*) as count 
        FROM device_access_logs 
        ${dateFilter}
        AND timezone IS NOT NULL
        GROUP BY timezone 
        ORDER BY count DESC 
        LIMIT 10
      `),
      pool.query(`
        SELECT COUNT(DISTINCT ip_address) as unique_ips 
        FROM device_access_logs 
        ${dateFilter}
      `)
    ]);

    return res.json({
      message: 'Lấy thống kê thiết bị thành công',
      timeRange,
      summary: {
        totalAccess: parseInt(totalResult.rows[0]?.total || 0),
        uniqueIPs: parseInt(uniqueIpsResult.rows[0]?.unique_ips || 0)
      },
      statistics: {
        byDeviceType: deviceTypeResult.rows,
        byBrowser: browserResult.rows,
        byOperatingSystem: osResult.rows,
        byTimezone: timezoneResult.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Không thể lấy thống kê thiết bị' });
  }
};

const getRealtimeStats = async (req, res) => {
  try {
    const [
      last1hResult,
      last24hResult,
      lastDevicesResult,
      topBrowsersResult
    ] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) as count 
        FROM device_access_logs 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `),
      pool.query(`
        SELECT COUNT(*) as count 
        FROM device_access_logs 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `),
      pool.query(`
        SELECT device_type, browser, operating_system, ip_address, 
               timezone, screen_resolution, created_at
        FROM device_access_logs 
        ORDER BY created_at DESC 
        LIMIT 5
      `),
      pool.query(`
        SELECT browser, COUNT(*) as count 
        FROM device_access_logs 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY browser 
        ORDER BY count DESC 
        LIMIT 5
      `)
    ]);

    return res.json({
      message: 'Lấy thống kê realtime thành công',
      realtime: {
        accessLast1Hour: parseInt(last1hResult.rows[0]?.count || 0),
        accessLast24Hours: parseInt(last24hResult.rows[0]?.count || 0),
        recentDevices: lastDevicesResult.rows,
        topBrowsers: topBrowsersResult.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Không thể lấy thống kê realtime' });
  }
};

const getHourlyTrend = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as count,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM device_access_logs 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour DESC
    `);

    return res.json({
      message: 'Lấy xu hướng theo giờ thành công',
      data: result.rows
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Không thể lấy xu hướng' });
  }
};

module.exports = {
  identify,
  getRecentLogs,
  getDeviceStats,
  getRealtimeStats,
  getHourlyTrend
};
