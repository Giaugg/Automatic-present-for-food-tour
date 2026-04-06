// Phân loại thiết bị dựa trên user-agent.
const toDeviceType = (userAgent = '') => {
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    return 'tablet';
  }

  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
};

// Nhận diện trình duyệt chính để phục vụ thống kê.
const toBrowser = (userAgent = '') => {
  const ua = userAgent.toLowerCase();

  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
  if (ua.includes('firefox/')) return 'Firefox';

  return 'Unknown';
};

// Nhận diện hệ điều hành từ user-agent và hint của trình duyệt.
const toOperatingSystem = (userAgent = '', platformHint = '') => {
  const ua = userAgent.toLowerCase();
  const hint = platformHint.toLowerCase();

  if (ua.includes('windows') || hint.includes('windows')) return 'Windows';
  if (ua.includes('android') || hint.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod') || hint.includes('ios')) return 'iOS';
  if (ua.includes('mac os x') || hint.includes('mac')) return 'macOS';
  if (ua.includes('linux') || hint.includes('linux')) return 'Linux';

  return 'Unknown';
};

// Lấy IP theo ưu tiên header proxy, sau đó fallback về socket.
const getClientIp = (req) => {
  const xForwardedFor = req.headers['x-forwarded-for'];

  if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
    return xForwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
};

// Gom toàn bộ thông tin nhận diện phía server để controller trả về.
const extractServerDeviceInfo = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const platformHint = req.headers['sec-ch-ua-platform'] || '';

  return {
    ipAddress: getClientIp(req),
    userAgent,
    deviceType: toDeviceType(userAgent),
    browser: toBrowser(userAgent),
    operatingSystem: toOperatingSystem(userAgent, platformHint),
    acceptLanguage: req.headers['accept-language'] || null,
    platformHint: platformHint || null,
    detectedAt: new Date().toISOString()
  };
};

module.exports = {
  extractServerDeviceInfo
};
