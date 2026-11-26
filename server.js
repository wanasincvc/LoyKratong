const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'krathongs.json');
const MAX_STORED_KRATHONGS = 200;

const VALID_BASES = new Set(['banana_leaf', 'lotus', 'coconut', 'bread', 'ice', 'bamboo', 'swan', 'corn_husk']);
const VALID_FLOWERS = new Set(['marigold', 'orchid', 'rose', 'lotus_bloom', 'jasmine', 'globe_amaranth', 'sunflower', 'cherry_blossom']);
const VALID_CANDLES = new Set(['gold', 'ruby', 'crystal', 'emerald', 'amethyst']);
const VALID_COINS = new Set(['gold', 'silver', 'lucky_gem', 'none']);
const VALID_DECORS = new Set(['none', 'garland', 'umbrella', 'flag']);
const VALID_LANTERN_SHAPES = new Set(['classic', 'cylinder', 'lotus', 'diamond', 'heart']);
const VALID_LANTERN_PALETTES = new Set(['amber', 'sakura', 'gold', 'sky', 'violet']);
const VALID_LANTERN_PATTERNS = new Set(['ribs', 'band', 'stars', 'lotus_crest']);

// Ensure data folder and default data exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Sample starter krathongs so river has life on first run
const defaultKrathongs = [
  {
    id: 'krathong-demo-1',
    name: 'น้องมะลิ',
    wish: 'ขอขมาพระแม่คงคา ขอให้ปีนี้มีแต่เรื่องดีๆ สุขภาพแข็งแรงทั้งครอบครัวค่ะ 🌸',
    base: 'banana_leaf',
    flower: 'marigold',
    candle: 'gold',
    incense: true,
    coin: 'gold',
    decor: 'none',
    timestamp: Date.now() - 3600000,
    likes: 12
  },
  {
    id: 'krathong-demo-2',
    name: 'พี่กานต์',
    wish: 'ขอให้โปรเจกต์ผ่านฉลุย งานราบรื่น ไม่ติดบั๊กครับ 🌕✨',
    base: 'lotus',
    flower: 'orchid',
    candle: 'ruby',
    incense: true,
    coin: 'silver',
    decor: 'none',
    timestamp: Date.now() - 1800000,
    likes: 8
  },
  {
    id: 'krathong-demo-3',
    name: 'น้องบัวตอง',
    wish: 'ขอให้คุณพ่อคุณแม่สุขภาพแข็งแรง และขอให้หนูสอบได้เกรด 4 ทุกวิชาค่ะ 🪷',
    base: 'bread',
    flower: 'lotus_bloom',
    candle: 'crystal',
    incense: true,
    coin: 'gold',
    decor: 'none',
    timestamp: Date.now() - 600000,
    likes: 15
  },
  {
    id: 'krathong-demo-4',
    name: 'นที & แพรวา',
    wish: 'ขอให้รักกันไปนานๆ และเป็นกำลังใจให้กันแบบนี้ตลอดไป 💖',
    base: 'coconut',
    flower: 'rose',
    candle: 'gold',
    incense: true,
    coin: 'gold',
    decor: 'none',
    timestamp: Date.now() - 300000,
    likes: 24
  }
];

function loadKrathongs() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading krathongs data file:', err);
  }
  saveKrathongs(defaultKrathongs);
  return [...defaultKrathongs];
}

function saveKrathongs(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving krathongs data file:', err);
  }
}

function getOnlineUsersCount() {
  return io.of('/').sockets.size;
}

function emitStats() {
  io.emit('stats-updated', {
    totalFloated: totalFloatedCount,
    onlineUsers: getOnlineUsersCount()
  });
}

function clampNormalized(value, fallback, min = 0.05, max = 0.95) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function pickValidOption(value, validSet, fallback) {
  return typeof value === 'string' && validSet.has(value) ? value : fallback;
}

