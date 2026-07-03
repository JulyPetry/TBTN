/* ============================================================
   TAKE BACK THE NIGHT — main.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initNav();
  initTileTouch();
  initLightbox();
  initMaskViewer('1');
  initMaskViewer('2');
  initMaskViewer('3');
  initAsh();
});

/* ---------------------------------------------------------
   Custom cursor dot (desktop, fine pointer only)
--------------------------------------------------------- */
function initCursor() {
  const dot = document.querySelector('.cursor-dot');
  if (!dot || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  window.addEventListener('mousemove', (e) => {
    dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });
}

/* ---------------------------------------------------------
   Mobile nav toggle
--------------------------------------------------------- */
function initNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Menü schließen' : 'Menü öffnen');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

/* ---------------------------------------------------------
   Tile reveal on touch devices.
   Desktop relies purely on CSS :hover. Touch devices (no
   hover) get a tap-to-toggle instead, so the "back" content
   stays reachable without a mouse.

   Bugfix: a link/button living in .tile-back only becomes
   clickable once .tile-front has pointer-events:none (handled
   in CSS). Here we additionally make sure that tapping the
   already-open tile's *link itself* triggers normal navigation
   instead of re-toggling the tile shut before the click lands.
--------------------------------------------------------- */
function initTileTouch() {
  const isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!isTouch) return;

  const tiles = document.querySelectorAll('.tile');

  tiles.forEach((tile) => {
    const emptyFront = tile.querySelector('.tile-front.tile-front-empty');
    if (!emptyFront) return; // tiles that already show content never toggle

    tile.addEventListener('click', (e) => {
      const isInteractive = e.target.closest('a, button');

      // a real link/button inside an already-open tile: let it work,
      // don't toggle the tile state at all.
      if (isInteractive && tile.classList.contains('is-open')) return;

      // any other tap (including a tap that happens to land on a
      // link before the tile is open) just opens/closes the tile
      e.preventDefault();
      const wasOpen = tile.classList.contains('is-open');
      tiles.forEach((t) => t.classList.remove('is-open'));
      if (!wasOpen) tile.classList.add('is-open');
    });
  });

  // tapping outside any tile closes whichever one is open
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tile')) {
      tiles.forEach((t) => t.classList.remove('is-open'));
    }
  });
}

/* ---------------------------------------------------------
   Lightbox for gallery images
--------------------------------------------------------- */
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  const caption = document.getElementById('lightboxCaption');
  const closeBtn = document.getElementById('lightboxClose');
  if (!lightbox || !img) return;

  document.querySelectorAll('.tile-img').forEach((item) => {
    item.addEventListener('click', () => {
      const fullImg = item.querySelector('img');
      const backLabel = item.querySelector('.tile-back .t-back-label');
      if (!fullImg) return;

      img.src = fullImg.src;
      img.alt = fullImg.alt || '';
      caption.textContent = backLabel ? backLabel.textContent.replace(/\s+/g, ' ').trim() : '';
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
    });
  });

  const close = () => {
    lightbox.hidden = true;
    document.body.style.overflow = '';
  };

  closeBtn?.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.hidden) close();
  });
}

