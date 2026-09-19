import test from 'node:test';
import assert from 'node:assert/strict';
import {Orbit} from '../public/orbit.js';
import {rotate} from '../public/cube.js';
const close=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-10,`${a} != ${b}`));
test('horizontal dragging stays screen-horizontal upright, inverted and pole-facing',()=>{
 for(const pitch of [0,Math.PI/2,Math.PI,3*Math.PI/2,8*Math.PI+.3]){
  const orbit=new Orbit();orbit.turn(.65,0);orbit.turn(0,pitch);
  const points=[[0,1,0],[0,-1,0],[1,0,0],[0,0,1]],before=points.map(p=>orbit.view(p));
  orbit.turn(.12,0);
  points.forEach((p,i)=>close(orbit.view(p),rotate(before[i],[0,1,0],.12)));
 }
});
test('vertical screen rotation stays consistent after combined turns',()=>{
 const orbit=new Orbit();orbit.turn(1.5,2.8);orbit.turn(-.8,1.4);
 const point=[.4,.6,1],before=orbit.view(point);orbit.turn(0,-.1);
 close(orbit.view(point),rotate(before,[1,0,0],-.1));
});
test('full rotations, inverse drags and reset preserve orientation and lengths',()=>{
 const orbit=new Orbit(),point=[1,2,3],initial=orbit.view(point);
 orbit.turn(0,Math.PI*8);close(orbit.view(point),initial);
 for(let i=0;i<10000;i++)orbit.turn(.013,-.007);
 assert.ok(Math.abs(Math.hypot(...orbit.view(point))-Math.hypot(...point))<1e-10);
 const before=orbit.view(point);orbit.turn(.3,.7);orbit.turn(-.3,-.7);close(orbit.view(point),before);
 orbit.reset();close(orbit.view(point),initial);
 close(initial,rotate(rotate(point,[0,1,0],-.65),[1,0,0],.48));
});
