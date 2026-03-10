const pool = require('../config/db');
const bcrypt = require('bcrypt');

// 1. Lấy danh sách tất cả người dùng (Có hỗ trợ lọc theo Role/Search từ Server)
exports.getAllUsers = async (req, res) => {
    const { role, search } = req.query;
    let query = `
        SELECT id, username, email, full_name, role, balance, points, avatar_url, created_at 
        FROM users 
        WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    // Lọc theo vai trò (admin, owner, visitor)
    if (role && role !== 'all') {
        query += ` AND role = $${paramIndex}`;
        values.push(role);
        paramIndex++;
    }

    // Tìm kiếm theo tên hoặc email
    if (search) {
        query += ` AND (full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR username ILIKE $${paramIndex})`;
        values.push(`%${search}%`);
        paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    try {
        const result = await pool.query(query, values);
        // Đảm bảo balance trả về kiểu số
        const users = result.rows.map(u => ({
            ...u,
            balance: parseFloat(u.balance)
        }));
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Lỗi tải danh sách người dùng: " + err.message });
    }
};

// 2. Lấy chi tiết một người dùng
exports.getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT id, username, email, full_name, role, balance, points, avatar_url, created_at FROM users WHERE id = $1::UUID',
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Không tìm thấy người dùng" });
        
        const user = result.rows[0];
        res.json({ ...user, balance: parseFloat(user.balance) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Cập nhật thông tin/Vai trò người dùng (Dành cho Admin)
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { full_name, role, balance, points } = req.body;

    try {
        const result = await pool.query(
            `UPDATE users 
             SET full_name = COALESCE($1, full_name), 
                 role = COALESCE($2, role), 
                 balance = COALESCE($3, balance), 
                 points = COALESCE($4, points),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5::UUID RETURNING id, full_name, role, balance`,
            [full_name, role, balance, points, id]
        );

        if (result.rowCount === 0) return res.status(404).json({ message: "Người dùng không tồn tại" });
        res.json({ message: "Cập nhật thành công", user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Admin nạp tiền hộ cho User (Top-up)
exports.adminTopUp = async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body; // Số tiền nạp thêm

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Số tiền nạp phải lớn hơn 0" });
    }

    try {
        const result = await pool.query(
            `UPDATE users SET balance = balance + $1 WHERE id = $2::UUID RETURNING balance`,
            [amount, id]
        );

        if (result.rowCount === 0) return res.status(404).json({ message: "Người dùng không tồn tại" });
        
        res.json({ 
            message: `Đã nạp thành công ${amount.toLocaleString()}đ`, 
            newBalance: parseFloat(result.rows[0].balance) 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. Xóa tài khoản
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1::UUID', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Người dùng không tồn tại" });
        res.json({ message: "Đã xóa tài khoản thành công" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};