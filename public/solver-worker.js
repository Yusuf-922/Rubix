// Classic worker: upstream cubejs exposes Cube on the worker global.
importScripts('./vendor/cubejs/cube.js','./vendor/cubejs/solve.js','./short-solver.js','./slice-solver.js');
self.onmessage=({data})=>{
 try{
  self.postMessage({status:'Çözüm motoru hazırlanıyor…'});
  Cube.initSolver();
  self.postMessage({status:data.mode==='pro'?'Pro çözüm aranıyor…':'Çözüm aranıyor…'});
  const cube=Cube.fromString(data.input);
  if(cube.isSolved()){self.postMessage({algorithm:'',pro:false});return;}
  let result=null,exactResult=false;
  if(data.mode==='pro'){
   self.postMessage({status:'Pro çözüm: kısa yollar taranıyor…'});
   const exact=findShortSolution(Cube,cube,8);
   if(exact!==null){result=exact;exactResult=true;}
  }
  if(result===null){
   const normal=cube.solve();
   if(data.mode!=='pro')result=normal;
   else{
    let best=normal.split(/\s+/);
    for(let depth=best.length-1;depth>=1;depth--){
     try{
      self.postMessage({status:`Pro çözüm: ${depth} hamle sınırı deneniyor…`});
      const candidate=cube.solve(depth).trim().split(/\s+/).filter(Boolean);
      if(candidate.length<best.length)best=candidate;
     }catch{}
    }
    result=best.join(' ');
   }
  }
  if(data.allowSlices&&result.trim().split(/\s+/).length>1){
   self.postMessage({status:'M/E/S içeren daha kısa bir çözüm aranıyor…'});
   result=findSliceSolution(Cube,data.rawInput,result);
  }
  self.postMessage({algorithm:result,pro:data.mode==='pro',exact:exactResult&&!/[MES]/.test(result)});
 }catch{self.postMessage({error:'Bu küp için çözüm üretilemedi. Renkleri ve yüz yönlerini kontrol et.'});}
};
