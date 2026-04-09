'use strict';
// ================================================================
// MILKYMIKE – Auralux-style planetary strategy game
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

const PROD_RATE   = [0.7, 1.4, 2.4, 4.0]; // units/sec per level 0-3
const UPG_COST    = [35,  70, 120];         // units consumed to upgrade
const UPG_THRESH  = [42,  80, 135];         // must have this many to trigger auto-upgrade
const UNIT_SPEED  = 190;                    // px/sec
const SEND_RATIO  = 0.6;                    // fraction of units sent on tap

// ---- LEVEL DEFINITIONS ----------------------------------------------------
const LEVELS = [
  { name:'ALPHA', hint:'Conquest starts here. Symmetrical balance achieved.',
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
  { name:'ZETA', hint:null,
    enemies:['enemy1','enemy2','enemy3'], diff:2,
    planets:[
      {xp:.2, yp:.2, r:28,owner:'player', lv:1,maxLv:3,u:30},
      {xp:.8, yp:.2, r:28,owner:'enemy1', lv:1,maxLv:3,u:30},
      {xp:.2, yp:.8, r:28,owner:'enemy2', lv:1,maxLv:3,u:30},
      {xp:.8, yp:.8, r:28,owner:'enemy3', lv:1,maxLv:3,u:30},
      {xp:.5, yp:.5, r:32,owner:'neutral',lv:1,maxLv:3},
    ]},
  { name:'ETA', hint:null,
    enemies:['enemy1','enemy2'], diff:2,
    planets:[
      {xp:.5, yp:.1, r:30,owner:'player', lv:1,maxLv:3,u:30},
      {xp:.15,yp:.85,r:30,owner:'enemy1', lv:1,maxLv:3,u:30},
      {xp:.85,yp:.85,r:30,owner:'enemy2', lv:1,maxLv:3,u:30},
      {xp:.35,yp:.4, r:22,owner:'neutral',lv:0,maxLv:1},
      {xp:.65,yp:.4, r:22,owner:'neutral',lv:0,maxLv:1},
      {xp:.5, yp:.75,r:22,owner:'neutral',lv:0,maxLv:1},
    ]},
  { name:'THETA', hint:null,
    enemies:['enemy1','enemy2','enemy3'], diff:2,
    planets:[
      {xp:.15,yp:.5, r:30,owner:'player', lv:1,maxLv:3,u:35},
      {xp:.5, yp:.15,r:30,owner:'enemy1', lv:1,maxLv:3,u:35},
      {xp:.85,yp:.5, r:30,owner:'enemy2', lv:1,maxLv:3,u:35},
      {xp:.5, yp:.85,r:30,owner:'enemy3', lv:1,maxLv:3,u:35},
      {xp:.4, yp:.4, r:22,owner:'neutral',lv:0,maxLv:1},
      {xp:.6, yp:.4, r:22,owner:'neutral',lv:0,maxLv:1},
      {xp:.4, yp:.6, r:22,owner:'neutral',lv:0,maxLv:1},
      {xp:.6, yp:.6, r:22,owner:'neutral',lv:0,maxLv:1},
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

    // Unit dots visualization
    this.unitDots = [];
    this._updateDots();

    this.updateLayout(cw, ch, scale);
  }

  _updateDots() {
    const targetCount = Math.min(Math.floor(this.units), 40); // cap visual dots
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
    if (this.owner !== 'neutral') {
      this.units += PROD_RATE[this.level] * dt;
    }
    if (this.upgrading) {
      this.upgTimer -= dt;
      if (this.upgTimer <= 0) this.upgrading = false;
    }
    this.ringAngle += this.ringSpeed * dt;
    this._updateDots();
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
    this.spawnRate = 0.04; // seconds between units
    this.timer     = 0;
    this.finished  = false;
  }

  update(dt, onArrival) {
    // Spawning
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

    // Individual unit movements
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u  = this.units[i];
      const dx = this.target.x - u.x;
      const dy = this.target.y - u.y;
      const d  = Math.hypot(dx, dy);

      if (d < this.target.r * 0.8) {
        onArrival(this.owner, this.target);
        this.units.splice(i, 1);
        continue;
      }

      const step = u.v * dt;
      u.x += (dx / d) * step;
      u.y += (dy / d) * step;
      
      // Slight wobbling for "organic" feel
      u.x += Math.sin(Date.now()*0.01 + i) * 0.5;
      u.y += Math.cos(Date.now()*0.01 + i) * 0.5;
    }
  }
}

// ---- AI CONTROLLER --------------------------------------------------------
class AI {
  constructor(owner, diff) {
    this.owner    = owner;
    this.diff     = diff; // 0,1,2
    this.timer    = rand(1, 3);
    this.interval = [3.2, 1.8, 0.9][diff];
  }

  // Called each frame; returns a command object or null
  tick(dt, planets) {
    this.timer -= dt;
    if (this.timer > 0) return null;
    this.timer = this.interval + rand(-.3, .3);
    return this.decide(planets);
  }

  decide(planets) {
    const mine    = planets.filter(p => p.owner === this.owner);
    const neutral = planets.filter(p => p.owner === 'neutral');
    const enemies = planets.filter(p => p.owner !== this.owner && p.owner !== 'neutral');

    if (!mine.length) return null;

    const richest = mine.reduce((a,b) => b.units > a.units ? b : a, mine[0]);
    if (richest.units < 14) return null;

    const agg = [.45, .65, .85][this.diff];

    // Attack if strong enough
    if (enemies.length && richest.units > 25) {
      const weakest = enemies.reduce((a,b) => b.units < a.units ? b : a, enemies[0]);
      if (richest.units > weakest.units * (1.5 - agg * .5)) {
        return { from: richest, to: weakest, ratio: .7 };
      }
    }
    // Expand to nearest neutral
    if (neutral.length) {
      const nearest = neutral.reduce((a,b) =>
        dist(richest.x,richest.y,b.x,b.y) < dist(richest.x,richest.y,a.x,a.y) ? b : a, neutral[0]);
      if (richest.units > nearest.units + 8) {
        return { from: richest, to: nearest, ratio: .55 };
      }
    }
    return null;
  }
}

// ---- LEVEL GENERATOR -------------------------------------------------------
class LevelGenerator {
  static generate(idx) {
    const seed = idx * 1337;
    const rng = () => {
      let x = Math.sin(seed + Math.random()) * 10000;
      return x - Math.floor(x);
    };

    // Progression scaling
    const numPlanets   = Math.floor(lerp(12, 28, clamp(idx / 50, 0, 1)));
    const enemiesCount = idx < 8 ? 1 : (idx < 20 ? 2 : 3);
    const diff = Math.floor(lerp(0, 2, clamp(idx / 40, 0, 1)));

    const allEnemies = ['enemy1', 'enemy2', 'enemy3'];
    const enemies    = allEnemies.slice(0, enemiesCount);
    const names = ['PROXIMA','RIGEL','VEGA','SIRIUS','ALTAIR','ANTARES','BETELGEUSE','DENEB','SPICA','POLLUX'];
    const name = names[idx % names.length] + ' ' + (Math.floor(idx/names.length) + 1);

    const planets = [];
    const factions = ['player', ...enemies];
    const nF = factions.length;

    // Home planets placement (Symmetrical)
    const orbitR = 0.38;
    for (let i = 0; i < nF; i++) {
        const ang = (i / nF) * Math.PI * 2 - Math.PI/2;
        const xp  = 0.5 + Math.cos(ang) * orbitR;
        const yp  = 0.5 + Math.sin(ang) * orbitR;
        planets.push({ xp, yp, r: 28, owner: factions[i], lv: 1, maxLv: 3, u: 25 });
    }

    // Fill with symmetrical neutral planets
    let attempts = 0;
    while (planets.length < numPlanets && attempts < 100) {
      attempts++;
      // Random position in one quadrant (roughly)
      const rx = rand(0.05, 0.45);
      const ry = rand(0.05, 0.45);
      const r  = rand(18, 25);
      const lv = Math.floor(rand(0, 2));
      const u  = Math.floor(rand(0, 8));

      // Mirror this point based on number of factions
      const candidates = [];
      const cx = 0.5, cy = 0.5;
      const dx = rx, dy = ry;

      if (nF === 2) {
          // Mirror symmetry
          candidates.push({ xp: cx - dx, yp: cy - dy });
          candidates.push({ xp: cx + dx, yp: cy + dy });
      } else {
          // Radial symmetry (4-way)
          for (let j = 0; j < 4; j++) {
              const ang = j * Math.PI / 2;
              const cos = Math.cos(ang), sin = Math.sin(ang);
              // Rotated coordinates around (0.5, 0.5)
              // x' = x cos - y sin, y' = x sin + y cos
              candidates.push({
                  xp: cx + (dx * Math.cos(ang) - dy * Math.sin(ang)),
                  yp: cy + (dx * Math.sin(ang) + dy * Math.cos(ang))
              });
          }
      }

      const tooClose = candidates.some(c => 
          planets.some(p => dist(c.xp*1000, c.yp*1000, p.xp*1000, p.yp*1000) < 120)
      );

      if (!tooClose) {
          candidates.forEach(c => {
              planets.push({ xp: c.xp, yp: c.yp, r, owner: 'neutral', lv, maxLv: Math.floor(rand(lv, 3)), u });
          });
      }
    }

    return {
      name: name,
      hint: idx === 12 ? 'The quadrant is crowded. Use 2x speed for faster conquest!' : null,
      enemies: enemies,
      diff: diff,
      planets: planets
    };
  }
}

// ---- STAR BACKGROUND -------------------------------------------------------
class Starfield {
  constructor() { this.stars = []; this.canvas = null; this.ctx = null; }

  init(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.regenerate();
  }

  regenerate() {
    const {width:w, height:h} = this.canvas;
    const n = Math.floor(w * h / 1200);
    this.stars = Array.from({length:n}, () => ({
      x: rand(0,w), y: rand(0,h),
      r: rand(.3,1.6),
      br: rand(.4,1),
      sp: rand(.4,2),
      ph: rand(0, Math.PI*2),
    }));
    this.nebulas = Array.from({length:3}, (_, i) => ({
      x: rand(w*.1,w*.9), y: rand(h*.1,h*.9),
      rx: rand(w*.15,w*.3), ry: rand(h*.2,h*.45),
      rot: rand(0,Math.PI),
      col: ['rgba(20,40,110,','rgba(55,15,75,','rgba(15,55,60,'][i],
      a: rand(.06,.13),
    }));
  }

  draw(t) {
    const ctx = this.ctx, {width:w, height:h} = this.canvas;
    ctx.fillStyle = '#000010';
    ctx.fillRect(0,0,w,h);

    // Nebulas
    for (const nb of this.nebulas) {
      ctx.save();
      ctx.translate(nb.x, nb.y);
      ctx.rotate(nb.rot);
      const g = ctx.createRadialGradient(0,0,nb.rx*.05,0,0,nb.rx);
      g.addColorStop(0, nb.col + nb.a*2 +')');
      g.addColorStop(1, nb.col + '0)');
      ctx.fillStyle = g;
      ctx.scale(1, nb.ry/nb.rx);
      ctx.beginPath(); ctx.arc(0,0,nb.rx,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Stars
    for (const s of this.stars) {
      const tw = .6 + .4 * Math.sin(t * s.sp + s.ph);
      ctx.fillStyle = `rgba(255,255,255,${s.br * tw})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    }

    // Grid Overlay
    ctx.strokeStyle = 'rgba(41, 171, 255, 0.05)';
    ctx.lineWidth = 1;
    const step = 60;
    ctx.beginPath();
    for (let x = 0; x <= w; x += step) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();
  }
}

// ---- RENDERER --------------------------------------------------------------
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawPlanet(p, time) {
    const ctx = this.ctx, { x, y, r } = p;
    const c   = OWNER_COLORS[p.owner];
    const glowR = `rgba(${c.glow},`;

    // Outer corona
    const corona = ctx.createRadialGradient(x,y,r*.6, x,y,r*3.2);
    corona.addColorStop(0, glowR + '.12)');
    corona.addColorStop(1, glowR + '0)');
    ctx.fillStyle = corona;
    ctx.beginPath(); ctx.arc(x,y,r*3.2,0,Math.PI*2); ctx.fill();

    // Atmosphere
    const atm = ctx.createRadialGradient(x,y,r*.85, x,y,r*1.45);
    atm.addColorStop(0,'transparent');
    atm.addColorStop(.75, glowR+'.18)');
    atm.addColorStop(1,'transparent');
    ctx.fillStyle = atm;
    ctx.beginPath(); ctx.arc(x,y,r*1.45,0,Math.PI*2); ctx.fill();

    // Planet body with gradient (3D sphere illusion)
    const body = ctx.createRadialGradient(x-r*.3, y-r*.35, r*.04, x+r*.1, y+r*.1, r*1.05);
    body.addColorStop(0,   '#ffffff');
    body.addColorStop(.15, c.bright);
    body.addColorStop(.55, c.main);
    body.addColorStop(1,   c.dark);
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();

    // Surface bands (clip to sphere)
    ctx.save();
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.clip();
    ctx.globalAlpha = .08;
    for (let i = -3; i <= 3; i++) {
      const yy = y + i*(r*.42) + Math.sin(time*.15 + i)*r*.04;
      ctx.fillStyle = i%2===0 ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.4)';
      ctx.fillRect(x-r, yy-r*.1, r*2, r*.2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Upgrade rings (orbit-style)
    for (let lv = 0; lv <= p.level; lv++) {
      const ringR = r * (1.7 + lv * .45);
      const pulse = .55 + .45 * Math.sin(time*1.8 + p.pulsePhase + lv*1.2);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.ringAngle + lv * 1.1);
      ctx.strokeStyle = glowR + (pulse*.7)+')';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([ringR*.25, ringR*.18]);
      ctx.beginPath(); ctx.arc(0,0,ringR,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    // Available upgrade indicator (pulsing outer ring)
    if (p.level < p.maxLv && p.owner !== 'neutral') {
      const pulse = .3+.7*Math.sin(time*3+p.pulsePhase);
      ctx.strokeStyle = glowR + (pulse*.6)+')';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4,6]);
      ctx.beginPath(); ctx.arc(x,y, r*(2.3+p.level*.45), 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Upgrade flash
    if (p.upgrading) {
      ctx.strokeStyle = glowR+'.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x,y,r*1.1,0,Math.PI*2); ctx.stroke();
    }

    ctx.setLineDash([]);

    // Selection ring
    if (p.selected) {
      const sp = .5+.5*Math.sin(time*4);
      ctx.strokeStyle = `rgba(255,255,255,${.6+sp*.4})`;
      ctx.lineWidth   = 2.5;
      ctx.shadowBlur  = 12;
      ctx.shadowColor  = '#fff';
      ctx.beginPath(); ctx.arc(x,y,r*1.12,0,Math.PI*2); ctx.stroke();
      ctx.shadowBlur  = 0;
    }

    // Unit count label
    if (p.owner !== 'neutral' || p.units > 0) {
      const label = Math.floor(p.units).toString();
      const fs    = clamp(r*.65, 9, 22);
      ctx.font      = `bold ${fs}px Rajdhani, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.shadowBlur = 4; ctx.shadowColor = c.main;
      ctx.fillText(label, x, y);
      ctx.shadowBlur = 0;
    }

    // Draw unit dots
    for (const d of p.unitDots) {
      const dr = p.r * d.r;
      const dx = x + Math.cos(d.a) * dr;
      const dy = y + Math.sin(d.a) * dr;
      const pulse = 0.7 + 0.3 * Math.sin(time * 3 + d.phase);
      
      ctx.fillStyle = `rgba(${c.glow}, ${pulse})`;
      ctx.beginPath();
      ctx.arc(dx, dy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawWave(wave, time) {
    const ctx = this.ctx;
    const c   = OWNER_COLORS[wave.owner];
    const glowR = `rgba(${c.glow},`;

    ctx.fillStyle = glowR + '0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowColor = c.main;

    for (const u of wave.units) {
      ctx.beginPath();
      ctx.arc(u.x, u.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  drawSendLine(from, to) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([6,8]);
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

// ---- AUDIO (Web Audio API ambient) ----------------------------------------
class AudioManager {
  constructor() {
    this.ctx  = null;
    this.nodes = {};
    this.on   = true;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._buildAmbient();
    } catch(e) { /* no audio */ }
  }

  _buildAmbient() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const master = ctx.createGain(); master.gain.value = .08;
    master.connect(ctx.destination);

    // Low drone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine'; osc1.frequency.value = 55;
    const g1 = ctx.createGain(); g1.gain.value = .4;
    osc1.connect(g1); g1.connect(master); osc1.start();

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine'; osc2.frequency.value = 82.4;
    const g2 = ctx.createGain(); g2.gain.value = .25;
    osc2.connect(g2); g2.connect(master); osc2.start();

    const lfo = ctx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = .08;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = .03;
    lfo.connect(lfoGain); lfoGain.connect(g1.gain); lfo.start();

    this.nodes = { master, osc1, osc2 };
  }

  playCapture(owner) {
    if (!this.ctx || !this.on) return;
    const c  = OWNER_COLORS[owner];
    const freq = owner === 'player' ? 523.25 : 349.23;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    env.gain.setValueAtTime(.25, this.ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(.001, this.ctx.currentTime + .6);
    osc.connect(env); env.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + .65);
  }

  playUpgrade() {
    if (!this.ctx || !this.on) return;
    [523, 659, 784].forEach((f,i) => {
      const o = this.ctx.createOscillator(), e = this.ctx.createGain();
      const t = this.ctx.currentTime + i*.12;
      o.type = 'sine'; o.frequency.value = f;
      e.gain.setValueAtTime(.2, t);
      e.gain.exponentialRampToValueAtTime(.001, t+.4);
      o.connect(e); e.connect(this.ctx.destination);
      o.start(t); o.stop(t+.45);
    });
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
}

// ---- INPUT HANDLER ---------------------------------------------------------
class InputHandler {
  constructor(canvas, onTap) {
    this.canvas = canvas;
    this.onTap  = onTap;
    this._bind();
  }

  _bind() {
    this.canvas.addEventListener('touchstart', e => { e.preventDefault(); this._handle(e.changedTouches[0]); }, {passive:false});
    this.canvas.addEventListener('mousedown',  e => this._handle(e));
  }

  _handle(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.onTap(e.clientX - rect.left, e.clientY - rect.top);
  }
}

// ================================================================
// GAME STATE MACHINE
// ================================================================
class Game {
  constructor() {
    this.bgCanvas   = document.getElementById('bg-canvas');
    this.gameCanvas = document.getElementById('game-canvas');
    this.bgCtx      = this.bgCanvas.getContext('2d');

    this.starfield  = new Starfield();
    this.renderer   = new Renderer(this.gameCanvas);
    this.audio      = new AudioManager();

    this.state      = 'menu';   // menu | levels | playing | paused | win | lose
    this.levelIdx   = 0;
    this.planets    = [];
    this.waves      = [];
    this.ais        = [];
    this.selected   = null;     // selected planet id
    this.scale      = 1;
    this.timeScale  = 1;

    this.completed  = new Set(JSON.parse(localStorage.getItem('mm_done') || '[]'));

    this.totalLevels = 50;
    this.lastTime   = null;
    this._resize();
    this._bindUI();
    this._buildLevels();
    this.input = new InputHandler(this.gameCanvas, (x,y) => this._onTap(x,y));
    requestAnimationFrame(t => this._loop(t));
  }

  // ---- RESIZE ---------------------------------------------------------------
  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const W   = window.innerWidth, H = window.innerHeight;
    [this.bgCanvas, this.gameCanvas].forEach(c => {
      c.width  = W * dpr;
      c.height = H * dpr;
      c.style.width  = W + 'px';
      c.style.height = H + 'px';
    });
    this.bgCtx.scale(dpr, dpr);
    this.renderer.ctx.scale(dpr, dpr);
    this.W = W; this.H = H;
    this.scale = Math.min(W, H) / 500;

    this.starfield.init(this.bgCanvas);
    this.planets.forEach(p => p.updateLayout(W, H, this.scale));
  }

  // ---- UI BINDINGS ----------------------------------------------------------
  _bindUI() {
    const $ = id => document.getElementById(id);
    $('btn-play').onclick         = () => this._showScreen('levels');
    $('btn-about').onclick        = () => this._showScreen('about');
    $('btn-about-back').onclick   = () => this._showScreen('menu');
    $('btn-levels-back').onclick  = () => this._showScreen('menu');
    $('btn-pause').onclick        = () => this._pause();
    $('btn-resume').onclick       = () => this._resume();
    $('btn-pause-menu').onclick   = () => { this._resume(); this._showScreen('menu'); };
    $('btn-retry').onclick        = () => this._startLevel(this.levelIdx);
    $('btn-lose-menu').onclick    = () => this._showScreen('menu');
    $('btn-next').onclick         = () => {
      const next = this.levelIdx + 1;
      if (next < LEVELS.length) this._startLevel(next); else this._showScreen('menu');
    };
    $('btn-win-menu').onclick     = () => this._showScreen('menu');
    $('btn-speed').onclick        = () => this._toggleSpeed();
    $('btn-upgrade').onclick      = () => this._upgradeSelected();

    window.addEventListener('resize', () => this._resize());
  }

  // ---- LEVEL CARDS ----------------------------------------------------------
  _buildLevels() {
    const grid = document.getElementById('levels-grid');
    grid.innerHTML = '';
    for (let i = 0; i < this.totalLevels; i++) {
      const locked    = false; // All levels unlocked for testing
      const done      = this.completed.has(i);
      const card      = document.createElement('div');
      card.className  = 'level-card' + (locked?' locked':'') + (done?' completed':'');

      const isManual = i < LEVELS.length;
      const lvName   = isManual ? LEVELS[i].name : `SEC-${i+1}`;

      card.innerHTML  = locked
        ? `<span class="lock-icon">🔒</span><span class="card-name">${lvName}</span>`
        : `<span class="card-num">${i + 1}</span><span class="card-name">${lvName}</span>
           <span class="card-stars">${done?'⭐':''}</span>`;
      if (!locked) card.onclick = () => this._startLevel(i);
      grid.appendChild(card);
    }
  }

  // ---- SCREEN MANAGEMENT ---------------------------------------------------
  _showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const map = { menu:'screen-menu', levels:'screen-levels',
                  playing:'screen-game', paused:'screen-pause',
                  win:'screen-win', lose:'screen-lose', about:'screen-about' };
    const el  = document.getElementById(map[name] || 'screen-menu');
    if (el) el.classList.add('active');
    this.state = name;
  }

  // ---- START LEVEL ---------------------------------------------------------
  _startLevel(idx) {
    this.audio.init();
    this.audio.resume();
    this.levelIdx = idx;

    // Use manual level if it exists, otherwise generate one
    const lv = idx < LEVELS.length ? LEVELS[idx] : LevelGenerator.generate(idx);

    document.getElementById('hud-level').textContent = `${idx+1}. ${lv.name}`;

    // Build planets
    this.planets = lv.planets.map(cfg => new Planet(cfg, this.W, this.H, this.scale));
    this.waves   = [];
    this.selected = null;

    // Build AIs
    this.ais = lv.enemies.map((e, i) => new AI(e, Math.min(lv.diff + (i*.5>>0), 2)));

    // Hint
    const hintEl = document.getElementById('hud-hint');
    if (lv.hint) {
      hintEl.textContent = lv.hint;
      hintEl.classList.add('visible');
      setTimeout(() => hintEl.classList.remove('visible'), 5000);
    } else {
      hintEl.classList.remove('visible');
    }

    this._showScreen('playing');
    this.lastTime = null;
  }

  // ---- PAUSE / RESUME ------------------------------------------------------
  _pause()  { this._showScreen('paused'); }
  _resume() { this._showScreen('playing'); this.lastTime = null; }

  _toggleSpeed() {
    const speeds = [1, 2, 4];
    let idx = speeds.indexOf(this.timeScale) + 1;
    if (idx >= speeds.length) idx = 0;
    this.timeScale = speeds[idx];
    document.getElementById('btn-speed').textContent = this.timeScale + 'x';
  }

  _upgradeSelected() {
    const p = this.planets.find(p => p.id === this.selected);
    if (p && p.owner === 'player' && p.units >= 10 && p.level < 3) {
      p.units -= 10;
      p.level++;
      p.upgrading = true;
      p.upgTimer = 1.0;
      this.audio.playUpgrade();
      this._updateHUD();
    }
  }

  // ---- TAP HANDLER ---------------------------------------------------------
  _onTap(x, y) {
    if (this.state !== 'playing') return;

    // Find tapped planet
    const tapped = this.planets.find(p => dist(x,y,p.x,p.y) < p.r * 1.8);

    if (!tapped) {
      // Deselect
      this.planets.forEach(p => p.selected = false);
      this.selected = null;
      this._updateHUD();
      return;
    }

    const sel = this.planets.find(p => p.id === this.selected);

    if (tapped.owner === 'player') {
      if (sel && sel.id !== tapped.id) {
        // Transfer units to own planet
        this._sendUnits(sel, tapped);
      } else {
        // Select this planet
        this.planets.forEach(p => p.selected = false);
        tapped.selected = true;
        this.selected   = tapped.id;
      }
    } else if (sel) {
      // Send units from selected to tapped
      this._sendUnits(sel, tapped);
    }
    this._updateHUD();
  }

  _updateHUD() {
    const p = this.planets.find(p => p.id === this.selected);
    const btn = document.getElementById('btn-upgrade');
    if (p && p.owner === 'player' && p.level < 3) {
      btn.classList.remove('hidden');
      btn.disabled = p.units < 10;
      btn.style.opacity = p.units < 10 ? 0.4 : 1;
    } else {
      btn.classList.add('hidden');
    }
  }

  _sendUnits(from, to) {
    if (from.units < 2) return;
    const count = Math.floor(from.units * SEND_RATIO);
    from.units -= count;
    this.waves.push(new Wave(from, to, count, from.owner));
  }

  // ---- COMBAT ON ARRIVAL ---------------------------------------------------
  _resolveArrival(owner, p) {
    if (p.owner === owner) {
      // Reinforce
      p.units += 1;
    } else if (p.units < 1) {
      // Capture!
      const prevOwner = p.owner;
      p.units = 1;
      p.owner = owner;
      p.level = Math.max(0, p.level);   // keep level
      if (p.selected && prevOwner === 'player') {
        p.selected = false; this.selected = null;
      }
      this.audio.playCapture(owner);
    } else {
      // Damage
      p.units -= 1;
    }
  }

  // ---- WIN / LOSE CHECK ----------------------------------------------------
  _checkEnd() {
    const lv = LEVELS[this.levelIdx];

    // Player lost?
    if (!this.planets.some(p => p.owner === 'player')) { this._endGame(false); return; }

    if (lv.enemies.length === 0) {
      // Tutorial levels: win when player owns ALL planets
      if (this.planets.every(p => p.owner === 'player')) { this._endGame(true); return; }
    } else {
      // Normal levels: win when all listed enemy factions are eliminated
      const activeEnemies = lv.enemies;
      const allEliminated = activeEnemies.every(e =>
        !this.planets.some(p => p.owner === e));
      if (allEliminated) { this._endGame(true); return; }
    }
  }

  _endGame(win) {
    if (win) {
      this.completed.add(this.levelIdx);
      localStorage.setItem('mm_done', JSON.stringify([...this.completed]));
      this._buildLevels();
      // Hide next button if last level
      document.getElementById('btn-next').style.display =
        this.levelIdx + 1 < this.totalLevels ? '' : 'none';
      this._showScreen('win');
    } else {
      this._showScreen('lose');
    }
  }


  // ---- MAIN LOOP -----------------------------------------------------------
  _loop(ts) {
    requestAnimationFrame(t => this._loop(t));

    const dt = this.lastTime ? Math.min((ts - this.lastTime) / 1000, .05) * this.timeScale : 0;
    this.lastTime = ts;
    const t = ts / 1000;

    // Background always draws
    this.starfield.draw(t);

    if (this.state !== 'playing') {
      this.renderer.clear();
      return;
    }

    // Update planets
    for (const p of this.planets) {
      const prevLv = p.level;
      p.update(dt);
      if (p.level > prevLv) this.audio.playUpgrade();
    }

    // AI turns — each AI manages its own think timer via tick()
    for (const ai of this.ais) {
      const cmd = ai.tick(dt, this.planets);
      if (cmd) {
        const count = Math.floor(cmd.from.units * cmd.ratio);
        cmd.from.units -= count;
        this.waves.push(new Wave(cmd.from, cmd.to, count, ai.owner));
      }
    }

    // Update / resolve waves (streams)
    this.waves = this.waves.filter(w => {
      w.update(dt, (owner, target) => this._resolveArrival(owner, target));
      return !w.finished;
    });

    // Check end condition
    this._checkEnd();

    // Render
    this.renderer.clear();

    // Draw send line from selected to hovered? (skip for simplicity)
    const sel = this.planets.find(p => p.selected);

    // Draw waves first (below planets)
    for (const w of this.waves) this.renderer.drawWave(w, t);

    // Draw planets
    for (const p of this.planets) this.renderer.drawPlanet(p, t);
  }
}

// ---- BOOT ------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  window._game = new Game();
});

window.addEventListener('resize', () => {
  if (window._game) window._game._resize();
});
