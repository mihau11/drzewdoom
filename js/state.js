"use strict";
// bronie i zmienne stanu gry

/* ============================================================
   STAN GRY
   ============================================================ */
const WEAPONS = [
  // siekiera: zamach w łuku trafia WSZYSTKIE drzewa w stożku, x2 do sadzonek,
  // odrzuca je i daje krótką nietykalność — narzędzie na tłum przy pustym magazynku
  { name:'SIEKIERA',  ammo:-1, cd:0.42, dmg:52, melee:true, range:2.1,
    arc:0.62, swing:0.11, knock:0.9, iframe:0.34 },
  { name:'KOSIARKA',  ammo:'bullets',cd:0.100,dmg:9,  pellets:1, spread:0.045,range:17 },
  // dubeltówka: dwie lufy, potem przeładowanie — DPS ten sam, ale wymusza rytm
  { name:'DUBELTÓWKA',ammo:'shells', cd:0.34, dmg:13, pellets:9, spread:0.13, range:15,
    // cykl = cd + reload = 1.44 s na dwa strzały → 1.39 strzału/s, dokładnie tyle
    // co dawne cd:0.72. Ten sam DPS, ale wymuszony rytm.
    mag:2, reload:1.10 },
  // miotacz: krótki stożek, sam w sobie słaby, ale podpala — DoT dobija to,
  // czego strumień nie zdążył, i najszybciej czyści sadzonki z mateczników
  { name:'MIOTACZ',   ammo:'fuel',   cd:0.055,dmg:4.2, flame:true, range:4.6,
    arc:0.34, burn:3.0 },
];
// wartości bazowe zapamiętane PRZED naniesieniem sklepowych ulepszeń broni —
// applyWeaponUpgrades() zawsze liczy od tych liczb, więc nie da się ich zdublować
// sloty broni (klawisze 1–4)
const W_AXE=0, W_MOWER=1, W_SHOTGUN=2, W_FLAME=3;
const WEAPON_BASE = { arc:WEAPONS[W_AXE].arc, mag:WEAPONS[W_SHOTGUN].mag, cd:WEAPONS[W_MOWER].cd, sgcd:WEAPONS[W_SHOTGUN].cd };

let P, enemies, decals, pickups, shots, parts, wave, waveQueue, waveTimer,
    kills, score, running, gameOver, started, msgTimer, camShake, flashLight, hurtFlash, bobT;
// seria ścięć (mnożnik punktów), unoszące się liczby obrażeń, hitmarker,
// faza kroku i wygładzone „zagrożenie" dla ambientu
let floaters=[], streak=0, streakT=0, hitT=0, stepPhase=0, threat=0;
function comboMult(){ return streak>=12 ? 4 : streak>=7 ? 3 : streak>=3 ? 2 : 1; }
const FLOATER_MAX = 28;
function addFloater(e,dmg){
  // jeden strzał dubeltówki to 9 śrucin — sumujemy je w jedną liczbę
  for(const f of floaters) if(f.e===e && f.t<0.14){ f.v+=dmg; f.t=0; f.life=0.9; return; }
  floaters.push({ e, x:e.x, y:e.y, z:0.7+ENEMY_DEF[e.kind].hUnits*0.5, v:dmg, t:0, life:0.9 });
  if(floaters.length>FLOATER_MAX) floaters.shift();
}
