/* ============================================================
   ui.js — bottom-dock interface, input, audio glue, main loop (v2)
   ============================================================ */
'use strict';

function SFXp(n){try{if(typeof SFX2!=='undefined')SFX2.play(n);}catch(err){}}

const UIS={mode:'none',buildType:null,selTower:null,hoverC:-1,hoverR:-1,hoverX:-1,hoverY:-1,tab:'towers'};
let started=false;
let canvas,ctx;
const $=id=>document.getElementById(id);

function iconCanvas(kind,id,size){
  try{
    if(typeof SpriteLib==='undefined')return null;
    const src=SpriteLib.icon(kind,id);
    if(!src)return null;
    const cv=document.createElement('canvas');
    cv.width=size;cv.height=size;
    cv.getContext('2d').drawImage(src,0,0,size,size);
    cv.className='icon-cv';
    return cv;
  }catch(err){return null;}
}
function iconHtmlInto(el,kind,id,size,fallback){
  const cv=iconCanvas(kind,id,size);
  if(cv){el.innerHTML='';el.appendChild(cv);}
  else el.textContent=fallback;
}

/* ================= boot ================= */
window.addEventListener('DOMContentLoaded',()=>{
  canvas=$('game');ctx=canvas.getContext('2d');
  try{if(typeof SpriteLib!=='undefined')SpriteLib.build();}catch(err){console.warn('SpriteLib.build failed',err);}
  buildTowerCards();
  bindHud();
  bindCanvas();
  bindKeys();
  loadPrefs();
  showMapSelect();
  requestAnimationFrame(frame);
  setInterval(bgTick,250);
  setInterval(()=>{if(started&&G&&!G.over)refreshCards();},300);
  document.addEventListener('pointerdown',()=>{
    try{if(typeof Music!=='undefined')Music.init();}catch(err){}
  },{passive:true});
});
function loadPrefs(){
  try{
    if(localStorage.getItem('cs2_sfx')==='0'&&typeof SFX2!=='undefined')SFX2.setEnabled(false);
    if(localStorage.getItem('cs2_music')==='0'&&typeof Music!=='undefined')Music.setEnabled(false);
    if(localStorage.getItem('cs2_dock')==='0')setDock(false,true);
  }catch(err){}
  refreshAudioBtns();
}

/* ================= main loop ================= */
let lastF=performance.now();
function frame(now){
  const dt=Math.min(0.1,(now-lastF)/1000);
  lastF=now;
  if(started&&G){
    stepSim(dt);
    drawFrame(ctx,UIS);
    refreshHud();
    try{
      if(typeof Music!=='undefined'){
        const boss=G.enemies.some(e=>e.boss);
        Music.setIntensity(G.over?'calm':boss?'boss':(G.waveActive?'battle':'calm'));
        Music.update(dt);
      }
    }catch(err){}
  }
  requestAnimationFrame(frame);
}
let lastBg=performance.now();
function bgTick(){
  const now=performance.now();
  const dt=Math.min(1,(now-lastBg)/1000);
  lastBg=now;
  if(document.hidden&&started&&G){
    stepSim(dt);
    try{if(typeof Music!=='undefined')Music.update(dt);}catch(err){}
  }
}

