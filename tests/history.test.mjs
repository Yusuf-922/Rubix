import test from 'node:test';import assert from 'node:assert/strict';
import {projectedHistory,historyRequest} from '../public/history.js';
import {solved,apply,facelets} from '../public/cube.js';
test('yineleme, geri alma animasyonu tamamlanmadan sıraya alınabilir',()=>{
 const undo=historyRequest('undo',['R','U'],2);assert.deepEqual(undo,{kind:'undo',move:"U'"});
 const redo=historyRequest('redo',['R','U'],2,[undo]);assert.deepEqual(redo,{kind:'redo',move:'U'});
 assert.deepEqual(projectedHistory(['R','U'],2,[undo,redo]),{moves:['R','U'],index:2});
});
test('henüz başlamayan hamleyi geri alıp yinelemek geçmişi kaybetmez',()=>{
 const jobs=[{kind:'move',move:'R'},{kind:'move',move:'U'}];jobs.push(historyRequest('undo',[],0,jobs));jobs.push(historyRequest('redo',[],0,jobs));
 assert.deepEqual(projectedHistory([],0,jobs),{moves:['R','U'],index:2});
 let actual=solved();for(const job of jobs)actual=apply(actual,job.move);
 assert.deepEqual(facelets(actual),facelets(apply(apply(solved(),'R'),'U')));
});
test('tekrarlı geri alma/yineleme sınırda durur ve yeni hamle dalı açar',()=>{
 const jobs=[];for(let i=0;i<2;i++)jobs.push(historyRequest('undo',['R','F'],2,jobs));assert.equal(historyRequest('undo',['R','F'],2,jobs),null);
 for(let i=0;i<2;i++)jobs.push(historyRequest('redo',['R','F'],2,jobs));assert.equal(historyRequest('redo',['R','F'],2,jobs),null);
 assert.deepEqual(projectedHistory(['R','F'],1,[{kind:'move',move:'U'}]),{moves:['R','U'],index:2});
});
