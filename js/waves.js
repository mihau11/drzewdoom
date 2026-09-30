"use strict";
// poziomy, fale, definicje i spawn wrogów

/* ---------- poziomy ---------- */
const WAVES_PER_LEVEL = 10;
let level = 0, biome = BIOMES[0], levelFade = 0;
// Ziarno przebiegu: losowane przy każdej nowej grze, więc każda gra to inne lasy
// (także poziom 1). W obrębie przebiegu mapa poziomu n jest stała — dzięki temu
// zapis przebiegu wystarcza, by ją odtworzyć. null = stary zapis sprzed losowania:
// poziom 1 z RAW i dawne ziarna, żeby wczytany las się nie podmienił.
let runSeed = null;
function newRunSeed(){ runSeed = (Math.random()*0x7fffffff)|0; }
const levelSeed = (n, k, c) => runSeed===null ? n*k + c : ((runSeed ^ Math.imul(n, k)) + c) >>> 0;

// Każde 10 fal to nowy las w nowym biomie, wylosowany z ziarna przebiegu.
function enterLevel(n, first){
  level = n;
  biome = BIOMES[(n-1) % BIOMES.length];
  FOG = biome.fog.slice();
  MAXFOG = biome.maxfog;

  applyMap(n===1 && runSeed===null ? mapFromRAW() : buildMap(levelSeed(n, 104729, 40503), n));
  DL.length = 0;                       // stare swiatla dynamiczne nie przechodza dalej
  buildLightmap(biome, levelSeed(n, 7919, 13));   // B2: lightmapa liczona raz na poziom
  rebuildArt(biome);

  // nowy las = czysta plansza; stare drzewa i pociski zostają w poprzednim
  enemies.length=0; shots.length=0; parts.length=0; decals.length=0; pickups.length=0;
  floaters.length=0; streak=0; streakT=0;

  const spot = findOpenSpot(MW*0.5, MH*0.5);
  P.x = spot.x; P.y = spot.y; P.a = Math.random()*Math.PI*2;
  P.swingT=0; P.reloadT=0; P.iframe=0; P.cd=0; P.pitch=0;
  waveQueue=[]; waveTimer = first ? 1.6 : 3.2;
  levelFade = 1;

  if(!first){
    // przejście to zarazem punkt kontrolny — bez tego dalsze biomy są nie do przejścia
    P.hp = Math.min(P.maxhp, P.hp + 40);
    P.shells  = Math.min(P.maxShells,  P.shells  + 12);
    P.bullets = Math.min(P.maxBullets, P.bullets + 60);
    P.fuel    = Math.min(P.maxFuel,    P.fuel    + 45);
    P.stam    = P.maxStam;
    SFX.wave();
    message(`POZIOM ${level} — ${biome.name}`, 3);
  }
}

function reset(){
  // trwałe ulepszenia ze sklepu podbijają pułapy jeszcze przed pierwszą falą
  const c = statCaps();
  P = { x:1.5, y:1.5, a:0.6, hp:c.maxhp, maxhp:c.maxhp, w:0, cd:0, pitch:0,
        shells:24, bullets:0, fuel:40,
        maxShells:c.maxShells, maxBullets:c.maxBullets, maxFuel:c.maxFuel,
        dead:false, kickT:0, fireT:0,
        mag:WEAPONS[W_SHOTGUN].mag, reloadT:0, swingT:0, iframe:0,
        stam:c.maxStam, maxStam:c.maxStam, stamCd:0, puff:false };
  enemies=[]; decals=[]; pickups=[]; shots=[]; parts=[]; floaters=[];
  wave=0; waveQueue=[]; waveTimer=1.6; kills=0; score=0;
  streak=0; streakT=0; hitT=0; stepPhase=0; threat=0;
  gameOver=false; camShake=0; flashLight=0; hurtFlash=0; bobT=0;
  enterLevel(1, true);
  message('OBUDZIŁEŚ LAS. UCIEKAJ ALBO RĄB.', 2.6);
}

function message(t,dur){
  const m=document.getElementById('msg');
  m.textContent=t; m.classList.add('show'); msgTimer=dur||2;
}

/* ---------- fale ---------- */
// Liczebność wysyca się (limit 26 żywych i tak jest twardy), więc od ~fali 13
// trudność bierze się z MOCY drzew i nowych gatunków, nie z dłuższego przeciągania.
const MAX_WAVE_N = 26;
function waveScale(){
  const w = Math.max(0, wave-1);
  return {
    hp:    1 + Math.min(1.20, w*0.05),    // pułap +120% HP
    dmg:   1 + Math.min(0.90, w*0.045),   // wrogowie realnie bolą coraz bardziej
    spd:   1 + Math.min(0.35, w*0.020),
    rate:  1 / (1 + Math.min(0.50, w*0.030)),  // krótszy odstęp między atakami
  };
}

// pula gatunków otwierana falami: [kind, waga]
function waveRoster(){
  const pool = [[0, 35], [1, 35], [2, 30]];
  if(wave<2)      return [[0,85],[1,15]];
  if(wave<4)      return [[0,50],[1,35],[2,15]];
  if(wave>=4)  pool.push([5, 14]);   // matecznik
  if(wave>=5)  pool.push([7, 15]);   // pękacz
  if(wave>=6)  pool.push([4, 16]);   // zakorzeniony
  if(wave>=8)  pool.push([6, 14]);   // cichosz
  return pool;
}
function rollKind(){
  const pool = waveRoster();
  let total=0; for(const p of pool) total+=p[1];
  let r=Math.random()*total;
  for(const p of pool){ r-=p[1]; if(r<=0) return p[0]; }
  return pool[0][0];
}

