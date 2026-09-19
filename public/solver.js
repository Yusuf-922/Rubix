import {FACES,facelets,validate,apply} from './cube.js';

export function solverInput(state) {
 const faces=facelets(state),validation=validate(faces);
 if(!validation.ok)throw Error(validation.message);
 return FACES.map(f=>faces[f].join('')).join('');
}
export function verifySolution(state,algorithm) {
 const moves=algorithm.trim()?algorithm.trim().split(/\s+/):[];
 if(moves.some(m=>! /^[URFDLB](2|')?$/.test(m)))throw Error('Çözüm motoru geçersiz bir hamle döndürdü.');
 const result=facelets(moves.reduce((s,m)=>apply(s,m),state));
 if(!FACES.every(f=>result[f].every(c=>c===f)))throw Error('Üretilen çözüm doğrulanamadı.');
 return moves;
}

export function solveCube(state,onStatus=()=>{}) {
 const input=solverInput(state);
 const worker=new Worker(new URL('./solver-worker.js',import.meta.url));
 let cancel;
 const promise=new Promise((resolve,reject)=>{
  const finish=(error,result)=>{clearTimeout(timer);worker.terminate();error?reject(error):resolve(result);};
  const timer=setTimeout(()=>finish(Error('Çözüm süresi aşıldı. Yeniden deneyebilirsin.')),120000);
  cancel=()=>finish(Error('Çözüm hesaplaması iptal edildi.'));
  worker.onerror=event=>{event.preventDefault();finish(Error('Çözüm motoru yüklenemedi. Sayfayı yenileyip tekrar dene.'));};
  worker.onmessage=({data})=>{
   if(data.status){onStatus(data.status);return;}
   if(data.error){finish(Error(data.error));return;}
   try{finish(null,verifySolution(state,data.algorithm));}catch(error){finish(error);}
  };
  worker.postMessage({input});
 });
 return {promise,cancel};
}
