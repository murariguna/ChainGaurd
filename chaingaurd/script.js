/* ChainGuard — Shared interactive script */

// ----- Mock data -----
const TYPES = ['IP', 'Hash', 'Domain', 'URL'];
const SEVS = ['low', 'medium', 'high', 'critical'];
const SUBMITTERS = ['SOC-Node-A', 'SOC-Node-B', 'SOC-Node-C', 'SOC-Node-D', 'CERT-IN', 'Acme-SOC', 'BlueShield', 'Cyberion'];

const SAMPLE_INDICATORS = {
  IP: ['185.220.101.45', '194.26.29.114', '45.155.205.233', '103.97.176.42', '91.219.236.14', '23.105.131.187', '141.98.10.55'],
  Hash: ['a3f5c8...d9e2b1', '7b2e4f...ac81d3', '9f1d6c...58b4ee', 'c4e9a2...7d3f10', '2b8a6e...49ff8c'],
  Domain: ['malicious-cdn.xyz', 'phish-login.top', 'evil-update.ru', 'fake-bank-secure.io', 'darkpool-c2.net'],
  URL: ['http://bad.tld/payload.exe', 'https://phish.io/login', 'http://c2.evil/beacon']
};

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function genIoC() {
  const type = rand(TYPES);
  return {
    type,
    indicator: rand(SAMPLE_INDICATORS[type]),
    severity: rand(SEVS),
    submitter: rand(SUBMITTERS),
    time: 'just now',
    ts: Date.now()
  };
}

// ----- Mobile menu -----
document.addEventListener('DOMContentLoaded', () => {
  const burger = document.querySelector('.hamburger');
  const links = document.querySelector('.nav-links');
  if (burger && links) burger.addEventListener('click', () => links.classList.toggle('open'));

  // page routers
  if (document.getElementById('terminal')) initTerminal();
  if (document.getElementById('ioc-stream')) initDashboard();
  if (document.getElementById('threat-grid')) initThreatFeed();
  if (document.getElementById('net-canvas')) initNetwork();
  if (document.getElementById('profile-iocs')) initProfileFeed();

  // animated stats counters on home
  ['stat-iocs', 'stat-nodes', 'stat-blocks'].forEach(id => {
    const el = document.getElementById(id);
    if (el) animateCounter(el, parseInt(el.textContent.replace(/,/g, ''), 10));
  });
});

function animateCounter(el, target) {
  let cur = 0;
  const step = Math.max(1, Math.floor(target / 60));
  const t = setInterval(() => {
    cur += step;
    if (cur >= target) { cur = target; clearInterval(t); }
    el.textContent = cur.toLocaleString();
  }, 22);
}

// ----- Hero terminal -----
function initTerminal() {
  const term = document.getElementById('terminal');
  const lines = [
    { t: '$ chainguard agent --start', c: '' },
    { t: '[ok] Connecting to peer0.nodea.chainguard.io ...', c: 'ok' },
    { t: '[ok] Channel "chainguard-mainnet" joined', c: 'ok' },
    { t: '[ok] Chaincode "ioc-store@v2.3" ready', c: 'ok' },
    { t: '> Listening for new IoCs ...', c: 'muted' },
    { t: '[NEW] IP   185.220.101.45      severity=HIGH    src=BlueShield', c: '' },
    { t: '[NEW] HASH a3f5c8...d9e2b1     severity=CRIT    src=CERT-IN', c: '' },
    { t: '[push] firewall.block(185.220.101.45) → applied', c: 'ok' },
    { t: '[NEW] DOM  phish-login.top     severity=MED     src=Cyberion', c: '' },
    { t: '[push] dns.sinkhole(phish-login.top) → applied', c: 'ok' },
    { t: '[warn] stale IoC purged: 91.219.236.14 (>30d)', c: 'warn' },
    { t: '> Block #94201 committed · 12 txs · 1.4s', c: 'muted' },
  ];
  let i = 0, charIndex = 0;
  let buffer = '';
  function tick() {
    if (i >= lines.length) {
      // loop with a fresh "live" line every few seconds
      setTimeout(() => {
        const ioc = genIoC();
        lines.push({ t: `[NEW] ${ioc.type.padEnd(4)} ${ioc.indicator.padEnd(22)} severity=${ioc.severity.toUpperCase()} src=${ioc.submitter}`, c: '' });
        tick();
      }, 1800);
      return;
    }
    const line = lines[i];
    if (charIndex < line.t.length) {
      charIndex++;
      render(buffer, line, charIndex);
      setTimeout(tick, 12);
    } else {
      buffer += `<span class="${line.c}">${escapeHtml(line.t)}</span>\n`;
      i++; charIndex = 0;
      setTimeout(tick, 250);
    }
  }
  function render(buf, line, idx) {
    term.innerHTML = buf + `<span class="${line.c}">${escapeHtml(line.t.slice(0, idx))}</span><span class="cur"></span>`;
    term.scrollTop = term.scrollHeight;
  }
  tick();
}
function escapeHtml(s){return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}

