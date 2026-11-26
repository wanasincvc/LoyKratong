/**
 * Online Loy Krathong - Interactive River & Sky Application
 * Enhanced organic water physics, hydrodynamic ripples, reflections, and layered lighting
 */

(function () {
  'use strict';

  const MAX_CANVAS_KRATHONGS = 60;
  const MAX_LANTERNS = 12;

  // Persist user's own krathong IDs during the browser session
  function loadSessionKrathongIds() {
    try {
      const raw = sessionStorage.getItem('myKrathongIds');
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  function saveSessionKrathongIds(idSet) {
    try {
      sessionStorage.setItem('myKrathongIds', JSON.stringify(Array.from(idSet).slice(-50)));
    } catch {
      // Ignore storage quota / private mode errors
    }
  }

  // State Management
  const state = {
    onlineUsers: 1,
    totalFloated: 0,
    krathongs: [],      // Active floating krathong objects
    lanterns: [],       // Active sky lanterns
    fireworks: [],      // Active firework & splash particle bursts
    smokeParticles: [], // Crash smoke particles
    skyFlashes: [],     // Brief sky/water illumination from fireworks
    stars: [],          // Background twinkling stars
    clouds: [],         // Soft drifting moonlit clouds
    shootingStars: [],  // Occasional shooting stars
    nextShootingStarAt: 3500,
    palms: [],          // Coconut palms along the far bank
    distantBoat: null,  // Slow distant rowboat silhouette with bow lantern
    riverLights: [],    // Distant warm riverbank lights
    fireflies: [],      // Ambient glowing fireflies near shore/water
    selectedKrathong: null,
    currentConfig: {
      base: 'banana_leaf',
      flower: 'marigold',
      candle: 'gold',
      coin: 'gold',
      decor: 'none',
      incense: true
    },
    hoveredKrathong: null,
    hoveredPlane: false,
    airplane: null,
    airplaneHits: 0,
    myKrathongIds: loadSessionKrathongIds(),
    pendingOwnMatch: null
  };

  // DOM Elements
  const canvas = document.getElementById('riverCanvas');
  const ctx = canvas.getContext('2d');

  const onlineUsersCountEl = document.getElementById('onlineUsersCount');
  const totalFloatedCountEl = document.getElementById('totalFloatedCount');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const openListModalBtn = document.getElementById('openListModalBtn');
  const skyLanternBtn = document.getElementById('skyLanternBtn');
  const fireworksBtn = document.getElementById('fireworksBtn');
  const openCreateModalBtn = document.getElementById('openCreateModalBtn');

  const mobileLanternBtn = document.getElementById('mobileLanternBtn');
  const mobileFireworkBtn = document.getElementById('mobileFireworkBtn');
  const mobileListBtn = document.getElementById('mobileListBtn');
  const mobileCreateBtn = document.getElementById('mobileCreateBtn');

  const hintBanner = document.getElementById('hintBanner');
  const hintCloseBtn = document.getElementById('hintCloseBtn');

  // Create Modal Elements
  const createModalOverlay = document.getElementById('createModalOverlay');
  const closeCreateModalBtn = document.getElementById('closeCreateModalBtn');
  const previewContainer = document.getElementById('previewContainer');
  const previewBaseName = document.getElementById('previewBaseName');
  const previewFlowerName = document.getElementById('previewFlowerName');
  const previewDesc = document.getElementById('previewDesc');
  const randomizeKrathongBtn = document.getElementById('randomizeKrathongBtn');
  const incenseToggleBtn = document.getElementById('incenseToggleBtn');
  const authorNameInput = document.getElementById('authorName');
  const authorWishInput = document.getElementById('authorWish');
  const wishErrorEl = document.getElementById('wishError');
  const charNumEl = document.getElementById('charNum');
  const submitFloatBtn = document.getElementById('submitFloatBtn');

  // Detail Modal Elements
  const detailModalOverlay = document.getElementById('detailModalOverlay');
  const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
  const detailKrathongVisual = document.getElementById('detailKrathongVisual');
  const detailAuthor = document.getElementById('detailAuthor');
  const detailTime = document.getElementById('detailTime');
  const detailWishText = document.getElementById('detailWishText');
  const detailLikesCount = document.getElementById('detailLikesCount');
  const likeKrathongBtn = document.getElementById('likeKrathongBtn');

  // List Modal Elements
  const listModalOverlay = document.getElementById('listModalOverlay');
  const closeListModalBtn = document.getElementById('closeListModalBtn');
  const recentKrathongsList = document.getElementById('recentKrathongsList');

  // Toast & Easter Egg
  const toastNotification = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMsg');
  const easterEggBanner = document.getElementById('easterEggBanner');
  const easterEggText = document.getElementById('easterEggText');

  let toastTimer = null;
  let easterEggTimer = null;
  let isLiking = false;

  // Logical CSS viewport dimensions (decoupled from physical DPR backing store)
  let viewWidth = window.innerWidth;
  let viewHeight = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Socket Connection
  const socket = (typeof io !== 'undefined') ? io() : null;

  // --- OFFSCREEN GLOW SPRITE CACHE (High-FPS Lighting) ---
  const glowSpriteCache = new Map();

  function getGlowSprite(rgbTuple) {
    if (glowSpriteCache.has(rgbTuple)) {
      return glowSpriteCache.get(rgbTuple);
    }
    const size = 128;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const octx = off.getContext('2d');
    const half = size / 2;
    const grad = octx.createRadialGradient(half, half, 2, half, half, half);
    grad.addColorStop(0, `rgba(${rgbTuple}, 1)`);
    grad.addColorStop(0.25, `rgba(${rgbTuple}, 0.55)`);
    grad.addColorStop(0.6, `rgba(${rgbTuple}, 0.16)`);
    grad.addColorStop(1, `rgba(${rgbTuple}, 0)`);
    octx.fillStyle = grad;
    octx.fillRect(0, 0, size, size);
    glowSpriteCache.set(rgbTuple, off);
    return off;
  }

  function hexToRgbTuple(hex) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return '254, 240, 138';
    const clean = hex.slice(1);
    const full = clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean;
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return '254, 240, 138';
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }

  function getCandleRgb(candleType) {
    if (candleType === 'ruby') return '244, 63, 94';
    if (candleType === 'crystal') return '56, 189, 248';
    if (candleType === 'emerald') return '52, 211, 153';
    if (candleType === 'amethyst') return '192, 132, 252';
    return '250, 204, 21';
  }

  // Cache for SVG Krathong Bitmaps
  const imageCache = new Map();

  function getKrathongImage(config, callback) {
    const key = `${config.base}-${config.flower}-${config.candle}-${config.coin}-${config.decor || 'none'}-${config.incense}`;
    if (imageCache.has(key)) {
      const cached = imageCache.get(key);
      if (cached.loaded) {
        callback(cached.img);
      } else {
        cached.callbacks.push(callback);
      }
      return;
    }

    const svgStr = KrathongArt.generateSVG(config);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    const cacheEntry = { img, loaded: false, callbacks: [callback] };
    imageCache.set(key, cacheEntry);

    img.onload = () => {
      URL.revokeObjectURL(url);
      cacheEntry.loaded = true;
      cacheEntry.callbacks.forEach(cb => cb(img));
      cacheEntry.callbacks = [];
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      imageCache.delete(key);
      cacheEntry.callbacks = [];
    };

    img.src = url;
  }

  // Safe rounded-rectangle path helper
  function drawRoundRect(x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  // River Horizon Y position
  function getHorizonY() {
    return viewHeight * 0.44;
  }

  function updateKrathongDepthGeometry(k) {
    const horizon = getHorizonY();
    const waterHeight = Math.max(120, viewHeight - horizon);
    const depth = Math.max(0, Math.min(1, (k.baseY - horizon) / waterHeight));
    k.depth = depth;
    k.scale = 0.45 + depth * 0.72;
    k.baseSpeed = -(0.32 + depth * 0.56);
    k.bobAmp = 2.6 + depth * 4.2;
    k.width = 160 * k.scale;
    k.height = 136 * k.scale;
  }

  // Window Resize & Setup
  function resizeCanvas() {
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(viewWidth * dpr);
    canvas.height = Math.floor(viewHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    initSkyScenery();
    reclampKrathongs();
  }

  window.addEventListener('resize', resizeCanvas);

  // Keep krathongs inside water bounds after viewport resize
  function reclampKrathongs() {
    const horizon = getHorizonY();
    const minY = horizon + 24;
    const maxY = Math.max(minY + 10, viewHeight - 56);
    state.krathongs.forEach(k => {
      k.anchorY = Math.max(minY, Math.min(maxY, k.anchorY || k.baseY));
      k.baseY = Math.max(minY, Math.min(maxY, k.baseY));
      updateKrathongDepthGeometry(k);
    });
    state.krathongs.sort((a, b) => a.baseY - b.baseY);
  }

  // Background Stars, Clouds, Distant Lights & Fireflies Generator
  function initSkyScenery() {
    const horizon = getHorizonY();

    state.stars = [];
    const starCount = Math.floor((viewWidth * viewHeight) / 6200);
    for (let i = 0; i < starCount; i++) {
      const gentlyTwinkles = Math.random() > 0.65;
      state.stars.push({
        x: Math.random() * viewWidth,
        y: Math.random() * (horizon - 14),
        radius: Math.random() * 1.45 + 0.45,
        alpha: Math.random() * 0.65 + 0.25,
        twinkleSpeed: Math.random() * 0.00045 + 0.00018,
        twinkleAmp: gentlyTwinkles ? (Math.random() * 0.1 + 0.06) : 0.02,
        twinklePhase: Math.random() * Math.PI * 2,
        warm: Math.random() > 0.78
      });
    }

    // Soft drifting night clouds
    state.clouds = [];
    const cloudCount = Math.max(4, Math.floor(viewWidth / 280));
    for (let i = 0; i < cloudCount; i++) {
      state.clouds.push({
        x: (i / cloudCount) * viewWidth + Math.random() * 120,
        y: 28 + Math.random() * Math.max(40, horizon * 0.55),
        w: 140 + Math.random() * 160,
        h: 26 + Math.random() * 20,
        speed: 0.08 + Math.random() * 0.1,
        alpha: 0.045 + Math.random() * 0.045
      });
    }

    // Subtle warm temple/riverbank lights along the far shore
    state.riverLights = [];
    const lightCount = Math.max(12, Math.floor(viewWidth / 75));
    for (let i = 0; i < lightCount; i++) {
      state.riverLights.push({
        x: (i + 0.2 + Math.random() * 0.6) * (viewWidth / lightCount),
        offsetY: Math.random() * 7 + 2,
        phase: Math.random() * Math.PI * 2,
        radius: Math.random() * 1.2 + 0.9
      });
    }

    // Ambient golden fireflies hovering near the river & shore
    state.fireflies = [];
    const fireflyCount = Math.max(12, Math.floor(viewWidth / 100));
    for (let i = 0; i < fireflyCount; i++) {
      state.fireflies.push({
        x: Math.random() * viewWidth,
        y: horizon - 20 + Math.random() * Math.max(60, (viewHeight - horizon) * 0.55),
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.12,
        phase: Math.random() * Math.PI * 2,
        size: 1.4 + Math.random() * 1.4
      });
    }

    // Coconut palms framing the far riverbank
    state.palms = [
      { xRatio: 0.06, height: 52, lean: -0.22, phase: 0.4 },
      { xRatio: 0.10, height: 40, lean: 0.18, phase: 1.7 },
      { xRatio: 0.34, height: 44, lean: -0.15, phase: 2.8 },
      { xRatio: 0.72, height: 42, lean: 0.16, phase: 3.9 },
      { xRatio: 0.91, height: 54, lean: 0.24, phase: 5.1 },
      { xRatio: 0.95, height: 38, lean: -0.14, phase: 0.9 }
    ];

    if (!state.distantBoat) {
      state.distantBoat = {
        x: viewWidth * 0.58,
        dir: -1,
        speed: 0.12
      };
    }
  }

  // Easter Egg Notification Banner
  function showEasterEggNews(msg) {
    if (easterEggText) easterEggText.textContent = msg;
    if (easterEggBanner) {
      easterEggBanner.classList.add('show');
      clearTimeout(easterEggTimer);
      easterEggTimer = setTimeout(() => {
        easterEggBanner.classList.remove('show');
      }, 7000);
    }
  }

  // Spawn Easter Egg Airplane flying across the sky
  function spawnAirplane(forceDir = null, customX = null, customY = null) {
    if (state.airplane && !state.airplane.isDead) return;
    const goingRight = forceDir !== null ? forceDir : Math.random() > 0.5;
    const horizon = getHorizonY();
    const defaultY = 38 + Math.random() * Math.max(40, horizon * 0.48 - 38);

    state.airplane = {
      x: customX !== null ? customX : (goingRight ? -90 : viewWidth + 90),
      y: customY !== null ? customY : defaultY,
      vx: goingRight ? 1.7 : -1.7,
      vy: 0,
      width: 68,
      height: 22,
      angle: 0,
      goingRight,
      isCrashing: false,
      isDead: false
    };
  }

  // Trigger Plane Crash upon Lantern Collision or Direct Click
  function triggerPlaneCrash(plane, lx, ly, broadcast = true) {
    if (!plane || plane.isCrashing || plane.isDead) return;
    plane.isCrashing = true;
    plane.vy = 0.6;
    state.airplaneHits = (state.airplaneHits || 0) + 1;

    spawnFirework(lx, ly, '#f97316');
    setTimeout(() => spawnFirework(lx + (Math.random() - 0.5) * 20, ly, '#ef4444'), 120);

    if (window.soundEngine) {
      window.soundEngine.playPlaneCrash();
    }

    if (broadcast && socket && socket.connected) {
      socket.emit('plane-hit', { x: lx / viewWidth, y: ly });
    }

    showEasterEggNews('โคมลอยชนเครื่องบินตกน้ำ! อย่าปล่อยโคมใกล้เส้นทางบินนะครับ ✈️💥');
  }

  // Sky Lantern Visual Themes
  const LANTERN_SHAPES = ['classic', 'cylinder', 'lotus', 'diamond', 'heart'];
  const LANTERN_PATTERNS = ['ribs', 'band', 'stars', 'lotus_crest'];
  const LANTERN_PALETTES = {
    amber: { inner: '#fff7ed', mid: '#fed7aa', edge: '#fb923c', rgb: '251, 146, 60', trim: '#fef08a' },
    sakura: { inner: '#fff1f2', mid: '#fecdd3', edge: '#fb7185', rgb: '251, 113, 133', trim: '#ffe4e6' },
    gold: { inner: '#fefce8', mid: '#fef08a', edge: '#f59e0b', rgb: '250, 204, 21', trim: '#ffffff' },
    sky: { inner: '#f0f9ff', mid: '#bae6fd', edge: '#38bdf8', rgb: '56, 189, 248', trim: '#e0f2fe' },
    violet: { inner: '#faf5ff', mid: '#e9d5ff', edge: '#c084fc', rgb: '192, 132, 252', trim: '#f3e8ff' }
  };
  const LANTERN_PALETTE_KEYS = Object.keys(LANTERN_PALETTES);

  function pickRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Spawn Sky Lantern with Randomized Appearance
  function spawnLantern(xPercent = 0.5, name = null, appearance = {}) {
    if (state.lanterns.length >= MAX_LANTERNS) {
      state.lanterns.shift();
    }
    const shape = LANTERN_SHAPES.includes(appearance.shape)
      ? appearance.shape
      : pickRandomItem(LANTERN_SHAPES);
    const paletteKey = (appearance.palette && appearance.palette in LANTERN_PALETTES)
      ? appearance.palette
      : pickRandomItem(LANTERN_PALETTE_KEYS);
    const pattern = LANTERN_PATTERNS.includes(appearance.pattern)
      ? appearance.pattern
      : pickRandomItem(LANTERN_PATTERNS);

    const x = viewWidth * xPercent;
    const y = getHorizonY() + 18 + Math.random() * 45;
    state.lanterns.push({
      x,
      y,
      name,
      shape,
      paletteKey,
      pattern,
      hasTassel: shape === 'diamond' || shape === 'cylinder' || Math.random() > 0.55,
      tiltSeed: Math.random() * Math.PI * 2,
      speedY: -(Math.random() * 0.6 + 0.42),
      speedX: (Math.random() - 0.5) * 0.25,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.02 + 0.01,
      size: Math.random() * 11 + 22,
      life: 0
    });
    return { shape, palette: paletteKey, pattern };
  }

  // Spawn Firework
  function spawnFirework(x, y, color = null) {
    const colors = [
      '#f43f5e', '#fbbf24', '#38bdf8', '#a855f7', '#34d399', '#f97316', '#fef08a'
    ];
    const burstColor = color || colors[Math.floor(Math.random() * colors.length)];
    const rgb = hexToRgbTuple(burstColor);
    const particleCount = 64 + Math.floor(Math.random() * 24);
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.18;
      const speed = Math.random() * 5.4 + 1.8;
      particles.push({
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: burstColor,
        rgb,
        size: Math.random() * 2.2 + 1.4,
        drag: 0.96,
        decay: Math.random() * 0.017 + 0.011
      });
    }

    state.fireworks.push({ particles });
    state.skyFlashes.push({
      x,
      y,
      rgb,
      radius: 170,
      alpha: 0.45
    });

    if (window.soundEngine) {
      window.soundEngine.playFirework();
    }
  }

  // Create Floating Krathong Object
  function createFloatingKrathong(data, spawnMode = 'right') {
    const horizon = getHorizonY();
    const waterHeight = Math.max(120, viewHeight - horizon);

    const depth = Math.random();
    const y = horizon + 24 + depth * Math.max(30, waterHeight - 86);

    let x;
    if (spawnMode === 'spread') {
      x = Math.random() * Math.max(100, viewWidth - 100) + 50;
    } else if (spawnMode === 'visible') {
      x = viewWidth * (0.76 + Math.random() * 0.12);
    } else {
      x = viewWidth + 85 + Math.random() * 120;
    }

    const isMine = state.myKrathongIds.has(data.id);

    const krathong = {
      id: data.id || ('k-' + Date.now()),
      name: data.name || 'ผู้ไม่ประสงค์ออกนาม',
      wish: data.wish || 'ขอขมาพระแม่คงคา',
      config: {
        base: data.base || 'banana_leaf',
        flower: data.flower || 'marigold',
        candle: data.candle || 'gold',
        coin: data.coin || 'gold',
        decor: data.decor || 'none',
        incense: data.incense !== false
      },
      likes: data.likes || 0,
      timestamp: data.timestamp || Date.now(),
      isMine,
      x,
      y,
      baseY: y,
      anchorY: y,
      vy: 0,
      depth,
      scale: 0.45 + depth * 0.72,
      baseSpeed: -(0.32 + depth * 0.56),
      phase: Math.random() * Math.PI * 2,
      bobAmp: 2.6 + depth * 4.2,
      rockAngle: 0,
      dropProgress: spawnMode === 'visible' ? 0 : 1,
      entryRipple: spawnMode === 'visible' ? 0 : 1,
      img: null,
      width: 160 * (0.45 + depth * 0.72),
      height: 136 * (0.45 + depth * 0.72)
    };

    updateKrathongDepthGeometry(krathong);

    getKrathongImage(krathong.config, (img) => {
      krathong.img = img;
    });

    return krathong;
  }

  // Load Initial Krathongs
  function initKrathongs(list) {
    state.krathongs = [];
    if (list && list.length > 0) {
      const items = list.slice(-MAX_CANVAS_KRATHONGS);
      items.forEach((item, idx) => {
        const k = createFloatingKrathong(item, 'spread');
        k.x = ((idx + 0.5) / items.length) * viewWidth + (Math.random() - 0.5) * 80;
        state.krathongs.push(k);
      });
    }
    state.krathongs.sort((a, b) => a.baseY - b.baseY);
  }

  // Add a newly arrived or newly created krathong (with deduplication)
  function addKrathongToRiver(item, isOwn = false) {
    if (!item || !item.id) return null;
    const existing = state.krathongs.find(k => k.id === item.id);
    if (existing) {
      if (isOwn) {
        existing.isMine = true;
      }
      return existing;
    }

    if (isOwn) {
      state.myKrathongIds.add(item.id);
      saveSessionKrathongIds(state.myKrathongIds);
    }

    if (state.krathongs.length >= MAX_CANVAS_KRATHONGS) {
      const idxToRemove = state.krathongs.findIndex(k => !k.isMine);
      state.krathongs.splice(idxToRemove >= 0 ? idxToRemove : 0, 1);
    }

    const k = createFloatingKrathong(item, isOwn ? 'visible' : 'right');
    k.isMine = isOwn || state.myKrathongIds.has(item.id);
    state.krathongs.push(k);
    state.krathongs.sort((a, b) => a.baseY - b.baseY);
    return k;
  }

  // --- DRAWING FUNCTIONS ---

  // 1. Draw Starry Sky, Milky Way Mist, Shooting Stars, Drifting Clouds & Full Moon
  function drawSkyAndMoon(time, dt) {
    const horizon = getHorizonY();

    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, '#02040d');
    skyGrad.addColorStop(0.38, '#09122c');
    skyGrad.addColorStop(0.76, '#1a2448');
    skyGrad.addColorStop(1, '#31446b');

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, viewWidth, horizon);

    // Subtle diagonal Milky Way celestial band across the upper sky
    ctx.save();
    ctx.translate(viewWidth * 0.36, horizon * 0.42);
    ctx.rotate(-0.34);
    const milkyGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, viewWidth * 0.48);
    milkyGrad.addColorStop(0, 'rgba(147, 197, 253, 0.08)');
    milkyGrad.addColorStop(0.45, 'rgba(167, 139, 250, 0.045)');
    milkyGrad.addColorStop(1, 'rgba(30, 41, 59, 0)');
    ctx.scale(1.9, 0.42);
    ctx.fillStyle = milkyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, viewWidth * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Subtle warm horizon mist above the far shore
    const horizonMist = ctx.createLinearGradient(0, horizon - 58, 0, horizon);
    horizonMist.addColorStop(0, 'rgba(253, 224, 71, 0)');
    horizonMist.addColorStop(0.65, 'rgba(251, 191, 36, 0.05)');
    horizonMist.addColorStop(1, 'rgba(253, 224, 71, 0.14)');
    ctx.fillStyle = horizonMist;
    ctx.fillRect(0, horizon - 58, viewWidth, 58);

    // Stars (calm, slow gentle breathing glow without harsh flickering)
    state.stars.forEach((star, idx) => {
      const alpha = star.alpha + Math.sin(time * star.twinkleSpeed + star.twinklePhase) * star.twinkleAmp;
      const a = Math.max(0.15, Math.min(0.95, alpha));
      ctx.fillStyle = star.warm ? `rgba(254, 240, 138, ${a})` : `rgba(241, 245, 249, ${a})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();

      if (star.radius > 1.55 && idx % 6 === 0) {
        const crossAlpha = Math.max(0, (a - 0.35) * 0.48);
        if (crossAlpha > 0.02) {
          ctx.strokeStyle = star.warm ? `rgba(254, 240, 138, ${crossAlpha})` : `rgba(226, 232, 240, ${crossAlpha})`;
          ctx.lineWidth = 0.7;
          const sp = star.radius * 2.6;
          ctx.beginPath();
          ctx.moveTo(star.x - sp, star.y);
          ctx.lineTo(star.x + sp, star.y);
          ctx.moveTo(star.x, star.y - sp);
          ctx.lineTo(star.x, star.y + sp);
          ctx.stroke();
        }
      }
    });

    // Occasional Shooting Stars
    if (time > state.nextShootingStarAt && state.shootingStars.length < 2) {
      state.nextShootingStarAt = time + 8000 + Math.random() * 9000;
      const goLeft = Math.random() > 0.45;
      state.shootingStars.push({
        x: (0.15 + Math.random() * 0.7) * viewWidth,
        y: 18 + Math.random() * (horizon * 0.42),
        vx: (goLeft ? -1 : 1) * (5.5 + Math.random() * 3),
        vy: 1.8 + Math.random() * 1.4,
        life: 1
      });
    }
    for (let i = state.shootingStars.length - 1; i >= 0; i--) {
      const ss = state.shootingStars[i];
      ss.x += ss.vx * dt;
      ss.y += ss.vy * dt;
      ss.life -= 0.022 * dt;
      if (ss.life <= 0) {
        state.shootingStars.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const tailX = ss.x - ss.vx * 8;
      const tailY = ss.y - ss.vy * 8;
      const ssGrad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
      ssGrad.addColorStop(0, `rgba(255, 255, 255, ${ss.life})`);
      ssGrad.addColorStop(0.4, `rgba(254, 240, 138, ${ss.life * 0.6})`);
      ssGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.strokeStyle = ssGrad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      ctx.restore();
    }

    // Full Moon Position
    const moonX = viewWidth * 0.75;
    const moonY = horizon * 0.36;
    const moonR = Math.min(viewWidth, viewHeight) * 0.065 + 22;

    // Faint Moon Ice-Crystal Atmospheric Ring + Additive Halo
    const moonSprite = getGlowSprite('254, 240, 138');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.46;
    const haloSize = moonR * 7.6;
    ctx.drawImage(moonSprite, moonX - haloSize / 2, moonY - haloSize / 2, haloSize, haloSize);
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.055)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 2.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Moon Disc
    const moonBody = ctx.createRadialGradient(moonX - moonR * 0.25, moonY - moonR * 0.25, moonR * 0.1, moonX, moonY, moonR);
    moonBody.addColorStop(0, '#ffffff');
    moonBody.addColorStop(0.58, '#fef08a');
    moonBody.addColorStop(0.88, '#fde047');
    moonBody.addColorStop(1, '#eab308');

    ctx.fillStyle = moonBody;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();

    // Subtle Lunar Crater Shadows
    ctx.fillStyle = 'rgba(202, 138, 4, 0.18)';
    [
      { dx: -moonR * 0.3, dy: -moonR * 0.2, r: moonR * 0.2 },
      { dx: -moonR * 0.1, dy: moonR * 0.25, r: moonR * 0.28 },
      { dx: moonR * 0.35, dy: -moonR * 0.05, r: moonR * 0.18 },
      { dx: moonR * 0.15, dy: moonR * 0.3, r: moonR * 0.14 }
    ].forEach(c => {
      ctx.beginPath();
      ctx.arc(moonX + c.dx, moonY + c.dy, c.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Soft Moonlit Drifting Clouds
    state.clouds.forEach(cloud => {
      cloud.x -= cloud.speed * dt;
      if (cloud.x < -cloud.w) {
        cloud.x = viewWidth + cloud.w * 0.5;
      }
      const distToMoon = Math.hypot(cloud.x - moonX, cloud.y - moonY);
      const moonTint = Math.max(0, 1 - distToMoon / 280);
      const r = Math.round(148 + moonTint * 106);
      const g = Math.round(163 + moonTint * 77);
      const b = Math.round(184 - moonTint * 46);

      ctx.save();
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${cloud.alpha + moonTint * 0.045})`;
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, cloud.w * 0.5, cloud.h * 0.5, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x - cloud.w * 0.26, cloud.y + 4, cloud.w * 0.32, cloud.h * 0.42, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x + cloud.w * 0.28, cloud.y + 3, cloud.w * 0.34, cloud.h * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Sky Flashes from active firework bursts
    for (let i = state.skyFlashes.length - 1; i >= 0; i--) {
      const flash = state.skyFlashes[i];
      flash.alpha -= 0.015 * dt;
      if (flash.alpha <= 0) {
        state.skyFlashes.splice(i, 1);
        continue;
      }
      const sprite = getGlowSprite(flash.rgb);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = flash.alpha;
      ctx.drawImage(sprite, flash.x - flash.radius, flash.y - flash.radius, flash.radius * 2, flash.radius * 2);
      ctx.restore();
    }

    drawFarHorizonSilhouettes(horizon, time);

    return { moonX, moonY, moonR };
  }

  // Draw distant misty mountain ridge behind the riverfront
  function traceMountainRidge(horizon) {
    ctx.beginPath();
    ctx.moveTo(0, horizon + 2);
    for (let x = 0; x <= viewWidth + 40; x += 40) {
      const mh = Math.sin(x * 0.0032 + 0.8) * 18 + Math.cos(x * 0.0075) * 11 + 22;
      ctx.lineTo(x, horizon - mh);
    }
    ctx.lineTo(viewWidth, horizon + 2);
    ctx.closePath();
    ctx.fill();
  }

  // Draw coconut palm silhouette swaying softly in night breeze
  function drawPalmTree(baseX, horizon, height, lean, swayAngle) {
    ctx.save();
    ctx.translate(baseX, horizon);
    const tipX = lean * height + Math.sin(swayAngle) * 3;
    const tipY = -height;

    // Curved trunk
    ctx.strokeStyle = 'rgba(7, 11, 25, 0.96)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(lean * height * 0.35, -height * 0.55, tipX, tipY);
    ctx.stroke();

    // Fronds radiating from crown
    ctx.lineWidth = 1.6;
    const frondAngles = [-2.5, -1.9, -1.2, -0.4, 0.4, 1.1];
    frondAngles.forEach((a, idx) => {
      const ang = a + Math.sin(swayAngle + idx * 0.5) * 0.06;
      const len = height * (0.34 + (idx % 2) * 0.08);
      const ex = tipX + Math.cos(ang) * len;
      const ey = tipY + Math.sin(ang) * len * 0.65 + len * 0.28;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo(tipX + Math.cos(ang) * len * 0.55, tipY + Math.sin(ang) * len * 0.25 - 3, ex, ey);
      ctx.stroke();
    });
    ctx.restore();
  }

  // Draw distant temple & riverside pavilion silhouette (shared for shore and inverted water reflection)
  function traceTempleSilhouette(horizon, time, includePalms = true) {
    // Near bank foliage hill curve
    ctx.beginPath();
    ctx.moveTo(0, horizon + 2);
    for (let x = 0; x <= viewWidth + 32; x += 32) {
      const h = Math.sin(x * 0.006) * 7 + Math.cos(x * 0.015) * 4;
      ctx.lineTo(x, horizon - 9 + h);
    }
    ctx.lineTo(viewWidth, horizon + 2);
    ctx.closePath();
    ctx.fill();

    const chediX = viewWidth * 0.22;

    // Grand Thai Viharn / Ubosot with tiered roof & chofah spires
    ctx.beginPath();
    ctx.moveTo(chediX - 72, horizon);
    ctx.lineTo(chediX - 66, horizon - 15);
    ctx.lineTo(chediX - 73, horizon - 16);
    ctx.lineTo(chediX - 54, horizon - 27);
    ctx.lineTo(chediX - 48, horizon - 33);
    ctx.lineTo(chediX - 44, horizon - 41); // chofah left
    ctx.lineTo(chediX - 41, horizon - 32);
    ctx.lineTo(chediX - 24, horizon - 16);
    ctx.lineTo(chediX - 30, horizon - 15);
    ctx.lineTo(chediX - 26, horizon);
    ctx.closePath();
    ctx.fill();

    // Tall Royal Bell-Shaped Chedi
    ctx.beginPath();
    ctx.moveTo(chediX - 21, horizon);
    ctx.lineTo(chediX - 17, horizon - 14);
    ctx.lineTo(chediX - 12, horizon - 14);
    ctx.lineTo(chediX - 10, horizon - 30);
    ctx.quadraticCurveTo(chediX - 8, horizon - 44, chediX - 3, horizon - 52);
    ctx.lineTo(chediX, horizon - 78);
    ctx.lineTo(chediX + 3, horizon - 52);
    ctx.quadraticCurveTo(chediX + 8, horizon - 44, chediX + 10, horizon - 30);
    ctx.lineTo(chediX + 12, horizon - 14);
    ctx.lineTo(chediX + 17, horizon - 14);
    ctx.lineTo(chediX + 21, horizon);
    ctx.closePath();
    ctx.fill();

    // Smaller companion Prang / stupa on the right of chedi
    ctx.beginPath();
    ctx.moveTo(chediX + 23, horizon);
    ctx.lineTo(chediX + 27, horizon - 18);
    ctx.quadraticCurveTo(chediX + 30, horizon - 32, chediX + 33, horizon - 42);
    ctx.quadraticCurveTo(chediX + 36, horizon - 32, chediX + 39, horizon - 18);
    ctx.lineTo(chediX + 43, horizon);
    ctx.closePath();
    ctx.fill();

    // Riverside Sala Pavilion on the right bank
    const salaX = viewWidth * 0.82;
    ctx.beginPath();
    ctx.moveTo(salaX - 24, horizon);
    ctx.lineTo(salaX - 20, horizon - 14);
    ctx.lineTo(salaX - 27, horizon - 15);
    ctx.lineTo(salaX, horizon - 29);
    ctx.lineTo(salaX + 27, horizon - 15);
    ctx.lineTo(salaX + 20, horizon - 14);
    ctx.lineTo(salaX + 24, horizon);
    ctx.closePath();
    ctx.fill();

    if (includePalms) {
      state.palms.forEach(p => {
        drawPalmTree(viewWidth * p.xRatio, horizon, p.height, p.lean, time * 0.0008 + p.phase);
      });
    }
  }

  // Draw distant horizon scenery (mountains, illuminated Thai temple, palms & riverbank lights)
  function drawFarHorizonSilhouettes(horizon, time) {
    // 1. Far misty mountain range
    ctx.fillStyle = 'rgba(14, 24, 52, 0.78)';
    traceMountainRidge(horizon);

    // 2. Warm floodlight aura behind the riverside temple & Sala
    const chediX = viewWidth * 0.22;
    const salaX = viewWidth * 0.82;
    const warmSprite = getGlowSprite('250, 204, 21');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22 + Math.sin(time * 0.0015) * 0.03;
    ctx.drawImage(warmSprite, chediX - 85, horizon - 88, 170, 100);
    ctx.globalAlpha = 0.15;
    ctx.drawImage(warmSprite, salaX - 45, horizon - 40, 90, 52);
    ctx.restore();

    // 3. Foreground riverbank silhouette, temple complex & coconut palms
    ctx.fillStyle = 'rgba(6, 10, 22, 0.97)';
    traceTempleSilhouette(horizon, time, true);

    // 4. Warm temple & festival shore lights
    state.riverLights.forEach(light => {
      const flicker = 0.48 + Math.sin(time * 0.004 + light.phase) * 0.28;
      ctx.fillStyle = `rgba(253, 224, 71, ${flicker})`;
      ctx.beginPath();
      ctx.arc(light.x, horizon - light.offsetY, light.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 2. Draw Flowing River with Temple/Horizon Reflections, Mist, Moon Shimmer & Distant Boat
  function drawRiver(time, moon, dt) {
    const horizon = getHorizonY();
    const waterHeight = viewHeight - horizon;

    const riverGrad = ctx.createLinearGradient(0, horizon, 0, viewHeight);
    riverGrad.addColorStop(0, '#0f2742');
    riverGrad.addColorStop(0.28, '#0a1c38');
    riverGrad.addColorStop(0.68, '#061126');
    riverGrad.addColorStop(1, '#020611');

    ctx.fillStyle = riverGrad;
    ctx.fillRect(0, horizon, viewWidth, waterHeight);

    // Inverted soft reflection of temple, palms & mountain ridge in water
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizon, viewWidth, 56);
    ctx.clip();
    ctx.translate(0, horizon * 1.45);
    ctx.scale(1, -0.45);
    ctx.fillStyle = 'rgba(4, 8, 20, 0.4)';
    traceTempleSilhouette(horizon, time, false);
    ctx.restore();

    // Reflected warm temple floodlight glow on the upper river
    const chediX = viewWidth * 0.22;
    const salaX = viewWidth * 0.82;
    const warmSprite = getGlowSprite('250, 204, 21');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.14;
    ctx.drawImage(warmSprite, chediX - 80, horizon - 4, 160, 50);
    ctx.globalAlpha = 0.1;
    ctx.drawImage(warmSprite, salaX - 40, horizon - 2, 80, 34);
    ctx.restore();

    // Soft reflections of distant bank lights on water edge
    state.riverLights.forEach(light => {
      const flicker = 0.18 + Math.sin(time * 0.004 + light.phase) * 0.09;
      ctx.fillStyle = `rgba(253, 224, 71, ${flicker})`;
      const refY = horizon + light.offsetY * 0.65 + 4;
      const sway = Math.sin(time * 0.003 + light.phase) * 2.5;
      ctx.fillRect(light.x - 3.5 + sway, refY, 7, 1.5);
    });

    // Distant slow rowboat with glowing bow lantern gliding near the horizon
    if (state.distantBoat) {
      const boat = state.distantBoat;
      boat.x += boat.dir * boat.speed * dt;
      if (boat.x < -60) boat.x = viewWidth + 60;
      if (boat.x > viewWidth + 60) boat.x = -60;

      const by = horizon + 12 + Math.sin(time * 0.002) * 0.8;
      ctx.save();
      ctx.fillStyle = 'rgba(7, 11, 25, 0.85)';
      ctx.beginPath();
      ctx.moveTo(boat.x - 16, by);
      ctx.quadraticCurveTo(boat.x, by + 4.5, boat.x + 16, by);
      ctx.lineTo(boat.x + 11, by + 3);
      ctx.lineTo(boat.x - 11, by + 3);
      ctx.closePath();
      ctx.fill();

      // Tiny silhouette rower & bow lantern
      ctx.fillRect(boat.x + 2, by - 5, 2.5, 5);
      const lx = boat.x - 11;
      const ly = by - 2.5;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(lx, ly, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
      ctx.fillRect(lx - 2.5, by + 5, 5, 1.5);
      ctx.restore();
    }

    // Translucent river mist blending the horizon seam
    const waterMist = ctx.createLinearGradient(0, horizon, 0, horizon + 36);
    waterMist.addColorStop(0, 'rgba(148, 163, 184, 0.09)');
    waterMist.addColorStop(1, 'rgba(148, 163, 184, 0)');
    ctx.fillStyle = waterMist;
    ctx.fillRect(0, horizon, viewWidth, 36);

    // Moonlight Shimmer Reflection Cone on Water
    const shimmerWidth = moon.moonR * 3.9;
    const shimmerGrad = ctx.createLinearGradient(moon.moonX - shimmerWidth, 0, moon.moonX + shimmerWidth, 0);
    shimmerGrad.addColorStop(0, 'rgba(254, 240, 138, 0)');
    shimmerGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.21)');
    shimmerGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

    ctx.fillStyle = shimmerGrad;
    ctx.beginPath();
    ctx.moveTo(moon.moonX - 24, horizon);
    ctx.lineTo(moon.moonX + 24, horizon);
    ctx.lineTo(moon.moonX + shimmerWidth * 1.55, viewHeight);
    ctx.lineTo(moon.moonX - shimmerWidth * 1.55, viewHeight);
    ctx.closePath();
    ctx.fill();

    // Perspective Moonlight Glints dancing on water ripples
    for (let y = horizon + 6; y < viewHeight; y += 14) {
      const depthFactor = (y - horizon) / Math.max(1, waterHeight);
      const halfSpan = 16 + depthFactor * shimmerWidth * 0.95;
      const glintW = 10 + depthFactor * 38;
      const offset = Math.sin(time * 0.0024 + y * 0.13) * halfSpan * 0.48;
      const alpha = (0.14 + Math.sin(time * 0.0042 + y * 0.21) * 0.08) * (0.75 + depthFactor * 0.35);

      ctx.strokeStyle = `rgba(254, 249, 195, ${Math.max(0.03, alpha)})`;
      ctx.lineWidth = 1.1 + depthFactor * 1.5;
      ctx.beginPath();
      ctx.moveTo(moon.moonX + offset - glintW * 0.5, y);
      ctx.lineTo(moon.moonX + offset + glintW * 0.5, y);
      ctx.stroke();

      if (depthFactor > 0.25) {
        const offset2 = Math.cos(time * 0.0019 + y * 0.17) * halfSpan * 0.72;
        ctx.strokeStyle = `rgba(254, 240, 138, ${Math.max(0.02, alpha * 0.55)})`;
        ctx.beginPath();
        ctx.moveTo(moon.moonX + offset2 - glintW * 0.28, y + 4);
        ctx.lineTo(moon.moonX + offset2 + glintW * 0.28, y + 4);
        ctx.stroke();
      }
    }

    // Firework & Sky Flash Reflections on Water
    state.skyFlashes.forEach(flash => {
      const refY = horizon + (horizon - flash.y) * 0.35 + 16;
      if (refY >= viewHeight) return;
      const sprite = getGlowSprite(flash.rgb);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = flash.alpha * 0.5;
      ctx.drawImage(sprite, flash.x - 120, refY - 22, 240, 44);
      ctx.restore();
    });

    // Flowing River Current Ripples (moving right-to-left with current)
    ctx.lineWidth = 1.1;
    for (let y = horizon + 7; y < viewHeight; y += 20) {
      const depthFactor = (y - horizon) / Math.max(1, waterHeight);
      const driftX = time * (0.02 + depthFactor * 0.035);
      const alpha = 0.04 + depthFactor * 0.08;
      ctx.strokeStyle = `rgba(186, 230, 253, ${alpha})`;

      ctx.beginPath();
      for (let x = -60; x < viewWidth + 60; x += 72) {
        const waveY = y + Math.sin((x + driftX) * 0.028 + y * 0.06) * (1.2 + depthFactor * 2.4);
        if (x === -60) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
  }

  // Subtle foreground reeds & lotus leaves framing the extreme bottom corners
  function drawForegroundFraming(time) {
    if (viewWidth < 480) return;
    ctx.save();
    ctx.fillStyle = 'rgba(3, 7, 18, 0.72)';
    ctx.strokeStyle = 'rgba(6, 18, 36, 0.85)';

    // Bottom-left reeds & lotus pads
    const swayL = Math.sin(time * 0.0011) * 4;
    ctx.lineWidth = 2.2;
    [
      { x: 14, h: 64, lean: 14 },
      { x: 24, h: 78, lean: 22 },
      { x: 36, h: 54, lean: 10 },
      { x: 48, h: 44, lean: 18 }
    ].forEach((reed, i) => {
      ctx.beginPath();
      ctx.moveTo(reed.x, viewHeight + 4);
      ctx.quadraticCurveTo(reed.x + reed.lean * 0.5, viewHeight - reed.h * 0.6, reed.x + reed.lean + swayL * (0.7 + i * 0.15), viewHeight - reed.h);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.ellipse(30, viewHeight - 8, 26, 7, -0.1, 0, Math.PI * 2);
    ctx.ellipse(66, viewHeight - 4, 18, 5, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Bottom-right reeds & lotus pads
    const swayR = Math.cos(time * 0.001) * 4;
    [
      { x: viewWidth - 14, h: 68, lean: -16 },
      { x: viewWidth - 26, h: 80, lean: -24 },
      { x: viewWidth - 40, h: 52, lean: -12 }
    ].forEach((reed, i) => {
      ctx.beginPath();
      ctx.moveTo(reed.x, viewHeight + 4);
      ctx.quadraticCurveTo(reed.x + reed.lean * 0.5, viewHeight - reed.h * 0.6, reed.x + reed.lean + swayR * (0.7 + i * 0.15), viewHeight - reed.h);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.ellipse(viewWidth - 32, viewHeight - 8, 28, 7, 0.1, 0, Math.PI * 2);
    ctx.ellipse(viewWidth - 68, viewHeight - 4, 18, 5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2.5. Draw Ambient Fireflies along the water/shore
  function updateAndDrawFireflies(time, dt) {
    const horizon = getHorizonY();
    state.fireflies.forEach(f => {
      f.x += (f.vx + Math.sin(time * 0.001 + f.phase) * 0.14) * dt;
      f.y += (f.vy + Math.cos(time * 0.0013 + f.phase) * 0.09) * dt;

      if (f.x < -10) f.x = viewWidth + 10;
      if (f.x > viewWidth + 10) f.x = -10;
      if (f.y < horizon - 35) f.y = horizon - 35;
      if (f.y > viewHeight - 30) f.y = horizon + 20;

      const glow = 0.25 + Math.max(0, Math.sin(time * 0.003 + f.phase * 3)) * 0.65;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(253, 224, 71, ${glow})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // Helper: trace specific sky lantern silhouette path
  function traceLanternShape(lx, ly, size, shape) {
    const h = size * 1.1;
    ctx.beginPath();
    if (shape === 'cylinder') {
      const w = size * 0.36;
      const ch = size * 1.24;
      ctx.moveTo(lx - w, ly + ch * 0.46);
      ctx.lineTo(lx - w * 1.04, ly - ch * 0.38);
      ctx.quadraticCurveTo(lx, ly - ch * 0.54, lx + w * 1.04, ly - ch * 0.38);
      ctx.lineTo(lx + w, ly + ch * 0.46);
      ctx.closePath();
      return { wBottom: w, h: ch };
    }
    if (shape === 'lotus') {
      const wMid = size * 0.58;
      const wBottom = size * 0.26;
      ctx.moveTo(lx - wBottom, ly + h * 0.48);
      ctx.bezierCurveTo(lx - wMid * 1.15, ly + h * 0.08, lx - wMid * 0.85, ly - h * 0.34, lx, ly - h * 0.62);
      ctx.bezierCurveTo(lx + wMid * 0.85, ly - h * 0.34, lx + wMid * 1.15, ly + h * 0.08, lx + wBottom, ly + h * 0.48);
      ctx.closePath();
      return { wBottom, h };
    }
    if (shape === 'diamond') {
      const wTop = size * 0.28;
      const wMid = size * 0.54;
      const wBottom = size * 0.27;
      ctx.moveTo(lx - wBottom, ly + h * 0.48);
      ctx.lineTo(lx - wMid, ly - h * 0.04);
      ctx.lineTo(lx - wTop, ly - h * 0.48);
      ctx.quadraticCurveTo(lx, ly - h * 0.58, lx + wTop, ly - h * 0.48);
      ctx.lineTo(lx + wMid, ly - h * 0.04);
      ctx.lineTo(lx + wBottom, ly + h * 0.48);
      ctx.closePath();
      return { wBottom, h };
    }
    if (shape === 'heart') {
      const w = size * 0.56;
      ctx.moveTo(lx, ly + h * 0.48);
      ctx.bezierCurveTo(lx - w * 1.25, ly + h * 0.14, lx - w * 1.15, ly - h * 0.55, lx, ly - h * 0.22);
      ctx.bezierCurveTo(lx + w * 1.15, ly - h * 0.55, lx + w * 1.25, ly + h * 0.14, lx, ly + h * 0.48);
      ctx.closePath();
      return { wBottom: size * 0.16, h };
    }
    // Default 'classic' Yee Peng tapered lantern
    const wTop = size * 0.48;
    const wBottom = size * 0.3;
    ctx.moveTo(lx - wBottom, ly + h * 0.48);
    ctx.quadraticCurveTo(lx - wTop * 1.12, ly - h * 0.1, lx - wTop * 0.72, ly - h * 0.46);
    ctx.quadraticCurveTo(lx, ly - h * 0.6, lx + wTop * 0.72, ly - h * 0.46);
    ctx.quadraticCurveTo(lx + wTop * 1.12, ly - h * 0.1, lx + wBottom, ly + h * 0.48);
    ctx.closePath();
    return { wBottom, h };
  }

  // Helper: draw decorative motifs inside clipped lantern body
  function drawLanternPattern(lx, ly, size, h, shape, pattern, palette) {
    ctx.save();
    ctx.strokeStyle = palette.trim;
    ctx.fillStyle = palette.trim;
    if (pattern === 'band') {
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(1.2, size * 0.075);
      ctx.beginPath();
      ctx.moveTo(lx - size * 0.6, ly - h * 0.04);
      ctx.quadraticCurveTo(lx, ly + h * 0.03, lx + size * 0.6, ly - h * 0.04);
      ctx.stroke();
      ctx.lineWidth = Math.max(0.8, size * 0.035);
      ctx.beginPath();
      ctx.moveTo(lx - size * 0.6, ly + h * 0.1);
      ctx.quadraticCurveTo(lx, ly + h * 0.16, lx + size * 0.6, ly + h * 0.1);
      ctx.stroke();
    } else if (pattern === 'stars') {
      ctx.globalAlpha = 0.72;
      [
        { dx: -size * 0.14, dy: -h * 0.1, r: size * 0.07 },
        { dx: size * 0.14, dy: -h * 0.04, r: size * 0.06 },
        { dx: 0, dy: h * 0.08, r: size * 0.08 }
      ].forEach(st => {
        ctx.beginPath();
        ctx.moveTo(lx + st.dx, ly + st.dy - st.r);
        ctx.lineTo(lx + st.dx + st.r * 0.3, ly + st.dy - st.r * 0.3);
        ctx.lineTo(lx + st.dx + st.r, ly + st.dy);
        ctx.lineTo(lx + st.dx + st.r * 0.3, ly + st.dy + st.r * 0.3);
        ctx.lineTo(lx + st.dx, ly + st.dy + st.r);
        ctx.lineTo(lx + st.dx - st.r * 0.3, ly + st.dy + st.r * 0.3);
        ctx.lineTo(lx + st.dx - st.r, ly + st.dy);
        ctx.lineTo(lx + st.dx - st.r * 0.3, ly + st.dy - st.r * 0.3);
        ctx.closePath();
        ctx.fill();
      });
    } else if (pattern === 'lotus_crest') {
      ctx.globalAlpha = 0.62;
      ctx.lineWidth = Math.max(0.9, size * 0.038);
      ctx.beginPath();
      ctx.arc(lx, ly - h * 0.04, size * 0.14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(lx, ly - h * 0.04, size * 0.055, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 'ribs': delicate curved vertical ribs
      ctx.globalAlpha = 0.34;
      ctx.lineWidth = Math.max(0.7, size * 0.03);
      ctx.beginPath();
      ctx.moveTo(lx, ly - h * 0.56);
      ctx.lineTo(lx, ly + h * 0.46);
      ctx.moveTo(lx - size * 0.15, ly - h * 0.46);
      ctx.quadraticCurveTo(lx - size * 0.26, ly, lx - size * 0.12, ly + h * 0.46);
      ctx.moveTo(lx + size * 0.15, ly - h * 0.46);
      ctx.quadraticCurveTo(lx + size * 0.26, ly, lx + size * 0.12, ly + h * 0.46);
      ctx.stroke();
    }
    if (shape === 'cylinder') {
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx - size * 0.4, ly - h * 0.18);
      ctx.lineTo(lx + size * 0.4, ly - h * 0.18);
      ctx.moveTo(lx - size * 0.4, ly + h * 0.18);
      ctx.lineTo(lx + size * 0.4, ly + h * 0.18);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Draw & Update Sky Lanterns (โคมลอยแบบสุ่มหน้าตา)
  function updateAndDrawLanterns(time, dt) {
    const horizon = getHorizonY();

    for (let i = state.lanterns.length - 1; i >= 0; i--) {
      const lantern = state.lanterns[i];
      lantern.life += dt;
      lantern.y += lantern.speedY * dt;
      lantern.x += (lantern.speedX + Math.sin(time * 0.05 * lantern.swaySpeed + lantern.swayPhase) * 0.4) * dt;
      lantern.size *= Math.pow(0.9995, dt);

      if (lantern.y < -50 || lantern.size < 4) {
        state.lanterns.splice(i, 1);
        continue;
      }

      // Easter Egg: Collision with Airplane!
      if (state.airplane && !state.airplane.isCrashing && !state.airplane.isDead) {
        const dx = lantern.x - state.airplane.x;
        const dy = lantern.y - state.airplane.y;
        if (Math.abs(dx) < 38 && Math.abs(dy) < 22) {
          triggerPlaneCrash(state.airplane, lantern.x, lantern.y, true);
          state.lanterns.splice(i, 1);
          continue;
        }
      }

      const palette = LANTERN_PALETTES[lantern.paletteKey] || LANTERN_PALETTES.amber;
      const glowSprite = getGlowSprite(palette.rgb);

      // Warm reflection on water while lantern is still low
      if (lantern.y > horizon * 0.22 && lantern.y < horizon + 70) {
        const heightAbove = Math.max(4, horizon - lantern.y);
        const refY = horizon + Math.min(80, heightAbove * 0.28 + 10);
        const refAlpha = Math.max(0, 0.22 - heightAbove / 450);
        if (refAlpha > 0.01) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = refAlpha;
          const rw = lantern.size * 2.2;
          ctx.drawImage(glowSprite, lantern.x - rw, refY - rw * 0.22, rw * 2, rw * 0.44);
          ctx.restore();
        }
      }

      ctx.save();
      const gentleTilt = Math.sin(time * 0.0022 + lantern.tiltSeed) * 0.07;
      ctx.translate(lantern.x, lantern.y);
      ctx.rotate(gentleTilt);

      // Additive halo
      const haloR = lantern.size * 2.15;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.56;
      ctx.drawImage(glowSprite, -haloR, -haloR, haloR * 2, haloR * 2);
      ctx.restore();

      const bodyGrad = ctx.createRadialGradient(
        0,
        lantern.size * 0.22,
        lantern.size * 0.08,
        0,
        0,
        lantern.size * 0.9
      );
      bodyGrad.addColorStop(0, palette.inner);
      bodyGrad.addColorStop(0.55, palette.mid);
      bodyGrad.addColorStop(1, palette.edge);

      const dims = traceLanternShape(0, 0, lantern.size, lantern.shape);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Clip interior to draw decorative pattern cleanly inside lantern silhouette
      ctx.save();
      ctx.clip();
      drawLanternPattern(0, 0, lantern.size, dims.h, lantern.shape, lantern.pattern, palette);
      ctx.restore();

      // Subtle outline
      ctx.strokeStyle = palette.edge;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Optional hanging golden tassel beneath lantern
      if (lantern.hasTassel) {
        ctx.strokeStyle = palette.trim;
        ctx.globalAlpha = 0.72;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(0, dims.h * 0.48);
        ctx.quadraticCurveTo(Math.sin(time * 0.004 + lantern.tiltSeed) * 3, dims.h * 0.62, 0, dims.h * 0.74);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Flame burner glow at bottom opening
      ctx.fillStyle = palette.edge;
      ctx.beginPath();
      ctx.ellipse(0, dims.h * 0.46, dims.wBottom * 0.7, lantern.size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, dims.h * 0.36, lantern.size * 0.13, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // 3.5. Update & Draw Crash Smoke Particles
  function updateAndDrawSmoke(dt) {
    for (let i = state.smokeParticles.length - 1; i >= 0; i--) {
      const p = state.smokeParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += 0.35 * dt;
      p.alpha -= p.decay * dt;

      if (p.alpha <= 0) {
        state.smokeParticles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 3.6. Draw & Update Easter Egg Airplane
  function updateAndDrawAirplane(time, dt) {
    const plane = state.airplane;
    if (!plane || plane.isDead) return;

    const horizon = getHorizonY();

    plane.x += plane.vx * dt;
    plane.y += plane.vy * dt;

    if (plane.isCrashing) {
      plane.vy += 0.08 * dt;
      plane.vx *= Math.pow(0.992, dt);
      const targetAngle = plane.goingRight ? 0.85 : -0.85;
      plane.angle += (targetAngle - plane.angle) * Math.min(1, 0.04 * dt);

      for (let i = 0; i < 2; i++) {
        state.smokeParticles.push({
          x: plane.x + (Math.random() - 0.5) * 10,
          y: plane.y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 1.2,
          vy: -Math.random() * 1.5,
          size: Math.random() * 6 + 6,
          alpha: 0.9,
          decay: Math.random() * 0.02 + 0.015,
          color: Math.random() > 0.4 ? '40, 40, 50' : (Math.random() > 0.5 ? '239, 68, 68' : '245, 158, 11')
        });
      }

      if (plane.y >= horizon + 15) {
        plane.isDead = true;
        state.airplane = null;

        const splashParticles = [];
        for (let s = 0; s < 45; s++) {
          const a = -Math.PI * (0.15 + Math.random() * 0.7);
          const spd = Math.random() * 7 + 2;
          const color = Math.random() > 0.5 ? '#38bdf8' : '#ffffff';
          splashParticles.push({
            x: plane.x + (Math.random() - 0.5) * 20,
            y: horizon + 15,
            prevX: plane.x,
            prevY: horizon + 15,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            alpha: 1,
            color,
            rgb: hexToRgbTuple(color),
            size: Math.random() * 3 + 2,
            drag: 0.95,
            decay: 0.022
          });
        }
        state.fireworks.push({ particles: splashParticles });

        if (window.soundEngine) {
          window.soundEngine.playSplash();
        }
        return;
      }
    } else {
      if ((plane.goingRight && plane.x > viewWidth + 120) || (!plane.goingRight && plane.x < -120)) {
        state.airplane = null;
        return;
      }
    }

    // Draw Plane Body
    ctx.save();
    ctx.translate(plane.x, plane.y);
    ctx.rotate(plane.angle);
    if (!plane.goingRight) {
      ctx.scale(-1, 1);
    }

    ctx.fillStyle = plane.isCrashing ? '#334155' : '#f1f5f9';
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(26, -5);
    ctx.quadraticCurveTo(36, 0, 26, 5);
    ctx.fill();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(22, -4);
    ctx.lineTo(27, -1);
    ctx.lineTo(24, 1);
    ctx.lineTo(19, -2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = plane.isCrashing ? '#1e293b' : '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-14, 20);
    ctx.lineTo(-4, 20);
    ctx.lineTo(8, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-22, -4);
    ctx.lineTo(-32, -20);
    ctx.lineTo(-23, -20);
    ctx.lineTo(-14, -4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = plane.isCrashing ? '#ef4444' : '#fef08a';
    for (let wx = -18; wx <= 16; wx += 5.5) {
      ctx.fillRect(wx, -2, 2.5, 2);
    }

    const strobe = (Math.floor(time * 0.003) % 2) === 0;
    if (strobe && !plane.isCrashing) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-27, -20, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(-8, 20, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-8, -6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 4. Draw & Update Fireworks (Additive glowing velocity trails)
  function updateAndDrawFireworks(dt) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = state.fireworks.length - 1; i >= 0; i--) {
      const fw = state.fireworks[i];
      let aliveCount = 0;

      for (let j = 0; j < fw.particles.length; j++) {
        const p = fw.particles[j];
        p.prevX = p.x;
        p.prevY = p.y;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const dragFactor = Math.pow(p.drag, dt);
        p.vx *= dragFactor;
        p.vy = p.vy * dragFactor + 0.08 * dt;
        p.alpha -= p.decay * dt;

        if (p.alpha > 0) {
          aliveCount++;
          const a = Math.max(0, p.alpha);

          // Glowing velocity trail
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = a * 0.65;
          ctx.lineWidth = p.size * 0.9;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.prevX, p.prevY);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();

          // Bright glowing head
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = a * 0.9;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.65, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (aliveCount === 0) {
        state.fireworks.splice(i, 1);
      }
    }

    ctx.restore();
  }

  // 5. Update Organic River Physics & Draw Krathongs with Shadows & Reflections
  function updateAndDrawKrathongs(time, dt) {
    const horizon = getHorizonY();
    const minY = horizon + 24;
    const maxY = Math.max(minY + 10, viewHeight - 56);
    const list = state.krathongs;
    const count = list.length;

    // 5a. Soft hydrodynamic separation so krathongs glide around each other smoothly
    for (let i = 0; i < count; i++) {
      const a = list[i];
      for (let j = i + 1; j < count; j++) {
        const b = list[j];
        const dx = a.x - b.x;
        const dy = a.baseY - b.baseY;
        const minDx = (a.width + b.width) * 0.36;
        const minDy = (a.height + b.height) * 0.24;

        if (Math.abs(dx) < minDx && Math.abs(dy) < minDy) {
          const overlapX = 1 - Math.abs(dx) / minDx;
          const overlapY = 1 - Math.abs(dy) / minDy;
          const strength = overlapX * overlapY * 0.045 * dt;
          const signY = dy === 0 ? (i % 2 === 0 ? -1 : 1) : Math.sign(dy);
          const signX = dx === 0 ? -1 : Math.sign(dx);

          a.vy += signY * strength;
          b.vy -= signY * strength;
          a.x += signX * strength * 0.6;
          b.x -= signX * strength * 0.6;
        }
      }
    }

    // 5b. Update positions, wave bobbing, and wraparound
    for (let i = 0; i < count; i++) {
      const k = list[i];

      // Wave surge modulation along the river current
      const waveSurge = 1 + Math.sin(time * 0.0012 + k.phase + k.x * 0.004) * 0.16;
      k.x += k.baseSpeed * waveSurge * dt;

      // Gentle river meander + spring back to assigned depth lane
      const meander = Math.sin(time * 0.0007 + k.x * 0.003 + k.phase) * 0.015 * dt;
      const laneRestore = (k.anchorY - k.baseY) * 0.0045 * dt;
      k.vy = (k.vy + meander + laneRestore) * Math.pow(0.93, dt);
      k.baseY = Math.max(minY, Math.min(maxY, k.baseY + k.vy * dt));

      updateKrathongDepthGeometry(k);

      // Drop-in settling animation for newly launched own krathong
      if (k.dropProgress < 1) {
        k.dropProgress = Math.min(1, k.dropProgress + 0.028 * dt);
      }
      if (k.entryRipple < 1) {
        k.entryRipple = Math.min(1, k.entryRipple + 0.018 * dt);
      }
      const easeOut = 1 - Math.pow(1 - k.dropProgress, 3);
      const dropOffset = (1 - easeOut) * 28;

      // Multi-harmonic wave bobbing & rocking
      const bob =
        Math.sin(time * 0.0016 + k.phase) * k.bobAmp +
        Math.sin(time * 0.0029 + k.phase * 1.7) * (k.bobAmp * 0.35);
      k.y = k.baseY + bob - dropOffset;
      k.rockAngle =
        Math.cos(time * 0.0014 + k.phase) * 0.048 +
        Math.sin(time * 0.0025 + k.phase) * 0.018;

      // Wrap around screen seamlessly
      if (k.x < -k.width - 60) {
        k.x = viewWidth + 85 + Math.random() * 110;
        const depth = Math.random();
        k.anchorY = minY + depth * (maxY - minY);
        k.baseY = k.anchorY;
        k.vy = 0;
        updateKrathongDepthGeometry(k);
      }
    }

    // Always maintain strict depth order (back-to-front)
    list.sort((a, b) => a.baseY - b.baseY);

    // 5c. Render shadows, reflections, ripples, krathongs & additive candle glow
    for (let i = 0; i < count; i++) {
      const k = list[i];

      // Smooth fade near horizontal screen borders
      let edgeAlpha = 1;
      if (k.x > viewWidth - 20) {
        edgeAlpha = Math.max(0, 1 - (k.x - (viewWidth - 20)) / 95);
      } else if (k.x < 20) {
        edgeAlpha = Math.max(0, 1 - (20 - k.x) / 95);
      }
      if (edgeAlpha <= 0.01) continue;

      const candleRgb = getCandleRgb(k.config.candle);
      const glowSprite = getGlowSprite(candleRgb);
      const flicker =
        0.78 +
        Math.sin(time * 0.013 + k.phase * 5) * 0.12 +
        Math.sin(time * 0.031 + k.phase * 9) * 0.08;

      ctx.save();
      ctx.globalAlpha = edgeAlpha;
      ctx.translate(k.x, k.y);

      // 1) Wake & Multi-ring Expanding Water Ripples (drawn flat in water perspective)
      ctx.save();
      ctx.scale(1, 0.32);

      // Subtle trailing wake behind krathong (towards +X since current flows -X)
      const wakeAlpha = 0.09 * edgeAlpha;
      ctx.strokeStyle = `rgba(186, 230, 253, ${wakeAlpha})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(k.width * 0.18, k.height * 0.72);
      ctx.quadraticCurveTo(k.width * 0.58, k.height * 0.92, k.width * 0.92, k.height * 1.15);
      ctx.moveTo(k.width * 0.18, k.height * 0.95);
      ctx.quadraticCurveTo(k.width * 0.56, k.height * 0.75, k.width * 0.88, k.height * 0.55);
      ctx.stroke();

      // Two staggered expanding circular wave rings
      for (let rIdx = 0; rIdx < 2; rIdx++) {
        const ringPhase = ((time * 0.00055 + k.phase * 0.3 + rIdx * 0.5) % 1);
        const radius = k.width * (0.42 + ringPhase * 0.42);
        const ringAlpha = (1 - ringPhase) * (k.isMine ? 0.34 : 0.18);
        ctx.strokeStyle = k.isMine
          ? `rgba(253, 224, 71, ${ringAlpha})`
          : `rgba(254, 240, 138, ${ringAlpha})`;
        ctx.lineWidth = 1.8 - ringPhase * 0.8;
        ctx.beginPath();
        ctx.arc(ringPhase * k.width * 0.16, k.height * 0.85, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Entry splash ripple when newly placed in water
      if (k.entryRipple < 1) {
        const er = k.width * (0.35 + k.entryRipple * 0.95);
        ctx.strokeStyle = `rgba(254, 240, 138, ${(1 - k.entryRipple) * 0.55})`;
        ctx.lineWidth = 2.6 * (1 - k.entryRipple);
        ctx.beginPath();
        ctx.arc(0, k.height * 0.85, er, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // 2) Contact Shadow beneath the krathong base on the water
      ctx.save();
      ctx.fillStyle = 'rgba(2, 6, 23, 0.52)';
      ctx.beginPath();
      ctx.ellipse(0, k.height * 0.28, k.width * 0.43, k.height * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3) Soft Inverted Water Reflection of the Krathong Bitmap
      if (k.img) {
        ctx.save();
        ctx.translate(0, k.height * 0.46);
        ctx.scale(1, -0.42);
        ctx.rotate(-k.rockAngle * 0.6);
        ctx.globalAlpha = edgeAlpha * 0.18;
        ctx.drawImage(k.img, -k.width / 2, -k.height / 2, k.width, k.height);
        ctx.restore();
      }

      // 4) Shimmering Candle Reflection Bands on the Water Surface
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 5; b++) {
        const bandY = k.height * (0.34 + b * 0.085);
        const bandW = k.width * (0.28 - b * 0.038) * (0.88 + flicker * 0.16);
        const swayX = Math.sin(time * 0.004 + b * 1.4 + k.phase) * (4 + b * 1.6) * k.scale;
        const bandAlpha = (0.26 - b * 0.042) * flicker * edgeAlpha;
        ctx.fillStyle = `rgba(${candleRgb}, ${Math.max(0.02, bandAlpha)})`;
        ctx.beginPath();
        ctx.ellipse(swayX, bandY, bandW, 2.1 * k.scale, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 5) Draw Tilted Krathong Body + Additive Candle Aura
      ctx.save();
      ctx.rotate(k.rockAngle);

      if (k.img) {
        ctx.drawImage(k.img, -k.width / 2, -k.height / 2, k.width, k.height);
      }

      // Dynamic additive candle flame bloom & water bounce light
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const flameY = -k.height * 0.22;
      const auraR = k.width * 0.68 * (0.95 + flicker * 0.08);
      ctx.globalAlpha = 0.42 * flicker * edgeAlpha;
      ctx.drawImage(glowSprite, -auraR, flameY - auraR, auraR * 2, auraR * 2);

      // Soft warm glow cast on the water right in front of the krathong
      const waterGlowR = k.width * 0.55;
      ctx.globalAlpha = 0.18 * flicker * edgeAlpha;
      ctx.drawImage(glowSprite, -waterGlowR, k.height * 0.24 - waterGlowR * 0.45, waterGlowR * 2, waterGlowR * 0.9);
      ctx.restore();

      // Hover / Own Highlight state
      const isHovered = state.hoveredKrathong === k;
      if (isHovered || k.isMine) {
        if (isHovered) {
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, k.width * 0.55, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.font = '600 12.5px Prompt, sans-serif';
        const text = k.isMine ? `✨ ${k.name} (ของคุณ)` : `🪷 ${k.name}`;
        const metrics = ctx.measureText(text);
        const tagW = metrics.width + 16;
        const tagH = 24;

        ctx.fillStyle = k.isMine ? 'rgba(120, 53, 15, 0.88)' : 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = k.isMine ? '#fde047' : '#f59e0b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        drawRoundRect(-tagW / 2, -k.height * 0.6 - tagH, tagW, tagH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText(text, 0, -k.height * 0.6 - 7);
      }

      ctx.restore();
      ctx.restore();
    }
  }

  // Main Canvas Render Loop
  let lastTime = 0;
  function animate(time) {
    const dt = lastTime ? Math.min((time - lastTime) / 16.6667, 3) : 1;
    lastTime = time;

    ctx.clearRect(0, 0, viewWidth, viewHeight);

    const moon = drawSkyAndMoon(time, dt);
    drawRiver(time, moon, dt);
    updateAndDrawFireflies(time, dt);
    updateAndDrawLanterns(time, dt);
    updateAndDrawSmoke(dt);
    updateAndDrawAirplane(time, dt);
    updateAndDrawFireworks(dt);
    updateAndDrawKrathongs(time, dt);
    drawForegroundFraming(time);

    requestAnimationFrame(animate);
  }

  // --- INTERACTION & CLICK HIT TEST ---

  function findKrathongAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (let i = state.krathongs.length - 1; i >= 0; i--) {
      const k = state.krathongs[i];
      const dx = (x - k.x) / Math.max(1, k.width * 0.48);
      const dy = (y - k.y) / Math.max(1, k.height * 0.50);
      if (dx * dx + dy * dy <= 1) {
        return k;
      }
    }
    return null;
  }

  function isPointOnAirplane(clientX, clientY) {
    if (!state.airplane || state.airplane.isCrashing || state.airplane.isDead) return false;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return Math.abs(x - state.airplane.x) < 48 && Math.abs(y - state.airplane.y) < 28;
  }

  function launchFireworkAction(x, y) {
    const horizon = getHorizonY();
    spawnFirework(x, y);
    if (socket && socket.connected) {
      socket.emit('launch-firework', {
        x: x / viewWidth,
        y: y / Math.max(1, horizon)
      });
    }
  }

  function launchLanternAction() {
    let targetXPercent = Math.random() * 0.7 + 0.15;
    if (state.airplane && !state.airplane.isCrashing && !state.airplane.isDead) {
      if (Math.random() > 0.4) {
        const lead = state.airplane.goingRight ? 0.08 : -0.08;
        targetXPercent = Math.max(0.1, Math.min(0.9, (state.airplane.x / viewWidth) + lead));
      }
    }
    const appearance = spawnLantern(targetXPercent);
    if (window.soundEngine) {
      window.soundEngine.playLantern();
    }
    if (socket && socket.connected) {
      socket.emit('launch-lantern', {
        x: targetXPercent,
        shape: appearance.shape,
        palette: appearance.palette,
        pattern: appearance.pattern
      });
    }
    showToast('🏮 ปล่อยโคมลอยขึ้นฟ้าแล้ว');
  }

  canvas.addEventListener('mousemove', (e) => {
    const k = findKrathongAt(e.clientX, e.clientY);
    state.hoveredKrathong = k;
    state.hoveredPlane = !k && isPointOnAirplane(e.clientX, e.clientY);
    canvas.style.cursor = k ? 'pointer' : (state.hoveredPlane ? 'crosshair' : 'default');
  });

  canvas.addEventListener('click', (e) => {
    const k = findKrathongAt(e.clientX, e.clientY);
    if (k) {
      openDetailModal(k);
      return;
    }

    if (isPointOnAirplane(e.clientX, e.clientY)) {
      triggerPlaneCrash(state.airplane, state.airplane.x, state.airplane.y, true);
      return;
    }

    const horizon = getHorizonY();
    if (e.clientY < horizon) {
      launchFireworkAction(e.clientX, e.clientY);
    }
  });

  // --- MODALS & UI LOGIC ---

  function setModalOpen(overlay, isOpen) {
    if (!overlay) return;
    overlay.classList.toggle('open', isOpen);
    overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }

  function clearWishValidationError() {
    authorWishInput.classList.remove('input-error');
    if (wishErrorEl) wishErrorEl.textContent = '';
  }

  // Update Live Preview in Modal
  function updatePreview() {
    if (!previewContainer) return;
    previewContainer.innerHTML = KrathongArt.generateSVG(state.currentConfig);
    const baseInfo = KrathongArt.BASES[state.currentConfig.base];
    const flowerInfo = KrathongArt.FLOWERS[state.currentConfig.flower];
    const decorInfo = KrathongArt.DECORATIONS && KrathongArt.DECORATIONS[state.currentConfig.decor];
    if (previewBaseName && baseInfo) previewBaseName.textContent = baseInfo.name;
    if (previewFlowerName && flowerInfo) previewFlowerName.textContent = flowerInfo.name;
    if (previewDesc && baseInfo && flowerInfo) {
      const decorText = (decorInfo && state.currentConfig.decor !== 'none') ? ` • ${decorInfo.name}` : '';
      previewDesc.textContent = `${baseInfo.desc} • ${flowerInfo.desc}${decorText}`;
    }
  }

  function syncChipGroupUI(selector, datasetKey, selectedValue) {
    document.querySelectorAll(selector).forEach(btn => {
      const isMatch = btn.dataset[datasetKey] === selectedValue;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
    });
  }

  function syncIncenseToggleUI() {
    if (!incenseToggleBtn) return;
    incenseToggleBtn.classList.toggle('active', state.currentConfig.incense);
    incenseToggleBtn.setAttribute('aria-pressed', state.currentConfig.incense ? 'true' : 'false');
    incenseToggleBtn.textContent = state.currentConfig.incense ? '🙏 ธูป 3 ดอก' : '🚫 ไม่ใส่ธูป';
  }

  function randomizeKrathongConfig() {
    state.currentConfig.base = pickRandomItem(Object.keys(KrathongArt.BASES));
    state.currentConfig.flower = pickRandomItem(Object.keys(KrathongArt.FLOWERS));
    state.currentConfig.candle = pickRandomItem(Object.keys(KrathongArt.CANDLES));
    state.currentConfig.coin = pickRandomItem(Object.keys(KrathongArt.COINS));
    state.currentConfig.decor = pickRandomItem(Object.keys(KrathongArt.DECORATIONS));
    state.currentConfig.incense = Math.random() > 0.2;

    syncChipGroupUI('#baseOptions .chip', 'base', state.currentConfig.base);
    syncChipGroupUI('#flowerOptions .chip', 'flower', state.currentConfig.flower);
    syncChipGroupUI('#candleOptions .chip', 'candle', state.currentConfig.candle);
    syncChipGroupUI('#coinOptions .chip', 'coin', state.currentConfig.coin);
    syncChipGroupUI('#decorOptions .chip', 'decor', state.currentConfig.decor);
    syncIncenseToggleUI();
    updatePreview();

    if (window.soundEngine) {
      window.soundEngine.playLike();
    }
  }

  function bindChipGroup(selector, stateKey, datasetKey) {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        state.currentConfig[stateKey] = btn.dataset[datasetKey];
        updatePreview();
      });
    });
  }

  function setupOptionChips() {
    bindChipGroup('#baseOptions .chip', 'base', 'base');
    bindChipGroup('#flowerOptions .chip', 'flower', 'flower');
    bindChipGroup('#candleOptions .chip', 'candle', 'candle');
    bindChipGroup('#coinOptions .chip', 'coin', 'coin');
    bindChipGroup('#decorOptions .chip', 'decor', 'decor');

    if (randomizeKrathongBtn) {
      randomizeKrathongBtn.addEventListener('click', randomizeKrathongConfig);
    }

    if (incenseToggleBtn) {
      incenseToggleBtn.addEventListener('click', () => {
        state.currentConfig.incense = !state.currentConfig.incense;
        syncIncenseToggleUI();
        updatePreview();
      });
    }

    document.querySelectorAll('.quick-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const wish = pill.dataset.wish || '';
        authorWishInput.value = wish;
        charNumEl.textContent = wish.length;
        clearWishValidationError();
      });
    });

    authorWishInput.addEventListener('input', () => {
      charNumEl.textContent = authorWishInput.value.length;
      if (authorWishInput.value.trim()) {
        clearWishValidationError();
      }
    });
  }

  function showToast(msg) {
    toastMsg.textContent = msg;
    toastNotification.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 4000);
  }

  function openCreateModal() {
    clearWishValidationError();
    updatePreview();
    setModalOpen(createModalOverlay, true);
  }

  function closeCreateModal() {
    setModalOpen(createModalOverlay, false);
  }

  function openListModal() {
    renderRecentList();
    setModalOpen(listModalOverlay, true);
  }

  function closeListModal() {
    setModalOpen(listModalOverlay, false);
  }

  function renderRecentList() {
    if (!recentKrathongsList) return;
    const sorted = state.krathongs
      .slice()
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (sorted.length === 0) {
      recentKrathongsList.innerHTML = '<div class="recent-empty">ยังไม่มีกระทงในสายน้ำ ลองสร้างกระทงใบแรกดูสิครับ 🪷</div>';
      return;
    }

    recentKrathongsList.innerHTML = '';
    sorted.forEach(k => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `recent-item${k.isMine ? ' is-mine' : ''}`;

      const thumb = document.createElement('div');
      thumb.className = 'recent-item-thumb';
      thumb.innerHTML = KrathongArt.generateSVG(k.config);

      const content = document.createElement('div');
      content.className = 'recent-item-content';

      const top = document.createElement('div');
      top.className = 'recent-item-top';

      const authorSpan = document.createElement('span');
      authorSpan.className = 'recent-item-author';
      authorSpan.textContent = k.name;
      if (k.isMine) {
        const badge = document.createElement('span');
        badge.className = 'recent-item-mine-badge';
        badge.textContent = 'ของคุณ';
        authorSpan.appendChild(badge);
      }

      const metaSpan = document.createElement('span');
      metaSpan.className = 'recent-item-meta';
      metaSpan.textContent = `${formatTimeAgo(k.timestamp)} • ❤️ ${k.likes || 0}`;

      top.appendChild(authorSpan);
      top.appendChild(metaSpan);

      const wishP = document.createElement('div');
      wishP.className = 'recent-item-wish';
      wishP.textContent = k.wish;

      content.appendChild(top);
      content.appendChild(wishP);
      btn.appendChild(thumb);
      btn.appendChild(content);

      btn.addEventListener('click', () => {
        closeListModal();
        openDetailModal(k);
      });

      recentKrathongsList.appendChild(btn);
    });
  }

  openCreateModalBtn.addEventListener('click', openCreateModal);
  if (mobileCreateBtn) mobileCreateBtn.addEventListener('click', openCreateModal);
  closeCreateModalBtn.addEventListener('click', closeCreateModal);
  createModalOverlay.addEventListener('click', (e) => {
    if (e.target === createModalOverlay) closeCreateModal();
  });

  if (openListModalBtn) openListModalBtn.addEventListener('click', openListModal);
  if (mobileListBtn) mobileListBtn.addEventListener('click', openListModal);
  if (closeListModalBtn) closeListModalBtn.addEventListener('click', closeListModal);
  if (listModalOverlay) {
    listModalOverlay.addEventListener('click', (e) => {
      if (e.target === listModalOverlay) closeListModal();
    });
  }

  // Submit & Float Krathong
  submitFloatBtn.addEventListener('click', () => {
    const name = authorNameInput.value.trim() || 'ผู้ไม่ประสงค์ออกนาม';
    const wish = authorWishInput.value.trim();

    if (!wish) {
      authorWishInput.classList.remove('input-error');
      void authorWishInput.offsetWidth;
      authorWishInput.classList.add('input-error');
      if (wishErrorEl) wishErrorEl.textContent = 'กรุณาพิมพ์คำอธิษฐานก่อนลอยกระทง';
      showToast('⚠️ กรุณาพิมพ์คำอธิษฐานก่อนลอยกระทง');
      authorWishInput.focus();
      return;
    }

    const payload = {
      name,
      wish,
      base: state.currentConfig.base,
      flower: state.currentConfig.flower,
      candle: state.currentConfig.candle,
      coin: state.currentConfig.coin,
      decor: state.currentConfig.decor,
      incense: state.currentConfig.incense
    };

    if (socket && socket.connected) {
      state.pendingOwnMatch = {
        name: payload.name,
        wish: payload.wish,
        base: payload.base,
        flower: payload.flower,
        decor: payload.decor,
        expiresAt: Date.now() + 5000
      };
      socket.emit('float-krathong', payload, (res) => {
        if (res && res.krathong) {
          addKrathongToRiver(res.krathong, true);
        }
      });
    } else {
      fetch('/api/krathongs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(r => r.json())
        .then(data => {
          if (data && data.krathong) {
            addKrathongToRiver(data.krathong, true);
          }
        })
        .catch(console.error);
    }

    if (window.soundEngine) {
      window.soundEngine.playChime();
      window.soundEngine.playSplash();
    }

    launchFireworkAction(viewWidth * 0.5, viewHeight * 0.25);

    closeCreateModal();
    showToast(`🪷 ลอยกระทงของคุณ "${name}" เรียบร้อยแล้ว ขอให้สมดังปรารถนา`);

    authorWishInput.value = '';
    charNumEl.textContent = '0';
    clearWishValidationError();
  });

  // Detail Modal
  function openDetailModal(krathong) {
    state.selectedKrathong = krathong;
    detailAuthor.textContent = krathong.isMine ? `${krathong.name} (ของคุณ)` : krathong.name;
    detailWishText.textContent = krathong.wish;
    detailLikesCount.textContent = krathong.likes || 0;
    detailTime.textContent = formatTimeAgo(krathong.timestamp);

    detailKrathongVisual.innerHTML = KrathongArt.generateSVG(krathong.config);
    setModalOpen(detailModalOverlay, true);

    if (window.soundEngine) {
      window.soundEngine.playChime();
    }
  }

  function closeDetailModal() {
    setModalOpen(detailModalOverlay, false);
    state.selectedKrathong = null;
  }

  closeDetailModalBtn.addEventListener('click', closeDetailModal);
  detailModalOverlay.addEventListener('click', (e) => {
    if (e.target === detailModalOverlay) closeDetailModal();
  });

  // Like / ส่งกำลังใจ
  likeKrathongBtn.addEventListener('click', () => {
    if (!state.selectedKrathong || isLiking) return;
    const target = state.selectedKrathong;
    const prevLikes = target.likes || 0;
    isLiking = true;
    likeKrathongBtn.disabled = true;

    target.likes = prevLikes + 1;
    detailLikesCount.textContent = target.likes;

    likeKrathongBtn.classList.remove('liked-pop');
    void likeKrathongBtn.offsetWidth;
    likeKrathongBtn.classList.add('liked-pop');

    if (window.soundEngine) {
      window.soundEngine.playLike();
    }

    fetch(`/api/krathongs/${encodeURIComponent(target.id)}/like`, { method: 'POST' })
      .then(async res => {
        if (!res.ok) throw new Error('Like failed');
        return res.json();
      })
      .then(data => {
        if (typeof data.likes === 'number') {
          target.likes = data.likes;
          if (state.selectedKrathong && state.selectedKrathong.id === target.id) {
            detailLikesCount.textContent = data.likes;
          }
        }
        showToast(`❤️ ส่งกำลังใจให้คุณ "${target.name}" แล้ว`);
      })
      .catch(() => {
        target.likes = prevLikes;
        if (state.selectedKrathong && state.selectedKrathong.id === target.id) {
          detailLikesCount.textContent = prevLikes;
        }
        showToast('⚠️ ไม่สามารถส่งกำลังใจได้ในขณะนี้');
      })
      .finally(() => {
        isLiking = false;
        likeKrathongBtn.disabled = false;
      });
  });

  function formatTimeAgo(timestamp) {
    if (!timestamp) return 'เมื่อสักครู่';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'เมื่อสักครู่';
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    return `${Math.floor(diff / 86400)} วันที่แล้ว`;
  }

  function syncSoundButtonUI(enabled) {
    soundIcon.textContent = enabled ? '🔊' : '🔇';
    soundToggleBtn.title = enabled ? 'ปิดเสียงบรรยากาศ' : 'เปิดเสียงบรรยากาศ';
    soundToggleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  }

  soundToggleBtn.addEventListener('click', () => {
    if (window.soundEngine) {
      const enabled = window.soundEngine.toggle();
      syncSoundButtonUI(enabled);
      showToast(enabled ? '🔊 เปิดเสียงบรรยากาศแล้ว' : '🔇 ปิดเสียงแล้ว');
    }
  });

  skyLanternBtn.addEventListener('click', launchLanternAction);
  if (mobileLanternBtn) mobileLanternBtn.addEventListener('click', launchLanternAction);

  function triggerRandomFirework() {
    const horizon = getHorizonY();
    const x = Math.random() * Math.max(100, viewWidth - 200) + 100;
    const y = Math.random() * Math.max(40, horizon * 0.6) + 40;
    launchFireworkAction(x, y);
  }
  fireworksBtn.addEventListener('click', triggerRandomFirework);
  if (mobileFireworkBtn) mobileFireworkBtn.addEventListener('click', triggerRandomFirework);

  if (hintCloseBtn) {
    hintCloseBtn.addEventListener('click', () => {
      hintBanner.style.display = 'none';
    });
  }

  // --- SOCKET EVENT HANDLERS ---
  if (socket) {
    socket.on('connect', () => {
      socket.emit('request-initial');
    });
    if (socket.connected) {
      socket.emit('request-initial');
    }

    socket.on('initial-data', (data) => {
      if (data.totalFloated !== undefined) {
        state.totalFloated = data.totalFloated;
        totalFloatedCountEl.textContent = data.totalFloated.toLocaleString();
      }
      if (data.onlineUsers !== undefined) {
        state.onlineUsers = data.onlineUsers;
        onlineUsersCountEl.textContent = data.onlineUsers;
      }
      if (data.recent) {
        initKrathongs(data.recent);
      }
    });

    socket.on('stats-updated', (data) => {
      if (data.totalFloated !== undefined) {
        state.totalFloated = data.totalFloated;
        totalFloatedCountEl.textContent = data.totalFloated.toLocaleString();
      }
      if (data.onlineUsers !== undefined) {
        state.onlineUsers = data.onlineUsers;
        onlineUsersCountEl.textContent = data.onlineUsers;
      }
    });

    socket.on('new-krathong', (item) => {
      let isOwn = state.myKrathongIds.has(item.id);
      if (!isOwn && state.pendingOwnMatch && Date.now() < state.pendingOwnMatch.expiresAt) {
        const m = state.pendingOwnMatch;
        if (
          item.name === m.name &&
          item.wish === m.wish &&
          item.base === m.base &&
          item.flower === m.flower &&
          (item.decor || 'none') === (m.decor || 'none')
        ) {
          isOwn = true;
          state.pendingOwnMatch = null;
        }
      }

      addKrathongToRiver(item, isOwn);

      if (!isOwn && window.soundEngine && !document.hidden) {
        window.soundEngine.playSplash();
      }
    });

    socket.on('firework-burst', (data) => {
      const horizon = getHorizonY();
      const x = (data && typeof data.x === 'number' ? data.x : 0.5) * viewWidth;
      const y = (data && typeof data.y === 'number')
        ? data.y * horizon
        : Math.random() * Math.max(40, horizon * 0.6) + 50;
      spawnFirework(x, y, data && data.color);
    });

    socket.on('lantern-launched', (data) => {
      spawnLantern(
        data && typeof data.x === 'number' ? data.x : 0.5,
        data && data.name,
        {
          shape: data && data.shape,
          palette: data && data.palette,
          pattern: data && data.pattern
        }
      );
      if (window.soundEngine && !document.hidden) {
        window.soundEngine.playLantern();
      }
    });

    socket.on('krathong-liked', (data) => {
      const target = state.krathongs.find(k => k.id === data.id);
      if (target) {
        target.likes = data.likes;
        if (state.selectedKrathong && state.selectedKrathong.id === data.id) {
          detailLikesCount.textContent = data.likes;
        }
      }
    });

    socket.on('plane-hit-broadcast', (data) => {
      const hitX = (data && typeof data.x === 'number' ? data.x : 0.5) * viewWidth;
      const hitY = (data && typeof data.y === 'number' ? data.y : 80);
      if (!state.airplane || state.airplane.isDead) {
        spawnAirplane(hitX < viewWidth * 0.5, hitX, hitY);
      }
      if (state.airplane && !state.airplane.isCrashing) {
        triggerPlaneCrash(state.airplane, hitX, hitY, false);
      }
    });
  } else {
    fetch('/api/krathongs')
      .then(r => r.json())
      .then(data => {
        if (data.total !== undefined) totalFloatedCountEl.textContent = data.total.toLocaleString();
        if (data.krathongs) initKrathongs(data.krathongs);
      })
      .catch(console.error);
  }

  setInterval(() => {
    if (!document.hidden && state.lanterns.length < 5 && Math.random() > 0.4) {
      spawnLantern(Math.random() * 0.8 + 0.1);
    }
  }, 6000);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (createModalOverlay.classList.contains('open')) closeCreateModal();
      if (detailModalOverlay.classList.contains('open')) closeDetailModal();
      if (listModalOverlay && listModalOverlay.classList.contains('open')) closeListModal();
      return;
    }

    const activeEl = document.activeElement;
    const isTyping = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT' ||
      activeEl.isContentEditable
    );
    const anyModalOpen =
      createModalOverlay.classList.contains('open') ||
      detailModalOverlay.classList.contains('open') ||
      (listModalOverlay && listModalOverlay.classList.contains('open'));

    if (!isTyping && !anyModalOpen && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'p' || e.key === 'P')) {
      spawnAirplane();
      showToast('✈️ เครื่องบินกำลังบินผ่านมา ระวังโคมลอยชนนะ!');
    }
  });

  setTimeout(() => {
    spawnAirplane();
  }, 2500);

  setInterval(() => {
    if (!document.hidden && (!state.airplane || state.airplane.isDead)) {
      spawnAirplane();
    }
  }, 24000);

  // Enable sound by default and unlock Web Audio cleanly on first user interaction if suspended
  function initAudioDefault() {
    if (!window.soundEngine) return;
    syncSoundButtonUI(window.soundEngine.enabled);
    window.soundEngine.ensureStarted();

    const unlockAudioOnGesture = (e) => {
      if (e && e.target && typeof e.target.closest === 'function' && e.target.closest('#soundToggleBtn')) {
        return;
      }
      if (window.soundEngine && window.soundEngine.enabled) {
        window.soundEngine.ensureStarted();
      }
      if (!window.soundEngine || !window.soundEngine.enabled || (window.soundEngine.ctx && window.soundEngine.ctx.state === 'running')) {
        window.removeEventListener('pointerdown', unlockAudioOnGesture, true);
        window.removeEventListener('touchstart', unlockAudioOnGesture, true);
        window.removeEventListener('keydown', unlockAudioOnGesture, true);
      }
    };

    window.addEventListener('pointerdown', unlockAudioOnGesture, true);
    window.addEventListener('touchstart', unlockAudioOnGesture, true);
    window.addEventListener('keydown', unlockAudioOnGesture, true);
  }

  // Initialization
  resizeCanvas();
  setupOptionChips();
  updatePreview();
  initAudioDefault();
  requestAnimationFrame(animate);

})();
