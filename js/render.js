"use strict";
// raycaster: niebo, podłoga, ściany, sprite'y, cząsteczki

/* ============================================================
   RENDER
   ============================================================ */
let dirX=1,dirY=0,plX=0,plY=PLANE, camShift=0;

function render(){
  const shakeX = camShake>0 ? (Math.random()*2-1)*camShake : 0;
  const shakeY = camShake>0 ? (Math.random()*2-1)*camShake : 0;
  const bob = Math.sin(bobT)*2.2 + Math.abs(Math.cos(bobT))*0.8;
  camShift = P.dead ? P.pitch + 70          // po śmierci kamera opada na ziemię
                    : P.pitch + bob + shakeY;
  const ang = P.a + shakeX*0.002;
  dirX=Math.cos(ang); dirY=Math.sin(ang);
  plX=-dirY*PLANE;    plY=dirX*PLANE;

  const horizon = (H/2 + camShift)|0;

  drawSky(ang, horizon);
  drawFloor(horizon);
  drawWalls(horizon);

  // sprite'y: wrogowie, pnie, znajdźki, pociski
  const list=[];
  for(const e of enemies){
    const fr = TREES[e.kind][((e.anim|0)%TREE_FRAMES+TREE_FRAMES)%TREE_FRAMES];
    const d=ENEMY_DEF[e.kind];
    let sy=1, sx=1;
    if(e.dying>0){ const t=1-e.dying/0.65; sy=1-t*0.92; sx=1+t*0.45; }
    if(e.rooted){ sy*=0.92; sx*=1.12; }          // wrośnięty: przysiada i rozpiera się
    lightAt(e.x, e.y, LT);                       // B8: raz na obiekt
    list.push({ x:e.x, y:e.y, tex:fr, hUnits:d.hUnits*sy, wUnits:d.wUnits*sx, flash:e.flash,
                lr:LT[0], lg:LT[1], lb:LT[2] });
  }
  for(const d of decals){
    lightAt(d.x, d.y, LT);
    list.push({ x:d.x, y:d.y, tex:STUMP, hUnits:0.30, wUnits:0.45, flash:0,
                lr:LT[0], lg:LT[1], lb:LT[2] });
  }
  for(const pk of pickups){
    // ostatnie 5 s znajdźka miga — widać, że zaraz zniknie
    if(pk.life<5 && (pk.life*6|0)%2) continue;
    // B5: znajdzka musi zostac czytelna w kazdym biomie - mnoznik sciagniety ku szarosci
    lightAt(pk.x, pk.y, LT);
    list.push({ x:pk.x, y:pk.y, tex:PICKUP[pk.kind],
      hUnits:0.30, wUnits:0.30, flash:0, zoff:0.10+Math.sin(pk.t*3)*0.05,
      lr:1+(LT[0]-1)*0.35, lg:1+(LT[1]-1)*0.35, lb:1+(LT[2]-1)*0.35 });
  }
  // szyszka niesie wlasne swiatlo (B4), wiec lightAt na jej pozycji zwrocilby biel
  for(const s of shots) list.push({ x:s.x, y:s.y, tex:CONE, hUnits:0.22, wUnits:0.18, flash:0,
                                    zoff:s.z-0.11, lr:1, lg:1, lb:1, shadow:false });

  for(const s of list) s.d=(s.x-P.x)*(s.x-P.x)+(s.y-P.y)*(s.y-P.y);
  list.sort((a,b)=>b.d-a.d);
  for(const s of list) drawSprite(s);

  drawParticles();

  ctx.putImageData(img,0,0);

  drawWeapon();
  drawOverlayFX();
}

function drawSky(ang, horizon){
  let off = Math.floor(ang/(Math.PI*2)*SKY_W) % SKY_W;
  if(off<0) off+=SKY_W;
  const top = Math.max(0, Math.min(H, horizon));
  for(let y=0;y<top;y++){
    let sy = y - horizon + SKY_HZ;
    if(sy<0) sy=0; else if(sy>=SKY_H) sy=SKY_H-1;
    const srow = sy*SKY_W, drow = y*W;
    for(let x=0;x<W;x++){
      let sx = off + x; if(sx>=SKY_W) sx-=SKY_W;
      buf[drow+x] = sky.data[srow+sx];
    }
  }
}

