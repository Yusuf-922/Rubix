import {FACES,COLORS,LABELS,NORMAL,solved,clone,dot,cross,rotate,parse,apply,inverse,facelets,fromFaces,validate} from './cube.js';
import {sampleFace,homography} from './photo.js';
import {parseSequence,Playback,DEFAULT_KEYS,validateKeys} from './playback.js';
import {detectFace,classifyColor,classifyWithReferences,COLOR_NAMES,rotateGrid,alignFaces,assessPhotoFaces,hsv} from './vision.js';
import {projectedHistory,historyRequest} from './history.js';
import {solveCube,solverInput} from './solver.js';
import {Orbit} from './orbit.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const hexrgb=h=>h.match(/\w\w/g).map(x=>parseInt(x,16));
let state=solved(),initial=clone(state),history=[],cursor=0,queue=[],animation=null,mode='',zoom=1,displayColors={...COLORS};
const orbit=new Orbit();
let liveBase=clone(initial),initialSource='Örnek küp';
let selected='U',paint='U',photos=[],faceData={},toastTimer,photoCounter=0;
const calibration={references:{},active:false,next:0};
const photoDataByUrl=new Map();
let playback=null,liveSnapshot=null,playbackTimer=null,draftDirty=false,keys={...DEFAULT_KEYS};
let solutionBase=null,solverJob=null;
let heldCube=null,heldSource='';
let easterMessage='';
const KONAMI=['U','U','D','D','L','R','L','R','B','F'];
function clearSolution(){if(solutionBase){solutionBase=null;draftDirty=false;}if(!solverJob)$('#solver-status').textContent='Mevcut küp için çözüm bul; tamamını veya adım adım izle.';}
try{const stored=JSON.parse(localStorage.getItem('rubix-shortcuts'));if(stored&&validateKeys(stored))keys=Object.fromEntries(FACES.map(f=>[f,stored[f].toLowerCase()]));}catch{}
const swatch=f=>COLORS[f];
let analyzing=false,analysisMessage='';
let photoDiagnostics=[];
const oriented={U:'B · Arka',R:'U · Üst',F:'U · Üst',D:'F · Ön',L:'U · Üst',B:'U · Üst'};
const canvas=$('#cube-canvas'),ctx=canvas.getContext('2d');
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function references(){for(const [id,f] of [['#ref-up','U'],['#ref-front','F']])$(id).innerHTML=`<i style="background:${displayColors[f]}"></i>${LABELS[f]} · ${f}`;$$('.stage-face-button').forEach(button=>button.style.setProperty('--face-color',displayColors[button.dataset.face]));}
references();
function addFaceButtons(container,stage=false){for(const [index,f] of FACES.entries()){const b=document.createElement('button');let pressTimer=null,tapTimer=null,held=false,pointerType='mouse';b.className=stage?'stage-face-button':'';b.innerHTML=stage?`<strong>${f}</strong><small>${LABELS[f]}</small>`:`<strong>${f}</strong><small>${LABELS[f]}</small><span class="shortcut-key"></span>`;b.dataset.face=f;if(stage)b.style.setProperty('--face-color',displayColors[f]);b.dataset.index=index;b.setAttribute('aria-label',`${LABELS[f]} yüzünü döndür`);b.onpointerdown=e=>{pointerType=e.pointerType;if(e.pointerType==='mouse'&&e.button===2){e.preventDefault();clearTimeout(tapTimer);enqueue(f+"'");return;}if(e.button!==0)return;held=false;clearTimeout(tapTimer);pressTimer=setTimeout(()=>{held=true;enqueue(f+'2');},400);};b.onpointerup=b.onpointercancel=b.onpointerleave=()=>clearTimeout(pressTimer);b.oncontextmenu=e=>e.preventDefault();b.onclick=e=>{if(held){e.preventDefault();return;}if(pointerType==='touch'||pointerType==='pen'){clearTimeout(tapTimer);tapTimer=setTimeout(()=>enqueue(f+mode),260);}else enqueue(f+mode);};b.ondblclick=e=>{if(held)return;if(pointerType==='touch'||pointerType==='pen'){e.preventDefault();clearTimeout(tapTimer);enqueue(f+"'");}};container.append(b);}}
addFaceButtons($('#stage-move-buttons'),true);
$$('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;$$('[data-mode]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b);});});
function enqueue(move,kind='move'){easterMessage='';if(playback)stopPlayback();if(queue.length>40){toast('Önce sıradaki hamlelerin tamamlanmasını bekle.');return;}let appended=false;if(draftDirty&&kind==='move'){const sequence=$('#sequence');sequence.value+=(sequence.value.trim()?' ':'')+move;appended=true;}clearSolution();if(appended)draftDirty=true;queue.push({move,kind});updateHistory();startNext();}function startNext(){
 if(animation)return;
 const entry=playback?.take();
 const job=playback?(entry?{move:entry.move,kind:'replay'}:null):queue.shift();
 if(!job){updateHistory();return;}
 animation={...job,...parse(job.move),start:performance.now(),duration:1000-Number($('#speed').value)};updateHistory();
}
function updateHistory(){
 const projected=projectedHistory(history,cursor,[animation,...queue]);
 $('#undo').disabled=!!playback||projected.index===0;$('#redo').disabled=!!playback||projected.index===projected.moves.length;
 $('#move-count').textContent=playback?`${playback.index} / ${playback.entries.length} · önizleme`:`${cursor} hamle${queue.length?' · '+queue.length+' sırada':''}`;
 const el=$('#notation');el.replaceChildren();
 if(playback){let line=-1,row;playback.entries.forEach((entry,i)=>{if(line!==entry.line){line=entry.line;row=document.createElement('div');row.className='notation-line';const label=document.createElement('span');label.className='line-number';label.textContent=line+1;row.append(label);el.append(row);}const token=document.createElement('span');token.className='token'+(i<playback.index?' complete':i===playback.index?' current':' future');token.textContent=entry.move;row.append(token);});}
 else {
  history.forEach((m,i)=>{const s=document.createElement('span');s.className='token'+(i>=cursor?' future':'')+(!animation&&i===cursor-1?' current':'');s.textContent=m;el.append(s);});
  if(animation){const s=document.createElement('span');s.className='token current';s.textContent=(animation.kind==='undo'?'↶ ':'')+animation.move;el.append(s);}
  queue.forEach(job=>{const s=document.createElement('span');s.className='token future';s.textContent=job.move;el.append(s);});
 }
 if(!el.children.length)el.innerHTML='<span class="notation-empty">İlk hamleni yap. Hikâye burada başlasın.</span>';
 const active=el.querySelector('.current');if(active)el.scrollTop=Math.max(0,active.offsetTop-el.offsetTop-el.clientHeight+active.offsetHeight+8);
 if(!draftDirty&&!playback)$('#sequence').value=history.slice(0,cursor).join(' ');
 updatePlaybackControls();
}
function undo(){
 if(playback)stopPlayback();
 const job=historyRequest('undo',history,cursor,[animation,...queue]);if(job)enqueue(job.move,job.kind);
}
function redo(){if(playback)stopPlayback();const job=historyRequest('redo',history,cursor,[animation,...queue]);if(job)enqueue(job.move,job.kind);}
$('#undo').onclick=undo;
$('#redo').onclick=redo;
function resetState(s){if(playback)stopPlayback();clearSolution();solverJob?.cancel();easterMessage='';state=clone(s);liveBase=clone(s);queue=[];animation=null;history=[];cursor=0;draftDirty=false;updateHistory();updateTrainingStatus();}
function heldStateMatches(){return !!heldCube&&solverInput(state)===solverInput(heldCube);}
function isKonamiSequence(){return solverInput(liveBase)===solverInput(solved())&&history.length===KONAMI.length&&history.every((move,index)=>move===KONAMI[index]);}
function holdCube(source='Tutulan konum'){if(animation||queue.length){toast('Önce süren hamlelerin tamamlanmasını bekle.');return;}const secret=isKonamiSequence();easterMessage='';heldCube=clone(state);heldSource=source;initial=clone(state);initialSource=source;liveBase=clone(state);history=[];cursor=0;draftDirty=false;clearSolution();$('#source-label').textContent=source;updateHistory();if(secret)showEasterEggNote();else toast('Küp konumu tutuldu. Çözüm hazır.');}
$('#hold-cube').onclick=()=>holdCube();
$('#reset-cube').onclick=()=>{resetState(heldCube||initial);$('#source-label').textContent=heldCube?heldSource:initialSource;toast('Küp tutulan konuma döndü.');};
$('#solve-reset').onclick=()=>{resetState(solved());$('#source-label').textContent='Çözülmüş küp';toast('Küp çözülmüş hale sıfırlandı.');};
function scrambleMoves(length=20){const turns=['',String.fromCharCode(39),'2'],moves=[];let previous='';while(moves.length<length){const face=FACES[Math.floor(Math.random()*FACES.length)];if(face===previous)continue;moves.push(face+turns[Math.floor(Math.random()*turns.length)]);previous=face;}return moves;}
function scrambleCube(){if(playback||animation||queue.length||solverJob){toast('Önce devam eden işlemin tamamlanmasını bekle.');return;}const moves=scrambleMoves();easterMessage='';clearSolution();queue.push(...moves.map(move=>({move,kind:'scramble'})));updateHistory();startNext();toast('Küp 20 hamleyle karıştırılıyor.');}
$('#scramble-cube').onclick=scrambleCube;$('#reset-view').onclick=()=>{orbit.reset();zoom=1;};
$('#zoom-in').onclick=()=>zoom=Math.min(1.45,zoom+.1);$('#zoom-out').onclick=()=>zoom=Math.max(.6,zoom-.1);
$('#speed').oninput=()=>$('#speed-value').textContent=(520/(1000-Number($('#speed').value))).toFixed(1)+'×';
function updatePlaybackControls(){
 const held=heldStateMatches()&&!playback&&!animation&&!queue.length;
 $('#hold-cube').hidden=held;$('#hold-cube').disabled=!!playback||!!animation||queue.length>0;
 $('#solve-cube').hidden=!held;$('#solve-cube').disabled=!held||!!solverJob;
 $('#cancel-solve').hidden=!solverJob;$('#scramble-cube').disabled=!!playback||!!animation||queue.length>0||!!solverJob;$('#stop-playback').hidden=!playback;$('#stop-playback').disabled=!playback;$('#playback-delay-value').textContent=(Number($('#playback-delay').value)/1000).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1})+' sn';
 $('#replay').textContent=solutionBase?'▶ Çözümü oynat':'▶ Yeniden oynat';
 const busy=!playback&&(!!animation||queue.length>0),empty=!$('#sequence').value.trim();
 $('#replay').disabled=busy||empty;
 $('#sequence').readOnly=!!playback;
 $('#previous').disabled=!playback||!!animation||playback.mode!=='step'||playback.index===0;
 $('#advance').disabled=busy||empty||!!animation||(!!playback&&(playback.phase==='done'||playback.phase==='running'));
 $('#advance').textContent=!playback?'Adım adım başlat · Boşluk':playback.phase==='break'?'Sonraki satır · Boşluk':'Sonraki adım · Boşluk';
 $('.workspace').classList.toggle('playback-active',!!playback);
}
function startPlayback(playMode){
 if(!playback&&(animation||queue.length)){toast('Sıradaki hamleler tamamlandığında oynatabilirsin.');return;}
 let entries;try{entries=parseSequence($('#sequence').value);if(!entries.length)throw Error('Önce bir hamle yap veya akışa hamle yaz.');$('#sequence-error').hidden=true;}catch(err){$('#sequence-error').textContent=err.message;$('#sequence-error').hidden=false;return;}
 if(playback)stopPlayback();
 liveSnapshot={state:clone(state),source:$('#source-label').textContent};
 state=clone(solutionBase||liveBase);playback=new Playback(entries,playMode);$('#source-label').textContent=solutionBase?'Çözüm önizlemesi':'Akış önizlemesi';
 // Move keyboard focus out of the editor so Space advances rather than types.
 canvas.focus({preventScroll:true});$('#stage').scrollIntoView({block:'start',behavior:'smooth'});updateHistory();schedulePlaybackNext(solutionBase?Math.max(450,Number($('#playback-delay').value)):0);
}
function schedulePlaybackNext(delay=Number($('#playback-delay').value)){if(!playback)return;clearTimeout(playbackTimer);if(delay>0){playbackTimer=setTimeout(()=>{playbackTimer=null;startNext();},delay);}else startNext();}
function stopPlayback(){if(!playback)return;const sequence=$('#sequence').value;clearTimeout(playbackTimer);playbackTimer=null;state=clone(liveSnapshot.state);$('#source-label').textContent=liveSnapshot.source;animation=null;playback=null;liveSnapshot=null;draftDirty=true;$('#solver-status').textContent='Oynatma durduruldu. Hamle akışını düzenleyebilirsin.';updateHistory();$('#sequence').value=sequence;}function advance(){if(animation)return;if(!playback){startPlayback('step');if(!playback)return;}if(playback.advance()){startNext();updateHistory();}}
function previous(){
 if(!playback||animation||playback.mode!=='step'||playback.index===0)return;
 const move=playback.entries[playback.index-1].move;
 if(!playback.rewind())return;
 const reverse=inverse(move);
 animation={move:reverse,kind:'rewind',...parse(reverse),start:performance.now(),duration:1000-Number($('#speed').value)};
 updateHistory();
}
$('#replay').onclick=()=>startPlayback('auto');$('#previous').onclick=previous;$('#advance').onclick=advance;$('#stop-playback').onclick=stopPlayback;$('#playback-delay').oninput=updatePlaybackControls;
function showEasterEggNote(){const note='Uygulamamı kullanıp bunu denemiş olman beni çok sevindirdi.\nUygulama Geliştiricisi Yusuf Birdal’dan sevgilerle :)';draftDirty=true;$('#sequence').value=note;toast('Sürpriz not hamle akışına eklendi.');}
$('#solve-cube').onclick=async()=>{
 if(!heldStateMatches()||solverJob||playback||animation||queue.length)return;
 const snapshot=clone(state);
 try{
  const input=solverInput(snapshot);
  solverJob=solveCube(snapshot,message=>$('#solver-status').textContent=message);updatePlaybackControls();
  const moves=await solverJob.promise;
  if(playback||animation||queue.length||solverInput(state)!==input){$('#solver-status').textContent='Hesaplama sırasında küp değişti. Yeniden Çöz düğmesine bas.';return;}
  if(!moves.length){$('#solver-status').textContent='Küp zaten çözülmüş durumda.';return;}
  solutionBase=snapshot;draftDirty=true;$('#sequence').value=moves.join(' ');$('#sequence-error').hidden=true;
  $('#solver-status').textContent=`${moves.length} hamlelik çözüm doğrulandı. Çözümü oynat veya Adım adım seç.`;
 }catch(error){$('#solver-status').textContent=error.message;}
 finally{solverJob=null;updateHistory();}
};
$('#cancel-solve').onclick=()=>solverJob?.cancel();
$('#sequence').oninput=()=>{draftDirty=true;$('#sequence-error').hidden=true;updatePlaybackControls();};
$('#sequence').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();startPlayback('auto');}};
function renderKeys(){
 $('#shortcut-fields').replaceChildren();for(const f of FACES){const label=document.createElement('label');label.textContent=f+' · '+LABELS[f];const input=document.createElement('input');input.maxLength=1;input.value=keys[f];input.dataset.face=f;input.setAttribute('aria-label',f+' hamlesinin kısayolu');label.append(input);$('#shortcut-fields').append(label);}
 $$('#stage-move-buttons button').forEach(b=>b.title=`${LABELS[b.dataset.face]} yüz · ${keys[b.dataset.face].toUpperCase()} veya ${Number(b.dataset.index)+1}`);
 $('.orbit-hint')?.replaceChildren();
}
function saveKeys(next){if(!validateKeys(next)){$('#shortcut-status').textContent='Her yüze farklı bir harf veya rakam ata.';return;}keys=next;try{localStorage.setItem('rubix-shortcuts',JSON.stringify(keys));$('#shortcut-status').textContent='Kısayollar bu tarayıcıya kaydedildi.';}catch{$('#shortcut-status').textContent='Kısayollar bu oturum için ayarlandı.';}renderKeys();}
$('#save-shortcuts').onclick=()=>saveKeys(Object.fromEntries($$('#shortcut-fields input').map(i=>[i.dataset.face,i.value.toLowerCase()])));
$('#reset-shortcuts').onclick=()=>saveKeys({...DEFAULT_KEYS});renderKeys();updateHistory();
document.addEventListener('keydown',e=>{
 if(trainingDialog.open){
  if(e.altKey)return;
  const input=e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA';if(input)return;
  const arrows={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,-.1],ArrowDown:[0,.1]};
  if(arrows[e.key]){e.preventDefault();trainingOrbit.turn(...arrows[e.key]);return;}
  if(e.repeat)return;const face=FACES.find((item,index)=>keys[item]===e.key.toLowerCase()||String(index+1)===e.key);if(face){e.preventDefault();trainingEnqueue(face+(e.shiftKey?String.fromCharCode(39):''));}return;
 }
 if($('#help').open||$('#shortcuts').open||$('#camera-dialog').open||e.altKey)return;
 if(previewDialog?.open){const input=e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA';if(input)return;const arrows={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,-.1],ArrowDown:[0,.1]};if(arrows[e.key]){e.preventDefault();previewOrbit.turn(...arrows[e.key]);return;}if(e.repeat)return;const face=FACES.find((item,index)=>keys[item]===e.key.toLowerCase()||String(index+1)===e.key);if(face){e.preventDefault();previewEnqueue(face+(e.shiftKey?String.fromCharCode(39):''));}return;}
 const textInput=e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT'&&!['range','button','checkbox','file'].includes(e.target.type)||e.target.isContentEditable;
 const editing=textInput&&!e.target.readOnly&&(e.target!==$('#sequence')||draftDirty);
 const z=e.code==='KeyZ'||e.key.toLowerCase()==='z',y=e.code==='KeyY'||e.key.toLowerCase()==='y';
 if((e.ctrlKey||e.metaKey)&&(z||y)&&!editing){e.preventDefault();e.stopPropagation();if(!e.repeat){if(y)redo();else if(!e.shiftKey)undo();}return;}
 if((textInput||e.target.tagName==='SELECT')&&!(playback&&e.target===$('#sequence')&&e.code==='Space'))return;
 if(e.ctrlKey||e.metaKey)return;
 if(e.code==='Space'&&e.shiftKey&&playback){e.preventDefault();if(!e.repeat)previous();return;}
 if(e.code==='Space'&&(playback||$('#sequence').value.trim())){e.preventDefault();if(!e.repeat)advance();return;}
 const arrows={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,-.1],ArrowDown:[0,.1]};
 if(arrows[e.key]){e.preventDefault();orbit.turn(...arrows[e.key]);return;}
 if(e.repeat)return;const f=FACES.find((f,index)=>keys[f]===e.key.toLowerCase()||String(index+1)===e.key);if(f){e.preventDefault();enqueue(f+(e.shiftKey?"'":mode));}
},true);
let drag=null;canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});};canvas.onpointermove=e=>{if(!drag)return;orbit.turn((e.clientX-drag.x)*.008,(e.clientY-drag.y)*.008);drag={x:e.clientX,y:e.clientY};};canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>drag=null;canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.6,Math.min(1.45,zoom-e.deltaY*.001));},{passive:false});
const view=v=>orbit.view(v);
function basis(n){const a=Math.abs(n[1])>.5?[1,0,0]:[0,1,0];return [a,cross(n,a)];}
function draw(now){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=rect.width,h=rect.height;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const scale=Math.min(w/7.8,h/6.4)*zoom,project=v=>[w/2+v[0]*scale*8/(8-v[2]),h*.48-v[1]*scale*8/(8-v[2])];
 const progress=animation?Math.min(1,(now-animation.start)/animation.duration):0,ease=progress<.5?4*progress**3:1-(-2*progress+2)**3/2;
 const polygons=[];
 function surface(p,n,extent,offset,color,layer){const [a,b]=basis(n);let center=p.map((x,i)=>x+n[i]*offset);let points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>center.map((x,i)=>x+extent*(a[i]*u+b[i]*v)));let normal=n;
  if(animation&&layer){points=points.map(v=>rotate(v,animation.axis,animation.angle*ease));normal=rotate(n,animation.axis,animation.angle*ease);center=rotate(center,animation.axis,animation.angle*ease);}
  const c=view(center),nv=view(normal);if(dot(nv,[-c[0],-c[1],8-c[2]])<=0)return;points=points.map(view);polygons.push({points:points.map(project),depth:c[2],color,light:.93+.07*Math.max(0,dot(nv,[-.25,.55,.8]))});}
 for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){if(!x&&!y&&!z)continue;const p=[x,y,z],layer=animation&&dot(p,animation.axis)===1;for(const n of Object.values(NORMAL))surface(p,n,.494,.499,'#101721',layer);}
 for(const t of state)surface(t.p,t.n,.438,.505,trainingColor(t),animation&&dot(t.p,animation.axis)===1);
 polygons.sort((a,b)=>a.depth-b.depth);for(const p of polygons){ctx.beginPath();p.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=p.color;ctx.fill();ctx.fillStyle=`rgba(0,0,0,${1-p.light})`;ctx.fill();ctx.strokeStyle='#070d1640';ctx.lineWidth=.6;ctx.stroke();}
 if(animation&&progress===1){const job=animation;state=apply(state,job.move);if(job.kind==='replay')playback.complete();else if(job.kind==='undo')cursor--;else if(job.kind==='redo')cursor++;else if(job.kind!=='rewind'){history=history.slice(0,cursor);history.push(job.move);cursor++;}animation=null;updateHistory();updateTrainingStatus(true);if(playback)schedulePlaybackNext();else startNext();}
 requestAnimationFrame(draw);

}
requestAnimationFrame(draw);
// Eğitim seçimi, ana küpte yalnızca o model için gerekli parçaları öne çıkarır.
let trainingModel='',trainingWasComplete=false;
function isCenterSticker(sticker){return sticker.p.filter(value=>value===0).length===2;}
function isEdgeSticker(sticker){return sticker.p.filter(value=>value===0).length===1;}
function trainingRelevant(sticker){return isEdgeSticker(sticker)&&state.some(candidate=>candidate.color==='U'&&candidate.p.every((value,index)=>value===sticker.p[index]));}
function trainingColor(sticker){if(!trainingModel||isCenterSticker(sticker)||trainingRelevant(sticker))return displayColors[sticker.color];return '#4a5665';}
function daisyComplete(){const faces=facelets(state);return [1,3,5,7].every(index=>faces.D[index]==='U');}
function whiteCrossComplete(){const faces=facelets(state);return [1,3,5,7].every(index=>faces.U[index]==='U')&&faces.B[1]==='B'&&faces.L[1]==='L'&&faces.R[1]==='R'&&faces.F[1]==='F';}
function setTrainingModel(model){trainingModel=model;trainingWasComplete=false;$('#toggle-daisy').checked=model==='daisy';$('#toggle-white-cross').checked=model==='white-cross';$$('.training-lesson').forEach((lesson,index)=>lesson.classList.toggle('selected',(index===0&&model==='daisy')||(index===1&&model==='white-cross')));updateTrainingStatus();}
function updateTrainingStatus(){const status=$('#training-status'),indicator=$('#training-target-indicator'),label=$('#training-target-label'),solve=$('#solve-cube');if(!trainingModel){status.hidden=true;indicator.hidden=true;solve.disabled=false;solve.removeAttribute('title');trainingWasComplete=false;return;}solve.disabled=true;solve.title='Eğitim modeli etkin olduğunda küp çözümü kapalıdır.';const complete=trainingModel==='daisy'?daisyComplete():whiteCrossComplete();if(trainingModel==='daisy'&&complete&&!trainingWasComplete){setTrainingModel('white-cross');status.hidden=false;status.textContent='Papatya tamamlandı. Şimdi beyaz haça geç.';return;}const title=trainingModel==='daisy'?'Papatya':'Beyaz haç';status.hidden=false;status.textContent=complete?`✓ ${title} tamamlandı.`:`${title} etkin: köşeler ve ilgisiz parçalar gri, merkezler kendi renginde.`;indicator.hidden=false;indicator.classList.toggle('complete',complete);label.textContent=complete?`${title} hazır`:`${title} hedefi`;trainingWasComplete=complete;}
$$('[data-training-level]').forEach(button=>button.onclick=()=>{if(button.disabled)return;const active=button.dataset.trainingLevel==='beginner';button.classList.toggle('active',active);button.setAttribute('aria-expanded',String(active));$('#training-tree').hidden=!active;});
$('#toggle-daisy').onchange=event=>setTrainingModel(event.target.checked?'daisy':'');$('#toggle-white-cross').onchange=event=>setTrainingModel(event.target.checked?'white-cross':'');$('#open-daisy-target').onclick=()=>openTrainingPreview('daisy');$('#open-white-cross-target').onclick=()=>openTrainingPreview('white-cross');
updateTrainingStatus();
// Photo input remains on this computer. The server only lists the designated folder.
// Hedef penceresi, ana küpten bağımsız olarak beyaz haçın çözülmüş halini gösterir.
const previewDialog=$('#training-preview-dialog'),previewCanvas=$('#training-preview-canvas'),previewCtx=previewCanvas.getContext('2d');
let previewModel='white-cross',previewState=solved(),previewQueue=[],previewAnimation=null,previewZoom=1,previewDrag=null;
const previewOrbit=new Orbit();
function previewRelevant(sticker){return isCenterSticker(sticker)||(isEdgeSticker(sticker)&&previewState.some(candidate=>candidate.color==='U'&&candidate.p.every((value,index)=>value===sticker.p[index])));}
function daisyPreviewState(){return solved().map(sticker=>sticker.n[1]===-1&&isEdgeSticker(sticker)?{...sticker,color:'U'}:sticker.n[1]===1&&isEdgeSticker(sticker)?{...sticker,color:'D'}:sticker);}
function previewColor(sticker){return previewRelevant(sticker)?COLORS[sticker.color]:'#4a5665';}
function previewStartNext(){if(previewAnimation)return;const job=previewQueue.shift();if(!job)return;previewAnimation={...job,...parse(job.move),start:performance.now(),duration:520};}
function previewEnqueue(move){if(previewQueue.length>30)return;previewQueue.push({move});previewStartNext();}
function previewReset(){previewState=previewModel==='daisy'?daisyPreviewState():solved();previewQueue=[];previewAnimation=null;previewOrbit.reset();previewZoom=1;}
function openTrainingPreview(model){previewModel=model;previewReset();$('#training-preview-title').textContent=model==='daisy'?'Papatya':'Beyaz haç';$('#training-preview-copy').textContent=model==='daisy'?'Beyaz kenarların sarı merkezin çevresinde toplandığı hedef konum bu.':'Papatyadaki beyaz kenarları kendi yan merkezleriyle eşleştirdiğin hedef konum bu.';previewDialog.showModal();previewCanvas.focus({preventScroll:true});}
function addPreviewButtons(){for(const face of FACES){const button=document.createElement('button');let timer=null,held=false,pointerType='mouse';button.innerHTML=`<strong>${face}</strong><small>${LABELS[face]}</small>`;button.style.setProperty('--face-color',COLORS[face]);button.setAttribute('aria-label',`${LABELS[face]} yüzünü döndür`);button.onpointerdown=event=>{pointerType=event.pointerType;if(event.pointerType==='mouse'&&event.button===2){event.preventDefault();previewEnqueue(face+String.fromCharCode(39));return;}if(event.button!==0)return;held=false;timer=setTimeout(()=>{held=true;previewEnqueue(face+'2');},400);};button.onpointerup=button.onpointercancel=button.onpointerleave=()=>clearTimeout(timer);button.onclick=event=>{if(held){event.preventDefault();return;}previewEnqueue(face);};button.oncontextmenu=event=>event.preventDefault();$('#training-preview-moves').append(button);}}
addPreviewButtons();
$('#close-training-preview').onclick=()=>previewDialog.close();previewDialog.onclick=event=>{if(event.target===previewDialog)previewDialog.close();};$('#preview-reset').onclick=previewReset;$('#preview-reset-view').onclick=()=>{previewOrbit.reset();previewZoom=1;};$('#preview-zoom-in').onclick=()=>previewZoom=Math.min(1.45,previewZoom+.1);$('#preview-zoom-out').onclick=()=>previewZoom=Math.max(.6,previewZoom-.1);
previewCanvas.onpointerdown=event=>{previewDrag={x:event.clientX,y:event.clientY};previewCanvas.setPointerCapture(event.pointerId);previewCanvas.focus({preventScroll:true});};previewCanvas.onpointermove=event=>{if(!previewDrag)return;previewOrbit.turn((event.clientX-previewDrag.x)*.008,(event.clientY-previewDrag.y)*.008);previewDrag={x:event.clientX,y:event.clientY};};previewCanvas.onpointerup=previewCanvas.onpointercancel=previewCanvas.onlostpointercapture=()=>previewDrag=null;previewCanvas.addEventListener('wheel',event=>{event.preventDefault();previewZoom=Math.max(.6,Math.min(1.45,previewZoom-event.deltaY*.001));},{passive:false});
function drawPreview(now){const rect=previewCanvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=rect.width,h=rect.height;if(previewCanvas.width!==Math.round(w*dpr)||previewCanvas.height!==Math.round(h*dpr)){previewCanvas.width=Math.round(w*dpr);previewCanvas.height=Math.round(h*dpr);}previewCtx.setTransform(dpr,0,0,dpr,0,0);previewCtx.clearRect(0,0,w,h);const scale=Math.min(w/7.2,h/6.1)*previewZoom,project=value=>[w/2+value[0]*scale*8/(8-value[2]),h*.5-value[1]*scale*8/(8-value[2])],progress=previewAnimation?Math.min(1,(now-previewAnimation.start)/previewAnimation.duration):0,ease=progress<.5?4*progress**3:1-(-2*progress+2)**3/2,polygons=[];function surface(position,normal,extent,offset,color,layer){const [a,b]=basis(normal);let center=position.map((value,index)=>value+normal[index]*offset),points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>center.map((value,index)=>value+extent*(a[index]*u+b[index]*v))),turnedNormal=normal;if(previewAnimation&&layer){points=points.map(value=>rotate(value,previewAnimation.axis,previewAnimation.angle*ease));turnedNormal=rotate(normal,previewAnimation.axis,previewAnimation.angle*ease);center=rotate(center,previewAnimation.axis,previewAnimation.angle*ease);}const transformedCenter=previewOrbit.view(center),transformedNormal=previewOrbit.view(turnedNormal);if(dot(transformedNormal,[-transformedCenter[0],-transformedCenter[1],8-transformedCenter[2]])<=0)return;polygons.push({points:points.map(value=>previewOrbit.view(value)).map(project),depth:transformedCenter[2],color,light:.93+.07*Math.max(0,dot(transformedNormal,[-.25,.55,.8]))});}for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){if(!x&&!y&&!z)continue;const position=[x,y,z],layer=previewAnimation&&dot(position,previewAnimation.axis)===1;for(const normal of Object.values(NORMAL))surface(position,normal,.494,.499,'#0f1722',layer);}for(const sticker of previewState){const layer=previewAnimation&&dot(sticker.p,previewAnimation.axis)===1;surface(sticker.p,sticker.n,.438,.505,previewColor(sticker),layer);}polygons.sort((a,b)=>a.depth-b.depth);for(const polygon of polygons){previewCtx.beginPath();polygon.points.forEach(([x,y],index)=>index?previewCtx.lineTo(x,y):previewCtx.moveTo(x,y));previewCtx.closePath();previewCtx.fillStyle=polygon.color;previewCtx.fill();previewCtx.fillStyle=`rgba(0,0,0,${1-polygon.light})`;previewCtx.fill();previewCtx.strokeStyle='#070d1640';previewCtx.lineWidth=.6;previewCtx.stroke();}if(previewAnimation&&progress===1){previewState=apply(previewState,previewAnimation.move);previewAnimation=null;previewStartNext();}requestAnimationFrame(drawPreview);}
requestAnimationFrame(drawPreview);
for(const f of FACES){const b=document.createElement('button');b.className='face-tab';b.textContent=f;b.dataset.face=f;b.style.setProperty('--face-color',COLORS[f]);b.title=COLOR_NAMES[f]+' merkez';b.setAttribute('aria-label',LABELS[f]+' yüz fotoğrafı');b.onclick=()=>{selected=f;renderFace();};$('#face-tabs').append(b);}
function nextPhotoName(){photoCounter++;return `yuzey_${photoCounter}`;}
function addPhoto(url,local=true,guided=false){if(photos.length>=6){toast('En fazla altı yüz eklenebilir. Yeni çekim için bir önizlemeye basılı tutup sil.');return null;}const photo={name:nextPhotoName(),url,local,guided};photos.push(photo);return photo;}
function refreshSelect(){
 const picker=$('#photo-picker');picker.replaceChildren();const assigned=new Set(Object.values(faceData).map(d=>d?.url).filter(Boolean));
 $('#clear-photos').hidden=!photos.length;
 if(!photos.length){picker.innerHTML='<span class="photo-picker-empty">Henüz fotoğraf yok. Kamerayla çek veya görsel seç.</span>';}else for(const p of photos){const b=document.createElement('button');let holdTimer=null,held=false;b.className='photo-card'+(faceData[selected]?.url===p.url?' active':'')+(assigned.has(p.url)?' used':'');b.setAttribute('role','option');b.setAttribute('aria-selected',faceData[selected]?.url===p.url);b.setAttribute('aria-label',p.name+' fotoğrafını bu yüze ata. Silmek için basılı tut.');b.title='Seçmek için tıkla · silmek için basılı tut';const img=new Image();img.src=p.url;img.alt='';b.append(img,Object.assign(document.createElement('span'),{textContent:p.name}));b.onpointerdown=()=>{held=false;holdTimer=setTimeout(()=>{held=true;discardPhoto(p.url);},650);};b.onpointerup=b.onpointercancel=b.onpointerleave=()=>clearTimeout(holdTimer);b.onclick=e=>{if(held){e.preventDefault();return;}choosePhoto(p.url);};picker.append(b);}
 $('#analyze-all').disabled=analyzing||!photos.length;
}
async function refresh(){try{const response=await fetch('./api/photos');if(!response.ok)throw Error();const list=await response.json(),known=new Map(photos.map(p=>[p.url,p])),server=list.map(p=>known.get(p.url)||{name:nextPhotoName(),url:p.url,local:false}),local=photos.filter(p=>p.local&&!list.some(item=>item.url===p.url));photos=[...server,...local];$('#folder-info').textContent=list.length?`${list.length} fotoğraf klasörden okundu.`:'kup-fotograflari klasörü boş. Fotoğrafları ekleyip yenile.';refreshSelect();}catch{$('#refresh').hidden=true;$('#folder-info').textContent='Web sürümünde kamerayla çekebilir veya altı yüzü görsel olarak ekleyebilirsin.';}}
$('#refresh').onclick=()=>refresh();
$('#files').onchange=e=>{const files=[...e.target.files];for(const file of files){if(!/image\/(jpeg|png|webp)/.test(file.type)){toast('JPG, PNG veya WebP fotoğraf kullan.');continue;}const url=URL.createObjectURL(file);if(!addPhoto(url)){URL.revokeObjectURL(url);break;}}refreshSelect();$('#folder-info').textContent=`${photos.length} fotoğraf hazır. Küçük önizlemelerden yüzlere ata.`;e.target.value='';};
let cameraStream=null,cameraSession=0,cameraDraft=null,cameraTorch=false;
function setCameraReview(reviewing){const dialog=$('#camera-dialog'),target=FACES[calibration.next],progress=calibration.active?`Kalibrasyon ${calibration.next+1} / 6`:`Fotoğraf ${Math.min(photos.length+1,6)} / 6`;dialog.classList.toggle('reviewing',reviewing);$('#camera-progress').textContent=progress;$('#camera-title').textContent=reviewing?'Fotoğrafı kontrol et':calibration.active?`${COLOR_NAMES[target]} merkezi çek`:'Yüzü kadraja al';$('#camera-hint').textContent=reviewing?'Kullanarak sıradaki yüzü çekebilir veya silip yeniden deneyebilirsin.':calibration.active?`${COLOR_NAMES[target]} merkezli yüzü kareye hizala. Bu fotoğraf, renk referansı olarak kaydedilecek.`:'Küpün tek yüzünü ortadaki kareye hizala. Çektiğin görüntü yalnızca bu tarayıcıda işlenir.';$('#camera-use').textContent=calibration.active&&calibration.next===5?'Merkezi kaydet ve bitir':photos.length+1>=6?'Bitir':'Kullan ve sonrakine geç';$('#camera-preview').hidden=!reviewing;$('#camera-frame').hidden=reviewing;$('#camera-live-actions').hidden=reviewing;$('#camera-review-actions').hidden=!reviewing;}
function stopCamera(){cameraSession++;if(cameraStream){cameraStream.getTracks().forEach(track=>track.stop());cameraStream=null;}$('#camera-video').srcObject=null;$('#camera-capture').disabled=true;$('#camera-flash').hidden=true;cameraTorch=false;}
function closeCamera(){cameraDraft=null;setCameraReview(false);stopCamera();if($('#camera-dialog').open)$('#camera-dialog').close();}
async function openCamera(){
 if($('#camera-dialog').open)return;
 if(photos.length>=6){toast('Altı fotoğraf zaten hazır. Yeni çekim için bir önizlemeye basılı tutup sil.');return;}
 stopCamera();setCameraReview(false);const session=cameraSession,status=$('#camera-status');status.textContent='Kamera açılıyor… Tarayıcı kamera izni isterse izin ver.';$('#camera-dialog').showModal();
 if(!navigator.mediaDevices?.getUserMedia){status.textContent='Bu tarayıcı kamera erişimini desteklemiyor. HTTPS adresinde veya Fotoğraf seç ile devam edebilirsin.';return;}
 try{const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});if(session!==cameraSession||!$('#camera-dialog').open){stream.getTracks().forEach(track=>track.stop());return;}cameraStream=stream;const video=$('#camera-video');video.srcObject=stream;await video.play();if(session!==cameraSession)return;const supportsTorch=!!stream.getVideoTracks()[0]?.getCapabilities?.().torch;$('#camera-flash').hidden=!supportsTorch;$('#camera-flash').disabled=!supportsTorch;$('#camera-capture').disabled=false;status.textContent='Hazır. Yüzü kadraja al ve fotoğrafı çek.';}
 catch(error){if(session!==cameraSession)return;stopCamera();status.textContent=error.name==='NotAllowedError'?'Kamera izni verilmedi. Tarayıcı ayarlarından izin verip yeniden dene.':error.name==='NotFoundError'?'Kamera bulunamadı. Kamerayı bağla veya Fotoğraf seç ile devam et.':'Kamera açılamadı. Başka bir uygulamanın kamerayı kullanmadığını kontrol et.';}
}
$('#camera-open').onclick=openCamera;
function captureGuide(video){const box=$('#camera-frame').getBoundingClientRect(),scale=Math.max(box.width/video.videoWidth,box.height/video.videoHeight),offsetX=(box.width-video.videoWidth*scale)/2,offsetY=(box.height-video.videoHeight*scale)/2,inset=box.width*.11,size=box.width-inset*2,sx=Math.max(0,(inset-offsetX)/scale),sy=Math.max(0,(inset-offsetY)/scale),side=Math.min(size/scale,video.videoWidth-sx,video.videoHeight-sy),crop=document.createElement('canvas');crop.width=Math.round(side);crop.height=Math.round(side);crop.getContext('2d').drawImage(video,sx,sy,side,side,0,0,crop.width,crop.height);return crop;}
$('#camera-capture').onclick=()=>{const video=$('#camera-video');if(!cameraStream||!video.videoWidth){$('#camera-status').textContent='Kamera görüntüsü henüz hazır değil.';return;}const crop=captureGuide(video),frame=$('#camera-preview');frame.width=crop.width;frame.height=crop.height;frame.getContext('2d').drawImage(crop,0,0);cameraDraft=frame.toDataURL('image/jpeg',.92);setCameraReview(true);$('#camera-status').textContent='Kare kadraj kaydedildi. Kullanarak sıradaki yüzü çekebilir veya silip yeniden deneyebilirsin.';};
$('#camera-use').onclick=async()=>{if(!cameraDraft)return;const p=addPhoto(cameraDraft,true,true);if(!p)return;cameraDraft=null;const done=photos.length===6;setCameraReview(false);refreshSelect();$('#folder-info').textContent=done?'Altı fotoğraf hazır. Otomatik tanımayı başlatabilirsin.':`${photos.length} fotoğraf hazır. Sıradaki yüzü çekebilirsin.`;if(calibration.active){await choosePhoto(p.url);setCameraReview(false);}analysisStatus(done?'Altı yüz hazır. Fotoğrafları otomatik tanı düğmesine bas.':`${p.name} eklendi. Altı yüz tamamlanınca otomatik tanımayı başlat.`);if(done){closeCamera();toast('Altı fotoğraf tamamlandı.');return;}$('#camera-status').textContent=calibration.active?'Merkez kaydedildi. Sıradaki rengi kadraja al.':'Kaydedildi. Sıradaki yüzü kadraja al.';$('#camera-capture').disabled=!cameraStream;toast(`${p.name} eklendi.`);};
$('#camera-retake').onclick=()=>{cameraDraft=null;setCameraReview(false);$('#camera-status').textContent='Fotoğraf silindi. Aynı yüzü yeniden çekebilirsin.';};
$('#camera-crop').onclick=async()=>{if(!cameraDraft)return;const p=addPhoto(cameraDraft,true,true);if(!p)return;cameraDraft=null;setCameraReview(false);await choosePhoto(p.url,true);closeCamera();analysisStatus(`${p.name} açıldı. Elle köşe seç ile dört dış köşeyi sırayla belirle.`);};
$('#camera-flash').onclick=async()=>{const track=cameraStream?.getVideoTracks()[0];if(!track)return;try{cameraTorch=!cameraTorch;await track.applyConstraints({advanced:[{torch:cameraTorch}]});$('#camera-flash').setAttribute('aria-pressed',cameraTorch);$('#camera-flash').textContent=cameraTorch?'⚡ Flaş açık':'⚡ Flaş';}catch{cameraTorch=false;$('#camera-flash').setAttribute('aria-pressed','false');$('#camera-status').textContent='Bu cihaz flaş kontrolüne izin vermedi.';}};
$('#camera-close').onclick=closeCamera;$('#camera-cancel').onclick=closeCamera;$('#camera-dialog').addEventListener('close',stopCamera);
$('#camera-dialog').addEventListener('cancel',stopCamera);window.addEventListener('pagehide',closeCamera);
const imageCache=new Map();
function discardPhoto(url){const photo=photos.find(p=>p.url===url);if(!photo)return;photos=photos.filter(p=>p.url!==url);for(const [face,data] of Object.entries(faceData))if(data?.url===url)delete faceData[face];photoDataByUrl.delete(url);imageCache.delete(url);if(photo.local&&url.startsWith('blob:'))URL.revokeObjectURL(url);refreshSelect();reclassify();toast(`${photo.name} silindi.`);}
function clearPhotos(){for(const p of photos)if(p.local&&p.url.startsWith('blob:'))URL.revokeObjectURL(p.url);photos=[];faceData={};calibration.references={};calibration.active=false;calibration.next=0;photoDataByUrl.clear();imageCache.clear();photoCounter=0;selected='U';refreshSelect();renderFace();analysisStatus('Fotoğraflar temizlendi. Altı yüzü yeniden çekebilir veya seçebilirsin.');toast('Tüm fotoğraflar temizlendi.');}
$('#clear-photos').onclick=clearPhotos;
async function loadImage(url){if(imageCache.has(url))return imageCache.get(url);const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas'),ratio=Math.min(1,640/Math.max(img.width,img.height));c.width=Math.round(img.width*ratio);c.height=Math.round(img.height*ratio);c.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,c.width,c.height);imageCache.set(url,c);return c;}
async function readPhoto(url,guided=false){if(photoDataByUrl.has(url))return photoDataByUrl.get(url);const img=await loadImage(url);let detected;try{detected=detectFace(img.getContext('2d').getImageData(0,0,img.width,img.height));}catch(error){if(!guided)throw error;const inset=Math.round(Math.min(img.width,img.height)*.055),right=img.width-1-inset,bottom=img.height-1-inset,corners=[[inset,inset],[right,inset],[right,bottom],[inset,bottom]],raw=sampleFace(img,corners);detected={corners,raw,colors:raw.map(classifyColor),guide:true};}const data={url,img,...detected,manual:{},uncertain:[],auto:true,turns:0};photoDataByUrl.set(url,data);return data;}
function analysisStatus(message){analysisMessage=message;}
function renderCalibration(){const ready=FACES.filter(face=>calibration.references[face]).length,target=FACES[calibration.next],badge=$('#calibration-badge'),status=$('#calibration-status'),reset=$('#reset-calibration');badge.textContent=calibration.active?`${ready} / 6 merkez`:(ready===6?'Hazır':'İsteğe bağlı');reset.hidden=!(ready||calibration.active);reset.textContent=calibration.active?'Kalibrasyonu iptal':'Referansları sil';if(calibration.active){status.textContent=`Sıradaki fotoğraf: ${COLOR_NAMES[target]} merkezli yüz. Kamerayla çek veya küçük önizlemelerden seç.`;}else if(ready===6){status.textContent='Altı merkez kaydedildi. Renkler bu küpe göre okunuyor.';}else{status.textContent='İstersen kalibrasyonu başlatıp her merkez rengini bir kez seçebilirsin.';}}
function startCalibration(){calibration.references={};calibration.active=true;calibration.next=0;renderCalibration();if(photos.length>=6){toast('Kalibrasyon başladı. Beyaz merkezli fotoğrafı küçük önizlemelerden seç.');return;}openCamera();}
function resetCalibration(){calibration.references={};calibration.active=false;calibration.next=0;reclassify();renderCalibration();toast('Renk referansları silindi.');}
function acceptCalibrationPhoto(data,url){const target=FACES[calibration.next],duplicate=Object.entries(faceData).find(([face,item])=>face!==target&&item?.url===url);if(duplicate&&calibration.references[duplicate[0]]){toast('Bu fotoğraf zaten bir kalibrasyon yüzünde kullanılıyor.');return false;}if(duplicate)delete faceData[duplicate[0]];calibration.references[target]=data.raw[4];data.manual[4]=target;faceData[target]=data;selected=target;calibration.next++;if(calibration.next===FACES.length){calibration.active=false;calibration.next=0;reclassify();if(FACES.every(face=>faceData[face]?.raw))orientAll();toast('Kalibrasyon tamamlandı. Renkler merkez referanslarına göre okunuyor.');}else{reclassify();toast(`${COLOR_NAMES[target]} merkezi kaydedildi.`);}renderCalibration();return true;}
$('#start-calibration').onclick=startCalibration;$('#reset-calibration').onclick=resetCalibration;
function rotateData(d){d.raw=rotateGrid(d.raw);if(d.colors)d.colors=rotateGrid(d.colors);const manual={};[6,3,0,7,4,1,8,5,2].forEach((old,i)=>{if(d.manual[old])manual[i]=d.manual[old];});d.manual=manual;d.corners=[d.corners[3],d.corners[0],d.corners[1],d.corners[2]];d.turns=((d.turns||0)+1)%4;}
function orientAll(){
 if(FACES.some(f=>!faceData[f]?.colors)){analysisStatus('Küpün konumunu denetlemek için altı yüzün de okunması gerekiyor.');return false;}
 const result=alignFaces(getFaces());
 if(!result.ok){analysisStatus(result.message);return false;}
 if(result.ambiguous){analysisStatus(`${result.count} geçerli yön bulundu. Yüzlerin üst kenarını kontrol ederek seçim yap; otomatik yön uygulanmadı.`);return false;}
 for(const f of FACES)for(let i=0;i<result.rotations[f];i++)rotateData(faceData[f]);
 reclassify();analysisStatus('54 renk okundu. Yüz yönleri eşleştirildi; küp durumu geçerli.');return true;
}
async function analyzeAll(){
 if(analyzing||!photos.length)return;analyzing=true;refreshSelect();const found={},failures=[];
 try{for(let i=0;i<photos.length;i++){analysisStatus(`${i+1} / ${photos.length} fotoğraf inceleniyor…`);await new Promise(r=>setTimeout(r,0));try{const d=await readPhoto(photos[i].url,photos[i].guided),f=d.colors[4];if(found[f]){failures.push(`${COLOR_NAMES[f]} merkezli 2 fotoğraf var`);continue;}found[f]=d;}catch{failures.push(`${photos[i].name} okunamadı`);}}
  photoDiagnostics=failures;
  faceData={...faceData,...found};selected=FACES.find(f=>faceData[f])||'U';reclassify();
  if(FACES.every(f=>faceData[f]?.raw)){analysisStatus('Yüzlerin birbirine göre yönü bulunuyor…');await new Promise(r=>setTimeout(r,0));orientAll();}
  else analysisStatus(`${Object.keys(found).length} yüz bulundu. Altı farklı merkez rengi için diğer yüzleri ekle.`);
 }finally{analyzing=false;refreshSelect();}
}
$('#analyze-all').onclick=analyzeAll;
async function choosePhoto(url,forceManual=false){const f=selected,guided=photos.find(p=>p.url===url)?.guided;if(!url)return;try{const d=await readPhoto(url,guided),center=d.colors[4];if(forceManual){d.corners=[];d.raw=null;d.colors=null;d.manual={};d.auto=false;d.turns=0;photoDataByUrl.set(url,d);faceData[f]=d;analysisStatus('Köşe düzeltmesi için fotoğraf açıldı. Dört dış köşeyi sırayla seç.');}else if(calibration.active){if(!acceptCalibrationPhoto(d,url))return;}else{faceData[center]=d;selected=center;analysisStatus(`${COLOR_NAMES[center]} merkezli yüz otomatik bulundu.`);}reclassify();}catch(err){try{const img=await loadImage(url);const d={url,img,corners:[],raw:null,colors:null,manual:{},uncertain:[],auto:false,turns:0};photoDataByUrl.set(url,d);faceData[f]=d;analysisStatus(err.message+' Elle köşe seçimiyle devam edebilirsin.');reclassify();}catch{toast('Fotoğraf açılamadı. JPG veya PNG olarak yeniden dene.');}}}
function reclassify(){
 for(const f of FACES){const d=faceData[f];if(!d?.raw)continue;d.uncertain=[];d.colors=d.raw.map((rgb,i)=>{if(d.manual[i])return d.manual[i];const [h,s,v]=hsv(rgb);if(v<.28||(s>.23&&s<.42)||((h>8&&h<20)||h>340))d.uncertain.push(i);return classifyWithReferences(rgb,calibration.references);});}
 renderFace();
}
function getFaces(){return Object.fromEntries(FACES.map(f=>[f,faceData[f]?.colors]));}
let photoCheckKey='',photoCheckResult=null;
function photoColorDiagnostic(){const counts=Object.fromEntries(FACES.map(face=>[face,0])),centers=Object.fromEntries(FACES.map(face=>[face,0]));let read=0;for(const photo of photos){const data=photoDataByUrl.get(photo.url);if(!data?.raw)continue;const colors=data.raw.map((rgb,index)=>data.manual[index]||classifyWithReferences(rgb,calibration.references));colors.forEach(color=>counts[color]++);centers[colors[4]]++;read++;}if(read<6)return photoDiagnostics.length?photoDiagnostics.join(' · '):'';const centerHints=FACES.filter(face=>centers[face]!==1).map(face=>centers[face]?`${COLOR_NAMES[face]} ×${centers[face]}`:`${COLOR_NAMES[face]} yok`),balance=FACES.filter(face=>counts[face]!==9).map(face=>`${COLOR_NAMES[face]} ${counts[face]-9>0?'+':''}${counts[face]-9}`);return [centerHints.length?'Merkezler: '+centerHints.join(' · '):'',balance.length?'Renk farkı: '+balance.join(' · '):''].filter(Boolean).join('  ');}
function check(){const count=FACES.filter(f=>faceData[f]?.raw).length,diagnostic=photoColorDiagnostic();$('#face-count').textContent=`${count} / 6 hazır`;let result={ok:false,message:`${6-count} yüz daha gerekiyor. Fotoğrafları otomatik tanı düğmesini kullan.`};
 if(count===6){const faces=getFaces(),key=JSON.stringify(faces);if(key!==photoCheckKey){photoCheckResult=assessPhotoFaces(faces);photoCheckKey=key;}result=photoCheckResult;}if(!result.ok&&diagnostic)result={...result,message:`Küp oluşturulamadı. ${diagnostic}`};
 $('#validation').textContent=result.message;$('#validation').classList.toggle('ok',result.ok);$('#build-cube').disabled=!result.ok;return result;
}
function paintSquare(d,index){
 if(index===4&&paint!==selected){
  const occupied=faceData[paint];
  if(occupied&&occupied!==d){analysisStatus(`${COLOR_NAMES[paint]} merkezli başka bir fotoğraf var. Önce o yüzün merkez rengini düzelt.`);return;}
  delete faceData[selected];faceData[paint]=d;selected=paint;d.manual[4]=paint;
  analysisStatus(`Merkez rengi ${COLOR_NAMES[paint]} olarak düzeltildi. Fotoğraf doğru yüze taşındı.`);
 }else{d.manual[index]=paint;analysisStatus(index===4?`Merkez rengi ${COLOR_NAMES[paint]} olarak onaylandı.`:'Renk düzeltildi. Küp oluşturulurken yüz konumları otomatik denetlenir.');}
 reclassify();
}
function renderFace(){refreshSelect();const d=faceData[selected];$$('.face-tab').forEach(b=>{b.classList.toggle('active',b.dataset.face===selected);b.classList.toggle('ready',!!faceData[b.dataset.face]?.raw);b.setAttribute('aria-pressed',b.dataset.face===selected);});$('#face-title').textContent=selected+' · '+LABELS[selected]+' yüz';$('#face-state').textContent=d?.raw?'Renkler okundu':d?'Köşeleri seç':'Fotoğraf bekleniyor';$('#orientation').textContent='Fotoğrafın üst kenarındaki komşu: '+oriented[selected];
 $('#face-grid').replaceChildren();for(let i=0;i<9;i++){const b=document.createElement('button');const color=d?.colors?.[i];b.style.background=color?swatch(color):'#2b394d';b.className=i===4?'center':'';b.disabled=!d?.raw;b.title=i===4?'Merkez rengi · düzeltmek için tıkla':`${i+1}. kare`;b.setAttribute('aria-label',`${i===4?'Merkez kare':i+1+'. kare'}: ${color?COLOR_NAMES[color]:'okunmadı'}`);b.onclick=()=>paintSquare(d,i);$('#face-grid').append(b);}
 $('#palette').replaceChildren();for(const f of FACES){const b=document.createElement('button');b.style.background=COLORS[f];b.className=paint===f?'selected':'';b.title=COLOR_NAMES[f];b.setAttribute('aria-label',COLOR_NAMES[f]);b.setAttribute('aria-pressed',paint===f);b.onclick=()=>{paint=f;renderFace();};$('#palette').append(b);}
 $('#rotate-face').disabled=!d?.raw;$('#recrop').disabled=!d;$('#photo-empty').hidden=!!d;$('#crop-instruction').textContent=d?.corners.length===4?(d.guide?'Kare kadrajın iç kenarlarından okundu. Renkleri önizlemeden kontrol edebilirsin.':d.auto?`Yüz otomatik bulundu${d.turns?' · '+d.turns*90+'° hizalandı':''}. Renkleri önizlemeden kontrol edebilirsin.`:'Renkler okundu. Gerekirse paletten karelerin rengini düzelt.'):d?`Köşe ${Math.min((d?.corners.length||0)+1,4)} / 4: ${['sol üst','sağ üst','sağ alt','sol alt'][d?.corners.length||0]} noktasını seç.`:'Fotoğraf seçildiğinde yüz otomatik bulunur.';check();drawPhoto();renderCalibration();
}
const pc=$('#photo-canvas');let photoRect=null;
function drawPhoto(){const c=pc.getContext('2d'),r=pc.getBoundingClientRect(),d=faceData[selected],dpr=devicePixelRatio||1;pc.width=r.width*dpr;pc.height=r.height*dpr;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);photoRect=null;if(!d)return;
 let region={x:0,y:0,w:d.img.width,h:d.img.height};
 if(d.auto&&d.corners.length===4){const xs=d.corners.map(p=>p[0]),ys=d.corners.map(p=>p[1]),pad=18;region={x:Math.max(0,Math.min(...xs)-pad),y:Math.max(0,Math.min(...ys)-pad),w:Math.max(...xs)-Math.min(...xs)+2*pad,h:Math.max(...ys)-Math.min(...ys)+2*pad};}
 const scale=Math.min(r.width/region.w,r.height/region.h),w=d.img.width*scale,h=d.img.height*scale,x=(r.width-region.w*scale)/2-region.x*scale,y=(r.height-region.h*scale)/2-region.y*scale;photoRect={x,y,scale};c.drawImage(d.img,x,y,w,h);const points=d.corners.map(([a,b])=>[x+a*scale,y+b*scale]);c.strokeStyle='#bafbd9';c.lineWidth=2;if(points.length){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(points.length===4)c.closePath();c.stroke();}
 if(points.length===4){try{const map=homography(points);c.lineWidth=1;c.strokeStyle='#ffffff99';for(let i=1;i<3;i++)for(const vertical of [true,false]){const a=vertical?map(i/3,0):map(0,i/3),b=vertical?map(i/3,1):map(1,i/3);c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();}}catch{}}
 points.forEach(([x,y],i)=>{c.beginPath();c.arc(x,y,8,0,Math.PI*2);c.fillStyle='#a8e5c5';c.fill();c.fillStyle='#12251c';c.font='bold 10px Segoe UI';c.textAlign='center';c.textBaseline='middle';c.fillText(i+1,x,y);});
}
pc.onpointerdown=e=>{const d=faceData[selected];if(!d||!photoRect||d.corners.length===4)return;const r=pc.getBoundingClientRect(),x=(e.clientX-r.left-photoRect.x)/photoRect.scale,y=(e.clientY-r.top-photoRect.y)/photoRect.scale;if(x<0||y<0||x>d.img.width||y>d.img.height)return;d.corners.push([x,y]);if(d.corners.length===4){try{d.raw=sampleFace(d.img,d.corners);d.manual={};reclassify();}catch(err){toast(err.message);d.corners=[];}}renderFace();};
$('#recrop').onclick=()=>{const d=faceData[selected];if(d){d.corners=[];d.raw=null;d.colors=null;d.manual={};d.auto=false;d.turns=0;reclassify();}};
$('#rotate-face').onclick=()=>{const d=faceData[selected];if(!d?.raw)return;rotateData(d);reclassify();toast('Yüz renkleri saat yönünde çevrildi.');};
function setPhotoPanel(open){$('#photo-panel').classList.toggle('mobile-open',open);document.body.classList.toggle('photo-panel-open',open);if(open)window.scrollTo({top:0,behavior:'auto'});}
$('#open-photo-panel').onclick=()=>setPhotoPanel(true);$('#close-photo-panel').onclick=()=>setPhotoPanel(false);
$('#build-cube').onclick=()=>{const result=check();if(!result.ok)return;if(result.rotations){for(const f of FACES)for(let i=0;i<result.rotations[f];i++)rotateData(faceData[f]);reclassify();analysisStatus('Yüz yönleri eşleştirildi; küp durumu geçerli.');}initial=fromFaces(result.faces);resetState(initial);displayColors=Object.fromEntries(FACES.map(f=>[f,swatch(f)]));initialSource='Fotoğraflarından oluşturuldu';references();holdCube(initialSource);setPhotoPanel(false);canvas.focus({preventScroll:true});$('#stage').scrollIntoView({block:'start',behavior:'smooth'});toast('Fotoğraflarından oluşturulan küp tutuldu. Çözebilirsin.');};
$('#help-toggle').onclick=()=>$('#help').showModal();$('#shortcuts-toggle').onclick=()=>$('#shortcuts').showModal();for(const id of ['help','shortcuts']){const dialog=$('#'+id);$('#close-'+id).onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};}
new ResizeObserver(drawPhoto).observe($('#photo-wrap'));renderFace();refresh();
