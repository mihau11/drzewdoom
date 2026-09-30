"use strict";
// HUD (liczniki, paski, pasek Pradrzewa)

/* ---------- HUD ---------- */
const el = {
  wave:document.getElementById('wave'), left:document.getElementById('left'),
  kills:document.getElementById('kills'), hpnum:document.getElementById('hpnum'),
  hpbar:document.getElementById('hpbar'), wepname:document.getElementById('wepname'),
  ammo:document.getElementById('ammo'), weplist:document.getElementById('weplist'),
  score:document.getElementById('score'), best:document.getElementById('best'),
  chips:document.getElementById('chips'),
  biome:document.getElementById('biome'),
  stambar:document.getElementById('stambar'),
  bossbar:document.getElementById('bossbar'),
  bosshp:document.getElementById('bosshp'),
};
function updateHUD(){
  el.biome.textContent = `L${level} ${biome.name}`;
  el.wave.textContent = wave||1;
  el.left.textContent = enemies.filter(e=>e.dying<=0).length + waveQueue.length;
  el.kills.textContent = kills;
  el.score.textContent = score|0;
  el.best.textContent = best.score|0;
  el.chips.textContent = save.chips|0;
  el.hpnum.textContent = Math.ceil(P.hp);
  el.hpbar.style.width = clamp(P.hp/P.maxhp*100,0,100)+'%';
  el.hpbar.className = P.hp<35 ? 'low' : '';
  el.stambar.style.width = clamp(P.stam/P.maxStam*100,0,100)+'%';
  el.stambar.parentNode.className = 'bar sbar' + (P.stam<0.6 ? ' out' : '');

  // pasek Pradrzewa — widoczny tylko wtedy, gdy boss żyje
  let boss=null;
  for(const e of enemies) if(e.kind===3 && e.dying<=0){ boss=e; break; }
  if(boss){
    el.bossbar.classList.remove('hide');
    el.bosshp.style.width = clamp(boss.hp/boss.maxhp*100,0,100)+'%';
  } else el.bossbar.classList.add('hide');

  const w=WEAPONS[P.w];
  el.wepname.textContent = P.w===W_SHOTGUN && P.reloadT>0 ? 'ŁADOWANIE…' : w.name;
  el.ammo.textContent = w.ammo===-1 ? '∞'
                      : P.w===W_SHOTGUN     ? `${P.mag}/${P.shells}`
                                    : P[w.ammo]|0;
  el.weplist.innerHTML = WEAPONS.map((_,i)=>
    `<span class="${i===P.w?'on':''}${isUnlocked(i)?'':' off'}">${isUnlocked(i)?i+1:'🔒'}</span>`).join(' ');
}
