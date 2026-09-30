"use strict";
// tekstury proceduralne, mipmapy, biomy, niebo

/* ============================================================
   TEKSTURY (proceduralne, z 32 poziomami przyciemnienia)
   ============================================================ */
function makeCanvas(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function grab(c){
  const g=c.getContext('2d');
  const d=g.getImageData(0,0,c.width,c.height);
  return { w:c.width, h:c.height, data:new Uint32Array(d.data.buffer) };
}
function shadeLevels(tex, n){
  const lv=[];
  for(let l=0;l<n;l++){
    const f = 1 - l/(n-1);
    const out = new Uint32Array(tex.data.length);
    for(let i=0;i<tex.data.length;i++){
      const c = tex.data[i];
      const a = (c>>>24)&255;
      if(a<128){ out[i]=0; continue; }
      const r = c&255, g=(c>>>8)&255, b=(c>>>16)&255;
      const nr = (r*f + FOG[0]*(1-f))|0;
      const ng = (g*f + FOG[1]*(1-f))|0;
      const nb = (b*f + FOG[2]*(1-f))|0;
      out[i] = (255<<24)|(nb<<16)|(ng<<8)|nr;
    }
    lv.push(out);
  }
  tex.lv = lv; tex.n = n;
  return tex;
}

/* ---------- A3: piramida mipmap ----------
   Filtr pudelkowy 2x2. Teksele w pelni przezroczyste nie brudza sredniej,
   bo inaczej sprite'y dostaja aureole w kolorze tla. */
const MIP_N = 3;
function downsample(src,w,h){
  const w2=w>>1, h2=h>>1, out=new Uint32Array(w2*h2);
  for(let y=0;y<h2;y++) for(let x=0;x<w2;x++){
    let r=0,g=0,b=0,cnt=0;
    for(let dy=0;dy<2;dy++) for(let dx=0;dx<2;dx++){
      const c=src[(y*2+dy)*w + x*2+dx];
      if(((c>>>24)&255)<128) continue;
      r+=c&255; g+=(c>>>8)&255; b+=(c>>>16)&255; cnt++;
    }
    // prog 2 z 4: sprite zachowuje sylwetke zamiast sie rozpuszczac
    out[y*w2+x] = cnt<2 ? 0
      : (255<<24)|(((b/cnt)|0)<<16)|(((g/cnt)|0)<<8)|((r/cnt)|0);
  }
  return {w:w2,h:h2,data:out};
}
// zastepuje bezposrednie wywolania shadeLevels(...) w rebuildArt/makeSprite
function buildTex(tex, n){
  const mips=[{w:tex.w,h:tex.h,data:tex.data}];
  while(mips.length<MIP_N){
    const m=mips[mips.length-1];
    if(m.w<=8||m.h<=8) break;
    mips.push(downsample(m.data,m.w,m.h));
  }
  tex.mip = mips.map(m => shadeLevels(m, n));
  tex.w=mips[0].w; tex.h=mips[0].h; tex.n=n;
  tex.lv = tex.mip[0].lv;
  return tex;
}
// wybor poziomu z zabezpieczeniem przed skrocona piramida
function pickMip(tex, idx){
  const m=tex.mip;
  return m[idx < m.length ? idx : m.length-1];
}

/* ---------- biomy ----------
   Każdy poziom (10 fal) to inny biom: inna mgła, inne tekstury ścian i
   podłoża, inne niebo i inny odcień samych drzew. */
const BIOMES = [
  { name:'NOCNY BÓR', fog:[10,15,22], maxfog:13.5,
    ambient:[0.82,0.90,1.08], ambientMin:0.42, lights:0,  lightCol:[0,0,0],         lightRad:0,
    moonDir:[-0.71,-0.71], moonStr:0.26,
    stone:'#3a3d42', stoneRGB:[70,74,80],
    bark:'#4a3524', barkDark:[30,20,12], barkLite:[120,92,60], knot:['#2b1d12','#5c452e'],
    moss:[40,90,30], mossVar:[40,70,40], vine:'rgba(50,110,45,.6)',
    grass:'#1d2c17', grassA:[28,52,22], grassAVar:[22,40,18],
    grassB:[12,24,10], grassBVar:[14,20,10], litter:[70,55,30], sparkle:'rgba(190,190,120,.35)',
    treeTint:null, mini:['#4a4f56','#6a4b30','#3d5c3a'],
    sky:{ stops:['#04060d','#0b1522','#16242a','#0a1210'], stars:700, moon:true,
          cloud:'40,55,70', treeline:['#0a140e','#08110c','#050c08'] } },

  { name:'TRZĘSAWISKO', fog:[12,22,17], maxfog:10.5,
    ambient:[0.78,0.95,0.84], ambientMin:0.34, lights:7,  lightCol:[0.15,0.55,0.30], lightRad:3.5,
    moonDir:[0.38,-0.92], moonStr:0.10,
    stone:'#2c3a31', stoneRGB:[56,74,62],
    bark:'#3b3526', barkDark:[18,22,14], barkLite:[92,100,62], knot:['#1d2216','#4a5230'],
    moss:[45,105,45], mossVar:[45,80,40], vine:'rgba(70,130,60,.75)',
    grass:'#1a2418', grassA:[34,54,28], grassAVar:[24,36,16],
    grassB:[26,30,16], grassBVar:[18,18,10], litter:[60,58,32], sparkle:'rgba(150,200,150,.30)',
    treeTint:'rgba(24,60,42,.22)', mini:['#3c4a41','#5a5230','#3f6444'],
    sky:{ stops:['#070d0b','#0d1a14','#16261c','#0b1410'], stars:120, moon:false,
          cloud:'50,80,62', treeline:['#0b1610','#08120c','#050d08'] } },

  { name:'ZGLISZCZA', fog:[30,18,13], maxfog:15.5,
    ambient:[1.02,0.84,0.72], ambientMin:0.30, lights:12, lightCol:[0.95,0.42,0.12], lightRad:4.5,
    moonDir:[0.00,1.00], moonStr:0.20,
    stone:'#3b3532', stoneRGB:[74,66,60],
    bark:'#2e241f', barkDark:[14,10,8], barkLite:[96,66,44], knot:['#140e0a','#4a3020'],
    moss:[90,50,25], mossVar:[70,40,20], vine:'rgba(120,60,30,.5)',
    grass:'#241d19', grassA:[52,42,34], grassAVar:[30,24,18],
    grassB:[26,20,17], grassBVar:[18,14,10], litter:[90,50,28], sparkle:'rgba(255,140,60,.45)',
    treeTint:'rgba(40,20,12,.42)', mini:['#544a44','#4a3a30','#6a4a30'],
    sky:{ stops:['#120806','#24100a','#3a1a0e','#180b07'], stars:90, moon:false,
          cloud:'90,50,36', treeline:['#1a0e09','#140a07','#0d0705'] } },

  { name:'SZRON', fog:[34,42,52], maxfog:9.5,
    ambient:[0.90,0.98,1.15], ambientMin:0.58, lights:0,  lightCol:[0,0,0],         lightRad:0,
    moonDir:[-0.92,-0.38], moonStr:0.34,
    stone:'#4a5460', stoneRGB:[96,110,126],
    bark:'#4e4a46', barkDark:[30,32,36], barkLite:[150,160,175], knot:['#2a2c30','#6a7078'],
    moss:[150,175,195], mossVar:[50,50,50], vine:'rgba(180,200,220,.5)',
    grass:'#8e9aa8', grassA:[170,182,196], grassAVar:[40,40,40],
    grassB:[120,134,150], grassBVar:[30,30,34], litter:[90,96,104], sparkle:'rgba(235,245,255,.7)',
    treeTint:'rgba(150,178,205,.26)', mini:['#5e6a78','#5a5450','#7a8894'],
    sky:{ stops:['#070b14','#101a2a','#1e2c40','#141c26'], stars:900, moon:true,
          cloud:'70,90,120', treeline:['#141c26','#101720','#0b1017'] } },

  { name:'GRZYBNIA', fog:[26,13,32], maxfog:11.5,
    ambient:[0.62,0.55,0.80], ambientMin:0.18, lights:20, lightCol:[0.70,0.25,0.95], lightRad:3.0,
    moonDir:[0.00,-1.00], moonStr:0.06,
    stone:'#3a2c44', stoneRGB:[74,56,88],
    bark:'#42283e', barkDark:[20,10,20], barkLite:[118,70,110], knot:['#1c0e1c','#5a3452'],
    moss:[140,60,150], mossVar:[60,40,60], vine:'rgba(150,70,160,.6)',
    grass:'#221630', grassA:[58,34,70], grassAVar:[30,20,36],
    grassB:[30,18,38], grassBVar:[18,12,22], litter:[110,60,120], sparkle:'rgba(220,140,255,.55)',
    treeTint:'rgba(92,40,112,.30)', mini:['#4e3c5a','#523046','#6a4070'],
    sky:{ stops:['#0a0512','#170a24','#261038','#120a1c'], stars:1100, moon:false,
          cloud:'70,40,90', treeline:['#140a1c','#0f0715','#0a050e'] } },
];

function texBark(B){
  const N=TEXN, sd=7;
  const c=makeCanvas(N,N), g=c.getContext('2d');
  const im=g.createImageData(N,N), px=new Uint32Array(im.data.buffer);
  const base=hexRGB(B.bark), dk=B.barkDark, lt=B.barkLite;

  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const u=x/N, v=y/N;
    // domena zgnieciona w pionie -> wlokna biegna wzdluz pnia.
    // fBm ma odchylenie ~0.08, wiec kazdy sklad rozciagamy wokol 0.5 -
    // bez tego kora jest plaska plama w gornej polowie zakresu.
    const fib   = (fbm(u, v*0.15, 12, sd, 3) - 0.5)*2.8;
    // funkcja grzbietowa: |2n-1| daje ostre bruzdy zamiast miekkich plam
    const bruzd = Math.abs(fbm(u, v*0.25, 6, sd+23, 2)*2-1);
    const plamy = (fbm(u, v, 3, sd+41, 2) - 0.5)*1.4;   // duze przebarwienia

    const t = clamp(0.52 + fib*0.42 + (0.30-bruzd)*0.90 - plamy*0.30, 0, 1);
    const lo = t<0.5, m = lo ? t*2 : (t-0.5)*2;
    const r = lo ? lerp(dk[0],base[0],m) : lerp(base[0],lt[0],m);
    const gg= lo ? lerp(dk[1],base[1],m) : lerp(base[1],lt[1],m);
    const b = lo ? lerp(dk[2],base[2],m) : lerp(base[2],lt[2],m);
    px[y*N+x] = (255<<24)|((b|0)<<16)|((gg|0)<<8)|(r|0);
  }
  g.putImageData(im,0,0);

  // seki zostaja na canvasie - kilka elips czyta sie lepiej niz szum
  const r=mulberry32(sd), sc=N/64;
  for(let i=0;i<5;i++){
    const x=(6+r()*52)*sc, y=(6+r()*52)*sc, rr=(3+r()*4)*sc;
    g.fillStyle=B.knot[0]; g.beginPath(); g.ellipse(x,y,rr,rr*.7,0,0,7); g.fill();
    g.fillStyle=B.knot[1]; g.beginPath(); g.ellipse(x,y,rr*.5,rr*.35,0,0,7); g.fill();
  }
  // UWAGA: ciemne pasy maskujace szew kafla usuniete - szum kafelkuje sie sam
  return grab(c);
}
function texStone(moss,B){
  const N=TEXN, sd=moss?31:13, sc=N/64;
  const c=makeCanvas(N,N), g=c.getContext('2d'), r=mulberry32(sd);
  g.fillStyle=B.stone; g.fillRect(0,0,N,N);
  // siatka blokow zostaje - daje czytelny rytm muru
  for(let row=0;row<4;row++){
    const off = (row%2)*8*sc;
    for(let col=-1;col<5;col++){
      const x=col*16*sc+off+sc, y=row*16*sc+sc, w=14*sc, h=14*sc;
      const t=.6+r()*.4;
      g.fillStyle=`rgb(${(B.stoneRGB[0]*t)|0},${(B.stoneRGB[1]*t)|0},${(B.stoneRGB[2]*t)|0})`;
      g.fillRect(x,y,w,h);
      g.fillStyle='rgba(255,255,255,.06)'; g.fillRect(x,y,w,2*sc);
      g.fillStyle='rgba(0,0,0,.28)'; g.fillRect(x,y+h-2*sc,w,2*sc);
    }
  }

  // A2: cetkowanie fbm zamiast 200 losowych czarnych pikseli,
  //     mech jako prog na szumie zamiast 90 losowych elips (platy, nie konfetti)
  const im=g.getImageData(0,0,N,N), d=im.data;
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const u=x/N, v=y/N, i=(y*N+x)*4;
    const k = 1 + (fbm(u,v,8,sd,3)-0.5)*1.5;          // cetkowanie +-18%
    let rr=d[i]*k, gg=d[i+1]*k, bb=d[i+2]*k;
    if(moss){
      const m = fbm(u,v,4,sd+7,2);
      if(m>0.58){
        const a = Math.min(0.8,(m-0.58)*4.2);
        const n2 = fbm(u,v,16,sd+13,2);
        rr = lerp(rr, B.moss[0]+n2*B.mossVar[0], a);
        gg = lerp(gg, B.moss[1]+n2*B.mossVar[1], a);
        bb = lerp(bb, B.moss[2]+n2*B.mossVar[2], a);
      }
    }
    d[i]=clamp(rr,0,255)|0; d[i+1]=clamp(gg,0,255)|0; d[i+2]=clamp(bb,0,255)|0;
  }
  g.putImageData(im,0,0);

  if(moss){
    for(let i=0;i<14;i++){                // zwisajace pnacza
      const x=r()*N; g.strokeStyle=B.vine; g.lineWidth=sc;
      g.beginPath(); g.moveTo(x,0); g.quadraticCurveTo(x+(r()*8-4)*sc,20*sc,x+(r()*10-5)*sc,(18+r()*30)*sc); g.stroke();
    }
  }
  return grab(c);
}
function texGrass(B){
  const N=TEXN, c=makeCanvas(N,N), g=c.getContext('2d'), r=mulberry32(99);
  const im=g.createImageData(N,N), px=new Uint32Array(im.data.buffer);
  // A2: dwie oktawy o roznej skali - kepy i ziarno pojedynczych zdziebel
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const u=x/N, v=y/N;
    const kepy   = fbm(u,v,5,99,2);
    const ziarno = fbm(u,v,24,99,1);
    const mix = clamp((kepy-0.44)*2.6 + 0.5, 0, 1);
    const jit = ziarno-0.5;
    const rr = lerp(B.grassB[0],B.grassA[0],mix) + jit*B.grassAVar[0];
    const gg = lerp(B.grassB[1],B.grassA[1],mix) + jit*B.grassAVar[1];
    const bb = lerp(B.grassB[2],B.grassA[2],mix) + jit*B.grassAVar[2];
    px[y*N+x] = (255<<24)|((clamp(bb,0,255)|0)<<16)|((clamp(gg,0,255)|0)<<8)|(clamp(rr,0,255)|0);
  }
  g.putImageData(im,0,0);

  const sc=N/64;
  for(let i=0;i<40;i++){                  // galazki i liscie - maja byc nieregularne
    const x=r()*N,y=r()*N;
    g.fillStyle=`rgba(${B.litter[0]+r()*30|0},${B.litter[1]+r()*20|0},${B.litter[2]+r()*15|0},.7)`;
    g.fillRect(x,y,(2+r()*3)*sc,sc);
  }
  for(let i=0;i<10;i++){                   // iskierki
    const x=r()*N,y=r()*N;
    g.fillStyle=B.sparkle; g.fillRect(x,y,sc,sc);
  }
  return grab(c);
}
let TEX = null, GRASS = null;

