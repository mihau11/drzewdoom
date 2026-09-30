"use strict";
// ekrany nakładki: tytuł, opcje, sklep, pauza, koniec gry, nowa gra

/* ============================================================
   PĘTLA
   ============================================================ */
const overlay=document.getElementById('overlay');
let uiScreen = 'title';              // aktualnie widoczny ekran nakładki
function showTitle(){
  uiScreen = 'title';
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<div class="fitbox">
    <h1>DRZEWODOOM</h1>
    <h2>Las się obudził. I jest wściekły.</h2>
    ${best.score>0 ? `<div id="stats">REKORD: <b>${best.score}</b> pkt · fala <b>${best.wave}</b> · ścięte <b>${best.kills}</b></div>` : ''}
    <div id="stats" style="color:#e0c14a">WIÓRY: <b>${save.chips}</b></div>
    <div id="titlecols">
      <div id="lore">Zasnąłeś w lesie. Obudziłeś się w innym. Drzewa się ruszają. Korzenie wychodzą
        z ziemi i idą w twoją stronę. Masz przy sobie tylko starą siekierę. Głębiej w lesie
        śpi coś większego — na razie śpi. Ścinaj drzewa, zbieraj wióry. Wydawaj je na lepszą
        broń, zanim będzie za późno. Jeśli zginiesz, stracisz wszystko, co zdobyłeś.
        Ten las nie daje drugiej szansy.</div>
      <div id="modes">
        <div class="modebox" id="mNormal"><b>${FOREST_MODES.normal.name}</b><span>${FOREST_MODES.normal.desc}</span></div>
        <div class="modebox rich" id="mRich"><b>${FOREST_MODES.rich.name}</b><span>${FOREST_MODES.rich.desc}</span></div>
      </div>
      <div id="titlekeys">
        <b>WSAD</b> ruch<br>
        <b>MYSZ</b> rozglądanie<br>
        <b>LPM / SPACJA</b> atak<br>
        <b>SHIFT</b> bieg<br>
        <b>1–4</b> broń (rolka też)<br>
        <b>R</b> przeładuj<br>
        <b>M</b> dźwięk<br>
        <b>O</b> opcje<br>
        <b>B</b> sklep<br>
        <b>P</b> pauza
      </div>
    </div>
    <div class="link" id="tshop">SKLEP</div>
    <div class="link" id="topt">OPCJE</div>
  </div>`;
  fitBox();
  overlay.onclick = null;
  document.getElementById('mNormal').onclick = ev=>{ ev.stopPropagation(); newGame('normal'); };
  document.getElementById('mRich').onclick = ev=>{ ev.stopPropagation(); newGame('rich'); };
  document.getElementById('tshop').onclick = ev=>{ ev.stopPropagation(); showShop('title'); };
  document.getElementById('topt').onclick = ev=>{ ev.stopPropagation(); showOptions('title'); };
}
/* ---------- opcje ---------- */
function applyRes(){
  W = RES[opt.res][0]; H = RES[opt.res][1];
  allocBuffers();
  fit();
}
function applyFov(){
  PLANE = 0.66*opt.fov;
  FOV_HALF = Math.atan(PLANE)+0.04;   // „cichosz" korzysta z tej samej wartości
}
let optReturn = 'title';               // gdzie wrócić po zamknięciu opcji
function showOptions(from){
  optReturn = from || optReturn;
  uiScreen = 'options';
  running = false;
  if(document.pointerLockElement===cv) document.exitPointerLock();
  overlay.classList.remove('hidden');
  overlay.onclick = null;              // tło nie zamyka — łatwo kliknąć obok suwaka
  const row = (key,label,val)=>
    `<div class="optrow" data-k="${key}"><span>${label}</span>
       <span><span class="optbtn" data-d="-1">&#9664;</span><b>${val}</b><span class="optbtn" data-d="1">&#9654;</span></span></div>`;
  overlay.innerHTML = `<div class="fitbox">
    <h1 style="font-size:calc(13px*var(--s))">OPCJE</h1>
    <div id="optrows">
      ${row('sens','CZUŁOŚĆ MYSZY', opt.sens.toFixed(2))}
      ${row('fov','POLE WIDZENIA', Math.round(2*Math.atan(PLANE)*180/Math.PI)+'&deg;')}
      ${row('res','ROZDZIELCZOŚĆ', RES[opt.res][0]+'×'+RES[opt.res][1])}
      ${row('vol','GŁOŚNOŚĆ', Math.round(opt.vol*100)+'%')}
    </div>
    <div class="link" id="optback">POWRÓT (O)</div>
  </div>`;
  fitBox();
  for(const b of overlay.querySelectorAll('.optbtn')){
    b.onclick = ev=>{
      ev.stopPropagation();
      const k = b.parentNode.parentNode.getAttribute('data-k'), d = +b.getAttribute('data-d');
      if(k==='sens')     opt.sens = clampNum(+(opt.sens + d*0.1).toFixed(2), 0.3, 2.5, 1);
      else if(k==='fov'){ opt.fov = clampNum(+(opt.fov + d*0.05).toFixed(2), 0.8, 1.4, 1); applyFov(); }
      else if(k==='res'){ opt.res = Math.min(RES.length-1, Math.max(0, opt.res+d)); applyRes(); }
      else if(k==='vol'){ opt.vol = clampNum(+(opt.vol + d*0.05).toFixed(2), 0, 1, 0.5);
                          if(master && !muted) master.gain.value = opt.vol; }
      saveOpt();
      showOptions();                   // przerysuj z nowymi wartościami
    };
  }
  document.getElementById('optback').onclick = ev=>{ ev.stopPropagation(); closeOptions(); };
}
function closeOptions(){
  if(optReturn==='pause') pause(); else showTitle();
}

