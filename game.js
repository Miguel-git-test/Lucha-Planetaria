'use strict';
// ================================================================
// MILKYMIKE – Auralux-style planetary strategy game (v1.1.1)
// ================================================================

// ---- UTILS ----------------------------------------------------------------
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const randEl = arr => arr[Math.floor(Math.random() * arr.length)];

// ---- CONSTANTS ------------------------------------------------------------
const OWNER_COLORS = {
  player:  { main:'#29ABFF', bright:'#90D8FF', dark:'#004488', glow:'41,171,255' },
  enemy1:  { main:'#FF7B2B', bright:'#FFB880', dark:'#882200', glow:'255,123,43'  },
  enemy2:  { main:'#2BFF88', bright:'#90FFB8', dark:'#006633', glow:'43,255,136'  },
  enemy3:  { main:'#FF2BAA', bright:'#FF90D8', dark:'#880044', glow:'255,43,170'  },
  neutral: { main:'#8899BB', bright:'#BBCCDD', dark:'#334455', glow:'136,153,187' },
};

const PROD_RATE   = [0.8, 1.5, 2.6, 4.2]; // units/sec per level 0-3
const UNIT_SPEED  = 195;                    // px/sec
const SEND_RATIO  = 0.6;                    // fraction of units sent on tap

// ---- LEVEL DEFINITIONS ----------------------------------------------------
const LEVELS = [
  { name:'ALPHA', hint:'Conquest starts here. Tap your planet, then the enemy.',
    enemies:['enemy1'], diff:0,
    planets:[
      {xp:.15,yp:.5, r:30,owner:'player', lv:0,maxLv:1,u:20},
      {xp:.5, yp:.5, r:26,owner:'neutral',lv:0,maxLv:0},
      {xp:.85,yp:.5, r:30,owner:'enemy1', lv:0,maxLv:1,u:20},
    ]},
  { name:'BETA', hint:'Mirror tactics are essential.',
    enemies:['enemy1'], diff:0,
    planets:[
      {xp:.15,yp:.25,r:28,owner:'player', lv:0,maxLv:1,u:15},
      {xp:.15,yp:.75,r:22,owner:'neutral',lv:0,maxLv:0},
      {xp:.5, yp:.5, r:24,owner:'neutral',lv:0,maxLv:1},
      {xp:.85,yp:.25,r:28,owner:'enemy1', lv:0,maxLv:1,u:15},
      {xp:.85,yp:.75,r:22,owner:'neutral',lv:0,maxLv:0},
    ]},
  { name:'GAMMA', hint:null,
    enemies:['enemy1'], diff:0,
    planets:[
      {xp:.12,yp:.5, r:28,owner:'player', lv:0,maxLv:1,u:20},
      {xp:.35,yp:.25,r:20,owner:'neutral',lv:0,maxLv:0},
      {xp:.35,yp:.75,r:20,owner:'neutral',lv:0,maxLv:0},
      {xp:.65,yp:.25,r:20,owner:'neutral',lv:0,maxLv:0},
      {xp:.65,yp:.75,r:20,owner:'neutral',lv:0,maxLv:0},
      {xp:.88,yp:.5, r:28,owner:'enemy1', lv:0,maxLv:1,u:20},
    ]},
  { name:'DELTA', hint:null,
    enemies:['enemy1'], diff:1,
    planets:[
      {xp:.1, yp:.22,r:28,owner:'player', lv:1,maxLv:2,u:20},
      {xp:.1, yp:.78,r:22,owner:'neutral',lv:0,maxLv:1},
      {xp:.35,yp:.5, r:24,owner:'neutral',lv:0,maxLv:1},
      {xp:.65,yp:.5, r:24,owner:'neutral',lv:0,maxLv:1},
      {xp:.9, yp:.22,r:28,owner:'enemy1', lv:1,maxLv:2,u:20},
      {xp:.9, yp:.78,r:22,owner:'neutral',lv:0,maxLv:1},
    ]},
  { name:'EPSILON', hint:'Three sides of the same coin.',
    enemies:['enemy1','enemy2'], diff:1,
    planets:[
      {xp:.5,  yp:.15,r:30,owner:'player', lv:1,maxLv:2,u:25},
      {xp:.2,  yp:.65,r:30,owner:'enemy1', lv:1,maxLv:2,u:25},
      {xp:.8,  yp:.65,r:30,owner:'enemy2', lv:1,maxLv:2,u:25},
      {xp:.5,  yp:.5, r:26,owner:'neutral',lv:0,maxLv:1},
      {xp:.35, yp:.35,r:20,owner:'neutral',lv:0,maxLv:0},
      {xp:.65, yp:.35,r:20,owner:'neutral',lv:0,maxLv:0},
      {xp:.5,  yp:.8, r:20,owner:'neutral',lv:0,maxLv:0},
    ]},
];