/* ================= overlays ================= */
function pathPreview(mdef,w,h){
  const cv=document.createElement('canvas');
  cv.width=w;cv.height=h;
  const c=cv.getContext('2d');
  const cols={meadow:['#3f7a38','#2e5c2c'],autumn:['#9a7434','#6e5224'],ashen:['#443f4e','#2b2733']}[mdef.theme];
  const g=c.createLinearGradient(0,0,0,h);
  g.addColorStop(0,cols[0]);g.addColorStop(1,cols[1]);
  c.fillStyle=g;c.fillRect(0,0,w,h);
  const sx=w/CFG.W,sy=h/CFG.H;
  c.lineCap='round';c.lineJoin='round';
  for(const cells of mdef.paths){
    c.strokeStyle='rgba(30,22,14,0.65)';c.lineWidth=7;
    c.beginPath();
    cells.forEach(([pc,pr],i)=>{
      const x=(pc*40+20)*sx,y=(pr*40+20)*sy;
      if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
    });
    c.stroke();
    c.strokeStyle='#c9a768';c.lineWidth=4;c.stroke();
  }
  c.fillStyle='#b4aec4';c.fillRect(w-16,h*0.42,10,h*0.16);
  c.fillStyle='#8d8798';c.fillRect(w-19,h*0.40,16,4);
  return cv;
}
function showMapSelect(){
  started=false;
  const ov=$('overlay');
  const diffCol={Easy:'#6ad06a',Medium:'#e8c93a',Hard:'#e05a5a'};
  let html='<div class="panel-box start-box"><h1>Castle Siege</h1><h2>Endless Defense</h2>'+
    '<p class="lore">Choose your battlefield, commander.</p><div class="map-row">';
  for(const m of MAPS){
    const best=bestWave(m.id);
    html+='<div class="map-card" id="map-'+m.id+'">'+
      '<div class="map-prev" id="mp-'+m.id+'"></div>'+
      '<div class="map-name">'+m.name+'</div>'+
      '<div class="map-diff" style="color:'+diffCol[m.diff]+'">'+m.diff+' • '+m.paths.length+' path'+(m.paths.length>1?'s':'')+'</div>'+
      '<div class="map-desc">'+m.desc+'</div>'+
      (best?'<div class="map-best">Best: Wave '+best+'</div>':'')+
      '<div class="btn-row">'+
      (hasSave(m.id)?'<button class="small-btn" data-cont="'+m.id+'">▶ Continue</button>':'')+
      '<button class="small-btn gold" data-new="'+m.id+'">✦ New</button>'+
      '</div></div>';
  }
  html+='</div><p class="hint-line">Towers auto-fight • your army auto-resummons • progress autosaves every wave.<br>Built for leaving open while you work.</p></div>';
  ov.innerHTML=html;
  ov.style.display='flex';
  for(const m of MAPS){
    $('mp-'+m.id).appendChild(pathPreview(m,240,120));
    const nb=ov.querySelector('[data-new="'+m.id+'"]');
    nb.onclick=()=>{try{localStorage.removeItem('cs2_save_'+m.id);}catch(err){};beginRun(m.id,false);};
    const cb=ov.querySelector('[data-cont="'+m.id+'"]');
    if(cb)cb.onclick=()=>beginRun(m.id,true);
  }
}
function beginRun(mapId,cont){
  $('overlay').style.display='none';
  delete bgCache[mapId];
  if(!cont||!loadGame(mapId))newGame(mapId);
  started=true;
  UIS.mode='none';UIS.selTower=null;
  buildArmyCards();buildHeroCards();buildRelicCards();refreshCards();
  hideTowerDetail();
  SFXp('horn_wave');
}
function onGameOver(){
  const ov=$('overlay');
  ov.innerHTML=
    '<div class="panel-box start-box">'+
    '<h1>☠ The Castle Has Fallen</h1>'+
    '<p class="lore">'+MAP.def.name+' — you held until <b>Wave '+G.wave+'</b>.</p>'+
    '<p class="stats-line">⚔ '+fmt(G.kills)+' slain • 👑 '+G.bossKills+' bosses • 🪙 '+fmt(G.goldEarned)+' earned</p>'+
    '<div class="btn-row">'+
    '<button class="big-btn" id="btnRetry">⟲ Rise Again</button>'+
    '<button class="big-btn alt" id="btnMaps">🗺 Battlefields</button>'+
    '</div></div>';
  ov.style.display='flex';
  $('btnRetry').onclick=()=>beginRun(G.mapId,false);
  $('btnMaps').onclick=showMapSelect;
}
function toggleHelp(){
  const h=$('helpOverlay');
  h.style.display=h.style.display==='flex'?'none':'flex';
}

