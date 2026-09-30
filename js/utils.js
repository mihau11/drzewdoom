"use strict";
// narzędzia: RNG (mulberry32), clamp/lerp, szum proceduralny

/* ---------- narzędzia ---------- */
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0;
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296; }; }
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp =(a,b,t)=>a+(b-a)*t;

/* ---------- A2: szum proceduralny (kafelkujacy) ----------
   Jedno zrodlo ziarna dla kory, kamienia i trawy. `per` to liczba komorek
   siatki na cala teksture - krata zawija sie mod `per`, wiec kafel nie ma szwu. */
function hash2(x,y,seed){
  let h = Math.imul(x,374761393) + Math.imul(y,668265263) + Math.imul(seed,1274126177);
  h = Math.imul(h ^ (h>>>13), 1274126177);
  return ((h ^ (h>>>16))>>>0) / 4294967296;
}
const smoothT = t => t*t*(3-2*t);
function vnoise(u,v,per,seed){
  const x=u*per, y=v*per;
  const xi=Math.floor(x), yi=Math.floor(y);
  const xf=smoothT(x-xi), yf=smoothT(y-yi);
  const x0=((xi%per)+per)%per, y0=((yi%per)+per)%per;
  const x1=(x0+1)%per,        y1=(y0+1)%per;
  return lerp(lerp(hash2(x0,y0,seed), hash2(x1,y0,seed), xf),
              lerp(hash2(x0,y1,seed), hash2(x1,y1,seed), xf), yf);
}
// fBm: kazda kolejna oktawa dwa razy gestsza i dwa razy cichsza
function fbm(u,v,base,seed,oct){
  let s=0, amp=0.5, norm=0, f=base;
  for(let o=0;o<oct;o++){
    s += vnoise(u,v,f,seed+o*131)*amp;
    norm += amp; amp *= 0.5; f *= 2;
  }
  return s/norm;
}
function hexRGB(h){ const v=parseInt(h.slice(1),16); return [(v>>16)&255,(v>>8)&255,v&255]; }
const TEXN = 64;
