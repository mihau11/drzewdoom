"use strict";
// broń w rękach, efekty nakładane na obraz, minimapa

/* ---------- broń w rękach ---------- */
function drawWeapon(){
  const bx = Math.sin(bobT)*6, by = Math.abs(Math.cos(bobT))*5;
  const kick = P.kickT*P.kickT;
  ctx.save();
  ctx.translate(W/2 + bx, H + by + kick*18 - (P.dead?-80:0));
  ctx.scale(H/270, H/270);        // rysunek broni jest w skali 480x270

  if(P.w===0){                                       // siekiera
    const sw = P.fireT>0 ? (1-P.fireT/0.32) : 0;
    const ang = -0.55 + (P.fireT>0 ? Math.sin(sw*Math.PI)*1.5 : 0);
    const ax = wupOpt('axe'), wide = ax==='b';
    ctx.translate(58,-8); ctx.rotate(ang);
    // SZEROKI ROZMACH: dłuższe trzonko i większe ostrze
    const hl = wide ? 132 : 110;
    ctx.fillStyle='#5a3c22'; ctx.fillRect(-6,-4,13,hl);
    ctx.fillStyle='#3a2614'; ctx.fillRect(-6,-4,4,hl);
    // KARCZOWANIE: hak z tyłu obucha, zakrzywiony w dół
    if(ax==='a'){
      ctx.fillStyle='#7d858d';
      ctx.beginPath();
      ctx.moveTo(6,0); ctx.lineTo(22,-5); ctx.quadraticCurveTo(34,-2,33,14);
      ctx.lineTo(28,8); ctx.quadraticCurveTo(24,4,16,8); ctx.lineTo(6,12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle='#b9c0c7';
      ctx.beginPath(); ctx.moveTo(22,-5); ctx.quadraticCurveTo(34,-2,33,14); ctx.lineTo(30,10); ctx.quadraticCurveTo(30,1,21,-2);
      ctx.closePath(); ctx.fill();
    }
    const bs = wide ? 1.35 : 1;                      // skala ostrza (od obucha)
    ctx.fillStyle='#9aa3ab';
    ctx.beginPath();
    ctx.moveTo(-6,0-(bs-1)*6); ctx.lineTo(-6-38*bs,-12*bs); ctx.lineTo(-6-44*bs,16*bs); ctx.lineTo(-6,22+(bs-1)*6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='#d7dde3';
    ctx.beginPath(); ctx.moveTo(-6-34*bs,-11*bs); ctx.lineTo(-6-44*bs,16*bs); ctx.lineTo(-6-36*bs,17*bs); ctx.lineTo(-6-28*bs,-8*bs);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='#6c7178'; ctx.fillRect(-10,-2-(bs-1)*6,8,22+(bs-1)*12);
    ctx.fillStyle='rgba(90,170,60,.5)';
    ctx.fillRect(-6-32*bs,4*bs,6,3); ctx.fillRect(-6-24*bs,12*bs,5,3);
  } else if(P.w===W_SHOTGUN){                                // dubeltówka (z ulepszeniem: czterolufka)
    const mag = WEAPONS[W_SHOTGUN].mag;
    // lufy obok siebie na tej samej szerokości 48 px — 2 grube albo 4 cieńsze
    const gap = mag<=2 ? 8 : 3, bw = (48-(mag-1)*gap)/mag;
    const bx0 = i => -26 + i*(bw+gap), bcx = i => bx0(i) + bw/2;
    ctx.translate(0,-2);
    ctx.translate(0,kick*14);
    // przeładowanie: broń łamie się w zawiasie, łuski wylatują,
    // nowe naboje wchodzą po kolei, broń się zamyka
    let open = 0, rt = 0, from = 0, take = 0;
    if(P.reloadT>0){
      rt = 1 - P.reloadT/WEAPONS[W_SHOTGUN].reload;           // 0 → 1
      from = P.reloadFrom ?? 0; take = P.reloadTake ?? (mag-from);
      const ease = t => t<=0 ? 0 : t>=1 ? 1 : t*t*(3-2*t);
      open = ease(rt/0.2) * (1 - ease((rt-0.84)/0.16));
      // unosi się i przechyla, żeby było widać komorę; lufy skracają się w perspektywie
      ctx.translate(16*open, -62*open);
      ctx.rotate(-0.32*open);
      ctx.scale(1, 1-0.3*open);
    }
    // lufy: pierwsze strzelają te z lewej, więc naładowane są ostatnie `P.mag`
    for(let i=0;i<mag;i++){
      const x=bx0(i);
      ctx.fillStyle='#2a2d31'; ctx.fillRect(x,-88,bw,88);
      ctx.fillStyle='#3d4247'; ctx.fillRect(x,-88,bw,4);
      ctx.fillStyle='#14161a'; ctx.fillRect(x+bw*0.2,-86,bw*0.6,84);
    }
    // OGŁUSZENIE: mosiężne okucia spinające lufy
    if(wupOpt('shotgun')==='b'){
      const x0=bx0(0), x1=bx0(mag-1)+bw;
      for(const y of [-84,-52,-20]){
        ctx.fillStyle='#b08a3e'; ctx.fillRect(x0-2,y,x1-x0+4,5);
        ctx.fillStyle='#e0c070'; ctx.fillRect(x0-2,y,x1-x0+4,1.5);
      }
    }
    // otwarta komora: widać wyloty luf przy zawiasie i które są naładowane
    if(open>0.05){
      ctx.globalAlpha = Math.min(1,(open-0.05)/0.3);
      const loadSpan = 0.42, loadT0 = 0.38;
      for(let i=0;i<mag;i++){
        const x=bx0(i);
        ctx.fillStyle='#08090b'; ctx.fillRect(x+1,-10,bw-2,9);
        // naboje, które zostały (ostatnie `from` luf) + te już włożone
        const wasLoaded = i >= mag-from;
        const slot = (mag-from-1) - i;                 // 0 = pierwsza wkładana (najbliżej naładowanych)
        const loadedNow = wasLoaded || (slot>=0 && slot<take && rt >= loadT0 + (slot+1)*loadSpan/take);
        if(loadedNow){
          ctx.fillStyle='#c9a24a'; ctx.fillRect(x+1,-10,bw-2,9);
          ctx.fillStyle='#8a2a1c'; ctx.fillRect(x+bw*0.3,-8,bw*0.4,5);
        }
      }
      ctx.globalAlpha=1;
      // wyrzucone łuski z pustych luf — lecą w górę i opadają w bok
      const et = (rt-0.16)/0.3;
      if(et>0 && et<1){
        for(let i=0;i<mag-from;i++){
          const dir = i < (mag-from)/2 ? -1 : 1;
          const x = bcx(i) + dir*et*(26+i*5) - 3.5;
          const y = -12 - et*70 + et*et*110;
          ctx.save(); ctx.translate(x+3.5,y+7); ctx.rotate(dir*et*5);
          ctx.fillStyle='#c9a24a'; ctx.fillRect(-3.5,-7,7,14);
          ctx.fillStyle='#8a2a1c'; ctx.fillRect(-3.5,2,7,5);
          ctx.restore();
        }
      }
      // nabój w drodze do lufy — wjeżdża od dołu z prawej strony
      for(let s=0;s<take;s++){
        const t0 = loadT0 + s*loadSpan/take, t = (rt-t0)/(loadSpan/take);
        if(t<=0 || t>=1) continue;
        const i = (mag-from-1) - s;
        const tx = bcx(i), ty = -6;
        const sx = 70, sy = 40;
        const x = sx + (tx-sx)*t, y = sy + (ty-sy)*t;
        ctx.fillStyle='#e0b85a'; ctx.fillRect(x-3.5,y-7,7,14);
        ctx.fillStyle='#8a2a1c'; ctx.fillRect(x-3.5,y+2,7,5);
      }
    }
    ctx.fillStyle='#5a3c22';
    ctx.beginPath(); ctx.moveTo(-34,4); ctx.lineTo(30,4); ctx.lineTo(46,64); ctx.lineTo(-48,64);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='#77502e'; ctx.fillRect(-30,6,58,10);
    ctx.fillStyle='#1b1d20'; ctx.fillRect(-8,-6,16,14);
    // błysk tylko z lufy, która właśnie wystrzeliła
    if(P.fireT>0.02 && open<0.05){
      const fired = Math.max(0, Math.min(mag-1, mag - P.mag - 1));
      const cx = bcx(fired), r = 26 + bw*0.4;
      ctx.globalAlpha=P.fireT/0.11;
      const grd=ctx.createRadialGradient(cx,-92,2,cx,-92,r);
      grd.addColorStop(0,'#fff7d0'); grd.addColorStop(.4,'#ffc44a'); grd.addColorStop(1,'rgba(255,120,20,0)');
      ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(cx,-92,r,0,7); ctx.fill();
      ctx.globalAlpha=1;
    }
  } else if(P.w===W_MOWER){                                // kosiarka (szybkostrzelna)
    ctx.translate(4,0);
    const rec=kick*8;
    ctx.translate(Math.sin(P.fireT*90)*2, rec);
    const mo = wupOpt('mower');
    const blur = mo==='a' && P.fireT>0;              // NAOSTRZONE ZĘBY: lufy zlewają się w tarczę
    const spin = (bobT*3 + (P.fireT>0? performance.now()/(mo==='a'?12:40):0));
    ctx.fillStyle='#2b2f33'; ctx.fillRect(-30,-70,60,70);
    if(blur){
      const g=ctx.createLinearGradient(-16,0,16,0);
      g.addColorStop(0,'#2a2e33'); g.addColorStop(.5,'#8a9097'); g.addColorStop(1,'#2a2e33');
      ctx.fillStyle=g; ctx.fillRect(-16,-104,32,44);
      ctx.globalAlpha=0.3;
    }
    for(let i=0;i<4;i++){
      const a=spin + i*Math.PI/2;
      const ox=Math.cos(a)*11, sc=0.6+Math.sin(a)*0.4;
      ctx.fillStyle=`rgb(${(40+sc*70)|0},${(44+sc*70)|0},${(50+sc*70)|0})`;
      ctx.fillRect(-4+ox,-104,9,44);
      // PRZEBIJANIE: stalowe, szpiczaste końcówki luf
      if(mo==='b'){
        ctx.fillStyle=`rgb(${(90+sc*120)|0},${(96+sc*120)|0},${(104+sc*120)|0})`;
        ctx.beginPath(); ctx.moveTo(-4+ox,-104); ctx.lineTo(5+ox,-104); ctx.lineTo(0.5+ox,-116);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.globalAlpha=1;
    ctx.fillStyle='#1a1d20'; ctx.fillRect(-32,-64,64,10);
    ctx.fillStyle='#3d4247'; ctx.fillRect(-34,-58,68,8);
    ctx.fillStyle='#4a3a22'; ctx.fillRect(-14,-2,28,44);
    ctx.fillStyle='#22262a'; ctx.fillRect(-40,-46,16,34); ctx.fillRect(24,-46,16,34);
    if(P.fireT>0.01){
      ctx.globalAlpha=P.fireT/0.11;
      const grd=ctx.createRadialGradient(0,-106,2,0,-106,26);
      grd.addColorStop(0,'#fffbe0'); grd.addColorStop(.35,'#ffd45a'); grd.addColorStop(1,'rgba(255,120,20,0)');
      ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(0,-106,26,0,7); ctx.fill();
      ctx.globalAlpha=1;
    }
  } else {                                           // miotacz ognia
    ctx.translate(2,0);
    ctx.translate(Math.sin(P.fireT*70)*1.5, kick*6);
    const fo = wupOpt('flame');
    // POŻAR LASU: druga butla za pierwszą, spięta wężykiem
    if(fo==='a'){
      ctx.fillStyle='#3e271d'; ctx.fillRect(64,-50,26,58);
      ctx.fillStyle='#5c3829'; ctx.fillRect(64,-50,26,6);
      ctx.fillStyle='#24160f'; ctx.fillRect(70,-40,5,40);
      ctx.strokeStyle='#3a2a20'; ctx.lineWidth=4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(60,-56); ctx.quadraticCurveTo(66,-66,76,-52); ctx.stroke();
    }
    // butla przy prawej krawędzi; SMOLNY WYBUCH: czarna w żółte pasy ostrzegawcze
    if(fo==='b'){
      ctx.fillStyle='#16171a'; ctx.fillRect(36,-58,30,64);
      ctx.save(); ctx.beginPath(); ctx.rect(36,-40,30,22); ctx.clip();
      ctx.fillStyle='#e2b81e';
      for(let k=-2;k<6;k++){
        ctx.beginPath(); ctx.moveTo(36+k*10,-18); ctx.lineTo(41+k*10,-18); ctx.lineTo(55+k*10,-40); ctx.lineTo(50+k*10,-40);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle='#2c2e32'; ctx.fillRect(36,-58,30,6);
    } else {
      ctx.fillStyle='#4a2e22'; ctx.fillRect(36,-58,30,64);
      ctx.fillStyle='#6a4030'; ctx.fillRect(36,-58,30,6);
      ctx.fillStyle='#2a1a12'; ctx.fillRect(42,-46,6,44);
    }
    // wąż paliwowy
    ctx.strokeStyle='#3a2a20'; ctx.lineWidth=6; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(2,-8); ctx.bezierCurveTo(26,12,36,-8,46,-18); ctx.stroke();
    // lanca
    ctx.fillStyle='#2e3236'; ctx.fillRect(-14,-96,22,96);
    ctx.fillStyle='#44494e'; ctx.fillRect(-14,-96,22,5);
    ctx.fillStyle='#14161a'; ctx.fillRect(-9,-94,12,90);
    ctx.fillStyle='#5a3c22'; ctx.fillRect(-19,-16,31,20);
    // knot pilotowy — pulsuje nawet, gdy nie strzelasz
    const pil=0.5+Math.sin(performance.now()/90)*0.5;
    ctx.globalAlpha=0.45+pil*0.55;
    ctx.fillStyle='#ffd06a';
    ctx.beginPath(); ctx.ellipse(-3,-100,3,6+pil*3,0,0,7); ctx.fill();
    ctx.globalAlpha=1;
    if(P.fireT>0.004){
      const grd=ctx.createRadialGradient(-3,-116,3,-3,-126,54);
      grd.addColorStop(0,'#fff6c8'); grd.addColorStop(.22,'#ffc040');
      grd.addColorStop(.6,'rgba(255,90,20,.5)'); grd.addColorStop(1,'rgba(255,60,10,0)');
      ctx.fillStyle=grd;
      ctx.beginPath(); ctx.ellipse(-3,-126,36+Math.random()*6,56+Math.random()*8,0,0,7); ctx.fill();
    }
  }
  ctx.restore();
}

// Punkt świata → ekran (ta sama macierz co w drawSprite) — dla liczb obrażeń.
function project(x,y,z){
  const sx=x-P.x, sy=y-P.y;
  const invDet = 1/(plX*dirY - dirX*plY);
  const tX = invDet*(dirY*sx - dirX*sy);
  const tY = invDet*(-plY*sx + plX*sy);
  if(tY<0.25) return null;
  const unit=H/tY;
  return { x:((W/2)*(1+tX/tY))|0, y:(H/2 + camShift + unit*0.5 - z*unit)|0, d:tY };
}

function drawOverlayFX(){
  const k = H/270;                 // skala rysunków UI wobec bazowych 480x270

  // --- liczby obrażeń nad trafionymi drzewami ---
  if(floaters.length){
    ctx.textAlign='center';
    for(const f of floaters){
      const p=project(f.x, f.y, f.z);
      if(!p || p.x<0 || p.x>=W || p.d>MAXFOG) continue;
      if(zbuf[p.x] < p.d) continue;                    // schowane za ścianą
      const a=clamp(f.life/0.55,0,1);
      const size=Math.max(5, Math.min(13, 26/p.d))*k;
      ctx.globalAlpha=a;
      ctx.font='bold '+((size)|0)+'px "Consolas",monospace';
      ctx.fillStyle='#070d08';
      ctx.fillText(Math.round(f.v), p.x+1*k, p.y+1*k);
      ctx.fillStyle = f.v>=45 ? '#ffd24a' : '#eaf5d8';
      ctx.fillText(Math.round(f.v), p.x, p.y);
    }
    ctx.globalAlpha=1;
  }

  // celownik
  if(!P.dead){
    ctx.fillStyle='rgba(190,255,170,.75)';
    const cxp=W/2|0, cyp=(H/2+P.pitch*0.35)|0;
    const r0=Math.max(1,(3*k)|0), r1=Math.max(2,(5*k)|0), th=Math.max(1,k|0);
    ctx.fillRect(cxp-r1,cyp,r1-r0+1,th); ctx.fillRect(cxp+r0,cyp,r1-r0+1,th);
    ctx.fillRect(cxp,cyp-r1,th,r1-r0+1); ctx.fillRect(cxp,cyp+r0,th,r1-r0+1);
    ctx.fillStyle='rgba(190,255,170,.35)'; ctx.fillRect(cxp,cyp,th,th);

    // hitmarker — natychmiastowe potwierdzenie trafienia
    if(hitT>0){
      const a=hitT/0.16;
      ctx.globalAlpha=0.3+0.7*a;
      ctx.strokeStyle='#fff3c0'; ctx.lineWidth=Math.max(1,k);
      const i0=4*k, i1=9.5*k;
      for(let i=0;i<4;i++){
        const sx=(i&1)?1:-1, sy=(i&2)?1:-1;
        ctx.beginPath();
        ctx.moveTo(cxp+sx*i0, cyp+sy*i0);
        ctx.lineTo(cxp+sx*i1, cyp+sy*i1);
        ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
  }
  // czerwony błysk obrażeń
  if(hurtFlash>0.01){
    ctx.fillStyle=`rgba(150,20,15,${Math.min(0.6,hurtFlash*0.5)})`;
    ctx.fillRect(0,0,W,H);
  }
  // winieta
  if(!vign) buildVignette();
  ctx.drawImage(vign,0,0);
  // wygaszenie przy przejściu do nowego lasu
  if(levelFade>0.005){
    ctx.fillStyle=`rgba(0,0,0,${Math.min(1,levelFade)})`;
    ctx.fillRect(0,0,W,H);
  }
  // niski stan zdrowia — pulsowanie
  if(P.hp<35 && !P.dead){
    const a = (Math.sin(performance.now()/180)*0.5+0.5)*0.18*(1-P.hp/35);
    ctx.fillStyle=`rgba(160,20,20,${a})`; ctx.fillRect(0,0,W,H);
  }

  // --- mnożnik serii ---
  const cm = comboMult();
  if(cm>1 && !P.dead){
    const pulse = 0.75+0.25*Math.sin(performance.now()/90);
    ctx.textAlign='center';
    ctx.globalAlpha = Math.min(1, streakT/0.5)*pulse;
    ctx.font='bold '+((12*k)|0)+'px "Consolas",monospace';
    ctx.fillStyle='#070d08'; ctx.fillText('x'+cm, W/2+1*k, H*0.27+1*k);
    ctx.fillStyle = cm>=4 ? '#ff9a3b' : cm>=3 ? '#ffd24a' : '#cfe3c4';
    ctx.fillText('x'+cm, W/2, H*0.27);
    ctx.font=((5*k)|0)+'px "Consolas",monospace';
    ctx.fillStyle='#8fb07a';
    ctx.fillText('SERIA '+streak, W/2, H*0.27+8*k);
    ctx.globalAlpha=1;
  }

  // --- strzałka do Pradrzewa, gdy jest poza kadrem ---
  if(!P.dead){
    let boss=null;
    for(const e of enemies) if(e.kind===3 && e.dying<=0){ boss=e; break; }
    if(boss){
      const da = angDiff(Math.atan2(boss.y-P.y, boss.x-P.x), P.a);
      if(Math.abs(da) > FOV_HALF*0.92){
        const side = da>0 ? 1 : -1;
        const x = side>0 ? W-7*k : 7*k, y = H/2;
        ctx.globalAlpha = 0.6+0.4*Math.sin(performance.now()/200);
        ctx.fillStyle='#ff4a32';
        ctx.beginPath();
        ctx.moveTo(x+side*5*k, y);
        ctx.lineTo(x-side*4*k, y-6*k);
        ctx.lineTo(x-side*4*k, y+6*k);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha=1;
      }
    }
  }
}
function buildVignette(){
  vign=makeCanvas(W,H); const g=vign.getContext('2d');
  const grd=g.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.85);
  grd.addColorStop(0,'rgba(0,0,0,0)'); grd.addColorStop(1,'rgba(0,0,0,.65)');
  g.fillStyle=grd; g.fillRect(0,0,W,H);
}

/* ---------- minimapa ---------- */
function drawMini(){
  const S=72, R=9;                     // promień widoczności w kratkach
  mctx.clearRect(0,0,S,S);
  mctx.fillStyle='rgba(4,10,6,.55)'; mctx.fillRect(0,0,S,S);
  const sc=S/(R*2);
  const ox=P.x, oy=P.y;
  for(let gy=Math.floor(oy-R); gy<=oy+R; gy++){
    for(let gx=Math.floor(ox-R); gx<=ox+R; gx++){
      const c=cell(gx,gy);
      if(!c) continue;
      const sx=(gx-ox+R)*sc, sy=(gy-oy+R)*sc;
      mctx.fillStyle = biome.mini[c-1] || biome.mini[0];
      mctx.fillRect(sx,sy,sc+0.6,sc+0.6);
    }
  }
  for(const d of decals){
    const sx=(d.x-ox+R)*sc, sy=(d.y-oy+R)*sc;
    if(sx<0||sy<0||sx>S||sy>S) continue;
    mctx.fillStyle='rgba(120,90,60,.7)'; mctx.fillRect(sx-1,sy-1,2,2);
  }
  for(const pk of pickups){
    const sx=(pk.x-ox+R)*sc, sy=(pk.y-oy+R)*sc;
    if(sx<0||sy<0||sx>S||sy>S) continue;
    // fiolet: żaden gatunek drzewa nie ma takiego znacznika
    mctx.fillStyle = pk.kind===0?'#7fe06a':pk.kind===3?'#b06aff':'#e0c14a';
    mctx.fillRect(sx-1.5,sy-1.5,3,3);
  }
  let widoczny=false;
  for(const e of enemies){
    if(e.dying>0) continue;
    const sx=(e.x-ox+R)*sc, sy=(e.y-oy+R)*sc;
    if(sx<0||sy<0||sx>S||sy>S) continue;
    widoczny=true;
    mctx.fillStyle = ['#ff8a3b','#ff8a3b','#5bd0ff','#ff3b3b','#ffb02e','#ff6ab0','#e8e8e8','#ff5a1e'][e.kind];
    const r = e.kind===3?3:(e.kind===4&&e.rooted)?3:2;
    mctx.fillRect(sx-r/2,sy-r/2,r,r);
  }
  // żaden wróg nie mieści się na minimapie — pokaż kierunek do najbliższego,
  // żeby ostatnie drzewa fali nie zmuszały do ślepego przeczesywania mapy
  if(!widoczny){
    let near=null, nd=1e9;
    for(const e of enemies){
      if(e.dying>0) continue;
      const d=(e.x-ox)*(e.x-ox)+(e.y-oy)*(e.y-oy);
      if(d<nd){ nd=d; near=e; }
    }
    if(near){
      const a=Math.atan2(near.y-oy, near.x-ox);
      const rad=S/2-8;
      mctx.save();
      mctx.translate(S/2+Math.cos(a)*rad, S/2+Math.sin(a)*rad);
      mctx.rotate(a);
      // dolny próg 0.44 — puls ma przyciągać wzrok, a nie gasić strzałkę
      mctx.globalAlpha = 0.72 + 0.28*Math.sin(performance.now()/220);
      mctx.fillStyle = near.kind===3 ? '#ff3b3b' : '#ffb02e';
      mctx.beginPath();
      mctx.moveTo(7,0); mctx.lineTo(-4,4.5); mctx.lineTo(-4,-4.5);
      mctx.closePath(); mctx.fill();
      mctx.restore();
    }
  }
  // gracz
  mctx.save(); mctx.translate(S/2,S/2); mctx.rotate(P.a);
  mctx.fillStyle='#dff3cf';
  mctx.beginPath(); mctx.moveTo(5,0); mctx.lineTo(-3,3); mctx.lineTo(-3,-3); mctx.closePath(); mctx.fill();
  mctx.restore();
}
