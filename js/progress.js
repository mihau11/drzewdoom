"use strict";
// rekord, sklep i ulepszenia, zapis przebiegu

/* ---------- rekord ---------- */
const BEST_KEY = 'drzewodoom.best';
let best = { wave:0, kills:0, score:0 };
try{
  const raw = localStorage.getItem(BEST_KEY);
  if(raw){ const b=JSON.parse(raw);
    if(b && typeof b==='object') best = { wave:b.wave|0, kills:b.kills|0, score:b.score|0 }; }
}catch(err){ /* prywatne okno albo zablokowany storage — gramy bez rekordu */ }
function saveBest(){
  let fresh=false;
  if(score>best.score){ best={ wave, kills, score }; fresh=true; }
  if(fresh){ try{ localStorage.setItem(BEST_KEY, JSON.stringify(best)); }catch(err){} }
  return fresh;
}

/* ---------- sklep i trwały postęp ----------
   Drzewne WIÓRY zbierasz ścinając drzewa, na bieżąco. Sklep otwiera się
   w dowolnej chwili z menu PAUZY albo z ekranu tytułowego, więc zawsze
   można je wydać. Ale to prawdziwa PERMAŚMIERĆ: zginiesz — cały stan
   (wióry I wszystkie kupione ulepszenia) leci do zera, bez wyjątków.
   Stan trzyma się w localStorage — pojemniejsze i pewniejsze niż
   ciasteczka, ale ten sam pomysł: pamięć przeglądarki, nie serwera. */
const SAVE_KEY = 'drzewodoom.save';
// wszystkie ceny w tym pliku obniżone o ~20% względem pierwotnych, żeby
// wczesna ekonomia (fale 1–4) realnie pozwalała odblokować kosiarkę
// przed starciem z pierwszym Pradrzewem na fali 5
const UPGRADES = [
  { key:'hp',    name:'KORA',        desc:'+12 zdrowia maks. za poziom',   max:6, base:24, grow:1.5 },
  { key:'stam',  name:'KORZENIE',    desc:'+1 kondycji maks. za poziom',   max:4, base:36, grow:1.6 },
  { key:'dmg',   name:'SĘK',         desc:'+7% obrażeń wszystkich broni',  max:6, base:40, grow:1.55 },
  { key:'ammo',  name:'DZIUPLA',     desc:'+15% pojemności amunicji',      max:5, base:32, grow:1.5 },
  { key:'regen', name:'FOTOSYNTEZA', desc:'powolna regeneracja zdrowia',   max:3, base:56, grow:1.8 },
];
// ulepszenia broni: na każdą broń JEDNO z dwóch (a/b), wybór trwa do najbliższej śmierci.
// save.wup[key] = '' (nic) | 'a' | 'b'
const WUPGRADES = [
  { key:'axe',     wname:'SIEKIERA',   base:208, opts:{
      a:{ name:'KARCZOWANIE',     desc:'ścina od razu drzewo poniżej 25% HP (boss: 10%)' },
      b:{ name:'SZEROKI ROZMACH', desc:'szerszy zamach; zakorzenione dostają ×3 i są wyrywane' } } },
  { key:'mower',   wname:'KOSIARKA',   base:208, opts:{
      a:{ name:'NAOSTRZONE ZĘBY', desc:'3× kadencja — 1800 strzałów/min' },
      b:{ name:'PRZEBIJANIE',     desc:'pocisk rani każde drzewo na linii strzału' } } },
  { key:'shotgun', wname:'DUBELTÓWKA', base:208, opts:{
      a:{ name:'CZTERY NABOJE',   desc:'magazynek 4, strzał na każde kliknięcie bez przerwy' },
      b:{ name:'OGŁUSZENIE',      desc:'trafione drzewo stoi 0,6 s (boss 0,3 s)' } } },
  { key:'flame',   wname:'MIOTACZ',    base:208, opts:{
      a:{ name:'POŻAR LASU',      desc:'ogień przeskakuje na drzewa obok płonącego' },
      b:{ name:'SMOLNY WYBUCH',   desc:'płonące drzewo wybucha przy ścięciu' } } },
];
// stare zapisy (0/1): wariant najbliższy dawnemu działaniu
const WUP_LEGACY = { axe:'b', mower:'a', shotgun:'a', flame:'a' };
function wupOpt(key){ return save.wup[key] || ''; }
// kolejność odblokowania broni: siekiera jest od razu, reszta po kolei —
// każda wymaga poprzedniej, więc nie da się przeskoczyć kolejności
const UNLOCKS = [
  { key:'mower',   wi:W_MOWER, name:'KOSIARKA', desc:'Szybkostrzelny łańcuch — odblokowuje broń', cost:56,  requires:null     },
  { key:'shotgun', wi:W_SHOTGUN, name:'STRZELBA', desc:'Dwururka na drzewa — odblokowuje broń',      cost:112, requires:'mower'  },
  { key:'flame',   wi:W_FLAME, name:'MIOTACZ',  desc:'Ogień, który sam dobija — odblokowuje broń', cost:176, requires:'shotgun'},
];
// wybór na starcie gry: ZWYKŁY LAS (jak dotąd) albo ŻYZNY LAS — więcej wiórów
// za ścięcie, ale drzewa mają więcej wytrzymałości od samego początku
const FOREST_MODES = {
  normal: { name:'ZWYKŁY LAS', incomeMul:1,   enemyHpMul:1,    desc:'bazowa wytrzymałość drzew, normalny przychód wiórów' },
  rich:   { name:'ŻYZNY LAS',  incomeMul:1.5, enemyHpMul:1.8,  desc:'+50% wiórów za ścięcie, ale drzewa +80% wytrzymałości' },
};
let forestMode = 'normal', lastMode = 'normal';
function setForestMode(mode){ forestMode = FOREST_MODES[mode] ? mode : 'normal'; lastMode = forestMode; }
let save = { chips:0, up:{ hp:0, stam:0, dmg:0, ammo:0, regen:0 }, wup:{ axe:'', shotgun:'', mower:'', flame:'' },
             unlocked:{ mower:0, shotgun:0, flame:0 } };
