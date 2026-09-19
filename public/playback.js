export function parseSequence(text) {
 const entries=[];
 text.replace(/[’′]/g,"'").split(/\r?\n/).forEach((line,lineIndex)=>{
  for(const word of line.trim().split(/\s+/).filter(Boolean)) {
   const move=word.toUpperCase();
   if(!/^[URFDLB](2|')?$/.test(move))throw new Error(`${lineIndex+1}. satır: “${word}” geçerli değil. Örnek: R U R' U2`);
   entries.push({move,line:lineIndex});
  }
 });
 if(entries.length>1000)throw new Error('Bir akışta en fazla 1000 hamle kullanılabilir.');
 return entries;
}

// Playback has its own cursor. It never appends to the live cube's history.
export class Playback {
 constructor(entries,mode='auto') {this.entries=entries;this.mode=mode;this.index=0;this.active=null;this.phase=entries.length?(mode==='step'?'step':'running'):'done';}
 take() {if(this.active||this.phase!=='running')return null;this.active=this.entries[this.index]||null;return this.active;}
 complete() {
  if(!this.active)return;
  const previous=this.active;this.active=null;this.index++;
  if(this.index===this.entries.length)this.phase='done';
  else if(this.phase==='paused')return;
  else if(this.mode==='step')this.phase='step';
  else if(this.entries[this.index].line!==previous.line)this.phase='break';
 }
 pause() {if(this.phase==='running')this.phase='paused';}
 advance() {if(this.active||this.phase==='done')return false;this.phase='running';return true;}
}

export const DEFAULT_KEYS={U:'u',R:'r',F:'f',D:'d',L:'l',B:'b'};
export function validateKeys(keys) {
 const values=Object.keys(DEFAULT_KEYS).map(f=>(keys[f]||'').toLowerCase());
 return values.every(k=>/^[a-z0-9]$/.test(k))&&new Set(values).size===6;
}