/* ================= HUD ================= */
function bindHud(){
  $('btnPause').onclick=()=>{if(!G)return;G.paused=!G.paused;};
  for(const s of [1,2,3])$('spd'+s).onclick=()=>{if(G){G.speed=s;}};
  $('btnSfx').onclick=()=>{
    if(typeof SFX2!=='undefined')SFX2.setEnabled(!SFX2.enabled);
    try{localStorage.setItem('cs2_sfx',(typeof SFX2!=='undefined'&&SFX2.enabled)?'1':'0');}catch(err){}
    refreshAudioBtns();
  };
  $('btnMusic').onclick=()=>{
    try{if(typeof Music!=='undefined'){Music.init();Music.setEnabled(!Music.enabled);}}catch(err){}
    try{localStorage.setItem('cs2_music',(typeof Music!=='undefined'&&Music.enabled)?'1':'0');}catch(err){}
    refreshAudioBtns();
  };
  $('btnHelp').onclick=toggleHelp;
  $('btnMenu').onclick=()=>{if(G&&!G.over)saveGame();showMapSelect();};
  $('helpOverlay').onclick=e=>{if(e.target.id==='helpOverlay')toggleHelp();};
  $('btnCloseHelp').onclick=toggleHelp;
  $('btnWave').onclick=()=>{
    if(G&&!G.waveActive){
      const bonus=G.autoWave?Math.max(0,Math.round(G.intermission*5)):15;
      startWave(bonus);
    }
  };
  $('btnAuto').onclick=()=>{if(G)G.autoWave=!G.autoWave;};
  for(const t of ['towers','army','heroes','relics']){
    $('tab-'+t).onclick=()=>{
      UIS.tab=t;
      setDock(true);
      for(const x of ['towers','army','heroes','relics']){
        $('tab-'+x).classList.toggle('active',x===t);
        $('pane-'+x).style.display=x===t?'flex':'none';
      }
      SFXp('ui_tab');
    };
  }
  $('btnDock').onclick=()=>setDock($('dockbody').style.display==='none');
  $('btnRally').onclick=()=>{UIS.mode='rally';UIS.selTower=null;setCursorHint('Click near a road to set that road’s rally point');};
}
function setDock(open,silent){
  $('dockbody').style.display=open?'block':'none';
  $('btnDock').textContent=open?'▼':'▲';
  try{localStorage.setItem('cs2_dock',open?'1':'0');}catch(err){}
  if(!silent)SFXp(open?'ui_open':'ui_close');
}
function refreshAudioBtns(){
  $('btnSfx').classList.toggle('off',!(typeof SFX2!=='undefined'&&SFX2.enabled));
  $('btnMusic').classList.toggle('off',!(typeof Music!=='undefined'&&Music.enabled));
}
function setCursorHint(txt){
  $('cursorHint').textContent=txt||'';
  $('cursorHint').style.display=txt?'block':'none';
}
function refreshHud(){
  $('stGold').textContent=fmt(G.gold);
  $('stLives').textContent=G.lives+'/'+maxLives();
  $('stWave').textContent=G.wave;
  $('stPop').textContent=G.troops.length+'/'+popCap(G.wave);
  const btn=$('btnWave');
  if(G.waveActive){
    btn.textContent='⚔ '+(G.spawnQueue.length+G.enemies.length)+' foes';
    btn.disabled=true;
  }else{
    btn.disabled=false;
    if(G.autoWave)btn.textContent='Wave '+G.wave+' in '+Math.ceil(G.intermission)+'s (+'+Math.max(0,Math.round(G.intermission*5))+'g)';
    else btn.textContent='▶ Wave '+G.wave+' (+15g)';
  }
  for(const s of [1,2,3])$('spd'+s).classList.toggle('active',G.speed===s);
  $('btnAuto').classList.toggle('active',G.autoWave);
  $('btnAuto').textContent='AUTO'+(G.autoWave?' ✓':'');
  $('btnPause').textContent=G.paused?'▶':'⏸';
}