function createKrathongRecord(rawData, options = {}) {
  const data = (rawData && typeof rawData === 'object') ? rawData : {};
  const allowDefaults = options.allowDefaults !== false;

  const rawName = typeof data.name === 'string' ? data.name.trim() : '';
  const rawWish = typeof data.wish === 'string' ? data.wish.trim() : '';

  const name = (rawName || (allowDefaults ? 'ผู้ไม่ประสงค์ออกนาม' : '')).slice(0, 40);
  const wish = (rawWish || (allowDefaults ? 'ขอขมาพระแม่คงคา' : '')).slice(0, 250);

  return {
    id: `krathong-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    wish,
    base: pickValidOption(data.base, VALID_BASES, 'banana_leaf'),
    flower: pickValidOption(data.flower, VALID_FLOWERS, 'marigold'),
    candle: pickValidOption(data.candle, VALID_CANDLES, 'gold'),
    incense: data.incense !== false,
    coin: pickValidOption(data.coin, VALID_COINS, 'gold'),
    decor: pickValidOption(data.decor, VALID_DECORS, 'none'),
    timestamp: Date.now(),
    likes: 0
  };
}

function appendAndBroadcastKrathong(krathong) {
  krathongList.push(krathong);
  totalFloatedCount++;
  if (krathongList.length > MAX_STORED_KRATHONGS) {
    krathongList = krathongList.slice(-MAX_STORED_KRATHONGS);
  }
  saveKrathongs(krathongList);

  io.emit('new-krathong', krathong);
  emitStats();
}

let krathongList = loadKrathongs();
let totalFloatedCount = krathongList.length;

app.use(cors());
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/krathongs', (req, res) => {
  const recent = krathongList.slice(-60);
  res.json({
    total: totalFloatedCount,
    krathongs: recent
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalFloated: totalFloatedCount,
    onlineUsers: getOnlineUsersCount()
  });
});

app.post('/api/krathongs', (req, res) => {
  const newKrathong = createKrathongRecord(req.body, { allowDefaults: false });
  if (!newKrathong.name || !newKrathong.wish) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อและคำอธิษฐาน' });
  }

  appendAndBroadcastKrathong(newKrathong);
  res.status(201).json({ success: true, krathong: newKrathong });
});

// Like / ส่งกำลังใจ endpoint
app.post('/api/krathongs/:id/like', (req, res) => {
  const { id } = req.params;
  const target = krathongList.find(k => k.id === id);
  if (!target) {
    return res.status(404).json({ error: 'ไม่พบกระทง' });
  }

  target.likes = (target.likes || 0) + 1;
  saveKrathongs(krathongList);
  io.emit('krathong-liked', { id: target.id, likes: target.likes });
  return res.json({ success: true, likes: target.likes });
});

// Handle malformed JSON request bodies cleanly
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'รูปแบบข้อมูล JSON ไม่ถูกต้อง' });
  }
  return next(err);
});

// Socket.io Real-time Handlers
io.on('connection', (socket) => {
  emitStats();

  // Client requests initial batch
  socket.on('request-initial', () => {
    socket.emit('initial-data', {
      totalFloated: totalFloatedCount,
      onlineUsers: getOnlineUsersCount(),
      recent: krathongList.slice(-40)
    });
  });

  // Real-time float event
  socket.on('float-krathong', (data, ack) => {
    const newKrathong = createKrathongRecord(data, { allowDefaults: true });
    appendAndBroadcastKrathong(newKrathong);
    if (typeof ack === 'function') {
      ack({ success: true, krathong: newKrathong });
    }
  });

  // Launch fireworks (broadcast to other clients so sender doesn't get a duplicate)
  socket.on('launch-firework', (data) => {
    const payload = (data && typeof data === 'object') ? data : {};
    socket.broadcast.emit('firework-burst', {
      x: clampNormalized(payload.x, Math.random() * 0.8 + 0.1),
      y: payload.y !== undefined ? clampNormalized(payload.y, 0.4, 0.08, 0.85) : null,
      color: typeof payload.color === 'string' ? payload.color.slice(0, 24) : null
    });
  });

  // Launch sky lantern (โคมลอย)
  socket.on('launch-lantern', (data) => {
    const payload = (data && typeof data === 'object') ? data : {};
    socket.broadcast.emit('lantern-launched', {
      name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim().slice(0, 30) : null,
      x: clampNormalized(payload.x, Math.random() * 0.8 + 0.1),
      shape: pickValidOption(payload.shape, VALID_LANTERN_SHAPES, null),
      palette: pickValidOption(payload.palette, VALID_LANTERN_PALETTES, null),
      pattern: pickValidOption(payload.pattern, VALID_LANTERN_PATTERNS, null)
    });
  });

  // Easter Egg: Sky Lantern hit airplane!
  socket.on('plane-hit', (data) => {
    const payload = (data && typeof data === 'object') ? data : {};
    socket.broadcast.emit('plane-hit-broadcast', {
      x: clampNormalized(payload.x, 0.5, 0, 1),
      y: Number.isFinite(Number(payload.y)) ? Math.max(20, Math.min(400, Number(payload.y))) : 80
    });
  });

  socket.on('disconnect', () => {
    emitStats();
  });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🌕 เซิร์ฟเวอร์ลอยกระทงออนไลน์พร้อมใช้งานแล้ว`);
  console.log(`🚀 เปิดใช้งานได้ที่: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
