"use strict";
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const TAU=Math.PI*2, PHI=(1+Math.sqrt(5))/2, IP=1/PHI, INK='#171412';
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const mod=(a,n)=>((a%n)+n)%n;
const smooth=t=>t*t*(3-2*t);
const lerp=(a,b,t)=>a+(b-a)*t;

function combos(x,y,z){const o=[];for(const a of x?[1,-1]:[1])for(const b of y?[1,-1]:[1])for(const c of z?[1,-1]:[1])o.push(V3(x*a,y*b,z*c));return o;}
function cyc(x,y,z){return [...combos(x,y,z),...combos(z,x,y),...combos(y,z,x)];}

/* ---------- Dice set (colors from the reference art) ---------- */
const DEFS=[
  {id:'d4',   color:'#B86FBA', size:1.22, fs:.30},
  {id:'d6',   color:'#EF8648', size:0.98, fs:.66},
  {id:'d8',   color:'#D3CFBC', size:1.00, fs:.50},
  {id:'d10',  color:'#D6AA42', size:1.00, fs:.44},
  {id:'d12',  color:'#4878C8', size:1.02, fs:.44},
  {id:'d20',  color:'#B8342B', size:1.06, fs:.33},
  {id:'d100', color:'#46905A', size:1.00, fs:.34},
];
const N=DEFS.length;

function fromNormals(verts, normals){
  return normals.map(n0=>{
    const n=n0.clone().normalize();
    let max=-Infinity; verts.forEach(v=>{max=Math.max(max,v.dot(n));});
    return {idx:verts.map((v,i)=>i).filter(i=>verts[i].dot(n)>max-1e-3), normal:n};
  });
}
function orderFace(f, verts){
  const c=V3(0,0,0); f.idx.forEach(i=>c.add(verts[i])); c.divideScalar(f.idx.length);
  const u=verts[f.idx[0]].clone().sub(c).normalize();
  const w=new THREE.Vector3().crossVectors(f.normal,u);
  const ang=i=>{const p=verts[i].clone().sub(c);return Math.atan2(p.dot(w),p.dot(u));};
  f.idx.sort((a,b)=>ang(a)-ang(b));
  f.center=c;
}
function assignOpposite(faces, n){
  let k=0;
  faces.forEach((f,i)=>{
    if(f.value!=null) return;
    const j=faces.findIndex((g,jj)=>jj!==i && g.value==null && g.normal.dot(f.normal)<-0.99);
    f.value=1+k; if(j>=0) faces[j].value=n-k; k++;
  });
}

function shape(id){
  let verts, faces;
  if(id==='d4'){ verts=[V3(1,1,1),V3(-1,-1,1),V3(-1,1,-1),V3(1,-1,-1)]; faces=fromNormals(verts, verts.map(v=>v.clone().negate())); }
  else if(id==='d6'){ verts=combos(1,1,1); faces=fromNormals(verts,[V3(1,0,0),V3(-1,0,0),V3(0,1,0),V3(0,-1,0),V3(0,0,1),V3(0,0,-1)]); }
  else if(id==='d8'){ verts=[V3(1,0,0),V3(-1,0,0),V3(0,1,0),V3(0,-1,0),V3(0,0,1),V3(0,0,-1)]; faces=fromNormals(verts,combos(1,1,1)); }
  else if(id==='d12'){ verts=[...combos(1,1,1),...cyc(0,IP,PHI)]; faces=fromNormals(verts,cyc(0,PHI,1)); }
  else if(id==='d20'){ verts=cyc(0,1,PHI); faces=fromNormals(verts,[...combos(1,1,1),...cyc(0,PHI,IP)]); }
  else {
    // Pentagonal trapezohedron: pole height chosen so each kite is planar.
    const c36=Math.cos(Math.PI/5), e=0.11, h=e*(1+c36)/(1-c36);
    verts=[V3(0,h,0),V3(0,-h,0)];
    for(let k=0;k<5;k++){const a=TAU*k/5;verts.push(V3(Math.cos(a),e,Math.sin(a)));}
    for(let k=0;k<5;k++){const a=TAU*(k+.5)/5;verts.push(V3(Math.cos(a),-e,Math.sin(a)));}
    const U=k=>2+(k%5), L=k=>7+(k%5);
    faces=[];
    for(let k=0;k<5;k++) faces.push({idx:[0,U(k),L(k),U(k+1)], pole:0, value:2*k});
    for(let k=0;k<5;k++) faces.push({idx:[1,L(k),U(k+1),L(k+1)], pole:1, value:9-2*((k+3)%5)});
    faces.forEach(f=>{
      const [a,b,c]=f.idx.map(i=>verts[i]);
      const n=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize();
      const ctr=V3(0,0,0); f.idx.forEach(i=>ctr.add(verts[i]));
      if(n.dot(ctr)<0) n.negate();
      f.normal=n;
    });
  }
  const m=Math.max(...verts.map(v=>v.length())); verts.forEach(v=>v.divideScalar(m));
  faces.forEach(f=>orderFace(f,verts));
  if(id==='d6'||id==='d8'||id==='d12'||id==='d20') assignOpposite(faces, faces.length);
  faces.forEach(f=>{
    let t;
    if(f.pole!=null) t=verts[f.pole].clone();
    else if(id==='d6') t=verts[f.idx[0]].clone().add(verts[f.idx[1]]).multiplyScalar(.5);
    else t=verts[f.idx[0]].clone();
    const up=t.sub(f.center); up.addScaledVector(f.normal,-up.dot(f.normal)).normalize();
    f.up=up;
  });
  return {verts, faces};
}

const label=(id,v)=> id==='d100' ? (v===0?'00':String(v*10)) : String(v);

function drawNum(g, txt, fs){
  g.fillText(txt, 0, fs*0.05);
  if(txt==='6'||txt==='9') g.fillRect(-fs*0.2, fs*0.5, fs*0.4, fs*0.075);
}
