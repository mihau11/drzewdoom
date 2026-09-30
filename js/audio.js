"use strict";
// dźwięk: WebAudio, efekty SFX

/* ============================================================
   DŹWIĘK
   ============================================================ */
let AC=null, master=null, muted=false, windGain=null, droneGain=null;
function audioInit(){
  if(AC) return;
  AC = new (window.AudioContext||window.webkitAudioContext)();
  master = AC.createGain(); master.gain.value=muted?0:opt.vol; master.connect(AC.destination);
  // wiatr w tle
  const b = AC.createBufferSource(); b.buffer = noiseBuf(); b.loop=true;
  const f = AC.createBiquadFilter(); f.type='lowpass'; f.frequency.value=420; f.Q.value=0.6;
  windGain = AC.createGain(); windGain.gain.value=0.09;
  b.connect(f); f.connect(windGain); windGain.connect(master); b.start();
  const lfo=AC.createOscillator(), lg=AC.createGain();
  lfo.frequency.value=0.13; lg.gain.value=0.05; lfo.connect(lg); lg.connect(windGain.gain); lfo.start();
  // niskie dudnienie - podkrecane w update(), gdy drzewa sa blisko
  const dosc=AC.createOscillator(); dosc.type='sawtooth'; dosc.frequency.value=48;
  const df=AC.createBiquadFilter(); df.type='lowpass'; df.frequency.value=170; df.Q.value=0.7;
  droneGain=AC.createGain(); droneGain.gain.value=0;
  dosc.connect(df); df.connect(droneGain); droneGain.connect(master); dosc.start();
  const dl=AC.createOscillator(), dlg=AC.createGain();
  dl.frequency.value=0.07; dlg.gain.value=7; dl.connect(dlg); dlg.connect(dosc.frequency); dl.start();
}
let _nb=null;
function noiseBuf(){
  if(_nb) return _nb;
  const len=AC.sampleRate*3, b=AC.createBuffer(1,len,AC.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
  _nb=b; return b;
}
function env(node, vol, atk, dec){
  const g=AC.createGain(); const t=AC.currentTime;
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(vol,t+atk);
  g.gain.exponentialRampToValueAtTime(0.0001,t+atk+dec);
  node.connect(g); g.connect(master); return g;
}
function sNoise(vol,atk,dec,type,f0,f1,q){
  if(!AC||muted) return;
  const s=AC.createBufferSource(); s.buffer=noiseBuf();
  const bf=AC.createBiquadFilter(); bf.type=type||'lowpass'; bf.Q.value=q||1;
  const t=AC.currentTime;
  bf.frequency.setValueAtTime(f0,t); bf.frequency.exponentialRampToValueAtTime(Math.max(40,f1),t+atk+dec);
  s.connect(bf); env(bf,vol,atk,dec); s.start(t, Math.random()*2); s.stop(t+atk+dec+0.05);
}
// `delay` planuje dźwięk w zegarze WebAudio zamiast setTimeout — nie rozjeżdża
// się z pauzą i nie zostawia wiszących timerów po restarcie gry
function sTone(vol,atk,dec,wave,f0,f1,delay){
  if(!AC||muted) return;
  const o=AC.createOscillator(); o.type=wave;
  const t=AC.currentTime+(delay||0);
  o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+atk+dec);
  envAt(o,vol,atk,dec,t); o.start(t); o.stop(t+atk+dec+0.05);
}
function envAt(node, vol, atk, dec, t){
  const g=AC.createGain();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(vol,t+atk);
  g.gain.exponentialRampToValueAtTime(0.0001,t+atk+dec);
  node.connect(g); g.connect(master); return g;
}
const SFX = {
  shotgun(){ sNoise(.55,.005,.35,'lowpass',3800,180,1); sTone(.4,.005,.25,'square',150,40); },
  chain(){   sNoise(.22,.002,.07,'bandpass',1800,900,4); sTone(.12,.002,.05,'square',220,90); },
  axe(){     sNoise(.18,.03,.16,'bandpass',900,3200,2); },
  chop(){    sNoise(.35,.004,.18,'lowpass',900,120,1); sTone(.2,.004,.12,'triangle',90,45); },
  hit(){     sNoise(.16,.003,.07,'highpass',1200,2600,1); },
  groan(){   sTone(.14,.15,1.1,'sawtooth',85,42); sNoise(.07,.2,.9,'lowpass',300,120,1); },
  hurt(){    sTone(.3,.01,.35,'sawtooth',320,90); sNoise(.2,.01,.2,'bandpass',700,220,1); },
  die(){     sTone(.3,.02,1.4,'sawtooth',180,35); sNoise(.25,.05,1.2,'lowpass',700,90,1); },
  fall(){    sNoise(.3,.05,.7,'lowpass',1600,150,1); sTone(.15,.1,.6,'triangle',120,50); },
  pick(){    sTone(.22,.01,.1,'square',660,660); sTone(.22,.01,.14,'square',990,990,0.07); },
  empty(){   sTone(.12,.002,.05,'square',180,120); },
  wave(){    sTone(.2,.02,.5,'sawtooth',110,220); sTone(.2,.02,.8,'sawtooth',165,330,0.18); },
  swap(){    sTone(.12,.005,.06,'square',400,700); },
  reload(){  sTone(.16,.004,.06,'square',300,180); sTone(.18,.004,.08,'square',520,260,0.09); },
  root(){    sNoise(.28,.06,.5,'lowpass',700,90,1); sTone(.18,.05,.45,'triangle',70,38); },
  flame(){   sNoise(.10,.012,.16,'bandpass',700,1700,1.2); sNoise(.06,.01,.22,'lowpass',320,140,1); },
  boom(){    sNoise(.55,.004,.6,'lowpass',1500,55,1); sTone(.38,.01,.55,'sawtooth',130,28); },
  fuse(){    sTone(.07,.003,.05,'square',1300,950); },
  step(){    sNoise(.05,.004,.08,'lowpass',360+Math.random()*180,140,1); },
  breath(){  sNoise(.11,.07,.32,'bandpass',420,250,1.4); },
  combo(){   sTone(.13,.005,.08,'square',740,1180); },
};