function drawFloor(horizon){
  const rdx0=dirX-plX, rdy0=dirY-plY;
  const rdx1=dirX+plX, rdy1=dirY+plY;
  const start = Math.max(0, horizon+1);
  const posZ = 0.5*H;
  for(let y=start;y<H;y++){
    const p = y-horizon;
    const rowDist = posZ/p;
    if(rowDist>MAXFOG*1.35){
      // za mgłą — jednolity kolor
      const c=(255<<24)|(FOG[2]<<16)|(FOG[1]<<8)|FOG[0];
      buf.fill(c, y*W, y*W+W);
      continue;
    }
    const stepX=rowDist*(rdx1-rdx0)/W, stepY=rowDist*(rdy1-rdy0)/W;
    let fx=P.x+rowDist*rdx0, fy=P.y+rowDist*rdy0;
    let lvl = (rowDist/MAXFOG*31)|0;
    lvl -= flashLight*0.6|0;
    lvl = clamp(lvl,0,31);
    // A3: kryterium to dystans wiersza, nie wysokosc kolumny
    const mip = pickMip(GRASS, rowDist<2.2 ? 0 : rowDist<5.5 ? 1 : 2);
    const gw=mip.w, gh=mip.h;
    const tex = mip.lv[lvl];
    const row=y*W;
    for(let x=0;x<W;x++){
      const tx = ((fx*gw)|0) & (gw-1);
      const ty = ((fy*gh)|0) & (gh-1);
      buf[row+x] = tex[ty*gw+tx];
      fx+=stepX; fy+=stepY;
    }
  }
}

function drawWalls(horizon){
  for(let x=0;x<W;x++){
    const camX = 2*x/W - 1;
    const rdx = dirX + plX*camX, rdy = dirY + plY*camX;
    let mapX=P.x|0, mapY=P.y|0;
    const ddx = rdx===0?1e30:Math.abs(1/rdx);
    const ddy = rdy===0?1e30:Math.abs(1/rdy);
    let stepX,stepY,sdx,sdy;
    if(rdx<0){ stepX=-1; sdx=(P.x-mapX)*ddx; } else { stepX=1; sdx=(mapX+1-P.x)*ddx; }
    if(rdy<0){ stepY=-1; sdy=(P.y-mapY)*ddy; } else { stepY=1; sdy=(mapY+1-P.y)*ddy; }
    let side=0, hit=0, guard=0;
    while(!hit && guard++<256){
      if(sdx<sdy){ sdx+=ddx; mapX+=stepX; side=0; }
      else       { sdy+=ddy; mapY+=stepY; side=1; }
      if(cell(mapX,mapY)!==0) hit=cell(mapX,mapY);
    }
    if(!hit){ zbuf[x]=1e9; continue; }
    const perp = side===0 ? (sdx-ddx) : (sdy-ddy);
    const dist = Math.max(0.05, perp);
    zbuf[x]=dist;

    const lineH = (H/dist)|0;
    let y0 = (-lineH/2 + H/2 + camShift)|0;
    let y1 = ( lineH/2 + H/2 + camShift)|0;
    const drawY0 = Math.max(0,y0), drawY1 = Math.min(H-1,y1);
    if(drawY1<drawY0) continue;

    const tex = TEX[hit];

    // A3: kolumna o wysokosci lineH pokrywa tex.h tekseli.
    //     lineH >= tex.h -> mip 0, dalej polowa, cwiartka.
    const mip = pickMip(tex, lineH >= tex.h ? 0 : lineH >= (tex.h>>1) ? 1 : 2);
    const tw=mip.w, th=mip.h;

    let wallX = side===0 ? P.y + dist*rdy : P.x + dist*rdx;
    wallX -= Math.floor(wallX);
    let tx = (wallX*tw)|0;
    if(side===0 && rdx>0) tx=tw-tx-1;
    if(side===1 && rdy<0) tx=tw-tx-1;

    let lvl = (dist/MAXFOG*31)|0;
    lvl = clamp(lvl,0,31);          // B7 zastapilo `if(side===1) lvl+=4`
    const t = mip.lv[lvl];

    // B1*: mnoznik swiatla liczony RAZ na kolumne. Probkujemy komorke PRZED
    // sciana - sama sciana jest w lightmapie pusta.
    lightAt(side===0 ? mapX+0.5-stepX : mapX+0.5,
            side===1 ? mapY+0.5-stepY : mapY+0.5, LT);
    // B7: pelne cztery kierunki zamiast dwoch stopni jasnosci
    const fk = faceK[ side===0 ? (rdx>0 ? 1 : 0) : (rdy>0 ? 3 : 2) ];
    // mgla musi tlumic swiatlo, inaczej rozblysk rozjasnia sama mgle
    const fogK = 1 - lvl/31;
    let lr = 256 + (LT[0]*fk*256 - 256)*fogK | 0;
    let lg = 256 + (LT[1]*fk*256 - 256)*fogK | 0;
    let lb = 256 + (LT[2]*fk*256 - 256)*fogK | 0;
    if(lr<0) lr=0; if(lg<0) lg=0; if(lb<0) lb=0;

    const stepT = th/lineH;
    let texPos = (drawY0 - camShift - H/2 + lineH/2)*stepT;
    for(let y=drawY0;y<=drawY1;y++){
      const ty = ((texPos|0) & (th-1));
      texPos += stepT;
      const c = t[ty*tw+tx];
      const r = ((c      &255)*lr)>>8;
      const g = ((c>>>8  &255)*lg)>>8;
      const b = ((c>>>16 &255)*lb)>>8;
      buf[y*W+x] = 0xFF000000
        | ((b>255?255:b)<<16)
        | ((g>255?255:g)<<8)
        |  (r>255?255:r);
    }
  }
}

