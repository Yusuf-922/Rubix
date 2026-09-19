import test from 'node:test';import assert from 'node:assert/strict';
import {parseSequence,Playback,DEFAULT_KEYS,validateKeys} from '../public/playback.js';
import {solved,apply,facelets} from '../public/cube.js';
test('çok satırlı akış, küçük harfler ve farklı kesme işaretleri',()=>{
 assert.deepEqual(parseSequence("r U’\n\nF2 b′"),[{move:'R',line:0},{move:"U'",line:0},{move:'F2',line:2},{move:"B'",line:2}]);
 assert.deepEqual(parseSequence(' \n '),[]);assert.throws(()=>parseSequence('R\nX'),/2. satır/);assert.throws(()=>parseSequence('R3'),/geçerli değil/);assert.throws(()=>parseSequence('U '.repeat(1001)),/1000/);
});
test('akıcı oynatma her satır sonunda bekler; yeni satır komutla başlar',()=>{
 const p=new Playback(parseSequence("R U\nF2"));assert.equal(p.take().move,'R');assert.equal(p.take(),null);p.complete();assert.equal(p.take().move,'U');p.complete();assert.equal(p.phase,'break');assert.equal(p.take(),null);p.advance();assert.equal(p.take().move,'F2');p.complete();assert.equal(p.phase,'done');assert.equal(p.advance(),false);assert.equal(p.take(),null);
});
test('adım modunda her komut sadece bir hamle oynatır',()=>{
 const p=new Playback(parseSequence('R U F'),'step');assert.equal(p.take(),null);
 for(const move of ['R','U','F']){assert.equal(p.advance(),true);assert.equal(p.take().move,move);assert.equal(p.advance(),false);p.complete();assert.equal(p.take(),null);}
 assert.equal(p.phase,'done');assert.equal(p.index,3);
});
test('animasyon sırasında duraklatma sonraki hamleyi engeller',()=>{
 const p=new Playback(parseSequence('R U'));p.take();p.pause();p.complete();assert.equal(p.phase,'paused');assert.equal(p.take(),null);p.advance();assert.equal(p.take().move,'U');
});
test('iki oynatma aynı sonucu verir ve kaynak diziyi değiştirmez',()=>{
 const entries=parseSequence("R U R' U'");const original=JSON.stringify(entries);let expected=solved();for(const {move} of entries)expected=apply(expected,move);
 for(let run=0;run<2;run++){const p=new Playback(entries);let s=solved();while(p.phase!=='done'){const entry=p.take();s=apply(s,entry.move);p.complete();}assert.deepEqual(facelets(s),facelets(expected));}
 assert.equal(JSON.stringify(entries),original);
});
test('kısayollar tek karakter ve benzersiz olmalı',()=>{
 assert.equal(validateKeys(DEFAULT_KEYS),true);assert.equal(validateKeys({...DEFAULT_KEYS,U:'1'}),true);assert.equal(validateKeys({...DEFAULT_KEYS,U:'r'}),false);assert.equal(validateKeys({...DEFAULT_KEYS,U:' '}),false);assert.equal(validateKeys({...DEFAULT_KEYS,U:'ArrowUp'}),false);
});
