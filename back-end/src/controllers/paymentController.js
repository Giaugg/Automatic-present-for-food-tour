const crypto = require('crypto');
const axios = require('axios');
const pool = require('../config/db');
const { OWNER_PLAN, OWNER_PLAN_CONFIG, getOwnerPlanConfig } = require('../services/ownerPlanService');

const ZALOPAY_CREATE_ENDPOINT = process.env.ZALOPAY_CREATE_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/create';
const ZALOPAY_QUERY_ENDPOINT = process.env.ZALOPAY_QUERY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/query';

const getRequiredConfig = () => {
  const appId = process.env.ZALOPAY_APP_ID;
  const key1 = process.env.ZALOPAY_KEY1;
  const key2 = process.env.ZALOPAY_KEY2;

  if (!appId || !key1 || !key2) {
    throw new Error('Thiếu cấu hình ZALOPAY_APP_ID/ZALOPAY_KEY1/ZALOPAY_KEY2');
  }

  return { appId, key1, key2 };
};

const toYyMmDd = (date = new Date()) => {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

const generateAppTransId = (userId) => {
  const timePart = Date.now();
  const userPart = String(userId).replace(/-/g, '').slice(0, 8);
  return `${toYyMmDd()}_${userPart}_${timePart}`;
};

const signCreateOrder = ({ appId, appTransId, appUser, amount, appTime, embedData, item }, key1) => {
  const data = `${appId}|${appTransId}|${appUser}|${amount}|${appTime}|${embedData}|${item}`;
  return crypto.createHmac('sha256', key1).update(data).digest('hex');
};

const signQueryOrder = ({ appId, appTransId }, key1) => {
  const data = `${appId}|${appTransId}|${key1}`;
  return crypto.createHmac('sha256', key1).update(data).digest('hex');
};

const settleOrderIfNeeded = async (client, order, queryPayload = null) => {
  if (!order || order.status === 'paid') {
    return { settled: false, reason: 'already_paid' };
  }

  const userResult = await client.query(
    'SELECT balance FROM users WHERE id = $1::UUID FOR UPDATE',
    [order.user_id]
  );

  if (userResult.rows.length === 0) {
    throw new Error('Không tìm thấy người dùng để cộng tiền');
  }

  const balanceBefore = Number(userResult.rows[0].balance || 0);
  const amount = Number(order.amount || 0);
  const balanceAfter = balanceBefore + amount;

  await client.query(
    'UPDATE users SET balance = $1::DECIMAL WHERE id = $2::UUID',
    [balanceAfter, order.user_id]
  );

  await client.query(
    `INSERT INTO wallet_transactions
      (user_id, txn_type, amount, balance_before, balance_after, ref_type, ref_id, note)
     VALUES
      ($1::UUID, 'topup', $2::DECIMAL, $3::DECIMAL, $4::DECIMAL, 'zalopay', $5::UUID, $6)`,
    [
      order.user_id,
      amount,
      balanceBefore,
      balanceAfter,
      order.id,
      `Nạp tiền qua ZaloPay (${order.app_trans_id})`,
    ]
  );

  await client.query(
    `UPDATE payment_orders
     SET status = 'paid',
         paid_at = NOW(),
         updated_at = NOW(),
         gateway_response = COALESCE($1::jsonb, gateway_response)
     WHERE id = $2::UUID`,
    [queryPayload ? JSON.stringify(queryPayload) : null, order.id]
  );

  return { settled: true, newBalance: balanceAfter };
};

const toPlanResponse = (plan) => ({
  key: plan.key,
  title: plan.title,
  shortDescription: plan.shortDescription,
  priceVnd: Number(plan.priceVnd || 0),
  durationDays: plan.durationDays,
  maxThumbnailUploads: plan.maxThumbnailUploads,
  maxAudioRadiusMeters: plan.maxAudioRadiusMeters,
  features: plan.features || []
});

const normalizePlanKey = (value) => String(value || '').toLowerCase();

const expireOwnerPlanIfNeeded = async (client, userId) => {
  const activeRes = await client.query(
    `SELECT id, plan_key, ends_at
     FROM owner_plan_subscriptions
     WHERE user_id = $1::UUID AND status = 'active'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  const active = activeRes.rows[0];
  if (!active) return null;

  if (active.plan_key === OWNER_PLAN.PREMIUM && active.ends_at && new Date(active.ends_at) < new Date()) {
    await client.query(
      `UPDATE owner_plan_subscriptions
       SET status = 'expired', updated_at = NOW()
       WHERE id = $1::UUID`,
      [active.id]
    );

    await client.query(
      `UPDATE users SET owner_plan = $1 WHERE id = $2::UUID`,
      [OWNER_PLAN.FREE, userId]
    );

    return null;
  }

  return active;
};

exports.createZaloPayTopupOrder = async (req, res) => {
  const userId = req.user?.id;
  const amount = Number(req.body?.amount);

  if (!userId) {
    return res.status(401).json({ message: 'Chưa xác thực danh tính' });
  }

  if (!Number.isFinite(amount) || amount < 1000) {
    return res.status(400).json({ message: 'Số tiền nạp tối thiểu là 1,000đ' });
  }

  if (amount > 50000000) {
    return res.status(400).json({ message: 'Số tiền nạp vượt quá giới hạn cho mỗi giao dịch' });
  }

  try {
    const { appId, key1 } = getRequiredConfig();

    const appUser = String(userId);
    const appTransId = generateAppTransId(userId);
    const appTime = Date.now();
    const item = '[]';
    const embedData = JSON.stringify({
      user_id: userId,
      purpose: 'wallet_topup',
      redirecturl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet?zp_app_trans_id=${appTransId}`,
    });

    const payload = {
      app_id: Number(appId),
      app_user: appUser,
      app_time: appTime,
      amount: Math.round(amount),
      app_trans_id: appTransId,
      embed_data: embedData,
      item,
      description: `Nap tien vi cho user ${String(userId).slice(0, 8)}`,
      bank_code: '',
      callback_url: process.env.ZALOPAY_CALLBACK_URL || '',
    };

    payload.mac = signCreateOrder(
      {
        appId: payload.app_id,
        appTransId: payload.app_trans_id,
        appUser: payload.app_user,
        amount: payload.amount,
        appTime: payload.app_time,
        embedData: payload.embed_data,
        item: payload.item,
      },
      key1
    );

    await pool.query(
      `INSERT INTO payment_orders (provider, app_trans_id, user_id, amount, status)
       VALUES ('zalopay', $1, $2::UUID, $3::DECIMAL, 'pending')`,
      [appTransId, userId, payload.amount]
    );

    const body = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        body.append(key, String(value));
      }
    });

    const response = await axios.post(ZALOPAY_CREATE_ENDPOINT, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });

    const data = response.data || {};

    if (Number(data.return_code) !== 1) {
      await pool.query(
        `UPDATE payment_orders
         SET status = 'failed',
             gateway_response = $1::jsonb,
             updated_at = NOW()
         WHERE app_trans_id = $2`,
        [JSON.stringify(data), appTransId]
      );

      return res.status(400).json({
        message: data.return_message || 'Không thể tạo đơn ZaloPay',
        provider_response: data,
      });
    }

    await pool.query(
      `UPDATE payment_orders
       SET gateway_response = $1::jsonb,
           updated_at = NOW()
       WHERE app_trans_id = $2`,
      [JSON.stringify(data), appTransId]
    );

    res.status(201).json({
      message: 'Tạo đơn ZaloPay thành công',
      app_trans_id: appTransId,
      order_url: data.order_url,
      zp_trans_token: data.zp_trans_token,
      qr_code: data.qr_code,
    });
  } catch (err) {
    console.error('Create ZaloPay order error:', err.message);
    res.status(500).json({ error: err.message || 'Lỗi tạo đơn ZaloPay' });
  }
};

