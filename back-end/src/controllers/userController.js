const pool = require('../config/db');
const { normalizePlanKey, planExists } = require('../services/ownerPlanService');

const userController = {
    // 1. Lấy danh sách tất cả người dùng (Có lọc & tìm kiếm)
    getAllUsers: async (req, res) => {
        const { role, search } = req.query;
        try {
            let query = 'SELECT id, username, email, full_name, avatar_url, role, owner_plan, balance, points, created_at FROM users WHERE 1=1';
            const params = [];

            if (role) {
                params.push(role);
                query += ` AND role = $${params.length}`;
            }

            if (search) {
                params.push(`%${search}%`);
                query += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length} OR username ILIKE $${params.length})`;
            }

            query += ' ORDER BY created_at DESC';
            
            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: "Lỗi lấy danh sách người dùng: " + err.message });
        }
    },

    // 2. Lấy chi tiết một người dùng
    getUserById: async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query(
                'SELECT id, username, email, full_name, avatar_url, role, owner_plan, balance, points, created_at FROM users WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy người dùng" });
            }

            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // 3. Cập nhật thông tin (Admin Update)
    updateUser: async (req, res) => {
        const { id } = req.params;
        const { full_name, role, owner_plan, points, balance } = req.body;
        try {
            let validatedOwnerPlan = owner_plan;
            if (owner_plan !== undefined && owner_plan !== null && owner_plan !== '') {
                validatedOwnerPlan = normalizePlanKey(owner_plan);
                const exists = await planExists(validatedOwnerPlan, { activeOnly: true });
                if (!exists) {
                    return res.status(400).json({ message: "owner_plan không hợp lệ hoặc đã bị tắt" });
                }
            }

            const result = await pool.query(
                `UPDATE users 
                 SET full_name = COALESCE($1, full_name), 
                     role = COALESCE($2, role), 
                     owner_plan = COALESCE($3, owner_plan),
                     points = COALESCE($4, points), 
                     balance = COALESCE($5, balance)
                 WHERE id = $6 RETURNING id, full_name, role, owner_plan, points, balance`,
                [full_name, role, validatedOwnerPlan, points, balance, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: "Người dùng không tồn tại" });
            }

            res.json({ message: "Cập nhật thành công", user: result.rows[0] });
        } catch (err) {
            console.log(err.message);
            res.status(400).json({ error: err.message });
        }
    },

    // 4. Admin nạp tiền hộ (Top-up)
    adminTopUp: async (req, res) => {
        const { id } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Số tiền nạp phải lớn hơn 0" });
        }

        try {
            const result = await pool.query(
                'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
                [amount, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: "Người dùng không tồn tại" });
            }

            res.json({ 
                message: "Nạp tiền thành công", 
                newBalance: result.rows[0].balance 
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // 5. Xóa người dùng
    deleteUser: async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
            
            if (result.rowCount === 0) {
                return res.status(404).json({ message: "Người dùng không tồn tại" });
            }

            res.json({ message: "Đã xóa tài khoản thành công" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = userController;