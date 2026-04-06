const { extractServerDeviceInfo } = require('../services/deviceDetectionService');

const identify = (req, res) => {
  const serverDevice = extractServerDeviceInfo(req);

  const clientHints = {
    timezone: req.body?.timezone || null,
    language: req.body?.language || null,
    platform: req.body?.platform || null,
    screenResolution: req.body?.screenResolution || null,
    touchPoints: Number.isFinite(req.body?.touchPoints) ? req.body.touchPoints : null
  };

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
