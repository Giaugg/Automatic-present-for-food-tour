const jwt = require('jsonwebtoken');

/**
 * 1. Middleware Xác thực (Authentication)
 * Kiểm tra Token hợp lệ và gán thông tin user vào req.user
 */
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key');
        // decoded thường chứa { id, role, iat, exp }
        req.user = decoded; 
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
};

/**
 * 2. Middleware Phân quyền (Authorization)
 * Kiểm tra vai trò của user có quyền truy cập route hay không
 * Sử dụng: authorize('admin'), authorize('admin', 'owner')
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Chưa xác thực danh tính' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Bạn không có quyền thực hiện hành động này. Yêu cầu: ${allowedRoles.join(' hoặc ')}` 
            });
        }
        next();
    };
};

module.exports = { authMiddleware, authorize };