exports.queryZaloPayOrderStatus = async (req, res) => {
  const userId = req.user?.id;
  const { appTransId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: 'Chưa xác thực danh tính' });
  }

  if (!appTransId) {
    return res.status(400).json({ message: 'Thiếu appTransId' });
  }

  const client = await pool.connect();
  try {
    const { appId, key1 } = getRequiredConfig();

    await client.query('BEGIN');

    const orderResult = await client.query(
      `SELECT *
       FROM payment_orders
       WHERE app_trans_id = $1 AND user_id = $2::UUID
       FOR UPDATE`,
      [appTransId, userId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Không tìm thấy đơn thanh toán' });
    }

    const order = orderResult.rows[0];

    if (order.status === 'paid') {
      await client.query('COMMIT');
      return res.json({
        message: 'Đơn đã thanh toán',
        local_status: order.status,
        app_trans_id: appTransId,
      });
    }

    const queryPayload = {
      app_id: Number(appId),
      app_trans_id: appTransId,
    };
    queryPayload.mac = signQueryOrder(
      { appId: queryPayload.app_id, appTransId: queryPayload.app_trans_id },
      key1
    );

    const queryRes = await axios.post(ZALOPAY_QUERY_ENDPOINT, new URLSearchParams(queryPayload).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });

    const providerData = queryRes.data || {};

    await client.query(
      `UPDATE payment_orders
       SET gateway_response = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2::UUID`,
      [JSON.stringify(providerData), order.id]
    );

    const isPaid = Number(providerData.return_code) === 1 && Number(providerData.sub_return_code) === 1;

    if (isPaid) {
      await settleOrderIfNeeded(client, order, providerData);
    }

    await client.query('COMMIT');

    res.json({
      message: 'Đã truy vấn trạng thái đơn',
      app_trans_id: appTransId,
      local_status: isPaid ? 'paid' : order.status,
      provider_response: providerData,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Query ZaloPay status error:', err.message);
    res.status(500).json({ error: err.message || 'Lỗi truy vấn trạng thái ZaloPay' });
  } finally {
    client.release();
  }
};

exports.zaloPayCallback = async (req, res) => {
  const { data, mac } = req.body || {};

  try {
    const { key2 } = getRequiredConfig();

    const expectedMac = crypto.createHmac('sha256', key2).update(data || '').digest('hex');
    if (!data || !mac || expectedMac !== mac) {
      return res.json({ return_code: -1, return_message: 'mac not equal' });
    }

    const payload = JSON.parse(data);
    const appTransId = payload.app_trans_id;

    if (!appTransId) {
      return res.json({ return_code: -1, return_message: 'missing app_trans_id' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        'SELECT * FROM payment_orders WHERE app_trans_id = $1 FOR UPDATE',
        [appTransId]
      );

      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        // Trả success để gateway không retry vô hạn khi đơn local đã bị xóa/không tồn tại.
        return res.json({ return_code: 1, return_message: 'success' });
      }

      const order = orderResult.rows[0];
      if (order.status !== 'paid') {
        await settleOrderIfNeeded(client, order, payload);
      }

      await client.query('COMMIT');
      return res.json({ return_code: 1, return_message: 'success' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('ZaloPay callback transaction error:', err.message);
      return res.json({ return_code: 0, return_message: 'temporary error' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('ZaloPay callback error:', err.message);
    return res.json({ return_code: 0, return_message: 'temporary error' });
  }
};

exports.getOwnerPlans = async (req, res) => {
  const plans = Object.values(OWNER_PLAN_CONFIG).map(toPlanResponse);
  return res.json({
    message: 'Lấy danh sách gói thành công',
    data: plans
  });
};

exports.getMyOwnerPlan = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Chưa xác thực danh tính' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      `SELECT id, owner_plan, balance FROM users WHERE id = $1::UUID FOR UPDATE`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const active = await expireOwnerPlanIfNeeded(client, userId);

    const latestUserRes = await client.query(
      `SELECT owner_plan, balance FROM users WHERE id = $1::UUID`,
      [userId]
    );

    const historyRes = await client.query(
      `SELECT id, plan_key, amount, status, payment_method, starts_at, ends_at, created_at
       FROM owner_plan_subscriptions
       WHERE user_id = $1::UUID
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Lấy thông tin gói thành công',
      data: {
        currentPlan: latestUserRes.rows[0].owner_plan || OWNER_PLAN.FREE,
        balance: Number(latestUserRes.rows[0].balance || 0),
        activeSubscription: active,
        history: historyRes.rows
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message || 'Không thể lấy thông tin gói' });
  } finally {
    client.release();
  }
};

exports.subscribeOwnerPlan = async (req, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const planKey = normalizePlanKey(req.body?.planKey);

  if (!userId) {
    return res.status(401).json({ message: 'Chưa xác thực danh tính' });
  }

  if (!['owner', 'admin'].includes(role)) {
    return res.status(403).json({ message: 'Chỉ owner hoặc admin mới đăng ký gói' });
  }

  if (!Object.values(OWNER_PLAN).includes(planKey)) {
    return res.status(400).json({ message: 'Gói không hợp lệ' });
  }

  const planConfig = getOwnerPlanConfig(planKey);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      `SELECT id, owner_plan, balance FROM users WHERE id = $1::UUID FOR UPDATE`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    await expireOwnerPlanIfNeeded(client, userId);

    const latestUserRes = await client.query(
      `SELECT owner_plan, balance FROM users WHERE id = $1::UUID`,
      [userId]
    );
    const currentPlan = latestUserRes.rows[0].owner_plan || OWNER_PLAN.FREE;
    const balanceBefore = Number(latestUserRes.rows[0].balance || 0);

    const activeRes = await client.query(
      `SELECT id, plan_key, status, ends_at
       FROM owner_plan_subscriptions
       WHERE user_id = $1::UUID AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    const currentActive = activeRes.rows[0] || null;

    if (planKey === OWNER_PLAN.PREMIUM && currentPlan === OWNER_PLAN.PREMIUM && currentActive && currentActive.plan_key === OWNER_PLAN.PREMIUM) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Bạn đang sử dụng gói premium' });
    }

    let amount = Number(planConfig.priceVnd || 0);
    let paymentMethod = 'wallet';
    let balanceAfter = balanceBefore;

    if (amount > 0) {
      if (balanceBefore < amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: 'Số dư không đủ để đăng ký gói',
          required: amount,
          current_balance: balanceBefore
        });
      }

      balanceAfter = balanceBefore - amount;
      await client.query(
        `UPDATE users SET balance = $1::DECIMAL, owner_plan = $2 WHERE id = $3::UUID`,
        [balanceAfter, planKey, userId]
      );

      await client.query(
        `INSERT INTO wallet_transactions
          (user_id, txn_type, amount, balance_before, balance_after, ref_type, note)
         VALUES
          ($1::UUID, 'owner_plan_subscription', $2::DECIMAL, $3::DECIMAL, $4::DECIMAL, 'owner_plan', $5)`,
        [
          userId,
          amount,
          balanceBefore,
          balanceAfter,
          `Dang ky gói ${planConfig.title}`
        ]
      );
    } else {
      paymentMethod = 'free';
      await client.query(
        `UPDATE users SET owner_plan = $1 WHERE id = $2::UUID`,
        [planKey, userId]
      );
    }

    if (currentActive) {
      await client.query(
        `UPDATE owner_plan_subscriptions
         SET status = CASE WHEN status = 'active' THEN 'cancelled' ELSE status END,
             ends_at = COALESCE(ends_at, NOW()),
             updated_at = NOW()
         WHERE id = $1::UUID`,
        [currentActive.id]
      );
    }

    const endsAt = planConfig.durationDays ? `NOW() + INTERVAL '${Number(planConfig.durationDays)} days'` : 'NULL';
    const subscriptionRes = await client.query(
      `INSERT INTO owner_plan_subscriptions
        (user_id, plan_key, amount, status, payment_method, starts_at, ends_at, metadata)
       VALUES
        ($1::UUID, $2, $3::DECIMAL, 'active', $4, NOW(), ${endsAt}, $5::jsonb)
       RETURNING id, plan_key, amount, status, payment_method, starts_at, ends_at, created_at`,
      [
        userId,
        planKey,
        amount,
        paymentMethod,
        JSON.stringify({ initiatedByRole: role })
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Đăng ký gói thành công',
      data: {
        currentPlan: planKey,
        subscription: subscriptionRes.rows[0],
        wallet: {
          previous_balance: balanceBefore,
          current_balance: balanceAfter,
          deducted: amount
        },
        plan: toPlanResponse(planConfig)
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message || 'Không thể đăng ký gói' });
  } finally {
    client.release();
  }
};
