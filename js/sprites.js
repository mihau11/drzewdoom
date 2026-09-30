"use strict";
// sprite'y drzew/pickupów, pnącza w UI, przebudowa grafik

/* ============================================================
   SPRITE'Y (rysowane w 2D, potem cięte na piksele)
   ============================================================ */
const SPR_LV = 16;
function makeSprite(w,h,draw,tint){
  const c=makeCanvas(w,h); const g=c.getContext('2d');
  g.clearRect(0,0,w,h); draw(g,w,h);
  if(tint){                       // odcień biomu — tylko na narysowanych pikselach
    g.globalCompositeOperation='source-atop';
    g.fillStyle=tint; g.fillRect(0,0,w,h);
    g.globalCompositeOperation='source-over';
  }
  return buildTex(grab(c), SPR_LV);
}
function jag(g,cx,cy,rr,n,rand,col){
  g.fillStyle=col; g.beginPath();
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2, k=rr*(0.72+rand()*0.55);
    const x=cx+Math.cos(a)*k, y=cy+Math.sin(a)*k*0.85;
    i?g.lineTo(x,y):g.moveTo(x,y);
  }
  g.closePath(); g.fill();
}

/* Rysunek jednego wrogiego drzewa.
   kind: 0 sadzonka, 1 dąb, 2 świerk, 3 prastare, 4 zakorzeniony, 5 matecznik, 6 cichosz */
