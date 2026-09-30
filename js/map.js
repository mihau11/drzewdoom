"use strict";
// mapa: układ bazowy, generator map, największy region

/* ============================================================
   MAPA
   ============================================================ */
const RAW = [
 "################################",
 "#..............................#",
 "#..BBB......MMM.........BB.....#",
 "#..B..........M.........BB.....#",
 "#..B.......B..M................#",
 "#..........B..........MMMM.....#",
 "#....MM....B..........M..M.....#",
 "#....MM...............M..M.....#",
 "#..............BBB.............#",
 "#....B...........B......BB.....#",
 "#....B...........B......BB.....#",
 "#....B.........................#",
 "#..........MMMM.....B..........#",
 "#..........M..M.....B..........#",
 "#..BB......M..M.....B......M...#",
 "#..BB......................M...#",
 "#..........................M...#",
 "#.....MMM......BB..............#",
 "#.......M......BB.......BBB....#",
 "#.......M.................B....#",
 "#.........B...............B....#",
 "#....B....B....MM..............#",
 "#....B.........MM.....B..B.....#",
 "#....B................B..B.....#",
 "#.............BB...............#",
 "#....MMMM.....BB......MM.......#",
 "#.......M.............MM.......#",
 "#.......M......................#",
 "#..BB.......B........BBB.......#",
 "#..BB.......B..................#",
 "#..............................#",
 "################################",
];
let map = [], MW = 0, MH = 0;
const cell = (x,y)=> (x<0||y<0||x>=MW||y>=MH) ? 1 : map[y|0][x|0];

function applyMap(g){ map = g.m; MW = g.w; MH = g.h; }

// Poziom 1 to ręcznie ułożona mapa z RAW — znajomy start przed proceduralnymi.
function mapFromRAW(){
  const h = RAW.length, w = Math.max(...RAW.map(r=>r.length));
  const m = [];
  for(let y=0;y<h;y++){
    const row = new Uint8Array(w);
    for(let x=0;x<w;x++){
      const c = RAW[y][x] || '.';
      let v = 0;
      if(c==='#') v=1; else if(c==='B') v=2; else if(c==='M') v=3;
      if(x===0||y===0||x===w-1||y===h-1) v=1;   // zawsze domknięta granica
      row[x]=v;
    }
    m.push(row);
  }
  return { m, w, h };
}

/* ---------- generator map ---------- */
// Rozrzuca kępy w duchu ręcznej mapy: bloki, żywopłoty, puste w środku
// kwadraty i pojedyncze drzewa. Gęstość rośnie z poziomem.
function genMap(seed, level){
  const rnd = mulberry32(seed);
  const w = 32 + (rnd()*7|0), h = 32 + (rnd()*7|0);
  const m = [];
  for(let y=0;y<h;y++) m.push(new Uint8Array(w));
  for(let x=0;x<w;x++){ m[0][x]=1; m[h-1][x]=1; }
  for(let y=0;y<h;y++){ m[y][0]=1; m[y][w-1]=1; }
  const set=(x,y,v)=>{ if(x>0&&y>0&&x<w-1&&y<h-1) m[y][x]=v; };

  const density = Math.min(0.115, 0.060 + (level-1)*0.006);
  const clumps  = Math.round(w*h*density/3);
  for(let i=0;i<clumps;i++){
    const x = 1+(rnd()*(w-2)|0), y = 1+(rnd()*(h-2)|0);
    const mat = rnd()<0.55 ? 2 : (rnd()<0.55 ? 1 : 3);
    const shape = rnd();
    if(shape<0.28){                       // zwarty blok
      const bw=1+(rnd()*3|0), bh=1+(rnd()*3|0);
      for(let a=0;a<bw;a++) for(let b=0;b<bh;b++) set(x+a,y+b,mat);
    } else if(shape<0.55){                // żywopłot
      const len=2+(rnd()*5|0), hor=rnd()<0.5;
      for(let a=0;a<len;a++) set(x+(hor?a:0), y+(hor?0:a), mat);
    } else if(shape<0.78){                // pusty w środku kwadrat — jak MMMM w oryginale
      const s=3+(rnd()*2|0);
      for(let a=0;a<s;a++){ set(x+a,y,mat); set(x+a,y+s-1,mat); set(x,y+a,mat); set(x+s-1,y+a,mat); }
    } else {                              // kępa
      set(x,y,mat);
      if(rnd()<0.5) set(x+1,y,mat);
      if(rnd()<0.5) set(x,y+1,mat);
      if(rnd()<0.25) set(x+1,y+1,mat);
    }
  }
  return { m, w, h };
}

// Zamurowuje wszystkie obszary poza największym spójnym — inaczej wrogowie
// zespawnowani w odciętej kieszeni nigdy nie dojdą i fala nigdy się nie skończy.
// Sąsiedztwo 4-kierunkowe, bo tryMove przesuwa się osobno po osiach:
// przejście „po skosie" nie istnieje.
function largestRegion(m,w,h){
  const seen = new Uint8Array(w*h);
  const regions = [];
  let bestSize = 0, best = null;
  const stack = [];
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
    if(m[y][x]!==0 || seen[y*w+x]) continue;
    stack.length=0; stack.push(x,y); seen[y*w+x]=1;
    const reg=[];
    while(stack.length){
      const cy=stack.pop(), cx=stack.pop();
      reg.push(cy*w+cx);
      if(cx>1     && m[cy][cx-1]===0 && !seen[cy*w+cx-1]){ seen[cy*w+cx-1]=1; stack.push(cx-1,cy); }
      if(cx<w-2   && m[cy][cx+1]===0 && !seen[cy*w+cx+1]){ seen[cy*w+cx+1]=1; stack.push(cx+1,cy); }
      if(cy>1     && m[cy-1][cx]===0 && !seen[(cy-1)*w+cx]){ seen[(cy-1)*w+cx]=1; stack.push(cx,cy-1); }
      if(cy<h-2   && m[cy+1][cx]===0 && !seen[(cy+1)*w+cx]){ seen[(cy+1)*w+cx]=1; stack.push(cx,cy+1); }
    }
    regions.push(reg);
    if(reg.length>bestSize){ bestSize=reg.length; best=reg; }
  }
  for(const reg of regions){
    if(reg===best) continue;
    for(const idx of reg) m[(idx/w)|0][idx%w] = 1;
  }
  return bestSize;
}

// Powtarza losowanie, aż mapa jest dość otwarta i ma choć jedną polanę 3x3
// (findOpenSpot potrzebuje jej na punkt startowy gracza).
function buildMap(seed, level){
  for(let attempt=0; attempt<60; attempt++){
    const g = genMap(seed + attempt*7919, level);
    const open = largestRegion(g.m, g.w, g.h);
    if(open < g.w*g.h*0.42) continue;
    let has3=false;
    for(let y=2;y<g.h-2 && !has3;y++){
      for(let x=2;x<g.w-2;x++){
        let ok=true;
        for(let oy=-1;oy<=1 && ok;oy++) for(let ox=-1;ox<=1;ox++)
          if(g.m[y+oy][x+ox]!==0){ ok=false; break; }
        if(ok){ has3=true; break; }
      }
    }
    if(has3) return g;
  }
  return mapFromRAW();          // awaryjnie: znana, na pewno grywalna mapa
}
