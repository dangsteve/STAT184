/* ============================================================
   render.js — all drawing (procedural pixel-free art)
   ============================================================ */
'use strict';

let bgCanvas=null;

function buildBG(){
  bgCanvas=document.createElement('canvas');
  bgCanvas.width=CFG.W;bgCanvas.height=CFG.H;
  const c=bgCanvas.getContext('2d');
  /* grass */
  const g=c.createLinearGradient(0,0,0,CFG.H);
  g.addColorStop(0,'#4e8c42');g.addColorStop(0.5,'#457f3b');g.addColorStop(1,'#3a6d34');
  c.fillStyle=g;c.fillRect(0,0,CFG.W,CFG.H);
  const rng=mulberry32(777);
  for(let i=0;i<900;i++){
    const x=rng()*CFG.W,y=rng()*CFG.H;
    c.fillStyle=rng()<0.5?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.05)';
    c.fillRect(x,y,2+rng()*3,2+rng()*3);
  }
  /* soft vignette */
  const v=c.createRadialGradient(CFG.W/2,CFG.H/2,300,CFG.W/2,CFG.H/2,860);
  v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,0.28)');
  c.fillStyle=v;c.fillRect(0,0,CFG.W,CFG.H);
  /* path */
  c.lineCap='round';c.lineJoin='round';
  c.strokeStyle='#5d4a2e';c.lineWidth=52;pathStroke(c);
  c.strokeStyle='#8a6f45';c.lineWidth=44;pathStroke(c);
  c.strokeStyle='#a08252';c.lineWidth=38;pathStroke(c);
  /* stones on path */
  for(let d=20;d<PATH.total;d+=26){
    const p=posAt(d);
    const ox=(rng()-0.5)*26,oy=(rng()-0.5)*26;
    c.fillStyle='rgba(0,0,0,'+(0.06+rng()*0.08)+')';
    c.beginPath();c.ellipse(p.x+ox,p.y+oy,2.5+rng()*3,2+rng()*2,rng()*3,0,7);c.fill();
  }
  /* spawn portal (cave arch) */
  {
    const p=PATH_PTS[0];
    c.fillStyle='#2a2733';
    c.beginPath();c.ellipse(4,p.y,26,34,0,-Math.PI/2,Math.PI/2);c.fill();
    c.fillStyle='#3f3b4d';
    c.beginPath();c.ellipse(2,p.y,30,40,0,-Math.PI/2,Math.PI/2);c.lineWidth=6;c.strokeStyle='#4d4860';c.stroke();
    c.fillStyle='#181622';
    c.beginPath();c.ellipse(0,p.y,20,28,0,-Math.PI/2,Math.PI/2);c.fill();
  }
  /* decorations */
  for(const d of DECOR){
    const x=d.c*CFG.CELL+20+d.jx,y=d.r*CFG.CELL+20+d.jy,s=d.s;
    c.fillStyle='rgba(0,0,0,0.2)';
    c.beginPath();c.ellipse(x,y+8*s,12*s,4*s,0,0,7);c.fill();
    if(d.kind==='tree'){
      c.fillStyle='#6b4a2a';c.fillRect(x-2*s,y-4*s,4*s,12*s);
      c.fillStyle='#2e5d2a';c.beginPath();c.arc(x,y-12*s,13*s,0,7);c.fill();
      c.fillStyle='#3a7434';c.beginPath();c.arc(x-4*s,y-16*s,9*s,0,7);c.fill();
      c.fillStyle='#478741';c.beginPath();c.arc(x+3*s,y-15*s,7*s,0,7);c.fill();
    }else if(d.kind==='pine'){
      c.fillStyle='#6b4a2a';c.fillRect(x-2*s,y,4*s,8*s);
      c.fillStyle='#274f2c';
      for(let i=0;i<3;i++){
        const w=(14-i*4)*s,h=(10)*s,yy=y-i*8*s;
        c.beginPath();c.moveTo(x-w,yy);c.lineTo(x+w,yy);c.lineTo(x,yy-h);c.closePath();c.fill();
      }
    }else if(d.kind==='rock'){
      c.fillStyle='#8a8578';c.beginPath();c.ellipse(x,y,10*s,7*s,0.2,0,7);c.fill();
      c.fillStyle='#a29d8e';c.beginPath();c.ellipse(x-3*s,y-3*s,5*s,3.5*s,0.2,0,7);c.fill();
    }else{
      c.fillStyle='#3a7434';c.beginPath();c.arc(x,y,8*s,0,7);c.fill();
      c.fillStyle='#478741';c.beginPath();c.arc(x-3*s,y-3*s,5*s,0,7);c.fill();
    }
  }
  /* castle */
  drawCastleBase(c);
}
function pathStroke(c){
  c.beginPath();
  c.moveTo(PATH_PTS[0].x,PATH_PTS[0].y);
  for(let i=1;i<PATH_PTS.length;i++)c.lineTo(PATH_PTS[i].x,PATH_PTS[i].y);
  c.stroke();
}
function drawCastleBase(c){
  const cx=1235,cy=340;
  /* wall */
  c.fillStyle='rgba(0,0,0,0.25)';c.beginPath();c.ellipse(cx,cy+62,86,16,0,0,7);c.fill();
  const stone='#9a94a8',dark='#7d7890',light='#b4aec4';
  c.fillStyle=stone;c.fillRect(cx-70,cy-40,140,100);
  /* gate */
  c.fillStyle='#3a3345';c.beginPath();
  c.moveTo(cx-26,cy+60);c.lineTo(cx-26,cy);c.arc(cx,cy,26,Math.PI,0);c.lineTo(cx+26,cy+60);c.closePath();c.fill();
  c.strokeStyle='#5a5370';c.lineWidth=3;
  for(let i=-18;i<=18;i+=9){c.beginPath();c.moveTo(cx+i,cy+58);c.lineTo(cx+i,cy-10+Math.abs(i)*0.3);c.stroke();}
  /* crenellations */
  c.fillStyle=light;
  for(let i=0;i<7;i++)c.fillRect(cx-70+i*21,cy-50,13,12);
  /* side towers */
  for(const sx of [-70,70]){
    c.fillStyle=dark;c.fillRect(cx+sx-18,cy-70,36,130);
    c.fillStyle=light;
    for(let i=0;i<3;i++)c.fillRect(cx+sx-18+i*13,cy-80,9,12);
    c.fillStyle='#4d4860';c.fillRect(cx+sx-5,cy-58,10,14);
  }
  /* keep */
  c.fillStyle=stone;c.fillRect(cx-26,cy-95,52,55);
  c.fillStyle=light;
  for(let i=0;i<3;i++)c.fillRect(cx-26+i*19,cy-104,12,11);
  c.fillStyle='#4d4860';c.fillRect(cx-6,cy-85,12,16);
  /* brick lines */
  c.strokeStyle='rgba(0,0,0,0.12)';c.lineWidth=1;
  for(let yy=cy-30;yy<cy+55;yy+=12){c.beginPath();c.moveTo(cx-70,yy);c.lineTo(cx+70,yy);c.stroke();}
}
function drawCastleFlags(c,time){
  const cx=1235,cy=340;
  for(const [fx,fy] of [[cx-70,cy-84],[cx+70,cy-84],[cx,cy-108]]){
    c.strokeStyle='#6b4a2a';c.lineWidth=2;
    c.beginPath();c.moveTo(fx,fy);c.lineTo(fx,fy-20);c.stroke();
    const wav=Math.sin(time*4+fx)*3;
    c.fillStyle='#c23a3a';
    c.beginPath();c.moveTo(fx,fy-20);c.lineTo(fx+16,fy-16+wav);c.lineTo(fx,fy-11);c.closePath();c.fill();
  }
}

