"use strict";
// pętla gry, skalowanie okna, start

let last=performance.now();
let renderMs=0, frameN=0, runSaveT=0;
function frame(now){
  requestAnimationFrame(frame);
  let dt=(now-last)/1000; last=now;
  dt=Math.min(dt,0.05);
  if(running){ update(dt); runSaveT+=dt; if(runSaveT>5){ runSaveT=0; saveRun(); } }
  else if(gameOver) update(Math.min(dt,0.03)*0.35);   // slow-mo po śmierci

  // P0: linia bazowa dla każdego kolejnego kroku remontu
  const t0=performance.now();
  render();
  renderMs = renderMs*0.92 + (performance.now()-t0)*0.08;

  drawMini();
  if(((frameN++)&15)===0) document.title = renderMs.toFixed(2)+' ms / render';
}
requestAnimationFrame(frame);

/* ---------- skalowanie okna ---------- */
function fit(){
  const app=document.getElementById('app');
  const vw=innerWidth, vh=innerHeight;
  const s = Math.max(1, Math.min(vw/W, vh/H));
  app.style.width = Math.floor(W*s)+'px';
  app.style.height= Math.floor(H*s)+'px';
  document.documentElement.style.setProperty('--s', (s*0.95).toFixed(3));
  document.body.style.display='flex';
  if(!overlay.classList.contains('hidden')) fitBox();
}
addEventListener('resize',fit);
fit();

// zapisana gra → od razu PAUZA tego przebiegu; bez zapisu → ekran tytułowy
if(loadRun()){ updateHUD(); pause(); }
else { newRunSeed(); reset(); updateHUD(); showTitle(); }
render();
