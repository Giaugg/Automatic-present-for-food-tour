const { extractServerDeviceInfo } = require('../services/deviceDetectionService');

const identify = (req, res) => {
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

  return res.status(200).json({
    message: 'Nhận diện thiết bị thành công',
    data: {
      ...serverDevice,
      clientHints
    }
  });
};

module.exports = {
  identify
};