/* ---------------------------------------------------------
   Model-viewer / AR mask handling.
   Generic version: pass '1', '2', or '3' and it wires up the
   matching viewer + AR button + capture flow via data attributes,
   so all three masks share identical behaviour.
--------------------------------------------------------- */
function initMaskViewer(n) {
  const viewer = document.getElementById(`maskViewer${n}`);
  if (!viewer) return;

  const arButton = viewer.querySelector(`[data-ar-button="${n}"]`);
  const captureBar = document.querySelector(`[data-capture-bar="${n}"]`);
  const captureBtn = document.querySelector(`[data-capture-btn="${n}"]`);
  const captureNote = document.querySelector(`[data-capture-note="${n}"]`);
  const photoOverlay = document.querySelector(`[data-photo-overlay="${n}"]`);
  const photoResult = document.querySelector(`[data-photo-result="${n}"]`);
  const downloadPhoto = document.querySelector(`[data-download-photo="${n}"]`);
  const closePhoto = document.querySelector(`[data-close-photo="${n}"]`);
  const arHint = document.querySelector(`[data-ar-hint="${n}"]`);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  arButton?.addEventListener('click', (e) => {
    e.preventDefault();
    viewer.activateAR();
  });

  viewer.addEventListener('ar-status', (event) => {
    const status = event.detail.status; // 'not-presenting' | 'session-started' | 'object-placed' | 'failed'

    if (status === 'session-started') {
      captureBar.hidden = false;
      if (isIOS) {
        captureBtn.hidden = true;
        captureNote.textContent = 'Auf iPhone/iPad: Mach den Screenshot wie gewohnt über die Seitentaste + Lautstärketaste, sobald die Maske platziert ist.';
      } else {
        captureBtn.hidden = false;
        captureNote.textContent = 'Platziere die Maske im Raum, dann tippe auf „Foto aufnehmen“.';
      }
    }

    if (status === 'object-placed' && !isIOS) {
      captureNote.textContent = 'Maske platziert — tippe auf „Foto aufnehmen“, um sie festzuhalten.';
    }

    if (status === 'not-presenting') {
      captureBar.hidden = true;
    }

    if (status === 'failed') {
      captureNote.textContent = 'AR konnte nicht gestartet werden. Manche Geräte/Browser unterstützen WebXR/AR nicht vollständig.';
      captureBar.hidden = false;
      captureBtn.hidden = true;
    }
  });

  captureBtn?.addEventListener('click', async () => {
    try {
      const dataUrl = await viewer.toDataURL('image/png');
      if (!dataUrl || dataUrl === 'data:,') throw new Error('empty-frame');

      photoResult.src = dataUrl;
      downloadPhoto.href = dataUrl;
      photoOverlay.hidden = false;
    } catch (err) {
      captureNote.textContent = 'Foto-Aufnahme wird auf diesem Gerät/Browser leider nicht unterstützt. Nutze stattdessen den Screenshot deines Smartphones.';
    }
  });

  closePhoto?.addEventListener('click', () => {
    photoOverlay.hidden = true;
  });
  photoOverlay?.addEventListener('click', (e) => {
    if (e.target === photoOverlay) photoOverlay.hidden = true;
  });

  viewer.addEventListener('progress', (event) => {
    const fill = viewer.querySelector('.mv-progress-fill');
    if (fill) fill.style.width = `${event.detail.totalProgress * 100}%`;
  });
  viewer.addEventListener('load', () => {
    viewer.setAttribute('loaded', '');
  });

  if (arHint && isIOS) {
    arHint.textContent = 'Auf dem iPhone öffnet der AR-Button die native AR-Vorschau (Quick Look). Screenshot über die Hardware-Tasten.';
  }
}

/* ---------------------------------------------------------
   Ash particle system.
   Small dark flakes drift slowly across the full viewport.
   On desktop, the mouse repels them gently — like ash
   caught in a breeze. On touch devices they drift on their
   own without interaction.
--------------------------------------------------------- */
function initAsh() {
  const canvas = document.getElementById('ashCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COUNT = 55;
  const REPEL_RADIUS = 100;
  const REPEL_FORCE  = 0.28;
  const DAMPING      = 0.92;

  let W = window.innerWidth;
  let H = window.innerHeight;
  let mouse = { x: -999, y: -999 };

  canvas.width  = W;
  canvas.height = H;

  window.addEventListener('resize', () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
  });

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // Particle factory — random shape, size, drift speed, rotation
  function makeParticle() {
    const size = 1.5 + Math.random() * 3.5;
    return {
      x:   Math.random() * W,
      y:   Math.random() * H,
      vx:  (Math.random() - 0.5) * 0.25,
      vy:  0.08 + Math.random() * 0.22,   // mostly drifting downward
      size,
      // irregular polygon points (2–4 sides offset from circle)
      sides: 3 + Math.floor(Math.random() * 2),
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.012,
      // slightly varied dark greys, occasionally a warm near-black
      alpha: 0.18 + Math.random() * 0.28,
      color: Math.random() < 0.15
        ? `rgba(${100 + Math.floor(Math.random()*40)},${20+Math.floor(Math.random()*20)},${10+Math.floor(Math.random()*10)},`
        : `rgba(${30 + Math.floor(Math.random()*40)},${28+Math.floor(Math.random()*20)},${25+Math.floor(Math.random()*15)},`,
    };
  }

  const particles = Array.from({ length: COUNT }, makeParticle);

  function drawParticle(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.beginPath();
    for (let i = 0; i < p.sides; i++) {
      const angle = (i / p.sides) * Math.PI * 2;
      const r = p.size * (0.7 + 0.3 * Math.sin(angle * 1.7));
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = p.color + p.alpha + ')';
    ctx.fill();
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);

    for (const p of particles) {
      // mouse repulsion
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < REPEL_RADIUS && dist > 0) {
        const force = (1 - dist / REPEL_RADIUS) * REPEL_FORCE;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      // gentle damping so they don't fly off forever
      p.vx *= DAMPING;
      p.vy = p.vy * DAMPING + (1 - DAMPING) * (0.12 + p.size * 0.04);

      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      // wrap around edges with a small margin
      if (p.y > H + 12) { p.y = -12; p.x = Math.random() * W; }
      if (p.x < -12)    p.x = W + 12;
      if (p.x > W + 12) p.x = -12;

      drawParticle(p);
    }

    requestAnimationFrame(tick);
  }

  tick();
}