function drawTree(g,w,h,kind,frame,seed){
  const r=mulberry32(seed+frame*17);
  const t = frame/4*Math.PI*2;
  const sway = Math.sin(t)*w*0.045;
  const step = Math.sin(t)*h*0.03;
  const pal = [
    { bark:'#6a4b30', bark2:'#3c2a1a', leaf:['#6fbf4a','#4f9c33','#8ad35e'], eye:'#ffe14a' },
    { bark:'#5a3f28', bark2:'#2e2013', leaf:['#3f7a2c','#2c5c1f','#55993a'], eye:'#ff6a2a' },
    { bark:'#4a3524', bark2:'#241a10', leaf:['#1f5638','#154029','#2c7048'], eye:'#63e3ff' },
    { bark:'#3a2a1e', bark2:'#181009', leaf:['#5b3f6e','#3d2a4c','#7a5690'], eye:'#ff2f2f' },
    { bark:'#4c4a42', bark2:'#22201b', leaf:['#4a5a30','#333f20','#5f7040'], eye:'#ffab2e' },
    { bark:'#6b4a44', bark2:'#33201e', leaf:['#b06a8e','#7d4562','#c98aa8'], eye:'#8cff6a' },
    { bark:'#c6c2b0', bark2:'#6e6a5c', leaf:['#8f9c86','#6d7a66','#aab6a0'], eye:'#ffffff' },
    { bark:'#4a2a20', bark2:'#20100c', leaf:['#c25a22','#8e3c16','#e07a2e'], eye:'#ffd23b' },
  ][kind];

  const cx=w/2, ground=h-1;
  const trunkW = [0.16,0.30,0.20,0.42,0.50,0.28,0.18,0.22][kind]*w;
  const trunkTop = h*[0.52,0.46,0.40,0.30,0.44,0.48,0.34,0.46][kind];

  // korzenie-nogi
  g.fillStyle=pal.bark2;
  for(let s=-1;s<=1;s+=2){
    const lx = cx + s*trunkW*0.42 + (s>0?step:-step);
    g.beginPath();
    g.moveTo(lx - trunkW*0.22, ground - h*0.22);
    g.lineTo(lx + trunkW*0.22, ground - h*0.22);
    g.lineTo(lx + trunkW*0.34 + s*3, ground);
    g.lineTo(lx - trunkW*0.34 + s*3, ground);
    g.closePath(); g.fill();
  }
  // pień
  g.fillStyle=pal.bark;
  g.beginPath();
  g.moveTo(cx-trunkW/2, ground-h*0.16);
  g.lineTo(cx+trunkW/2, ground-h*0.16);
  g.lineTo(cx+trunkW*0.36+sway, trunkTop);
  g.lineTo(cx-trunkW*0.36+sway, trunkTop);
  g.closePath(); g.fill();
  g.fillStyle=pal.bark2;
  for(let i=0;i<10;i++){
    const y=trunkTop+r()*(ground-trunkTop-4);
    g.fillRect(cx-trunkW*0.4+r()*trunkW*0.8, y, 1, 3+r()*8);
  }

  // cechy szczególne nowych gatunków
  if(kind===4){                       // zakorzeniony — grube korzenie wpite w ziemię
    g.strokeStyle=pal.bark2; g.lineCap='round';
    for(let i=0;i<7;i++){
      const s=(i/6-0.5)*2;
      g.lineWidth=Math.max(2, trunkW*0.16);
      g.beginPath();
      g.moveTo(cx+s*trunkW*0.28, ground-h*0.20);
      g.quadraticCurveTo(cx+s*trunkW*0.9, ground-h*0.06, cx+s*w*0.46, ground-1);
      g.stroke();
    }
    g.fillStyle='rgba(90,70,40,.45)';
    g.beginPath(); g.ellipse(cx, ground-2, w*0.46, h*0.045, 0,0,7); g.fill();
  } else if(kind===5){                // matecznik — torebki z zarodnikami na pniu
    for(let i=0;i<6;i++){
      const y=trunkTop+r()*(ground-trunkTop-8), x=cx-trunkW*0.5+r()*trunkW;
      const rr2=2+r()*3;
      g.fillStyle='#c98aa8'; g.beginPath(); g.ellipse(x,y,rr2,rr2*1.3,0,0,7); g.fill();
      g.fillStyle='rgba(255,220,235,.6)'; g.beginPath(); g.ellipse(x-rr2*0.3,y-rr2*0.4,rr2*0.35,rr2*0.4,0,0,7); g.fill();
    }
  } else if(kind===7){                // pękacz — nabrzmiałe, świecące torebki
    for(let i=0;i<5;i++){
      const y=trunkTop+r()*(ground-trunkTop-10), x=cx-trunkW*0.55+r()*trunkW*1.1;
      const rr2=3+r()*3.5, gl=0.5+((frame%2)?0.35:0);
      g.fillStyle='rgba(255,'+((90+gl*90)|0)+',30,'+(0.55+gl*0.35).toFixed(2)+')';
      g.beginPath(); g.ellipse(x,y,rr2,rr2*1.25,0,0,7); g.fill();
      g.fillStyle='rgba(255,240,180,.75)';
      g.beginPath(); g.ellipse(x-rr2*0.25,y-rr2*0.35,rr2*0.3,rr2*0.36,0,0,7); g.fill();
    }
  } else if(kind===6){                // cichosz — brzozowe pręgi
    g.fillStyle='#2f2c26';
    for(let i=0;i<12;i++){
      const y=trunkTop+r()*(ground-trunkTop-3);
      const ww=trunkW*(0.25+r()*0.5);
      g.fillRect(cx-trunkW*0.45+r()*(trunkW*0.9-ww), y, ww, 1+r()*2);
    }
  }

  // konary-ramiona
  g.strokeStyle=pal.bark; g.lineCap='round';
  for(let s=-1;s<=1;s+=2){
    const armY = h*[0.60,0.56,0.52,0.44,0.58,0.58,0.46,0.56][kind];
    const reach = w*0.42*(1+Math.sin(t+ (s>0?0:2))*0.12);
    g.lineWidth = Math.max(2, trunkW*0.22);
    g.beginPath();
    g.moveTo(cx + s*trunkW*0.3, armY);
    g.quadraticCurveTo(cx + s*reach*0.8, armY - h*0.06, cx + s*reach, armY + h*0.07);
    g.stroke();
    g.lineWidth = Math.max(1, trunkW*0.11);
    for(let f=0;f<3;f++){
      g.beginPath();
      g.moveTo(cx + s*reach, armY + h*0.07);
      g.lineTo(cx + s*(reach + 4 + f*2), armY + h*(0.12 + f*0.035));
      g.stroke();
    }
  }

  // korona
  if(kind===2){                       // świerk — warstwy
    for(let i=0;i<4;i++){
      const yy = trunkTop - h*0.02 + i*h*0.12;
      const ww = w*(0.18 + i*0.11);
      g.fillStyle = pal.leaf[i%3];
      g.beginPath();
      g.moveTo(cx+sway, yy - h*0.16);
      g.lineTo(cx+sway+ww, yy);
      g.lineTo(cx+sway-ww, yy);
      g.closePath(); g.fill();
    }
  } else {
    const rr = w*[0.24,0.40,0.30,0.46,0.34,0.38,0.26,0.30][kind];
    const cy = trunkTop - rr*0.35;
    for(let i=0;i<7;i++){
      const a=i/7*Math.PI*2;
      jag(g, cx+sway+Math.cos(a)*rr*0.55, cy+Math.sin(a)*rr*0.38, rr*0.62, 9, r, pal.leaf[i%3]);
    }
    jag(g, cx+sway, cy, rr*0.9, 11, r, pal.leaf[1]);
    g.globalAlpha=.5;
    jag(g, cx+sway-rr*0.3, cy-rr*0.3, rr*0.5, 9, r, pal.leaf[2]);
    g.globalAlpha=1;
  }

  // twarz w korze
  const fy = h*[0.68,0.66,0.62,0.56,0.66,0.68,0.58,0.64][kind];
  const ew = Math.max(2, trunkW*0.20), eg = trunkW*0.24;
  g.fillStyle='#0a0603';
  g.beginPath(); g.ellipse(cx-eg, fy, ew*1.3, ew, 0,0,7); g.fill();
  g.beginPath(); g.ellipse(cx+eg, fy, ew*1.3, ew, 0,0,7); g.fill();
  g.fillStyle=pal.eye;
  g.beginPath(); g.ellipse(cx-eg, fy, ew*0.7, ew*0.55,0,0,7); g.fill();
  g.beginPath(); g.ellipse(cx+eg, fy, ew*0.7, ew*0.55,0,0,7); g.fill();
  g.fillStyle='#0a0603';
  const mw=trunkW*0.5, my=fy+ew*2.2, mh=ew*(1.2+Math.abs(Math.sin(t))*0.9);
  g.beginPath(); g.moveTo(cx-mw/2,my);
  for(let i=0;i<=4;i++) g.lineTo(cx-mw/2+mw*i/4, my + (i%2?mh:mh*0.3));
  g.lineTo(cx+mw/2,my); g.closePath(); g.fill();
  g.fillStyle='#e9e2cf';
  for(let i=0;i<4;i++){
    const x=cx-mw/2+mw*(i+0.5)/4;
    g.beginPath(); g.moveTo(x-1.2,my); g.lineTo(x+1.2,my); g.lineTo(x, my+mh*0.55); g.closePath(); g.fill();
  }
}

