const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key');
        req.user = decoded; // Lưu thông tin user vào request để dùng ở các controller sau
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token không hợp lệ' });
    }
};