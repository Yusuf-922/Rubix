import {inverse} from './cube.js';
// Include unfinished animations when interpreting rapid undo/redo requests.
export function projectedHistory(history,cursor,jobs=[]) {
 let moves=history.slice(),index=cursor;
 for(const job of jobs.filter(Boolean)) {
  if(job.kind==='move'){moves=moves.slice(0,index);moves.push(job.move);index++;}
  else if(job.kind==='undo')index--;
  else if(job.kind==='redo')index++;
 }
 return {moves,index};
}
export function historyRequest(kind,history,cursor,jobs=[]) {
 const {moves,index}=projectedHistory(history,cursor,jobs);
 if(kind==='undo')return index>0?{kind,move:inverse(moves[index-1])}:null;
 return index<moves.length?{kind:'redo',move:moves[index]}:null;
}
