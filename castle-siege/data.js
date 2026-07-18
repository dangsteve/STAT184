/* ============================================================
   CASTLE SIEGE — Endless Medieval Tower Defense
   data.js — constants, definitions, math helpers
   ============================================================ */
'use strict';

const CFG = {
  W: 1280, H: 720, CELL: 40, COLS: 32, ROWS: 18,
  START_GOLD: 240, START_LIVES: 20,
  ENGAGE_R: 30, ENEMY_ATK_R: 36, AGGRO_R: 115,
  INTERMISSION: 9, MAX_TOWER_LVL: 5, MAX_TROOP_LVL: 9,
};

/* ---------- deterministic rng for map decor ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const mapRng = mulberry32(11840);

const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const lerp=(a,b,t)=>a+(b-a)*t;
const dist2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=arr=>arr[Math.floor(Math.random()*arr.length)];

function fmt(n){
  n=Math.round(n);
  if(n<1000)return ''+n;
  if(n<1e6)return (n/1e3).toFixed(n<1e4?1:0)+'K';
  if(n<1e9)return (n/1e6).toFixed(n<1e7?1:0)+'M';
  return (n/1e9).toFixed(1)+'B';
}

/* ---------- path ---------- */
const PATH_CELLS=[[-1,4],[6,4],[6,13],[13,13],[13,5],[20,5],[20,13],[27,13],[27,8],[30.6,8]];
const PATH_PTS=PATH_CELLS.map(([c,r])=>({x:c*CFG.CELL+20,y:r*CFG.CELL+20}));
const PATH={pts:PATH_PTS,seg:[],total:0};
for(let i=0;i<PATH_PTS.length-1;i++){
  const a=PATH_PTS[i],b=PATH_PTS[i+1];
  const L=Math.hypot(b.x-a.x,b.y-a.y);
  PATH.seg.push({a,b,len:L,start:PATH.total,ang:Math.atan2(b.y-a.y,b.x-a.x)});
  PATH.total+=L;
}
function posAt(d){
  d=clamp(d,0,PATH.total);
  for(const s of PATH.seg){
    if(d<=s.start+s.len){
      const t=(d-s.start)/s.len;
      return {x:lerp(s.a.x,s.b.x,t),y:lerp(s.a.y,s.b.y,t),a:s.ang};
    }
  }
  const s=PATH.seg[PATH.seg.length-1];
  return {x:s.b.x,y:s.b.y,a:s.ang};
}
function distToPath(x,y){
  let best=1e9;
  for(const s of PATH.seg){
    const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y;
    const t=clamp(((x-s.a.x)*dx+(y-s.a.y)*dy)/(s.len*s.len),0,1);
    best=Math.min(best,dist2(x,y,s.a.x+dx*t,s.a.y+dy*t));
  }
  return Math.sqrt(best);
}
/* nearest path-distance for a map point (for rally flags) */
function nearestPathD(x,y){
  let best=1e9,bd=0;
  for(let d=0;d<=PATH.total;d+=14){
    const p=posAt(d),q=dist2(x,y,p.x,p.y);
    if(q<best){best=q;bd=d;}
  }
  return bd;
}

/* ---------- blocked cells + decorations ---------- */
const BLOCKED=new Set();
for(let r=0;r<CFG.ROWS;r++)for(let c=0;c<CFG.COLS;c++){
  const x=c*CFG.CELL+20,y=r*CFG.CELL+20;
  if(distToPath(x,y)<38)BLOCKED.add(c+','+r);
}
for(let r=5;r<=11;r++)for(let c=28;c<=31;c++)BLOCKED.add(c+','+r); // castle grounds
const DECOR=[];
{
  const kinds=['tree','tree','tree','pine','rock','bush'];
  let tries=0;
  while(DECOR.length<26&&tries<600){
    tries++;
    const c=Math.floor(mapRng()*CFG.COLS),r=Math.floor(mapRng()*CFG.ROWS);
    if(BLOCKED.has(c+','+r))continue;
    if(DECOR.some(d=>d.c===c&&d.r===r))continue;
    DECOR.push({c,r,kind:kinds[Math.floor(mapRng()*kinds.length)],
      jx:(mapRng()-0.5)*14,jy:(mapRng()-0.5)*14,s:0.8+mapRng()*0.5});
    BLOCKED.add(c+','+r);
  }
}

/* ============================================================
   TOWERS — 9 types, 5 levels each
   ============================================================ */
