import {homography,sampleFace} from './photo.js';
import {FACES,validate} from './cube.js';

export const COLOR_NAMES={U:'Beyaz',R:'Kırmızı',F:'Yeşil',D:'Sarı',L:'Turuncu',B:'Mavi'};
export function hsv([r,g,b]) {
 const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
 let h=!d?0:max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;
 return [(h*60+360)%360,max?d/max:0,max/255];
}
export function classifyColor(rgb) {
 const [h,s,v]=hsv(rgb);
 if(s<.27&&v>.35)return 'U';
 if(h<10||h>=345)return 'R';
 if(h<38)return 'L';
 if(h<76)return 'D';
 if(h<175)return 'F';
 return 'B';
}
function maskColor(rgb) {
 const [h,s,v]=hsv(rgb);
 if(v<.28)return 0;
 if(s<.23&&v>.57)return 1;
 if(s<.55)return 0;
 if(h<38||h>345)return s>.66?2:0;
 if(h<76)return 3;
 if(h<175)return 4;
 if(h>190&&h<250)return 5;
 return 0;
}
export function detectFace(image) {
 const {width,height,data}=image,n=width*height,mask=new Uint8Array(n),seen=new Uint8Array(n),stack=new Int32Array(n),parts=[];
 for(let i=0;i<n;i++)mask[i]=maskColor([data[i*4],data[i*4+1],data[i*4+2]]);
 for(let start=0;start<n;start++){
  if(!mask[start]||seen[start])continue;
  let head=0,tail=1,minx=width,maxx=0,miny=height,maxy=0,sx=0,sy=0;stack[0]=start;seen[start]=1;
  while(head<tail){const p=stack[head++],x=p%width,y=Math.floor(p/width);minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);sx+=x;sy+=y;
   for(const next of [x>0?p-1:-1,x<width-1?p+1:-1,y>0?p-width:-1,y<height-1?p+width:-1])if(next>=0&&!seen[next]&&mask[next]===mask[start]){seen[next]=1;stack[tail++]=next;}
  }
  const w=maxx-minx+1,h=maxy-miny+1;
  if(tail>n*.0005&&tail<n*.055&&w/h>.5&&w/h<1.9&&tail/(w*h)>.45){parts.push({x:sx/tail,y:sy/tail,size:Math.sqrt(tail),area:tail,bounds:[minx,miny,maxx,maxy]});}
 }
 let best=null;
 for(const center of parts){
  const rights=parts.filter(p=>p.x>center.x&&Math.abs(p.y-center.y)<(p.x-center.x)*.65),downs=parts.filter(p=>p.y>center.y&&Math.abs(p.x-center.x)<(p.y-center.y)*.65);
  for(const right of rights)for(const down of downs){
   const a=[right.x-center.x,right.y-center.y],b=[down.x-center.x,down.y-center.y],la=Math.hypot(...a),lb=Math.hypot(...b);
   if(la/lb<.65||la/lb>1.55||la<center.size*.8||la>center.size*2.1||lb<center.size*.8||lb>center.size*2.1||Math.abs(a[0]*b[0]+a[1]*b[1])/(la*lb)>.4)continue;
   const grid=[];let score=0;
   for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){
    const px=center.x+x*a[0]+y*b[0],py=center.y+x*a[1]+y*b[1];let nearest=null,distance=Infinity;
    for(const p of parts){const d=Math.hypot(px-p.x,py-p.y);if(d<distance){distance=d;nearest=p;}}
    if(distance>Math.min(la,lb)*.25||!nearest||nearest.size/center.size<.55||nearest.size/center.size>1.65||grid.includes(nearest)){score=Infinity;break;}
    grid.push(nearest);score+=distance/(la+lb)+Math.abs(Math.log(nearest.size/center.size))*.07;
   }
   if(grid.length!==9||!Number.isFinite(score))continue;
   if(!best||score<best.score)best={grid,score};
  }
 }
 if(!best)throw Error('Fotoğrafta dokuz kare güvenle bulunamadı. Yüzün tamamını daha yakından ve karşıdan çek veya elle seç.');
 const map=homography([best.grid[0],best.grid[2],best.grid[8],best.grid[6]].map(p=>[p.x,p.y]));
 const corners=[map(-.25,-.25),map(1.25,-.25),map(1.25,1.25),map(-.25,1.25)];
 const mock={width,height,getContext:()=>({getImageData:()=>image})};
 const raw=sampleFace(mock,corners);
 return {corners,raw,colors:raw.map(classifyColor),score:best.score,components:parts.length};
}
export function rotateGrid(values){return [6,3,0,7,4,1,8,5,2].map(i=>values[i]);}
export function alignFaces(faces) {
 if(FACES.some(f=>!faces[f]||faces[f][4]!==f))return {ok:false,message:'Altı farklı merkez rengi gerekli.'};
 const variants=Object.fromEntries(FACES.map(f=>{const v=[faces[f]];for(let i=1;i<4;i++)v.push(rotateGrid(v[i-1]));return [f,v];}));
 const matches=[];let best=null;
 for(let index=0;index<4096;index++){
  let code=index;const candidate={},rotations={};let cost=0;
  for(const f of FACES){const r=code%4;code=Math.floor(code/4);candidate[f]=variants[f][r];rotations[f]=r;cost+=Math.min(r,4-r);}
  if(validate(candidate).ok){const key=JSON.stringify(candidate);if(!matches.includes(key))matches.push(key);if(!best||cost<best.cost)best={faces:candidate,rotations,cost};}
 }
 return best?{ok:true,...best,ambiguous:matches.length>1,count:matches.length}:{ok:false,message:'Renkler okundu ancak yüzler geçerli bir küp oluşturmuyor. Çekimler arasında hamle yapılmadığını ve renkleri kontrol et.'};
}