// ---- PLANET CLASS ---------------------------------------------------------
class Planet {
  constructor(cfg, cw, ch, scale) {
    this.id     = Math.random().toString(36).slice(2);
    this.xp     = cfg.xp; this.yp = cfg.yp;
    this.baseR  = cfg.r || 26;
    this.owner  = cfg.owner || 'neutral';
    this.level  = cfg.lv  || 0;
    this.maxLv  = cfg.maxLv || 0;
    this.units  = cfg.u !== undefined ? cfg.u : (this.owner === 'neutral' ? 0 : 12);

    this.ringAngle  = Math.random() * Math.PI * 2;
    this.ringSpeed  = rand(0.25, 0.6) * (Math.random() < .5 ? 1 : -1);
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.selected   = false;
    this.upgrading  = false;
    this.upgTimer   = 0;

    this.unitDots = [];
    this._updateDots();
    this.updateLayout(cw, ch, scale);
  }

  _updateDots() {
    const targetCount = Math.min(Math.floor(this.units), 40);
    while (this.unitDots.length < targetCount) {
      this.unitDots.push({
        a: Math.random() * Math.PI * 2,
        r: rand(1.1, 1.45),
        s: rand(0.5, 1.2) * (Math.random() < 0.5 ? 1 : -1),
        phase: Math.random() * Math.PI * 2
      });
    }
    while (this.unitDots.length > targetCount) this.unitDots.pop();
  }

  updateLayout(cw, ch, scale) {
    this.x = this.xp * cw;
    this.y = this.yp * ch;
    this.r = this.baseR * scale;
  }

  update(dt) {
    const prevInt = Math.floor(this.units);
    if (this.owner !== 'neutral') {
      this.units += PROD_RATE[this.level] * dt;
    }
    if (this.upgrading) {
      this.upgTimer -= dt;
      if (this.upgTimer <= 0) this.upgrading = false;
    }
    this.ringAngle += this.ringSpeed * dt;
    
    // Throttled visual update
    if (Math.floor(this.units) !== prevInt) {
        this._updateDots();
    }
    for (const d of this.unitDots) {
      d.a += d.s * dt;
    }
  }
}

// ---- STREAM (travelling units) --------------------------------------------
class Wave {
  constructor(from, to, count, owner) {
    this.from   = from;
    this.target = to;
    this.owner  = owner;
    this.total  = count;
    this.sent   = 0;
    this.units  = [];
    this.spawnRate = 0.04;
    this.timer     = 0;
    this.finished  = false;
  }

  update(dt, onArrival) {
    if (this.sent < this.total) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = this.spawnRate;
        this.sent++;
        this.units.push({
          x: this.from.x + (Math.random()-.5)*10,
          y: this.from.y + (Math.random()-.5)*10,
          v: UNIT_SPEED * (0.9 + Math.random()*0.2)
        });
      }
    } else if (this.units.length === 0) {
      this.finished = true;
    }

    for (let i = this.units.length - 1; i >= 0; i--) {
      const u  = this.units[i];
      const dx = this.target.x - u.x;
      const dy = this.target.y - u.y;
      const d  = Math.hypot(dx, dy);

      if (d < this.target.r * 0.82) {
        onArrival(this.owner, this.target);
        this.units.splice(i, 1);
        continue;
      }

      const step = u.v * dt;
      u.x += (dx / d) * step;
      u.y += (dy / d) * step;
      u.x += Math.sin(Date.now()*0.01 + i) * 0.5;
      u.y += Math.cos(Date.now()*0.01 + i) * 0.5;
    }
  }
}

// ---- AI CONTROLLER --------------------------------------------------------
class AI {
  constructor(owner, diff) {
    this.owner    = owner;
    this.diff     = diff;
    this.timer    = rand(1, 3);
    this.interval = [2.5, 1.4, 0.7][diff];
  }

  tick(dt, planets) {
    this.timer -= dt;
    if (this.timer > 0) return null;
    this.timer = this.interval + rand(-.2, .2);
    return this.decide(planets);
  }