/* ============ towers ============ */
function drawTower(c,t){
  const def=TOWER_BY[t.id],lvl=t.lvl,x=t.x,y=t.y;
  const s=1+0.07*(lvl-1);
  c.save();c.translate(x,y);c.scale(s,s);
  c.fillStyle='rgba(0,0,0,0.25)';c.beginPath();c.ellipse(0,8,15,6,0,0,7);c.fill();
  /* base by level */
  if(lvl<=2){
    c.fillStyle='#7d6a4a';c.beginPath();c.arc(0,2,13,0,7);c.fill();
    c.fillStyle='#93805c';c.beginPath();c.arc(0,0,12,0,7);c.fill();
    c.strokeStyle='rgba(0,0,0,0.2)';c.lineWidth=1.5;
    for(let a=0;a<6;a++){c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a*1.05)*12,Math.sin(a*1.05)*12);c.stroke();}
  }else{
    c.fillStyle='#8d8798';c.fillRect(-13,-10,26,20);
    c.fillStyle='#a6a0b4';c.fillRect(-13,-13,26,6);
    c.fillStyle='#b9b3c8';
    for(let i=0;i<4;i++)c.fillRect(-13+i*7.4,-16,5,5);
    c.strokeStyle='rgba(0,0,0,0.12)';c.lineWidth=1;
    for(let yy=-6;yy<10;yy+=5){c.beginPath();c.moveTo(-13,yy);c.lineTo(13,yy);c.stroke();}
  }
  if(lvl>=4){c.strokeStyle=def.hue;c.lineWidth=2;c.strokeRect(-13,-13,26,6);}
  if(lvl>=5){
    c.strokeStyle='rgba(255,215,94,0.8)';c.lineWidth=2;
    c.beginPath();c.arc(0,0,17,0,7);c.stroke();
  }
  /* turret */
  const hue=def.hue;
  switch(def.id){
    case 'archer':{
      c.fillStyle='#6b4a2a';c.fillRect(-3,-26,6,16);
      c.fillStyle=hue;c.beginPath();c.arc(0,-26,6,0,7);c.fill();
      c.save();c.translate(0,-22);c.rotate(t.ang);
      c.strokeStyle='#e8dcb0';c.lineWidth=2;
      c.beginPath();c.arc(6,0,6,-1.2,1.2);c.stroke();
      c.beginPath();c.moveTo(6+Math.cos(-1.2)*6,Math.sin(-1.2)*6);c.lineTo(6+Math.cos(1.2)*6,Math.sin(1.2)*6);c.stroke();
      c.restore();break;}
    case 'cannon':{
      c.save();c.translate(0,-14);c.rotate(t.ang);
      c.fillStyle='#3f4450';c.fillRect(-4,-6,20,12);
      c.fillStyle='#565c6b';c.fillRect(-4,-6,20,4);
      c.beginPath();c.arc(0,0,8,0,7);c.fillStyle='#2f333d';c.fill();
      c.restore();break;}
    case 'frost':{
      c.fillStyle='#bfe9f7';
      c.beginPath();c.moveTo(0,-38);c.lineTo(7,-18);c.lineTo(-7,-18);c.closePath();c.fill();
      c.fillStyle=hue;
      c.beginPath();c.moveTo(0,-34);c.lineTo(5,-19);c.lineTo(-5,-19);c.closePath();c.fill();
      c.fillStyle='rgba(190,240,255,0.5)';c.beginPath();c.arc(0,-24,9+Math.sin(G?G.time*3:0)*1.5,0,7);c.fill();
      break;}
    case 'flame':{
      c.fillStyle='#4b4033';c.beginPath();c.arc(0,-16,8,Math.PI,0);c.fill();c.fillRect(-8,-16,16,5);
      const fl=Math.sin((G?G.time:0)*9+x)*2;
      c.fillStyle='#ff7a2a';c.beginPath();c.ellipse(0,-22,5,8+fl,0,0,7);c.fill();
      c.fillStyle='#ffd75e';c.beginPath();c.ellipse(0,-21,2.5,4.5+fl*0.6,0,0,7);c.fill();
      break;}
    case 'ballista':{
      c.save();c.translate(0,-16);c.rotate(t.ang);
      c.fillStyle='#6b4a2a';c.fillRect(-6,-3,22,6);
      c.strokeStyle='#a8743a';c.lineWidth=3;
      c.beginPath();c.moveTo(4,-10);c.quadraticCurveTo(16,0,4,10);c.stroke();
      c.strokeStyle='#e8dcb0';c.lineWidth=1.5;
      c.beginPath();c.moveTo(4,-10);c.lineTo(-4,0);c.lineTo(4,10);c.stroke();
      c.restore();break;}
    case 'poison':{
      c.fillStyle='#4b4033';c.beginPath();c.arc(0,-15,9,Math.PI*0.9,Math.PI*0.1);c.fill();c.fillRect(-9,-16,18,6);
      const bub=Math.sin((G?G.time:0)*5+x)*1.5;
      c.fillStyle='#8ee05a';c.beginPath();c.ellipse(0,-19,7,4+bub*0.5,0,0,7);c.fill();
      c.fillStyle='#b8f090';c.beginPath();c.arc(-2,-21-bub,2,0,7);c.fill();
      break;}
    case 'storm':{
      c.fillStyle='#6b6280';c.fillRect(-3,-32,6,22);
      const pu=1+Math.sin((G?G.time:0)*6+x)*0.15;
      c.fillStyle='rgba(180,140,232,0.35)';c.beginPath();c.arc(0,-34,9*pu,0,7);c.fill();
      c.fillStyle=hue;c.beginPath();c.arc(0,-34,5*pu,0,7);c.fill();
      c.fillStyle='#fff';c.beginPath();c.arc(0,-34,2,0,7);c.fill();
      break;}
    case 'mint':{
      c.fillStyle='#8a6f45';c.fillRect(-11,-24,22,16);
      c.fillStyle='#a08252';c.beginPath();c.moveTo(-13,-24);c.lineTo(0,-34);c.lineTo(13,-24);c.closePath();c.fill();
      c.fillStyle='#ffd75e';c.beginPath();c.arc(0,-16,5,0,7);c.fill();
      c.fillStyle='#c9a227';c.font='bold 7px sans-serif';c.textAlign='center';c.fillText('$',0,-13.5);
      break;}
    case 'beacon':{
      c.fillStyle='#b4aec4';c.fillRect(-4,-30,8,20);
      const pu=0.5+Math.sin((G?G.time:0)*3+x)*0.2;
      c.fillStyle='rgba(240,230,180,'+pu+')';c.beginPath();c.arc(0,-33,8,0,7);c.fill();
      c.fillStyle='#fff8d8';c.beginPath();c.arc(0,-33,4,0,7);c.fill();
      break;}
  }
  /* level pips */
  c.fillStyle='#ffd75e';
  for(let i=0;i<lvl;i++){
    c.beginPath();c.arc(-10+i*5,14,1.8,0,7);c.fill();
  }
  c.restore();
}