// ----- Dashboard -----
function initDashboard() {
  const stream = document.getElementById('ioc-stream');
  const blocksBody = document.getElementById('blocks-body');
  const blockNo = document.getElementById('block-no');
  const kpiIocs = document.getElementById('kpi-iocs');
  const kpiBlocked = document.getElementById('kpi-blocked');

  // seed
  for (let i = 0; i < 8; i++) addIoCRow(genIoC(), false);
  for (let i = 0; i < 6; i++) addBlockRow();

  // live updates
  setInterval(() => {
    addIoCRow(genIoC(), true);
    if (kpiIocs) kpiIocs.textContent = (parseInt(kpiIocs.textContent.replace(/,/g,''),10) + 1).toLocaleString();
    if (Math.random() < 0.4 && kpiBlocked) kpiBlocked.textContent = (parseInt(kpiBlocked.textContent.replace(/,/g,''),10) + 1).toLocaleString();
  }, 3500);

  setInterval(() => {
    addBlockRow();
    if (blockNo) blockNo.textContent = (parseInt(blockNo.textContent,10) + 1);
  }, 7000);

  function addIoCRow(ioc, isNew) {
    const li = document.createElement('li');
    if (isNew) li.classList.add('new');
    li.innerHTML = `
      <span class="type">${ioc.type}</span>
      <span class="ind">${ioc.indicator}</span>
      <span class="sev ${ioc.severity}">${ioc.severity}</span>
      <span class="time">${ioc.submitter}</span>`;
    stream.prepend(li);
    while (stream.children.length > 14) stream.removeChild(stream.lastChild);
  }
  function addBlockRow() {
    const n = blockNo ? parseInt(blockNo.textContent,10) : 94201;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${n}</td>
      <td class="hash">0x${Math.random().toString(16).slice(2,10)}…${Math.random().toString(16).slice(2,6)}</td>
      <td>${1 + Math.floor(Math.random()*18)}</td>
      <td>${rand(SUBMITTERS)}</td>
      <td>${new Date().toLocaleTimeString()}</td>`;
    blocksBody.prepend(tr);
    while (blocksBody.children.length > 8) blocksBody.removeChild(blocksBody.lastChild);
  }
}

function submitIoC(e) {
  e.preventDefault();
  const form = e.target;
  const inputs = form.querySelectorAll('input,select,textarea');
  const ioc = {
    type: inputs[0].value.split(' ')[0],
    indicator: inputs[1].value,
    severity: inputs[2].value.toLowerCase(),
    submitter: 'SOC-Node-A (you)'
  };
  const stream = document.getElementById('ioc-stream');
  if (stream) {
    const li = document.createElement('li');
    li.classList.add('new');
    li.innerHTML = `
      <span class="type">${ioc.type}</span>
      <span class="ind">${ioc.indicator}</span>
      <span class="sev ${ioc.severity}">${ioc.severity}</span>
      <span class="time">${ioc.submitter}</span>`;
    stream.prepend(li);
  }
  inputs[1].value = '';
  toast(`✓ Signed & broadcast to 38 peers`);
  return false;
}

function toast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position:'fixed', bottom:'24px', right:'24px', zIndex:9999,
    padding:'.9rem 1.2rem', background:'var(--surface)', border:'1px solid var(--cyan)',
    borderRadius:'10px', color:'var(--text)', fontFamily:'var(--mono)', fontSize:'.85rem',
    boxShadow:'0 0 24px rgba(94,234,212,0.4)', animation:'slideIn .3s ease'
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

// ----- Threat Feed -----
function initThreatFeed() {
  const grid = document.getElementById('threat-grid');
  const search = document.getElementById('search');
  const ftype = document.getElementById('filter-type');
  const fsev = document.getElementById('filter-sev');

  const items = [];
  for (let i = 0; i < 24; i++) items.push(genIoC());
  // give them stable timestamps
  items.forEach((it, idx) => it.time = `${idx*7 + 2}m ago`);

  function render() {
    const q = search.value.toLowerCase();
    const t = ftype.value;
    const s = fsev.value.toLowerCase();
    grid.innerHTML = '';
    items
      .filter(it => (!t || it.type === t) && (!s || it.severity === s) && (!q || it.indicator.toLowerCase().includes(q)))
      .forEach(it => {
        const card = document.createElement('div');
        card.className = 'threat-card';
        card.innerHTML = `
          <div class="row">
            <span class="type">${it.type}</span>
            <span class="sev ${it.severity}">${it.severity}</span>
          </div>
          <div class="ind">${it.indicator}</div>
          <p class="muted" style="font-size:.85rem">Submitted by <strong style="color:var(--text)">${it.submitter}</strong></p>
          <div class="meta"><span>${it.time}</span><span>Block #${94000 + Math.floor(Math.random()*200)}</span></div>`;
        grid.appendChild(card);
      });
    if (!grid.children.length) grid.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center;padding:3rem">No matching indicators.</p>';
  }
  [search, ftype, fsev].forEach(el => el.addEventListener('input', render));
  render();
}