/* ---------- sklep (ekran) ---------- */
let shopReturn = 'title';           // gdzie wrócić po zamknięciu sklepu
function showShop(from){
  shopReturn = from || shopReturn;
  uiScreen = 'shop';
  running = false;
  if(document.pointerLockElement===cv) document.exitPointerLock();
  overlay.classList.remove('hidden');
  overlay.onclick = null;
  const rows = UPGRADES.map(u=>{
    const lvl = save.up[u.key], maxed = lvl>=u.max;
    const right = maxed
      ? '<b style="color:#7fa06d">MAKS</b>'
      : `<span class="optbtn" data-buy="${u.key}">KUP za ${upCost(u)}</span>`;
    return `<div class="optrow" data-k="${u.key}" style="align-items:flex-start">
        <span>${u.name} <span style="color:#6f8f61">(${lvl}/${u.max})</span><br>
          <span style="font-size:calc(4.6px*var(--s));color:#6f8f61">${u.desc}</span></span>
        <span>${right}</span>
      </div>`;
  }).join('');
  const urows = UNLOCKS.map(u=>{
    const owned = save.unlocked[u.key]>=1;
    const blocked = !owned && u.requires && !save.unlocked[u.requires];
    const right = owned
      ? '<b style="color:#7fa06d">ODBLOKOWANA</b>'
      : blocked
        ? `<span style="color:#5d4a3a">wymaga: ${UNLOCKS.find(x=>x.key===u.requires).name}</span>`
        : `<span class="optbtn" data-unlock="${u.key}">ODBLOKUJ za ${u.cost}</span>`;
    return `<div class="optrow" data-k="${u.key}" style="align-items:flex-start">
        <span>${u.name}<br>
          <span style="font-size:calc(4.6px*var(--s));color:#6f8f61">${u.desc}</span></span>
        <span>${right}</span>
      </div>`;
  }).join('');
  const wrows = WUPGRADES.map(u=>{
    const chosen = save.wup[u.key];
    const locked = u.key!=='axe' && !save.unlocked[u.key];
    const opt = id=>{
      const o = u.opts[id], mine = chosen===id, other = chosen && !mine;
      const right = mine   ? '<b style="color:#7fa06d">WYBRANE</b>'
                  : other  ? '<span style="color:#5d4a3a">—</span>'
                  : locked ? '<span style="color:#5d4a3a">odblokuj broń</span>'
                  : `<span class="optbtn" data-wbuy="${u.key}" data-opt="${id}">WYBIERZ za ${u.base}</span>`;
      return `<div class="optrow" style="align-items:flex-start${other?';opacity:.45':''}">
          <span>${o.name}<br>
            <span style="font-size:calc(4.6px*var(--s));color:#6f8f61">${o.desc}</span></span>
          <span>${right}</span>
        </div>`;
    };
    return `<div class="keys" style="margin-top:calc(2px*var(--s))">${u.wname} — jedno z dwóch</div>
      <div id="optrows">${opt('a')}${opt('b')}</div>`;
  }).join('');
  overlay.innerHTML = `<div class="fitbox" id="shopbox">
    <h1 style="font-size:calc(13px*var(--s))">SKLEP</h1>
    <div class="keys" style="color:#e0c14a">WIÓRY: <b>${save.chips}</b></div>
    <div id="shopcols">
      <div class="col">
        <div class="keys">ULEPSZENIA</div>
        <div id="optrows">${rows}</div>
        <div class="keys" style="margin-top:calc(4px*var(--s))">ODBLOKUJ BROŃ (po kolei)</div>
        <div id="optrows">${urows}</div>
      </div>
      <div class="col">
        <div class="keys">ULEPSZENIA BRONI</div>
        ${wrows}
      </div>
    </div>
    <div class="link" id="shopback">POWRÓT (B)</div>
  </div>`;
  fitBox();
  for(const b of overlay.querySelectorAll('[data-buy]')){
    b.onclick = ev=>{ ev.stopPropagation(); buyUpgrade(b.getAttribute('data-buy')); showShop(); };
  }
  for(const b of overlay.querySelectorAll('[data-unlock]')){
    b.onclick = ev=>{ ev.stopPropagation(); buyUnlock(b.getAttribute('data-unlock')); showShop(); };
  }
  for(const b of overlay.querySelectorAll('[data-wbuy]')){
    b.onclick = ev=>{ ev.stopPropagation(); buyWeaponUpgrade(b.getAttribute('data-wbuy'), b.getAttribute('data-opt')); showShop(); };
  }
  document.getElementById('shopback').onclick = ev=>{ ev.stopPropagation(); closeShop(); };
}
// zmniejsza ekran nakładki (tytuł, opcje, sklep), jeśli się w niej nie mieści
// (małe okno, niska rozdzielczość)
function fitBox(){
  const box = overlay.querySelector('.fitbox');
  if(!box) return;
  box.style.transform = '';
  const cs = getComputedStyle(overlay);
  const availW = overlay.clientWidth  - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const availH = overlay.clientHeight - parseFloat(cs.paddingTop)  - parseFloat(cs.paddingBottom);
  if(availW<=0 || availH<=0 || !box.offsetWidth || !box.offsetHeight) return;   // nakładka jeszcze bez rozmiaru
  const k = Math.max(0.3, Math.min(1, availW/box.offsetWidth, availH/box.offsetHeight));
  if(k<1) box.style.transform = `scale(${k.toFixed(3)})`;
}
// sklep otwarty w trakcie gry zamyka się prosto do gry, z tytułu — z powrotem do tytułu
function closeShop(){
  if(shopReturn==='pause') resume(); else showTitle();
}