function drawStump(g,w,h){
  const r=mulberry32(5);
  g.fillStyle='#3c2a1a';
  g.beginPath(); g.moveTo(w*0.3,h); g.lineTo(w*0.7,h); g.lineTo(w*0.66,h*0.55); g.lineTo(w*0.34,h*0.55); g.closePath(); g.fill();
  g.fillStyle='#7a5a3a'; g.beginPath(); g.ellipse(w/2,h*0.55,w*0.17,h*0.06,0,0,7); g.fill();
  g.strokeStyle='#4a3524'; g.lineWidth=1;
  for(let i=1;i<4;i++){ g.beginPath(); g.ellipse(w/2,h*0.55,w*0.17*i/4,h*0.06*i/4,0,0,7); g.stroke(); }
  for(let i=0;i<6;i++){ g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(w*0.32+r()*w*0.36, h*0.6+r()*h*0.35,1,3+r()*5); }
}
function drawPickup(g,w,h,kind){
  if(kind===0){                                  // liść zdrowia
    g.fillStyle='#7fe06a';
    g.beginPath(); g.moveTo(w/2,h*0.15);
    g.quadraticCurveTo(w*0.95,h*0.45,w/2,h*0.92);
    g.quadraticCurveTo(w*0.05,h*0.45,w/2,h*0.15); g.fill();
    g.strokeStyle='#2f6b22'; g.lineWidth=1;
    g.beginPath(); g.moveTo(w/2,h*0.2); g.lineTo(w/2,h*0.88); g.stroke();
    g.fillStyle='rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(w*0.4,h*0.4,w*0.08,h*0.14,-0.5,0,7); g.fill();
  } else if(kind===1){                           // pudełko naboi śrutowych
    g.fillStyle='#8a2f2f'; g.fillRect(w*0.2,h*0.4,w*0.6,h*0.45);
    g.fillStyle='#c9a24a'; g.fillRect(w*0.2,h*0.72,w*0.6,h*0.13);
    g.fillStyle='#e0d6bb'; g.font=`${Math.floor(h*0.28)}px monospace`; g.textAlign='center';
    g.fillText('S', w*0.5, h*0.68);
  } else if(kind===3){                           // kanister paliwa
    g.fillStyle='#b5471f'; g.fillRect(w*0.24,h*0.34,w*0.5,h*0.52);
    g.fillStyle='#7c2c11'; g.fillRect(w*0.24,h*0.34,w*0.5,h*0.08);
    g.fillStyle='#2a2320'; g.fillRect(w*0.44,h*0.24,w*0.12,h*0.12);
    g.strokeStyle='#2a2320'; g.lineWidth=2;
    g.beginPath(); g.moveTo(w*0.34,h*0.3); g.lineTo(w*0.5,h*0.22); g.stroke();
    g.fillStyle='#ffd06a'; g.beginPath();
    g.moveTo(w*0.46,h*0.44); g.lineTo(w*0.6,h*0.44); g.lineTo(w*0.48,h*0.62);
    g.lineTo(w*0.58,h*0.62); g.lineTo(w*0.42,h*0.8); g.lineTo(w*0.5,h*0.6);
    g.lineTo(w*0.4,h*0.6); g.closePath(); g.fill();
  } else {                                       // skrzynka amunicji
    g.fillStyle='#3f5a2e'; g.fillRect(w*0.15,h*0.42,w*0.7,h*0.44);
    g.fillStyle='#2a3d1f'; g.fillRect(w*0.15,h*0.42,w*0.7,h*0.09);
    g.fillStyle='#c9c14a';
    for(let i=0;i<4;i++) g.fillRect(w*(0.22+i*0.16), h*0.56, w*0.09, h*0.22);
  }
}

