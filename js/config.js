"use strict";
// opcje gracza, canvas, bufory ekranu, mgła

/* ============================================================
   DRZEWODOOM — raycasterowy klon Dooma, w którym gonią Cię drzewa

   WARIANT „MIESZANKA” (wg remont-rendera.html): P0 licznik renderu, A2 szum fBm,
   A3 mipmapy, B1★ światło na ścianach i sprite'ach, B2 statyczna lightmapa,
   B4 światła dynamiczne, B5 kolor światła, B7 kierunkowy księżyc, B10 cień kontaktowy.
   Zero zależności. Skrypty ładuje index.html w ustalonej kolejności
   (wspólny zasięg globalny, bez modułów ES).
   ============================================================ */

/* ---------- opcje gracza (czułość, FOV, rozdzielczość, głośność) ---------- */
function clampNum(v,a,b,d){ v=+v; return isFinite(v) ? (v<a?a:v>b?b:v) : d; }
const RES = [[320,180],[480,270],[640,360]];
const OPT_KEY = 'drzewodoom.opt';
let opt = { sens:1, fov:1, res:1, vol:0.5 };
try{
  const raw = localStorage.getItem(OPT_KEY);
  if(raw){ const o=JSON.parse(raw)||{};
    opt = { sens:clampNum(o.sens,0.3,2.5,1), fov:clampNum(o.fov,0.8,1.4,1),
            res:Math.min(RES.length-1, Math.max(0, o.res|0)), vol:clampNum(o.vol,0,1,0.5) }; }
}catch(err){ /* prywatne okno — gramy na domyślnych */ }
function saveOpt(){ try{ localStorage.setItem(OPT_KEY, JSON.stringify(opt)); }catch(err){} }

let W = RES[opt.res][0], H = RES[opt.res][1];
let PLANE = 0.66*opt.fov;                    // połowa szerokości płaszczyzny rzutu
const cv  = document.getElementById('cv');
const ctx = cv.getContext('2d', { alpha:false });

// Bufory zależą od rozdzielczości, więc są zmienne i przydzielane od nowa
// przy każdej zmianie w opcjach (applyRes()).
let img, buf, zbuf, vign=null;
function allocBuffers(){
  cv.width = W; cv.height = H;
  ctx.imageSmoothingEnabled = false;
  img  = ctx.createImageData(W, H);
  buf  = new Uint32Array(img.data.buffer);
  zbuf = new Float32Array(W);
  vign = null;                               // winieta ma rozmiar ekranu
}
allocBuffers();

const mini = document.getElementById('mini');
const mctx = mini.getContext('2d');

// Mgła i jej zasięg zmieniają się wraz z biomem, a kolor mgły jest wpalany
// w poziomy przyciemnienia tekstur — dlatego przy zmianie poziomu przebudowujemy
// cały zestaw grafik (patrz rebuildArt()).
let MAXFOG = 13.5;                   // dystans całkowitego zaniku we mgle
let FOG = [10, 15, 22];              // kolor mgły