  decide(planets) {
    const mine    = planets.filter(p => p.owner === this.owner);
    const neutral = planets.filter(p => p.owner === 'neutral');
    const enemies = planets.filter(p => p.owner !== this.owner && p.owner !== 'neutral');

    if (!mine.length) return null;

    const richest = mine.reduce((a,b) => b.units > a.units ? b : a, mine[0]);
    if (richest.units < 6) return null;

    const agg = [.4, .6, .85][this.diff];

    if (enemies.length && richest.units > 18) {
      const weakest = enemies.reduce((a,b) => b.units < a.units ? b : a, enemies[0]);
      if (richest.units > weakest.units * (1.3 - agg * .4)) {
        return { from: richest, to: weakest, ratio: .7 };
      }
    }
    if (neutral.length) {
      const nearest = neutral.reduce((a,b) =>
        dist(richest.x,richest.y,b.x,b.y) < dist(richest.x,richest.y,a.x,a.y) ? b : a, neutral[0]);
      if (richest.units > nearest.units + 4) {
        return { from: richest, to: nearest, ratio: .6 };
      }
    }
    return null;
  }
}

// ---- LEVEL GENERATOR -------------------------------------------------------
class LevelGenerator {
  static generate(idx) {
    const seed = idx * 1337;
    const numPlanets   = Math.floor(lerp(12, 30, clamp(idx / 50, 0, 1)));
    const enemiesCount = idx < 6 ? 1 : (idx < 18 ? 2 : 3);
    const diff = Math.floor(lerp(0, 2, clamp(idx / 40, 0, 1)));

    const allEnemies = ['enemy1', 'enemy2', 'enemy3'];
    const enemies    = allEnemies.slice(0, enemiesCount);
    const names = ['PROXIMA','RIGEL','VEGA','SIRIUS','ALTAIR','ANTARES','BETELGEUSE','DENEB','SPICA','POLLUX'];
    const name = names[idx % names.length] + ' ' + (Math.floor(idx/names.length) + 1);

    const planets = [];
    const factions = ['player', ...enemies];
    const nF = factions.length;

    const orbitR = 0.38;
    for (let i = 0; i < nF; i++) {
        const ang = (i / nF) * Math.PI * 2 - Math.PI/2;
        const xp  = 0.5 + Math.cos(ang) * orbitR;
        const yp  = 0.5 + Math.sin(ang) * orbitR;
        planets.push({ xp, yp, r: 28, owner: factions[i], lv: 1, maxLv: 3, u: 25 });
    }

    let attempts = 0;
    while (planets.length < numPlanets && attempts < 150) {
      attempts++;
      const rx = rand(0.06, 0.44), ry = rand(0.06, 0.44);
      const r  = rand(18, 25), lv = Math.floor(rand(0, 2)), u  = Math.floor(rand(0, 8));
      const candidates = [];
      const cx = 0.5, cy = 0.5;

      if (nF === 2) {
          candidates.push({ xp: cx - (rx-.25), yp: cy - (ry-.25) });
          candidates.push({ xp: cx + (rx-.25), yp: cy + (ry-.25) });
      } else {
          for (let j = 0; j < 4; j++) {
              const ang = j * Math.PI / 2;
              candidates.push({
                  xp: cx + ((rx-.25) * Math.cos(ang) - (ry-.25) * Math.sin(ang)),
                  yp: cy + ((rx-.25) * Math.sin(ang) + (ry-.25) * Math.cos(ang))
              });
          }
      }

      const tooClose = candidates.some(c => 
          planets.some(p => dist(c.xp*1000, c.yp*1000, p.xp*1000, p.yp*1000) < 85)
      );

      if (!tooClose) {
          candidates.forEach(c => {
              if (planets.length < numPlanets)
                planets.push({ xp: c.xp, yp: c.yp, r, owner: 'neutral', lv, maxLv: Math.floor(rand(lv, 3)), u });
          });
      }
    }

    return { name, hint: null, enemies, diff, planets };
  }
}

