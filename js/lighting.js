"use strict";
// światło: lightmapa, światła dynamiczne, księżyc

/* ============================================================
   SWIATLO  (B2 statyczna lightmapa, B4 swiatla dynamiczne, B7 ksiezyc)
   ============================================================
   Mnoznik RGB liczony jest raz na kolumne sciany i raz na sprite - nigdy
   na piksel. Podloga zostaje na niezmienionym LUT mgly (wariant B1*). */
let LM=null;                       // Float32Array, 3 kanaly na komorke, 1.0 = neutralnie
const LT=[1,1,1];                  // bufor roboczy, zeby nie alokowac w petli

const DL=[];                       // swiatla dynamiczne
const MAXDL=10;

function addLight(x,y,col,rad,life){
  if(DL.length>=MAXDL) DL.shift();  // najstarsze wypada; przy 10 nikt nie zauwazy
  DL.push({x,y,c:col,rad,t:life,life});
}

function buildLightmap(B, seed){
  LM = new Float32Array(MW*MH*3);
  const rnd = mulberry32(seed);

  // 1. otwartosc: ile nieba widzi komorka. Wazone jadro 7x7 to tania,
  //    ale zaskakujaco przekonujaca aproksymacja sky occlusion.
  const amb=new Float32Array(MW*MH);
  for(let y=0;y<MH;y++) for(let x=0;x<MW;x++){
    if(cell(x,y)!==0) continue;
    let open=0, tot=0;
    for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++){
      const w=1/(1+dx*dx+dy*dy);
      tot+=w; if(cell(x+dx,y+dy)===0) open+=w;
    }
    amb[y*MW+x]=open/tot;
  }

  // 2. ambient nieba - kolor z biomu, sila z otwartosci
  const A=B.ambient, lo=B.ambientMin;
  for(let i=0;i<MW*MH;i++){
    const k = lo + (1-lo)*amb[i];
    LM[i*3]=A[0]*k; LM[i*3+1]=A[1]*k; LM[i*3+2]=A[2]*k;
  }

  // 2b. bez B3 (probkowanie dwuliniowe) granice komorek sa schodkowe -
  //     jedno rozmycie 3x3 zdejmuje 90% problemu
  const tmp=Float32Array.from(LM);
  for(let y=0;y<MH;y++) for(let x=0;x<MW;x++){
    if(cell(x,y)!==0) continue;
    let r=0,g=0,b=0,n=0;
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
      const cx=x+dx, cy=y+dy;
      if(cx<0||cy<0||cx>=MW||cy>=MH||cell(cx,cy)!==0) continue;
      const j=(cy*MW+cx)*3; r+=tmp[j]; g+=tmp[j+1]; b+=tmp[j+2]; n++;
    }
    const i=(y*MW+x)*3;
    LM[i]=r/n; LM[i+1]=g/n; LM[i+2]=b/n;
  }

  // 3. zrodla statyczne w losowych otwartych komorkach
  for(let i=0,put=0; i<400 && put<B.lights; i++){
    const x=1+(rnd()*(MW-2)|0), y=1+(rnd()*(MH-2)|0);
    if(cell(x,y)!==0) continue;
    if(amb[y*MW+x] > 0.75) continue;     // swiatla maja sens w gaszczu, nie na polanie
    addStaticLight(x+0.5, y+0.5, B.lightCol, B.lightRad);
    put++;
  }
}

function addStaticLight(lx,ly,col,rad){
  const x0=Math.max(0,(lx-rad)|0), x1=Math.min(MW-1,(lx+rad)|0);
  const y0=Math.max(0,(ly-rad)|0), y1=Math.min(MH-1,(ly+rad)|0);
  for(let cy=y0;cy<=y1;cy++) for(let cx=x0;cx<=x1;cx++){
    if(cell(cx,cy)!==0) continue;
    const d=Math.hypot(cx+0.5-lx, cy+0.5-ly);
    if(d>rad) continue;
    if(!losClear(lx,ly,cx+0.5,cy+0.5)) continue;
    const f=(1-d/rad)*(1-d/rad);
    const i=(cy*MW+cx)*3;
    LM[i]+=col[0]*f; LM[i+1]+=col[1]*f; LM[i+2]+=col[2]*f;
  }
}

// Odczyt: statyka + swiatla dynamiczne. Wolane raz na kolumne / raz na sprite.
function lightAt(px,py,out){
  const cx=px|0, cy=py|0;
  if(!LM || px<0 || py<0 || cx>=MW || cy>=MH){ out[0]=out[1]=out[2]=1; }
  else {
    const i=(cy*MW+cx)*3;
    out[0]=LM[i]; out[1]=LM[i+1]; out[2]=LM[i+2];
  }
  for(let i=0;i<DL.length;i++){
    const L=DL[i];
    const dx=px-L.x, dy=py-L.y, d2=dx*dx+dy*dy;
    if(d2 > L.rad*L.rad) continue;
    const f=1-Math.sqrt(d2)/L.rad;
    const k=f*f*(L.t/L.life);          // kwadratowy spadek + wygasanie w czasie
    out[0]+=L.c[0]*k; out[1]+=L.c[1]*k; out[2]+=L.c[2]*k;
  }
}

/* ---------- B7: kierunkowe swiatlo ksiezyca ----------
   0:+X  1:-X  2:+Y  3:-Y - normalna sciany wskazuje NA gracza. */
const FACE_N=[[1,0],[-1,0],[0,1],[0,-1]];
const faceK=new Float32Array([1,1,1,1]);
function updateFaceLight(B){
  for(let i=0;i<4;i++){
    const d = FACE_N[i][0]*B.moonDir[0] + FACE_N[i][1]*B.moonDir[1];
    faceK[i] = 1 + d*B.moonStr;
  }
}
