import {readFile} from 'node:fs/promises';
import {detectFace,alignFaces} from '../public/vision.js';
const root=new URL('./fixtures/real/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8')),faces={};
for(const item of manifest){const data=await readFile(new URL(item.file,root));try{const result=detectFace({...item,data});faces[result.colors[4]]=result.colors;console.log(item.name,JSON.stringify(result));}catch(err){console.log(item.name,err.message);}}
console.log('ALIGN',alignFaces(faces));