/* ============ enemies ============ */
function drawEnemy(c,e){
  const x=e.x,y=e.y,s=e.size,def=e.def;
  const bob=Math.sin(e.anim*6)*1.5;
  c.save();c.translate(x,y);
  /* shadow */
  c.fillStyle='rgba(0,0,0,0.25)';c.beginPath();c.ellipse(0,s*0.55,s*0.9,s*0.32,0,0,7);c.fill();
  /* rarity aura */
  if(e.rarity){
    const col=e.rarity==='champ'?'255,215,94':'200,139,255';
    const pu=0.35+Math.sin(G.time*5)*0.12;
    c.fillStyle='rgba('+col+','+pu+')';
    c.beginPath();c.ellipse(0,s*0.5,s*1.2,s*0.45,0,0,7);c.fill();
  }
  if(e.boss){
    const pu=0.3+Math.sin(G.time*4)*0.1;
    c.strokeStyle='rgba(255,90,90,'+pu+')';c.lineWidth=3;
    c.beginPath();c.ellipse(0,s*0.55,s*1.35,s*0.5,0,0,7);c.stroke();
  }
  c.translate(0,bob);
  if(def.kind==='beast'){
    /* wolf: body horizontal */
    const leg=Math.sin(e.anim*8)*3;
    c.strokeStyle='#5a5f68';c.lineWidth=2.5;
    c.beginPath();c.moveTo(-s*0.5,0);c.lineTo(-s*0.5+leg,s*0.7);c.moveTo(s*0.4,0);c.lineTo(s*0.4-leg,s*0.7);c.stroke();
    c.fillStyle=def.col;c.beginPath();c.ellipse(0,0,s,s*0.5,0,0,7);c.fill();
    c.beginPath();c.arc(s*0.9,-s*0.2,s*0.42,0,7);c.fill();
    c.fillStyle='#6a6f78';
    c.beginPath();c.moveTo(s*0.8,-s*0.55);c.lineTo(s*0.95,-s*0.9);c.lineTo(s*1.05,-s*0.5);c.closePath();c.fill();
    c.fillStyle='#ff5a5a';c.beginPath();c.arc(s*1.05,-s*0.25,1.6,0,7);c.fill();
    c.strokeStyle=def.col;c.lineWidth=3;
    c.beginPath();c.moveTo(-s,0);c.quadraticCurveTo(-s*1.4,-s*0.4-leg*0.1,-s*1.5,-s*0.1);c.stroke();
  }else if(def.kind==='ghost'){
    const fl=Math.sin(e.anim*4)*2;
    c.globalAlpha=0.82;
    c.fillStyle=def.col;
    c.beginPath();c.arc(0,-s*0.5+fl,s*0.7,Math.PI,0);
    c.lineTo(s*0.7,s*0.3+fl);
    for(let i=2;i>=-2;i--)c.lineTo(i*s*0.35,s*0.3+fl+((i%2)?-3:3));
    c.closePath();c.fill();
    c.fillStyle='#1a1826';
    c.beginPath();c.arc(-s*0.25,-s*0.5+fl,2.2,0,7);c.fill();
    c.beginPath();c.arc(s*0.25,-s*0.5+fl,2.2,0,7);c.fill();
    if(def.id==='harpy'){
      c.globalAlpha=1;
      const w=Math.sin(e.anim*10)*s*0.5;
      c.fillStyle='#b05a6a';
      c.beginPath();c.moveTo(-s*0.4,-s*0.4);c.quadraticCurveTo(-s*1.4,-s*0.8-w,-s*1.2,-s*0.1);c.closePath();c.fill();
      c.beginPath();c.moveTo(s*0.4,-s*0.4);c.quadraticCurveTo(s*1.4,-s*0.8-w,s*1.2,-s*0.1);c.closePath();c.fill();
    }
    c.globalAlpha=1;
  }else if(def.kind==='drake'){
    const w=Math.sin(e.anim*7)*s*0.4;
    c.fillStyle='#8a2a1a';
    c.beginPath();c.moveTo(-s*0.3,-s*0.5);c.quadraticCurveTo(-s*1.6,-s*1.1-w,-s*1.3,0);c.closePath();c.fill();
    c.beginPath();c.moveTo(s*0.3,-s*0.5);c.quadraticCurveTo(s*1.6,-s*1.1-w,s*1.3,0);c.closePath();c.fill();
    c.fillStyle=def.col;
    c.beginPath();c.ellipse(0,0,s*0.85,s*0.6,0,0,7);c.fill();
    c.beginPath();c.arc(s*0.7,-s*0.5,s*0.4,0,7);c.fill();
    c.fillStyle='#ffd75e';c.beginPath();c.arc(s*0.82,-s*0.55,2.5,0,7);c.fill();
    c.strokeStyle=def.col;c.lineWidth=4;
    c.beginPath();c.moveTo(-s*0.8,0);c.quadraticCurveTo(-s*1.5,s*0.3,-s*1.7,-s*0.2);c.stroke();
    const fl2=Math.sin(e.anim*9);
    c.fillStyle='rgba(255,122,42,'+(0.5+fl2*0.2)+')';
    c.beginPath();c.arc(s*1.05,-s*0.45,3+fl2,0,7);c.fill();
  }else{
    /* biped & big */
    const leg=Math.sin(e.anim*8)*(def.kind==='big'?2:3);
    c.strokeStyle='rgba(0,0,0,0.4)';c.lineWidth=def.kind==='big'?4:2.5;
    c.beginPath();c.moveTo(-s*0.25,s*0.2);c.lineTo(-s*0.25-leg,s*0.85);
    c.moveTo(s*0.25,s*0.2);c.lineTo(s*0.25+leg,s*0.85);c.stroke();
    /* body */
    c.fillStyle=def.col;
    c.beginPath();c.ellipse(0,-s*0.1,s*0.62,s*0.72,0,0,7);c.fill();
    /* head */
    const hcol=def.id==='skel'||def.id==='armskel'?'#e8e4d4':shade(def.col,18);
    c.fillStyle=hcol;
    c.beginPath();c.arc(0,-s*0.95,s*0.4,0,7);c.fill();
    /* eyes */
    c.fillStyle=def.id==='skel'||def.id==='armskel'?'#2a2733':(e.boss?'#ffd75e':'#1a1826');
    c.beginPath();c.arc(-s*0.14,-s*0.98,s*0.08,0,7);c.fill();
    c.beginPath();c.arc(s*0.14,-s*0.98,s*0.08,0,7);c.fill();
    /* armor */
    if(def.armor>=0.4){
      c.fillStyle='rgba(200,205,220,0.85)';
      c.beginPath();c.ellipse(0,-s*0.2,s*0.55,s*0.5,0,0,7);c.fill();
      c.fillStyle='rgba(120,125,145,0.9)';
      c.beginPath();c.arc(0,-s*0.95,s*0.42,Math.PI*0.95,Math.PI*2.05);c.fill();
    }
    /* weapon swing */
    const sw=e.blk?Math.sin(G.time*10)*0.5:0.2;
    c.save();c.translate(s*0.55,-s*0.3);c.rotate(0.6+sw);
    if(def.kind==='big'){
      c.fillStyle='#6b4a2a';c.fillRect(-2,-s*1.1,5,s*1.2);
      c.fillStyle='#8a8578';c.beginPath();c.arc(0.5,-s*1.1,s*0.28,0,7);c.fill();
    }else{
      c.strokeStyle='#c8ccd8';c.lineWidth=2.5;
      c.beginPath();c.moveTo(0,2);c.lineTo(0,-s*0.9);c.stroke();
      c.strokeStyle='#6b4a2a';c.lineWidth=3;
      c.beginPath();c.moveTo(-3,0);c.lineTo(3,0);c.stroke();
    }
    c.restore();
    if(def.healer){
      const pu=0.4+Math.sin(G.time*6)*0.2;
      c.fillStyle='rgba(200,139,224,'+pu+')';
      c.beginPath();c.arc(0,-s*1.5,3,0,7);c.fill();
    }
  }
  c.restore();
  /* status icons */
  if(e.slowT>0){c.fillStyle='#aee6ff';c.font='9px sans-serif';c.textAlign='center';c.fillText('❄',x-10,y-s-8);}
  if(e.burnT>0){c.fillStyle='#ff9a3a';c.font='9px sans-serif';c.textAlign='center';c.fillText('🔥',x+10,y-s-8);}
  if(e.poison.length){c.fillStyle='#8ee05a';c.beginPath();c.arc(x,y-s-10,2.5,0,7);c.fill();}
  /* hp bar */
  if(e.hp<e.maxHp){
    const w=Math.max(18,s*2),pct=e.hp/e.maxHp;
    c.fillStyle='rgba(0,0,0,0.5)';c.fillRect(x-w/2,y-s-16,w,4);
    c.fillStyle=pct>0.5?'#6ad06a':pct>0.25?'#e8c93a':'#e05a5a';
    c.fillRect(x-w/2,y-s-16,w*pct,4);
  }
}
function shade(hex,amt){
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)+amt,g=((n>>8)&255)+amt,b=(n&255)+amt;
  r=clamp(r,0,255);g=clamp(g,0,255);b=clamp(b,0,255);
  return 'rgb('+r+','+g+','+b+')';
}

