"use strict";
/* ---------- Loop ---------- */
let last=performance.now(), time=0;
const qRing=new THREE.Quaternion(), qEdit=new THREE.Quaternion(), qJig=new THREE.Quaternion(), ZAX=V3(0,0,1);
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000); last=now; time+=dt;
  modeT+=((editing?1:0)-modeT)*(1-Math.exp(-(reduced?30:8)*dt));
  const e=smooth(clamp(modeT,0,1));
  if(!drag||drag.mode!=='h'||editing) ringPos+=(ringTarget-ringPos)*(1-Math.exp(-(reduced?24:9)*dt));
  const n=ringList.length, step=TAU/n;
  const front=frontIndex();
  if(front!==shownFront) updateFront(front);
  const tg=editTargets(), slide=1-Math.exp(-(reduced?40:11)*dt);
  dice.forEach((d,i)=>{
    const isActive=active.has(i);
    // Edit-mode target (line or pile)
    const t=tg.get(i);
    const held=!!(dragging&&dragging.moving&&dragging.i===i);
    if(held){
      const k=(camDist-0.6)/camDist;
      d.sp.set(toWorldX(dragging.px)*k, toWorldY(dragging.py)*k, 0.6);
      d.ss=lerp(d.ss,scaleFor(d,t.D*1.12),slide);
    } else {
      d.sp.x=lerp(d.sp.x,t.x,slide); d.sp.y=lerp(d.sp.y,t.y,slide); d.sp.z=lerp(d.sp.z,0,slide);
      d.ss=lerp(d.ss,scaleFor(d,t.D),slide);
    }
    // Ring pose
    let rx,ry,rz,rs,rw;
    if(isActive){
      const k=ringList.indexOf(i), a=(k-ringPos)*step, c=Math.cos(a);
      rx=R*Math.sin(a); rz=R*(c-1); ry=(1-c)*LIFT;
      rw=clamp(1+rz/0.7,0,1);
      if(i===front){ const g=Math.round(d.idle/TAU)*TAU; d.idle+=(g-d.idle)*(1-Math.exp(-5*dt)); }
      else if(!reduced) d.idle+=dt*d.idleSpeed;
      const bob=(i===front&&!d.roll&&!reduced&&!editing)?Math.sin(time*1.4)*0.035:0;
      rx+=d.pos.x; ry+=d.pos.y+bob;
      rs=d.size*(0.8+0.2*Math.pow(Math.max(0,c),6))*(1-0.07*d.pulse);
    } else {
      rx=d.sp.x; ry=d.sp.y; rz=d.sp.z; rs=d.ss; rw=1;
    }
    updateRoll(d,dt);
    // Blend ring and edit poses
    qRing.setFromAxisAngle(d.idleAxis,d.idle).multiply(d.q);
    const jig=(isActive&&editing&&!reduced&&!held)?Math.sin(time*19+d.phase)*0.055:0;
    // Hidden dice in the pile float gently: slow bob plus a lazy sway
    const floating=!isActive&&!held&&!reduced;
    if(floating) qJig.setFromAxisAngle(d.idleAxis, Math.sin(time*0.9+d.phase)*0.16);
    else qJig.setFromAxisAngle(ZAX,jig);
    qEdit.copy(qJig).multiply(d.showQ);
    const fy=floating?Math.sin(time*1.4+d.phase)*6/ppu:0;
    d.mesh.quaternion.copy(qRing).slerp(qEdit,e);
    d.mesh.position.set(lerp(rx,d.sp.x,e), lerp(ry,d.sp.y+fy,e), lerp(rz,d.sp.z,e));
    d.mesh.scale.setScalar(lerp(rs,d.ss,e));
    d.w=lerp(rw,1,e);
    d.alpha=isActive?1:e;
    // Remove badge under each active die
    const b=badges[i], show=editing&&isActive&&n>1&&!held;
    if(show||parseFloat(b.style.opacity||0)>0){
      proj.copy(d.mesh.position).project(camera);
      const px=(proj.x+1)/2*W, py=(1-proj.y)/2*H, D=t.D;
      b.style.transform=`translate(${px}px,${py+D*0.46}px)`;
      b.style.opacity=show?e.toFixed(3):'0';
      b.style.pointerEvents=show&&e>0.8?'auto':'none';
      b.tabIndex=show?0:-1;
    }
  });
  updateExtras(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
