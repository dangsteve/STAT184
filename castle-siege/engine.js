/* ============================================================
   engine.js — game state & simulation
   ============================================================ */
'use strict';

let G=null;

function newGame(){
  G={
    gold:CFG.START_GOLD, lives:CFG.START_LIVES, wave:1, time:0,
    over:false, paused:false, speed:1, autoWave:true,
    towers:[], enemies:[], troops:[], projs:[], parts:[], texts:[], fx:[],
    troopLvl:{}, desired:{}, heroLvl:1,
    rallyD:PATH.total*0.5,
    hero:null,
    waveActive:false, spawnQueue:[], spawnT:0, intermission:12,
    waveBanner:null, bannerT:0,
    kills:0, bossKills:0, goldEarned:0, shake:0,
    maintainT:0, auraT:0, saveT:0,
  };
  TROOPS.forEach(t=>{G.troopLvl[t.id]=0;G.desired[t.id]=0;});
  G.desired.militia=2;
  spawnHero();
  setBanner('Build towers & prepare! Wave 1 incoming…');
}

function setBanner(txt,big){G.waveBanner=txt;G.bannerT=big?4:3;}

/* ================= HERO ================= */
function spawnHero(){
  const st=heroStat(G.heroLvl);
  const p=posAt(PATH.total*0.55);
  G.hero={x:p.x,y:p.y-50,hx:p.x,hy:p.y-50,homeX:p.x,homeY:p.y-50,
    hp:st.hp,maxHp:st.hp,dead:false,respawnT:0,atkCd:0,slamCd:3,face:1,anim:0,swing:0};
}
function upgradeHero(){
  const c=heroUpCost(G.heroLvl);
  if(G.gold<c)return false;
  G.gold-=c;G.heroLvl++;
  const st=heroStat(G.heroLvl);
  if(G.hero&&!G.hero.dead){
    const pct=G.hero.hp/G.hero.maxHp;
    G.hero.maxHp=st.hp;G.hero.hp=st.hp*Math.max(pct,0.6);
    burst(G.hero.x,G.hero.y,14,'#ffd75e');
  }
  SFXp('upgrade');
  return true;
}
function moveHeroTo(x,y){
  if(!G.hero||G.hero.dead)return;
  G.hero.homeX=x;G.hero.homeY=y;G.hero.hx=x;G.hero.hy=y;
  addFx({kind:'flag',x,y,life:1,col:'#7cc4ff'});
}

/* ================= TOWERS ================= */
function canPlace(c,r){
  if(c<0||r<0||c>=CFG.COLS||r>=CFG.ROWS)return false;
  if(BLOCKED.has(c+','+r))return false;
  return !G.towers.some(t=>t.c===c&&t.r===r);
}
function placeTower(id,c,r){
  const def=TOWER_BY[id];
  if(!def||G.gold<def.cost||!canPlace(c,r))return false;
  G.gold-=def.cost;
  G.towers.push({id,c,r,x:c*CFG.CELL+20,y:r*CFG.CELL+20,lvl:1,cd:0,ang:-Math.PI/2,auraMul:1,heat:0,tick:0});
  burst(c*CFG.CELL+20,r*CFG.CELL+20,10,'#d8c9a0');
  SFXp('build');
  return true;
}
function upgradeTower(t){
  if(t.lvl>=CFG.MAX_TOWER_LVL)return false;
  const c=towerUpCost(TOWER_BY[t.id],t.lvl);
  if(G.gold<c)return false;
  G.gold-=c;t.lvl++;
  burst(t.x,t.y,16,'#ffd75e');
  SFXp('upgrade');
  return true;
}
function sellTower(t){
  const refund=Math.round(towerInvested(TOWER_BY[t.id],t.lvl)*0.7);
  G.gold+=refund;
  G.towers=G.towers.filter(x=>x!==t);
  addText(t.x,t.y,'+'+refund+'g','#ffd75e');
  SFXp('coin');
  return refund;
}

/* ================= TROOPS ================= */
function troopsAlive(id){return G.troops.filter(t=>t.id===id).length;}
function summonTroop(id,silent){
  const def=TROOP_BY[id];
  if(def.unlock>G.wave)return false;
  if(G.troops.length>=popCap(G.wave))return false;
  const st=troopStat(id,G.troopLvl[id]);
  if(G.gold<st.cost)return false;
  G.gold-=st.cost;
  const d=PATH.total-40;
  const p=posAt(d);
  G.troops.push({id,lvl:G.troopLvl[id],d,lane:rnd(-15,15),x:p.x,y:p.y,
    hp:st.hp,maxHp:st.hp,atkCd:rnd(0,0.4),foe:null,state:'walk',anim:rnd(0,6),face:-1,
    healCd:0,swing:0});
  burst(p.x,p.y,8,'#9ecbff');
  if(!silent)SFXp('summon');
  return true;
}
function upgradeTroopType(id){
  if(G.troopLvl[id]>=CFG.MAX_TROOP_LVL)return false;
  const c=troopUpCost(id,G.troopLvl[id]);
  if(G.gold<c)return false;
  G.gold-=c;G.troopLvl[id]++;
  SFXp('upgrade');
  return true;
}
function maintainArmy(dt){
  G.maintainT-=dt;
  if(G.maintainT>0)return;
  G.maintainT=0.75;
  for(const def of TROOPS){
    if(def.unlock>G.wave)continue;
    if(troopsAlive(def.id)<G.desired[def.id]){
      if(summonTroop(def.id,true))return; // one per tick
    }
  }
}

