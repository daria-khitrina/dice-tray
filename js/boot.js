"use strict";
// Wait (briefly) for the die-face font, then load the app scripts in order. They are classic scripts,
// so their top-level const/let/function declarations are shared across files.
(async function(){
  try{
    await Promise.race([document.fonts.load('600 64px "Lexend"'), new Promise(r=>setTimeout(r,1800))]);
  }catch(e){}
  for(const src of ['js/shapes.js','js/scene.js','js/ring.js','js/extras.js','js/edit.js','js/input.js','js/main.js']){
    await new Promise((ok,fail)=>{
      const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=fail;
      document.body.appendChild(s);
    });
    if(window.diceFailed) return;
  }
})();
