const bcrypt = require('bcrypt');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;

// Đăng ký tài khoản mới
async function register(req, res) {
    try {
        const { username, email, password, role } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
        }

        // Validate role nếu có
        const validRoles = ['admin', 'owner', 'visitor'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ error: 'Role không hợp lệ. Chỉ chấp nhận: admin, owner, visitor' });
        }

        // Kiểm tra email hoặc username đã tồn tại chưa
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email hoặc username đã tồn tại' });
        }

        // Hash password với bcrypt
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Tạo user mới với password đã hash (role mặc định là 'visitor')
        let query, params;
        if (role) {
            query = 'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at, updated_at';
            params = [username, email, hashedPassword, role];
        } else {
            query = 'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, role, created_at, updated_at';
            params = [username, email, hashedPassword];
        }

        const result = await pool.query(query, params);

        res.status(201).json({
            message: 'Tạo tài khoản thành công',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Lỗi khi đăng ký:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
}

// Đăng nhập
async function login(req, res) {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
        }

        // Lấy user từ database
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        }

        const user = result.rows[0];

        // So sánh password với hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        }

        // Tạo JWT Token (nếu có JWT_SECRET trong .env)
        let token = null;
        if (process.env.JWT_SECRET) {
            token = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );
        }

        // Xóa password trước khi trả về
        delete user.password_hash;

        const response = {
            message: 'Đăng nhập thành công',
            user
        };

        if (token) {
            response.token = token;
        }

        res.json(response);

    } catch (error) {
        console.error('Lỗi khi đăng nhập:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
}

module.exports = { register, login };