/* ================= WAVES ================= */
function buildWaveSchedule(w){
  const q=[];
  if(w%10===0){
    const cycle=Math.floor((w/10-1)%BOSSES.length);
    const tier=Math.floor((w-10)/(BOSSES.length*10))+1;
    const b=BOSSES[cycle];
    q.push({boss:b,tier,delay:2.5,rarity:null});
    // escort
    const avail=ENEMIES.filter(e=>e.unlock<=w);
    const esc=avail.slice(-3);
    const n=6+Math.floor(w/4);
    for(let i=0;i<n;i++)q.push({type:pick(esc).id,delay:1.4,rarity:null});
    setBanner('⚔ WAVE '+w+' — BOSS: '+b.name+(tier>1?' '+['','II','III','IV','V'][tier]||('x'+tier):'')+' ⚔',true);
    SFXp('roar');
    return q;
  }
  const avail=ENEMIES.filter(e=>e.unlock<=w);
  let budget=8+w*4+Math.pow(w,1.6)*0.5;
  let interval=Math.max(0.3,1.05-w*0.013);
  let theme='';
  const roll=Math.random();
  if(w>=6&&roll<0.16){theme='SWARM';budget*=1.35;interval*=0.55;}
  else if(w>=10&&roll<0.30){theme='ELITE';budget*=0.75;}
  else if(w>=8&&roll<0.42){theme='ARMORED';}
  let pool=avail;
  if(theme==='SWARM')pool=avail.filter(e=>e.w<=2.5)||avail;
  if(theme==='ARMORED')pool=avail.filter(e=>e.armor>=0.15);
  if(!pool.length)pool=avail;
  // choose 2-4 types, biased to recent unlocks
  const sorted=[...pool].sort((a,b)=>b.unlock-a.unlock);
  const nTypes=Math.min(sorted.length,2+Math.floor(Math.random()*3));
  const chosen=[];
  for(let i=0;i<nTypes;i++){
    const idx=Math.min(sorted.length-1,Math.floor(Math.pow(Math.random(),1.6)*sorted.length));
    chosen.push(sorted[idx]);
  }
  if(!chosen.length)chosen.push(pick(avail));
  while(budget>0){
    const e=pick(chosen);
    let rarity=null;
    if(theme==='ELITE')rarity='elite';
    else{
      const r=Math.random();
      if(r<champChance(w))rarity='champ';
      else if(r<champChance(w)+eliteChance(w))rarity='elite';
    }
    q.push({type:e.id,delay:interval*rnd(0.7,1.3),rarity});
    budget-=e.w;
  }
  setBanner('Wave '+w+(theme?' — '+theme+'!':''));
  return q;
}
function startWave(bonus){
  if(G.waveActive||G.over)return;
  if(bonus>0){G.gold+=bonus;addText(CFG.W/2,90,'+'+bonus+'g early bonus!','#ffd75e');}
  G.waveActive=true;
  G.spawnQueue=buildWaveSchedule(G.wave);
  G.spawnT=1.0;
  SFXp('horn');
}
function endWave(){
  G.waveActive=false;
  const reward=waveReward(G.wave);
  G.gold+=reward;G.goldEarned+=reward;
  addText(CFG.W/2,120,'Wave '+G.wave+' cleared!  +'+reward+'g','#ffd75e');
  G.wave++;
  G.intermission=CFG.INTERMISSION;
  // heal hero a bit between waves
  if(G.hero&&!G.hero.dead)G.hero.hp=Math.min(G.hero.maxHp,G.hero.hp+G.hero.maxHp*0.25);
  saveGame();
  SFXp('coin');
  if(typeof onWaveEnd==='function')onWaveEnd();
}

function spawnEnemy(entry){
  const w=G.wave;
  let def,tier=1,boss=false;
  if(entry.boss){def=entry.boss;tier=entry.tier;boss=true;}
  else def=ENEMY_BY[entry.type];
  const hm=hpMul(w)*(boss?Math.pow(2.1,tier-1):1);
  let hp=def.hp*hm, gold=Math.round(def.gold*goldMul(w)), size=def.size, leak=def.leak, rarity=entry.rarity;
  let spd=def.speed*speedMul(w)*rnd(0.92,1.08);
  if(rarity==='elite'){hp*=2.6;gold=Math.round(gold*3);size*=1.18;spd*=1.05;}
  if(rarity==='champ'){hp*=6;gold=Math.round(gold*8);size*=1.4;leak*=2;}
  G.enemies.push({
    def,boss,tier,rarity,hp,maxHp:hp,gold,leak,size,
    d:rnd(0,10),lane:boss?0:rnd(-15,15),x:-30,y:PATH_PTS[0].y,
    speed:spd,baseSpeed:spd,armor:def.armor,
    slowT:0,slowP:0,burnT:0,burnDps:0,poison:[],
    blk:null,atkCd:rnd(0.2,0.8),abCd:def.abCd||0,anim:rnd(0,6),dead:false,
  });
  if(boss)G.shake=Math.max(G.shake,8);
}