try{
  const raw = localStorage.getItem(SAVE_KEY);
  if(raw){ const s=JSON.parse(raw);
    if(s && typeof s==='object'){
      save.chips = s.chips|0;
      if(s.up  && typeof s.up==='object')  for(const u of UPGRADES)  save.up[u.key]  = s.up[u.key]|0;
      if(s.wup && typeof s.wup==='object') for(const u of WUPGRADES){
        const v = s.wup[u.key];
        save.wup[u.key] = (v==='a'||v==='b') ? v : (v ? WUP_LEGACY[u.key] : '');
      }
      if(s.unlocked && typeof s.unlocked==='object') for(const u of UNLOCKS) save.unlocked[u.key] = s.unlocked[u.key]?1:0;
    } }
}catch(err){ /* prywatne okno albo zablokowany storage — gramy bez sklepu */ }
function saveSave(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }catch(err){} }
function upCost(u){ return Math.round(u.base*Math.pow(u.grow, save.up[u.key])); }
function atkMul(){ return 1 + 0.07*save.up.dmg; }
// pułapy statystyk liczone z aktualnego stanu sklepu — używane i w reset(),
// i przy zakupie w trakcie życia (żeby zakup zadziałał od razu, nie od nowej rundy)
function statCaps(){
  const ammoMul = 1 + 0.15*save.up.ammo;
  return {
    maxhp: 100 + 12*save.up.hp,
    maxStam: 4 + save.up.stam,
    maxShells: Math.round(80*ammoMul),
    maxBullets: Math.round(300*ammoMul),
    maxFuel: Math.round(220*ammoMul),
  };
}
// KORA/KORZENIE/DZIUPLA są zapieczone w P przy reset() — kupione w trakcie
// życia muszą więc od razu podbić bieżącego gracza, inaczej zakup nic by nie dał
function applyStatUpgradeLive(){
  if(!P) return;
  const c = statCaps();
  if(c.maxhp>P.maxhp){ P.hp += c.maxhp-P.maxhp; P.maxhp=c.maxhp; }
  if(c.maxStam>P.maxStam){ P.stam += c.maxStam-P.maxStam; P.maxStam=c.maxStam; }
  if(c.maxShells>P.maxShells){ P.shells += c.maxShells-P.maxShells; P.maxShells=c.maxShells; }
  if(c.maxBullets>P.maxBullets){ P.bullets += c.maxBullets-P.maxBullets; P.maxBullets=c.maxBullets; }
  if(c.maxFuel>P.maxFuel){ P.fuel += c.maxFuel-P.maxFuel; P.maxFuel=c.maxFuel; }
  updateHUD();
}
function buyUpgrade(key){
  const u = UPGRADES.find(x=>x.key===key); if(!u) return;
  if(save.up[key]>=u.max) return;
  const cost = upCost(u);
  if(save.chips<cost) return;
  save.chips -= cost; save.up[key]++; saveSave();
  applyStatUpgradeLive();
}
// przelicza WEAPONS od wartości bazowych — bezpieczne do wywołania wielokrotnie,
// mutuje broń na żywo, więc zakup działa natychmiast, choćby w środku życia
function applyWeaponUpgrades(){
  const ax=wupOpt('axe'), mo=wupOpt('mower'), sg=wupOpt('shotgun');
  WEAPONS[W_AXE].arc      = WEAPON_BASE.arc + (ax==='b' ? 0.15 : 0);
  WEAPONS[W_MOWER].cd     = WEAPON_BASE.cd  / (mo==='a' ? 3 : 1);
  WEAPONS[W_MOWER].pierce = mo==='b';
  WEAPONS[W_SHOTGUN].mag  = WEAPON_BASE.mag + (sg==='a' ? 2 : 0);
  WEAPONS[W_SHOTGUN].cd   = sg==='a' ? 0 : WEAPON_BASE.sgcd;
  WEAPONS[W_SHOTGUN].semi = sg==='a';              // strzał na kliknięcie, nie na przytrzymanie
  if(P && P.mag>WEAPONS[W_SHOTGUN].mag) P.mag = WEAPONS[W_SHOTGUN].mag;
}
applyWeaponUpgrades();
function buyWeaponUpgrade(key, opt){
  const u = WUPGRADES.find(x=>x.key===key); if(!u || !u.opts[opt]) return;
  if(key!=='axe' && !save.unlocked[key]) return;   // ulepszenie broni wymaga jej odblokowania
  if(save.wup[key]) return;                        // jedno z dwóch — drugie już zablokowane
  if(save.chips<u.base) return;
  save.chips -= u.base; save.wup[key]=opt; saveSave(); applyWeaponUpgrades();
}
// broń 0 (siekiera) jest zawsze dostępna; reszta wymaga zakupu w UNLOCKS,
// po kolei — kosiarka, potem strzelba, potem miotacz
function isUnlocked(i){
  if(i===0) return true;
  const u = UNLOCKS.find(x=>x.wi===i);
  return u ? !!save.unlocked[u.key] : false;
}
function buyUnlock(key){
  const u = UNLOCKS.find(x=>x.key===key); if(!u) return;
  if(save.unlocked[key]) return;
  if(u.requires && !save.unlocked[u.requires]) return;    // trzymamy kolejność
  if(save.chips<u.cost) return;
  save.chips -= u.cost; save.unlocked[key]=1; saveSave();
}
// PERMAŚMIERĆ: zeruje cały stan sklepu — wióry, ulepszenia i odblokowane bronie
function wipeSave(){
  save.chips = 0;
  for(const u of UPGRADES)  save.up[u.key]  = 0;
  for(const u of WUPGRADES) save.wup[u.key] = '';
  for(const u of UNLOCKS)   save.unlocked[u.key] = 0;
  saveSave();
  applyWeaponUpgrades();
}

