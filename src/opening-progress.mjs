import {explainSolution,puzzleHint} from './coach-feedback.mjs';
import {Chess} from 'chess.js';
import {uciMove,loadPosition} from './engine.mjs';
import {recordAttempt,currentEvidence} from './core.mjs';
function completedIds(s,c){const set=new Set(s.openingCourses?.[c.id]?.completed||[]),out=[];for(const u of c.units){if(!set.has(u.id))break;out.push(u.id);}return out;}
export function canOpenUnit(s,c,id){const index=c.units.findIndex(u=>u.id===id);return index>=0&&index<=completedIds(s,c).length;}
function validCompletion(c,u,r){
 if(u.type==='theory')return Array.isArray(r.answers)&&r.answers.length===u.questions.length&&u.questions.every((q,i)=>q.answer===r.answers[i]);
 const g=new Chess();for(const m of u.startMoves||[])g.move(m);
 if(!Array.isArray(r.moves))return false;
 if(u.type==='line'){const reference=new Chess();for(const m of u.moves)reference.move(m);const expected=reference.history({verbose:true}).map(m=>m.from+m.to+(m.promotion||''));if(expected.length!==r.moves.length||expected.some((m,i)=>m!==r.moves[i]))return false;}
 let decisions=0;for(const move of r.moves){if(g.turn()===c.side)decisions++;uciMove(g,move);}
 return u.type==='line'||decisions>=u.turns||g.isGameOver();
}
export function recordCourseSession(s,c,unit,result){
 const u=c.units.find(x=>x.id===unit.id);if(!u||!canOpenUnit(s,c,u.id))throw Error('Сначала завершите предыдущий урок.');
 if(result.passed&&!validCompletion(c,u,result))throw Error('Проверка урока ещё не завершена.');
 s.openingCourses??={};const data=s.openingCourses[c.id]??={completed:[],history:[]};
 if(result.sessionId&&data.history.some(h=>h.id===result.sessionId))return data.history.find(h=>h.id===result.sessionId);
 const decisions=u.type==='theory'?u.questions.length:u.type==='line'?u.moves.filter((_,i)=>(i%2===0?'w':'b')===c.side).length:u.turns;
 const errors=Array.isArray(result.errors)?result.errors:[],hints=result.hints||0;
 const score=result.passed?Math.max(0,Math.round((1-(errors.length+.5*hints)/Math.max(1,decisions))*100)):null;
 const session={id:result.sessionId||crypto.randomUUID(),unitId:u.id,title:u.title,type:u.type,date:result.finishedAt||Date.now(),startedAt:result.startedAt||Date.now(),passed:!!result.passed,score,hints,errors,decisions,answers:result.answers||[],moves:result.moves||[],calibrationId:s.calibration?.id??'initial'};
 if(session.passed&&u.type==='sparring'){
 const additions=[];for(const [index,error] of errors.entries())if(error.kind==='evaluation'&&error.loss>=100&&error.bestUci){
  const position=loadPosition(error.fen);uciMove(position,error.bestUci);
  if(!s.mistakes.some(m=>m.fen===error.fen&&currentEvidence(s,m)))additions.push({id:'course-'+session.id+'-'+index,calibrationId:session.calibrationId,fen:error.fen,line:[error.bestUci],theme:error.theme||'opening',rating:s.rating,title:c.name+' — ваша позиция',text:'Найдите более сильный ход в позиции из вашей практики дебюта.',hint:puzzleHint({fen:error.fen,line:[error.bestUci]}),explanation:explainSolution({fen:error.fen,line:[error.bestUci]}),source:'Практика дебюта'});
 }s.mistakes.unshift(...additions);s.mistakes=s.mistakes.slice(0,300);
 }
 data.history.unshift(session);
 if(session.passed){if(!data.completed.includes(u.id))data.completed.push(u.id);recordAttempt(s,{id:'course-'+c.id+'-'+u.id,theme:'opening',rating:900},{correct:true,hints,tries:1+errors.length});}
 return session;
}
export function courseSummary(s,c){const history=s.openingCourses?.[c.id]?.history||[],graded=history.filter(h=>h.passed&&Number.isFinite(h.score)).slice(0,8);return{completed:completedIds(s,c).length,total:c.units.length,accuracy:graded.length?Math.round(graded.reduce((n,h)=>n+h.score,0)/graded.length):null,history};}