/* ================= DAMAGE ================= */
function damageEnemy(e,dmg,dtype,opts){
  if(e.dead)return;
  let final=dmg;
  if(dtype==='phys'){
    let armor=e.armor;
    if(opts&&opts.pierceArmor)armor*=(1-opts.pierceArmor);
    final*=(1-armor);
  }
  e.hp-=final;
  if(final>=1&&G.texts.length<60&&Math.random()<0.6)
    addText(e.x+rnd(-8,8),e.y-e.size-8,fmt(final),dtype==='magic'?'#9ad4ff':'#fff',0.8);
  if(e.hp<=0)killEnemy(e);
}
function killEnemy(e){
  if(e.dead)return;
  e.dead=true;
  G.gold+=e.gold;G.goldEarned+=e.gold;G.kills++;
  addText(e.x,e.y-e.size-14,'+'+e.gold,'#ffd75e',1);
  burst(e.x,e.y,e.boss?40:10,e.def.col);
  if(e.boss){
    G.bossKills++;G.shake=14;
    addFx({kind:'ring',x:e.x,y:e.y,r:10,maxR:130,life:0.7,col:'#ffd75e'});
    setBanner('☠ '+e.def.name+' defeated! ☠');
    SFXp('bossdie');
  }else if(e.rarity){
    addFx({kind:'ring',x:e.x,y:e.y,r:6,maxR:50,life:0.4,col:e.rarity==='champ'?'#ffd75e':'#c88bff'});
    SFXp('die');
  }else SFXp('die');
}
function leakEnemy(e){
  e.dead=true;
  G.lives-=e.leak;
  G.shake=Math.max(G.shake,e.leak>=3?10:4);
  addFx({kind:'ring',x:e.x,y:e.y,r:8,maxR:60,life:0.5,col:'#ff5a5a'});
  addText(CFG.W-140,80,'-'+e.leak+' ❤','#ff6a6a',1.4);
  SFXp('hurt');
  if(G.lives<=0){
    G.lives=0;G.over=true;
    try{const b=+localStorage.getItem('cs_best')||0;if(G.wave>b)localStorage.setItem('cs_best',G.wave);}catch(err){}
    clearSave();
    if(typeof onGameOver==='function')onGameOver();
  }
}
function damageAlly(t,dmg){ // t = troop or hero
  const armor=t.id?(TROOP_BY[t.id].armor||0):0;
  t.hp-=dmg*(1-armor);
  if(t.hp<=0){
    if(t===G.hero){
      t.dead=true;t.respawnT=heroStat(G.heroLvl).respawn;
      burst(t.x,t.y,20,'#7cc4ff');
      setBanner(HERO_DEF.name+' has fallen! Respawning…');
      SFXp('herodie');
    }else{
      t.deadFlag=true;
      burst(t.x,t.y,8,'#aab6c8');
    }
  }
}

/* ================= FX helpers ================= */
function burst(x,y,n,col){
  for(let i=0;i<n;i++){
    if(G.parts.length>420)return;
    const a=Math.random()*Math.PI*2,s=rnd(20,110);
    G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-30,life:rnd(0.3,0.8),maxLife:0.8,col,sz:rnd(1.5,3.5)});
  }
}
function addText(x,y,txt,col,life){
  if(G.texts.length>70)return;
  G.texts.push({x,y,txt,col,life:life||1,maxLife:life||1});
}
function addFx(f){if(G.fx.length<80)G.fx.push(f);}