/* ============ troops ============ */
const TROOP_COLS={militia:'#8a9aa8',archer:'#5d8a4a',sword:'#6a7ca8',spear:'#8a7ca0',xbow:'#4a7a6a',
  berserker:'#b06a3a',knight:'#9aa4c0',mage:'#7a5ac0',cleric:'#e8e0c8',cavalry:'#a8845a',paladin:'#e0d090',giant:'#7a8a90'};
function drawTroop(c,tr){
  const def=TROOP_BY[tr.id],col=TROOP_COLS[tr.id]||'#8aa';
  const s=def.id==='giant'?16:10;
  const x=tr.x,y=tr.y;
  const walk=tr.state==='walk'?Math.sin(tr.anim*8)*3:0;
  c.save();c.translate(x,y);
  c.fillStyle='rgba(0,0,0,0.25)';c.beginPath();c.ellipse(0,s*0.55,s*0.8,s*0.3,0,0,7);c.fill();
  if(def.id==='cavalry'){
    /* horse */
    const leg=Math.sin(tr.anim*10)*4;
    c.strokeStyle='#7a5a3a';c.lineWidth=2.5;
    c.beginPath();c.moveTo(-6,2);c.lineTo(-6+leg,10);c.moveTo(6,2);c.lineTo(6-leg,10);c.stroke();
    c.fillStyle='#8a6a44';c.beginPath();c.ellipse(0,0,11,5.5,0,0,7);c.fill();
    c.beginPath();c.arc(10*tr.face,-4,4,0,7);c.fill();
    /* rider */
    c.fillStyle=col;c.beginPath();c.arc(0,-9,4.5,0,7);c.fill();
    c.fillStyle='#d8ccb0';c.beginPath();c.arc(0,-14,3,0,7);c.fill();
    c.strokeStyle='#c8ccd8';c.lineWidth=2;
    c.beginPath();c.moveTo(4*tr.face,-8);c.lineTo(10*tr.face,-14-(tr.swing>0?4:0));c.stroke();
  }else{
    const leg=walk;
    c.strokeStyle='rgba(0,0,0,0.45)';c.lineWidth=s<12?2.2:3.5;
    c.beginPath();c.moveTo(-s*0.22,s*0.15);c.lineTo(-s*0.22-leg,s*0.8);
    c.moveTo(s*0.22,s*0.15);c.lineTo(s*0.22+leg,s*0.8);c.stroke();
    c.fillStyle=col;
    c.beginPath();c.ellipse(0,-s*0.15,s*0.55,s*0.65,0,0,7);c.fill();
    /* head */
    c.fillStyle='#d8ccb0';
    c.beginPath();c.arc(0,-s*0.95,s*0.36,0,7);c.fill();
    /* helmet for armored */
    if(def.armor){
      c.fillStyle='#c0c6d8';
      c.beginPath();c.arc(0,-s*0.98,s*0.38,Math.PI*0.9,Math.PI*2.1);c.fill();
      c.fillRect(-s*0.38,-s*0.98,s*0.76,s*0.14);
    }
    /* weapon */
    const sw=tr.swing>0?-0.9:0.3;
    c.save();c.translate(s*0.5*tr.face,-s*0.35);c.rotate((0.5+sw)*tr.face);
    if(def.melee){
      if(def.id==='giant'){
        c.fillStyle='#6b4a2a';c.fillRect(-2.5,-s*1.2,6,s*1.3);
        c.fillStyle='#8a8578';c.beginPath();c.arc(0.5,-s*1.2,s*0.3,0,7);c.fill();
      }else if(def.id==='spear'){
        c.strokeStyle='#8a6f45';c.lineWidth=2;
        c.beginPath();c.moveTo(0,4);c.lineTo(0,-s*1.4);c.stroke();
        c.fillStyle='#c8ccd8';c.beginPath();c.moveTo(-2.5,-s*1.4);c.lineTo(2.5,-s*1.4);c.lineTo(0,-s*1.75);c.closePath();c.fill();
      }else{
        c.strokeStyle='#dde2ee';c.lineWidth=2.2;
        c.beginPath();c.moveTo(0,2);c.lineTo(0,-s*0.95);c.stroke();
        c.strokeStyle='#6b4a2a';c.lineWidth=2.6;
        c.beginPath();c.moveTo(-3,0);c.lineTo(3,0);c.stroke();
      }
    }else if(def.id==='mage'){
      c.strokeStyle='#6b4a2a';c.lineWidth=2;
      c.beginPath();c.moveTo(0,4);c.lineTo(0,-s*1.2);c.stroke();
      c.fillStyle='#c88bff';c.beginPath();c.arc(0,-s*1.25,3,0,7);c.fill();
    }else if(def.id==='cleric'){
      c.strokeStyle='#e8c93a';c.lineWidth=2.5;
      c.beginPath();c.moveTo(0,2);c.lineTo(0,-s*1.0);c.moveTo(-3,-s*0.75);c.lineTo(3,-s*0.75);c.stroke();
    }else{
      /* bow / crossbow */
      c.strokeStyle='#8a6f45';c.lineWidth=2;
      c.beginPath();c.arc(2,-s*0.5,s*0.5,-1.2,1.2);c.stroke();
    }
    c.restore();
    /* shield */
    if(def.armor){
      c.fillStyle='#7a84a8';
      c.beginPath();c.ellipse(-s*0.5*tr.face,-s*0.25,s*0.25,s*0.4,0,0,7);c.fill();
    }
  }
  c.restore();
  /* hp bar */
  if(tr.hp<tr.maxHp){
    const w=20,pct=clamp(tr.hp/tr.maxHp,0,1);
    c.fillStyle='rgba(0,0,0,0.5)';c.fillRect(x-w/2,y-s-14,w,3);
    c.fillStyle='#5aa8e0';c.fillRect(x-w/2,y-s-14,w*pct,3);
  }
}

