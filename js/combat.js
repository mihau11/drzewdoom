"use strict";
// ruch i kolizje, strzelanie, trafienia, obrażenia

function tryMove(ent, dx, dy, r, free){
  free = free || freeCell;
  let moved=false;
  if(free(ent.x+dx, ent.y, r)){ ent.x+=dx; moved=true; }
  if(free(ent.x, ent.y+dy, r)){ ent.y+=dy; moved=true; }
  if(!moved){
    // oba kierunki zablokowane — spróbuj wyślizgu w bok (anty-zakleszczenie)
    const l=Math.hypot(dx,dy)||1e-6, px=-dy/l*l, py=dx/l*l;
    if(free(ent.x+px, ent.y+py, r)){ ent.x+=px; ent.y+=py; moved=true; }
    else if(free(ent.x-px, ent.y-py, r)){ ent.x-=px; ent.y-=py; moved=true; }
  }
  return moved;
}
// zakorzenione drzewa są dla gracza twardą przeszkodą — stąd ich rola taktyczna
function freeForPlayer(x,y,r){
  if(!freeCell(x,y,r)) return false;
  for(const e of enemies){
    if(!e.rooted || e.dying>0) continue;
    const rr = ENEMY_DEF[e.kind].r + r;
    const ox=e.x-x, oy=e.y-y;
    if(ox*ox+oy*oy < rr*rr) return false;
  }
  return true;
}
// kwadrat najmniejszej odległości punktu (px,py) od odcinka a->b
function segDist2(ax,ay,bx,by,px,py){
  const dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy;
  let t = l2>0 ? ((px-ax)*dx+(py-ay)*dy)/l2 : 0;
  t = t<0?0:t>1?1:t;
  const qx=ax+dx*t-px, qy=ay+dy*t-py;
  return qx*qx+qy*qy;
}
const SHOT_SPD = 6.5, SHOT_G = 1.8, SHOT_Z0 = 0.75;
function fireCone(e, nx, ny, dist, dmg){
  const T = Math.max(0.15, dist/SHOT_SPD);
  const vz = (0.5 - SHOT_Z0)/T + 0.5*SHOT_G*T;   // balistyka celowana w tors
  shots.push({ x:e.x, y:e.y, z:SHOT_Z0, vx:nx*SHOT_SPD, vy:ny*SHOT_SPD, vz, dmg, life:3 });
  SFX.hit();
}
const MAX_PICKUPS = 24, PICKUP_LIFE = 45;
function addPickup(x,y,kind){
  if(pickups.length>=MAX_PICKUPS) pickups.shift();
  pickups.push({ x, y, kind, t:0, life:PICKUP_LIFE });
}
// awaryjne wypchnięcie drzewa, które wlazło w geometrię
function unstick(e,r,dt){
  const cx=(e.x|0)+0.5, cy=(e.y|0)+0.5;
  if(cell(cx,cy)===0){
    const dx=cx-e.x, dy=cy-e.y, l=Math.hypot(dx,dy)||1;
    e.x+=dx/l*2.5*dt; e.y+=dy/l*2.5*dt; return;
  }
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const [ox,oy] of dirs){
    if(cell(cx+ox,cy+oy)===0){ e.x+=ox*2.5*dt; e.y+=oy*2.5*dt; return; }
  }
}
function losClear(x0,y0,x1,y1){
  const dx=x1-x0, dy=y1-y0, d=Math.hypot(dx,dy), steps=Math.ceil(d/0.15);
  for(let i=1;i<steps;i++){
    const t=i/steps;
    if(cell(x0+dx*t, y0+dy*t)!==0) return false;
  }
  return true;
}
function hurtPlayer(dmg){
  if(P.dead || P.iframe>0) return;   // zamach siekierą daje chwilę oddechu
  P.hp -= dmg;
  hurtFlash = Math.min(1, hurtFlash + dmg/45);
  camShake = Math.min(6, camShake + dmg/8);
  SFX.hurt();
  if(P.hp<=0){ P.hp=0; endGame(); }
  updateHUD();
}
function burst(x,y,z,n,col){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, s=0.6+Math.random()*2.4;
    parts.push({ x,y,z:z+Math.random()*0.3,
      vx:Math.cos(a)*s, vy:Math.sin(a)*s, vz:1+Math.random()*2.4,
      life:0.5+Math.random()*0.7, size:0.03+Math.random()*0.05,
      c:(255<<24)|((col[2]+Math.random()*30|0)<<16)|((col[1]+Math.random()*40|0)<<8)|(col[0]+Math.random()*30|0) });
  }
  if(parts.length>420) parts.splice(0, parts.length-420);
}