// generowanie zestawów klatek
const TREE_FRAMES = 4;
const TREES = [];
let STUMP=null, PICKUP=null, CONE=null;

function buildSprites(B){
  const tint = B.treeTint;
  TREES.length = 0;
  for(let k=0;k<8;k++){
    const w=[44,64,52,84,76,58,40,48][k], h=[64,96,104,140,92,88,110,78][k];
    const fr=[];
    for(let f=0;f<TREE_FRAMES;f++) fr.push(makeSprite(w,h,(g,W2,H2)=>drawTree(g,W2,H2,k,f,k*101+7), tint));
    TREES.push(fr);
  }
  STUMP  = makeSprite(48,32,drawStump,tint);
  // znajdźki celowo BEZ odcienia — muszą pozostać czytelne w każdym biomie
  PICKUP = [0,1,2,3].map(k=>makeSprite(28,28,(g,w,h)=>drawPickup(g,w,h,k)));
  CONE = makeSprite(16,20,(g,w,h)=>{
    g.fillStyle='#5a3a1e'; g.beginPath(); g.ellipse(w/2,h/2,w*0.3,h*0.42,0,0,7); g.fill();
    g.fillStyle='#3a2410';
    for(let i=0;i<5;i++) g.fillRect(w*0.2, h*(0.18+i*0.15), w*0.6, 1.5);
    g.fillStyle='rgba(255,180,80,.5)'; g.beginPath(); g.ellipse(w*0.4,h*0.35,w*0.12,h*0.1,0,0,7); g.fill();
  }, tint);
}