/* ============ hero ============ */
function drawHero(c,h){
  if(h.dead)return;
  const tier=Math.min(4,Math.floor((G.heroLvl-1)/5));
  const armorCol=['#7a9ab8','#7cc4ff','#ffd75e','#5ae0b8','#e07aff'][tier];
  const capeCol=['#a83a3a','#c23a3a','#c23a8a','#3ac2a0','#8a3ac2'][tier];
  const s=13,x=h.x,y=h.y;
  const walk=Math.abs(h.x-h.homeX)+Math.abs(h.y-h.homeY)>6?Math.sin(h.anim*8)*3:0;
  c.save();c.translate(x,y);
  c.fillStyle='rgba(0,0,0,0.3)';c.beginPath();c.ellipse(0,s*0.55,s*0.85,s*0.32,0,0,7);c.fill();
  /* glow ring */
  const pu=0.25+Math.sin(G.time*4)*0.1;
  c.strokeStyle='rgba(124,196,255,'+pu+')';c.lineWidth=2;
  c.beginPath();c.ellipse(0,s*0.5,s*1.1,s*0.4,0,0,7);c.stroke();
  /* cape */
  c.fillStyle=capeCol;
  c.beginPath();c.moveTo(-s*0.3*h.face,-s*0.7);
  c.quadraticCurveTo(-s*1.1*h.face,-s*0.1+Math.sin(h.anim*6)*2,-s*0.7*h.face,s*0.6);
  c.lineTo(-s*0.1*h.face,-s*0.1);c.closePath();c.fill();
  /* legs */
  c.strokeStyle='#3a4050';c.lineWidth=3;
  c.beginPath();c.moveTo(-s*0.2,s*0.1);c.lineTo(-s*0.2-walk,s*0.8);
  c.moveTo(s*0.2,s*0.1);c.lineTo(s*0.2+walk,s*0.8);c.stroke();
  /* body */
  c.fillStyle=armorCol;
  c.beginPath();c.ellipse(0,-s*0.2,s*0.55,s*0.68,0,0,7);c.fill();
  c.fillStyle='rgba(255,255,255,0.25)';
  c.beginPath();c.ellipse(-s*0.15,-s*0.4,s*0.2,s*0.3,0,0,7);c.fill();
  /* helmet */
  c.fillStyle=shadeC(armorCol,-20);
  c.beginPath();c.arc(0,-s*0.98,s*0.4,0,7);c.fill();
  c.fillStyle='#1a1826';c.fillRect(-s*0.28,-s*1.08,s*0.56,s*0.16);
  /* plume */
  c.fillStyle=capeCol;
  c.beginPath();c.ellipse(0,-s*1.45,s*0.12,s*0.3,0,0,7);c.fill();
  /* sword */
  const sw=h.swing>0?-1.4:0.4;
  c.save();c.translate(s*0.55*h.face,-s*0.35);c.rotate((0.5+sw)*h.face);
  c.strokeStyle='#f0f4ff';c.lineWidth=3;
  c.beginPath();c.moveTo(0,2);c.lineTo(0,-s*1.3);c.stroke();
  if(tier>=2){c.strokeStyle='rgba(255,215,94,0.6)';c.lineWidth=6;c.beginPath();c.moveTo(0,-2);c.lineTo(0,-s*1.3);c.stroke();}
  c.strokeStyle='#c9a227';c.lineWidth=3;
  c.beginPath();c.moveTo(-4,0);c.lineTo(4,0);c.stroke();
  c.restore();
  c.restore();
  /* hp bar */
  const w=26,pct=clamp(h.hp/h.maxHp,0,1);
  c.fillStyle='rgba(0,0,0,0.5)';c.fillRect(x-w/2,y-s-16,w,4);
  c.fillStyle='#7cc4ff';c.fillRect(x-w/2,y-s-16,w*pct,4);
}
function shadeC(col,amt){
  if(col[0]==='#')return shade(col,amt);
  return col;
}

