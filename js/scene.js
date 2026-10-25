"use strict";
/* ---------- Three.js setup ---------- */
const canvas=document.getElementById('stage');
let renderer;
try{ renderer=new THREE.WebGLRenderer({canvas, antialias:true, alpha:true}); }
catch(e){ document.getElementById('fail').hidden=false; window.diceFailed=true; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.setClearColor(0x000000,0);
renderer.autoClear=false;
const maxAniso=renderer.capabilities.getMaxAnisotropy();
// Rapid window resizing can knock out the GPU context; without this the canvas
// goes blank forever instead of recovering once the context comes back.
canvas.addEventListener('webglcontextlost', e=>{ e.preventDefault(); }, false);
canvas.addEventListener('webglcontextrestored', ()=>{ layout(); }, false);

const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x0d0d0e, 8, 20);
scene.add(new THREE.AmbientLight(0xffffff,0.62));
const key=new THREE.DirectionalLight(0xffffff,0.52); key.position.set(1.6,2.6,4); scene.add(key);
const rim=new THREE.DirectionalLight(0xffffff,0.16); rim.position.set(-3,-1,-2); scene.add(rim);

const FOV=36;
const camera=new THREE.PerspectiveCamera(FOV,1,0.1,100);

function buildDie(def){
  const {verts,faces}=shape(def.id);
  const n=faces.length, cols=Math.ceil(Math.sqrt(n)), rows=Math.ceil(n/cols), S=256;
  const cv=document.createElement('canvas'); cv.width=cols*S; cv.height=rows*S;
  const g=cv.getContext('2d');
  const Rf=Math.max(...faces[0].idx.map(i=>verts[i].distanceTo(faces[0].center)));
  const k=0.46*S/Rf;
  const fs=def.fs*k;
  const pos=[],nor=[],uv=[];
  faces.forEach((f,fi)=>{
    const col=fi%cols,row=Math.floor(fi/cols),cx=(col+.5)*S,cy=(row+.5)*S;
    const rt=new THREE.Vector3().crossVectors(f.up,f.normal);
    const p2=f.idx.map(i=>{const d=verts[i].clone().sub(f.center);return [d.dot(rt),d.dot(f.up)];});
    g.fillStyle=def.color; g.fillRect(col*S,row*S,S,S);
    g.beginPath();
    p2.forEach(([x,y],j)=>{const px=cx+x*k,py=cy-y*k; j?g.lineTo(px,py):g.moveTo(px,py);});
    g.closePath(); g.lineJoin='round'; g.strokeStyle=INK; g.lineWidth=0.05*k; g.stroke();
    g.fillStyle=INK; g.textAlign='center'; g.textBaseline='middle';
    g.font=`600 ${fs}px Lexend, system-ui, sans-serif`;
    g.save(); g.translate(cx,cy); drawNum(g,label(def.id,f.value),fs); g.restore();
    const tri=(a,b,c)=>{
      let o=[a,b,c];
      const A=verts[f.idx[a]],B=verts[f.idx[b]],C=verts[f.idx[c]];
      const cr=new THREE.Vector3().subVectors(B,A).cross(new THREE.Vector3().subVectors(C,A));
      if(cr.dot(f.normal)<0) o=[a,c,b];
      o.forEach(j=>{
        const v=verts[f.idx[j]]; pos.push(v.x,v.y,v.z); nor.push(f.normal.x,f.normal.y,f.normal.z);
        const [x,y]=p2[j]; uv.push((cx+x*k)/cv.width, 1-(cy-y*k)/cv.height);
      });
    };
    for(let j=1;j<f.idx.length-1;j++) tri(0,j,j+1);
  });
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const tex=new THREE.CanvasTexture(cv); tex.anisotropy=maxAniso;
  const mat=new THREE.MeshLambertMaterial({map:tex, transparent:true});
  const mesh=new THREE.Mesh(geo,mat);
  return {verts, faces, mesh, mat};
}

