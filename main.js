/* ============================================================
   TAKE BACK THE NIGHT — main.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initNav();
  initTileTouch();
  initLightbox();
  initMaskViewer('1');
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

function initAsh_DISABLED() {
  const canvas = document.getElementById('ashCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COUNT        = 48;
  const REPEL_RADIUS = 110;
  const REPEL_FORCE  = 0.3;
  const DAMPING      = 0.91;
  const FADE_ZONE    = 80; // px above intro bottom where particles fade to 0

  let W = window.innerWidth;
  let H = window.innerHeight;
  let mouse = { x: -9999, y: -9999 };
  let introBottom = getIntroBottom();

  function getIntroBottom() {
    const intro = document.querySelector('.intro-section');
    if (!intro) return H;
    return intro.getBoundingClientRect().bottom + window.scrollY;
  }

  canvas.width  = W;
  canvas.height = H;

  window.addEventListener('resize', () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
    introBottom = getIntroBottom();
  });

  window.addEventListener('scroll', () => {
    introBottom = getIntroBottom();
  }, { passive: true });

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // Sharp rectangular particles — width & height vary slightly for organic feel
  function makeParticle() {
    const size = 3 + Math.random() * 5;
    return {
      x:        Math.random() * W,
      y:        Math.random() * introBottom,
      vx:       (Math.random() - 0.5) * 0.22,
      vy:       0.10 + Math.random() * 0.20,
      w:        size,
      h:        size * (0.5 + Math.random() * 0.8), // slightly non-square
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.010,
    };
  }

  const particles = Array.from({ length: COUNT }, makeParticle);

  // Single dark charcoal — full opacity, drawn per-particle with alpha only for fade-out
  const DARK = 'rgb(38, 36, 34)';

  function drawParticle(p, scrollY) {
    const viewY = p.y - scrollY;

    // Alpha = 1 fully in intro, fades to 0 approaching introBottom
    let alpha = 1;
    if (p.y > introBottom - FADE_ZONE) {
      alpha = Math.max(0, (introBottom - p.y) / FADE_ZONE);
    }
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, viewY);
    ctx.rotate(p.rotation);
    ctx.fillStyle = DARK;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    const scrollY = window.scrollY;

    for (const p of particles) {
      // mouse repulsion in viewport-space
      const viewY = p.y - scrollY;
      const dx = p.x - mouse.x;
      const dy = viewY - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < REPEL_RADIUS && dist > 0) {
        const force = (1 - dist / REPEL_RADIUS) * REPEL_FORCE;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      p.vx *= DAMPING;
      p.vy  = p.vy * DAMPING + (1 - DAMPING) * (0.14 + p.w * 0.03);
      p.x  += p.vx;
      p.y  += p.vy;
      p.rotation += p.rotSpeed;

      // wrap horizontally
      if (p.x < -12)    p.x = W + 12;
      if (p.x > W + 12) p.x = -12;

      // wrap vertically: when below intro, respawn at top
      if (p.y > introBottom + 12) {
        p.y = -12;
        p.x = Math.random() * W;
      }

      drawParticle(p, scrollY);
    }

    requestAnimationFrame(tick);
  }

  tick();
}
