export function homography(q){
 const uv=[[0,0],[1,0],[1,1],[0,1]],a=[];
 for(let i=0;i<4;i++){const [u,v]=uv[i],[x,y]=q[i];a.push([u,v,1,0,0,0,-u*x,-v*x,x],[0,0,0,u,v,1,-u*y,-v*y,y]);}
 for(let c=0;c<8;c++){let best=c;for(let r=c+1;r<8;r++)if(Math.abs(a[r][c])>Math.abs(a[best][c]))best=r;[a[c],a[best]]=[a[best],a[c]];if(Math.abs(a[c][c])<1e-8)throw Error('Köşeler bir yüz oluşturmuyor. Yeniden seç.');const v=a[c][c];for(let j=c;j<9;j++)a[c][j]/=v;for(let r=0;r<8;r++){if(r===c)continue;const v=a[r][c];for(let j=c;j<9;j++)a[r][j]-=v*a[c][j];}}
 const h=a.map(r=>r[8]);return (u,v)=>{const d=h[6]*u+h[7]*v+1;return [(h[0]*u+h[1]*v+h[2])/d,(h[3]*u+h[4]*v+h[5])/d];};
}
export function sampleFace(canvas,corners){
 const signs=corners.map((p,i)=>{const b=corners[(i+1)%4],c=corners[(i+2)%4];return (b[0]-p[0])*(c[1]-b[1])-(b[1]-p[1])*(c[0]-b[0]);});
 if(signs.some(v=>v<=2))throw Error('Köşeleri sol üst, sağ üst, sağ alt, sol alt sırasıyla seç.');
 const map=homography(corners),ctx=canvas.getContext('2d',{willReadFrequently:true}),{data,width,height}=ctx.getImageData(0,0,canvas.width,canvas.height);
 return Array.from({length:9},(_,i)=>{const channels=[[],[],[]];for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){const [px,py]=map((i%3+.5+a*.025)/3,(Math.floor(i/3)+.5+b*.025)/3),x=Math.max(0,Math.min(width-1,Math.round(px))),y=Math.max(0,Math.min(height-1,Math.round(py)));for(let c=0;c<3;c++)channels[c].push(data[(y*width+x)*4+c]);}return channels.map(xs=>xs.sort((a,b)=>a-b)[12]);});
}
export function lab(rgb){const [r,g,b]=rgb.map(v=>{v/=255;return v>.04045?((v+.055)/1.055)**2.4:v/12.92;});const xyz=[(r*.4124564+g*.3575761+b*.1804375)/.95047,r*.2126729+g*.7151522+b*.072175,(r*.0193339+g*.119192+b*.9503041)/1.08883].map(v=>v>.008856?Math.cbrt(v):7.787*v+16/116);return [116*xyz[1]-16,500*(xyz[0]-xyz[1]),200*(xyz[1]-xyz[2])];}
export const distance=(a,b)=>Math.hypot(...lab(a).map((x,i)=>x-lab(b)[i]));