/* ================= tower cards ================= */
function buildTowerCards(){
  const box=$('towerCards');
  box.innerHTML='';
  for(const def of TOWERS){
    const d=document.createElement('div');
    d.className='card';
    d.id='tc-'+def.id;
    d.title=def.desc;
    d.innerHTML='<div class="card-icon" id="ti-'+def.id+'"></div>'+
      '<div class="card-name">'+def.name+'</div>'+
      '<div class="card-cost">'+def.cost+'g</div>';
    d.onclick=()=>{
      if(UIS.mode==='build'&&UIS.buildType===def.id){cancelMode();return;}
      UIS.mode='build';UIS.buildType=def.id;UIS.selTower=null;G.targetMode=null;
      document.querySelectorAll('#towerCards .card').forEach(x=>x.classList.remove('selected'));
      d.classList.add('selected');
      setCursorHint('Click an empty tile to build '+def.name+' — Shift-click builds several, Esc cancels');
      hideTowerDetail();
      SFXp('ui_click');
    };
    box.appendChild(d);
  }
  setTimeout(()=>{
    for(const def of TOWERS)iconHtmlInto($('ti-'+def.id),'tower',def.id,36,'🏰');
  },0);
}
function cancelMode(){
  UIS.mode='none';UIS.buildType=null;
  if(G)G.targetMode=null;
  document.querySelectorAll('#towerCards .card').forEach(x=>x.classList.remove('selected'));
  setCursorHint('');
}
function showTowerDetail(t){
  UIS.selTower=t;
  const def=TOWER_BY[t.id],st=towerStat(def,t.lvl);
  const box=$('towerDetail');
  let stats='';
  const dmul=t.auraMul*(1+relicVal('engineering'));
  if(st.dmg)stats+='<span>⚔ '+fmt(st.dmg*dmul)+(st.rate?' × '+st.rate.toFixed(1)+'/s':'')+'</span>';
  if(st.range)stats+='<span>◎ '+Math.round(st.range)+'</span>';
  if(st.splash)stats+='<span>💥 '+Math.round(st.splash)+'</span>';
  if(st.slow)stats+='<span>❄ '+Math.round(st.slow*100)+'%</span>';
  if(st.burn)stats+='<span>🔥 '+fmt(st.burn)+'/s</span>';
  if(st.poison)stats+='<span>☠ '+fmt(st.poison)+'/s ×6</span>';
  if(st.chain)stats+='<span>⚡ ×'+st.chain+'</span>';
  if(st.pierce)stats+='<span>➤ '+st.pierce+'</span>';
  if(st.income)stats+='<span>🪙 +'+st.income+'g/5s</span>';
  if(st.aura)stats+='<span>✨ +'+Math.round(st.aura*100)+'%</span>';
  const maxed=t.lvl>=CFG.MAX_TOWER_LVL;
  const upCost=maxed?0:towerUpCost(def,t.lvl);
  box.innerHTML='<div class="td-head">'+def.name+' <span class="lvl-badge">Lv '+t.lvl+(maxed?' MAX':'')+'</span>'+
    '<button class="x-btn" id="btnTdClose">✕</button></div>'+
    '<div class="td-stats">'+stats+'</div>'+
    '<div class="btn-row">'+
    (maxed?'':'<button class="small-btn gold" id="btnUp">⬆ Upgrade '+fmt(upCost)+'g</button>')+
    '<button class="small-btn danger" id="btnSell">Sell +'+fmt(Math.round(towerInvested(def,t.lvl)*0.7))+'g</button>'+
    '</div>';
  box.style.display='block';
  if(!maxed)$('btnUp').onclick=()=>{if(upgradeTower(t))showTowerDetail(t);};
  $('btnSell').onclick=()=>{sellTower(t);hideTowerDetail();UIS.selTower=null;};
  $('btnTdClose').onclick=()=>{hideTowerDetail();UIS.selTower=null;};
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
    d.title=def.desc;
    d.innerHTML=
      '<div class="card-icon" id="ai-'+def.id+'"></div>'+
      '<div class="card-name">'+def.name+' <span class="lvl-badge" id="al-'+def.id+'"></span></div>'+
      '<div class="troop-stats" id="as-'+def.id+'"></div>'+
      '<div class="stepper"><button class="step-btn" id="dec-'+def.id+'">−</button>'+
      '<span class="step-val" id="cnt-'+def.id+'">0</span>'+
      '<button class="step-btn" id="inc-'+def.id+'">+</button></div>'+
      '<div class="btn-row tight">'+
      '<button class="small-btn" id="sum-'+def.id+'">+1</button>'+
      '<button class="small-btn gold" id="upt-'+def.id+'">⬆</button>'+
      '</div>'+
      '<div class="lock-cover" id="lk-'+def.id+'">🔒 W'+def.unlock+'</div>';
    box.appendChild(d);
    $('inc-'+def.id).onclick=()=>{G.desired[def.id]=Math.min(24,G.desired[def.id]+1);refreshCards();SFXp('ui_click');};
    $('dec-'+def.id).onclick=()=>{G.desired[def.id]=Math.max(0,G.desired[def.id]-1);refreshCards();SFXp('ui_click');};
    $('sum-'+def.id).onclick=()=>{summonTroop(def.id,false);refreshCards();};
    $('upt-'+def.id).onclick=()=>{upgradeTroopType(def.id);refreshCards();};
  }
  setTimeout(()=>{
    for(const def of TROOPS)iconHtmlInto($('ai-'+def.id),'troop',def.id,36,'⚔️');
  },0);
}

