"use strict";
/* ---------- Input ---------- */
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
let drag=null, pressTimer=0;
const pxStep=()=>Math.min(W*0.5,260);
function pick(x,y,filter){
  ndc.set(x/W*2-1, -(y/H)*2+1);
  ray.setFromCamera(ndc,camera);
  const list=dice.filter(filter).concat(extraPool.filter(x=>!x.dying&&filter(x.parent))).map(d=>d.mesh);
  const vis=list.map(m=>m.visible); list.forEach(m=>{m.visible=true;});
  const hits=ray.intersectObjects(list);
  list.forEach((m,j)=>{m.visible=vis[j];});
  return hits.length?hits[0].object.userData.die:-1;
}
canvas.addEventListener('pointerdown',e=>{
  if(drag) return;
  const t=performance.now();
  drag={id:e.pointerId,x0:e.clientX,y0:e.clientY,mode:null,ring0:ringPos,used:false,s:[{x:e.clientX,y:e.clientY,t}]};
  try{canvas.setPointerCapture(e.pointerId);}catch(_){}
  clearTimeout(pressTimer);
  if(editing){
    const i=pick(e.clientX,e.clientY,d=>d.alpha>0.5);
    dragging=i>=0?{i, from:active.has(i)?'line':'pile', px:e.clientX, py:e.clientY, moving:false, zone:null, slot:0}:null;
  } else {
    const dd=drag;
    pressTimer=setTimeout(()=>{
      if(drag!==dd||dd.mode) return;
      const i=pick(dd.x0,dd.y0,d=>active.has(d.index)&&d.alpha*Math.max(d.w,0.4)>0.2);
      if(i>=0){ dd.used=true; enterEdit(); }
    },480);
  }
});
canvas.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id) return;
  const dx=e.clientX-drag.x0, dy=e.clientY-drag.y0, t=performance.now();
  if(editing&&dragging){
    dragging.px=e.clientX; dragging.py=e.clientY;
    if(!dragging.moving&&Math.hypot(dx,dy)>6){ dragging.moving=true; canvas.classList.add('grabbing'); }
    if(dragging.moving) updateDragZone();
  }
  if(!drag.mode && Math.hypot(dx,dy)>8){
    clearTimeout(pressTimer);
    drag.mode=Math.abs(dx)>Math.abs(dy)?'h':'v';
    if(drag.mode==='h'){ drag.ring0=ringPos; drag.x0=e.clientX; if(!editing&&ringList.length>1) canvas.classList.add('grabbing'); }
  }
  if(drag.mode==='h' && !editing && !drag.used && ringList.length>1) ringPos=drag.ring0-(e.clientX-drag.x0)/pxStep();
  drag.s.push({x:e.clientX,y:e.clientY,t});
  while(drag.s.length>2 && t-drag.s[0].t>100) drag.s.shift();
});
function endDrag(e,cancel){
  if(!drag||e.pointerId!==drag.id) return;
  clearTimeout(pressTimer);
  const s=drag.s, a=s[0], b=s[s.length-1], dt=Math.max(1,b.t-a.t);
  const vx=(b.x-a.x)/dt, vy=(b.y-a.y)/dt;
  const dy=e.clientY-drag.y0;
  if(drag.used){ /* long-press already handled */ }
  else if(editing){
    if(dragging&&dragging.moving){ if(cancel) dragging=null; else commitDrag(); }
    else { const g=dragging; dragging=null; if(!drag.mode&&!cancel&&g&&g.from==='pile') addDie(g.i); }
  } else if(drag.mode==='h'){
    if(ringList.length>1){
      let tgt=Math.round(ringPos-(cancel?0:vx*220/pxStep()));
      const base=Math.round(drag.ring0); ringTarget=clamp(tgt,base-2,base+2);
    }
  } else if(drag.mode==='v' && !cancel){
    if(Math.abs(dy)>28||Math.abs(vy)>0.35) rollGroup(dice[frontIndex()], dy<0?1:-1, clamp(Math.abs(vy)/2.2,0,1));
  } else if(!drag.mode && !cancel){
    const i=pick(e.clientX,e.clientY,d=>active.has(d.index));
    if(i>=0){ if(i===frontIndex()) rollGroup(dice[i],1,0.45); else goTo(i); }
  }
  canvas.classList.remove('grabbing');
  drag=null;
}
canvas.addEventListener('pointerup',e=>endDrag(e,false));
canvas.addEventListener('pointercancel',e=>endDrag(e,true));
canvas.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{
  if(editing){ if(e.key==='Escape'){ exitEdit(); e.preventDefault(); } return; }
  if(e.key==='ArrowRight'){ ringTarget=Math.round(ringTarget)+1; e.preventDefault(); }
  else if(e.key==='ArrowLeft'){ ringTarget=Math.round(ringTarget)-1; e.preventDefault(); }
  else if(e.key==='ArrowUp'||(e.key===' '&&e.target===document.body)){ rollGroup(dice[frontIndex()],1,0.6); e.preventDefault(); }
  else if(e.key==='ArrowDown'){ rollGroup(dice[frontIndex()],-1,0.6); e.preventDefault(); }
});
