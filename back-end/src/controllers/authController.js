const pool = require('../config/db');
const bcrypt = require('    ');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
            [username, email, passwordHash, role || 'visitor']
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Kiểm tra email có tồn tại không
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }

        const user = userResult.rows[0];

        // 2. So sánh mật khẩu (password gửi lên vs password_hash trong DB)
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }

        // 3. Tạo JWT Token
        // Lưu ý: process.env.JWT_SECRET cần được định nghĩa trong file .env
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'your_super_secret_key',
            { expiresIn: '1d' } // Token hết hạn sau 1 ngày
        );

        // 4. Trả về thông tin (không trả về password_hash)
        res.status(200).json({
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
    }
};