/* ================= hero cards ================= */
function buildHeroCards(){
  const box=$('heroCards');
  box.innerHTML='';
  for(const def of HEROES){
    const d=document.createElement('div');
    d.className='card hero-card';
    d.id='hc-'+def.id;
    d.innerHTML=
      '<div class="card-icon big" id="hi-'+def.id+'"></div>'+
      '<div class="card-name">'+def.name+' <span class="lvl-badge" id="hl-'+def.id+'"></span></div>'+
      '<div class="hero-title">'+def.title+'</div>'+
      '<div class="hero-hp"><div class="hero-hp-fill" id="hhp-'+def.id+'"></div></div>'+
      '<div class="troop-stats" id="hs-'+def.id+'"></div>'+
      '<div class="skill-line" id="hsk-'+def.id+'" title="'+def.skill.desc+'"></div>'+
      '<div class="btn-row tight" id="hb-'+def.id+'"></div>'+
      '<div class="lock-cover" id="hlk-'+def.id+'"></div>';
    box.appendChild(d);
  }
  setTimeout(()=>{
    for(const def of HEROES)iconHtmlInto($('hi-'+def.id),'hero',def.id,44,'🦸');
  },0);
}
function refreshHeroCards(){
  for(const h of G.heroes){
    const def=h.hdef;
    const lock=$('hlk-'+def.id);
    const unlocked=heroUnlocked(h);
    const uw=heroEffUnlock(def);
    if(!unlocked){
      lock.style.display='flex';
      lock.textContent='🔒 Wave '+uw;
      continue;
    }
    lock.style.display='none';
    $('hl-'+def.id).textContent='Lv '+h.lvl;
    const st=heroStat(def,h.lvl);
    $('hs-'+def.id).textContent='⚔ '+fmt(st.dmg)+' • ❤ '+fmt(st.hp);
    const hpF=$('hhp-'+def.id);
    hpF.style.width=(h.recruited?clamp(h.hp/h.maxHp,0,1)*100:0)+'%';
    hpF.style.background=def.col;
    const sk=$('hsk-'+def.id);
    if(h.lvl>=def.skill.unlockLvl)sk.innerHTML='✦ '+def.skill.name+(h.recruited&&!h.dead&&h.skillCd>0?' <span class="cd">'+Math.ceil(h.skillCd)+'s</span>':'');
    else sk.innerHTML='<span class="locked-skill">✦ '+def.skill.name+' at Lv '+def.skill.unlockLvl+'</span>';
    const bb=$('hb-'+def.id);
    if(!h.recruited){
      bb.innerHTML='<button class="small-btn gold" data-rec="'+def.id+'">Recruit '+fmt(def.cost)+'g</button>';
      bb.querySelector('button').onclick=()=>{const hh=G.heroes.find(x=>x.id===def.id);if(recruitHero(hh))refreshCards();};
      bb.querySelector('button').disabled=G.gold<def.cost;
    }else if(h.dead){
      bb.innerHTML='<span class="dead-note">☠ '+Math.ceil(h.respawnT)+'s</span>';
    }else{
      const c=heroUpCost(def,h.lvl);
      bb.innerHTML='<button class="small-btn gold" data-tr="'+def.id+'">⬆ '+fmt(c)+'g</button>'+
        '<button class="small-btn" data-mv="'+def.id+'">🚶 Move</button>';
      const tb=bb.querySelector('[data-tr]');
      tb.onclick=()=>{const hh=G.heroes.find(x=>x.id===def.id);if(upgradeHeroU(hh))refreshCards();};
      tb.disabled=G.gold<c;
      bb.querySelector('[data-mv]').onclick=()=>{
        G.selHero=h;UIS.mode='hero';
        setCursorHint('Click the map to post '+def.name+' there');
      };
    }
  }
}