function drawSprite(s){
  const sx = s.x-P.x, sy = s.y-P.y;
  const invDet = 1/(plX*dirY - dirX*plY);
  const tX = invDet*(dirY*sx - dirX*sy);
  const tY = invDet*(-plY*sx + plX*sy);
  if(tY<0.12) return;
  const unit = H/tY;
  const scr = ((W/2)*(1+tX/tY))|0;
  const floorY = H/2 + camShift + unit*0.5 - (s.zoff||0)*unit;
  const sh = (unit*s.hUnits)|0;
  const sw = (unit*s.wUnits)|0;
  if(sh<1||sw<1) return;
  const y1 = floorY|0, y0 = y1-sh;
  const x0 = (scr-(sw>>1))|0, x1 = x0+sw;
  const dx0=Math.max(0,x0), dx1=Math.min(W-1,x1-1);
  if(dx1<dx0) return;
  const dy0=Math.max(0,y0), dy1=Math.min(H-1,y1-1);
  if(dy1<dy0) return;

  let lvl = (tY/MAXFOG*(SPR_LV-1))|0;
  lvl = clamp(lvl,0,SPR_LV-1);
  const tex = s.tex;
  const mip = pickMip(tex, sh >= tex.h ? 0 : sh >= (tex.h>>1) ? 1 : 2);
  const t = mip.lv[lvl];
  const tw=mip.w, th=mip.h;
  const flash = s.flash>0.02;

  // B10: cien kontaktowy idzie na wysokosc GRUNTU, wiec bez odejmowania zoff -
  //      unoszaca sie znajdzka rzuca cien tam, gdzie lezy ziemia
  if(s.shadow!==false){
    const groundY = H/2 + camShift + unit*0.5;
    contactShadow(scr, groundY, unit, s.wUnits, tY, 0.5*clamp(3/tY,0.3,1));
  }

  // B8: jeden mnoznik na caly sprite, tlumiony mgla tak samo jak tekstura
  const fogK = 1 - lvl/(SPR_LV-1);
  const mr = 256+((s.lr===undefined?1:s.lr)*256-256)*fogK|0;
  const mg = 256+((s.lg===undefined?1:s.lg)*256-256)*fogK|0;
  const mb = 256+((s.lb===undefined?1:s.lb)*256-256)*fogK|0;

  for(let x=dx0;x<=dx1;x++){
    if(zbuf[x]<=tY) continue;
    const texX = (((x-x0)*tw/sw)|0);
    if(texX<0||texX>=tw) continue;
    for(let y=dy0;y<=dy1;y++){
      const texY = (((y-y0)*th/sh)|0);
      if(texY<0||texY>=th) continue;
      const c = t[texY*tw+texX];
      if(c===0) continue;
      if(flash){
        // trafienie: sygnał gry, nie zjawisko optyczne - zostaje poza mnożeniem
        buf[y*W+x] = 0xFF000000 | (((c>>>1)&0x7F7F7F) + 0x808080);
      } else {
        const r=((c      &255)*mr)>>8, g=((c>>>8 &255)*mg)>>8, b=((c>>>16&255)*mb)>>8;
        buf[y*W+x] = 0xFF000000 | ((b>255?255:b)<<16)
                                | ((g>255?255:g)<<8)
                                |  (r>255?255:r);
      }
    }
  }
}