/* ================= TOWER FIRE ================= */
function towerFire(t,st,def){
  const inRange=G.enemies.filter(e=>!e.dead&&dist2(t.x,t.y,e.x,e.y)<st.range*st.range);
  if(!inRange.length)return false;
  let tgt;
  if(def.id==='ballista')tgt=inRange.reduce((a,b)=>a.hp>b.hp?a:b);
  else tgt=inRange.reduce((a,b)=>a.d>b.d?a:b);
  t.ang=Math.atan2(tgt.y-t.y,tgt.x-t.x);
  const dmg=st.dmg*t.auraMul;
  switch(def.id){
    case 'archer':
      for(let i=0;i<st.multishot;i++){
        const tg=i===0?tgt:(inRange[Math.floor(Math.random()*inRange.length)]);
        G.projs.push({kind:'arrow',x:t.x,y:t.y-22,tgt:tg,lx:tg.x,ly:tg.y,spd:430,dmg,dtype:'phys'});
      }
      SFXp('arrow');break;
    case 'frost':
      G.projs.push({kind:'shard',x:t.x,y:t.y-24,tgt,lx:tgt.x,ly:tgt.y,spd:360,dmg,dtype:'magic',slow:st.slow,slowDur:st.slowDur});
      SFXp('frost');break;
    case 'cannon':{
      const tt=Math.hypot(tgt.x-t.x,tgt.y-t.y)/260;
      const px=tgt.x+Math.cos(posAt(tgt.d).a)*tgt.baseSpeed*tt*0.6,py=tgt.y;
      G.projs.push({kind:'ball',x0:t.x,y0:t.y-24,x1:px,y1:py,x:t.x,y:t.y-24,t:0,dur:tt,dmg,dtype:'phys',splash:st.splash});
      SFXp('cannon');break;}
    case 'poison':{
      const tt=Math.hypot(tgt.x-t.x,tgt.y-t.y)/240;
      G.projs.push({kind:'glob',x0:t.x,y0:t.y-20,x1:tgt.x,y1:tgt.y,x:t.x,y:t.y-20,t:0,dur:tt,dmg,dtype:'magic',splash:st.splash,poison:st.poison,poisonDur:st.poisonDur});
      SFXp('glob');break;}
    case 'ballista':{
      const a=t.ang;
      G.projs.push({kind:'bolt',x:t.x+Math.cos(a)*16,y:t.y-20+Math.sin(a)*16,vx:Math.cos(a)*540,vy:Math.sin(a)*540,
        dist:st.range+40,dmg,dtype:'phys',pierce:st.pierce,hit:new Set()});
      SFXp('bolt');break;}
    case 'storm':{
      const pts=[{x:t.x,y:t.y-26}];
      let cur=tgt,d=dmg;
      const hitSet=new Set();
      for(let i=0;i<st.chain&&cur;i++){
        hitSet.add(cur);
        damageEnemy(cur,d,'magic');
        pts.push({x:cur.x,y:cur.y});
        d*=0.75;
        let next=null,bd=90*90;
        for(const e of G.enemies){
          if(e.dead||hitSet.has(e))continue;
          const q=dist2(cur.x,cur.y,e.x,e.y);
          if(q<bd){bd=q;next=e;}
        }
        cur=next;
      }
      addFx({kind:'zap',pts,life:0.18});
      SFXp('zap');break;}
    case 'flame':{
      damageEnemy(tgt,dmg,'magic');
      tgt.burnT=st.burnDur;tgt.burnDps=Math.max(tgt.burnDps,st.burn*t.auraMul);
      for(let i=0;i<2;i++){
        if(G.parts.length<420){
          const a=t.ang+rnd(-0.25,0.25),s=rnd(120,200);
          G.parts.push({x:t.x+Math.cos(t.ang)*14,y:t.y-18+Math.sin(t.ang)*14,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rnd(0.2,0.45),maxLife:0.45,col:pick(['#ffb02a','#ff7a2a','#ffd75e']),sz:rnd(2,4)});
        }
      }
      if(t.heat<=0){SFXp('flame');t.heat=0.5;}
      break;}
  }
  return true;
}