/* ================= relic cards ================= */
function buildRelicCards(){
  const box=$('relicCards');
  box.innerHTML='';
  for(const def of RELICS){
    const d=document.createElement('div');
    d.className='card relic-card';
    d.id='rc-'+def.id;
    d.title=def.desc;
    d.innerHTML=
      '<div class="card-icon" id="ri-'+def.id+'"></div>'+
      '<div class="card-name">'+def.name+'</div>'+
      '<div class="tier-pips" id="rp-'+def.id+'"></div>'+
      '<div class="troop-stats rdesc">'+def.desc+'</div>'+
      '<button class="small-btn gold" id="rb-'+def.id+'"></button>';
    box.appendChild(d);
    $('rb-'+def.id).onclick=()=>{if(buyRelic(def.id))refreshCards();};
  }
  for(const def of CONSUMABLES){
    const d=document.createElement('div');
    d.className='card relic-card consum';
    d.id='cc-'+def.id;
    d.title=def.desc;
    d.innerHTML=
      '<div class="card-icon" id="ci-'+def.id+'"></div>'+
      '<div class="card-name">'+def.name+' <span class="lvl-badge" id="cn-'+def.id+'">×0</span></div>'+
      '<div class="troop-stats rdesc">'+def.desc+'</div>'+
      '<div class="btn-row tight">'+
      '<button class="small-btn gold" id="cb-'+def.id+'">Buy '+def.cost+'g</button>'+
      '<button class="small-btn" id="cu-'+def.id+'">Use</button>'+
      '</div>';
    box.appendChild(d);
    $('cb-'+def.id).onclick=()=>{if(buyConsumable(def.id))refreshCards();};
    $('cu-'+def.id).onclick=()=>{
      if(useConsumable(def.id)){
        if(def.id==='meteor')setCursorHint('Click the battlefield to call the meteor — Esc cancels');
        refreshCards();
      }
    };
  }
  setTimeout(()=>{
    for(const def of RELICS)iconHtmlInto($('ri-'+def.id),'relic',def.id,36,'✦');
    for(const def of CONSUMABLES)iconHtmlInto($('ci-'+def.id),'relic',def.id,36,'✦');
  },0);
}
function refreshRelicCards(){
  for(const def of RELICS){
    const tier=G.relics[def.id];
    const pips=$('rp-'+def.id);
    let s='';
    for(let i=0;i<def.max;i++)s+='<span class="pip'+(i<tier?' on':'')+'"></span>';
    pips.innerHTML=s;
    const b=$('rb-'+def.id);
    if(tier>=def.max){b.textContent='MAX';b.disabled=true;}
    else{
      const c=relicCost(def,tier);
      b.textContent='Buy '+fmt(c)+'g';
      b.disabled=G.gold<c;
    }
  }
  for(const def of CONSUMABLES){
    $('cn-'+def.id).textContent='×'+(G.consum[def.id]||0);
    $('cb-'+def.id).disabled=G.gold<def.cost;
    $('cu-'+def.id).disabled=!(G.consum[def.id]>0);
  }
}

function refreshCards(){
  if(!G)return;
  for(const def of TOWERS){
    const el=$('tc-'+def.id);
    if(el)el.classList.toggle('cant',G.gold<def.cost);
  }
  for(const def of TROOPS){
    const locked=def.unlock>G.wave;
    const lk=$('lk-'+def.id);
    if(!lk)continue;
    lk.style.display=locked?'flex':'none';
    if(locked)continue;
    const lvl=G.troopLvl[def.id],st=troopStat(def.id,lvl);
    $('al-'+def.id).textContent='Lv '+(lvl+1);
    $('cnt-'+def.id).textContent=troopsAlive(def.id)+'/'+G.desired[def.id];
    $('as-'+def.id).textContent=(def.heal?('💚 '+fmt(st.heal)+'/s'):('⚔ '+fmt(st.dmg)+' ❤ '+fmt(st.hp)))+' • '+st.cost+'g';
    $('sum-'+def.id).disabled=G.gold<st.cost||G.troops.length>=popCap(G.wave);
    const maxed=lvl>=CFG.MAX_TROOP_LVL;
    const uc=maxed?0:troopUpCost(def.id,lvl);
    $('upt-'+def.id).textContent=maxed?'MAX':'⬆'+fmt(uc);
    $('upt-'+def.id).disabled=maxed||G.gold<uc;
  }
  refreshHeroCards();
  refreshRelicCards();
  if(UIS.selTower&&G.towers.includes(UIS.selTower)&&$('towerDetail').style.display==='block'){
    const up=$('btnUp');
    if(up)up.disabled=G.gold<towerUpCost(TOWER_BY[UIS.selTower.id],UIS.selTower.lvl);
  }
}
function onWaveEnd(){refreshCards();}

