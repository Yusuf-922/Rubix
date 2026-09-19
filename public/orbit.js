// Orientation is accumulated in screen space, so upside-down views do not
// reverse the controls and a pole-facing view never turns yaw into roll.
const multiply=([a,b,c,d],[w,x,y,z])=>[
 a*w-b*x-c*y-d*z,a*x+b*w+c*z-d*y,
 a*y-b*z+c*w+d*x,a*z+b*y-c*x+d*w
];
const axisAngle=(x,y,z,angle)=>{const s=Math.sin(angle/2);return [Math.cos(angle/2),x*s,y*s,z*s];};
export class Orbit {
 constructor(){this.reset();}
 reset(){this.q=multiply(axisAngle(1,0,0,.48),axisAngle(0,1,0,-.65));}
 turn(horizontal,vertical){
  const angle=Math.hypot(horizontal,vertical);if(!angle)return;
  const q=multiply(axisAngle(vertical/angle,horizontal/angle,0,angle),this.q);
  const length=Math.hypot(...q);this.q=q.map(v=>v/length);
 }
 view([x,y,z]){
  const [w,a,b,c]=this.q;
  const tx=2*(b*z-c*y),ty=2*(c*x-a*z),tz=2*(a*y-b*x);
  return [x+w*tx+b*tz-c*ty,y+w*ty+c*tx-a*tz,z+w*tz+a*ty-b*tx];
 }
}
