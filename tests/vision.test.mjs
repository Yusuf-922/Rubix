import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {detectFace,alignFaces,rotateGrid,classifyColor} from '../public/vision.js';
import {validate,FACES,fromFaces,apply,facelets} from '../public/cube.js';
const root=new URL('./fixtures/real/',import.meta.url),available=existsSync(new URL('manifest.json',root));
const expected=['LFDLLLDDU','LFFBRDBDU','RBBFBUFBU','BUDRDUFLU','BRRDFBDLL','LRRFURRUF'];
test('altı gerçek fotoğraftaki 54 kare köşe seçilmeden doğru okunur',{skip:!available},()=>{
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
 const faces={};
 manifest.forEach((item,i)=>{const result=detectFace({...item,data:readFileSync(new URL(item.file,root))});assert.equal(result.colors.join(''),expected[i],item.name);faces[result.colors[4]]=result.colors;});
 const alignment=alignFaces(faces);assert.equal(alignment.ok,true);assert.equal(alignment.ambiguous,false);assert.equal(validate(alignment.faces).ok,true);assert.deepEqual(alignment.rotations,{U:0,R:2,F:0,D:0,L:2,B:2});
 const original=fromFaces(alignment.faces);for(const f of FACES){assert.deepEqual(facelets(apply(apply(original,f),f+"'")),alignment.faces);}
});
test('dört fotoğraf dönüşü hücre sırasını korur; sabit beyaz/kırmızı/turuncu ayrımı',()=>{
 let grid=Array.from({length:9},(_,i)=>i);for(let i=0;i<4;i++)grid=rotateGrid(grid);assert.deepEqual(grid,Array.from({length:9},(_,i)=>i));
 assert.equal(classifyColor([216,202,193]),'U');assert.equal(classifyColor([178,42,20]),'R');assert.equal(classifyColor([218,82,32]),'L');
});
test('yüz içermeyen düz bir görsel güvenli şekilde reddedilir',()=>{
 const width=120,height=160,data=new Uint8ClampedArray(width*height*4).fill(255);assert.throws(()=>detectFace({width,height,data}),/bulunamadı/);
});
