const express = require('express');
const pool = require('./config/db'); // Import kết nối PostgreSQL từ config
require('dotenv').config();

const app = express();

// Chỉnh lại port: Ưu tiên lấy từ biến môi trường (Docker dùng)
const port = process.env.PORT || 5000;

app.use(express.json());

// Route kiểm tra trạng thái Server và Database
app.get('/', async (req, res) => {
  try {
    const dbStatus = await pool.query('SELECT NOW()');
    res.send(`Backend đang chạy! Database kết nối thành công lúc: ${dbStatus.rows[0].now}`);
  } catch (err) {
    res.status(500).send('Backend đang chạy nhưng KHÔNG kết nối được Database.');
  }
});

// API trả về tasks (kết hợp lấy từ DB hoặc giả lập)
app.get('/api/tasks', (req, res) => {
  res.json([
    { id: 1, title: 'Học Express + Docker', status: 'Doing' },
    { id: 2, title: 'Kết nối Next.js', status: 'Todo' }
  ]);
});
// TEST API quán ăn
app.get("/api/food-street", async (req, res) => {
  const { lat, lon, radius } = req.query;

  // Validate input
  if (!lat || !lon || !radius) {
    return res.status(400).json({ error: "Missing lat, lon or radius" });
  }

  const query = `
    [out:json][timeout:25];

    (
      node["amenity"~"restaurant|cafe|fast_food|bar"](around:${radius},${lat},${lon});
      way["amenity"~"restaurant|cafe|fast_food|bar"](around:${radius},${lat},${lon});
      relation["amenity"~"restaurant|cafe|fast_food|bar"](around:${radius},${lat},${lon});
    );

    out center tags;
  `;

  try {
    const response = await axios.post(
      "https://overpass-api.de/api/interpreter",
      query,
      { headers: { "Content-Type": "text/plain" } }
    );

    const pois = response.data.elements
      .map(e => ({
        id: e.id,
        lat: e.lat || e.center?.lat,   // 👈 QUAN TRỌNG: support node + way + relation
        lon: e.lon || e.center?.lon,
        name: e.tags?.name || "Không tên",
        type: e.tags?.amenity || "unknown"
      }))
      // lọc những phần tử không có tọa độ (an toàn)
      .filter(p => p.lat && p.lon);

    res.json(pois);
  } catch (err) {
    console.error("Overpass error:", err.response?.data || err.message);
    res.status(500).json({ error: "Overpass error", detail: err.message });
  }
});


app.listen(port, '0.0.0.0', () => {
  // Lưu ý: Thêm '0.0.0.0' để Docker có thể ánh xạ port ra bên ngoài máy thật
  console.log(`Server đang chạy trên port ${port}`);
});