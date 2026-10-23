"use strict";
/* ---------- Edit mode: line of active dice, pile of removed ones ---------- */
let editing=false, modeT=0, editAnchor=5, lineArr=[], dragging=null;
const PILE=[[-0.5,0],[0.5,0.45],[0.5,-0.55],[-0.5,-1.0],[1.5,0],[-1.5,-0.5]];
function editLine(){
  const n=ringList.length, a=order.indexOf(editAnchor);
  const L=[]; for(let j=0;j<N;j++){ const i=order[(a+j)%N]; if(active.has(i)) L.push(i); }
  const k=Math.floor((n-1)/2);
  return {line:L.slice(n-k).concat(L.slice(0,n-k)), center:k};
}
const toWorldY=py=>(cy-py)/ppu, toWorldX=px=>(px-W/2)/ppu;
const lineSpacing=n=>Math.min(130,(W-16)/n);
const lineDiam=n=>Math.min(108, lineSpacing(n)*0.86);
// Row sits in the upper part of the screen; the pile fits between the row's badges and the close button.
function geom(n){
  const ly=H*0.36, LD=lineDiam(Math.max(1,n));
  const top=ly+LD*0.5+34, bottom=H-112;
  const PD=clamp(Math.min(W*0.15,(bottom-top)/2.92),40,84), u=PD*1.32;
  const h=1.45*u+PD, blockTop=top+Math.max(0,(bottom-top-h)*0.35);
  return {PD, u, ly, pileY:blockTop+PD/2+0.45*u};
}
function editTargets(){
  const out=new Map();
  let line=(editing?lineArr:editLine().line).slice(), pile=removed.slice();
  if(dragging&&dragging.moving){
    // Open a gap where the held die would land
    const i=dragging.i;
    line=line.filter(x=>x!==i);
    if(dragging.zone==='line'){ line.splice(dragging.slot,0,i); pile=pile.filter(x=>x!==i); }
    else if(dragging.from==='line') pile.push(i);
  }
  const n=line.length, sp=lineSpacing(n), D=lineDiam(n), G=geom(n);
  line.forEach((i,j)=>out.set(i,{x:toWorldX(W/2+(j-(n-1)/2)*sp), y:toWorldY(G.ly), D}));
  pile.forEach((i,j)=>{
    const [sx,sy]=PILE[j%PILE.length];
    out.set(i,{x:toWorldX(W/2+sx*G.u), y:toWorldY(G.pileY-sy*G.u), D:G.PD});
  });
  return out;
}
// Haptics: Vibration API where available (Android); iOS Safari 17.4+ has no vibrate(), but toggling a
// hidden <input switch> via its label fires the system haptic.
let hapticLabel=null;
function haptic(ms){
  try{
    if(navigator.vibrate){ navigator.vibrate(ms); return; }
    if(!hapticLabel){
      const inp=document.createElement('input');
      inp.type='checkbox'; inp.setAttribute('switch',''); inp.id='hapticSwitch'; inp.tabIndex=-1;
      hapticLabel=document.createElement('label');
      hapticLabel.htmlFor=inp.id; hapticLabel.setAttribute('aria-hidden','true');
      hapticLabel.style.cssText='position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
      hapticLabel.appendChild(inp); document.body.appendChild(hapticLabel);
    }
    hapticLabel.click();
  }catch(e){}
}
function updateDragZone(){
  const g=dragging, G=geom(lineArr.length);
  const prevZone=g.zone, prevSlot=g.slot;
  const others=lineArr.filter(x=>x!==g.i);
  let zone=g.py<(G.ly+G.pileY-G.u*0.5)/2?'line':'pile';
  if(g.from==='line'&&others.length<1) zone='line';
  g.zone=zone;
  if(zone==='line'){
    const n=others.length+1, sp=lineSpacing(n);
    g.slot=clamp(Math.round((g.px-W/2)/sp+(n-1)/2),0,n-1);
  }
  // Light tick when the held die crosses into a new slot or the other zone (not on the first call).
  if(prevZone!==null&&(zone!==prevZone||(zone==='line'&&g.slot!==prevSlot))) haptic(4);
}
// Mesh scale that makes a die about D px wide on screen.
const scaleFor=(d,D)=>d.size/1.06*D/(1.8*ppu);

