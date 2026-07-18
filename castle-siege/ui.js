/* ============================================================
   ui.js — DOM interface, input, sound, main loop
   ============================================================ */
'use strict';

/* ================= sound (tiny WebAudio synth) ================= */
const SFX={ctx:null,on:true,last:{}};
function sfxInit(){
  if(SFX.ctx)return;
  try{SFX.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(err){}
}
function tone(f0,f1,dur,type,vol){
  const ctx=SFX.ctx;if(!ctx)return;
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type||'square';
  o.frequency.setValueAtTime(f0,ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),ctx.currentTime+dur);
  g.gain.setValueAtTime(vol,ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+dur);
  o.connect(g);g.connect(ctx.destination);
  o.start();o.stop(ctx.currentTime+dur+0.02);
}
function noiseBurst(dur,vol,freq){
  const ctx=SFX.ctx;if(!ctx)return;
  const n=Math.floor(ctx.sampleRate*dur);
  const buf=ctx.createBuffer(1,n,ctx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  const src=ctx.createBufferSource();src.buffer=buf;
  const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=freq||900;
  const g=ctx.createGain();g.gain.value=vol;
  src.connect(f);f.connect(g);g.connect(ctx.destination);
  src.start();
}
function SFXp(name){
  if(!SFX.on||!SFX.ctx)return;
  const now=performance.now();
  const cd={arrow:90,die:70,coin:100,slash:110,flame:400,frost:120,zap:150}[name]||60;
  if(SFX.last[name]&&now-SFX.last[name]<cd)return;
  SFX.last[name]=now;
  try{
    switch(name){
      case 'arrow': tone(900,500,0.06,'square',0.02);break;
      case 'frost': tone(1200,600,0.09,'sine',0.03);break;
      case 'cannon': noiseBurst(0.18,0.09,500);tone(150,60,0.15,'sine',0.06);break;
      case 'boom': noiseBurst(0.22,0.1,420);tone(120,50,0.18,'sine',0.06);break;
      case 'glob': tone(300,140,0.1,'sine',0.04);break;
      case 'splat': noiseBurst(0.1,0.05,700);break;
      case 'bolt': tone(700,300,0.08,'sawtooth',0.035);break;
      case 'zap': tone(1400,300,0.1,'sawtooth',0.035);noiseBurst(0.05,0.02,3000);break;
      case 'flame': noiseBurst(0.25,0.03,1400);break;
      case 'coin': tone(1000,1400,0.07,'square',0.03);break;
      case 'build': noiseBurst(0.08,0.05,600);tone(300,200,0.08,'square',0.03);break;
      case 'upgrade': tone(500,900,0.12,'square',0.04);tone(750,1300,0.16,'square',0.03);break;
      case 'summon': tone(300,500,0.12,'sawtooth',0.035);break;
      case 'horn': tone(220,330,0.35,'sawtooth',0.05);tone(165,247,0.4,'sawtooth',0.04);break;
      case 'roar': tone(120,60,0.6,'sawtooth',0.08);noiseBurst(0.4,0.05,300);break;
      case 'die': tone(250,100,0.08,'square',0.02);break;
      case 'bossdie': tone(400,50,0.6,'sawtooth',0.08);noiseBurst(0.5,0.08,600);break;
      case 'hurt': tone(200,90,0.25,'square',0.06);break;
      case 'herodie': tone(400,100,0.5,'sine',0.06);break;
      case 'slash': tone(600,350,0.05,'square',0.02);break;
      case 'slam': noiseBurst(0.2,0.08,350);tone(180,70,0.2,'sine',0.06);break;
    }
  }catch(err){}
}

/* ================= UI state ================= */
const UIS={mode:'none',buildType:null,selTower:null,hoverC:-1,hoverR:-1,tab:'towers'};
let started=false;
let canvas,ctx;
const $=id=>document.getElementById(id);

/* ================= boot ================= */
window.addEventListener('DOMContentLoaded',()=>{
  canvas=$('game');ctx=canvas.getContext('2d');
  buildBG();
  buildTowerCards();
  bindHud();
  bindCanvas();
  bindKeys();
  showStart();
  requestAnimationFrame(frame);
  setInterval(bgTick,250);
  setInterval(()=>{if(started&&G&&!G.over)refreshCards();},250);
  document.addEventListener('pointerdown',()=>{sfxInit();if(SFX.ctx&&SFX.ctx.state==='suspended')SFX.ctx.resume();},{passive:true});
});

/* ================= main loop ================= */
let lastF=performance.now();
function frame(now){
  const dt=Math.min(0.1,(now-lastF)/1000);
  lastF=now;
  if(started&&G){
    stepSim(dt);
    drawFrame(ctx,UIS);
    refreshHud();
  }
  requestAnimationFrame(frame);
}
let lastBg=performance.now();
function bgTick(){
  const now=performance.now();
  const dt=Math.min(1,(now-lastBg)/1000);
  lastBg=now;
  if(document.hidden&&started&&G)stepSim(dt);
}

/* ================= overlays ================= */
function showStart(){
  const ov=$('overlay');
  let best=0;try{best=+localStorage.getItem('cs_best')||0;}catch(err){}
  ov.innerHTML=
    '<div class="panel-box start-box">'+
    '<h1>🏰 Castle Siege</h1><h2>Endless Defense</h2>'+
    '<p class="lore">The horde marches on your castle. Raise towers, muster an army, and hold the line — forever, if you can.</p>'+
    (best?'<p class="best">Best run: Wave '+best+'</p>':'')+
    '<div class="btn-row">'+
    (hasSave()?'<button class="big-btn" id="btnContinue">▶ Continue</button>':'')+
    '<button class="big-btn'+(hasSave()?' alt':'')+'" id="btnNew">✦ New Game</button>'+
    '</div>'+
    '<p class="hint-line">Towers auto-fight. Set your army loadout and it auto-resummons — perfect for multitasking.</p>'+
    '</div>';
  ov.style.display='flex';
  $('btnNew').onclick=()=>{clearSave();beginRun(false);};
  const bc=$('btnContinue');
  if(bc)bc.onclick=()=>beginRun(true);
}
function beginRun(cont){
  $('overlay').style.display='none';
  if(!cont||!loadGame())newGame();
  started=true;
  UIS.mode='none';UIS.selTower=null;
  buildArmyCards();buildHeroCard();refreshCards();
  SFXp('horn');
}
function onGameOver(){
  const ov=$('overlay');
  ov.innerHTML=
    '<div class="panel-box start-box">'+
    '<h1>☠ The Castle Has Fallen</h1>'+
    '<p class="lore">You held the line until <b>Wave '+G.wave+'</b>.</p>'+
    '<p class="stats-line">⚔ '+fmt(G.kills)+' enemies slain &nbsp;•&nbsp; 👑 '+G.bossKills+' bosses defeated<br>🪙 '+fmt(G.goldEarned)+' gold earned</p>'+
    '<div class="btn-row"><button class="big-btn" id="btnRetry">⟲ Rise Again</button></div>'+
    '</div>';
  ov.style.display='flex';
  $('btnRetry').onclick=()=>{beginRun(false);};
}
function toggleHelp(){
  const h=$('helpOverlay');
  h.style.display=h.style.display==='flex'?'none':'flex';
}

/* ================= HUD ================= */
function bindHud(){
  $('btnPause').onclick=()=>{G.paused=!G.paused;$('btnPause').textContent=G.paused?'▶':'⏸';};
  for(const s of [1,2,3]){
    $('spd'+s).onclick=()=>{G.speed=s;refreshSpeed();};
  }
  $('btnSound').onclick=()=>{SFX.on=!SFX.on;$('btnSound').textContent=SFX.on?'🔊':'🔇';};
  $('btnHelp').onclick=toggleHelp;
  $('helpOverlay').onclick=e=>{if(e.target.id==='helpOverlay')toggleHelp();};
  $('btnCloseHelp').onclick=toggleHelp;
  $('btnWave').onclick=()=>{
    if(!G.waveActive){
      const bonus=G.autoWave?Math.max(0,Math.round(G.intermission*5)):15;
      startWave(bonus);
    }
  };
  $('btnAuto').onclick=()=>{G.autoWave=!G.autoWave;refreshAuto();};
  for(const t of ['towers','army','hero']){
    $('tab-'+t).onclick=()=>{
      UIS.tab=t;
      for(const x of ['towers','army','hero']){
        $('tab-'+x).classList.toggle('active',x===t);
        $('pane-'+x).style.display=x===t?'block':'none';
      }
    };
  }
  $('btnHeroMove').onclick=()=>{UIS.mode='hero';UIS.selTower=null;setCursorHint('Click the map to send '+HERO_DEF.name);};
  $('btnRally').onclick=()=>{UIS.mode='rally';UIS.selTower=null;setCursorHint('Click near the path to set the army rally point');};
}
function refreshSpeed(){
  for(const s of [1,2,3])$('spd'+s).classList.toggle('active',G.speed===s);
}
function refreshAuto(){
  $('btnAuto').classList.toggle('active',G.autoWave);
  $('btnAuto').textContent='AUTO '+(G.autoWave?'✓':'✗');
}
function setCursorHint(txt){
  $('cursorHint').textContent=txt||'';
  $('cursorHint').style.display=txt?'block':'none';
}
function refreshHud(){
  $('stGold').textContent=fmt(G.gold);
  $('stLives').textContent=G.lives;
  $('stWave').textContent=G.wave;
  $('stPop').textContent=G.troops.length+'/'+popCap(G.wave);
  const btn=$('btnWave');
  if(G.waveActive){
    const remaining=G.spawnQueue.length+G.enemies.length;
    btn.textContent='⚔ '+remaining+' foes';
    btn.disabled=true;
  }else{
    btn.disabled=false;
    if(G.autoWave)btn.textContent='Wave '+G.wave+' in '+Math.ceil(G.intermission)+'s (+'+Math.max(0,Math.round(G.intermission*5))+'g)';
    else btn.textContent='▶ Start Wave '+G.wave+' (+15g)';
  }
  refreshSpeed();refreshAuto();
  $('btnPause').textContent=G.paused?'▶':'⏸';
}

/* ================= tower cards ================= */
function buildTowerCards(){
  const box=$('towerCards');
  box.innerHTML='';
  for(const def of TOWERS){
    const d=document.createElement('div');
    d.className='card tower-card';
    d.id='tc-'+def.id;
    d.innerHTML='<div class="card-icon">'+def.icon+'</div>'+
      '<div class="card-body"><div class="card-name">'+def.name+'</div>'+
      '<div class="card-desc">'+def.desc+'</div></div>'+
      '<div class="card-cost">'+def.cost+'g</div>';
    d.onclick=()=>{
      if(UIS.mode==='build'&&UIS.buildType===def.id){cancelMode();return;}
      UIS.mode='build';UIS.buildType=def.id;UIS.selTower=null;
      document.querySelectorAll('.tower-card').forEach(x=>x.classList.remove('selected'));
      d.classList.add('selected');
      setCursorHint('Click an empty tile to build '+def.name+' — right-click / Esc to cancel');
      hideTowerDetail();
    };
    box.appendChild(d);
  }
}
function cancelMode(){
  UIS.mode='none';UIS.buildType=null;
  document.querySelectorAll('.tower-card').forEach(x=>x.classList.remove('selected'));
  setCursorHint('');
}
function showTowerDetail(t){
  UIS.selTower=t;
  const def=TOWER_BY[t.id],st=towerStat(def,t.lvl);
  const box=$('towerDetail');
  let stats='';
  if(st.dmg)stats+='<span>⚔ '+fmt(st.dmg*t.auraMul)+(st.rate?' × '+st.rate.toFixed(1)+'/s':'')+'</span>';
  if(st.range)stats+='<span>◎ '+Math.round(st.range)+'</span>';
  if(st.splash)stats+='<span>💥 '+Math.round(st.splash)+'</span>';
  if(st.slow)stats+='<span>❄ '+Math.round(st.slow*100)+'%</span>';
  if(st.burn)stats+='<span>🔥 '+fmt(st.burn)+'/s</span>';
  if(st.poison)stats+='<span>☠ '+fmt(st.poison)+'/s ×6</span>';
  if(st.chain)stats+='<span>⚡ '+st.chain+' chains</span>';
  if(st.pierce)stats+='<span>➤ pierce '+st.pierce+'</span>';
  if(st.income)stats+='<span>🪙 +'+st.income+'g /5s</span>';
  if(st.aura)stats+='<span>✨ +'+Math.round(st.aura*100)+'% dmg aura</span>';
  const maxed=t.lvl>=CFG.MAX_TOWER_LVL;
  const upCost=maxed?0:towerUpCost(def,t.lvl);
  box.innerHTML='<div class="td-head">'+def.icon+' '+def.name+' <span class="lvl-badge">Lv '+t.lvl+(maxed?' MAX':'')+'</span></div>'+
    '<div class="td-stats">'+stats+'</div>'+
    '<div class="btn-row">'+
    (maxed?'':'<button class="small-btn" id="btnUp">⬆ Upgrade ('+upCost+'g)</button>')+
    '<button class="small-btn danger" id="btnSell">Sell (+'+Math.round(towerInvested(def,t.lvl)*0.7)+'g)</button>'+
    '</div>';
  box.style.display='block';
  if(!maxed)$('btnUp').onclick=()=>{if(upgradeTower(t))showTowerDetail(t);};
  $('btnSell').onclick=()=>{sellTower(t);hideTowerDetail();UIS.selTower=null;};
}
function hideTowerDetail(){$('towerDetail').style.display='none';}

/* ================= army cards ================= */
function buildArmyCards(){
  const box=$('armyCards');
  box.innerHTML='';
  for(const def of TROOPS){
    const d=document.createElement('div');
    d.className='card troop-card';
    d.id='ac-'+def.id;
    d.innerHTML=
      '<div class="card-icon">'+def.icon+'</div>'+
      '<div class="card-body">'+
      '<div class="card-name">'+def.name+' <span class="lvl-badge" id="al-'+def.id+'"></span></div>'+
      '<div class="card-desc">'+def.desc+'</div>'+
      '<div class="troop-stats" id="as-'+def.id+'"></div>'+
      '</div>'+
      '<div class="troop-ctrl">'+
      '<div class="stepper"><button class="step-btn" id="dec-'+def.id+'">−</button>'+
      '<span class="step-val" id="cnt-'+def.id+'">0</span>'+
      '<button class="step-btn" id="inc-'+def.id+'">+</button></div>'+
      '<button class="small-btn" id="sum-'+def.id+'">Summon</button>'+
      '<button class="small-btn gold" id="upt-'+def.id+'">⬆</button>'+
      '</div>'+
      '<div class="lock-cover" id="lk-'+def.id+'">🔒 Wave '+def.unlock+'</div>';
    box.appendChild(d);
    $('inc-'+def.id).onclick=()=>{G.desired[def.id]=Math.min(20,G.desired[def.id]+1);refreshCards();};
    $('dec-'+def.id).onclick=()=>{G.desired[def.id]=Math.max(0,G.desired[def.id]-1);refreshCards();};
    $('sum-'+def.id).onclick=()=>{summonTroop(def.id,false);refreshCards();};
    $('upt-'+def.id).onclick=()=>{upgradeTroopType(def.id);refreshCards();};
  }
}
function buildHeroCard(){
  const box=$('pane-hero');
  // static part built once in HTML; dynamic filled in refresh
  refreshHeroCard();
}
function refreshHeroCard(){
  if(!G)return;
  const st=heroStat(G.heroLvl);
  const h=G.hero;
  $('heroLvl').textContent='Lv '+G.heroLvl;
  $('heroStats').innerHTML=
    '<span>⚔ '+fmt(st.dmg)+' × '+(1/st.rate).toFixed(1)+'/s</span>'+
    '<span>❤ '+(h&&!h.dead?fmt(h.hp):'0')+' / '+fmt(st.hp)+'</span>'+
    '<span>💥 Slam '+fmt(st.slamDmg)+'</span>';
  const cost=heroUpCost(G.heroLvl);
  $('btnHeroUp').textContent='⬆ Train ('+fmt(cost)+'g)';
  $('btnHeroUp').disabled=G.gold<cost;
  if(h&&h.dead){
    $('heroStatus').textContent='☠ Respawning in '+Math.ceil(h.respawnT)+'s…';
    $('heroStatus').style.display='block';
  }else $('heroStatus').style.display='none';
  const tier=Math.min(4,Math.floor((G.heroLvl-1)/5));
  $('heroTier').textContent=['Squire’s Plate','Knight’s Steel','Gilded Valor','Emerald Aegis','Mythic Champion'][tier];
}
function refreshCards(){
  if(!G)return;
  /* towers affordability */
  for(const def of TOWERS){
    const el=$('tc-'+def.id);
    if(el)el.classList.toggle('cant',G.gold<def.cost);
  }
  /* troops */
  for(const def of TROOPS){
    const locked=def.unlock>G.wave;
    const lk=$('lk-'+def.id);
    if(lk)lk.style.display=locked?'flex':'none';
    if(locked)continue;
    const lvl=G.troopLvl[def.id],st=troopStat(def.id,lvl);
    $('al-'+def.id).textContent='Lv '+(lvl+1);
    $('cnt-'+def.id).textContent=troopsAlive(def.id)+'/'+G.desired[def.id];
    const stats=def.heal?('💚 '+fmt(st.heal)+'/s'):('⚔ '+fmt(st.dmg)+' ❤ '+fmt(st.hp));
    $('as-'+def.id).textContent=stats+' • '+st.cost+'g';
    $('sum-'+def.id).disabled=G.gold<st.cost||G.troops.length>=popCap(G.wave);
    const maxed=lvl>=CFG.MAX_TROOP_LVL;
    const uc=maxed?0:troopUpCost(def.id,lvl);
    $('upt-'+def.id).textContent=maxed?'MAX':'⬆'+fmt(uc);
    $('upt-'+def.id).disabled=maxed||G.gold<uc;
  }
  refreshHeroCard();
  if(UIS.selTower&&G.towers.includes(UIS.selTower)&&$('towerDetail').style.display==='block'){
    /* keep sell/upgrade costs fresh only when gold state might change buttons */
    const def=TOWER_BY[UIS.selTower.id];
    const up=$('btnUp');
    if(up)up.disabled=G.gold<towerUpCost(def,UIS.selTower.lvl);
  }
}
function onWaveEnd(){refreshCards();}

/* ================= canvas input ================= */
function canvasPos(ev){
  const r=canvas.getBoundingClientRect();
  return {x:(ev.clientX-r.left)*(CFG.W/r.width),y:(ev.clientY-r.top)*(CFG.H/r.height)};
}
function bindCanvas(){
  canvas.addEventListener('mousemove',ev=>{
    const p=canvasPos(ev);
    UIS.hoverC=Math.floor(p.x/CFG.CELL);
    UIS.hoverR=Math.floor(p.y/CFG.CELL);
  });
  canvas.addEventListener('mouseleave',()=>{UIS.hoverC=-1;UIS.hoverR=-1;});
  canvas.addEventListener('click',ev=>{
    if(!started||!G||G.over)return;
    const p=canvasPos(ev);
    const c=Math.floor(p.x/CFG.CELL),r=Math.floor(p.y/CFG.CELL);
    if(UIS.mode==='build'){
      if(placeTower(UIS.buildType,c,r)){
        if(!ev.shiftKey)cancelMode();
        else if(G.gold<TOWER_BY[UIS.buildType].cost)cancelMode();
      }
      return;
    }
    if(UIS.mode==='hero'){moveHeroTo(p.x,p.y);UIS.mode='none';setCursorHint('');return;}
    if(UIS.mode==='rally'){
      G.rallyD=clamp(nearestPathD(p.x,p.y),40,PATH.total-60);
      addFx({kind:'flag',x:p.x,y:p.y,life:1,col:'#5aa8e0'});
      UIS.mode='none';setCursorHint('');return;
    }
    /* select tower */
    const t=G.towers.find(t=>t.c===c&&t.r===r);
    if(t){UIS.selTower=t;showTowerDetail(t);}
    else{UIS.selTower=null;hideTowerDetail();}
  });
  canvas.addEventListener('contextmenu',ev=>{
    ev.preventDefault();
    cancelMode();
    UIS.mode='none';UIS.selTower=null;hideTowerDetail();setCursorHint('');
  });
}
function bindKeys(){
  window.addEventListener('keydown',ev=>{
    if(!started||!G)return;
    if(ev.key==='Escape'){cancelMode();UIS.mode='none';UIS.selTower=null;hideTowerDetail();setCursorHint('');}
    else if(ev.key===' '){ev.preventDefault();G.paused=!G.paused;}
    else if(ev.key==='f'||ev.key==='F'){G.speed=G.speed>=3?1:G.speed+1;}
    else if(ev.key==='h'||ev.key==='H'){UIS.mode='hero';setCursorHint('Click the map to send '+HERO_DEF.name);}
    else if(ev.key==='r'||ev.key==='R'){UIS.mode='rally';setCursorHint('Click near the path to set the army rally point');}
    else if(ev.key>='1'&&ev.key<='9'){
      const def=TOWERS[+ev.key-1];
      if(def){
        UIS.mode='build';UIS.buildType=def.id;
        document.querySelectorAll('.tower-card').forEach(x=>x.classList.remove('selected'));
        const el=$('tc-'+def.id);if(el)el.classList.add('selected');
        setCursorHint('Click an empty tile to build '+def.name+' (Shift-click = build several)');
      }
    }
  });
}
