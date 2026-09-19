// Classic worker: upstream cubejs exposes Cube on the worker global.
importScripts('./vendor/cubejs/cube.js','./vendor/cubejs/solve.js');
self.onmessage=({data})=>{
 try{
  self.postMessage({status:'Çözüm motoru hazırlanıyor…'});
  Cube.initSolver();
  self.postMessage({status:'Çözüm aranıyor…'});
  const cube=Cube.fromString(data.input);
  self.postMessage({algorithm:cube.isSolved()?'':cube.solve()});
 }catch{self.postMessage({error:'Bu küp için çözüm üretilemedi. Renkleri ve yüz yönlerini kontrol et.'});}
};