/* ================= UPDATE ================= */
function stepSim(dt){
  if(!G||G.over||G.paused)return;
  const step=1/30;
  let rem=dt*G.speed;
  while(rem>0){
    const h=Math.min(step,rem);
    subStep(h);
    rem-=h;
  }
}
function subStep(dt){
  G.time+=dt;
  if(G.bannerT>0)G.bannerT-=dt;
  if(G.shake>0)G.shake=Math.max(0,G.shake-dt*30);

  /* ---- intermission / spawning ---- */
  if(!G.waveActive){
    if(G.autoWave){
      G.intermission-=dt;
      if(G.intermission<=0)startWave(0);
    }
  }else{
    if(G.spawnQueue.length){
      G.spawnT-=dt;
      if(G.spawnT<=0){
        const entry=G.spawnQueue.shift();
        spawnEnemy(entry);
        G.spawnT=entry.delay;
      }
    }else if(!G.enemies.length){
      endWave();
    }
  }

  maintainArmy(dt);

  /* ---- aura recompute ---- */
  G.auraT-=dt;
  if(G.auraT<=0){
    G.auraT=0.5;
    for(const t of G.towers)t.auraMul=1;
    for(const b of G.towers){
      if(b.id!=='beacon')continue;
      const st=towerStat(TOWER_BY.beacon,b.lvl);
      for(const t of G.towers){
        if(t===b||t.id==='beacon'||t.id==='mint')continue;
        if(dist2(b.x,b.y,t.x,t.y)<st.range*st.range)t.auraMul+=st.aura;
      }
    }
  }

  /* ---- towers ---- */
  for(const t of G.towers){
    const def=TOWER_BY[t.id];
    if(t.heat>0)t.heat-=dt;
    if(def.id==='mint'){
      t.tick+=dt;
      if(t.tick>=5){
        t.tick=0;
        const st=towerStat(def,t.lvl);
        G.gold+=st.income;G.goldEarned+=st.income;
        addText(t.x,t.y-24,'+'+st.income+'g','#ffd75e',1);
        burst(t.x,t.y-16,4,'#ffd75e');
        SFXp('coin');
      }
      continue;
    }
    if(def.id==='beacon')continue;
    t.cd-=dt;
    if(t.cd<=0){
      const st=towerStat(def,t.lvl);
      if(towerFire(t,st,def))t.cd=1/st.rate;
      else t.cd=0.08;
    }
  }

  /* ---- projectiles ---- */
  for(const p of G.projs){
    if(p.kind==='arrow'||p.kind==='shard'){
      const tx=p.tgt&&!p.tgt.dead?p.tgt.x:p.lx, ty=p.tgt&&!p.tgt.dead?p.tgt.y:p.ly;
      p.lx=tx;p.ly=ty;
      const dx=tx-p.x,dy=ty-p.y,L=Math.hypot(dx,dy);
      if(L<10){
        p.done=true;
        if(p.tgt&&!p.tgt.dead){
          damageEnemy(p.tgt,p.dmg,p.dtype);
          if(p.slow){p.tgt.slowT=Math.max(p.tgt.slowT,p.slowDur);p.tgt.slowP=Math.max(p.tgt.slowP,p.tgt.boss?p.slow*0.4:p.slow);burst(p.tgt.x,p.tgt.y,3,'#aee6ff');}
        }
      }else{p.x+=dx/L*p.spd*dt;p.y+=dy/L*p.spd*dt;p.ang=Math.atan2(dy,dx);}
    }else if(p.kind==='ball'||p.kind==='glob'){
      p.t+=dt;
      const u=Math.min(1,p.t/p.dur);
      p.x=lerp(p.x0,p.x1,u);p.y=lerp(p.y0,p.y1,u)-Math.sin(u*Math.PI)*60;
      if(u>=1){
        p.done=true;
        const col=p.kind==='glob'?'#8ee05a':'#ffb02a';
        addFx({kind:'ring',x:p.x1,y:p.y1,r:4,maxR:p.splash,life:0.3,col});
        burst(p.x1,p.y1,p.kind==='glob'?8:12,col);
        if(p.kind==='ball')G.shake=Math.max(G.shake,2);
        for(const e of G.enemies){
          if(e.dead)continue;
          if(dist2(e.x,e.y,p.x1,p.y1)<p.splash*p.splash){
            damageEnemy(e,p.dmg,p.dtype);
            if(p.poison&&!e.dead){
              if(e.poison.length<6)e.poison.push({t:p.poisonDur,dps:p.poison});
              else e.poison[0]={t:p.poisonDur,dps:p.poison};
            }
          }
        }
        SFXp(p.kind==='glob'?'splat':'boom');
      }
    }else if(p.kind==='bolt'){
      const mv=Math.hypot(p.vx,p.vy)*dt;
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.dist-=mv;
      for(const e of G.enemies){
        if(e.dead||p.hit.has(e))continue;
        if(dist2(e.x,e.y,p.x,p.y)<(e.size+7)*(e.size+7)){
          p.hit.add(e);
          damageEnemy(e,p.dmg,'phys');
          burst(e.x,e.y,4,'#d8c9a0');
          if(p.hit.size>=p.pierce){p.done=true;break;}
        }
      }
      if(p.dist<=0||p.x<-40||p.x>CFG.W+40||p.y<-40||p.y>CFG.H+40)p.done=true;
    }else if(p.kind==='tproj'){ // troop ranged projectile
      const tx=p.tgt&&!p.tgt.dead?p.tgt.x:p.lx, ty=p.tgt&&!p.tgt.dead?p.tgt.y:p.ly;
      p.lx=tx;p.ly=ty;
      const dx=tx-p.x,dy=ty-p.y,L=Math.hypot(dx,dy);
      if(L<10){
        p.done=true;
        if(p.splash){
          addFx({kind:'ring',x:tx,y:ty,r:4,maxR:p.splash,life:0.25,col:'#c88bff'});
          for(const e of G.enemies){
            if(e.dead)continue;
            if(dist2(e.x,e.y,tx,ty)<p.splash*p.splash)damageEnemy(e,p.dmg,'magic');
          }
        }else if(p.tgt&&!p.tgt.dead)damageEnemy(p.tgt,p.dmg,p.dtype,{pierceArmor:p.pierceArmor});
      }else{p.x+=dx/L*p.spd*dt;p.y+=dy/L*p.spd*dt;p.ang=Math.atan2(dy,dx);}
    }
  }
  G.projs=G.projs.filter(p=>!p.done);

  /* ---- enemies ---- */
  for(const e of G.enemies){
    if(e.dead)continue;
    e.anim+=dt*(e.speed/30);
    /* dots */
    if(e.burnT>0){e.burnT-=dt;e.hp-=e.burnDps*dt;if(e.hp<=0){killEnemy(e);continue;}}
    if(e.poison.length){
      let pd=0;
      for(const ps of e.poison){ps.t-=dt;pd+=ps.dps;}
      e.poison=e.poison.filter(ps=>ps.t>0);
      e.hp-=pd*dt;
      if(e.hp<=0){killEnemy(e);continue;}
    }
    if(e.slowT>0){e.slowT-=dt;if(e.slowT<=0)e.slowP=0;}
    if(e.def.regen)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*e.def.regen*dt);
    /* healer */
    if(e.def.healer){
      e.abCd=(e.abCd||2)-dt;
      if(e.abCd<=0){
        e.abCd=2;
        for(const o of G.enemies){
          if(o.dead||o===e)continue;
          if(dist2(e.x,e.y,o.x,o.y)<75*75&&o.hp<o.maxHp){
            o.hp=Math.min(o.maxHp,o.hp+o.maxHp*0.04+8);
            addFx({kind:'heal',x:o.x,y:o.y,life:0.5});
          }
        }
      }
    }
    /* boss abilities */
    if(e.boss){
      e.abCd-=dt;
      const ab=e.def.ability;
      if(ab==='regen'){if(e.abCd<=0){e.abCd=1;e.hp=Math.min(e.maxHp,e.hp+e.maxHp*0.012);}}
      else if(ab==='burn'){
        if(e.abCd<=0){
          e.abCd=1;
          for(const t of G.troops)if(dist2(t.x,t.y,e.x,e.y)<120*120)damageAlly(t,10*e.tier);
          if(G.hero&&!G.hero.dead&&dist2(G.hero.x,G.hero.y,e.x,e.y)<120*120)damageAlly(G.hero,10*e.tier);
          addFx({kind:'ring',x:e.x,y:e.y,r:20,maxR:120,life:0.4,col:'#ff7a2a'});
        }
      }else if(ab==='stomp'){
        if(e.abCd<=0){
          let any=false;
          for(const t of G.troops)if(dist2(t.x,t.y,e.x,e.y)<110*110){any=true;break;}
          if(!any&&G.hero&&!G.hero.dead&&dist2(G.hero.x,G.hero.y,e.x,e.y)<110*110)any=true;
          if(any){
            e.abCd=e.def.abCd;
            G.shake=Math.max(G.shake,8);
            addFx({kind:'ring',x:e.x,y:e.y,r:14,maxR:110,life:0.5,col:'#e0b060'});
            for(const t of G.troops)if(dist2(t.x,t.y,e.x,e.y)<110*110)damageAlly(t,55*e.tier);
            if(G.hero&&!G.hero.dead&&dist2(G.hero.x,G.hero.y,e.x,e.y)<110*110)damageAlly(G.hero,55*e.tier);
            SFXp('boom');
          }
        }
      }else if(ab==='summon'){
        if(e.abCd<=0){
          e.abCd=e.def.abCd;
          for(let i=0;i<3+e.tier;i++){
            const hm=hpMul(G.wave);
            const sd=ENEMY_BY.skel;
            G.enemies.push({def:sd,boss:false,tier:1,rarity:null,hp:sd.hp*hm,maxHp:sd.hp*hm,
              gold:Math.round(sd.gold*goldMul(G.wave)*0.5),leak:1,size:sd.size,
              d:Math.max(0,e.d-rnd(5,40)),lane:rnd(-16,16),x:e.x,y:e.y,
              speed:sd.speed,baseSpeed:sd.speed,armor:0,slowT:0,slowP:0,burnT:0,burnDps:0,
              poison:[],blk:null,atkCd:0.5,abCd:0,anim:rnd(0,6),dead:false});
          }
          burst(e.x,e.y,14,'#d8d4c4');
          SFXp('summon');
        }
      }
    }
    /* blocker check */
    if(e.blk){
      const b=e.blk;
      const gone=(b===G.hero)?(b.dead):(b.deadFlag||b.hp<=0);
      if(gone||dist2(e.x,e.y,b.x,b.y)>55*55)e.blk=null;
    }
    if(e.blk){
      e.atkCd-=dt;
      if(e.atkCd<=0){
        e.atkCd=1.0;
        const dmg=(6+e.def.hp*0.06)*Math.sqrt(hpMul(G.wave))*(e.boss?2.2:1)*(e.rarity==='champ'?1.6:1);
        damageAlly(e.blk,dmg);
        addFx({kind:'slash',x:e.blk.x,y:e.blk.y,life:0.15,col:'#ff8a6a'});
      }
    }else{
      e.d+=e.speed*(1-e.slowP)*dt;
      if(e.d>=PATH.total-8){leakEnemy(e);continue;}
    }
    const p=posAt(e.d);
    const nx=Math.cos(p.a+Math.PI/2),ny=Math.sin(p.a+Math.PI/2);
    e.x=p.x+nx*e.lane;e.y=p.y+ny*e.lane;
  }
  G.enemies=G.enemies.filter(e=>!e.dead);

  /* ---- troops ---- */
  for(const tr of G.troops){
    const def=TROOP_BY[tr.id],st=troopStat(tr.id,tr.lvl);
    tr.anim+=dt*2.2;
    if(tr.swing>0)tr.swing-=dt;
    if(def.selfHeal)tr.hp=Math.min(tr.maxHp,tr.hp+tr.maxHp*def.selfHeal*dt);
    /* cleric */
    if(def.heal){
      tr.healCd-=dt;
      if(tr.healCd<=0){
        tr.healCd=1;
        let best=null,bp=1;
        for(const o of G.troops){
          if(o===tr||o.deadFlag)continue;
          if(dist2(tr.x,tr.y,o.x,o.y)>def.healRange*def.healRange)continue;
          const pct=o.hp/o.maxHp;
          if(pct<bp){bp=pct;best=o;}
        }
        if(G.hero&&!G.hero.dead&&dist2(tr.x,tr.y,G.hero.x,G.hero.y)<def.healRange*def.healRange&&G.hero.hp/G.hero.maxHp<bp){best=G.hero;}
        if(best){
          best.hp=Math.min(best.maxHp,best.hp+st.heal);
          addFx({kind:'heal',x:best.x,y:best.y,life:0.5});
        }
      }
    }
    /* acquire foe */
    if(tr.foe&&(tr.foe.dead))tr.foe=null;
    if(!tr.foe&&(def.melee||def.range)){
      let best=null,bd=1e12;
      const seek=def.melee?CFG.AGGRO_R:st.range;
      for(const e of G.enemies){
        if(e.dead)continue;
        const q=dist2(tr.x,tr.y,e.x,e.y);
        if(q<seek*seek&&q<bd){bd=q;best=e;}
      }
      tr.foe=best;
    }
    if(tr.foe){
      const q=Math.sqrt(dist2(tr.x,tr.y,tr.foe.x,tr.foe.y));
      const reach=def.melee?CFG.ENGAGE_R:st.range;
      if(q<=reach){
        tr.state='fight';
        if(def.melee&&!tr.foe.blk)tr.foe.blk=tr;
        tr.atkCd-=dt;
        if(tr.atkCd<=0&&(def.dmg>0)){
          tr.atkCd=def.rate;
          tr.swing=0.18;
          let dmg=st.dmg;
          if(def.bonusFast&&tr.foe.baseSpeed>=80)dmg*=def.bonusFast;
          if(def.id==='berserker')dmg*=1;
          if(def.id==='berserker'){const hpp=tr.hp/tr.maxHp;tr.atkCd=def.rate*(0.45+0.55*hpp);}
          if(def.melee){
            damageEnemy(tr.foe,dmg,'phys');
            if(def.cleave){
              for(const e of G.enemies){
                if(e.dead||e===tr.foe)continue;
                if(dist2(tr.x,tr.y,e.x,e.y)<def.cleave*def.cleave)damageEnemy(e,dmg*0.5,'phys');
              }
            }
          }else{
            G.projs.push({kind:'tproj',x:tr.x,y:tr.y-12,tgt:tr.foe,lx:tr.foe.x,ly:tr.foe.y,spd:330,
              dmg,dtype:def.splash?'magic':'phys',splash:def.splash?def.splash:0,pierceArmor:def.pierceArmor||0,
              col:def.id==='mage'?'#c88bff':'#e8dcb0'});
            SFXp('arrow');
          }
        }
      }else{
        // chase along path
        tr.state='walk';
        const dir=tr.foe.d>tr.d?1:-1;
        tr.d+=dir*st.speed*dt;
        tr.face=dir>0?1:-1;
      }
    }else{
      // walk to rally
      const target=G.rallyD;
      const diff=target-tr.d;
      if(Math.abs(diff)>8){
        tr.state='walk';
        const dir=diff>0?1:-1;
        tr.d+=dir*st.speed*dt;
        tr.face=dir>0?1:-1;
      }else tr.state='idle';
    }
    tr.d=clamp(tr.d,10,PATH.total-14);
    const p=posAt(tr.d);
    const nx=Math.cos(p.a+Math.PI/2),ny=Math.sin(p.a+Math.PI/2);
    tr.x=p.x+nx*tr.lane;tr.y=p.y+ny*tr.lane;
  }
  G.troops=G.troops.filter(t=>!t.deadFlag&&t.hp>0);

  /* ---- hero ---- */
  const h=G.hero;
  if(h){
    if(h.dead){
      h.respawnT-=dt;
      if(h.respawnT<=0){
        const st=heroStat(G.heroLvl);
        h.dead=false;h.hp=st.hp;h.maxHp=st.hp;
        h.x=h.homeX;h.y=h.homeY;
        burst(h.x,h.y,16,'#7cc4ff');
        SFXp('summon');
      }
    }else{
      const st=heroStat(G.heroLvl);
      h.maxHp=st.hp;
      h.anim+=dt*2.2;
      if(h.swing>0)h.swing-=dt;
      h.atkCd-=dt;h.slamCd-=dt;
      /* find target near home */
      let foe=null,bd=1e12;
      for(const e of G.enemies){
        if(e.dead)continue;
        if(dist2(h.homeX,h.homeY,e.x,e.y)>190*190)continue;
        const q=dist2(h.x,h.y,e.x,e.y);
        if(q<bd){bd=q;foe=e;}
      }
      let tx=h.homeX,ty=h.homeY;
      if(foe){tx=foe.x;ty=foe.y;}
      const q=Math.hypot(tx-h.x,ty-h.y);
      if(foe&&q<=CFG.ENGAGE_R+6){
        if(!foe.blk)foe.blk=h;
        if(h.atkCd<=0){
          h.atkCd=st.rate;h.swing=0.2;
          damageEnemy(foe,st.dmg,'phys');
          for(const e of G.enemies){
            if(e.dead||e===foe)continue;
            if(dist2(h.x,h.y,e.x,e.y)<HERO_DEF.cleave*HERO_DEF.cleave)damageEnemy(e,st.dmg*0.5,'phys');
          }
          SFXp('slash');
        }
        if(h.slamCd<=0){
          let n=0;
          for(const e of G.enemies)if(!e.dead&&dist2(h.x,h.y,e.x,e.y)<st.slamR*st.slamR)n++;
          if(n>=2){
            h.slamCd=HERO_DEF.slamCd;
            addFx({kind:'ring',x:h.x,y:h.y,r:10,maxR:st.slamR,life:0.45,col:'#7cc4ff'});
            G.shake=Math.max(G.shake,5);
            for(const e of G.enemies){
              if(e.dead)continue;
              if(dist2(h.x,h.y,e.x,e.y)<st.slamR*st.slamR){
                damageEnemy(e,st.slamDmg,'magic');
                if(!e.boss){e.slowT=Math.max(e.slowT,0.8);e.slowP=Math.max(e.slowP,0.9);}
              }
            }
            SFXp('slam');
          }
        }
      }else if(q>4){
        h.x+=(tx-h.x)/q*st.speed*dt;
        h.y+=(ty-h.y)/q*st.speed*dt;
        h.face=(tx-h.x)>=0?1:-1;
      }
    }
  }

  /* ---- particles / texts / fx ---- */
  for(const p of G.parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt;}
  G.parts=G.parts.filter(p=>p.life>0);
  for(const t of G.texts){t.life-=dt;t.y-=28*dt;}
  G.texts=G.texts.filter(t=>t.life>0);
  for(const f of G.fx)f.life-=dt;
  G.fx=G.fx.filter(f=>f.life>0);
}

