(function(root){
 const SLICES=['M','M2',"M'",'E','E2',"E'",'S','S2',"S'"];
 const count=algorithm=>algorithm.trim()?algorithm.trim().split(/\s+/).length:0;
 root.findSliceSolution=function(Cube,rawInput,baseline){
  const original=Cube.fromString(rawInput);
  let best=baseline.trim(),bestLength=count(best);
  for(const slice of SLICES){
   try{
    const candidateCube=original.clone().move(slice);
    const tail=candidateCube.isSolved()?'':candidateCube.solve();
    const candidate=[slice,tail.trim()].filter(Boolean).join(' ');
    const length=count(candidate);
    if(length<bestLength){best=candidate;bestLength=length;if(length===1)break;}
   }catch{}
  }
  return best;
 };
})(typeof self!=='undefined'?self:globalThis);