/* ---------- strzelanie ---------- */
function startReload(){
  P.reloadT = WEAPONS[W_SHOTGUN].reload;
  P.cd = Math.max(P.cd, P.reloadT);
  SFX.swap();
  updateHUD();
}

let chainSfxT = 0;
function fire(){
  const w=WEAPONS[P.w];

  if(P.w===W_SHOTGUN){                                  // dubeltówka — magazynek dwulufowy
    if(P.mag<=0){
      if(P.shells>0) startReload(); else { SFX.empty(); P.cd=0.35; }
      return;
    }
    P.mag--;
  } else if(w.ammo!==-1){
    if(P[w.ammo]<=0){ SFX.empty(); P.cd=0.35; return; }
    P[w.ammo]--;
  }
  P.cd+=w.cd; P.kickT=1; P.fireT=w.melee?0.32:0.11;   // += : kadencja niezależna od liczby klatek

  if(w.flame){
    SFX.flame();
    flashLight=Math.max(flashLight,3.5);
    addLight(P.x,P.y,[1.20,0.55,0.15],3.5,0.07);
    camShake=Math.max(camShake,0.45);
    // Stożek rozszerza się z odległością: z bliska wąski i pewny, dalej szeroki
    // ale rozrzedzony. Trafienie samo w sobie boli mało — liczy się podpalenie.
    for(const e of enemies.slice()){
      if(e.dying>0) continue;
      const dx=e.x-P.x, dy=e.y-P.y, dist=Math.hypot(dx,dy);
      if(dist > w.range + ENEMY_DEF[e.kind].r) continue;
      const spread = w.arc*(0.5 + dist/w.range*0.9);
      if(Math.abs(angDiff(Math.atan2(dy,dx), P.a)) > spread) continue;
      if(!losClear(P.x,P.y,e.x,e.y)) continue;
      damage(e, w.dmg*atkMul()*(0.8+Math.random()*0.4));
      if(e.dying<=0) e.burn = Math.max(e.burn||0, w.burn);
    }
    // płomień w świecie — żeby było widać strumień, nie tylko broń w rękach
    for(let i=0;i<3;i++){
      const a = P.a + (Math.random()*2-1)*w.arc*0.85;
      const dd = 0.45 + Math.random()*w.range*0.85;
      if(rayWallDist(P.x,P.y,Math.cos(a),Math.sin(a),dd) < dd) continue;
      parts.push({ x:P.x+Math.cos(a)*dd, y:P.y+Math.sin(a)*dd, z:0.5+Math.random()*0.3,
        vx:Math.cos(a)*1.7, vy:Math.sin(a)*1.7, vz:0.6+Math.random()*1.1,
        life:0.2+Math.random()*0.24, size:0.05+Math.random()*0.07,
        c:(255<<24)|(((35+Math.random()*45)|0)<<16)|(((140+Math.random()*85)|0)<<8)|255 });
    }
    if(parts.length>420) parts.splice(0, parts.length-420);
    updateHUD();
    return;
  }

  if(w.melee){
    SFX.axe();
    // trafienie rozwiązuje resolveSwing() po w.swing sekund — w pętli gry
    P.swingT = w.swing;
    P.iframe = Math.max(P.iframe, w.iframe);
    camShake=Math.max(camShake,1.2);
    return;
  }

  // broń palna
  if(P.w===W_SHOTGUN){ SFX.shotgun(); flashLight=Math.max(flashLight,9); camShake=Math.max(camShake,3.2); P.pitch=clamp(P.pitch+7,-70,70);
               addLight(P.x,P.y,[1.60,1.15,0.50],6.5,0.085); }
  else       { if(performance.now()-chainSfxT>60){ SFX.chain(); chainSfxT=performance.now(); }   // max ~16 dźwięków/s flashLight=Math.max(flashLight,5); camShake=Math.max(camShake,1.1);
               P.pitch=clamp(P.pitch+1.6*w.cd/WEAPON_BASE.cd,-70,70);   // odrzut na sekundę stały mimo kadencji
               addLight(P.x,P.y,[1.10,0.80,0.35],4.5,0.055); }

  const stun = P.w===W_SHOTGUN && wupOpt('shotgun')==='b';
  for(let i=0;i<w.pellets;i++){
    const a = P.a + (Math.random()*2-1)*w.spread;
    const hit = hitscan(a, w.range, w.dmg*atkMul()*(0.85+Math.random()*0.3), w.pierce);
    if(stun && hit && hit.dying<=0) hit.stun = Math.max(hit.stun||0, hit.kind===3 ? 0.3 : 0.6);
  }

  // po opróżnieniu obu luf przeładuj automatycznie
  if(P.w===W_SHOTGUN && P.mag<=0 && P.shells>0) startReload();
  updateHUD();
}