const TOWERS=[
 {id:'archer', name:'Archer Tower',  icon:'🏹', cost:70,  dmg:8,   rate:1.5,  range:150, dtype:'phys',  proj:'arrow',
  desc:'Fast single-target arrows. Lv5 fires twin shots.', hue:'#c9a227'},
 {id:'cannon', name:'Cannon Tower',  icon:'💣', cost:120, dmg:27,  rate:0.55, range:140, dtype:'phys',  proj:'ball', splash:55,
  desc:'Lobbed cannonballs with splash damage.', hue:'#7a7f8a'},
 {id:'frost',  name:'Frost Spire',   icon:'❄️', cost:100, dmg:6,   rate:1.0,  range:135, dtype:'magic', proj:'shard', slow:0.35, slowDur:2.0,
  desc:'Chills enemies, slowing their march.', hue:'#69c8e8'},
 {id:'flame',  name:'Flame Brazier', icon:'🔥', cost:110, dmg:3.6, rate:6,    range:100, dtype:'magic', proj:'flame', burn:6, burnDur:2.5,
  desc:'Torrent of fire that leaves foes burning.', hue:'#e8712a'},
 {id:'ballista',name:'Ballista',     icon:'🎯', cost:160, dmg:48,  rate:0.4,  range:235, dtype:'phys',  proj:'bolt', pierce:3,
  desc:'Huge bolts that skewer several enemies.', hue:'#a8743a'},
 {id:'poison', name:'Alchemy Lab',   icon:'☠️', cost:130, dmg:6,   rate:0.6,  range:150, dtype:'magic', proj:'glob', splash:42, poison:5, poisonDur:4,
  desc:'Toxic flasks; poison stacks up to 6 times.', hue:'#7ec244'},
 {id:'storm',  name:'Storm Spire',   icon:'⚡', cost:180, dmg:14,  rate:0.85, range:165, dtype:'magic', proj:'zap', chain:4,
  desc:'Lightning that chains between enemies.', hue:'#b48ce8'},
 {id:'mint',   name:'Gold Mint',     icon:'🪙', cost:150, income:9, rate:0, range:0, dtype:'none', proj:'none',
  desc:'Mints gold every 5s. Perfect while you multitask.', hue:'#e8c93a'},
 {id:'beacon', name:'Holy Beacon',   icon:'✨', cost:140, aura:0.12, rate:0, range:135, dtype:'none', proj:'none',
  desc:'+damage aura for towers in range. Stacks.', hue:'#f0e6b4'},
];
const TOWER_BY={};TOWERS.forEach(t=>TOWER_BY[t.id]=t);

function towerStat(def,lvl){
  const m=Math.pow(1.55,lvl-1);
  return {
    dmg:def.dmg?def.dmg*m:0,
    rate:def.rate?def.rate*(1+0.08*(lvl-1)):0,
    range:def.range?def.range*(1+0.055*(lvl-1)):0,
    splash:def.splash?def.splash*(1+0.08*(lvl-1)):0,
    slow:def.slow?Math.min(0.7,def.slow+0.07*(lvl-1)):0,
    slowDur:def.slowDur?def.slowDur+0.25*(lvl-1):0,
    burn:def.burn?def.burn*m:0,
    burnDur:def.burnDur||0,
    poison:def.poison?def.poison*m:0,
    poisonDur:def.poisonDur||0,
    pierce:def.pierce?def.pierce+(lvl>=3?1:0)+(lvl>=5?1:0):0,
    chain:def.chain?def.chain+(lvl-1):0,
    income:def.income?Math.round(def.income*Math.pow(1.6,lvl-1)):0,
    aura:def.aura?def.aura+0.09*(lvl-1):0,
    multishot:def.id==='archer'&&lvl>=5?2:1,
  };
}
const towerUpCost=(def,lvl)=>Math.round(def.cost*0.85*Math.pow(lvl,1.55)); // cost to go lvl -> lvl+1
function towerInvested(def,lvl){let s=def.cost;for(let l=1;l<lvl;l++)s+=towerUpCost(def,l);return s;}

/* ============================================================
   TROOPS — 12 summonable types (the player's army)
   ============================================================ */