function pause(){
  uiScreen = 'pause';
  running=false;
  saveRun();
  if(document.pointerLockElement===cv) document.exitPointerLock();
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<h1 style="font-size:calc(16px*var(--s))">PAUZA</h1>
     <div class="keys">Poziom <b>${level}</b> — ${biome.name} · fala <b>${wave}</b> · ścięte <b>${kills}</b> · wynik <b>${score}</b></div>
     <div class="keys" style="color:#e0c14a">WIÓRY: <b>${save.chips}</b></div>
     <div class="go">KLIKNIJ, ABY WRÓCIĆ</div>
     <div class="link" id="pshop">SKLEP</div>
     <div class="link" id="popt">OPCJE</div>
     <div class="link" id="pnew">NOWA GRA</div>`;
  overlay.onclick = ()=>resume();
  document.getElementById('pnew').onclick = ev=>{ ev.stopPropagation(); showTitle(); };
  document.getElementById('pshop').onclick = ev=>{ ev.stopPropagation(); showShop('pause'); };
  document.getElementById('popt').onclick = ev=>{ ev.stopPropagation(); showOptions('pause'); };
}
function resume(){
  uiScreen = '';
  audioInit();                         // po wczytaniu zapisu dźwięk rusza dopiero tu
  if(AC && AC.state==='suspended') AC.resume();
  overlay.classList.add('hidden');
  running=true; last=performance.now();
  grabMouse();
}
function endGame(){
  gameOver=true; running=false; P.dead=true;
  uiScreen = 'over';
  P.swingT=0; P.reloadT=0;
  SFX.die();
  const fresh = saveBest();
  // PRAWDZIWA PERMAŚMIERĆ: cały stan sklepu — wióry i wszystkie kupione
  // ulepszenia — zeruje się bez wyjątków. Jedyne, co zostaje, to REKORD.
  const hadProgress = save.chips>0 || Object.values(save.up).some(v=>v>0) || Object.values(save.wup).some(v=>!!v);
  wipeSave();
  clearRun();
  if(document.pointerLockElement===cv) document.exitPointerLock();
  setTimeout(()=>{
    overlay.classList.remove('hidden');
    overlay.innerHTML = `<h1 style="color:#c8452f;font-size:calc(18px*var(--s))">LAS WYGRAŁ</h1>
      <div id="stats">Przetrwałeś do fali <b>${wave}</b> w lesie <b>${biome.name}</b> (poziom ${level})<br>Ścięte drzewa: <b>${kills}</b><br>
        Wynik: <b>${score}</b>
        ${fresh ? '<br><span style="color:#ffe07a">NOWY REKORD!</span>'
                : `<br><span style="color:#7fa06d">rekord: ${best.score} pkt (fala ${best.wave})</span>`}
        ${hadProgress ? '<br><span style="color:#ff6a4a">PERMAŚMIERĆ: wióry i ulepszenia przepadły</span>' : ''}</div>
      <div class="go">KLIKNIJ LUB WCIŚNIJ R, ABY SPRÓBOWAĆ JESZCZE RAZ (${FOREST_MODES[lastMode].name})</div>
      <div class="link" id="egmode">ZMIEŃ TRYB</div>`;
    overlay.onclick = ()=>newGame();
    document.getElementById('egmode').onclick = ev=>{ ev.stopPropagation(); showTitle(); };
  }, 1200);
}
function newGame(mode){
  setForestMode(mode || lastMode);
  started = true;
  audioInit();
  if(AC && AC.state==='suspended') AC.resume();
  newRunSeed();
  reset();
  uiScreen = '';
  overlay.classList.add('hidden');
  running=true; last=performance.now();
  grabMouse();
  updateHUD();
}