// Siekiera tnie w łuku: dostają WSZYSTKIE drzewa w stożku, sadzonki podwójnie,
// a trafione są odrzucane. Cel szukany w chwili trafienia, nie w chwili zamachu.
function resolveSwing(){
  if(P.dead) return;
  const w=WEAPONS[0];
  let any=false;
  const targets = enemies.slice();   // kopia: matecznik może dosiać sadzonki w trakcie
  for(const e of targets){
    if(e.dying>0) continue;
    const dx=e.x-P.x, dy=e.y-P.y, dist=Math.hypot(dx,dy);
    if(dist > w.range + ENEMY_DEF[e.kind].r) continue;
    if(Math.abs(angDiff(Math.atan2(dy,dx), P.a)) > w.arc) continue;
    let dmg = w.dmg*atkMul()*(0.85+Math.random()*0.3);
    if(e.kind===0) dmg*=2;                       // sadzonki rąbie się jak chrust
    const ax = wupOpt('axe');
    if(ax==='b' && e.rooted){                    // SZEROKI ROZMACH: wyrywa zakorzenione
      dmg*=3; e.rooted=false; e.uprooted=true;
      burst(e.x,e.y,0.15,14,[110,90,55]);
    }
    damage(e,dmg);
    // KARCZOWANIE: dobija, gdy zostało mało wytrzymałości
    if(ax==='a' && e.dying<=0 && e.hp < e.maxhp*(e.kind===3 ? 0.10 : 0.25)){
      damage(e, e.hp+1, 'blast');
      burst(e.x,e.y,0.5,16,[150,110,60]);
    }
    if(!e.rooted && e.dying<=0){                 // odrzut — tylko niezakorzenione
      const l=dist||1e-4;
      tryMove(e, dx/l*w.knock, dy/l*w.knock, ENEMY_DEF[e.kind].r);
    }
    any=true;
  }
  if(any){ SFX.chop(); camShake=Math.max(camShake,1.8); }
}

function angDiff(a,b){ let d=a-b; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; return d; }

// Odległość do najbliższej ściany wzdłuż promienia (DDA — bez marszu po krokach).
function rayWallDist(ox,oy,dx,dy,maxD){
  let mapX=ox|0, mapY=oy|0;
  const ddx = dx===0?1e30:Math.abs(1/dx);
  const ddy = dy===0?1e30:Math.abs(1/dy);
  let stepX,stepY,sdx,sdy;
  if(dx<0){ stepX=-1; sdx=(ox-mapX)*ddx; } else { stepX=1; sdx=(mapX+1-ox)*ddx; }
  if(dy<0){ stepY=-1; sdy=(oy-mapY)*ddy; } else { stepY=1; sdy=(mapY+1-oy)*ddy; }
  let side=0, guard=0;
  while(guard++<512){
    if(sdx<sdy){ sdx+=ddx; mapX+=stepX; side=0; }
    else       { sdy+=ddy; mapY+=stepY; side=1; }
    const d = side===0 ? sdx-ddx : sdy-ddy;
    if(d>maxD) return maxD;
    if(cell(mapX,mapY)!==0) return d;
  }
  return maxD;
}