/* ============ projectiles & fx ============ */
function drawProj(c,p){
  if(p.kind==='arrow'){
    c.save();c.translate(p.x,p.y);c.rotate(p.ang||0);
    c.strokeStyle='#e8dcb0';c.lineWidth=2;
    c.beginPath();c.moveTo(-6,0);c.lineTo(6,0);c.stroke();
    c.fillStyle='#c8ccd8';c.beginPath();c.moveTo(6,0);c.lineTo(2,-2);c.lineTo(2,2);c.closePath();c.fill();
    c.restore();
  }else if(p.kind==='shard'){
    c.save();c.translate(p.x,p.y);c.rotate(p.ang||0);
    c.fillStyle='#bfe9f7';c.beginPath();c.moveTo(7,0);c.lineTo(-5,-3);c.lineTo(-5,3);c.closePath();c.fill();
    c.restore();
  }else if(p.kind==='ball'){
    c.fillStyle='#2f333d';c.beginPath();c.arc(p.x,p.y,5,0,7);c.fill();
    c.fillStyle='rgba(255,176,42,0.7)';c.beginPath();c.arc(p.x-2,p.y-2,1.6,0,7);c.fill();
  }else if(p.kind==='glob'){
    c.fillStyle='#8ee05a';c.beginPath();c.arc(p.x,p.y,4.5,0,7);c.fill();
    c.fillStyle='#c8f0a0';c.beginPath();c.arc(p.x-1,p.y-1,1.6,0,7);c.fill();
  }else if(p.kind==='bolt'){
    c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.vy,p.vx));
    c.strokeStyle='#a8743a';c.lineWidth=3.5;
    c.beginPath();c.moveTo(-10,0);c.lineTo(8,0);c.stroke();
    c.fillStyle='#e8e4d4';c.beginPath();c.moveTo(10,0);c.lineTo(4,-3);c.lineTo(4,3);c.closePath();c.fill();
    c.restore();
  }else if(p.kind==='tproj'){
    c.fillStyle=p.col||'#e8dcb0';
    c.beginPath();c.arc(p.x,p.y,p.splash?4:2.5,0,7);c.fill();
    if(p.splash){c.fillStyle='rgba(200,139,255,0.4)';c.beginPath();c.arc(p.x,p.y,7,0,7);c.fill();}
  }
}
function drawFx(c,f){
  const u=1-f.life/(f.maxLife||f.life+0.0001);
  if(f.kind==='ring'){
    const t=1-f.life/0.7;
    const r=f.r+(f.maxR-f.r)*Math.min(1,(1-f.life/(f.life0||0.5)));
    c.strokeStyle=f.col;c.globalAlpha=Math.max(0,f.life*2);c.lineWidth=3;
    c.beginPath();c.arc(f.x,f.y,f.curR===undefined?(f.curR=f.r):f.curR+=(f.maxR-f.r)*0.12,0,7);c.stroke();
    c.globalAlpha=1;
  }else if(f.kind==='zap'){
    c.strokeStyle='rgba(220,190,255,'+Math.max(0,f.life*5)+')';c.lineWidth=2.5;
    c.beginPath();
    for(let i=0;i<f.pts.length-1;i++){
      const a=f.pts[i],b=f.pts[i+1];
      c.moveTo(a.x,a.y);
      const mx=(a.x+b.x)/2+rnd(-6,6),my=(a.y+b.y)/2+rnd(-6,6);
      c.lineTo(mx,my);c.lineTo(b.x,b.y);
    }
    c.stroke();
    c.strokeStyle='rgba(255,255,255,'+Math.max(0,f.life*4)+')';c.lineWidth=1;
    c.stroke();
  }else if(f.kind==='heal'){
    c.fillStyle='rgba(120,230,140,'+Math.max(0,f.life*1.6)+')';
    c.font='11px sans-serif';c.textAlign='center';
    c.fillText('+',f.x,f.y-14-(0.5-f.life)*20);
  }else if(f.kind==='slash'){
    c.strokeStyle='rgba(255,138,106,'+Math.max(0,f.life*5)+')';c.lineWidth=2;
    c.beginPath();c.moveTo(f.x-7,f.y-7);c.lineTo(f.x+7,f.y+7);c.stroke();
  }else if(f.kind==='flag'){
    c.globalAlpha=Math.max(0,f.life);
    c.strokeStyle=f.col;c.lineWidth=2;
    c.beginPath();c.arc(f.x,f.y,14*(1-f.life)+6,0,7);c.stroke();
    c.globalAlpha=1;
  }
}