/* ---------- B10: cien kontaktowy ----------
   Ciemna elipsa u podstawy sprite'a. Rysowana wewnatrz tej samej iteracji co
   sprite, wiec cien blizszego drzewa pada na dalsze - to zachowanie prawidlowe. */
function contactShadow(scr, floorY, unit, wUnits, tY, str){
  const rw = (unit*wUnits*0.55)|0;
  if(rw<1) return;
  const rh = Math.max(1, (rw*0.34)|0);
  const fy=floorY|0;
  const y0=Math.max(0,fy-rh), y1=Math.min(H-1,fy+rh);
  const x0=Math.max(0,scr-rw), x1=Math.min(W-1,scr+rw);
  for(let y=y0;y<=y1;y++){
    const dy=(y-fy)/rh, dy2=dy*dy;
    const row=y*W;
    for(let x=x0;x<=x1;x++){
      if(zbuf[x] <= tY) continue;            // sciana blizej - cien nie wychodzi
      const dx=(x-scr)/rw;
      const d=dx*dx+dy2;
      if(d>=1) continue;
      const k = 256 - (str*(1-d)*256)|0;     // mnoznik < 256 = przyciemnienie
      const c = buf[row+x];
      buf[row+x] = 0xFF000000
        | ((((c>>>16&255)*k)>>8)<<16)
        | ((((c>>>8 &255)*k)>>8)<<8)
        |  (((c     &255)*k)>>8);
    }
  }
}

function drawParticles(){
  const invDet = 1/(plX*dirY - dirX*plY);
  for(const p of parts){
    const sx=p.x-P.x, sy=p.y-P.y;
    const tX = invDet*(dirY*sx - dirX*sy);
    const tY = invDet*(-plY*sx + plX*sy);
    if(tY<0.15) continue;
    const unit=H/tY;
    const scr = ((W/2)*(1+tX/tY))|0;
    const yy  = (H/2 + camShift + unit*0.5 - p.z*unit)|0;
    const sz  = Math.max(1,(p.size*unit)|0);
    const fade = clamp(1-tY/MAXFOG,0,1);
    if(fade<=0.02) continue;
    const c=p.c;
    const r=((c&255)*fade+FOG[0]*(1-fade))|0;
    const g=(((c>>>8)&255)*fade+FOG[1]*(1-fade))|0;
    const b=(((c>>>16)&255)*fade+FOG[2]*(1-fade))|0;
    const col=(255<<24)|(b<<16)|(g<<8)|r;
    for(let x=scr;x<scr+sz;x++){
      if(x<0||x>=W) continue;
      if(zbuf[x]<=tY) continue;
      for(let y=yy;y<yy+sz;y++){
        if(y<0||y>=H) continue;
        buf[y*W+x]=col;
      }
    }
  }
}
