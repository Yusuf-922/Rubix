// Synthetic scrambled face images for repeatable photo-import checks.
import {mkdir,writeFile} from 'node:fs/promises';import {deflateSync} from 'node:zlib';
import {solved,apply,facelets,FACES,COLORS} from '../public/cube.js';
const dir=new URL('./fixtures/',import.meta.url);await mkdir(dir,{recursive:true});
function crc32(buf){let n=0xffffffff;for(const b of buf){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([length,t,data,crc]);}
let state=solved();for(const move of ['R','U',"F'",'L2','D','B2','U'])state=apply(state,move);const faces=facelets(state);
for(const f of FACES){const size=300,raw=Buffer.alloc((size*3+1)*size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const color=COLORS[faces[f][Math.floor(y/100)*3+Math.floor(x/100)]].slice(1).match(/../g).map(v=>parseInt(v,16));for(let c=0;c<3;c++)raw[y*(size*3+1)+1+x*3+c]=(x%100<4||y%100<4)?12:color[c];}const head=Buffer.alloc(13);head.writeUInt32BE(size,0);head.writeUInt32BE(size,4);head[8]=8;head[9]=2;await writeFile(new URL(f+'.png',dir),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));}
console.log('Altı yapay test yüzü tests/fixtures klasörüne yazıldı.');
