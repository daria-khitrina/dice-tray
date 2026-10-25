"use strict";
/* ---------- Extra copies of the front die (advantage / disadvantage) ----------
   Tapping the front die again while a roll is still spinning drops a smaller copy under it that
   rolls too. Copies live in d.extras (logic) and extraPool (drawing + fade-out). */
const MAX_EXTRAS=2, EXTRA_SCALE=0.52, SLOT_X=[-0.85,0.85], SLOT_Y=-1.45;
const extraPool=[];
const isRolling=d=>!!d.roll||d.extras.some(x=>x.roll);

function spawnExtra(d,dir,power){
  if(d.extras.length>=MAX_EXTRAS) return;
  const mat=d.mat.clone(), mesh=new THREE.Mesh(d.mesh.geometry,mat);
  mesh.userData.die=d.index; // a tap on a copy counts as a tap on its die
  mesh.quaternion.copy(d.mesh.quaternion); scene.add(mesh);
  const x={parent:d, index:d.index, id:d.id, faces:d.faces, verts:d.verts, size:d.size, mesh, mat,
    q:d.mesh.quaternion.clone(), pos:V3(0,0,0), vel:V3(0,0,0), roll:null, pulse:0, last:null,
    w:1, alpha:1, slot:d.extras.length, pop:0, dying:false, p:d.mesh.position.clone()};
  d.extras.push(x); extraPool.push(x);
  startRoll(x,dir,power);
  x.vel.x+=(x.slot?1:-1)*1.2; // fly out towards its own side
}
function clearExtras(d){
  d.extras.forEach(x=>{ x.dying=true; x.roll=null; });
  d.extras=[];
}
function dropExtra(x){
  scene.remove(x.mesh); x.mat.dispose();
  extraPool.splice(extraPool.indexOf(x),1);
}
function updateExtras(dt){
  const slide=1-Math.exp(-(reduced?40:11)*dt), fade=1-Math.exp(-(reduced?40:32)*dt);
  for(let i=extraPool.length-1;i>=0;i--){
    const x=extraPool[i];
    updateRoll(x,dt);
    x.pop+=((x.dying?0:1)-x.pop)*(x.dying?fade:slide);
    if(x.dying&&(reduced||x.pop<0.02)){ dropExtra(x); continue; }
    x.p.x+=(SLOT_X[x.slot]-x.p.x)*slide; x.p.y+=(SLOT_Y-x.p.y)*slide; x.p.z+=(0-x.p.z)*slide;
    x.mesh.position.set(x.p.x+x.pos.x*0.5, x.p.y+x.pos.y*0.5, x.p.z);
    x.mesh.quaternion.copy(x.q);
    x.mesh.scale.setScalar(Math.max(1e-3,x.size*EXTRA_SCALE*x.pop*(1-0.07*x.pulse)));
  }
}
// Single entry for every way of rolling the front die.
function rollGroup(d,dir,power){
  if(isRolling(d)) spawnExtra(d,dir,power);
  else { clearExtras(d); startRoll(d,dir,power); }
}
