"use strict";
// aktualizacja świata w każdej klatce

/* ============================================================
   AKTUALIZACJA
   ============================================================ */
function update(dt){
  // --- gracz ---
  if(!P.dead){
    const dirX=Math.cos(P.a), dirY=Math.sin(P.a);
    let mx=0,my=0;
    if(keys.KeyW||keys.ArrowUp){ mx+=dirX; my+=dirY; }
    if(keys.KeyS||keys.ArrowDown){ mx-=dirX; my-=dirY; }
    if(keys.KeyA){ mx+=dirY; my-=dirX; }
    if(keys.KeyD){ mx-=dirY; my+=dirX; }
    if(keys.ArrowLeft) P.a-=2.4*dt;
    if(keys.ArrowRight) P.a+=2.4*dt;
    if(keys.KeyQ) P.a-=2.4*dt;
    if(keys.KeyE) P.a+=2.4*dt;

    const len=Math.hypot(mx,my);
    // Kondycja: bieg kosztuje i regeneruje się po chwili bez biegu. Bez tego
    // „trzymaj Shift i nigdy nie walcz" była strategią bez wady.
    const wantRun = (keys.ShiftLeft||keys.ShiftRight) && len>0 && P.stam>0.02;
    if(wantRun){
      P.stam = Math.max(0, P.stam - dt);
      P.stamCd = 0.9;
      if(P.stam<=0 && !P.puff){ P.puff=true; SFX.breath(); message('BRAK ODDECHU',1); }
    } else {
      P.stamCd = Math.max(0, P.stamCd - dt);
      if(P.stamCd<=0){
        P.stam = Math.min(P.maxStam, P.stam + dt*(len>0?0.7:1.3));
        if(P.stam > P.maxStam*0.4) P.puff=false;
      }
    }
    const run = wantRun?1.55:1;
    const spd = 2.6*run;
    if(len>0){
      mx/=len; my/=len;
      tryMove(P, mx*spd*dt, my*spd*dt, 0.28, freeForPlayer);
      bobT += dt*(9*run);
      // krok na każdym półokresie kołysania kamery
      const ph = Math.floor(bobT/Math.PI);
      if(ph!==stepPhase){ stepPhase=ph; SFX.step(); }
    } else { bobT += dt*1.5; stepPhase = Math.floor(bobT/Math.PI); }
    // gdyby gracz kiedykolwiek znalazł się w geometrii — wypchnij, nie blokuj
    if(!freeCell(P.x,P.y,0.28)) unstick(P,0.28,dt);

    P.pitch *= Math.pow(0.02, dt);                 // powolny powrót do poziomu

    // sklepowa FOTOSYNTEZA: kapie powoli, nigdy nie zastąpi żywicy z lasu
    if(save.up.regen>0 && P.hp<P.maxhp) P.hp = Math.min(P.maxhp, P.hp + save.up.regen*0.5*dt);

    // strzał
    // nie niżej niż -dt: nadwyżka przechodzi na następny strzał, ale po przerwie
    // w strzelaniu nie zbiera się zapas na serię
    P.cd=Math.max(P.cd-dt,-dt); P.fireT=Math.max(0,P.fireT-dt); P.kickT=Math.max(0,P.kickT-dt*3.5);
    P.iframe=Math.max(0,P.iframe-dt);

    // zamach siekiery rozwiązuje się TUTAJ, w pętli gry — nie w setTimeout.
    // Dzięki temu pauza go wstrzymuje, a cel jest szukany w chwili trafienia.
    if(P.swingT>0){
      P.swingT-=dt;
      if(P.swingT<=0){ P.swingT=0; resolveSwing(); }
    }

    // przeładowanie dubeltówki
    if(P.reloadT>0){
      P.reloadT-=dt;
      if(P.reloadT<=0){
        P.reloadT=0;
        const need = WEAPONS[W_SHOTGUN].mag - P.mag;
        const take = Math.min(need, P.shells);
        P.mag += take; P.shells -= take;
        SFX.reload();
        updateHUD();
      }
    }

    // pętla: przy 1800/min kosiarka musi oddać 2+ strzały na klatkę (60 Hz)
    if(WEAPONS[P.w].semi){
      // półautomat: jeden strzał na każde wciśnięcie, bez przerwy między strzałami
      for(; fireClicks>0 && P.cd<=0 && P.reloadT<=0 && !P.dead; fireClicks--) fire();
    } else {
      for(let n=0; n<8 && (keys.Mouse0||keys.Space) && P.cd<=0 && P.reloadT<=0 && !P.dead; n++) fire();
    }
    fireClicks = 0;                                  // kliknięcia w trakcie przeładowania przepadają
    if(keys.KeyR && P.w===W_SHOTGUN && P.reloadT<=0 && P.mag<WEAPONS[W_SHOTGUN].mag && P.shells>0) startReload();
  }

  // --- B4: swiatla dynamiczne ---
  for(let i=DL.length-1;i>=0;i--){
    DL[i].t-=dt;
    if(DL[i].t<=0) DL.splice(i,1);
  }
  // lecace szyszki swieca przez caly lot - odswiezamy pozycje co klatke
  for(const sh of shots) addLight(sh.x, sh.y, [0.55,0.30,0.08], 2.6, dt*1.05);

  flashLight = Math.max(0, flashLight - dt*38);
  hitT       = Math.max(0, hitT - dt);
  if(streakT>0){ streakT-=dt; if(streakT<=0) streak=0; }   // seria wygasa
  hurtFlash  = Math.max(0, hurtFlash - dt*1.9);
  camShake   = Math.max(0, camShake - dt*7);
  levelFade  = Math.max(0, levelFade - dt*0.85);   // rozjaśnienie po zmianie lasu

  // --- fale ---
  if(!P.dead){
    if(waveQueue.length===0 && enemies.length===0){
      waveTimer-=dt;
      // startWave() sam ustawia waveTimer — przy zmianie poziomu na przerwę
      // między lasami, normalnie na 0
      if(waveTimer<=0) startWave();
    } else if(waveQueue.length){
      waveTimer-=dt;
      if(waveTimer<=0 && enemies.length<28){
        spawnEnemy(waveQueue.pop());
        waveTimer = waveQueue.length===0 ? 3.4 : Math.max(0.25, 1.1 - wave*0.05);
      }
    }
  }

  // --- wrogowie ---
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i], d=ENEMY_DEF[e.kind];
    if(e.dying>0){
      e.dying-=dt;
      if(e.dying<=0){
        enemies.splice(i,1);
        decals.push({ x:e.x, y:e.y, kind:e.kind });
        if(decals.length>36) decals.shift();
      }
      continue;
    }
    e.flash = Math.max(0, e.flash-dt*9);
    // płonie: obrażenia w czasie dobijają to, co wyszło ze stożka miotacza
    if(e.burn>0){
      e.burn-=dt;
      // POŻAR LASU: co 0.5 s ogień przeskakuje na niepłonące drzewa w promieniu 1.5
      if(wupOpt('flame')==='a'){
        e.spreadT = (e.spreadT||0) - dt;
        if(e.spreadT<=0){
          e.spreadT = 0.5;
          for(const o of enemies){
            if(o===e || o.dying>0 || o.burn>0) continue;
            if(Math.hypot(o.x-e.x, o.y-e.y) < 1.5){ o.burn = WEAPONS[W_FLAME].burn; o.spreadT = 0.5; }
          }
        }
      }
      damage(e, dt*7.5, 'burn');
      if(Math.random()<dt*16) burst(e.x,e.y,0.35+Math.random()*0.9,2,[235,130,35]);
      if(e.dying>0) continue;
    }
    // OGŁUSZENIE z dubeltówki: stoi w miejscu i nie atakuje
    const stunned = e.stun>0;
    if(stunned){ e.stun-=dt; e.anim=0; }
    const dx=P.x-e.x, dy=P.y-e.y;
    const dist=Math.hypot(dx,dy)||1e-4;
    e.anim += dt*(2.4 + e.spd);
    e.groan -= dt;
    if(e.groan<=0 && dist<11){ if(Math.random()<0.5) SFX.groan(); e.groan = 4+Math.random()*9; }

    if(!P.dead){
      const nx=dx/dist, ny=dy/dist;

      // zakorzeniony: gdy podejdzie dostatecznie blisko, wrasta w ziemię
      // i od tej chwili jest przeszkodą, przez którą gracz nie przejdzie
      if(d.roots && !e.rooted && !e.uprooted && dist < d.rootAt && losClear(e.x,e.y,P.x,P.y)){
        e.rooted = true; SFX.root();
        burst(e.x,e.y,0.15,14,[110,90,55]);
      }

      // cichosz stoi jak wryty, dopóki gracz na niego patrzy
      let frozen = false;
      if(d.shy){
        const inView = Math.abs(angDiff(Math.atan2(dy,dx), P.a)) < FOV_HALF;
        frozen = inView && dist < MAXFOG && losClear(e.x,e.y,P.x,P.y);
        e.frozen = frozen;
        if(frozen) e.anim = 0;               // zamiera też animacyjnie
      }

      if(!e.rooted && !frozen && !stunned){
        // separacja od innych drzew
        let sx=0, sy=0;
        for(let j=0;j<enemies.length;j++){
          if(j===i) continue; const o=enemies[j]; if(o.dying>0) continue;
          const ox=e.x-o.x, oy=e.y-o.y, od=Math.hypot(ox,oy);
          const mind=d.r+ENEMY_DEF[o.kind].r;
          if(od>0 && od<mind){ sx+=ox/od*(mind-od); sy+=oy/od*(mind-od); }
        }
        const keep = d.ranged ? 3.2 : 0.75;
        let mvx=0,mvy=0;
        if(dist>keep){ mvx=nx; mvy=ny; }
        else if(d.ranged && dist<keep*0.7){ mvx=-nx*0.5; mvy=-ny*0.5; }
        // trochę bocznego dryfu, żeby nie szły idealnie w linii
        const drift=Math.sin(e.anim*0.7)*0.35;
        mvx += -ny*drift; mvy += nx*drift;
        mvx += sx*2.2; mvy += sy*2.2;
        const ml=Math.hypot(mvx,mvy);
        if(ml>0.001){ tryMove(e, mvx/ml*e.spd*dt, mvy/ml*e.spd*dt, d.r); }
        if(!freeCell(e.x,e.y,d.r)) unstick(e,d.r,dt);
      }

      // pękacz nie bije — tyka coraz szybciej i wybucha przy zetknięciu
      if(d.boom){
        e.tick = (e.tick||0) - dt;
        if(dist<4.5 && e.tick<=0){
          e.tick = Math.max(0.11, dist*0.10);
          SFX.fuse(); e.flash=Math.max(e.flash,0.75);
        }
        if(dist < d.r+0.75){ damage(e, e.hp+1, 'blast'); continue; }
      }

      // atak
      e.atk-=dt;
      if(e.atk<=0 && !frozen && !stunned){
        if(d.ranged && dist<10 && losClear(e.x,e.y,P.x,P.y)){
          e.atk = e.atkCd*(0.8+Math.random()*0.5);
          fireCone(e, nx, ny, dist, e.dmg);
        } else if(!d.ranged && dist < d.r+0.55){
          e.atk = e.atkCd;
          hurtPlayer(e.dmg);
        } else if(d.ranged && dist < d.r+0.6){
          e.atk = e.atkCd;
          hurtPlayer(e.dmg*0.7);
        }
      }
    }
  }

  // --- pociski (szyszki) ---
  for(let i=shots.length-1;i>=0;i--){
    const s=shots[i];
    s.life-=dt;
    const nx=s.x+s.vx*dt, ny=s.y+s.vy*dt;
    s.vz -= SHOT_G*dt;
    const nz=s.z+s.vz*dt;
    if(cell(nx,ny)!==0 || nz<0.04 || s.life<=0){
      burst(s.x,s.y,Math.max(0.1,s.z),8,[120,90,50]); shots.splice(i,1); continue;
    }
    // test przeciągnięty po odcinku klatki + kontrola wysokości: szyszka nie
    // przeskoczy gracza przy niskim FPS i nie trafia, jeśli leci nad głową
    if(!P.dead && nz>0.02 && nz<1.05 &&
       segDist2(s.x,s.y,nx,ny,P.x,P.y) < 0.42*0.42){
      hurtPlayer(s.dmg); burst(nx,ny,nz,10,[150,110,60]); shots.splice(i,1); continue;
    }
    s.x=nx; s.y=ny; s.z=nz;
  }

  // --- cząstki ---
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];
    p.life-=dt;
    if(p.life<=0){ parts.splice(i,1); continue; }
    p.vz -= 3.2*dt;
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt;
    if(p.z<0.02){ p.z=0.02; p.vz*=-0.32; p.vx*=0.6; p.vy*=0.6; }
  }

  // --- unoszące się liczby obrażeń ---
  for(let i=floaters.length-1;i>=0;i--){
    const f=floaters[i];
    f.t+=dt; f.life-=dt;
    if(f.e && f.e.dying<=0){ f.x=f.e.x; f.y=f.e.y; }   // trzyma się drzewa
    f.z += dt*0.5;
    if(f.life<=0) floaters.splice(i,1);
  }

  // --- napięcie w tle: im więcej drzew blisko, tym głośniejszy las ---
  if(AC){
    let near=0;
    for(const e of enemies){
      if(e.dying>0) continue;
      const ddx=e.x-P.x, ddy=e.y-P.y;
      if(ddx*ddx+ddy*ddy < 36) near++;
    }
    threat += (near-threat)*Math.min(1, dt*3);
    if(windGain)  windGain.gain.value  = 0.09 + Math.min(0.11, threat*0.022);
    if(droneGain) droneGain.gain.value = Math.min(0.14, Math.max(0, threat-1)*0.035);
  }

  // --- znajdźki ---
  for(let i=pickups.length-1;i>=0;i--){
    const pk=pickups[i];
    pk.t+=dt;
    pk.life-=dt;
    if(pk.life<=0){ pickups.splice(i,1); continue; }   // nie zaśmiecamy mapy w nieskończoność
    if(Math.hypot(P.x-pk.x,P.y-pk.y)<0.55){
      let taken=false;
      if(pk.kind===0 && P.hp<P.maxhp){ P.hp=Math.min(P.maxhp,P.hp+25); taken=true; message('+25 ŻYWICY',1); }
      else if(pk.kind===1 && P.shells<P.maxShells){ P.shells=Math.min(P.maxShells,P.shells+8); taken=true; message('+8 NABOI',1); }
      else if(pk.kind===2 && P.bullets<P.maxBullets){ P.bullets=Math.min(P.maxBullets,P.bullets+45); taken=true; message('+45 AMUNICJI',1); }
      else if(pk.kind===3 && P.fuel<P.maxFuel){ P.fuel=Math.min(P.maxFuel,P.fuel+40); taken=true; message('+40 PALIWA',1); }
      if(taken){ SFX.pick(); pickups.splice(i,1); updateHUD(); }
    }
  }

  if(msgTimer>0){ msgTimer-=dt; if(msgTimer<=0) document.getElementById('msg').classList.remove('show'); }
  updateHUD();
}