/* ================= canvas input ================= */
function canvasPos(ev){
  const r=canvas.getBoundingClientRect();
  const scale=Math.min(r.width/CFG.W,r.height/CFG.H);
  const ox=(r.width-CFG.W*scale)/2,oy=(r.height-CFG.H*scale)/2;
  return {x:(ev.clientX-r.left-ox)/scale,y:(ev.clientY-r.top-oy)/scale};
}
function bindCanvas(){
  canvas.addEventListener('mousemove',ev=>{
    const p=canvasPos(ev);
    UIS.hoverX=p.x;UIS.hoverY=p.y;
    UIS.hoverC=Math.floor(p.x/CFG.CELL);
    UIS.hoverR=Math.floor(p.y/CFG.CELL);
  });
  canvas.addEventListener('mouseleave',()=>{UIS.hoverC=-1;UIS.hoverR=-1;UIS.hoverX=-1;UIS.hoverY=-1;});
  canvas.addEventListener('click',ev=>{
    if(!started||!G||G.over)return;
    const p=canvasPos(ev);
    if(p.x<0||p.y<0||p.x>CFG.W||p.y>CFG.H)return;
    const c=Math.floor(p.x/CFG.CELL),r=Math.floor(p.y/CFG.CELL);
    if(G.targetMode==='meteor'){meteorAt(p.x,p.y);setCursorHint('');refreshCards();return;}
    if(UIS.mode==='build'){
      if(placeTower(UIS.buildType,c,r)){
        if(!ev.shiftKey||G.gold<TOWER_BY[UIS.buildType].cost)cancelMode();
      }
      return;
    }
    if(UIS.mode==='hero'&&G.selHero){moveHeroTo(G.selHero,p.x,p.y);UIS.mode='none';setCursorHint('');return;}
    if(UIS.mode==='rally'){
      const np=nearestPathPoint(p.x,p.y);
      G.rally[np.pi]=clamp(np.d,40,MAP.P[np.pi].total-60);
      addFx({kind:'flag',x:p.x,y:p.y,life:1,col:'#5aa8e0'});
      UIS.mode='none';setCursorHint('');return;
    }
    /* click a hero unit? */
    for(const h of activeHeroes()){
      if(dist2(h.x,h.y,p.x,p.y)<20*20){
        G.selHero=h;UIS.mode='hero';
        setCursorHint('Click the map to post '+h.hdef.name+' there');
        return;
      }
    }
    const t=G.towers.find(t=>t.c===c&&t.r===r);
    if(t){UIS.selTower=t;showTowerDetail(t);SFXp('ui_click');}
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
    else if(ev.key==='r'||ev.key==='R'){UIS.mode='rally';setCursorHint('Click near a road to set that road’s rally point');}
    else if(ev.key==='h'||ev.key==='H'){
      const hs=activeHeroes();
      if(hs.length){
        const i=(hs.indexOf(G.selHero)+1)%hs.length;
        G.selHero=hs[i];UIS.mode='hero';
        setCursorHint('Click the map to post '+G.selHero.hdef.name+' there');
      }
    }
    else if(ev.key>='1'&&ev.key<='9'){
      const def=TOWERS[+ev.key-1];
      if(def){
        UIS.mode='build';UIS.buildType=def.id;
        document.querySelectorAll('#towerCards .card').forEach(x=>x.classList.remove('selected'));
        const el=$('tc-'+def.id);if(el)el.classList.add('selected');
        setCursorHint('Click an empty tile to build '+def.name+' (Shift-click = several)');
      }
    }
  });
}