// Analityczny promień↔okrąg: jeden test na wroga zamiast ~250 kroków marszu.
// Znika też błąd „kwadratowego" hitboksa i przestrzeliwanie cienkich sadzonek.
// pierce: promień nie zatrzymuje się na drzewie — rani każde na linii aż do ściany
function hitscan(a, range, dmg, pierce){
  const dx=Math.cos(a), dy=Math.sin(a);
  const wallD = rayWallDist(P.x, P.y, dx, dy, range);

  if(pierce){
    const hits=[];
    for(const e of enemies){
      if(e.dying>0) continue;
      const r = ENEMY_DEF[e.kind].r;
      const ex=e.x-P.x, ey=e.y-P.y;
      const proj = ex*dx + ey*dy;
      if(proj<=0 || proj-r>=wallD) continue;
      const perp2 = ex*ex+ey*ey - proj*proj;
      if(perp2 > r*r) continue;
      const t = proj - Math.sqrt(r*r - perp2);
      if(t<0 || t>=wallD) continue;
      hits.push([e,t]);
    }
    for(const [e,t] of hits){               // lista zebrana wcześniej: matecznik/pękacz zmieniają enemies
      if(e.dying>0) continue;
      damage(e,dmg);
      burst(P.x+dx*t, P.y+dy*t, 0.6+Math.random()*0.7, 3, [90,150,60]);
    }
    if(wallD<range) burst(P.x+dx*(wallD-0.1), P.y+dy*(wallD-0.1), 0.5+Math.random()*0.5, 2, [110,95,70]);
    return;
  }

  let hit=null, hitT=wallD;
  for(const e of enemies){
    if(e.dying>0) continue;
    const r = ENEMY_DEF[e.kind].r;
    const ex=e.x-P.x, ey=e.y-P.y;
    const proj = ex*dx + ey*dy;              // rzut środka na promień
    if(proj<=0 || proj-r>=hitT) continue;    // za plecami albo dalej niż aktualne trafienie
    const perp2 = ex*ex+ey*ey - proj*proj;   // kwadrat odległości środka od osi promienia
    if(perp2 > r*r) continue;
    const t = proj - Math.sqrt(r*r - perp2); // wejście w okrąg
    if(t<0 || t>=hitT) continue;
    hitT=t; hit=e;
  }

  if(hit){
    damage(hit,dmg);
    burst(P.x+dx*hitT, P.y+dy*hitT, 0.6+Math.random()*0.7, 5, [90,150,60]);
  } else if(wallD<range){
    burst(P.x+dx*(wallD-0.1), P.y+dy*(wallD-0.1), 0.5+Math.random()*0.5, 4, [110,95,70]);
  }
  return hit;
}
// Wybuch pękacza: rani gracza w promieniu i przenosi się na inne drzewa.
// Łańcuch nie może się zapętlić — drzewo z e.dying>0 nie wybuchnie drugi raz.
function explode(e,def){
  SFX.boom();
  camShake   = Math.min(9, camShake+5.5);
  flashLight = Math.max(flashLight, 10);
  addLight(e.x, e.y, [1.90,0.85,0.28], 7.5, 0.38);
  burst(e.x,e.y,0.5,44,[255,150,50]);
  burst(e.x,e.y,0.2,18,[120,70,30]);
  const pd = Math.hypot(P.x-e.x, P.y-e.y);
  if(pd < def.boomR && losClear(e.x,e.y,P.x,P.y))
    hurtPlayer(def.boomDmg*(1-pd/def.boomR));
  for(const o of enemies.slice()){
    if(o===e || o.dying>0) continue;
    const od=Math.hypot(o.x-e.x, o.y-e.y);
    if(od<def.boomR) damage(o, def.boomDmg*0.85*(1-od/def.boomR), 'blast');
  }
}