function startWave(){
  // Co WAVES_PER_LEVEL fal las się zmienia: nowa mapa, nowy biom, nowe tekstury.
  // Warunek `level === wave/WAVES_PER_LEVEL` sprawia, że przejście odpala się
  // dokładnie raz — przy kolejnym wywołaniu level jest już podbity i fala rusza.
  if(wave>0 && wave%WAVES_PER_LEVEL===0 && level === wave/WAVES_PER_LEVEL){
    enterLevel(level+1, false);
    return;                       // fala ruszy po odliczeniu waveTimer w nowym lesie
  }
  wave++;
  waveQueue=[];
  waveTimer=0;
  const boss = wave%5===0;
  const n = Math.min(MAX_WAVE_N, 4 + Math.floor(wave*1.7));
  for(let i=0;i<n;i++) waveQueue.push(rollKind());
  if(boss) waveQueue.push(3);
  SFX.wave();
  message(boss ? `FALA ${wave} — PRADRZEW SIĘ BUDZI!` : `FALA ${wave}`, 2.2);
}

// promień kolizji zawsze < 0.5, żeby każde drzewo przecisnęło się przez przerwę
// szerokości jednej kratki i nigdy nie utknęło na stałe
const ENEMY_DEF = [
  // HP sadzonki/dębu/świerka dobrane pod siekierę (52 ±15%, x2 do sadzonek) na 1. fali:
  // zwykły las 1/3/2 zamachy, żyzny (x1.8) 2/5/3 — pierwsze trzy pewne mimo losowania
  { hp:72,  spd:1.55, r:0.30, hUnits:0.95, wUnits:0.66, dmg:7,  atkCd:0.9, ranged:false, score:1 },
  { hp:130, spd:1.05, r:0.42, hUnits:1.45, wUnits:0.98, dmg:16, atkCd:1.3, ranged:false, score:2 },
  { hp:70,  spd:1.25, r:0.34, hUnits:1.55, wUnits:0.78, dmg:11, atkCd:1.8, ranged:true,  score:2 },
  { hp:900, spd:0.95, r:0.46, hUnits:2.35, wUnits:1.42, dmg:26, atkCd:1.1, ranged:true,  score:10 },
  // zakorzeniony: podchodzi, wrasta w ziemię i staje się fizyczną przeszkodą —
  // zmienia geometrię starcia, zamiast tylko dokładać obrażeń
  { hp:150, spd:1.15, r:0.44, hUnits:1.35, wUnits:1.15, dmg:14, atkCd:1.0, ranged:false, score:3,
    roots:true, rootAt:2.6 },
  // matecznik: przy śmierci rozsiewa dwie sadzonki
  { hp:80,  spd:1.20, r:0.34, hUnits:1.25, wUnits:0.82, dmg:9,  atkCd:1.2, ranged:false, score:3,
    splits:2 },
  // cichosz: rusza się TYLKO wtedy, gdy na niego nie patrzysz
  { hp:70,  spd:3.10, r:0.30, hUnits:1.60, wUnits:0.60, dmg:20, atkCd:1.4, ranged:false, score:4,
    shy:true },
  // pękacz: szybki i kruchy, nie bije — przy śmierci (albo przy kontakcie)
  // wybucha i rani też inne drzewa. Nie wolno go dopuścić blisko.
  { hp:46,  spd:2.15, r:0.30, hUnits:1.05, wUnits:0.72, dmg:0,  atkCd:1.0, ranged:false, score:3,
    boom:true, boomR:2.7, boomDmg:38 },
];
let FOV_HALF = Math.atan(PLANE)+0.04;   // połowa poziomego pola widzenia

function freeCell(x,y,r){
  return cell(x-r,y-r)===0 && cell(x+r,y-r)===0 && cell(x-r,y+r)===0 && cell(x+r,y+r)===0;
}
function makeEnemy(kind,x,y){
  const d=ENEMY_DEF[kind], s=waveScale();
  const hp = d.hp*s.hp*FOREST_MODES[forestMode].enemyHpMul;
  return { x, y, kind, hp, maxhp:hp,
           dmg:d.dmg*s.dmg, spd:d.spd*s.spd, atkCd:d.atkCd*s.rate,
           atk:Math.random()*d.atkCd, anim:Math.random()*4, flash:0,
           dying:0, dead:false, groan:Math.random()*6, rooted:false };
}
function spawnEnemy(kind){
  const d=ENEMY_DEF[kind];
  for(let tries=0;tries<200;tries++){
    const x = 1.5 + Math.random()*(MW-3), y = 1.5 + Math.random()*(MH-3);
    if(!freeCell(x,y,d.r+0.1)) continue;
    const dx=x-P.x, dy=y-P.y;
    if(dx*dx+dy*dy < 49) continue;                 // nie bliżej niż 7 jednostek
    enemies.push(makeEnemy(kind,x,y));
    if(Math.random()<0.35) SFX.groan();
    return true;
  }
  return false;
}
