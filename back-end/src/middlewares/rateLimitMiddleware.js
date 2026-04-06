const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toWindowMs = (windowMsEnv, windowSecondsEnv, fallbackMs) => {
  const seconds = Number.parseInt(windowSecondsEnv, 10);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const rawMs = Number.parseInt(windowMsEnv, 10);
  if (Number.isNaN(rawMs) || rawMs <= 0) {
    return fallbackMs;
  }

  // Hỗ trợ cách set nhanh khi test: nếu giá trị quá nhỏ (<=1000), hiểu theo giây.
  if (rawMs <= 1000) {
    return rawMs * 1000;
  }

  return rawMs;
};

const createLimiter = ({ windowMs, max, message, standardHeaders = true }) => {
  const store = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const routeKey = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
    const key = `${req.ip || req.socket?.remoteAddress || 'unknown'}:${routeKey}`;

    const record = store.get(key);
    if (!record || record.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });

      if (standardHeaders) {
        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', String(Math.max(max - 1, 0)));
        res.setHeader('RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));
      }

      return next();
    }

    record.count += 1;
    store.set(key, record);

    if (standardHeaders) {
      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', String(Math.max(max - record.count, 0)));
      res.setHeader('RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));
    }

    if (record.count > max) {
      const retryAfterSeconds = Math.max(Math.ceil((record.resetAt - now) / 1000), 1);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        message,
        retryAfterSeconds
      });
    }

    return next();
  };
};

const apiLimiter = createLimiter({
  windowMs: toWindowMs(
    process.env.RATE_LIMIT_WINDOW_MS,
    process.env.RATE_LIMIT_WINDOW_SECONDS,
    15 * 60 * 1000
  ),
  max: toInt(process.env.RATE_LIMIT_MAX, 300),
  message: 'Bạn gửi quá nhiều request. Vui lòng thử lại sau ít phút.'
});

const authLimiter = createLimiter({
  windowMs: toWindowMs(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    10 * 60 * 1000
  ),
  max: toInt(process.env.AUTH_RATE_LIMIT_MAX, 10),
  message: 'Bạn đăng nhập/đăng ký quá nhanh. Vui lòng thử lại sau.'
});

module.exports = {
  apiLimiter,
  authLimiter
};