// wybuch płonącego drzewa — rani tylko inne drzewa, nigdy gracza
const TAR_R = 1.5, TAR_DMG = 30;
function tarBlast(e){
  SFX.boom();
  camShake = Math.min(9, camShake+2);
  flashLight = Math.max(flashLight, 6);
  addLight(e.x, e.y, [1.90,0.70,0.20], 4.5, 0.25);
  burst(e.x,e.y,0.4,20,[235,120,30]);
  for(const o of enemies.slice()){
    if(o===e || o.dying>0) continue;
    const od=Math.hypot(o.x-e.x, o.y-e.y);
    if(od<TAR_R) damage(o, TAR_DMG*atkMul()*(1-0.5*od/TAR_R), 'tar');
  }
}

// tryb: 'hit' — bezpośrednie trafienie gracza (hitmarker + liczba obrażeń),
//       'burn' — podpalenie (cicho, bez markera), 'blast' — wybuch
function damage(e,dmg,mode){
  mode = mode || 'hit';
  e.hp-=dmg;
  if(mode!=='burn'){
    e.flash=1;
    burst(e.x,e.y,0.7+Math.random()*0.6,4,[80,140,55]);
  }
  if(mode==='hit'){ hitT=0.16; addFloater(e,dmg); }
  if(e.hp<=0 && e.dying<=0){
    const def=ENEMY_DEF[e.kind];
    const wasBurning = e.burn>0;
    e.dying=0.65; e.dead=true; e.rooted=false; e.burn=0;
    kills++;
    save.chips += Math.round(FOREST_MODES[forestMode].incomeMul * 2*(1 + Math.floor(def.score*0.6))); saveSave();   // drzewne wióry, do wydania choćby zaraz
    // seria: ścięcia w odstępie < 3.2 s podbijają mnożnik punktów do x4
    const prev = comboMult();
    streak++; streakT = 3.2;
    const cm = comboMult();
    if(cm>prev) SFX.combo();
    score += def.score * (1 + Math.floor(Math.max(0,wave-1)/5)) * cm;
    SFX.fall();
    if(def.boom) explode(e,def);
    // SMOLNY WYBUCH: drzewo ścięte w ogniu wybucha; ścięte takim wybuchem już nie wybuchają
    if(wasBurning && mode!=='tar' && wupOpt('flame')==='b') tarBlast(e);
    burst(e.x,e.y,0.9,26,[70,130,50]);
    burst(e.x,e.y,0.4,10,[110,80,45]);
    // łupy
    const roll=Math.random();
    if(roll<0.16) addPickup(e.x,e.y,0);
    else if(roll<0.38) addPickup(e.x,e.y,1);
    else if(roll<0.54) addPickup(e.x,e.y,2);
    else if(roll<0.66) addPickup(e.x,e.y,3);
    if(e.kind===3){ message('PRADRZEW POWALONY!',2.4);
      addPickup(e.x+0.6,e.y,0);
      addPickup(e.x-0.6,e.y,2); }
    // matecznik pęka i rozsiewa sadzonki
    if(def.splits && enemies.length < 40){
      burst(e.x,e.y,0.8,18,[200,140,175]);
      for(let s=0;s<def.splits;s++){
        const a=Math.random()*Math.PI*2, off=0.5+Math.random()*0.3;
        const sx=e.x+Math.cos(a)*off, sy=e.y+Math.sin(a)*off;
        const sd=ENEMY_DEF[0];
        if(!freeCell(sx,sy,sd.r)) continue;
        enemies.push(makeEnemy(0,sx,sy));
      }
      message('MATECZNIK PĘKŁ — SADZONKI!',1.4);
    }
    updateHUD();
  } else if(mode==='hit') SFX.hit();
}