const modeBtn=document.getElementById('modeBtn');
// Gear <-> close icon morph (Flubber). The close X is a filled polygon; the gear's centre hole collapses to a dot.
const icMorph=document.getElementById('icMorph'), icPath=document.getElementById('icPath');
const [gearOuter,gearHole]=icPath.getAttribute('d').split(/(?=M12 15\.6)/);
const ICON={
  gear:{outer:gearOuter,hole:gearHole},
  close:{outer:'M4.15 5.85L5.85 4.15L12 10.3L18.15 4.15L19.85 5.85L13.7 12L19.85 18.15L18.15 19.85L12 13.7L5.85 19.85L4.15 18.15L10.3 12Z',hole:'M12 12.02A.02.02 0 1 1 12 11.98a.02.02 0 0 1 0 .04z'}
};
const iconFns=window.flubber&&{
  outer:flubber.interpolate(ICON.gear.outer,ICON.close.outer,{maxSegmentLength:1}),
  hole:flubber.interpolate(ICON.gear.hole,ICON.close.hole,{maxSegmentLength:1})
};
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let iconP=0, iconRaf=0;
function drawIcon(p){
  iconP=p;
  // Both rings live in one even-odd path so the hole cuts out of the gear; the X has no hole.
  if(iconFns){ icPath.setAttribute('d',iconFns.outer(p)+(p<1?iconFns.hole(p):'')); icMorph.style.transform='rotate('+p*90+'deg)'; }
  else{ const k=p>=.5?'close':'gear'; icPath.setAttribute('d',ICON[k].outer+(k==='gear'?ICON[k].hole:'')); }
}
function morphIcon(to){
  cancelAnimationFrame(iconRaf);
  const from=iconP, t0=performance.now(), dur=reduceMotion.matches||!iconFns?0:200;
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  (function step(now){
    const k=dur?Math.min(1,(now-t0)/dur):1;
    drawIcon(from+(to-from)*ease(k));
    if(k<1) iconRaf=requestAnimationFrame(step);
  })(t0);
}
function syncOrder(){ order.splice(0,order.length,...lineArr,...removed); refreshRing(); save(); }
function enterEdit(){
  if(editing) return;
  editAnchor=frontIndex(); lineArr=editLine().line; editing=true; dragging=null;
  const tg=editTargets();
  dice.forEach(d=>{ const t=tg.get(d.index); d.sp.set(t.x,t.y,0); d.ss=scaleFor(d,t.D); });
  document.body.classList.add('editing');
  morphIcon(1); modeBtn.setAttribute('aria-label','Done');
  live.textContent='Choose dice. Drag to reorder, tap × to hide a die, tap a hidden die to bring it back.';
  haptic(12);
}
function exitEdit(){
  if(!editing) return;
  dragging=null;
  const front=lineArr[Math.floor((lineArr.length-1)/2)];
  editing=false;
  ringPos=ringTarget=Math.max(0,ringList.indexOf(front));
  document.body.classList.remove('editing');
  morphIcon(0); modeBtn.setAttribute('aria-label','Choose dice');
  live.textContent='';
}
modeBtn.addEventListener('click',()=>editing?exitEdit():enterEdit());

function removeDie(i){
  if(!editing||!active.has(i)||lineArr.length<=1) return;
  lineArr=lineArr.filter(x=>x!==i); active.delete(i); removed.push(i); syncOrder();
  live.textContent=`${dice[i].id} hidden`;
}
function addDie(i){
  if(!editing||active.has(i)) return;
  lineArr.push(i); active.add(i); removed=removed.filter(x=>x!==i); syncOrder();
  live.textContent=`${dice[i].id} shown`;
}
function commitDrag(){
  const g=dragging; dragging=null;
  if(!g||!g.moving) return;
  const i=g.i;
  if(g.zone==='line'){
    lineArr=lineArr.filter(x=>x!==i); lineArr.splice(g.slot,0,i);
    if(g.from==='pile'){ active.add(i); removed=removed.filter(x=>x!==i); live.textContent=`${dice[i].id} shown`; }
  } else if(g.from==='line'){
    lineArr=lineArr.filter(x=>x!==i); active.delete(i); removed.push(i); live.textContent=`${dice[i].id} hidden`;
  }
  syncOrder();
  haptic(12);
}

const XSVG='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>';
const badges=dice.map(d=>{
  const b=document.createElement('button'); b.type='button'; b.className='del'; b.id='del-'+d.id;
  b.setAttribute('aria-label','Hide '+d.id); b.innerHTML=XSVG; b.tabIndex=-1;
  b.addEventListener('click',e=>{ e.stopPropagation(); removeDie(d.index); });
  document.getElementById('badges').appendChild(b); return b;
});
const proj=new THREE.Vector3();
