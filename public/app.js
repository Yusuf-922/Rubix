import {FACES,COLORS,LABELS,NORMAL,solved,clone,dot,cross,rotate,parse,apply,inverse,facelets,fromFaces,validate} from './cube.js';
import {sampleFace,homography} from './photo.js';
import {parseSequence,Playback,DEFAULT_KEYS,validateKeys} from './playback.js';
import {detectFace,classifyColor,COLOR_NAMES,rotateGrid,alignFaces,assessPhotoFaces,hsv} from './vision.js';
import {projectedHistory,historyRequest} from './history.js';
import {solveCube,solverInput} from './solver.js';
import {Orbit} from './orbit.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const hexrgb=h=>h.match(/\w\w/g).map(x=>parseInt(x,16));
let state=solved(),initial=clone(state),history=[],cursor=0,queue=[],animation=null,mode='',zoom=1,displayColors={...COLORS};
const orbit=new Orbit();
let liveBase=clone(initial),initialSource='Örnek küp';
let selected='U',paint='U',photos=[],faceData={},toastTimer;
let playback=null,liveSnapshot=null,draftDirty=false,keys={...DEFAULT_KEYS};
let solutionBase=null,solverJob=null;
function clearSolution(){if(solutionBase){solutionBase=null;draftDirty=false;}if(!solverJob)$('#solver-status').textContent='Mevcut küp için çözüm bul; tamamını veya adım adım izle.';}
try{const stored=JSON.parse(localStorage.getItem('rubix-shortcuts'));if(stored&&validateKeys(stored))keys=Object.fromEntries(FACES.map(f=>[f,stored[f].toLowerCase()]));}catch{}
const swatch=f=>COLORS[f];
let analyzing=false,analysisMessage='';
const oriented={U:'B · Arka',R:'U · Üst',F:'U · Üst',D:'F · Ön',L:'U · Üst',B:'U · Üst'};
const canvas=$('#cube-canvas'),ctx=canvas.getContext('2d');
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function references(){for(const [id,f] of [['#ref-up','U'],['#ref-front','F']])$(id).innerHTML=`<i style="background:${displayColors[f]}"></i>${LABELS[f]} · ${f}`;}
references();
for(const f of FACES){const b=document.createElement('button');b.innerHTML=`<strong>${f}</strong><small>${LABELS[f]}</small><span class="shortcut-key"></span>`;b.dataset.face=f;b.setAttribute('aria-label',`${LABELS[f]} yüzünü döndür`);b.onclick=()=>enqueue(f+mode);$('#move-buttons').append(b);}
$$('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;$$('[data-mode]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b);});});
function enqueue(move,kind='move'){if(playback)stopPlayback();if(queue.length>40){toast('Önce sıradaki hamlelerin tamamlanmasını bekle.');return;}clearSolution();queue.push({move,kind});updateHistory();startNext();}
function startNext(){
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
 if(animation)$('#move-description').textContent=`${LABELS[animation.move[0]]} yüz · ${animation.move.endsWith('2')?'180 derece':animation.move.endsWith("'")?'ters yönde 90 derece':'saat yönünde 90 derece'}`;
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
function resetState(s){if(playback)stopPlayback();clearSolution();solverJob?.cancel();state=clone(s);liveBase=clone(s);queue=[];animation=null;history=[];cursor=0;draftDirty=false;updateHistory();$('#move-description').textContent='Yüz harfine basarak veya aşağıdaki düğmelerle döndür.';}
$('#reset-cube').onclick=()=>{resetState(initial);$('#source-label').textContent=initialSource;toast('Küp başlangıç durumuna döndü.');};
$('#solve-reset').onclick=()=>{resetState(solved());$('#source-label').textContent='Çözülmüş küp';toast('Küp çözülmüş hale sıfırlandı.');};
$('#reset-view').onclick=()=>{orbit.reset();zoom=1;};
$('#zoom-in').onclick=()=>zoom=Math.min(1.45,zoom+.1);$('#zoom-out').onclick=()=>zoom=Math.max(.6,zoom-.1);
$('#speed').oninput=()=>$('#speed-value').textContent=(520/(1000-Number($('#speed').value))).toFixed(1)+'×';
function updatePlaybackControls(){
 $('#solve-cube').disabled=!!solverJob||!!playback||!!animation||queue.length>0;
 $('#cancel-solve').hidden=!solverJob;
 $('#replay').textContent=solutionBase?'▶ Çözümü oynat':'▶ Yeniden oynat';
 const busy=!playback&&(!!animation||queue.length>0),empty=!$('#sequence').value.trim();
 $('#replay').disabled=busy||empty;$('#step-mode').disabled=busy||empty;
 $('#sequence').readOnly=!!playback;$('#use-history').disabled=busy||!!playback;
 $('#stop-playback').disabled=!playback;$('#advance').disabled=!playback||!!animation||playback.phase==='done'||playback.phase==='running';
 $('#advance').textContent=playback?.phase==='break'?'Sonraki satır · Boşluk':'Sonraki adım · Boşluk';
 $('#pause-playback').disabled=!playback||playback.phase!=='running';
 $('.workspace').classList.toggle('playback-active',!!playback);
 const statuses={running:'Oynatılıyor · Duraklat ile bekletebilirsin.',step:'Adım adım · Bir sonraki hamle için Boşluk tuşuna bas.',break:'Satır tamamlandı · Sonraki satır için Boşluk tuşuna bas.',paused:'Duraklatıldı · Devam etmek için Boşluk tuşuna bas.',done:'Akış tamamlandı · Yeniden oynatabilir veya canlı küpe dönebilirsin.'};
 $('#playback-status').textContent=playback?statuses[playback.phase]:solutionBase?'Çözüm akışı · Oynatma, çözümün hesaplandığı küpten başlar.':draftDirty?'Düzenlenen akış · Oynatma, oturumun başlangıç küpünden başlar.':'Canlı kayıt · Yaptığın hamleler akışa eklenir.';
}
function startPlayback(playMode){
 if(!playback&&(animation||queue.length)){toast('Sıradaki hamleler tamamlandığında oynatabilirsin.');return;}
 let entries;try{entries=parseSequence($('#sequence').value);if(!entries.length)throw Error('Önce bir hamle yap veya akışa hamle yaz.');$('#sequence-error').hidden=true;}catch(err){$('#sequence-error').textContent=err.message;$('#sequence-error').hidden=false;return;}
 if(playback)stopPlayback();
 liveSnapshot={state:clone(state),source:$('#source-label').textContent};
 state=clone(solutionBase||liveBase);playback=new Playback(entries,playMode);$('#source-label').textContent=solutionBase?'Çözüm önizlemesi':'Akış önizlemesi';
 // Move keyboard focus out of the editor so Space advances rather than types.
 canvas.focus({preventScroll:true});$('#stage').scrollIntoView({block:'start',behavior:'smooth'});updateHistory();startNext();
}
function stopPlayback(){if(!playback)return;state=clone(liveSnapshot.state);$('#source-label').textContent=liveSnapshot.source;animation=null;playback=null;liveSnapshot=null;updateHistory();}
function advance(){if(!playback||animation)return;if(playback.advance()){startNext();updateHistory();}}
$('#replay').onclick=()=>startPlayback('auto');$('#step-mode').onclick=()=>startPlayback('step');$('#advance').onclick=advance;
$('#pause-playback').onclick=()=>{playback?.pause();updateHistory();};$('#stop-playback').onclick=stopPlayback;
$('#use-history').onclick=()=>{clearSolution();draftDirty=false;$('#sequence-error').hidden=true;updateHistory();};
$('#solve-cube').onclick=async()=>{
 if(solverJob||playback||animation||queue.length)return;
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
 $$('#move-buttons button').forEach(b=>b.querySelector('.shortcut-key').textContent='Tuş: '+keys[b.dataset.face].toUpperCase());
 $('.key-help').textContent='Tuşlar: '+FACES.map(f=>keys[f].toUpperCase()+' → '+f).join(' · ')+' | Shift: ters yön · Ctrl+Z: geri al';
 $('.orbit-hint').textContent='Sürükle veya ← ↑ ↓ →: bakış açısı · Tekerlek: yakınlaş';
}
function saveKeys(next){if(!validateKeys(next)){$('#shortcut-status').textContent='Her yüze farklı bir harf veya rakam ata.';return;}keys=next;try{localStorage.setItem('rubix-shortcuts',JSON.stringify(keys));$('#shortcut-status').textContent='Kısayollar bu tarayıcıya kaydedildi.';}catch{$('#shortcut-status').textContent='Kısayollar bu oturum için ayarlandı.';}renderKeys();}
$('#save-shortcuts').onclick=()=>saveKeys(Object.fromEntries($$('#shortcut-fields input').map(i=>[i.dataset.face,i.value.toLowerCase()])));
$('#reset-shortcuts').onclick=()=>saveKeys({...DEFAULT_KEYS});renderKeys();updateHistory();
document.addEventListener('keydown',e=>{
 if($('#help').open||e.altKey)return;
 const textInput=e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT'&&!['range','button','checkbox','file'].includes(e.target.type)||e.target.isContentEditable;
 const editing=textInput&&!e.target.readOnly&&(e.target!==$('#sequence')||draftDirty);
 const z=e.code==='KeyZ'||e.key.toLowerCase()==='z',y=e.code==='KeyY'||e.key.toLowerCase()==='y';
 if((e.ctrlKey||e.metaKey)&&(z||y)&&!editing){e.preventDefault();e.stopPropagation();if(!e.repeat){if(y)redo();else if(!e.shiftKey)undo();}return;}
 if((textInput||e.target.tagName==='SELECT')&&!(playback&&e.target===$('#sequence')&&e.code==='Space'))return;
 if(e.ctrlKey||e.metaKey)return;
 if(e.code==='Space'&&playback){e.preventDefault();if(!e.repeat)advance();return;}
 const arrows={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,-.1],ArrowDown:[0,.1]};
 if(arrows[e.key]){e.preventDefault();orbit.turn(...arrows[e.key]);return;}
 if(e.repeat)return;const f=FACES.find(f=>keys[f]===e.key.toLowerCase());if(f){e.preventDefault();enqueue(f+(e.shiftKey?"'":mode));}
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
 for(const t of state)surface(t.p,t.n,.438,.505,displayColors[t.color],animation&&dot(t.p,animation.axis)===1);
 polygons.sort((a,b)=>a.depth-b.depth);for(const p of polygons){ctx.beginPath();p.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=p.color;ctx.fill();ctx.fillStyle=`rgba(0,0,0,${1-p.light})`;ctx.fill();ctx.strokeStyle='#070d1640';ctx.lineWidth=.6;ctx.stroke();}
 if(animation&&progress===1){const job=animation;state=apply(state,job.move);if(job.kind==='replay')playback.complete();else if(job.kind==='undo')cursor--;else if(job.kind==='redo')cursor++;else{history=history.slice(0,cursor);history.push(job.move);cursor++;}animation=null;updateHistory();startNext();}
 requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

// Photo input remains on this computer. The server only lists the designated folder.
for(const f of FACES){const b=document.createElement('button');b.className='face-tab';b.textContent=f;b.dataset.face=f;b.style.setProperty('--face-color',COLORS[f]);b.title=COLOR_NAMES[f]+' merkez';b.setAttribute('aria-label',LABELS[f]+' yüz fotoğrafı');b.onclick=()=>{selected=f;renderFace();};$('#face-tabs').append(b);}
function refreshSelect(){const sel=$('#photo-select');sel.replaceChildren(new Option('Fotoğraf seç…',''));photos.forEach(p=>sel.add(new Option(p.name,p.url)));sel.value=faceData[selected]?.url||'';$('#analyze-all').disabled=analyzing||!photos.length;}
async function refresh(){try{const response=await fetch('/api/photos');if(!response.ok)throw Error();const list=await response.json(),local=photos.filter(p=>p.local);photos=[...list.filter(p=>!local.some(l=>l.name===p.name)),...local];$('#folder-info').textContent=list.length?`${list.length} fotoğraf klasörden okundu.`:'kup-fotograflari klasörü boş. Fotoğrafları ekleyip yenile.';refreshSelect();}catch{$('#folder-info').textContent='Klasör okunamadı. “Fotoğraf seç” ile dosyaları ekleyebilirsin.';}}
$('#refresh').onclick=()=>refresh();
$('#files').onchange=e=>{const files=[...e.target.files];for(const file of files){if(!/image\/(jpeg|png|webp)/.test(file.type)){toast('JPG, PNG veya WebP fotoğraf kullan.');continue;}photos=photos.filter(p=>p.name!==file.name);photos.push({name:file.name,url:URL.createObjectURL(file),local:true});}refreshSelect();$('#folder-info').textContent=`${photos.length} fotoğraf seçilebilir.`;e.target.value='';};
const imageCache=new Map();
async function loadImage(url){if(imageCache.has(url))return imageCache.get(url);const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas'),ratio=Math.min(1,640/Math.max(img.width,img.height));c.width=Math.round(img.width*ratio);c.height=Math.round(img.height*ratio);c.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,c.width,c.height);imageCache.set(url,c);return c;}
async function readPhoto(url){const img=await loadImage(url);const detected=detectFace(img.getContext('2d').getImageData(0,0,img.width,img.height));return {url,img,...detected,manual:{},uncertain:[],auto:true,turns:0};}
function analysisStatus(message){analysisMessage=message;$('#analysis-status').textContent=message;}
function rotateData(d){d.raw=rotateGrid(d.raw);if(d.colors)d.colors=rotateGrid(d.colors);const manual={};[6,3,0,7,4,1,8,5,2].forEach((old,i)=>{if(d.manual[old])manual[i]=d.manual[old];});d.manual=manual;d.corners=[d.corners[3],d.corners[0],d.corners[1],d.corners[2]];d.turns=((d.turns||0)+1)%4;}
function orientAll(){
 if(FACES.some(f=>!faceData[f]?.colors)){analysisStatus('Yönleri bulmak için altı yüzün de okunması gerekiyor.');return false;}
 const result=alignFaces(getFaces());
 if(!result.ok){analysisStatus(result.message);return false;}
 if(result.ambiguous){analysisStatus(`${result.count} geçerli yön bulundu. Yüzlerin üst kenarını kontrol ederek seçim yap; otomatik yön uygulanmadı.`);return false;}
 for(const f of FACES)for(let i=0;i<result.rotations[f];i++)rotateData(faceData[f]);
 reclassify();analysisStatus('54 renk okundu. Yüz yönleri eşleştirildi; küp durumu geçerli.');return true;
}
async function analyzeAll(){
 if(analyzing||!photos.length)return;analyzing=true;refreshSelect();const found={},failures=[];
 try{for(let i=0;i<photos.length;i++){analysisStatus(`${i+1} / ${photos.length} fotoğraf inceleniyor…`);await new Promise(r=>setTimeout(r,0));try{const d=await readPhoto(photos[i].url),f=d.colors[4];if(found[f]){failures.push(`${COLOR_NAMES[f]} merkezli iki fotoğraf var.`);continue;}found[f]=d;}catch(err){failures.push(`${photos[i].name}: ${err.message}`);}}
  if(failures.length){analysisStatus(failures.join(' '));return;}
  faceData={...faceData,...found};selected=FACES.find(f=>faceData[f])||'U';reclassify();
  if(FACES.every(f=>faceData[f]?.raw)){analysisStatus('Yüzlerin birbirine göre yönü bulunuyor…');await new Promise(r=>setTimeout(r,0));orientAll();}
  else analysisStatus(`${Object.keys(found).length} yüz bulundu. Altı farklı merkez rengi için diğer yüzleri ekle.`);
 }finally{analyzing=false;refreshSelect();}
}
$('#analyze-all').onclick=analyzeAll;
$('#align-faces').onclick=async()=>{if(analyzing)return;analyzing=true;refreshSelect();analysisStatus('Yüz yönleri inceleniyor…');await new Promise(r=>setTimeout(r,0));try{orientAll();}finally{analyzing=false;refreshSelect();}};
$('#photo-select').onchange=async e=>{const f=selected,url=e.target.value;if(!url){delete faceData[f];reclassify();return;}try{const d=await readPhoto(url),center=d.colors[4];faceData[center]=d;selected=center;analysisStatus(`${COLOR_NAMES[center]} merkezli yüz otomatik bulundu.`);reclassify();}catch(err){try{const img=await loadImage(url);faceData[f]={url,img,corners:[],raw:null,colors:null,manual:{},uncertain:[],auto:false,turns:0};analysisStatus(err.message+' Elle seçim de kullanılabilir.');reclassify();}catch{toast('Fotoğraf açılamadı. JPG veya PNG olarak yeniden dene.');}}};
function reclassify(){
 for(const f of FACES){const d=faceData[f];if(!d?.raw)continue;d.uncertain=[];d.colors=d.raw.map((rgb,i)=>{if(d.manual[i])return d.manual[i];const [h,s,v]=hsv(rgb);if(v<.28||(s>.23&&s<.35)||Math.abs(h-10)<1.2)d.uncertain.push(i);return classifyColor(rgb);});}
 renderFace();
}
function getFaces(){return Object.fromEntries(FACES.map(f=>[f,faceData[f]?.colors]));}
let photoCheckKey='',photoCheckResult=null;
function check(){const count=FACES.filter(f=>faceData[f]?.raw).length;$('#face-count').textContent=`${count} / 6 hazır`;let result={ok:false,message:`${6-count} yüz daha gerekiyor. Fotoğrafları otomatik tanı düğmesini kullan.`};
 if(count===6){const faces=getFaces(),key=JSON.stringify(faces);if(key!==photoCheckKey){photoCheckResult=assessPhotoFaces(faces);photoCheckKey=key;}result=photoCheckResult;}
 $('#validation').textContent=result.message;$('#validation').classList.toggle('ok',result.ok);$('#build-cube').disabled=!result.ok;return result;
}
function renderFace(){refreshSelect();const d=faceData[selected];$$('.face-tab').forEach(b=>{b.classList.toggle('active',b.dataset.face===selected);b.classList.toggle('ready',!!faceData[b.dataset.face]?.raw);b.setAttribute('aria-pressed',b.dataset.face===selected);});$('#face-title').textContent=selected+' · '+LABELS[selected]+' yüz';$('#face-state').textContent=d?.raw?'Renkler okundu':d?'Köşeleri seç':'Fotoğraf bekleniyor';$('#orientation').textContent='Fotoğrafın üst kenarındaki komşu: '+oriented[selected];
 $('#face-grid').replaceChildren();for(let i=0;i<9;i++){const b=document.createElement('button');const color=d?.colors?.[i];b.style.background=color?swatch(color):'#2b394d';b.className=(i===4?'center ':'')+(d?.uncertain?.includes(i)?'uncertain':'');b.disabled=!d?.raw||i===4;b.title=i===4?'Merkez referansı':`${i+1}. kare${d?.uncertain?.includes(i)?' · rengi kontrol et':''}`;b.setAttribute('aria-label',`${i+1}. kare: ${color?COLOR_NAMES[color]:'okunmadı'}`);b.onclick=()=>{d.manual[i]=paint;analysisStatus('Renk düzeltildi. Gerekirse Yönleri bul ile yüzleri yeniden eşleştir.');reclassify();};$('#face-grid').append(b);}
 $('#palette').replaceChildren();for(const f of FACES){const b=document.createElement('button');b.style.background=COLORS[f];b.className=paint===f?'selected':'';b.title=COLOR_NAMES[f];b.setAttribute('aria-label',COLOR_NAMES[f]);b.setAttribute('aria-pressed',paint===f);b.onclick=()=>{paint=f;renderFace();};$('#palette').append(b);}
 $('#rotate-face').disabled=!d?.raw;$('#recrop').disabled=!d;$('#align-faces').disabled=FACES.some(f=>!faceData[f]?.raw);$('#photo-empty').hidden=!!d;$('#crop-instruction').textContent=d?.corners.length===4?(d.auto?`Yüz otomatik bulundu${d.turns?' · '+d.turns*90+'° hizalandı':''}. Renkleri önizlemeden kontrol edebilirsin.`:'Renkler okundu. Sarı çerçeveli kareleri kontrol et.'):d?`Köşe ${Math.min((d?.corners.length||0)+1,4)} / 4: ${['sol üst','sağ üst','sağ alt','sol alt'][d?.corners.length||0]} noktasını seç.`:'Fotoğraf seçildiğinde yüz otomatik bulunur.';check();drawPhoto();
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
$('#build-cube').onclick=()=>{const result=check();if(!result.ok)return;if(result.rotations){for(const f of FACES)for(let i=0;i<result.rotations[f];i++)rotateData(faceData[f]);reclassify();analysisStatus('Yüz yönleri eşleştirildi; küp durumu geçerli.');}initial=fromFaces(result.faces);resetState(initial);displayColors=Object.fromEntries(FACES.map(f=>[f,swatch(f)]));initialSource='Fotoğraflarından oluşturuldu';$('#source-label').textContent=initialSource;references();canvas.focus({preventScroll:true});$('#stage').scrollIntoView({block:'start',behavior:'smooth'});toast('Küpün hazır. Şimdi bir hamle yap.');};
$('#help-toggle').onclick=()=>$('#help').showModal();$('#close-help').onclick=()=>$('#help').close();$('#help').onclick=e=>{if(e.target===$('#help')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}};
new ResizeObserver(drawPhoto).observe($('#photo-wrap'));renderFace();refresh();
