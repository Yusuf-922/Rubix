import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {solved,apply,FACES,facelets,fromFaces} from '../public/cube.js';
import {solverInput,verifySolution,solveCube} from '../public/solver.js';
import {alignFaces} from '../public/vision.js';

const context=vm.createContext({});
for(const name of ['cube','solve'])vm.runInContext(readFileSync(new URL(`../public/vendor/cubejs/${name}.js`,import.meta.url),'utf8'),context);
vm.runInContext(readFileSync(new URL('../public/short-solver.js',import.meta.url),'utf8'),context);
vm.runInContext(readFileSync(new URL('../public/slice-solver.js',import.meta.url),'utf8'),context);
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
test('orta dilim hamleleri merkezlere göre okunur ve çözüm doğrulanır',()=>{
 for(const scramble of ['M','E','S',"M U E' F S2",'R M U E2 F S L']){
  let state=solved();for(const move of scramble.split(' '))state=apply(state,move);
  const input=solverInput(state);
  assert.equal(input.length,54,scramble);
  const solution=Cube.fromString(input).solve();
  assert.ok(verifySolution(state,solution).length>0,scramble);
 }
});
test('isteğe bağlı orta dilim araması tek M/E/S durumlarını bir hamlede çözer',()=>{
 for(const scramble of ['M','E','S']){
  const state=apply(solved(),scramble),faces=facelets(state);
  const raw=FACES.map(f=>faces[f].join('')).join('');
  const ordinary=Cube.fromString(solverInput(state)).solve();
  const enhanced=context.findSliceSolution(Cube,raw,ordinary);
  assert.equal(enhanced,`${scramble}'`);
  assert.deepEqual(verifySolution(state,enhanced),[enhanced]);
 }
});
test('Pro kısa arama yakın durumlarda gerçek en kısa çözümü bulur',()=>{
 const cases=[['U',"U'"],['D2','D2'],['R U',"U' R'"],["R U R' U'","U R U' R'"]];
 for(const [scramble,expected] of cases){
  const cube=new Cube().move(scramble),solution=context.findShortSolution(Cube,cube,8);
  assert.equal(solution.split(/\s+/).length,expected.split(/\s+/).length,scramble);
  assert.equal(new Cube().move(scramble).move(solution).isSolved(),true,scramble);
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
 globalThis.Worker=class{constructor(){worker=this;this.terminated=false;}postMessage(message){this.request=message;}terminate(){this.terminated=true;}};
 try{
  let job=solveCube(apply(solved(),'R'));
  assert.equal(worker.request.allowSlices,false);
  worker.onmessage({data:{algorithm:"R'"}});
  assert.deepEqual(await job.promise,["R'"]);assert.equal(worker.terminated,true);
  job=solveCube(solved());worker.onmessage({data:{algorithm:'U'}});
  await assert.rejects(job.promise,/doğrulanamadı/);assert.equal(worker.terminated,true);
  job=solveCube(solved());job.cancel();
  await assert.rejects(job.promise,/iptal/);assert.equal(worker.terminated,true);
  job=solveCube(solved());worker.onerror({preventDefault(){}});
  await assert.rejects(job.promise,/yüklenemedi/);assert.equal(worker.terminated,true);
  job=solveCube(apply(solved(),'M'),()=>{},'normal',true);
  assert.equal(worker.request.allowSlices,true);
  assert.equal(worker.request.rawInput.length,54);
  worker.onmessage({data:{algorithm:"M'"}});
  assert.deepEqual(await job.promise,["M'"]);
 }finally{if(previous===undefined)delete globalThis.Worker;else globalThis.Worker=previous;}
});
