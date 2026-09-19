export const FACES=['U','R','F','D','L','B'];
export const COLORS={U:'#ffffff',R:'#f52f3f',F:'#48df36',D:'#ffe32f',L:'#ff791d',B:'#2573ff'};
export const LABELS={U:'Üst',R:'Sağ',F:'Ön',D:'Alt',L:'Sol',B:'Arka'};
export const NORMAL={U:[0,1,0],R:[1,0,0],F:[0,0,1],D:[0,-1,0],L:[-1,0,0],B:[0,0,-1]};
export function position(face,row,col){const a=col-1,b=1-row;return {U:[a,1,row-1],R:[1,b,1-col],F:[a,b,1],D:[a,-1,1-row],L:[-1,b,col-1],B:[1-col,b,-1]}[face];}
export function solved(){return FACES.flatMap(f=>Array.from({length:9},(_,i)=>({p:position(f,Math.floor(i/3),i%3),n:[...NORMAL[f]],color:f})));}
export const clone=s=>s.map(t=>({p:[...t.p],n:[...t.n],color:t.color}));
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function rotate(v,axis,angle){const c=Math.cos(angle),s=Math.sin(angle),k=dot(axis,v),w=cross(axis,v);return v.map((x,i)=>x*c+w[i]*s+axis[i]*k*(1-c));}
export function parse(move){if(!/^[URFDLB](2|')?$/.test(move))throw Error('Geçersiz hamle');return {axis:NORMAL[move[0]],angle:-Math.PI/2*(move.endsWith('2')?2:move.endsWith("'")?-1:1)};}
export function apply(state,move){const {axis,angle}=parse(move);return state.map(t=>dot(t.p,axis)===1?{...t,p:rotate(t.p,axis,angle).map(Math.round),n:rotate(t.n,axis,angle).map(Math.round)}:{...t,p:[...t.p],n:[...t.n]});}
export function inverse(move){return move.endsWith('2')?move:move.endsWith("'")?move[0]:move+"'";}
export function facelets(state){return Object.fromEntries(FACES.map(f=>[f,Array.from({length:9},(_,i)=>{const p=position(f,Math.floor(i/3),i%3);return state.find(t=>dot(t.n,NORMAL[f])===1&&t.p.every((v,j)=>v===p[j]))?.color;})]));}
export function fromFaces(faces){return solved().map(t=>{const f=FACES.find(f=>dot(t.n,NORMAL[f])===1);const i=Array.from({length:9},(_,i)=>i).find(i=>position(f,Math.floor(i/3),i%3).every((v,j)=>v===t.p[j]));return {...t,color:faces[f][i]};});}
const corners=[['U','R','F'],['U','F','L'],['U','L','B'],['U','B','R'],['D','F','R'],['D','L','F'],['D','B','L'],['D','R','B']];
const edges=[['U','R'],['U','F'],['U','L'],['U','B'],['D','R'],['D','F'],['D','L'],['D','B'],['F','R'],['F','L'],['B','L'],['B','R']];
const parity=p=>p.reduce((s,a,i)=>s+p.slice(i+1).filter(b=>a>b).length,0)%2;
export function validate(faces){
 if(FACES.some(f=>!faces[f]||faces[f].length!==9||faces[f].some(c=>!FACES.includes(c))))return {ok:false,message:'Altı yüzün tüm renklerini tamamla.'};
 if(FACES.some(f=>faces[f][4]!==f))return {ok:false,message:'Merkez renkleri yüz referanslarıyla eşleşmiyor.'};
 if(FACES.some(c=>Object.values(faces).flat().filter(x=>x===c).length!==9))return {ok:false,message:'Her merkez renginden tam 9 kare olmalı. Önizlemeleri kontrol et.'};
 const state=fromFaces(faces),perms=[],sums=[];
 for(const defs of [corners,edges]){
  let sum=0;const perm=[];
  for(const normals of defs){
   const p=normals.reduce((p,f)=>p.map((x,i)=>x+NORMAL[f][i]),[0,0,0]);
   const cs=normals.map(f=>state.find(t=>dot(t.n,NORMAL[f])===1&&t.p.every((x,i)=>x===p[i])).color);
   let id=-1,ori=0;
   if(normals.length===3){ori=cs.findIndex(c=>c==='U'||c==='D');if(ori>=0)id=defs.findIndex(d=>d[1]===cs[(ori+1)%3]&&d[2]===cs[(ori+2)%3]&&d[0]===cs[ori]);}
   else{for(let i=0;i<defs.length;i++){if(cs[0]===defs[i][0]&&cs[1]===defs[i][1]){id=i;ori=0;break;}if(cs[0]===defs[i][1]&&cs[1]===defs[i][0]){id=i;ori=1;break;}}}
   if(id<0||perm.includes(id))return {ok:false,message:'Bir köşe veya kenar parçasının renkleri uyuşmuyor. Fotoğraf yönlerini ve renkleri kontrol et.'};
   perm.push(id);sum+=ori;
  }perms.push(perm);sums.push(sum);
 }
 if(sums[0]%3||sums[1]%2||parity(perms[0])!==parity(perms[1]))return {ok:false,message:'Bu renk düzeni normal yüz dönüşleriyle oluşamaz. Yüz yönlerini veya hatalı renkleri düzelt.'};
 return {ok:true,message:'Küp durumu geçerli. Üç boyutlu modele aktarabilirsin.'};
}
