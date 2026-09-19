import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {solved,apply,FACES,fromFaces} from '../public/cube.js';
import {solverInput,verifySolution,solveCube} from '../public/solver.js';
import {alignFaces} from '../public/vision.js';

const context=vm.createContext({});
for(const name of ['cube','solve'])vm.runInContext(readFileSync(new URL(`../public/vendor/cubejs/${name}.js`,import.meta.url),'utf8'),context);
const Cube=context.Cube;
Cube.initSolver();
test('solver face order and all 18 turns agree with our cube model',()=>{
 for(const f of FACES)for(const suffix of ['',"'",'2']){
  const move=f+suffix,state=apply(solved(),move);
  assert.equal(solverInput(state),new Cube().move(move).asString());
  verifySolution(state,Cube.fromString(solverInput(state)).solve());
 }
});
test('solves deterministic mixed scrambles and leaves original state intact',()=>{
 let seed=41;
 for(let n=0;n<12;n++){
  let state=solved();
  for(let i=0;i<25;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;state=apply(state,FACES[seed%6]+['',"'",'2'][(seed>>>8)%3]);}
  const before=JSON.stringify(state);
  verifySolution(state,Cube.fromString(solverInput(state)).solve());
  assert.equal(JSON.stringify(state),before);
 }
});
test('solves the six supplied photo grids after alignment',()=>{
 const grids=['LFDLLLDDU','LFFBRDBDU','RBBFBUFBU','BUDRDUFLU','BRRDFBDLL','LRRFURRUF'];
 const aligned=alignFaces(Object.fromEntries(grids.map(s=>[s[4],[...s]])));
 assert.equal(aligned.ok,true);
 const state=fromFaces(aligned.faces);
 assert.ok(verifySolution(state,Cube.fromString(solverInput(state)).solve()).length>0);
});
test('solved input, invalid state and incorrect solver output are handled',()=>{
 assert.deepEqual(verifySolution(solved(),''),[]);
 assert.throws(()=>verifySolution(solved(),'R'),/doğrulanamadı/);
 assert.throws(()=>verifySolution(solved(),'x'),/geçersiz/);
 const state=solved();state[0].color='R';assert.throws(()=>solverInput(state));
});
test('worker result is verified, errors and cancellation release the worker',async()=>{
 const previous=globalThis.Worker;let worker;
 globalThis.Worker=class{constructor(){worker=this;this.terminated=false;}postMessage(message){this.input=message.input;}terminate(){this.terminated=true;}};
 try{
  let job=solveCube(apply(solved(),'R'));
  worker.onmessage({data:{algorithm:"R'"}});
  assert.deepEqual(await job.promise,["R'"]);assert.equal(worker.terminated,true);
  job=solveCube(solved());worker.onmessage({data:{algorithm:'U'}});
  await assert.rejects(job.promise,/doğrulanamadı/);assert.equal(worker.terminated,true);
  job=solveCube(solved());job.cancel();
  await assert.rejects(job.promise,/iptal/);assert.equal(worker.terminated,true);
  job=solveCube(solved());worker.onerror({preventDefault(){}});
  await assert.rejects(job.promise,/yüklenemedi/);assert.equal(worker.terminated,true);
 }finally{if(previous===undefined)delete globalThis.Worker;else globalThis.Worker=previous;}
});
