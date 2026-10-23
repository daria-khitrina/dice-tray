"use strict";
/* ---------- Layout ---------- */
const BX=0.45, BY=0.5, RAD=1.15;
let W=0,H=0,ppu=100,cy=0,R=2.6,LIFT=0.6,camDist=12;
function layout(){
  // Live window-resize drags can briefly report a 0 width/height mid-animation.
  // Dividing by that zero would permanently corrupt R/LIFT to NaN (nothing to
  // undo it once the drag's last event is the glitched one) — so just keep
  // the last good layout until a real size comes through.
  if(innerWidth<=0||innerHeight<=0) return;
  W=innerWidth; H=innerHeight;
  renderer.setSize(W,H,false);
  const db=renderer.getDrawingBufferSize(new THREE.Vector2());
  const rw=Math.max(2,Math.floor(db.x/4)), rh=Math.max(2,Math.floor(db.y/4));
  rt.setSize(rw,rh); quadMat.uniforms.texel.value.set(1/rw,1/rh);
  const topRes=40, botRes=40;
  const avail=Math.max(160,H-topRes-botRes);
  ppu=Math.min(avail/(2*(BY+RAD)), 0.88*W/(2*(BX+RAD)), 150);
  cy=topRes+avail/2;
  const dist=H/(2*ppu*Math.tan(FOV/2*Math.PI/180));
  camDist=dist;
  camera.aspect=W/H; camera.position.set(0,0,dist); camera.lookAt(0,0,0);
  camera.setViewOffset(W,H,0,H/2-cy,W,H); camera.updateProjectionMatrix();
  R=clamp((W/2/ppu)*1.12,2.4,4.2); LIFT=0.5*R;
  scene.fog.near=dist+0.4; scene.fog.far=dist+2*R+1.6;
}
// Throttle to one layout() per animation frame: a raw per-event listener fires
// dozens of times a second while a window is being dragged, and reallocating
// the renderer's buffers that fast is what was knocking out the GPU context.
let resizeRAF=null;
addEventListener('resize',()=>{
  if(resizeRAF) return;
  resizeRAF=requestAnimationFrame(()=>{ resizeRAF=null; layout(); });
});
layout();

/* ---------- Ring + rolling ---------- */
const live=document.getElementById('live');
let ringPos=Math.max(0,ringList.indexOf(5)), ringTarget=ringPos;
const frontIndex=()=>ringList[mod(Math.round(ringPos),ringList.length)];
function goTo(i){
  const n=ringList.length, k=ringList.indexOf(i); if(k<0) return;
  const cur=Math.round(ringTarget);
  let delta=mod(k-mod(cur,n),n); if(delta>n/2) delta-=n;
  ringTarget=cur+delta;
}
let shownFront=-1;
function updateFront(front){
  if(shownFront>=0) dice[shownFront].last=null; // forget the result of the die we leave
  shownFront=front;
}
function startRoll(d, dir, power){
  if(d.roll) return;
  const value=randomValue(d), qf=poseFor(d,value);
  const turns=reduced?1:2+Math.round(power*3);
  d.roll={t:0, D:reduced?0.6:1.2+turns*0.2, q0:d.q.clone(), qf,
    a1:V3(1,0,0), th1:dir*turns*TAU,
    a2:V3(rand(-.5,.5),1,rand(-.4,.4)).normalize(), th2:(Math.random()<.5?-1:1)*TAU*(turns>3?2:1),
    value};
  d.vel.set(rand(-1.4,1.4), dir*(reduced?0.8:3+power*3), 0);
}
function finishRoll(d,value){
  if(d.index!==shownFront) return; // swiped away mid-roll: forget it
  d.last=value;
  live.textContent=`${d.id} rolled ${label(d.id,value)}`;
}
const qa=new THREE.Quaternion(), qb=new THREE.Quaternion(), qc=new THREE.Quaternion();
function updateRoll(d,dt){
  const r=d.roll;
  if(r){
    r.t=Math.min(1,r.t+dt/r.D); const t=r.t;
    const e1=1-Math.pow(1-t,3), e2=1-Math.pow(1-Math.min(1,t*1.2),3);
    qa.copy(r.q0).slerp(r.qf, smooth(Math.min(1,t/0.8)));
    qb.setFromAxisAngle(r.a1, r.th1*(1-e1));
    qc.setFromAxisAngle(r.a2, r.th2*(1-e2));
    d.q.copy(qc).multiply(qb).multiply(qa);
    d.pos.addScaledVector(d.vel,dt);
    const fast=d.vel.length()>0.6;
    if(Math.abs(d.pos.x)>BX){ d.pos.x=Math.sign(d.pos.x)*BX; d.vel.x*=-0.72; if(fast) d.pulse=1; }
    if(Math.abs(d.pos.y)>BY){ d.pos.y=Math.sign(d.pos.y)*BY; d.vel.y*=-0.72; if(fast) d.pulse=1; }
    d.vel.multiplyScalar(Math.exp(-1.6*dt));
    d.vel.addScaledVector(d.pos,-18*t*t*dt);
    if(t>=1){ d.q.copy(r.qf); d.roll=null; finishRoll(d,r.value); }
  } else {
    d.pos.multiplyScalar(Math.exp(-7*dt)); d.vel.set(0,0,0);
  }
  d.pulse*=Math.exp(-9*dt);
}
