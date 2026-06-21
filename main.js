/* ============================================================
   TAKE BACK THE NIGHT — main.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initNav();
  initTileTouch();
  initLightbox();
  initMaskViewer();
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
--------------------------------------------------------- */
function initTileTouch() {
  const isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!isTouch) return;

  const tiles = document.querySelectorAll('.tile');
  tiles.forEach((tile) => {
    const hasBack = tile.querySelector('.tile-back');
    if (!hasBack) return; // tiles without a back layer don't need toggling

    tile.addEventListener('click', (e) => {
      // ignore taps that land on an actual link/button inside the tile,
      // or on a gallery image (those open the lightbox instead)
      if (e.target.closest('a, button')) return;
      if (tile.classList.contains('tile-img')) return;

      const wasOpen = tile.classList.contains('is-open');
      tiles.forEach((t) => t.classList.remove('is-open'));
      if (!wasOpen) tile.classList.add('is-open');
    });
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
   Model-viewer / AR mask handling
--------------------------------------------------------- */
function initMaskViewer() {
  const viewer = document.getElementById('maskViewer');
  const arButton = document.getElementById('customArButton');
  const captureBar = document.getElementById('captureBar');
  const captureBtn = document.getElementById('captureBtn');
  const captureNote = document.getElementById('captureNote');
  const photoOverlay = document.getElementById('photoOverlay');
  const photoResult = document.getElementById('photoResult');
  const downloadPhoto = document.getElementById('downloadPhoto');
  const closePhoto = document.getElementById('closePhoto');
  const arHint = document.getElementById('arHint');

  if (!viewer) return;

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
