(function(root){
 const MOVES=['U','U2',"U'",'R','R2',"R'",'F','F2',"F'",'D','D2',"D'",'L','L2',"L'",'B','B2',"B'"];
 const inverseMove=move=>move.endsWith("'")?move[0]:move.endsWith('2')?move:move+"'";
 const inversePath=path=>path.slice().reverse().map(inverseMove);
 function statesFrom(Cube,start,maxDepth){
  const startKey=start.asString(),seen=new Map([[startKey,[]]]);let frontier=[{cube:start,path:[],face:''}];
  for(let depth=0;depth<maxDepth;depth++){
   const next=[];
   for(const item of frontier)for(const move of MOVES){
    if(move[0]===item.face)continue;
    const cube=item.cube.clone().move(move),key=cube.asString();
    if(seen.has(key))continue;
    const path=item.path.concat(move);seen.set(key,path);next.push({cube,path,face:move[0]});
   }
   frontier=next;
  }
  return seen;
 }
 root.findShortSolution=function(Cube,cube,maxDepth=8){
  const solved=new Cube(),split=Math.floor(maxDepth/2),fromSolved=statesFrom(Cube,solved,split);
  let best=null,frontier=[{cube:cube.clone(),path:[],face:''}],seen=new Set([cube.asString()]);
  for(let depth=0;depth<=maxDepth-split;depth++){
   const next=[];
   for(const item of frontier){
    const reverse=fromSolved.get(item.cube.asString());
    if(reverse){const candidate=item.path.concat(inversePath(reverse));if(!best||candidate.length<best.length)best=candidate;}
    if(depth===maxDepth-split)continue;
    for(const move of MOVES){
     if(move[0]===item.face)continue;
     const child=item.cube.clone().move(move),key=child.asString();
     if(seen.has(key))continue;
     const path=item.path.concat(move);seen.add(key);next.push({cube:child,path,face:move[0]});
    }
   }
   frontier=next;
  }
  return best?best.join(' '):null;
 };
})(typeof self!=='undefined'?self:globalThis);