/* ---------- pnącza w interfejsie ----------
   Rysowane na płótnie i wstrzykiwane do CSS jako data URI. Kolory bierzemy
   z mchu biomu, więc UI zmienia odcień razem z lasem. */
function vineLeaf(g,x,y,len,ang,col){
  g.save(); g.translate(x,y); g.rotate(ang);
  g.fillStyle=col;
  g.beginPath(); g.moveTo(0,0);
  g.quadraticCurveTo(len*0.5,-len*0.44, len,0);
  g.quadraticCurveTo(len*0.5, len*0.44, 0,0);
  g.fill();
  g.restore();
}
function makeVineCorner(B,S,seed){
  const c=makeCanvas(S,S), g=c.getContext('2d'), r=mulberry32(seed||23);
  const m=B.moss;
  const shade=(k)=>`rgb(${Math.min(255,Math.max(0,m[0]*k))|0},${Math.min(255,Math.max(0,m[1]*k))|0},${Math.min(255,Math.max(0,m[2]*k))|0})`;
  const dark=shade(0.5), mid=shade(0.95), lite=shade(1.45);
  g.lineCap='round'; g.lineJoin='round';
  // główna łodyga biegnie wzdłuż narożnika
  const stem=(w,col)=>{ g.strokeStyle=col; g.lineWidth=S*w;
    g.beginPath(); g.moveTo(S*0.05,S*0.82);
    g.quadraticCurveTo(S*0.09,S*0.11, S*0.84,S*0.07); g.stroke(); };
  stem(0.105, dark);
  stem(0.055, mid);
  // wąsy odchodzące w głąb panelu
  g.strokeStyle=mid; g.lineWidth=Math.max(1,S*0.035);
  g.beginPath(); g.moveTo(S*0.08,S*0.46); g.quadraticCurveTo(S*0.28,S*0.42,S*0.24,S*0.21); g.stroke();
  g.beginPath(); g.moveTo(S*0.46,S*0.08); g.quadraticCurveTo(S*0.50,S*0.28,S*0.70,S*0.25); g.stroke();
  // listki wzdłuż łodygi i na końcach wąsów
  const leaves=[[0.10,0.64,0.26,2.55],[0.08,0.34,0.25,2.15],[0.06,0.88,0.21,2.95],
                [0.30,0.09,0.25,0.55],[0.60,0.06,0.23,0.95],
                [0.24,0.20,0.19,-0.75],[0.70,0.25,0.19,1.65]];
  for(const [lx,ly,ll,la] of leaves){
    vineLeaf(g,S*lx,S*ly,S*ll,la, r()<0.45?lite:mid);
    g.strokeStyle=dark; g.lineWidth=Math.max(1,S*0.02);
    g.beginPath(); g.moveTo(S*lx,S*ly);
    g.lineTo(S*lx+Math.cos(la)*S*ll*0.9, S*ly+Math.sin(la)*S*ll*0.9); g.stroke();
  }
  return c;
}
function rebuildUIArt(B){
  const root=document.documentElement;
  root.style.setProperty('--vine',     `url(${makeVineCorner(B,28,23).toDataURL()})`);
  root.style.setProperty('--vine-big', `url(${makeVineCorner(B,48,71).toDataURL()})`);
}

// Kolor mgły jest wpalony w poziomy przyciemnienia, więc zmiana biomu
// wymaga wygenerowania całej grafiki od nowa.
function rebuildArt(B){
  TEX   = [ null, buildTex(texStone(false,B),32), buildTex(texBark(B),32),
            buildTex(texStone(true,B),32) ];
  GRASS = buildTex(texGrass(B),32);
  updateFaceLight(B);      // B7: kierunek ksiezyca zmienia sie z biomem
  sky   = makeSky(B);
  buildSprites(B);
  rebuildUIArt(B);        // pnącza w UI też są w kolorach biomu
  vign  = null;
}
