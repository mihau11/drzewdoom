"use strict";
// klawiatura, mysz, pointer lock, wybór broni

/* ============================================================
   WEJŚCIE
   ============================================================ */
const keys={};
let fireClicks = 0;                  // wciśnięcia strzału od ostatniej klatki (broń półautomatyczna)
addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code)) e.preventDefault();
  keys[e.code]=true;
  if(e.code==='Space' && !e.repeat && running) fireClicks++;
  if(e.code==='Digit1') selectWeapon(0);
  if(e.code==='Digit2') selectWeapon(1);
  if(e.code==='Digit3') selectWeapon(2);
  if(e.code==='Digit4') selectWeapon(3);
  if(e.code==='KeyM'){ muted=!muted; if(master) master.gain.value = muted?0:opt.vol; message(muted?'DŹWIĘK: WYŁ':'DŹWIĘK: WŁ',1); }
  if(e.code==='KeyR' && gameOver) newGame();
  if(e.code==='KeyO' && !running){
    if(uiScreen==='options') closeOptions();       // O zamyka opcje
    else showOptions(started?'pause':'title');
  }
  if(!running && uiScreen==='shop' && e.code==='KeyB'){
    closeShop();                                   // B zamyka sklep
  } else if(e.code==='KeyB' && !gameOver){
    if(running){ pause(); showShop('pause'); }
    else showShop(started?'pause':'title');
  } else if(e.code==='KeyP'){
    if(running) pause();
    else if(uiScreen==='pause') resume();          // P włącza i wyłącza pauzę
  }
});
addEventListener('keyup',e=>{ keys[e.code]=false; });
addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; if(running) pause(); });

cv.addEventListener('mousedown',e=>{ if(running && e.button===0){ keys.Mouse0=true; fireClicks++; } });
addEventListener('mouseup',e=>{ if(e.button===0) keys.Mouse0=false; });
addEventListener('mousemove',e=>{
  if(!running) return;
  const locked = document.pointerLockElement===cv;
  if(!locked && !lockFailed) return;          // bez blokady kursora tylko awaryjnie
  const k = locked ? 1 : 0.6;
  P.a += (e.movementX||0)*0.0022*opt.sens*k;
  P.pitch = clamp(P.pitch - (e.movementY||0)*0.9*opt.sens*k, -70, 70);
});
addEventListener('wheel',e=>{ if(!running) return;
  const n=WEAPONS.length, dir=(e.deltaY>0?1:n-1);
  let i=P.w;
  for(let tries=0;tries<n;tries++){ i=(i+dir)%n; if(isUnlocked(i)) break; }
  selectWeapon(i);
},{passive:true});
let lockFailed=false;
function grabMouse(){
  if(!cv.requestPointerLock){ lockFailed=true; return; }
  try{
    const p = cv.requestPointerLock();
    if(p && p.catch) p.catch(()=>{ lockFailed=true; });
  }catch(err){ lockFailed=true; }
}
document.addEventListener('pointerlockchange',()=>{
  if(document.pointerLockElement===cv) lockFailed=false;
  else if(running && !lockFailed) pause();
});

function selectWeapon(i){
  if(i<0 || i>=WEAPONS.length || i===P.w || P.dead) return;
  if(!isUnlocked(i)){ message('ZABLOKOWANE — kup w SKLEPIE', 1.4); return; }
  P.w=i; P.cd=Math.max(P.cd,0.18); P.reloadT=0; SFX.swap(); updateHUD();
}