const TROOPS=[
 {id:'militia',  name:'Militia',     icon:'🪓', cost:15,  hp:52,  dmg:5,  rate:1.0, speed:70,  melee:true,  unlock:1,  desc:'Cheap fodder. Holds the line.'},
 {id:'archer',   name:'Archer',      icon:'🏹', cost:25,  hp:32,  dmg:7,  rate:0.9, speed:70,  melee:false, range:145, unlock:1,  desc:'Shoots from a distance.'},
 {id:'sword',    name:'Swordsman',   icon:'⚔️', cost:35,  hp:95,  dmg:9,  rate:0.85,speed:66,  melee:true,  unlock:2,  desc:'Solid frontline fighter.'},
 {id:'spear',    name:'Spearman',    icon:'🔱', cost:45,  hp:78,  dmg:12, rate:1.0, speed:66,  melee:true,  unlock:4,  bonusFast:1.5, desc:'+50% damage vs fast enemies.'},
 {id:'xbow',     name:'Crossbowman', icon:'🎯', cost:55,  hp:42,  dmg:17, rate:1.3, speed:62,  melee:false, range:175, pierceArmor:0.5, unlock:6, desc:'Bolts punch through 50% armor.'},
 {id:'berserker',name:'Berserker',   icon:'🪖', cost:70,  hp:75,  dmg:26, rate:0.9, speed:78,  melee:true,  unlock:8,  desc:'Attacks faster as he bleeds.'},
 {id:'knight',   name:'Knight',      icon:'🛡️', cost:90,  hp:270, dmg:10, rate:1.0, speed:56,  melee:true,  armor:0.3, unlock:10, desc:'Heavy armor. Great blocker.'},
 {id:'mage',     name:'Battle Mage', icon:'🔮', cost:110, hp:58,  dmg:21, rate:1.6, speed:60,  melee:false, range:155, splash:45, unlock:12, desc:'Explosive magic bolts (splash).'},
 {id:'cleric',   name:'Cleric',      icon:'⛪', cost:100, hp:75,  dmg:0,  rate:0,   speed:62,  melee:false, heal:14, healRange:100, unlock:14, desc:'Heals your troops and hero.'},
 {id:'cavalry',  name:'Cavalry',     icon:'🐎', cost:120, hp:160, dmg:19, rate:0.8, speed:118, melee:true,  unlock:16, desc:'Fast riders that rush the front.'},
 {id:'paladin',  name:'Paladin',     icon:'✝️', cost:160, hp:350, dmg:17, rate:0.95,speed:54,  melee:true,  armor:0.35, selfHeal:0.015, unlock:18, desc:'Armored, self-healing champion.'},
 {id:'giant',    name:'Giant',       icon:'🗿', cost:250, hp:950, dmg:48, rate:1.7, speed:44,  melee:true,  cleave:45, unlock:20, desc:'Colossal smasher. Cleaves groups.'},
];
const TROOP_BY={};TROOPS.forEach(t=>TROOP_BY[t.id]=t);

function troopStat(id,lvl){
  const d=TROOP_BY[id],m=Math.pow(1.32,lvl);
  return {hp:d.hp*m,dmg:d.dmg*m,heal:(d.heal||0)*m,rate:d.rate,speed:d.speed,
    range:d.range||0,armor:d.armor||0,cost:Math.round(d.cost*(1+0.1*lvl))};
}
const troopUpCost=(id,lvl)=>Math.round(TROOP_BY[id].cost*2.4*Math.pow(1.55,lvl));

/* ============================================================
   HERO
   ============================================================ */
const HERO_DEF={name:'Sir Aldric',hp:400,dmg:32,rate:0.7,speed:95,cleave:48,slamDmg:75,slamR:95,slamCd:9,respawn:15};
function heroStat(lvl){
  const m=Math.pow(1.22,lvl-1);
  return {hp:HERO_DEF.hp*m,dmg:HERO_DEF.dmg*m,slamDmg:HERO_DEF.slamDmg*m,
    slamR:HERO_DEF.slamR*(1+0.03*(lvl-1)),speed:HERO_DEF.speed,rate:HERO_DEF.rate,
    respawn:Math.max(8,HERO_DEF.respawn-0.2*(lvl-1))};
}
const heroUpCost=lvl=>Math.round(110*Math.pow(1.33,lvl-1));

/* ============================================================
   ENEMIES — 14 types + 4 rotating bosses
   w = wave-budget weight
   ============================================================ */