/* ---------- niebo ---------- */
const SKY_W=1024, SKY_H=405, SKY_HZ=270;   // horyzont tekstury w wierszu 270
let sky = null;
function makeSky(B){
  const S=B.sky;
  const c=makeCanvas(SKY_W,SKY_H), g=c.getContext('2d'), r=mulberry32(2024);
  const grd=g.createLinearGradient(0,0,0,SKY_H);
  grd.addColorStop(0,S.stops[0]); grd.addColorStop(.55,S.stops[1]);
  grd.addColorStop(.78,S.stops[2]); grd.addColorStop(1,S.stops[3]);
  g.fillStyle=grd; g.fillRect(0,0,SKY_W,SKY_H);
  for(let i=0;i<S.stars;i++){               // gwiazdy
    const x=r()*SKY_W, y=r()*250, a=r()*.9;
    g.fillStyle=`rgba(200,220,255,${a})`; g.fillRect(x,y,1,1);
    if(r()<.05){ g.fillStyle=`rgba(200,220,255,${a*.4})`; g.fillRect(x-1,y,3,1); g.fillRect(x,y-1,1,3); }
  }
  if(S.moon){                               // księżyc + poświata
    const halo=g.createRadialGradient(300,110,4,300,110,90);
    halo.addColorStop(0,'rgba(190,215,255,.30)'); halo.addColorStop(.35,'rgba(140,170,220,.10)');
    halo.addColorStop(1,'rgba(120,150,200,0)');
    g.fillStyle=halo; g.beginPath(); g.arc(300,110,90,0,7); g.fill();
    const face=g.createRadialGradient(292,102,2,300,110,17);
    face.addColorStop(0,'#f2f6ff'); face.addColorStop(.7,'#cdd8ea'); face.addColorStop(1,'#9fb0c8');
    g.fillStyle=face; g.beginPath(); g.arc(300,110,16,0,7); g.fill();
    g.fillStyle='rgba(140,155,180,.45)';
    g.beginPath(); g.arc(295,105,3.4,0,7); g.fill();
    g.beginPath(); g.arc(305,116,2.4,0,7); g.fill();
    g.beginPath(); g.arc(303,102,1.6,0,7); g.fill();
    g.beginPath(); g.arc(293,116,1.9,0,7); g.fill();
  }
  // chmury
  for(let i=0;i<26;i++){
    const x=r()*SKY_W,y=60+r()*160,w=60+r()*140,h=8+r()*16;
    g.fillStyle=`rgba(${S.cloud},${.12+r()*.2})`;
    g.beginPath(); g.ellipse(x,y,w,h,0,0,7); g.fill();
  }
  // odległa linia lasu
  for(let pass=0;pass<3;pass++){
    const base = 258 + pass*6, col=S.treeline[pass];
    g.fillStyle=col;
    let x=0;
    while(x<SKY_W){
      const w=6+r()*16, h=14+r()*46*(1-pass*.25);
      g.beginPath();
      g.moveTo(x,base); g.lineTo(x+w/2,base-h); g.lineTo(x+w,base); g.closePath(); g.fill();
      x += w*0.62;
    }
    g.fillRect(0,base,SKY_W,SKY_H-base);
  }
  return grab(c);
}
