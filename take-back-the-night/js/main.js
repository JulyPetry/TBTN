/* ============================================================
   TAKE BACK THE NIGHT — main.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initNav();
  initReveal();
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

  document.querySelectorAll('a, button').forEach((el) => {
    el.addEventListener('mouseenter', () => dot.style.transform += ' scale(2.2)');
    el.addEventListener('mouseleave', () => {
      dot.style.transform = dot.style.transform.replace(' scale(2.2)', '');
    });
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
   Scroll reveal via IntersectionObserver
--------------------------------------------------------- */
function initReveal() {
  const targets = document.querySelectorAll(
    '.content-text, .content-image, .walpurgis-text, .walpurgis-banners, .chant-line, .gallery-item, .mask-viewer-frame, .outro-content'
  );
  targets.forEach((el) => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  targets.forEach((el) => observer.observe(el));
}

/* ---------------------------------------------------------
   Lightbox for gallery
--------------------------------------------------------- */
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  const caption = document.getElementById('lightboxCaption');
  const closeBtn = document.getElementById('lightboxClose');
  if (!lightbox || !img) return;

  document.querySelectorAll('.gallery-item').forEach((item) => {
    item.addEventListener('click', () => {
      img.src = item.dataset.full;
      img.alt = item.querySelector('img')?.alt || '';
      caption.textContent = item.dataset.caption || '';
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
   - shows custom hint text
   - on Android (WebXR / scene-viewer) we can capture a frame
     from the live AR session via model-viewer's built-in
     `toDataURL` over the underlying canvas during an AR session.
   - on iOS (Quick Look / USDZ) there is no scriptable access
     to the AR camera view, so we show guidance to use the
     system screenshot instead.
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

  // Trigger AR when the custom button is clicked
  arButton?.addEventListener('click', (e) => {
    e.preventDefault();
    viewer.activateAR();
  });

  // Track AR session status to show/hide the capture bar
  viewer.addEventListener('ar-status', (event) => {
    const status = event.detail.status; // 'not-presenting' | 'session-started' | 'object-placed' | 'failed'

    if (status === 'session-started') {
      captureBar.hidden = false;
      if (isIOS) {
        // iOS Quick Look: no scriptable capture, show guidance instead
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

  // Capture: works where the platform exposes the AR camera feed to the
  // canvas (Android Scene Viewer / WebXR-based sessions on Chrome).
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

  // progress bar fill
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