const ENEMIES=[
 {id:'goblin',  name:'Goblin',       hp:22,  speed:62,  armor:0,   gold:4,  leak:1, w:1,   unlock:1,  kind:'biped', col:'#5da03c', size:9},
 {id:'wolf',    name:'Dire Wolf',    hp:17,  speed:96,  armor:0,   gold:4,  leak:1, w:1,   unlock:2,  kind:'beast', col:'#8a8f98', size:9},
 {id:'bandit',  name:'Bandit',       hp:36,  speed:70,  armor:0.1, gold:5,  leak:1, w:1.6, unlock:3,  kind:'biped', col:'#9c6b3f', size:10},
 {id:'skel',    name:'Skeleton',     hp:30,  speed:58,  armor:0,   gold:5,  leak:1, w:1.4, unlock:4,  kind:'biped', col:'#d8d4c4', size:10},
 {id:'orc',     name:'Orc',          hp:72,  speed:52,  armor:0.15,gold:8,  leak:1, w:3,   unlock:5,  kind:'biped', col:'#4c7d3a', size:12},
 {id:'hobgob',  name:'Hobgoblin',    hp:56,  speed:67,  armor:0.1, gold:7,  leak:1, w:2.4, unlock:7,  kind:'biped', col:'#b0623c', size:11},
 {id:'shaman',  name:'Gnoll Shaman', hp:62,  speed:48,  armor:0,   gold:11, leak:1, w:3,   unlock:8,  kind:'biped', col:'#c48be0', size:11, healer:true},
 {id:'armskel', name:'Bone Guard',   hp:92,  speed:50,  armor:0.45,gold:10, leak:1, w:4,   unlock:10, kind:'biped', col:'#b8bcc8', size:11},
 {id:'wraith',  name:'Wraith',       hp:78,  speed:90,  armor:0.2, gold:12, leak:1, w:3.5, unlock:12, kind:'ghost', col:'#9adcd4', size:11},
 {id:'troll',   name:'Cave Troll',   hp:230, speed:44,  armor:0.2, gold:17, leak:2, w:8,   unlock:14, kind:'big',   col:'#5a8a6a', size:15, regen:0.008},
 {id:'dknight', name:'Dark Knight',  hp:270, speed:55,  armor:0.5, gold:19, leak:2, w:9,   unlock:16, kind:'biped', col:'#3c3f52', size:12},
 {id:'ogre',    name:'Ogre',         hp:430, speed:38,  armor:0.25,gold:23, leak:3, w:14,  unlock:18, kind:'big',   col:'#c2925a', size:17},
 {id:'harpy',   name:'Harpy',        hp:95,  speed:106, armor:0,   gold:13, leak:1, w:4,   unlock:20, kind:'ghost', col:'#d8788a', size:11},
 {id:'golem',   name:'Stone Golem',  hp:720, speed:30,  armor:0.6, gold:32, leak:3, w:22,  unlock:24, kind:'big',   col:'#8a8578', size:18},
];
const ENEMY_BY={};ENEMIES.forEach(e=>ENEMY_BY[e.id]=e);

const BOSSES=[
 {id:'warlord', name:'Ogre Warlord',   hp:1550, speed:30, armor:0.3, gold:220, leak:10, kind:'big', col:'#b0703a', size:24, ability:'stomp', abCd:8,  desc:'Stomps your troops flat!'},
 {id:'colossus',name:'Bone Colossus',  hp:2000, speed:27, armor:0.45,gold:280, leak:10, kind:'big', col:'#cfd0c2', size:25, ability:'summon',abCd:10, desc:'Raises skeletons as it marches.'},
 {id:'behemoth',name:'Swamp Behemoth', hp:2600, speed:25, armor:0.3, gold:340, leak:10, kind:'big', col:'#4f7a52', size:26, ability:'regen', abCd:1,  desc:'Regenerates. Burst it down!'},
 {id:'drake',   name:'Infernal Drake', hp:2300, speed:33, armor:0.35,gold:400, leak:10, kind:'drake',col:'#c2402a', size:24, ability:'burn',  abCd:1,  desc:'Scorches nearby defenders.'},
];

/* ---------- wave scaling ---------- */
const hpMul=w=>(1+0.16*w)*Math.pow(1.075,w);
const goldMul=w=>1+0.05*w+0.0008*w*w;
const waveReward=w=>Math.round(55+13*w+(w%10===0?150+8*w:0));
const speedMul=w=>Math.min(1.25,1+0.003*w);
const popCap=w=>Math.min(20,8+Math.floor(w/3));
const eliteChance=w=>Math.min(0.22,0.02+0.006*w);
const champChance=w=>w<15?0:Math.min(0.10,0.008*(w-12));