// ----- Network canvas (animated graph) -----
function initNetwork() {
  const canvas = document.getElementById('net-canvas');
  const list = document.getElementById('node-list');
  const ctx = canvas.getContext('2d');
  function size() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
  }
  size();

  const NAMES = ['SOC-NodeA','SOC-NodeB','BlueShield','CERT-IN','Cyberion','Acme-SOC','GovCERT','FinSec','DefendCo','NetGuard','Sentinel-X','RedHorizon','PhoenixSec','OrbitSec'];
  const nodes = NAMES.map((n,i) => ({
    name: n,
    angle: (i / NAMES.length) * Math.PI * 2,
    r: 0,
    pulse: Math.random()
  }));

  // populate node list
  if (list) {
    list.innerHTML = nodes.map(n => `<li><span class="name">● ${n.name}</span><span class="lat">${(20 + Math.random()*120).toFixed(0)}ms</span></li>`).join('');
  }

  let t = 0;
  const beams = []; // active "transmissions"
  setInterval(() => {
    beams.push({ from: Math.floor(Math.random()*nodes.length), to: Math.floor(Math.random()*nodes.length), p: 0 });
  }, 600);

  function frame() {
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);
    const cx = w/2, cy = h/2;
    const R = Math.min(w,h)/2 - 50;

    // edges
    ctx.strokeStyle = 'rgba(94,234,212,0.12)';
    ctx.lineWidth = 1;
    nodes.forEach((n,i) => {
      const x1 = cx + Math.cos(n.angle + t*0.0005) * R;
      const y1 = cy + Math.sin(n.angle + t*0.0005) * R;
      nodes.forEach((m,j) => {
        if (j <= i) return;
        if ((i+j) % 3 !== 0) return;
        const x2 = cx + Math.cos(m.angle + t*0.0005) * R;
        const y2 = cy + Math.sin(m.angle + t*0.0005) * R;
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      });
    });

    // central hub
    const grad = ctx.createRadialGradient(cx,cy,0,cx,cy,80);
    grad.addColorStop(0,'rgba(94,234,212,0.5)');
    grad.addColorStop(1,'rgba(94,234,212,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx,cy,80,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#5eead4';
    ctx.beginPath(); ctx.arc(cx,cy,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e6edf6';
    ctx.font = '600 12px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('LEDGER', cx, cy + 28);

    // beams
    for (let b = beams.length - 1; b >= 0; b--) {
      const beam = beams[b];
      beam.p += 0.025;
      if (beam.p > 1) { beams.splice(b,1); continue; }
      const f = nodes[beam.from], to = nodes[beam.to];
      const fx = cx + Math.cos(f.angle + t*0.0005) * R;
      const fy = cy + Math.sin(f.angle + t*0.0005) * R;
      const tx = cx + Math.cos(to.angle + t*0.0005) * R;
      const ty = cy + Math.sin(to.angle + t*0.0005) * R;
      // route through center
      const mx = cx, my = cy;
      const seg = beam.p < 0.5 ? beam.p*2 : (beam.p-0.5)*2;
      const sx = beam.p < 0.5 ? fx + (mx-fx)*seg : mx + (tx-mx)*seg;
      const sy = beam.p < 0.5 ? fy + (my-fy)*seg : my + (ty-my)*seg;
      ctx.fillStyle = '#a3ff8c';
      ctx.shadowBlur = 12; ctx.shadowColor = '#a3ff8c';
      ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // nodes
    nodes.forEach((n,i) => {
      const x = cx + Math.cos(n.angle + t*0.0005) * R;
      const y = cy + Math.sin(n.angle + t*0.0005) * R;
      const pulse = 4 + Math.sin(t*0.005 + i) * 2;
      ctx.fillStyle = 'rgba(94,234,212,0.2)';
      ctx.beginPath(); ctx.arc(x,y, 14 + pulse, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath(); ctx.arc(x,y, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#e6edf6';
      ctx.font = '500 11px JetBrains Mono';
      ctx.textAlign = x < cx ? 'right' : 'left';
      ctx.fillText(n.name, x + (x < cx ? -16 : 16), y + 4);
    });

    t++;
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize', size);
  frame();
}

// ----- Profile feed -----
function initProfileFeed() {
  const ul = document.getElementById('profile-iocs');
  for (let i = 0; i < 5; i++) {
    const ioc = genIoC();
    const li = document.createElement('li');
    li.innerHTML = `<span class="type">${ioc.type}</span><span class="ind">${ioc.indicator}</span><span class="sev ${ioc.severity}">${ioc.severity}</span>`;
    ul.appendChild(li);
  }
}
