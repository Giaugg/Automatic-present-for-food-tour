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
             RETURNING id, username, email, full_name, role, owner_plan, balance, points`,
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
                owner_plan: user.owner_plan,
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
            `SELECT id, email, full_name, role, owner_plan, balance, points, avatar_url 
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

// --- 4. USER TỰ NẠP TIỀN VÀO VÍ ---
exports.topUpBalance = async (req, res) => {
    const userId = req.user?.id;
    const amount = Number(req.body?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Số tiền nạp phải lớn hơn 0' });
    }

    if (amount > 50000000) {
        return res.status(400).json({ message: 'Số tiền nạp vượt quá giới hạn cho mỗi giao dịch' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userResult = await client.query(
            'SELECT balance FROM users WHERE id = $1::UUID FOR UPDATE',
            [userId]
        );

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }

        const balanceBefore = Number(userResult.rows[0].balance || 0);
        const balanceAfter = balanceBefore + amount;

        await client.query(
            'UPDATE users SET balance = $1::DECIMAL WHERE id = $2::UUID',
            [balanceAfter, userId]
        );

        const txnResult = await client.query(
            `INSERT INTO wallet_transactions
                (user_id, txn_type, amount, balance_before, balance_after, note)
             VALUES
                ($1::UUID, 'topup', $2::DECIMAL, $3::DECIMAL, $4::DECIMAL, $5)
             RETURNING id, txn_type, amount, balance_before, balance_after, created_at`,
            [userId, amount, balanceBefore, balanceAfter, 'User tự nạp tiền vào ví']
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Nạp tiền thành công',
            transaction: txnResult.rows[0],
            balance: balanceAfter,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Top Up Error:', err.message);
        res.status(500).json({ error: 'Lỗi server khi nạp tiền' });
    } finally {
        client.release();
    }
};

// --- 5. LẤY LỊCH SỬ GIAO DỊCH VÍ CỦA USER HIỆN TẠI ---
exports.getMyWalletTransactions = async (req, res) => {
    const userId = req.user?.id;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    try {
        const result = await pool.query(
            `SELECT id, txn_type, amount, balance_before, balance_after, note, created_at, ref_type, ref_id
             FROM wallet_transactions
             WHERE user_id = $1::UUID
             ORDER BY created_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Get Wallet Transactions Error:', err.message);
        res.status(500).json({ error: 'Lỗi lấy lịch sử ví' });
    }
};