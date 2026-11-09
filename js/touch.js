"use strict";
// kontrola dotykowa — wirtualny joystick i przyciski dla urządzeń mobilnych

if ('ontouchstart' in window || navigator.maxTouchPoints > 0) setupTouchControls();

function setupTouchControls() {
  const touchUI = document.getElementById('touch-ui');
  const joyBase = document.getElementById('joy-base');
  const joyKnob = document.getElementById('joy-knob');
  const app     = document.getElementById('app');

  let joyId = -1, joyOx = 0, joyOy = 0;
  let lookId = -1, lookLx = 0, lookLy = 0;
  const JOY_MAX = 44;

  function getAppRect() { return app.getBoundingClientRect(); }

  function isLeftHalf(clientX) {
    const r = getAppRect();
    return clientX < r.left + r.width * 0.5;
  }

  function isOnButton(el) {
    return el && el.closest &&
      el.closest('#tbtn-fire,#tbtn-sprint,#tbtn-reload,#tbtn-pause');
  }

  function moveJoyKnob(dx, dy) {
    const len = Math.hypot(dx, dy);
    if (len === 0) { joyKnob.style.transform = ''; return; }
    const c = Math.min(len, JOY_MAX);
    joyKnob.style.transform = `translate(${dx/len*c}px,${dy/len*c}px)`;
  }

  function setJoyKeys(dx, dy) {
    const th = JOY_MAX * 0.28;
    keys.KeyW = dy < -th;
    keys.KeyS = dy >  th;
    keys.KeyA = dx < -th;
    keys.KeyD = dx >  th;
  }

  function clearJoy() {
    joyBase.style.display = 'none';
    joyKnob.style.transform = '';
    keys.KeyW = keys.KeyS = keys.KeyA = keys.KeyD = false;
    joyId = -1;
  }

  app.addEventListener('touchstart', e => {
    if (!running) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (isOnButton(t.target)) continue;
      if (isLeftHalf(t.clientX)) {
        if (joyId === -1) {
          joyId = t.identifier;
          joyOx = t.clientX;
          joyOy = t.clientY;
          const r = getAppRect();
          joyBase.style.left    = (t.clientX - r.left) + 'px';
          joyBase.style.top     = (t.clientY - r.top)  + 'px';
          joyBase.style.display = 'block';
        }
      } else {
        if (lookId === -1) {
          lookId = t.identifier;
          lookLx = t.clientX;
          lookLy = t.clientY;
        }
      }
    }
  }, { passive: false });

  app.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        const dx = t.clientX - joyOx;
        const dy = t.clientY - joyOy;
        moveJoyKnob(dx, dy);
        setJoyKeys(dx, dy);
      } else if (t.identifier === lookId) {
        const dx = t.clientX - lookLx;
        const dy = t.clientY - lookLy;
        lookLx = t.clientX;
        lookLy = t.clientY;
        P.a += dx * 0.004 * opt.sens;
        P.pitch = clamp(P.pitch - dy * 0.9 * opt.sens, -70, 70);
      }
    }
  }, { passive: false });

  function handleTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) clearJoy();
      if (t.identifier === lookId) lookId = -1;
    }
  }
  app.addEventListener('touchend',    handleTouchEnd, { passive: false });
  app.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  // --- Przyciski akcji ---
  function btnTouch(id, onStart, onEnd) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => {
      e.preventDefault(); e.stopPropagation();
      if (running) onStart();
    }, { passive: false });
    if (onEnd) {
      const end = e => { e.preventDefault(); e.stopPropagation(); onEnd(); };
      el.addEventListener('touchend',    end, { passive: false });
      el.addEventListener('touchcancel', end, { passive: false });
    }
  }

  btnTouch('tbtn-fire',
    () => { keys.Mouse0 = true; fireClicks++; },
    () => { keys.Mouse0 = false; }
  );
  btnTouch('tbtn-sprint',
    () => { keys.ShiftLeft = true; },
    () => { keys.ShiftLeft = false; }
  );
  btnTouch('tbtn-reload', () => {
    if (P.w === W_SHOTGUN && P.reloadT <= 0 &&
        P.mag < WEAPONS[W_SHOTGUN].mag && P.shells > 0) startReload();
  });
  btnTouch('tbtn-pause', () => { pause(); });

  // Pokaż/ukryj w zależności od stanu nakładki.
  // setTimeout(0) bo running=true jest ustawiane linię PO overlay.classList.add('hidden').
  new MutationObserver(() => {
    setTimeout(() => {
      touchUI.style.display =
        (overlay.classList.contains('hidden') && running) ? 'block' : 'none';
    }, 0);
  }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
}