// ---- BACKGROUND -----------------------------------------------------------
class Starfield {
  constructor() { this.stars = []; }
  init(canvas) {
    const {width:w, height:h} = canvas;
    const n = Math.floor(w * h / 1400);
    this.stars = Array.from({length:n}, () => ({
      x: rand(0,w), y: rand(0,h), r: rand(.3,1.5), br: rand(.4,1), sp: rand(.4,2), ph: rand(0, Math.PI*2)
    }));
  }
  draw(ctx, w, h, t) {
    ctx.fillStyle = '#000010'; ctx.fillRect(0,0,w,h);
    for (const s of this.stars) {
      const tw = .6 + .4 * Math.sin(t * s.sp + s.ph);
      ctx.fillStyle = `rgba(255,255,255,${s.br * tw})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(41, 171, 255, 0.04)'; ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }
}

// ---- RENDERER --------------------------------------------------------------
class Renderer {
  constructor(canvas) { this.ctx = canvas.getContext('2d'); }
  drawPlanet(p, time) {
    const ctx = this.ctx, { x, y, r } = p;
    const c = OWNER_COLORS[p.owner], glowR = `rgba(${c.glow},`;
    
    // Body
    const body = ctx.createRadialGradient(x-r*.3, y-r*.35, r*.05, x+r*.1, y+r*.1, r*1.05);
    body.addColorStop(0, '#fff'); body.addColorStop(.2, c.bright); body.addColorStop(.6, c.main); body.addColorStop(1, c.dark);
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();

    // Rings
    for (let lv = 0; lv <= p.level; lv++) {
      const ringR = r * (1.6 + lv * .42);
      const pulse = .5 + .5 * Math.sin(time*1.8 + p.pulsePhase + lv*1.2);
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.ringAngle + lv * 1.1);
      ctx.strokeStyle = glowR + (pulse*.6)+')'; ctx.lineWidth = 1.5; ctx.setLineDash([ringR*.3, ringR*.2]);
      ctx.beginPath(); ctx.arc(0,0,ringR,0,Math.PI*2); ctx.stroke(); ctx.restore();
    }

    if (p.selected) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x,y,r*1.15,0,Math.PI*2); ctx.stroke();
    }

    const label = Math.floor(p.units);
    if (label > 0 || p.owner !== 'neutral') {
        ctx.font = `bold ${clamp(r*.7, 10, 20)}px Rajdhani, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
        ctx.fillText(label, x, y);
    }

    for (const d of p.unitDots) {
      const dr = p.r * d.r, dx = x + Math.cos(d.a) * dr, dy = y + Math.sin(d.a) * dr;
      ctx.fillStyle = glowR + '0.7)'; ctx.beginPath(); ctx.arc(dx, dy, 2, 0, Math.PI*2); ctx.fill();
    }
  }
}

// ---- GAME CORE -------------------------------------------------------------
class Game {
  constructor() {
    this.bgCanvas = document.getElementById('bg-canvas');
    this.gameCanvas = document.getElementById('game-canvas');
    this.bgCtx = this.bgCanvas.getContext('2d');
    this.starfield = new Starfield();
    this.renderer = new Renderer(this.gameCanvas);
    this.state = 'menu'; this.levelIdx = 0; this.planets = []; this.waves = []; this.ais = []; this.timeScale = 1;
    this.completed = new Set(JSON.parse(localStorage.getItem('mm_done') || '[]'));
    this._resize(); this._bindUI(); this._buildLevels();
    this.gameCanvas.addEventListener('pointerdown', e => this._onInput(e));
    requestAnimationFrame(t => this._loop(t));
  }
  _resize() {
    const W = window.innerWidth, H = window.innerHeight, dpr = window.devicePixelRatio || 1;
    [this.bgCanvas, this.gameCanvas].forEach(c => { c.width = W*dpr; c.height = H*dpr; c.style.width = W+'px'; c.style.height = H+'px'; });
    this.bgCtx.scale(dpr, dpr); this.renderer.ctx.scale(dpr, dpr);
    this.W = W; this.H = H; this.scale = Math.min(W, H) / 500;
    this.starfield.init(this.bgCanvas); this.planets.forEach(p => p.updateLayout(W,H,this.scale));
  }
  _bindUI() {
    const $ = id => document.getElementById(id);
    $('btn-play').onclick = () => this._showScreen('levels');
    $('btn-about').onclick = () => this._showScreen('about');
    $('btn-about-back').onclick = () => this._showScreen('menu');
    $('btn-levels-back').onclick = () => this._showScreen('menu');
    $('btn-pause').onclick = () => this._showScreen('paused');
    $('btn-resume').onclick = () => this._showScreen('playing');
    $('btn-speed').onclick = () => { this.timeScale = this.timeScale === 1 ? 2 : (this.timeScale === 2 ? 4 : 1); $('btn-speed').textContent = this.timeScale+'x'; };
    $('btn-upgrade').onclick = () => this._upgradeSelected();
    $('btn-retry').onclick = () => this._startLevel(this.levelIdx);
    $('btn-next').onclick = () => this._startLevel(this.levelIdx+1);
    document.querySelectorAll('.btn-menu').forEach(b => b.onclick = () => this._showScreen('menu'));
  }
  _buildLevels() {
    const grid = document.getElementById('levels-grid'); grid.innerHTML = '';
    for (let i = 0; i < 50; i++) {
      const card = document.createElement('div'); card.className = 'level-card' + (this.completed.has(i)?' completed':'');
      card.innerHTML = `<span class="card-num">${i+1}</span>`; card.onclick = () => this._startLevel(i); grid.appendChild(card);
    }
  }
  _showScreen(n) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-'+n); if (el) el.classList.add('active'); this.state = n;
  }
  _startLevel(idx) {
    if (idx >= 50) return this._showScreen('menu');
    this.levelIdx = idx; const lv = idx < LEVELS.length ? LEVELS[idx] : LevelGenerator.generate(idx);
    this.planets = lv.planets.map(c => new Planet(c, this.W, this.H, this.scale));
    this.ais = lv.enemies.map((e,i) => new AI(e, lv.diff)); this.waves = []; this.selected = null;
    document.getElementById('hud-level').textContent = `${idx+1}. ${lv.name}`;
    this._showScreen('playing'); this.lastTime = null;
  }
  _upgradeSelected() {
    const p = this.planets.find(p => p.id === this.selected);
    if (p && p.owner === 'player' && p.units >= 10 && p.level < 3) { p.units -= 10; p.level++; p.upgrading = true; p.upgTimer = 1; this._updateHUD(); }
  }
  _onInput(e) {
    if (this.state !== 'playing' || e.target.tagName === 'BUTTON') return;
    const rect = this.gameCanvas.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
    const tapped = this.planets.find(p => dist(x,y,p.x,p.y) < p.r * 1.8);
    if (!tapped) { this.planets.forEach(p => p.selected = false); this.selected = null; }
    else {
      const sel = this.planets.find(p => p.id === this.selected);
      if (tapped.owner === 'player' && (!sel || sel.id === tapped.id)) { this.planets.forEach(p => p.selected = false); tapped.selected = true; this.selected = tapped.id; }
      else if (sel) { if (sel.units >= 2) { const c = Math.floor(sel.units * SEND_RATIO); sel.units -= c; this.waves.push(new Wave(sel, tapped, c, sel.owner)); } }
    }
    this._updateHUD();
  }
  _updateHUD() {
    const p = this.planets.find(p => p.id === this.selected), btn = document.getElementById('btn-upgrade');
    if (p && p.owner === 'player' && p.level < 3) { btn.classList.remove('hidden'); btn.disabled = p.units < 10; btn.style.opacity = p.units < 10 ? 0.4 : 1; }
    else btn.classList.add('hidden');
  }
  _loop(ts) {
    requestAnimationFrame(t => this._loop(t));
    const dt = this.lastTime ? Math.min((ts - this.lastTime)/1000, .05) * this.timeScale : 0;
    this.lastTime = ts; const t = ts/1000;
    this.starfield.draw(this.bgCtx, this.W, this.H, t);
    if (this.state === 'playing') {
      this.planets.forEach(p => p.update(dt));
      this.ais.forEach(ai => { const c = ai.tick(dt, this.planets); if (c) { const n = Math.floor(c.from.units * c.ratio); c.from.units -= n; this.waves.push(new Wave(c.from, c.to, n, ai.owner)); } });
      this.waves = this.waves.filter(w => { w.update(dt, (o, p) => { if (p.owner === o) p.units++; else if (p.units < 1) { p.owner = o; p.units = 1; } else p.units--; }); return !w.finished; });
      if (!this.planets.some(p => p.owner === 'player')) this._showScreen('lose');
      else if (this.planets.every(p => p.owner === 'player' || p.owner === 'neutral') && this.ais.every(ai => !this.planets.some(p => p.owner === ai.owner))) {
          this.completed.add(this.levelIdx); localStorage.setItem('mm_done', JSON.stringify([...this.completed])); this._buildLevels(); this._showScreen('win');
      }
    }
    this.renderer.clear(); this.waves.forEach(w => { const c = OWNER_COLORS[w.owner]; this.renderer.ctx.fillStyle = `rgba(${c.glow}, 0.8)`; for (const u of w.units) { this.renderer.ctx.beginPath(); this.renderer.ctx.arc(u.x, u.y, 2, 0, Math.PI*2); this.renderer.ctx.fill(); } });
    this.planets.forEach(p => this.renderer.drawPlanet(p, t));
  }
}
window.onload = () => new Game();
