const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- 1. ĐĂNG KÝ (Bổ sung full_name) ---
exports.register = async (req, res) => {
    const { username, email, password, full_name, role } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            `INSERT INTO users (username, email, password_hash, full_name, role) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, username, email, full_name, role, balance, points`,
            [username, email, passwordHash, full_name, role || 'visitor']
        );
        
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        // Xử lý lỗi trùng lặp email/username
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Email hoặc tên đăng nhập đã tồn tại' });
        }
        res.status(500).json({ error: err.message });
    }
};

// --- 2. ĐĂNG NHẬP (Trả về đầy đủ thông tin ví và điểm) ---
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Kiểm tra email
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        console.log('Login Attempt:', email, password); // Log email và mật khẩu đăng nhập

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }

        const user = userResult.rows[0];

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
        }

        // Tạo JWT Token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'your_super_secret_key',
            { expiresIn: '7d' } // Tăng thời hạn lên 7 ngày để tránh bị logout khi refresh thường xuyên
        );

        // Trả về thông tin đồng bộ với Interface User ở Front-end
        res.status(200).json({
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                balance: parseFloat(user.balance), // Chuyển từ string decimal sang number
                points: user.points,
                avatar_url: user.avatar_url
            }
        });

    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
    }
};

// --- 3. GET ME (Lấy thông tin mới nhất từ DB) ---
exports.getMe = async (req, res) => {
    try {
        // Truy vấn đầy đủ các trường cần thiết cho Header/Profile
        const result = await pool.query(
            `SELECT id, email, full_name, role, balance, points, avatar_url 
             FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        const user = result.rows[0];
        
        // Đảm bảo balance trả về dạng số để Front-end toLocaleString không lỗi
        res.json({
            ...user,
            balance: parseFloat(user.balance)
        });
    } catch (err) {
        console.error('Get Me Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};