/* ---------- zapis przebiegu ----------
   Osobno od sklepu trzymamy bieżące życie: poziom, falę, gracza, drzewa
   i znajdźki. Mapa jest deterministyczna (ziarno z numeru poziomu), więc
   wystarczy ją odbudować przez enterLevel(). Po otwarciu strony z takim
   zapisem gra startuje od PAUZY, a nie od ekranu tytułowego.
   Śmierć kasuje zapis — permaśmierć zostaje permaśmiercią. */
const RUN_KEY = 'drzewodoom.run';
const plain = a => a.map(o=>Object.assign({}, o));
function saveRun(){
  if(!started || gameOver || !P || P.dead) return;
  try{
    localStorage.setItem(RUN_KEY, JSON.stringify({
      v:1, seed:runSeed, mode:forestMode, level, wave, waveQueue, waveTimer, kills, score,
      P, enemies:plain(enemies.filter(e=>!e.dead && e.dying<=0)),
      pickups:plain(pickups), decals:plain(decals),
    }));
  }catch(err){}
}
function clearRun(){ try{ localStorage.removeItem(RUN_KEY); }catch(err){} }
function loadRun(){
  let s;
  try{ s = JSON.parse(localStorage.getItem(RUN_KEY)); }catch(err){ return false; }
  if(!s || s.v!==1 || !(s.level>=1) || !s.P || !Array.isArray(s.enemies)) return false;
  try{
    setForestMode(s.mode);
    runSeed = Number.isInteger(s.seed) ? s.seed : null;
    reset();                             // domyślne pola, potem nadpisujemy zapisem
    enterLevel(s.level|0, true);
    Object.assign(P, s.P);
    P.dead=false; P.swingT=0; P.reloadT=0; P.kickT=0; P.fireT=0;
    if(!isUnlocked(P.w)) P.w = 0;
    wave = s.wave|0; kills = s.kills|0; score = +s.score||0;
    waveQueue = Array.isArray(s.waveQueue) ? s.waveQueue : [];
    waveTimer = +s.waveTimer||0;
    enemies = s.enemies;
    pickups = Array.isArray(s.pickups) ? s.pickups : [];
    decals  = Array.isArray(s.decals)  ? s.decals  : [];
    levelFade = 0;
    started = true;
    document.getElementById('msg').classList.remove('show'); msgTimer = 0;
    return true;
  }catch(err){ clearRun(); reset(); return false; }
}
// zapis przy zamknięciu/przełączeniu karty i co kilka sekund w trakcie gry
addEventListener('pagehide', saveRun);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) saveRun(); });

// najbliższa naprawdę otwarta polana (kratka wolna razem z ośmioma sąsiadami)
function findOpenSpot(px,py){
  let bestSpot=null, bestD=1e9, any=null;
  for(let y=1;y<MH-1;y++) for(let x=1;x<MW-1;x++){
    if(cell(x,y)!==0) continue;
    const cx=x+0.5, cy=y+0.5;
    if(!any) any={x:cx,y:cy};
    let open=true;
    for(let oy=-1;oy<=1 && open;oy++) for(let ox=-1;ox<=1;ox++)
      if(cell(x+ox,y+oy)!==0){ open=false; break; }
    if(!open) continue;
    const d=(cx-px)*(cx-px)+(cy-py)*(cy-py);
    if(d<bestD){ bestD=d; bestSpot={x:cx,y:cy}; }
  }
  return bestSpot || any || {x:1.5,y:1.5};
}