const TILT=new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2,0.3,0.04));
const TILT_D20=new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08,0.12,0.02));
// d4 shows a flat triangle, so lean it a bit more to reveal the neighbouring faces.
const TILT_D4=new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3,0.5,0.15));
const SHOW_TILT=new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35,0.45,0.12));
function poseFor(d, value, tilt){
  let f, up;
  f=d.faces.find(x=>x.value===value); up=f.up;
  const n=f.normal, r=new THREE.Vector3().crossVectors(up,n);
  const m=new THREE.Matrix4().set(r.x,r.y,r.z,0, up.x,up.y,up.z,0, n.x,n.y,n.z,0, 0,0,0,1);
  return (tilt||(d.id==='d20'?TILT_D20:d.id==='d4'?TILT_D4:TILT)).clone().multiply(new THREE.Quaternion().setFromRotationMatrix(m));
}
function randomValue(d){
  return d.faces[Math.floor(Math.random()*d.faces.length)].value;
}
const restValue={d4:4,d6:6,d8:8,d10:0,d12:12,d20:20,d100:0};

const dice=DEFS.map((def,i)=>{
  const b=buildDie(def);
  const d=Object.assign({}, def, b, {
    q:new THREE.Quaternion(), idle:rand(0,TAU), idleSpeed:(i%2?-1:1)*rand(.32,.55),
    idleAxis:V3(rand(-.35,.35),1,rand(-.35,.35)).normalize(),
    roll:null, pos:V3(0,0,0), vel:V3(0,0,0), pulse:0, w:1, alpha:1, last:null, index:i, extras:[],
    sp:V3(0,0,0), ss:1, phase:rand(0,TAU)
  });
  d.q.copy(poseFor(d, restValue[def.id]));
  d.showQ=poseFor(d, restValue[def.id], SHOW_TILT);
  d.mesh.userData.die=i;
  scene.add(d.mesh);
  return d;
});

/* ---------- Which dice are shown (kept per viewer) ---------- */
const STORE='diceTray.active.v1';
const order=dice.map((d,i)=>i);
const active=new Set(order);
let removed=[];
const idOf=id=>dice.findIndex(d=>d.id===id);
try{
  const saved=JSON.parse(localStorage.getItem(STORE)||'null');
  const act=Array.isArray(saved)?saved:(saved&&Array.isArray(saved.active)?saved.active:null);
  if(saved&&Array.isArray(saved.order)){
    const o=saved.order.map(idOf).filter(i=>i>=0);
    order.forEach(i=>{ if(!o.includes(i)) o.push(i); });
    order.splice(0,order.length,...o);
  }
  if(act){
    const ids=new Set(act);
    if(order.some(i=>ids.has(dice[i].id))) order.forEach(i=>{ if(!ids.has(dice[i].id)){ active.delete(i); removed.push(i); } });
  }
}catch(e){}
function save(){ try{ localStorage.setItem(STORE, JSON.stringify({order:order.map(i=>dice[i].id), active:order.filter(i=>active.has(i)).map(i=>dice[i].id)})); }catch(e){} }
let ringList=order.filter(i=>active.has(i));
const refreshRing=()=>{ ringList=order.filter(i=>active.has(i)); };

/* ---------- Depth-of-field: back dice render to a small target, then blur ---------- */
const rt=new THREE.WebGLRenderTarget(4,4);
const quadMat=new THREE.ShaderMaterial({
  uniforms:{t:{value:rt.texture}, texel:{value:new THREE.Vector2(1/4,1/4)}, dim:{value:0.82}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D t;uniform vec2 texel;uniform float dim;varying vec2 vUv;
    void main(){vec4 c=vec4(0.);float tot=0.;
      for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++){
        float w=exp(-float(x*x+y*y)/4.5);c+=texture2D(t,vUv+vec2(float(x),float(y))*texel*1.5)*w;tot+=w;}
      c/=tot;gl_FragColor=vec4(c.rgb*dim,c.a);}`,
  transparent:true, depthTest:false, depthWrite:false,
  blending:THREE.CustomBlending, blendSrc:THREE.OneFactor, blendDst:THREE.OneMinusSrcAlphaFactor
});
const quadScene=new THREE.Scene();
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),quadMat));
const quadCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);

function setPass(sharp){
  dice.concat(extraPool).forEach(d=>{
    const a=(sharp?d.w:1-d.w)*d.alpha;
    d.mesh.visible=a>0.01; d.mat.opacity=a;
  });
}
function render(){
  setPass(false);
  renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene,camera);
  renderer.setRenderTarget(null); renderer.clear(); renderer.render(quadScene,quadCam);
  setPass(true); renderer.clearDepth(); renderer.render(scene,camera);
}