/* ============ main frame ============ */
function drawFrame(c,UIS){
  c.save();
  if(G.shake>0)c.translate(rnd(-G.shake,G.shake)*0.5,rnd(-G.shake,G.shake)*0.5);
  c.drawImage(bgCanvas,0,0);
  drawCastleFlags(c,G.time);

  /* rally flag */
  {
    const p=posAt(G.rallyD);
    c.strokeStyle='#6b4a2a';c.lineWidth=2;
    c.beginPath();c.moveTo(p.x,p.y-2);c.lineTo(p.x,p.y-22);c.stroke();
    const wav=Math.sin(G.time*5)*2;
    c.fillStyle='#5aa8e0';
    c.beginPath();c.moveTo(p.x,p.y-22);c.lineTo(p.x+13,p.y-18+wav);c.lineTo(p.x,p.y-13);c.closePath();c.fill();
  }
  /* hero home marker */
  if(G.hero){
    c.strokeStyle='rgba(124,196,255,0.35)';c.lineWidth=1.5;
    c.beginPath();c.arc(G.hero.homeX,G.hero.homeY,8,0,7);c.stroke();
  }

  /* build preview */
  if(UIS.mode==='build'&&UIS.hoverC>=0){
    const ok=canPlace(UIS.hoverC,UIS.hoverR)&&G.gold>=TOWER_BY[UIS.buildType].cost;
    const x=UIS.hoverC*CFG.CELL,y=UIS.hoverR*CFG.CELL;
    c.fillStyle=ok?'rgba(120,230,140,0.3)':'rgba(230,90,90,0.3)';
    c.fillRect(x,y,CFG.CELL,CFG.CELL);
    c.strokeStyle=ok?'rgba(120,230,140,0.8)':'rgba(230,90,90,0.8)';
    c.strokeRect(x+1,y+1,CFG.CELL-2,CFG.CELL-2);
    const def=TOWER_BY[UIS.buildType];
    if(def.range){
      const st=towerStat(def,1);
      c.fillStyle='rgba(255,255,255,0.08)';
      c.beginPath();c.arc(x+20,y+20,st.range,0,7);c.fill();
      c.strokeStyle='rgba(255,255,255,0.35)';c.lineWidth=1.5;
      c.beginPath();c.arc(x+20,y+20,st.range,0,7);c.stroke();
    }
  }
  /* selected tower range */
  if(UIS.selTower&&G.towers.includes(UIS.selTower)){
    const t=UIS.selTower,def=TOWER_BY[t.id];
    if(def.range){
      const st=towerStat(def,t.lvl);
      c.fillStyle=def.id==='beacon'?'rgba(240,230,180,0.1)':'rgba(255,255,255,0.07)';
      c.beginPath();c.arc(t.x,t.y,st.range,0,7);c.fill();
      c.strokeStyle='rgba(255,255,255,0.4)';c.lineWidth=1.5;
      c.beginPath();c.arc(t.x,t.y,st.range,0,7);c.stroke();
    }
    c.strokeStyle='#ffd75e';c.lineWidth=2;
    c.strokeRect(t.c*CFG.CELL+2,t.r*CFG.CELL+2,CFG.CELL-4,CFG.CELL-4);
  }

  /* y-sorted entities */
  const ents=[];
  for(const t of G.towers)ents.push({y:t.y,k:'t',o:t});
  for(const e of G.enemies)ents.push({y:e.y,k:'e',o:e});
  for(const tr of G.troops)ents.push({y:tr.y,k:'r',o:tr});
  if(G.hero&&!G.hero.dead)ents.push({y:G.hero.y,k:'h',o:G.hero});
  ents.sort((a,b)=>a.y-b.y);
  for(const en of ents){
    if(en.k==='t')drawTower(c,en.o);
    else if(en.k==='e')drawEnemy(c,en.o);
    else if(en.k==='r')drawTroop(c,en.o);
    else drawHero(c,en.o);
  }

  for(const p of G.projs)drawProj(c,p);
  for(const f of G.fx)drawFx(c,f);
  /* particles */
  for(const p of G.parts){
    c.globalAlpha=Math.max(0,p.life/p.maxLife);
    c.fillStyle=p.col;
    c.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);
  }
  c.globalAlpha=1;
  /* floating texts */
  c.textAlign='center';
  for(const t of G.texts){
    c.globalAlpha=Math.max(0,Math.min(1,t.life/t.maxLife*1.6));
    c.font='bold 13px Georgia, serif';
    c.strokeStyle='rgba(0,0,0,0.7)';c.lineWidth=3;
    c.strokeText(t.txt,t.x,t.y);
    c.fillStyle=t.col;
    c.fillText(t.txt,t.x,t.y);
  }
  c.globalAlpha=1;

  /* boss hp bar */
  const boss=G.enemies.find(e=>e.boss&&!e.dead);
  if(boss){
    const w=420,x=(CFG.W-w)/2,y=16;
    c.fillStyle='rgba(0,0,0,0.6)';
    roundRect(c,x-8,y-6,w+16,30,8);c.fill();
    c.fillStyle='#3a2020';c.fillRect(x,y+8,w,10);
    c.fillStyle='#e05a5a';c.fillRect(x,y+8,w*clamp(boss.hp/boss.maxHp,0,1),10);
    c.strokeStyle='#ffd75e';c.lineWidth=1.5;c.strokeRect(x,y+8,w,10);
    c.fillStyle='#ffd75e';c.font='bold 12px Georgia, serif';c.textAlign='center';
    c.fillText('☠ '+boss.def.name+(boss.tier>1?' '+(['','II','III','IV','V'][boss.tier]||('x'+boss.tier)):'')+' ☠',CFG.W/2,y+2);
  }

  /* wave banner */
  if(G.bannerT>0&&G.waveBanner){
    const a=Math.min(1,G.bannerT);
    c.globalAlpha=a;
    c.font='bold 30px Georgia, serif';c.textAlign='center';
    c.strokeStyle='rgba(0,0,0,0.8)';c.lineWidth=6;
    c.strokeText(G.waveBanner,CFG.W/2,boss?92:70);
    c.fillStyle='#ffd75e';
    c.fillText(G.waveBanner,CFG.W/2,boss?92:70);
    c.globalAlpha=1;
  }
  c.restore();
}
function roundRect(c,x,y,w,h,r){
  c.beginPath();
  c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
}
