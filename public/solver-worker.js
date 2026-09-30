// Classic worker: upstream cubejs exposes Cube on the worker global.
importScripts('./vendor/cubejs/cube.js','./vendor/cubejs/solve.js');
self.onmessage=({data})=>{
 try{
  self.postMessage({status:'Çözüm motoru hazırlanıyor…'});
  Cube.initSolver();
  self.postMessage({status:data.mode==='pro'?'Pro çözüm aranıyor…':'Çözüm aranıyor…'});
  const cube=Cube.fromString(data.input);
  if(cube.isSolved()){self.postMessage({algorithm:'',pro:false});return;}
  const normal=cube.solve();
  if(data.mode!=='pro'){self.postMessage({algorithm:normal,pro:false});return;}
  let best=normal.split(/\s+/);
  for(let depth=best.length-1;depth>=1;depth--){
   try{
    self.postMessage({status:`Pro çözüm: ${depth} hamle sınırı deneniyor…`});
    const candidate=cube.solve(depth).trim().split(/\s+/).filter(Boolean);
    if(candidate.length<best.length)best=candidate;
   }catch{}
  }
  self.postMessage({algorithm:best.join(' '),pro:true});
 }catch{self.postMessage({error:'Bu küp için çözüm üretilemedi. Renkleri ve yüz yönlerini kontrol et.'});}
};