/* ================= SAVE / LOAD ================= */
function saveGame(){
  try{
    const s={v:1,gold:G.gold,lives:G.lives,wave:G.wave,heroLvl:G.heroLvl,
      towers:G.towers.map(t=>({id:t.id,c:t.c,r:t.r,lvl:t.lvl})),
      troopLvl:G.troopLvl,desired:G.desired,rallyD:G.rallyD,
      kills:G.kills,bossKills:G.bossKills,goldEarned:G.goldEarned,
      autoWave:G.autoWave,speed:G.speed};
    localStorage.setItem('cs_save',JSON.stringify(s));
  }catch(err){}
}
function hasSave(){try{return !!localStorage.getItem('cs_save');}catch(err){return false;}}
function clearSave(){try{localStorage.removeItem('cs_save');}catch(err){}}
function loadGame(){
  try{
    const s=JSON.parse(localStorage.getItem('cs_save'));
    if(!s||s.v!==1)return false;
    newGame();
    G.gold=s.gold;G.lives=s.lives;G.wave=s.wave;G.heroLvl=s.heroLvl;
    G.kills=s.kills||0;G.bossKills=s.bossKills||0;G.goldEarned=s.goldEarned||0;
    G.autoWave=s.autoWave!==false;G.speed=s.speed||1;G.rallyD=s.rallyD||PATH.total*0.5;
    Object.assign(G.troopLvl,s.troopLvl||{});
    Object.assign(G.desired,s.desired||{});
    G.towers=[];
    for(const t of s.towers||[]){
      if(!TOWER_BY[t.id])continue;
      G.towers.push({id:t.id,c:t.c,r:t.r,x:t.c*CFG.CELL+20,y:t.r*CFG.CELL+20,lvl:t.lvl,cd:0,ang:-Math.PI/2,auraMul:1,heat:0,tick:0});
    }
    spawnHero();
    G.intermission=CFG.INTERMISSION;
    setBanner('Welcome back! Wave '+G.wave+' approaches…');
    return true;
  }catch(err){return false;}
}
